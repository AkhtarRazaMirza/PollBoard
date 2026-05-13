const fallbackDateLabel =
  "No expiry";

export function extractPollList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data?.polls)) {
    return payload.data.polls;
  }

  if (Array.isArray(payload?.polls)) {
    return payload.polls;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

export function getQuestionCount(poll) {
  return (
    poll?.questionCount ||
    poll?.questions?.length ||
    0
  );
}

export function getResponseCount(poll) {
  return Number(
    poll?.responseCount ||
    poll?.responsesCount ||
    poll?.totalResponses ||
    poll?.totalVotes ||
    poll?.voteCount ||
    0,
  );
}

export function getVoteAccessLabel(poll) {
  const voteAccess =
    poll?.voteAccess ||
    (poll?.isAnonymous ? "anonymous" : "authenticated");

  return voteAccess === "authenticated"
    ? "Login required"
    : "Anonymous voting";
}

export function getPollStatus(poll) {
  if (!poll) {
    return "unknown";
  }

  if (poll.resultsPublished || poll.isPublished) {
    return "published";
  }

  if (poll.isExpired) {
    return "expired";
  }

  if (poll.isClosed || poll.closed) {
    return "closed";
  }

  const expiryValue =
    poll.expiresAt || poll.expiryDate;

  if (expiryValue) {
    const expiryDate = new Date(expiryValue);

    if (!Number.isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
      return "expired";
    }
  }

  return "active";
}

export function formatShortDate(dateValue) {
  if (!dateValue) {
    return fallbackDateLabel;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return fallbackDateLabel;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateValue) {
  if (!dateValue) {
    return "No expiry set";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "No expiry set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function normalizePoll(poll, index = 0) {
  const expiryValue =
    poll?.expiresAt || poll?.expiryDate || null;
  const voteAccess =
    poll?.voteAccess ||
    (poll?.isAnonymous ? "anonymous" : "authenticated");
  const isExpired =
    Boolean(poll?.isExpired) ||
    (expiryValue ? new Date(expiryValue) < new Date() : false);
  const resultsPublished = Boolean(
    poll?.resultsPublished || poll?.isPublished,
  );
  const isClosed = Boolean(
    poll?.isClosed || poll?.closed || isExpired || resultsPublished,
  );

  return {
    ...poll,
    id: poll?.id || poll?._id || `poll-${index}`,
    title: poll?.title || poll?.pollTitle || "Untitled poll",
    description:
      poll?.description || poll?.pollDescription || "",
    voteAccess,
    isAnonymous: voteAccess === "anonymous",
    expiresAt: expiryValue,
    isExpired,
    isClosed,
    resultsPublished,
    canVote: Boolean(poll?.canVote ?? !(isClosed || resultsPublished)),
    canViewResults: Boolean(
      poll?.canViewResults ?? (resultsPublished || poll?.isOwner),
    ),
    canPublishResults: Boolean(poll?.canPublishResults),
    isOwner: Boolean(poll?.isOwner),
    questions: (poll?.questions || []).map((question, questionIndex) => ({
      ...question,
      id: question?.id || question?._id || `question-${questionIndex}`,
      prompt:
        question?.prompt ||
        question?.questionText ||
        question?.question ||
        question?.text ||
        `Question ${questionIndex + 1}`,
      required: Boolean(question?.required ?? question?.isRequired ?? true),
      options: (question?.options || []).map((option, optionIndex) => {
        const optionLabel =
          typeof option === "string"
            ? option
            : option?.label || option?.text || option?.value || `Option ${optionIndex + 1}`;

        return {
          id:
            (typeof option === "object" &&
              (option?.id || option?._id || option?.value || option?.label)) ||
            `${question?.id || question?._id || questionIndex}-option-${optionIndex}`,
          label: optionLabel,
        };
      }),
    })),
    responseCount: getResponseCount(poll),
    questionCount: getQuestionCount(poll),
    status: getPollStatus({
      ...poll,
      isExpired,
      isClosed,
      resultsPublished,
    }),
  };
}

export function normalizePolls(payload) {
  return extractPollList(payload).map((poll, index) =>
    normalizePoll(poll, index),
  );
}