import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AnalyticsWorkspace from "../components/AnalyticsWorkspace";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import SkeletonCard from "../components/SkeletonCard";
import usePollSocket from "../hooks/usePollSocket";
import api from "../services/axios";
import {
  exportAnalyticsCsv,
  normalizeAnalytics,
  printAnalytics,
} from "../utils/analytics";
import {
  formatDateTime,
  normalizePoll,
} from "../utils/polls";
import {
  anonymousVoterHeader,
  getOrCreateAnonymousVoterToken,
  hasAnonymousVoteRecord,
  markAnonymousVoteRecord,
} from "../utils/voter";

export default function PollPage({
  authToken,
  currentUser,
  onLogout,
  showNotification,
}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [hasSubmittedVote, setHasSubmittedVote] = useState(false);
  const [anonymousVoteLocked, setAnonymousVoteLocked] = useState(false);
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

    const fetchPollDetails = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setHasSubmittedVote(false);

      try {
        const response = await api.get(`/polls/${id}`);
        const nextPoll = normalizePoll(response.data);

        if (!isActive) {
          return;
        }

        setPoll(nextPoll);
        setAnonymousVoteLocked(
          nextPoll.voteAccess === "anonymous" && hasAnonymousVoteRecord(id),
        );

        if (nextPoll.resultsPublished) {
          const resultsResponse = await api.get(`/polls/${id}/results`);

          if (!isActive) {
            return;
          }

          applyResultsState(normalizeAnalytics(resultsResponse.data));
        } else {
          setResults(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message || "Could not load this poll.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void fetchPollDetails();

    return () => {
      isActive = false;
    };
  }, [id]);

  usePollSocket({
    pollId: id,
    enabled: Boolean(poll?.resultsPublished && results?.canViewResults),
    onResultsUpdated: (payload) => {
      applyResultsState(normalizeAnalytics(payload.results));
      setPoll((previousPoll) =>
        previousPoll
          ? {
            ...previousPoll,
            resultsPublished: true,
            isPublished: true,
            isClosed: true,
            responseCount: payload.results?.totalResponses || previousPoll.responseCount,
          }
          : previousPoll,
      );
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

  const missingRequiredQuestions = useMemo(() => {
    if (!poll) {
      return [];
    }

    return (poll.questions || []).filter(
      (question) => question.required && !answers[question.id || question._id],
    );
  }, [answers, poll]);

  const statusMessage = useMemo(() => {
    if (!poll) {
      return "";
    }

    if (poll.resultsPublished) {
      return "Results are published. Voting is closed and this page now shows the public dashboard.";
    }

    if (poll.voteAccess === "anonymous" && anonymousVoteLocked) {
      return "This browser has already submitted a vote for this poll.";
    }

    if (poll.isExpired) {
      return "Poll expired";
    }

    if (poll.isClosed) {
      return "Poll closed";
    }

    return "";
  }, [anonymousVoteLocked, poll]);

  const updateAnswer = (questionId, optionId) => {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [questionId]: optionId,
    }));
  };

  const submitVote = async (event) => {
    event.preventDefault();

    if (isSubmitting || hasSubmittedVote) {
      return;
    }

    setSubmitAttempted(true);

    if (!poll) {
      return;
    }

    if (!poll.canVote || (poll.voteAccess === "anonymous" && anonymousVoteLocked)) {
      showNotification(statusMessage || "Voting is closed for this poll.", "error");
      return;
    }

    if (poll.voteAccess === "authenticated" && !authToken) {
      showNotification("Please log in to vote on this poll.", "error");
      return;
    }

    if (missingRequiredQuestions.length > 0) {
      showNotification("Please answer all required questions.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const answersPayload = (poll.questions || [])
        .filter((question) => answers[question.id || question._id])
        .map((question) => {
          const selectedOption = (question.options || []).find(
            (option) =>
              (option.id || option._id || option.value || option.label || option) ===
              answers[question.id || question._id],
          );

          return {
            questionId: question.id || question._id,
            selectedOption:
              selectedOption?.label ||
              selectedOption?.text ||
              selectedOption ||
              "",
          };
        });

      const requestConfig =
        poll.voteAccess === "anonymous"
          ? {
            headers: {
              [anonymousVoterHeader]: getOrCreateAnonymousVoterToken(),
            },
          }
          : undefined;

      await api.post(
        `/polls/${id}/vote`,
        {
          answers: answersPayload,
        },
        requestConfig,
      );

      if (poll.voteAccess === "anonymous") {
        markAnonymousVoteRecord(id);
        setAnonymousVoteLocked(true);
      }

      setHasSubmittedVote(true);

      if (poll.canViewResults || poll.resultsPublished || poll.isOwner) {
        showNotification("Vote submitted successfully.", "success");
        navigate(`/poll/${id}/results`);
      } else {
        showNotification(
          "Vote submitted. Results will be visible once the creator publishes them.",
          "success",
        );
      }
    } catch (error) {
      if (error.statusCode === 409 && poll.voteAccess === "anonymous") {
        markAnonymousVoteRecord(id);
        setAnonymousVoteLocked(true);
      }

      showNotification(error.message || "Could not submit your vote.", "error");
    } finally {
      setIsSubmitting(false);
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
          { label: "Results", to: `/poll/${id}/results` },
        ]}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {isLoading ? (
          <LoadingSpinner className="py-24" />
        ) : errorMessage ? (
          <EmptyState
            title="Poll not available"
            description={errorMessage}
            actionLabel="Go home"
            actionTo="/"
          />
        ) : !poll ? (
          <EmptyState
            title="Poll not found"
            description="The poll you are looking for does not seem to exist anymore."
            actionLabel="Back to home"
            actionTo="/"
          />
        ) : poll.resultsPublished ? (
          results ? (
            <div className="space-y-6">
              <section className="panel p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{poll.title}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                      {poll.description ||
                        "Results are now public and update live for everyone viewing this poll."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                      <span>
                        {poll.voteAccess === "authenticated"
                          ? "Login required"
                          : "Anonymous voting"}
                      </span>
                      <span>Published results</span>
                      <span>Expires {formatDateTime(poll.expiresAt)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                    <p className="font-medium text-gray-900">{results.totalResponses} total responses</p>
                    <p className="mt-1">Live viewers: {results.viewerCount}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 print-hidden">
                  <Link to={`/poll/${id}/results`} className="btn-secondary">
                    Open dedicated analytics page
                  </Link>
                </div>
              </section>

              <AnalyticsWorkspace
                analytics={results}
                selectedQuestionId={selectedQuestionId}
                onSelectedQuestionIdChange={setSelectedQuestionId}
                onExportCsv={() => exportAnalyticsCsv(results)}
                onPrint={printAnalytics}
              />
            </div>
          ) : (
            <div className="space-y-4 py-6">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={5} />
              <SkeletonCard lines={5} />
            </div>
          )
        ) : (
          <div className="space-y-6">
            <section className="panel p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{poll.title}</h1>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {poll.description || "Choose one option for each question below."}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <p>
                    {poll.voteAccess === "authenticated"
                      ? "Login required"
                      : "Anonymous voting"}
                  </p>
                  <p className="mt-1">Expires {formatDateTime(poll.expiresAt)}</p>
                </div>
              </div>

              {statusMessage ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {statusMessage}
                </div>
              ) : null}

              {poll.voteAccess === "authenticated" && !authToken ? (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  This poll only accepts authenticated votes.{" "}
                  <Link
                    to="/login"
                    state={{ from: `/poll/${id}` }}
                    className="font-semibold underline"
                  >
                    Log in
                  </Link>{" "}
                  before submitting.
                </div>
              ) : null}

              {poll.canViewResults && !poll.resultsPublished ? (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  As the poll creator, you can review the private analytics on the{" "}
                  <Link to={`/poll/${id}/results`} className="font-semibold text-blue-600">
                    results page
                  </Link>
                  .
                </div>
              ) : null}
            </section>

            {hasSubmittedVote && !poll.canViewResults && !poll.resultsPublished ? (
              <EmptyState
                title="Vote received"
                description="Thanks for voting. Results will become visible after the poll creator publishes them."
                actionLabel="Back home"
                actionTo="/"
              />
            ) : (
              <form onSubmit={submitVote} className="space-y-4">
                {(poll.questions || []).map((question, questionIndex) => {
                  const questionId = question.id || question._id;

                  return (
                    <section key={questionId} className="panel p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-gray-900">
                            {questionIndex + 1}. {question.prompt || question.questionText}
                          </h2>
                          <p className="mt-1 text-sm text-gray-500">
                            {question.required ? "Required" : "Optional"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {(question.options || []).map((option, optionIndex) => {
                          const optionId =
                            option.id ||
                            option._id ||
                            option.value ||
                            option.label ||
                            `option-${optionIndex}`;
                          const optionLabel =
                            option.label || option.text || option;

                          return (
                            <label
                              key={optionId}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-all duration-200 ${answers[questionId] === optionId
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                            >
                              <input
                                type="radio"
                                name={questionId}
                                checked={answers[questionId] === optionId}
                                onChange={() => updateAnswer(questionId, optionId)}
                                disabled={
                                  !poll.canVote ||
                                  isSubmitting ||
                                  hasSubmittedVote ||
                                  anonymousVoteLocked
                                }
                                className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-200"
                              />
                              <span className="text-sm text-gray-700">{optionLabel}</span>
                            </label>
                          );
                        })}
                      </div>

                      {submitAttempted && question.required && !answers[questionId] ? (
                        <p className="mt-3 text-sm text-red-600">Please select an option.</p>
                      ) : null}
                    </section>
                  );
                })}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !poll.canVote ||
                      (poll.voteAccess === "authenticated" && !authToken) ||
                      hasSubmittedVote ||
                      anonymousVoteLocked
                    }
                    className="btn-primary"
                  >
                    {isSubmitting ? "Submitting..." : "Submit vote"}
                  </button>
                  <Link to={`/poll/${id}/results`} className="btn-secondary">
                    View results
                  </Link>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}