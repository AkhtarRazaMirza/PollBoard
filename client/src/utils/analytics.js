function normalizeOption(option) {
  if (!option) {
    return null;
  }

  return {
    label: option.label || "Option",
    votes: Number(option.votes || 0),
    percentage: Number(option.percentage || 0),
    question: option.question || "",
    questionId: option.questionId || "",
  };
}

function csvEscape(value) {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value);

  return `"${normalizedValue.replaceAll('"', '""')}"`;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], {
    type: mimeType,
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}

export function normalizeAnalytics(payload) {
  const source = payload?.data || payload;
  const resultsSource = source?.results || [];
  const responseTrendBuckets =
    source?.responseTrend?.buckets || [];
  const participation = source?.participation || {};

  return {
    id: source?.pollId || source?.id || "",
    title: source?.pollTitle || source?.title || "Poll analytics",
    description:
      source?.pollDescription || source?.description || "",
    totalVotes: Number(source?.totalVotes || 0),
    totalResponses: Number(
      source?.totalResponses || source?.totalVotes || 0,
    ),
    questionCount: Number(
      source?.questionCount || resultsSource.length || 0,
    ),
    voteAccess:
      source?.voteAccess ||
      (source?.isAnonymous ? "anonymous" : "authenticated"),
    isAnonymous: Boolean(source?.isAnonymous),
    resultsPublished: Boolean(
      source?.resultsPublished || source?.isPublished,
    ),
    canPublishResults: Boolean(source?.canPublishResults),
    canViewResults: Boolean(source?.canViewResults ?? true),
    isClosed: Boolean(source?.isClosed),
    isExpired: Boolean(source?.isExpired),
    expiresAt: source?.expiresAt || null,
    viewerCount: Number(source?.viewerCount || 0),
    participation: {
      anonymousResponses: Number(participation.anonymousResponses || 0),
      authenticatedResponses: Number(
        participation.authenticatedResponses || 0,
      ),
      anonymousRatio: Number(participation.anonymousRatio || 0),
      authenticatedRatio: Number(
        participation.authenticatedRatio || 0,
      ),
      completionRate: Number(participation.completionRate || 0),
      averageAnswersPerResponse: Number(
        participation.averageAnswersPerResponse || 0,
      ),
    },
    responseTrend: {
      interval: source?.responseTrend?.interval || "hour",
      buckets: responseTrendBuckets.map((bucket, index) => ({
        id: bucket.bucketStart || `bucket-${index}`,
        bucketStart: bucket.bucketStart || "",
        label: bucket.label || `Point ${index + 1}`,
        responses: Number(bucket.responses || 0),
      })),
    },
    mostSelectedOption: normalizeOption(source?.mostSelectedOption),
    leastSelectedOption: normalizeOption(source?.leastSelectedOption),
    questionSummaries: (source?.questionSummaries || []).map(
      (question, index) => ({
        id: question.questionId || `summary-${index}`,
        questionId: question.questionId || `summary-${index}`,
        question: question.question || `Question ${index + 1}`,
        totalVotes: Number(question.totalVotes || 0),
        participationRate: Number(question.participationRate || 0),
        topOption: normalizeOption(question.topOption),
        leastOption: normalizeOption(question.leastOption),
      }),
    ),
    questions: resultsSource.map((question, questionIndex) => {
      const options = (question.options || []).map((option, optionIndex) => ({
        id: `${question.questionId || questionIndex}-${optionIndex}`,
        label: option.label || `Option ${optionIndex + 1}`,
        votes: Number(option.votes || 0),
        percentage: Number(option.percentage || 0),
      }));

      return {
        id: question.questionId || `question-${questionIndex}`,
        questionId: question.questionId || `question-${questionIndex}`,
        prompt: question.question || `Question ${questionIndex + 1}`,
        required: Boolean(question.required),
        totalVotes: Number(question.totalVotes || 0),
        participationRate: Number(question.participationRate || 0),
        topOption: normalizeOption(question.topOption),
        leastOption: normalizeOption(question.leastOption),
        options,
      };
    }),
  };
}

export function exportAnalyticsCsv(analytics) {
  const rows = [
    ["Poll title", analytics.title],
    ["Description", analytics.description],
    ["Total responses", analytics.totalResponses],
    ["Anonymous responses", analytics.participation.anonymousResponses],
    [
      "Authenticated responses",
      analytics.participation.authenticatedResponses,
    ],
    ["Completion rate", `${analytics.participation.completionRate}%`],
    [
      "Average answers per response",
      analytics.participation.averageAnswersPerResponse,
    ],
    [],
    [
      "Question",
      "Option",
      "Votes",
      "Percentage",
      "Question total votes",
      "Participation rate",
    ],
  ];

  analytics.questions.forEach((question) => {
    question.options.forEach((option) => {
      rows.push([
        question.prompt,
        option.label,
        option.votes,
        `${option.percentage}%`,
        question.totalVotes,
        `${question.participationRate}%`,
      ]);
    });
  });

  if (analytics.responseTrend.buckets.length > 0) {
    rows.push([]);
    rows.push(["Trend bucket", "Responses"]);

    analytics.responseTrend.buckets.forEach((bucket) => {
      rows.push([bucket.label, bucket.responses]);
    });
  }

  const csvContent = rows
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  const fileName = `${analytics.title || "pollboard-analytics"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  downloadFile(
    `${fileName || "pollboard-analytics"}.csv`,
    csvContent,
    "text/csv;charset=utf-8;",
  );
}

export function printAnalytics() {
  window.print();
}