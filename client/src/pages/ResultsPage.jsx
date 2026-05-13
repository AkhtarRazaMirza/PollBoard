import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnalyticsWorkspace from "../components/AnalyticsWorkspace";
import EmptyState from "../components/EmptyState";
import Navbar from "../components/Navbar";
import SkeletonCard from "../components/SkeletonCard";
import usePollSocket from "../hooks/usePollSocket";
import api from "../services/axios";
import {
  exportAnalyticsCsv,
  normalizeAnalytics,
  printAnalytics,
} from "../utils/analytics";
import { formatDateTime } from "../utils/polls";

export default function ResultsPage({
  authToken,
  currentUser,
  onLogout,
  showNotification,
}) {
  const { id } = useParams();
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

 const applyResultsState = (nextResults) => {
    setResults(nextResults);
    setSelectedQuestionId((previousQuestionId) => {
      if (nextResults?.questions.some((question) => question.id === previousQuestionId)) {
        return previousQuestionId;
      }

      return nextResults?.questions[0]?.id || "";
    });
  };


  useEffect(() => {
    let isActive = true;

    const fetchResults = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get(`/polls/${id}/results`);
        const nextResults = normalizeAnalytics(response.data);

        if (isActive) {
          applyResultsState(nextResults);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message || "Could not load poll results.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void fetchResults();

    return () => {
      isActive = false;
    };
  }, [id]);

  usePollSocket({
    pollId: id,
    enabled: Boolean(results?.canViewResults),
    onResultsUpdated: (payload) => {
     applyResultsState(normalizeAnalytics(payload.results));
    },
    onPresenceUpdated: ({ viewerCount }) => {
      setResults((previousResults) =>
        previousResults
          ? {
              ...previousResults,
              viewerCount: Number(viewerCount || 0),
            }
          : previousResults,
      );
    },
  });

  const publishResults = async () => {
    setIsPublishing(true);

    try {
      const response = await api.patch(`/polls/${id}/publish`, {});
      const nextResults = normalizeAnalytics(response.data?.data?.results || response.data?.data);

       applyResultsState(nextResults);
      showNotification("Results published successfully.", "success");
    } catch (error) {
      showNotification(error.message || "Could not publish results.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        isAuthenticated={Boolean(authToken)}
        currentUser={currentUser}
        onLogout={onLogout}
        links={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Open poll", to: `/poll/${id}` },
        ]}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {isLoading ? (
          <div className="space-y-4 py-6">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={5} />
            <SkeletonCard lines={5} />
          </div>
        ) : errorMessage ? (
          <EmptyState
            title="Could not load results"
            description={errorMessage}
            actionLabel="Back to poll"
            actionTo={`/poll/${id}`}
          />
        ) : !results ? (
          <EmptyState
            title="No results yet"
            description="There are no results to show for this poll right now."
            actionLabel="Back to poll"
            actionTo={`/poll/${id}`}
          />
        ) : (
          <div className="space-y-6">
            <section className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{results.title}</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    {results.description || "A clear breakdown of how respondents answered."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                    <span>
                      {results.voteAccess === "authenticated"
                        ? "Login required"
                        : "Anonymous voting"}
                    </span>
                    <span>{results.resultsPublished ? "Public results" : "Private results"}</span>
                    <span>Expires {formatDateTime(results.expiresAt)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{results.totalResponses} total responses</p>
                  <p className="mt-1">Live viewers: {results.viewerCount}</p>
                  <p className="mt-1">
                    {results.resultsPublished
                      ? "This dashboard is now public for anyone with the link."
                      : "Only the creator can see this dashboard right now."}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 print-hidden">
                <Link to={`/poll/${id}`} className="btn-secondary">
                  Open poll page
                </Link>
              </div>
            </section>

            <AnalyticsWorkspace
              analytics={results}
              selectedQuestionId={selectedQuestionId}
              onSelectedQuestionIdChange={setSelectedQuestionId}
              onExportCsv={() => exportAnalyticsCsv(results)}
              onPrint={printAnalytics}
              onPublish={publishResults}
              isPublishing={isPublishing}
            />
          </div>
        )}
      </main>
    </div>
  );
}