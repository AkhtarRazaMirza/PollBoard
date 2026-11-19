import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Response } from "../src/models/response.models.js";
import { Poll } from "../src/models/poll.models.js";
import PollService from "../src/services/poll.service.js";
import {
  runMigrationPreflight,
  executeIndexMigration,
} from "../scripts/migrate-response-indexes.js";

async function runTests() {
  console.log("=================================================");
  console.log("POLLBOARD DATABASE INDEX & CONCURRENCY TEST SUITE");
  console.log("=================================================");

  let mongod;
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log(`Connected to real in-memory MongoDB at: ${uri}`);

    await mongoose.connect(uri);

    // Sync schema indexes into real MongoDB collection
    await Response.syncIndexes();

    const indexes = await Response.collection.indexes();
    console.log("\nCreated Indexes on 'responses' collection:");
    for (const idx of indexes) {
      console.log(
        `- ${idx.name}: key=${JSON.stringify(idx.key)}, unique=${idx.unique}, partialFilter=${JSON.stringify(
          idx.partialFilterExpression || {}
        )}`
      );
    }

    // Create baseline poll fixtures
    const mockCreator = new mongoose.Types.ObjectId();
    const poll = await Poll.create({
      pollTitle: "General Index Verification Poll",
      creator: mockCreator,
      questions: [
        {
          questionText: "What is your primary programming language?",
          options: ["TypeScript", "Python", "Go"],
          required: true,
        },
      ],
      voteAccess: "anonymous",
      isPublished: true,
    });

    const questionId = poll.questions[0]._id;
    const pollId = poll._id;

    const authPoll = await Poll.create({
      pollTitle: "Authenticated Verification Poll",
      creator: mockCreator,
      questions: [
        {
          questionText: "Which database do you prefer?",
          options: ["PostgreSQL", "MongoDB"],
          required: true,
        },
      ],
      voteAccess: "authenticated",
      isPublished: true,
    });
    const authQuestionId = authPoll.questions[0]._id;
    const authPollId = authPoll._id;

    // -------------------------------------------------------------------------
    // SECTION 1: SEQUENTIAL VOTING VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n-------------------------------------------------");
    console.log("TEST 1: Two different anonymous hashes can vote in the same poll");
    console.log("-------------------------------------------------");
    const anonVote1 = await Response.create({
      poll: pollId,
      respondent: null,
      anonymousVoterHash: "anon_hash_seq_1",
      submissionType: "anonymous",
      answers: [{ questionId, selectedOption: "TypeScript" }],
    });
    console.log(`✓ Anonymous Voter 1 succeeded: Response ID ${anonVote1._id}`);

    const anonVote2 = await Response.create({
      poll: pollId,
      respondent: null,
      anonymousVoterHash: "anon_hash_seq_2",
      submissionType: "anonymous",
      answers: [{ questionId, selectedOption: "Python" }],
    });
    console.log(`✓ Anonymous Voter 2 succeeded: Response ID ${anonVote2._id}`);
    assert.ok(anonVote1._id && anonVote2._id, "Both anonymous votes should be recorded");
    console.log("PASSED: Both anonymous votes recorded without unique constraint collision!");

    console.log("\n-------------------------------------------------");
    console.log("TEST 2: The same anonymous hash CANNOT vote twice in the same poll");
    console.log("-------------------------------------------------");
    let test2Caught = false;
    try {
      await Response.create({
        poll: pollId,
        respondent: null,
        anonymousVoterHash: "anon_hash_seq_1",
        submissionType: "anonymous",
        answers: [{ questionId, selectedOption: "Go" }],
      });
    } catch (err) {
      if (err.code === 11000) {
        test2Caught = true;
        console.log(`✓ Caught expected duplicate key error (code 11000) on index: ${JSON.stringify(err.keyPattern)}`);
        console.log("PASSED: Anonymous deduplication successfully enforced by poll_1_anonymousVoterHash_1!");
      } else {
        throw err;
      }
    }
    assert.strictEqual(test2Caught, true, "Duplicate anonymous vote must be rejected with code 11000");

    console.log("\n-------------------------------------------------");
    console.log("TEST 3: Different authenticated users can vote in the same poll");
    console.log("-------------------------------------------------");
    const user1 = new mongoose.Types.ObjectId();
    const user2 = new mongoose.Types.ObjectId();

    const authVote1 = await Response.create({
      poll: authPollId,
      respondent: user1,
      anonymousVoterHash: null,
      submissionType: "authenticated",
      answers: [{ questionId: authQuestionId, selectedOption: "PostgreSQL" }],
    });
    console.log(`✓ Authenticated User 1 succeeded: Response ID ${authVote1._id}`);

    const authVote2 = await Response.create({
      poll: authPollId,
      respondent: user2,
      anonymousVoterHash: null,
      submissionType: "authenticated",
      answers: [{ questionId: authQuestionId, selectedOption: "MongoDB" }],
    });
    console.log(`✓ Authenticated User 2 succeeded: Response ID ${authVote2._id}`);
    assert.ok(authVote1._id && authVote2._id, "Both authenticated votes should succeed");
    console.log("PASSED: Different authenticated users voted without conflict!");

    console.log("\n-------------------------------------------------");
    console.log("TEST 4: The same authenticated user CANNOT vote twice in the same poll");
    console.log("-------------------------------------------------");
    let test4Caught = false;
    try {
      await Response.create({
        poll: authPollId,
        respondent: user1,
        anonymousVoterHash: null,
        submissionType: "authenticated",
        answers: [{ questionId: authQuestionId, selectedOption: "PostgreSQL" }],
      });
    } catch (err) {
      if (err.code === 11000) {
        test4Caught = true;
        console.log(`✓ Caught expected duplicate key error (code 11000) on index: ${JSON.stringify(err.keyPattern)}`);
        console.log("PASSED: Authenticated deduplication successfully enforced by poll_1_respondent_1!");
      } else {
        throw err;
      }
    }
    assert.strictEqual(test4Caught, true, "Duplicate authenticated vote must be rejected with code 11000");

    console.log("\n-------------------------------------------------");
    console.log("TEST 5: PollService votePoll error-handling integration");
    console.log("-------------------------------------------------");
    const rawToken = "client_device_token_unique_123456789";

    await PollService.votePoll({
      pollId: String(pollId),
      userId: null,
      body: { answers: [{ questionId: String(questionId), selectedOption: "TypeScript" }] },
      anonymousVoterToken: rawToken,
    });
    console.log("✓ Initial vote via PollService succeeded");

    let test5Caught = false;
    try {
      await PollService.votePoll({
        pollId: String(pollId),
        userId: null,
        body: { answers: [{ questionId: String(questionId), selectedOption: "Python" }] },
        anonymousVoterToken: rawToken,
      });
    } catch (serviceErr) {
      console.log(`✓ PollService returned HTTP ${serviceErr.statusCode}: "${serviceErr.message}"`);
      assert.strictEqual(serviceErr.statusCode, 409, "Must return HTTP 409 Conflict");
      assert.strictEqual(
        serviceErr.message,
        "This device has already voted in this poll",
        "Must return device duplicate message"
      );
      test5Caught = true;
      console.log("PASSED: Correct HTTP 409 Conflict returned for duplicate anonymous voter!");
    }
    assert.strictEqual(test5Caught, true, "Duplicate anonymous vote via PollService must throw 409");

    // -------------------------------------------------------------------------
    // SECTION 2: CONCURRENT VOTING VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n-------------------------------------------------");
    console.log("TEST 6: Two different anonymous hashes submit simultaneously (Promise.all)");
    console.log("-------------------------------------------------");
    const concurrentPoll = await Poll.create({
      pollTitle: "Concurrent Voting Test Poll",
      creator: mockCreator,
      questions: [
        {
          questionText: "Concurrent question",
          options: ["A", "B"],
          required: true,
        },
      ],
      voteAccess: "anonymous",
      isPublished: true,
    });
    const cQId = concurrentPoll.questions[0]._id;
    const cPollId = concurrentPoll._id;

    const [cRes1, cRes2] = await Promise.all([
      Response.create({
        poll: cPollId,
        respondent: null,
        anonymousVoterHash: "concurrent_anon_hash_alpha",
        submissionType: "anonymous",
        answers: [{ questionId: cQId, selectedOption: "A" }],
      }),
      Response.create({
        poll: cPollId,
        respondent: null,
        anonymousVoterHash: "concurrent_anon_hash_beta",
        submissionType: "anonymous",
        answers: [{ questionId: cQId, selectedOption: "B" }],
      }),
    ]);
    console.log(`✓ Concurrent Anonymous 1 ID: ${cRes1._id}`);
    console.log(`✓ Concurrent Anonymous 2 ID: ${cRes2._id}`);
    assert.ok(cRes1._id && cRes2._id, "Both concurrent distinct anonymous votes must succeed");
    console.log("PASSED: Simultaneous anonymous submissions with different hashes both succeeded!");

    console.log("\n-------------------------------------------------");
    console.log("TEST 7: Same anonymous hash submits simultaneously twice (Race Condition)");
    console.log("-------------------------------------------------");
    const dupAnonHash = "concurrent_duplicate_anon_hash";
    const anonRaceResults = await Promise.allSettled([
      Response.create({
        poll: cPollId,
        respondent: null,
        anonymousVoterHash: dupAnonHash,
        submissionType: "anonymous",
        answers: [{ questionId: cQId, selectedOption: "A" }],
      }),
      Response.create({
        poll: cPollId,
        respondent: null,
        anonymousVoterHash: dupAnonHash,
        submissionType: "anonymous",
        answers: [{ questionId: cQId, selectedOption: "B" }],
      }),
    ]);

    const anonFulfilled = anonRaceResults.filter((r) => r.status === "fulfilled");
    const anonRejected = anonRaceResults.filter((r) => r.status === "rejected");

    assert.strictEqual(anonFulfilled.length, 1, "Exactly 1 concurrent duplicate anonymous write must succeed");
    assert.strictEqual(anonRejected.length, 1, "Exactly 1 concurrent duplicate anonymous write must be rejected");
    assert.strictEqual(anonRejected[0].reason.code, 11000, "Rejection must have MongoDB error code 11000");

    console.log(`✓ Exactly one succeeded (ID: ${anonFulfilled[0].value._id})`);
    console.log(
      `✓ Exactly one rejected with MongoDB duplicate key error 11000 on index: ${JSON.stringify(
        anonRejected[0].reason.keyPattern
      )}`
    );
    console.log("PASSED: Simultaneous duplicate anonymous voting safely collapsed to exactly one write!");

    console.log("\n-------------------------------------------------");
    console.log("TEST 8: Two different authenticated users submit simultaneously (Promise.all)");
    console.log("-------------------------------------------------");
    const concurrentAuthPoll = await Poll.create({
      pollTitle: "Concurrent Auth Test Poll",
      creator: mockCreator,
      questions: [
        {
          questionText: "Concurrent auth question",
          options: ["Yes", "No"],
          required: true,
        },
      ],
      voteAccess: "authenticated",
      isPublished: true,
    });
    const cAuthQId = concurrentAuthPoll.questions[0]._id;
    const cAuthPollId = concurrentAuthPoll._id;

    const authUserX = new mongoose.Types.ObjectId();
    const authUserY = new mongoose.Types.ObjectId();

    const [authResX, authResY] = await Promise.all([
      Response.create({
        poll: cAuthPollId,
        respondent: authUserX,
        anonymousVoterHash: null,
        submissionType: "authenticated",
        answers: [{ questionId: cAuthQId, selectedOption: "Yes" }],
      }),
      Response.create({
        poll: cAuthPollId,
        respondent: authUserY,
        anonymousVoterHash: null,
        submissionType: "authenticated",
        answers: [{ questionId: cAuthQId, selectedOption: "No" }],
      }),
    ]);
    console.log(`✓ Concurrent User X ID: ${authResX._id}`);
    console.log(`✓ Concurrent User Y ID: ${authResY._id}`);
    assert.ok(authResX._id && authResY._id, "Both concurrent authenticated users must succeed");
    console.log("PASSED: Simultaneous submissions by two different authenticated users both succeeded!");

    console.log("\n-------------------------------------------------");
    console.log("TEST 9: Same authenticated user submits simultaneously twice (Race Condition)");
    console.log("-------------------------------------------------");
    const authRaceUser = new mongoose.Types.ObjectId();
    const authRaceResults = await Promise.allSettled([
      Response.create({
        poll: cAuthPollId,
        respondent: authRaceUser,
        anonymousVoterHash: null,
        submissionType: "authenticated",
        answers: [{ questionId: cAuthQId, selectedOption: "Yes" }],
      }),
      Response.create({
        poll: cAuthPollId,
        respondent: authRaceUser,
        anonymousVoterHash: null,
        submissionType: "authenticated",
        answers: [{ questionId: cAuthQId, selectedOption: "No" }],
      }),
    ]);

    const authFulfilled = authRaceResults.filter((r) => r.status === "fulfilled");
    const authRejected = authRaceResults.filter((r) => r.status === "rejected");

    assert.strictEqual(authFulfilled.length, 1, "Exactly 1 concurrent duplicate authenticated write must succeed");
    assert.strictEqual(authRejected.length, 1, "Exactly 1 concurrent duplicate authenticated write must be rejected");
    assert.strictEqual(authRejected[0].reason.code, 11000, "Rejection must have MongoDB error code 11000");

    console.log(`✓ Exactly one succeeded (ID: ${authFulfilled[0].value._id})`);
    console.log(
      `✓ Exactly one rejected with MongoDB duplicate key error 11000 on index: ${JSON.stringify(
        authRejected[0].reason.keyPattern
      )}`
    );
    console.log("PASSED: Simultaneous duplicate authenticated voting safely collapsed to exactly one write!");

    console.log("\n-------------------------------------------------");
    console.log("TEST 10: Concurrent PollService.votePoll calls return HTTP 409 Conflict");
    console.log("-------------------------------------------------");
    const serviceRaceToken = "concurrent_device_token_race_test_98765";
    const serviceRaceResults = await Promise.allSettled([
      PollService.votePoll({
        pollId: String(cPollId),
        userId: null,
        body: { answers: [{ questionId: String(cQId), selectedOption: "A" }] },
        anonymousVoterToken: serviceRaceToken,
      }),
      PollService.votePoll({
        pollId: String(cPollId),
        userId: null,
        body: { answers: [{ questionId: String(cQId), selectedOption: "B" }] },
        anonymousVoterToken: serviceRaceToken,
      }),
    ]);

    const sFulfilled = serviceRaceResults.filter((r) => r.status === "fulfilled");
    const sRejected = serviceRaceResults.filter((r) => r.status === "rejected");

    assert.strictEqual(sFulfilled.length, 1, "Exactly 1 concurrent service call must succeed");
    assert.strictEqual(sRejected.length, 1, "Exactly 1 concurrent service call must be rejected");
    assert.strictEqual(sRejected[0].reason.statusCode, 409, "Must return status code 409");
    assert.strictEqual(
      sRejected[0].reason.message,
      "This device has already voted in this poll",
      "Must return duplicate device message"
    );

    console.log("✓ Exactly one service call succeeded");
    console.log(`✓ Exactly one service call failed with HTTP ${sRejected[0].reason.statusCode}: "${sRejected[0].reason.message}"`);
    console.log("PASSED: Concurrent PollService.votePoll race handled with HTTP 409 Conflict!");

    // -------------------------------------------------------------------------
    // SECTION 3: PRODUCTION MIGRATION PREFLIGHT CHECKS & SAFEGUARDS
    // -------------------------------------------------------------------------
    console.log("\n-------------------------------------------------");
    console.log("TEST 11: Migration preflight check passes on clean database");
    console.log("-------------------------------------------------");
    const preflightClean = await runMigrationPreflight(mongoose.connection.db);
    assert.strictEqual(preflightClean.ok, true, "Preflight must report ok on clean database");
    console.log("✓ Preflight reported ok: true with zero duplicate pairs.");
    console.log("PASSED: Preflight cleanly validates consistent database!");

    console.log("\n-------------------------------------------------");
    console.log("TEST 12: Migration preflight detects duplicate authenticated pairs & halts");
    console.log("-------------------------------------------------");
    // Temporarily drop index to simulate an unindexed/legacy database containing duplicate rows
    await Response.collection.dropIndex("poll_1_respondent_1");

    const testCorruptUser = new mongoose.Types.ObjectId();
    const testCorruptPoll = new mongoose.Types.ObjectId();
    await Response.collection.insertMany([
      {
        poll: testCorruptPoll,
        respondent: testCorruptUser,
        anonymousVoterHash: null,
        submissionType: "authenticated",
        answers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        poll: testCorruptPoll,
        respondent: testCorruptUser,
        anonymousVoterHash: null,
        submissionType: "authenticated",
        answers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const preflightAuthFail = await runMigrationPreflight(mongoose.connection.db);
    assert.strictEqual(preflightAuthFail.ok, false, "Preflight must report ok: false on duplicate auth data");
    assert.strictEqual(preflightAuthFail.authDuplicates.length, 1, "Must find exactly 1 duplicate auth pair");
    console.log(`✓ Preflight successfully detected duplicate authenticated pair for poll ${testCorruptPoll}`);
    console.log(`  Duplicate info: count=${preflightAuthFail.authDuplicates[0].count}`);

    let test12Halted = false;
    try {
      await executeIndexMigration(mongoose.connection.db, { confirmVoteWritesPaused: true });
    } catch (migErr) {
      test12Halted = true;
      assert.ok(
        migErr.message.includes("MIGRATION ABORTED: Unexpected duplicate records found"),
        "Must abort with duplicate records message"
      );
      console.log(`✓ executeIndexMigration safely aborted: "${migErr.message}"`);
      console.log("PASSED: Migration preflight check safely prevents migration when authenticated duplicates exist!");
    }
    assert.strictEqual(test12Halted, true, "executeIndexMigration must abort when duplicate authenticated records exist");

    // Clean up intentional corrupt documents
    await Response.collection.deleteMany({ poll: testCorruptPoll });

    console.log("\n-------------------------------------------------");
    console.log("TEST 13: Migration preflight detects duplicate anonymous pairs & halts");
    console.log("-------------------------------------------------");
    // Temporarily drop anonymous index to simulate unindexed/legacy duplicate anonymous documents
    await Response.collection.dropIndex("poll_1_anonymousVoterHash_1");

    const testCorruptAnonPoll = new mongoose.Types.ObjectId();
    const testCorruptAnonHash = "corrupted_duplicate_anon_hash";
    await Response.collection.insertMany([
      {
        poll: testCorruptAnonPoll,
        respondent: null,
        anonymousVoterHash: testCorruptAnonHash,
        submissionType: "anonymous",
        answers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        poll: testCorruptAnonPoll,
        respondent: null,
        anonymousVoterHash: testCorruptAnonHash,
        submissionType: "anonymous",
        answers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const preflightAnonFail = await runMigrationPreflight(mongoose.connection.db);
    assert.strictEqual(preflightAnonFail.ok, false, "Preflight must report ok: false on duplicate anon data");
    assert.strictEqual(preflightAnonFail.anonDuplicates.length, 1, "Must find exactly 1 duplicate anon pair");
    console.log(`✓ Preflight successfully detected duplicate anonymous pair for poll ${testCorruptAnonPoll}`);
    console.log(`  Duplicate info: count=${preflightAnonFail.anonDuplicates[0].count}`);

    let test13Halted = false;
    try {
      await executeIndexMigration(mongoose.connection.db, { confirmVoteWritesPaused: true });
    } catch (migErr) {
      test13Halted = true;
      assert.ok(
        migErr.message.includes("MIGRATION ABORTED: Unexpected duplicate records found"),
        "Must abort with duplicate records message"
      );
      console.log(`✓ executeIndexMigration safely aborted: "${migErr.message}"`);
      console.log("PASSED: Migration preflight check safely prevents migration when anonymous duplicates exist!");
    }
    assert.strictEqual(test13Halted, true, "executeIndexMigration must abort when duplicate anonymous records exist");

    // Clean up intentional corrupt documents
    await Response.collection.deleteMany({ poll: testCorruptAnonPoll });

    // Re-create the anonymous index with valid options before moving to safeguard tests
    await Response.collection.createIndex(
      { poll: 1, anonymousVoterHash: 1 },
      {
        unique: true,
        name: "poll_1_anonymousVoterHash_1",
        partialFilterExpression: { anonymousVoterHash: { $type: "string" } },
      }
    );

    // -------------------------------------------------------------------------
    // SECTION 4: MIGRATION OPERATOR CONFIRMATION & INDEX INTEGRITY SAFEGUARDS
    // -------------------------------------------------------------------------
    console.log("\n-------------------------------------------------");
    console.log("TEST 14: Migration aborts without explicit confirmation");
    console.log("-------------------------------------------------");
    delete process.env.CONFIRM_VOTE_WRITES_PAUSED;

    let test14Aborted = false;
    try {
      await executeIndexMigration(mongoose.connection.db);
    } catch (err) {
      if (err.message.includes("MIGRATION REFUSED: Operator confirmation required")) {
        test14Aborted = true;
        console.log(`✓ Caught expected refusal: "${err.message}"`);
        console.log("PASSED: Migration safely refused when confirmation is missing!");
      } else {
        throw err;
      }
    }
    assert.strictEqual(test14Aborted, true, "Must refuse migration without CONFIRM_VOTE_WRITES_PAUSED");

    console.log("\n-------------------------------------------------");
    console.log("TEST 15: Migration aborts when confirmation is invalid (e.g. 'false' or 'yes')");
    console.log("-------------------------------------------------");
    let test15Aborted = false;
    try {
      await executeIndexMigration(mongoose.connection.db, { confirmVoteWritesPaused: "false" });
    } catch (err) {
      if (err.message.includes("MIGRATION REFUSED: Operator confirmation required")) {
        test15Aborted = true;
        console.log(`✓ Caught expected refusal for value 'false': "${err.message}"`);
        console.log("PASSED: Migration safely refused non-'true' confirmation values!");
      } else {
        throw err;
      }
    }
    assert.strictEqual(test15Aborted, true, "Must refuse migration when confirmation is not 'true'");

    // Restore env variable for subsequent tests
    process.env.CONFIRM_VOTE_WRITES_PAUSED = "true";

    console.log("\n-------------------------------------------------");
    console.log("TEST 16: Migration aborts when anonymous index is missing (does not drop auth index)");
    console.log("-------------------------------------------------");
    // Ensure an authenticated index exists first to check whether it gets dropped
    await Response.collection.createIndex(
      { poll: 1, respondent: 1 },
      {
        unique: true,
        name: "poll_1_respondent_1",
        partialFilterExpression: { respondent: { $type: "objectId" } },
      }
    );

    // Drop anonymous index to test safeguard
    await Response.collection.dropIndex("poll_1_anonymousVoterHash_1");

    let test16Aborted = false;
    try {
      await executeIndexMigration(mongoose.connection.db);
    } catch (err) {
      if (err.message.includes("Missing required index 'poll_1_anonymousVoterHash_1'")) {
        test16Aborted = true;
        console.log(`✓ Caught expected abortion: "${err.message}"`);
        const afterIndexes = await Response.collection.indexes();
        const hasAuthIndexAfter = afterIndexes.some((i) => i.name === "poll_1_respondent_1");
        assert.strictEqual(hasAuthIndexAfter, true, "Authenticated index must NOT be dropped when aborting");
        console.log("✓ Verified: Authenticated index was NOT dropped before aborting.");
        console.log("PASSED: Missing anonymous index safely aborts migration without modifying authenticated index!");
      } else {
        throw err;
      }
    }
    assert.strictEqual(test16Aborted, true, "Must abort when anonymous index is missing");

    console.log("\n-------------------------------------------------");
    console.log("TEST 17: Migration aborts when anonymous index options are incorrect");
    console.log("-------------------------------------------------");
    // Create an invalid anonymous index (unique: false, missing partialFilter)
    await Response.collection.createIndex(
      { poll: 1, anonymousVoterHash: 1 },
      {
        unique: false,
        name: "poll_1_anonymousVoterHash_1",
      }
    );

    let test17Aborted = false;
    try {
      await executeIndexMigration(mongoose.connection.db);
    } catch (err) {
      if (err.message.includes("Index 'poll_1_anonymousVoterHash_1' exists but its configuration is invalid")) {
        test17Aborted = true;
        console.log(`✓ Caught expected abortion: "${err.message}"`);
        console.log("PASSED: Migration safely refused invalid anonymous index options and did not silently rebuild it!");
      } else {
        throw err;
      }
    }
    assert.strictEqual(test17Aborted, true, "Must abort when anonymous index configuration is invalid");

    // Restore the proper anonymous index
    await Response.collection.dropIndex("poll_1_anonymousVoterHash_1");
    await Response.collection.createIndex(
      { poll: 1, anonymousVoterHash: 1 },
      {
        unique: true,
        name: "poll_1_anonymousVoterHash_1",
        partialFilterExpression: { anonymousVoterHash: { $type: "string" } },
      }
    );

    console.log("\n-------------------------------------------------");
    console.log("TEST 18: Full migration succeeds when starting from absent authenticated index");
    console.log("-------------------------------------------------");
    // Drop authenticated index to test creation path when absent
    await Response.collection.dropIndex("poll_1_respondent_1");
    await executeIndexMigration(mongoose.connection.db);
    console.log("PASSED: Index creation executed cleanly when authenticated index was absent!");

    // -------------------------------------------------------------------------
    // SECTION 5: GENUINE LEGACY-INDEX REPLACEMENT TEST
    // -------------------------------------------------------------------------
    console.log("\n-------------------------------------------------");
    console.log("TEST 19: Genuine legacy-index replacement & active protection verification");
    console.log("-------------------------------------------------");
    // Clear test responses from prior tests to ensure no duplicate response pairs exist
    await Response.deleteMany({});

    // 1. Prepare exact legacy configuration:
    // Drop existing authenticated index
    await Response.collection.dropIndex("poll_1_respondent_1");

    // Create the OLD broken authenticated index with empty partialFilterExpression {}
    await Response.collection.createIndex(
      { poll: 1, respondent: 1 },
      {
        unique: true,
        name: "poll_1_respondent_1",
        partialFilterExpression: {},
      }
    );

    // Verify starting state
    const startingIndexes = await Response.collection.indexes();
    const startingAuthIdx = startingIndexes.find((i) => i.name === "poll_1_respondent_1");
    const startingAnonIdx = startingIndexes.find((i) => i.name === "poll_1_anonymousVoterHash_1");

    assert.ok(startingAuthIdx, "Legacy poll_1_respondent_1 index must exist prior to migration");
    assert.ok(startingAnonIdx, "poll_1_anonymousVoterHash_1 must exist prior to migration");
    assert.deepStrictEqual(
      startingAuthIdx.partialFilterExpression || {},
      {},
      "Legacy index must have empty partialFilterExpression {}"
    );
    assert.strictEqual(
      startingAnonIdx.partialFilterExpression?.anonymousVoterHash?.$type,
      "string",
      "Anonymous index must have string partial filter"
    );
    console.log("✓ Pre-migration legacy state confirmed:");
    console.log(`  - Legacy poll_1_respondent_1 partialFilter: ${JSON.stringify(startingAuthIdx.partialFilterExpression || {})}`);
    console.log(`  - Active poll_1_anonymousVoterHash_1 partialFilter: ${JSON.stringify(startingAnonIdx.partialFilterExpression)}`);

    // Ensure explicit confirmation is active
    process.env.CONFIRM_VOTE_WRITES_PAUSED = "true";

    // 2. Execute migration (this exercises the actual legacy drop and recreate branch)
    await executeIndexMigration(mongoose.connection.db);

    // 3. Inspect post-migration indexes
    const postMigrationIndexes = await Response.collection.indexes();
    const replacedAuthIdx = postMigrationIndexes.find((i) => i.name === "poll_1_respondent_1");
    const preservedAnonIdx = postMigrationIndexes.find((i) => i.name === "poll_1_anonymousVoterHash_1");

    assert.ok(replacedAuthIdx, "Replaced poll_1_respondent_1 index must exist");
    assert.deepStrictEqual(replacedAuthIdx.key, { poll: 1, respondent: 1 }, "Key must be { poll: 1, respondent: 1 }");
    assert.strictEqual(replacedAuthIdx.unique, true, "Index must be unique");
    assert.strictEqual(
      replacedAuthIdx.partialFilterExpression?.respondent?.$type,
      "objectId",
      "Partial filter must restrict to objectId"
    );

    assert.ok(preservedAnonIdx, "Anonymous index must be preserved");
    assert.deepStrictEqual(
      preservedAnonIdx.key,
      { poll: 1, anonymousVoterHash: 1 },
      "Anonymous index key must remain unchanged"
    );
    assert.strictEqual(preservedAnonIdx.unique, true, "Anonymous index unique must remain true");
    assert.strictEqual(
      preservedAnonIdx.partialFilterExpression?.anonymousVoterHash?.$type,
      "string",
      "Anonymous index partial filter must remain string"
    );

    console.log("✓ Post-migration verification confirmed:");
    console.log("  - Replaced poll_1_respondent_1: unique=true, partialFilter={ respondent: { $type: 'objectId' } }");
    console.log("  - Preserved poll_1_anonymousVoterHash_1: unique=true, partialFilter={ anonymousVoterHash: { $type: 'string' } }");

    // 4. Test live functional behavior to ensure duplicate protection is active and not weakened
    const legacyTestPoll = await Poll.create({
      pollTitle: "Post-Migration Verification Poll",
      creator: mockCreator,
      questions: [
        {
          questionText: "Did the migration succeed?",
          options: ["Yes", "Definitely"],
          required: true,
        },
      ],
      voteAccess: "anonymous",
      isPublished: true,
    });
    const ltPollId = legacyTestPoll._id;
    const ltQId = legacyTestPoll.questions[0]._id;

    // A. Verify multiple distinct anonymous voters can vote on the same poll (the core bug fixed!)
    const anonRes1 = await Response.create({
      poll: ltPollId,
      respondent: null,
      anonymousVoterHash: "post_mig_anon_1",
      submissionType: "anonymous",
      answers: [{ questionId: ltQId, selectedOption: "Yes" }],
    });
    const anonRes2 = await Response.create({
      poll: ltPollId,
      respondent: null,
      anonymousVoterHash: "post_mig_anon_2",
      submissionType: "anonymous",
      answers: [{ questionId: ltQId, selectedOption: "Definitely" }],
    });
    assert.ok(anonRes1._id && anonRes2._id, "Multiple distinct anonymous voters must succeed on same poll");
    console.log("✓ Verified: Multiple distinct anonymous voters recorded on same poll without collision.");

    // B. Verify anonymous duplicate protection remains active
    let anonDupCaught = false;
    try {
      await Response.create({
        poll: ltPollId,
        respondent: null,
        anonymousVoterHash: "post_mig_anon_1",
        submissionType: "anonymous",
        answers: [{ questionId: ltQId, selectedOption: "Yes" }],
      });
    } catch (err) {
      if (err.code === 11000) {
        anonDupCaught = true;
        assert.deepStrictEqual(
          err.keyPattern,
          { poll: 1, anonymousVoterHash: 1 },
          "Duplicate key error must originate from anonymous index"
        );
        console.log("✓ Verified: Duplicate anonymous voter correctly rejected by preserved poll_1_anonymousVoterHash_1.");
      } else {
        throw err;
      }
    }
    assert.strictEqual(anonDupCaught, true, "Anonymous duplicate protection must remain strictly active");

    // C. Verify authenticated voting & duplicate protection on same poll
    const authTestUser = new mongoose.Types.ObjectId();
    const authRes = await Response.create({
      poll: ltPollId,
      respondent: authTestUser,
      anonymousVoterHash: null,
      submissionType: "authenticated",
      answers: [{ questionId: ltQId, selectedOption: "Yes" }],
    });
    assert.ok(authRes._id, "Authenticated vote must succeed");

    let authDupCaught = false;
    try {
      await Response.create({
        poll: ltPollId,
        respondent: authTestUser,
        anonymousVoterHash: null,
        submissionType: "authenticated",
        answers: [{ questionId: ltQId, selectedOption: "Definitely" }],
      });
    } catch (err) {
      if (err.code === 11000) {
        authDupCaught = true;
        assert.deepStrictEqual(
          err.keyPattern,
          { poll: 1, respondent: 1 },
          "Duplicate key error must originate from authenticated index"
        );
        console.log("✓ Verified: Duplicate authenticated voter correctly rejected by replaced poll_1_respondent_1.");
      } else {
        throw err;
      }
    }
    assert.strictEqual(authDupCaught, true, "Authenticated duplicate protection must remain strictly active");

    console.log("PASSED: Legacy index successfully replaced, verified, and full voting integrity validated!");

    console.log("\n=================================================");
    console.log("ALL 19 DATABASE INDEX, CONCURRENCY & SAFETY TESTS PASSED!");
    console.log("=================================================");
  } finally {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
        console.log("Cleaned up Mongoose connection.");
      } catch (err) {
        console.error("Error during Mongoose disconnect:", err);
      }
    }
    if (mongod) {
      try {
        await mongod.stop();
        console.log("Cleaned up MongoMemoryServer instance.");
      } catch (err) {
        console.error("Error during MongoMemoryServer stop:", err);
      }
    }
  }
}

runTests()
  .then(() => {
    console.log("Test suite completed cleanly.");
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  });
