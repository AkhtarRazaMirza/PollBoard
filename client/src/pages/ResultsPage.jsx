import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import EmptyState from "../components/EmptyState";
import Navbar from "../components/Navbar";
import SkeletonCard from "../components/SkeletonCard";
import api, { socketBaseURL } from "../services/axios";

function normalizeResults(payload) {
  const source = payload?.data || payload;
  const questionSource = source?.results || [];

  return {
    title: source?.pollTitle || "Poll results",
    description: source?.pollDescription || "",
    totalVotes: Number(source?.totalVotes || 0),
    voteAccess:
      source?.voteAccess ||
      (source?.isAnonymous ? "anonymous" : "authenticated"),
    resultsPublished: Boolean(source?.resultsPublished || source?.isPublished),
    canPublishResults: Boolean(source?.canPublishResults),
    canViewResults: Boolean(source?.canViewResults ?? true),
    isClosed: Boolean(source?.isClosed),
    isExpired: Boolean(source?.isExpired),
    expiresAt: source?.expiresAt || null,
    questions: questionSource.map((question, questionIndex) => {
      const options = (question.options || []).map((option, optionIndex) => ({
        id: `option-${questionIndex}-${optionIndex}`,
        label: option.label,
        votes: Number(option.votes || 0),
        percentage: Number(option.percentage || 0),
      }));

      const questionVotes = options.reduce((sum, option) => sum + option.votes, 0);

      return {
        id: question.questionId || `question-${questionIndex}`,
        prompt: question.question || `Question ${questionIndex + 1}`,
        required: Boolean(question.required),
        options,
        totalVotes: question.totalVotes ?? questionVotes,
      };
    }),
  };
}

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

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get(`/polls/${id}/results`);
        setResults(normalizeResults(response.data));
      } catch (error) {
        setErrorMessage(error.message || "Could not load poll results.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  useEffect(() => {
    if (!results?.canViewResults) {
      return undefined;
    }

    const socket = io(socketBaseURL, {
      transports: ["websocket"],
    });

    socket.emit("poll:join", id);

    socket.on("poll:results-updated", (payload) => {
      if (payload?.pollId !== id || !payload?.results) {
        return;
      }

      setResults(normalizeResults(payload.results));
    });

    return () => {
      socket.emit("poll:leave", id);
      socket.disconnect();
    };
  }, [id, results?.canViewResults]);

  const publishResults = async () => {
    setIsPublishing(true);

    try {
      const response = await api.patch(`/polls/${id}/publish`);
      const nextResults = normalizeResults(response.data?.data?.results || response.data?.data);

      setResults(nextResults);
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

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{results.title}</h1>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {results.description || "A simple breakdown of how people answered."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
                    <span>
                      {results.voteAccess === "authenticated"
                        ? "Login required"
                        : "Anonymous voting"}
                    </span>
                    <span>{results.resultsPublished ? "Public results" : "Private results"}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{results.totalVotes} total votes</p>
                  <p className="mt-1">
                    {results.resultsPublished
                      ? "Updated live for everyone viewing this poll."
                      : "Only the creator can see these analytics right now."}
                  </p>
                </div>
              </div>

              {results.canPublishResults ? (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Creator controls</p>
                      <p className="mt-1 text-sm text-blue-800">
                        Publish results when you are ready. This will make analytics public
                        and close the poll for further voting.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={publishResults}
                      disabled={isPublishing}
                      className="btn-primary"
                    >
                      {isPublishing ? "Publishing..." : "Publish Results"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            {results.questions.length === 0 ? (
              <EmptyState
                title="No answers yet"
                description="Responses will show up here as votes come in."
                actionLabel="Back to poll"
                actionTo={`/poll/${id}`}
              />
            ) : (
              results.questions.map((question, questionIndex) => (
                <section key={question.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {questionIndex + 1}. {question.prompt}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {question.totalVotes} votes for this question
                      </p>
                    </div>
                    <Link to={`/poll/${id}`} className="text-link">
                      Back to poll
                    </Link>
                  </div>

                  <div className="mt-5 space-y-4">
                    {question.options.map((option) => (
                      <div key={option.id}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                          <span className="text-gray-700">{option.label}</span>
                          <span className="font-medium text-gray-900">
                            {option.votes} votes ({option.percentage}%)
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100">
                          <div
                            className="h-3 rounded-full bg-blue-600 transition-all duration-200"
                            style={{ width: `${option.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}