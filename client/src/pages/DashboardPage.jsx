import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import PollCard from "../components/PollCard";
import SkeletonCard from "../components/SkeletonCard";
import api from "../services/axios";

function extractPollList(payload) {
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

  return [];
}

function normalizePolls(payload) {
  return extractPollList(payload).map((poll, index) => ({
    ...poll,
    id: poll.id || poll._id || `poll-${index}`,
    title: poll.title || poll.pollTitle || "Untitled poll",
    description: poll.description || poll.pollDescription || "",
  }));
}

function normalizeResults(payload) {
  const source = payload?.data || payload;

  return {
    title: source?.pollTitle || "Poll analytics",
    totalVotes: Number(source?.totalVotes || 0),
    resultsPublished: Boolean(source?.resultsPublished),
    canPublishResults: Boolean(source?.canPublishResults),
    questions: (source?.results || []).map((question, questionIndex) => ({
      id: question.questionId || `question-${questionIndex}`,
      prompt: question.question || `Question ${questionIndex + 1}`,
      totalVotes: Number(question.totalVotes || 0),
      options: (question.options || []).map((option, optionIndex) => ({
        id: `${questionIndex}-${optionIndex}`,
        label: option.label,
        votes: Number(option.votes || 0),
        percentage: Number(option.percentage || 0),
      })),
    })),
  };
}

function getStatus(poll) {
  if (!poll) {
    return "Unknown";
  }

  if (poll.isClosed || poll.closed) {
    return "Closed";
  }

  if (poll.expiresAt || poll.expiryDate) {
    const expiryDate = new Date(poll.expiresAt || poll.expiryDate);

    if (!Number.isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
      return "Expired";
    }
  }

  return "Active";
}

function getResponses(poll) {
  return (
    poll.responseCount ||
    poll.responsesCount ||
    poll.totalResponses ||
    poll.totalVotes ||
    poll.voteCount ||
    0
  );
}

export default function DashboardPage({ showNotification }) {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPollId, setSelectedPollId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchDashboardPolls = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get("/polls/my-polls");
      const nextPolls = normalizePolls(response.data);

      setPolls(nextPolls);
      setSelectedPollId((previousValue) => previousValue || nextPolls[0]?.id || "");
      if (nextPolls.length === 0) {
        setAnalytics(null);
        setSelectedQuestionId("");
      }
    } catch (error) {
      setErrorMessage(error.message || "Could not load your polls.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDashboardPolls();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!selectedPollId) {
     return undefined;
    }

    const fetchAnalytics = async () => {
      setIsAnalyticsLoading(true);
      setAnalyticsError("");

      try {
        const response = await api.get(`/polls/${selectedPollId}/results`);
        const nextAnalytics = normalizeResults(response.data);

        setAnalytics(nextAnalytics);
        setSelectedQuestionId((previousValue) =>
            nextAnalytics.questions.some((question) => question.id === previousValue)
            ? previousValue
            : nextAnalytics.questions[0]?.id || "",
        );
      } catch (error) {
        setAnalyticsError(error.message || "Could not load analytics for this poll.");
        setAnalytics(null);
      } finally {
        setIsAnalyticsLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void fetchAnalytics();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedPollId]);

  const stats = useMemo(() => {
    const totalPolls = polls.length;
    const activePolls = polls.filter((poll) => getStatus(poll) === "Active").length;
    const totalResponses = polls.reduce(
      (sum, poll) => sum + Number(getResponses(poll)),
      0,
    );
    const publishedResults = polls.filter((poll) => poll.resultsPublished).length;

    return [
      { label: "Total polls", value: totalPolls },
      { label: "Active polls", value: activePolls },
      { label: "Responses", value: totalResponses },
      { label: "Published", value: publishedResults },
    ];
  }, [polls]);

  const selectedPoll = useMemo(
    () => polls.find((poll) => (poll.id || poll._id) === selectedPollId) || null,
    [polls, selectedPollId],
  );

  const selectedQuestion = useMemo(
    () => analytics?.questions?.find((question) => question.id === selectedQuestionId) || null,
    [analytics, selectedQuestionId],
  );

  const chartData = useMemo(
    () =>
      (selectedQuestion?.options || []).map((option) => ({
        name: option.label,
        votes: option.votes,
        percentage: option.percentage,
      })),
    [selectedQuestion],
  );

  const publishResults = async () => {
    if (!selectedPollId) {
      return;
    }

    setIsPublishing(true);

    try {
      const response = await api.patch(`/polls/${selectedPollId}/publish`);
      const nextAnalytics = normalizeResults(response.data?.data?.results || response.data?.data);

      setAnalytics(nextAnalytics);
      setPolls((previousPolls) =>
        previousPolls.map((poll) =>
          (poll.id || poll._id) === selectedPollId
            ? {
              ...poll,
              isClosed: true,
              resultsPublished: true,
              isPublished: true,
            }
            : poll,
        ),
      );
      showNotification("Results published successfully.", "success");
    } catch (error) {
      showNotification(error.message || "Could not publish results.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner className="py-24" />;
  }

  if (errorMessage) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={errorMessage}
        actionButton={
          <button type="button" onClick={fetchDashboardPolls} className="btn-primary">
            Try again
          </button>
        }
      />
    );
  }

  if (polls.length === 0) {
    return (
      <EmptyState
        title="No polls created yet"
        description="Once you create a poll, it will show up here with its status and response count."
        actionLabel="Create your first poll"
        actionTo="/create-poll"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="panel p-5">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
        <div className="panel p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Analytics snapshot</h2>
              <p className="mt-1 text-sm text-gray-600">
                Review percentages, turnout, and publish results when you are ready.
              </p>
            </div>

            <select
              value={selectedPollId}
              onChange={(event) => setSelectedPollId(event.target.value)}
              className="field max-w-xs"
            >
              {polls.map((poll) => (
                <option key={poll.id || poll._id} value={poll.id || poll._id}>
                  {poll.title}
                </option>
              ))}
            </select>
          </div>

          {isAnalyticsLoading ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <SkeletonCard lines={5} />
              <SkeletonCard lines={4} />
            </div>
          ) : analyticsError ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {analyticsError}
            </div>
          ) : !analytics ? (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              Select a poll to load analytics.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{analytics.title}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {analytics.totalVotes} total responses so far
                      </p>
                    </div>

                    {analytics.questions.length > 0 ? (
                      <select
                        value={selectedQuestionId}
                        onChange={(event) => setSelectedQuestionId(event.target.value)}
                        className="field max-w-xs"
                      >
                        {analytics.questions.map((question) => (
                          <option key={question.id} value={question.id}>
                            {question.prompt}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>

                  {selectedQuestion ? (
                    <div className="mt-5">
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 12, right: 12, left: 0, bottom: 16 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                              interval={0}
                              angle={chartData.length > 3 ? -12 : 0}
                              textAnchor={chartData.length > 3 ? "end" : "middle"}
                              height={chartData.length > 3 ? 60 : 40}
                            />
                            <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="votes" fill="#2563eb" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
                      Votes will appear here once responses come in.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Summary
                  </h3>
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <p>
                      Status:{" "}
                      <span className="font-medium text-gray-900">{getStatus(selectedPoll)}</span>
                    </p>
                    <p>
                      Visibility:{" "}
                      <span className="font-medium text-gray-900">
                        {analytics.resultsPublished ? "Public results" : "Private results"}
                      </span>
                    </p>
                    <p>
                      Access:{" "}
                      <span className="font-medium text-gray-900">
                        {selectedPoll?.voteAccess === "authenticated"
                          ? "Login required"
                          : "Anonymous voting"}
                      </span>
                    </p>
                    <p>
                      Question votes:{" "}
                      <span className="font-medium text-gray-900">
                        {selectedQuestion?.totalVotes || 0}
                      </span>
                    </p>
                  </div>

                  {analytics.canPublishResults ? (
                    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
                      <p className="text-sm font-medium text-blue-900">
                        Only you can see this analytics panel right now.
                      </p>
                      <p className="mt-1 text-sm text-blue-800">
                        Publishing results will make this page public and stop voting.
                      </p>
                      <button
                        type="button"
                        onClick={publishResults}
                        disabled={isPublishing}
                        className="btn-primary mt-4 w-full"
                      >
                        {isPublishing ? "Publishing..." : "Publish Results"}
                      </button>
                    </div>
                  ) : null}

                  {selectedQuestion?.options?.length ? (
                    <div className="mt-5 space-y-3">
                      {selectedQuestion.options.map((option) => (
                        <div key={option.id}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-gray-700">{option.label}</span>
                            <span className="font-medium text-gray-900">
                              {option.percentage}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{ width: `${option.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Created polls</h2>
              <p className="mt-1 text-sm text-gray-600">
                Keep an eye on what is still open and what needs follow-up.
              </p>
            </div>

            <button type="button" onClick={fetchDashboardPolls} className="btn-secondary">
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {polls.map((poll) => (
              <PollCard key={poll.id || poll._id} poll={poll} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}