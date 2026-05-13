export const anonymousVoterHeader =
  "x-pollboard-voter-token";

const anonymousVoterTokenKey =
  "pollboard_anonymous_voter_token";
const anonymousVotePrefix =
  "pollboard_anonymous_vote";

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createVoterToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `pollboard-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function getOrCreateAnonymousVoterToken() {
  if (!canUseLocalStorage()) {
    return createVoterToken();
  }

  const existingToken =
    window.localStorage.getItem(anonymousVoterTokenKey);

  if (existingToken) {
    return existingToken;
  }

  const nextToken = createVoterToken();

  window.localStorage.setItem(
    anonymousVoterTokenKey,
    nextToken,
  );

  return nextToken;
}

export function hasAnonymousVoteRecord(pollId) {
  if (!canUseLocalStorage() || !pollId) {
    return false;
  }

  return (
    window.localStorage.getItem(
      `${anonymousVotePrefix}:${pollId}`,
    ) === "true"
  );
}

export function markAnonymousVoteRecord(pollId) {
  if (!canUseLocalStorage() || !pollId) {
    return;
  }

  window.localStorage.setItem(
    `${anonymousVotePrefix}:${pollId}`,
    "true",
  );
}