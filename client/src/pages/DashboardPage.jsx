import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import AnalyticsWorkspace from "../components/AnalyticsWorkspace";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import PollCard from "../components/PollCard";
import SkeletonCard from "../components/SkeletonCard";
import usePollSocket from "../hooks/usePollSocket";
import api from "../services/axios";
import {
  exportAnalyticsCsv,
  normalizeAnalytics,
  printAnalytics,
} from "../utils/analytics";
import {
  getPollStatus,
  getResponseCount,
  normalizePolls,
} from "../utils/polls";

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

  const applyAnalyticsState = (nextAnalytics) => {
    setAnalytics(nextAnalytics);
    setSelectedQuestionId((previousQuestionId) => {
      if (nextAnalytics?.questions.some((question) => question.id === previousQuestionId)) {
        return previousQuestionId;
      }

      return nextAnalytics?.questions[0]?.id || "";
    });
  };

  const fetchDashboardPolls = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get("/polls/my-polls");
      const nextPolls = normalizePolls(response.data);

      setPolls(nextPolls);
      setSelectedPollId((previousPollId) => {
        if (nextPolls.some((poll) => poll.id === previousPollId)) {
          return previousPollId;
        }

        return nextPolls[0]?.id || "";
      });

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
      return;
    }

    let isActive = true;

    const fetchAnalytics = async () => {
      setIsAnalyticsLoading(true);
      setAnalyticsError("");

      try {
        const response = await api.get(`/polls/${selectedPollId}/results`);
        const nextAnalytics = normalizeAnalytics(response.data);

        if (isActive) {
           applyAnalyticsState(nextAnalytics);
        }
      } catch (error) {
        if (isActive) {
          setAnalyticsError(error.message || "Could not load analytics for this poll.");
          setAnalytics(null);
        }
      } finally {
        if (isActive) {
          setIsAnalyticsLoading(false);
        }
      }
    };

    void fetchAnalytics();

    return () => {
      isActive = false;
    };
  }, [selectedPollId]);

  usePollSocket({
    pollId: selectedPollId,
    enabled: Boolean(selectedPollId && analytics),
    onResultsUpdated: (payload) => {
      const nextAnalytics = normalizeAnalytics(payload.results);

      setAnalytics(nextAnalytics);
      setPolls((previousPolls) =>
        previousPolls.map((poll) =>
          poll.id === selectedPollId
            ? {
                ...poll,
                responseCount: nextAnalytics.totalResponses,
                totalResponses: nextAnalytics.totalResponses,
                totalVotes: nextAnalytics.totalResponses,
                resultsPublished: nextAnalytics.resultsPublished,
                isPublished: nextAnalytics.resultsPublished,
                isClosed: nextAnalytics.isClosed,
                isExpired: nextAnalytics.isExpired,
              }
            : poll,
        ),
      );
    },
    onPresenceUpdated: ({ viewerCount }) => {
      setAnalytics((previousAnalytics) =>
        previousAnalytics
          ? {
              ...previousAnalytics,
              viewerCount: Number(viewerCount || 0),
            }
          : previousAnalytics,
      );
    },
    onResponded: ({ totalResponses }) => {
      setPolls((previousPolls) =>
        previousPolls.map((poll) =>
          poll.id === selectedPollId
            ? {
                ...poll,
                responseCount: Number(totalResponses || 0),
                totalResponses: Number(totalResponses || 0),
                totalVotes: Number(totalResponses || 0),
              }
            : poll,
        ),
      );
    },
  });

  const stats = useMemo(() => {
    const totalPolls = polls.length;
    const activePolls = polls.filter((poll) => getPollStatus(poll) === "active").length;
    const totalResponses = polls.reduce(
      (sum, poll) => sum + Number(getResponseCount(poll)),
      0,
    );
    const publishedResults = polls.filter((poll) => poll.resultsPublished).length;

    return [
      {
        label: "Total polls",
        value: totalPolls,
      },
      {
        label: "Active polls",
        value: activePolls,
      },
      {
        label: "Responses",
        value: totalResponses,
      },
      {
        label: "Published",
        value: publishedResults,
      },
    ];
  }, [polls]);

  const selectedPoll = useMemo(
    () => polls.find((poll) => poll.id === selectedPollId) || null,
    [polls, selectedPollId],
  );

  const publishResults = async () => {
    if (!selectedPollId) {
      return;
    }

    setIsPublishing(true);

    try {
      const response = await api.patch(`/polls/${selectedPollId}/publish`, {});
      const nextAnalytics = normalizeAnalytics(response.data?.data?.results || response.data?.data);

      setAnalytics(nextAnalytics);
      setPolls((previousPolls) =>
        previousPolls.map((poll) =>
          poll.id === selectedPollId
            ? {
                ...poll,
                resultsPublished: true,
                isPublished: true,
                isClosed: true,
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
        {stats.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="panel p-5"
          >
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
        <div className="panel p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Analytics snapshot</h2>
              <p className="mt-1 text-sm text-gray-600">
                Review turnout, live activity, and publish results when you are ready.
              </p>
            </div>

            <select
              value={selectedPollId}
              onChange={(event) => setSelectedPollId(event.target.value)}
              className="field max-w-xs"
            >
              {polls.map((poll) => (
                <option key={poll.id} value={poll.id}>
                  {poll.title}
                </option>
              ))}
            </select>
          </div>

          {selectedPoll ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900">{selectedPoll.title}</p>
              <p className="mt-1">
                {selectedPoll.description || "Realtime analytics for your selected poll."}
              </p>
            </div>
          ) : null}

          {isAnalyticsLoading ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <SkeletonCard lines={5} />
              <SkeletonCard lines={4} />
            </div>
          ) : analyticsError ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {analyticsError}
            </div>
          ) : analytics ? (
            <div className="mt-5">
              <AnalyticsWorkspace
                analytics={analytics}
                selectedQuestionId={selectedQuestionId}
                onSelectedQuestionIdChange={setSelectedQuestionId}
                onExportCsv={() => exportAnalyticsCsv(analytics)}
                onPrint={printAnalytics}
                onPublish={publishResults}
                isPublishing={isPublishing}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              Select a poll to load analytics.
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
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}