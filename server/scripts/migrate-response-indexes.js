import "dotenv/config";
import mongoose from "mongoose";

/**
 * Validates the operator confirmation flag.
 *
 * @param {object} [options]
 * @throws {Error} If confirmation flag is missing or not strictly "true"
 */
export function checkOperatorConfirmation(options = {}) {
  const confirmationValue =
    options?.confirmVoteWritesPaused !== undefined
      ? String(options.confirmVoteWritesPaused)
      : process.env.CONFIRM_VOTE_WRITES_PAUSED;

  if (confirmationValue !== "true") {
    throw new Error(
      "MIGRATION REFUSED: Operator confirmation required. Set CONFIRM_VOTE_WRITES_PAUSED=true to confirm that vote-writing traffic has been paused on the ingress/load balancer. (Note: this is an explicit operator safety confirmation, not automatic traffic detection)."
    );
  }
}

/**
 * Run preflight checks on the responses collection to detect any unexpected duplicate keys
 * that would cause index creation to fail or indicate database inconsistency.
 *
 * @param {import('mongodb').Db} db - Native MongoDB Db instance
 * @returns {Promise<{ ok: boolean, authDuplicates: Array, anonDuplicates: Array }>}
 */
export async function runMigrationPreflight(db) {
  const collection = db.collection("responses");

  // Check 1: Duplicate authenticated (poll, respondent) pairs where respondent is an ObjectId
  const authDuplicates = await collection
    .aggregate([
      {
        $match: {
          respondent: { $type: "objectId" },
        },
      },
      {
        $group: {
          _id: { poll: "$poll", respondent: "$respondent" },
          count: { $sum: 1 },
          responseIds: { $push: "$_id" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])
    .toArray();

  // Check 2: Duplicate anonymous (poll, anonymousVoterHash) pairs where anonymousVoterHash is a string
  const anonDuplicates = await collection
    .aggregate([
      {
        $match: {
          anonymousVoterHash: { $type: "string" },
        },
      },
      {
        $group: {
          _id: { poll: "$poll", anonymousVoterHash: "$anonymousVoterHash" },
          count: { $sum: 1 },
          responseIds: { $push: "$_id" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])
    .toArray();

  const ok = authDuplicates.length === 0 && anonDuplicates.length === 0;
  return { ok, authDuplicates, anonDuplicates };
}

/**
 * Verifies that the anonymous voting index exists and has correct options before proceeding.
 * Does NOT drop or recreate the anonymous index.
 *
 * @param {import('mongodb').Db} db
 * @returns {Promise<object>} The validated anonymous index object
 */
export async function verifyAnonymousIndex(db) {
  const collection = db.collection("responses");
  const indexes = await collection.indexes();
  const anonIndex = indexes.find((idx) => idx.name === "poll_1_anonymousVoterHash_1");

  if (!anonIndex) {
    throw new Error(
      "MIGRATION ABORTED: Missing required index 'poll_1_anonymousVoterHash_1'. Do not proceed until anonymous index is established."
    );
  }

  const keyMatches =
    JSON.stringify(anonIndex.key) === JSON.stringify({ poll: 1, anonymousVoterHash: 1 });
  const isUnique = anonIndex.unique === true;
  const partialFilterMatches =
    anonIndex.partialFilterExpression &&
    anonIndex.partialFilterExpression.anonymousVoterHash &&
    anonIndex.partialFilterExpression.anonymousVoterHash.$type === "string";

  if (!keyMatches || !isUnique || !partialFilterMatches) {
    throw new Error(
      `MIGRATION ABORTED: Index 'poll_1_anonymousVoterHash_1' exists but its configuration is invalid (keyMatches=${keyMatches}, unique=${isUnique}, partialFilterMatches=${Boolean(
        partialFilterMatches
      )}). The anonymous index must not be silently dropped or rebuilt.`
    );
  }

  return anonIndex;
}

/**
 * Executes the safe response index migration with operator confirmation, preflight verification,
 * anonymous index validation, and fail-safe checks.
 *
 * @param {import('mongodb').Db} db
 * @param {object} [options]
 * @param {boolean} [options.confirmVoteWritesPaused]
 */
export async function executeIndexMigration(db, options = {}) {
  const collection = db.collection("responses");

  console.log("-------------------------------------------------");
  console.log("STEP 1: OPERATOR SAFETY CONFIRMATION");
  console.log("-------------------------------------------------");
  checkOperatorConfirmation(options);
  console.log("✓ Operator confirmation verified: CONFIRM_VOTE_WRITES_PAUSED=true acknowledged.");

  console.log("\n-------------------------------------------------");
  console.log("STEP 2: PREFLIGHT DUPLICATE CHECKS");
  console.log("-------------------------------------------------");
  const preflight = await runMigrationPreflight(db);
  if (!preflight.ok) {
    console.error("FATAL: Migration preflight check failed. Unexpected duplicates found!");
    if (preflight.authDuplicates.length > 0) {
      console.error(
        `Found ${preflight.authDuplicates.length} duplicate authenticated (poll, respondent) pairs:`,
        JSON.stringify(preflight.authDuplicates, null, 2)
      );
    }
    if (preflight.anonDuplicates.length > 0) {
      console.error(
        `Found ${preflight.anonDuplicates.length} duplicate anonymous (poll, anonymousVoterHash) pairs:`,
        JSON.stringify(preflight.anonDuplicates, null, 2)
      );
    }
    throw new Error(
      "MIGRATION ABORTED: Unexpected duplicate records found. Resolve duplicates before rebuilding index."
    );
  }
  console.log("✓ Preflight check passed: No duplicate authenticated or anonymous responses detected.");

  console.log("\n-------------------------------------------------");
  console.log("STEP 3: VERIFY ANONYMOUS INDEX INTEGRITY");
  console.log("-------------------------------------------------");
  const verifiedAnonIndex = await verifyAnonymousIndex(db);
  console.log("✓ Anonymous index verified:", JSON.stringify(verifiedAnonIndex));

  console.log("\n-------------------------------------------------");
  console.log("STEP 4: VERIFY EXISTING AUTHENTICATED INDEX");
  console.log("-------------------------------------------------");
  const existingIndexes = await collection.indexes();
  console.log("Existing index names on 'responses':", existingIndexes.map((i) => i.name).join(", "));
  const existingAuthIndex = existingIndexes.find((idx) => idx.name === "poll_1_respondent_1");
  if (existingAuthIndex) {
    console.log("Existing 'poll_1_respondent_1' definition:", JSON.stringify(existingAuthIndex));
  } else {
    console.log("Note: 'poll_1_respondent_1' does not exist yet (will be created).");
  }

  console.log("\n-------------------------------------------------");
  console.log("STEP 5: DROP OLD AUTHENTICATED INDEX");
  console.log("-------------------------------------------------");
  if (existingAuthIndex) {
    await collection.dropIndex("poll_1_respondent_1");
    console.log("✓ Dropped legacy index 'poll_1_respondent_1'.");
  }

  console.log("\n-------------------------------------------------");
  console.log("STEP 6: CREATE CORRECTED PARTIAL UNIQUE INDEX");
  console.log("-------------------------------------------------");
  let createdIndexName;
  try {
    createdIndexName = await collection.createIndex(
      { poll: 1, respondent: 1 },
      {
        unique: true,
        name: "poll_1_respondent_1",
        partialFilterExpression: { respondent: { $type: "objectId" } },
      }
    );
    console.log(`✓ Created index '${createdIndexName}'.`);
  } catch (err) {
    console.error("FATAL: Index creation failed! Keeping traffic paused.", err);
    throw err;
  }

  console.log("\n-------------------------------------------------");
  console.log("STEP 7: VERIFY CREATED INDEX OPTIONS");
  console.log("-------------------------------------------------");
  const updatedIndexes = await collection.indexes();
  const newAuthIndex = updatedIndexes.find((idx) => idx.name === "poll_1_respondent_1");

  if (!newAuthIndex) {
    throw new Error("VERIFICATION FAILED: 'poll_1_respondent_1' index not found after creation!");
  }

  const keyMatches =
    JSON.stringify(newAuthIndex.key) === JSON.stringify({ poll: 1, respondent: 1 });
  const isUnique = newAuthIndex.unique === true;
  const partialFilterMatches =
    newAuthIndex.partialFilterExpression &&
    newAuthIndex.partialFilterExpression.respondent &&
    newAuthIndex.partialFilterExpression.respondent.$type === "objectId";

  if (!keyMatches || !isUnique || !partialFilterMatches) {
    console.error("VERIFICATION FAILED: Rebuilt index does not match required partial configuration:", newAuthIndex);
    throw new Error("VERIFICATION FAILED: Index options mismatch. Keep traffic paused.");
  }

  console.log("✓ Verified Key:", JSON.stringify(newAuthIndex.key));
  console.log("✓ Verified Unique:", newAuthIndex.unique);
  console.log("✓ Verified PartialFilterExpression:", JSON.stringify(newAuthIndex.partialFilterExpression));
  console.log("✓ INDEX MIGRATION COMPLETED AND VERIFIED SUCCESSFULLY.");
}

// Standalone execution entrypoint with graceful cleanup and process.exitCode handling
if (process.argv[1] && process.argv[1].endsWith("migrate-response-indexes.js")) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Error: MONGO_URI environment variable is required to run migration.");
    process.exitCode = 1;
  } else {
    let exitCode = 0;
    console.log("Connecting to MongoDB...");
    try {
      await mongoose.connect(uri);
      await executeIndexMigration(mongoose.connection.db);
      console.log("Migration finished successfully.");
    } catch (err) {
      console.error("Migration failed:", err.message);
      exitCode = 1;
    } finally {
      try {
        await mongoose.disconnect();
        console.log("MongoDB connection closed.");
      } catch (disconnectErr) {
        console.error("Error while disconnecting MongoDB:", disconnectErr);
      }
    }
    process.exitCode = exitCode;
  }
}
