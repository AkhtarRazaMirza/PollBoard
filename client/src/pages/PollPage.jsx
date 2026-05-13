import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import api from "../services/axios";

function normalizePoll(payload) {
  const source = payload?.data || payload?.poll || payload;
  const expiryValue = source?.expiresAt || null;
  const voteAccess =
    source?.voteAccess ||
    (source?.isAnonymous ? "anonymous" : "authenticated");
  const isExpired =
    source?.isExpired || (expiryValue ? new Date(expiryValue) < new Date() : false);
  const resultsPublished = Boolean(source?.resultsPublished || source?.isPublished);
  const isClosed = Boolean(source?.isClosed || resultsPublished || isExpired);

  return {
    id: source?.id || source?._id,
    title: source?.title || source?.pollTitle || "Untitled poll",
    description: source?.description || source?.pollDescription || "",
    voteAccess,
    isAnonymous: voteAccess === "anonymous",
    expiresAt: expiryValue,
    isExpired,
    isClosed,
    resultsPublished,
    canVote: Boolean(source?.canVote ?? !(isClosed || resultsPublished)),
    canViewResults: Boolean(source?.canViewResults),
    isOwner: Boolean(source?.isOwner),
    questions: (source?.questions || []).map((question, questionIndex) => ({
      id: question._id || question.id,
      prompt:
        question.text ||
        question.prompt ||
        question.question ||
        question.questionText ||
        `Question ${questionIndex + 1}`,
      required: Boolean(question.required ?? question.isRequired ?? true),
      options: (question.options || []).map((option, optionIndex) => {
        const optionLabel =
          typeof option === "string"
            ? option
            : option.text || option.label || option.value || `Option ${optionIndex + 1}`;

        return {
          id:
            (typeof option === "object" && (option.id || option._id || option.value)) ||
            optionLabel ||
            `${question.id || questionIndex}-option-${optionIndex}`,
          label: optionLabel,
        };
      }),
    })),
  };
}

function formatExpiry(dateValue) {
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

export default function PollPage({
  authToken,
  currentUser,
  onLogout,
  showNotification,
}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [hasSubmittedVote, setHasSubmittedVote] = useState(false);

  useEffect(() => {
    const fetchPollDetails = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setHasSubmittedVote(false);

      try {
        const response = await api.get(`/polls/${id}`);
        setPoll(normalizePoll(response.data));
      } catch (error) {
        setErrorMessage(error.message || "Could not load this poll.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPollDetails();
  }, [id]);

  const missingRequiredQuestions = useMemo(() => {
    if (!poll) {
      return [];
    }

    return poll.questions.filter(
      (question) => question.required && !answers[question.id],
    );
  }, [answers, poll]);

  const statusMessage = useMemo(() => {
    if (!poll) {
      return "";
    }

    if (poll.resultsPublished) {
      return "Results have been published and voting is now closed.";
    }

    if (poll.isExpired) {
      return "Poll expired";
    }

    if (poll.isClosed) {
      return "Poll closed";
    }

    return "";
  }, [poll]);

  const updateAnswer = (questionId, optionId) => {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [questionId]: optionId,
    }));
  };

  const submitVote = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!poll) {
      return;
    }

    if (!poll.canVote) {
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
      const answersPayload = poll.questions
        .filter((question) => answers[question.id])
        .map((question) => {
          const selectedOption = question.options.find(
            (option) => option.id === answers[question.id],
          );

          return {
            questionId: question.id,
            selectedOption: selectedOption?.label || "",
          };
        });

      await api.post(`/polls/${id}/vote`, {
        answers: answersPayload,
      });

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

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
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
                  <p className="mt-1">Expires {formatExpiry(poll.expiresAt)}</p>
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
                {poll.questions.map((question, questionIndex) => (
                  <section key={question.id} className="panel p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">
                          {questionIndex + 1}. {question.prompt}
                        </h2>
                        {question.required ? (
                          <p className="mt-1 text-sm text-gray-500">Required</p>
                        ) : (
                          <p className="mt-1 text-sm text-gray-500">Optional</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {question.options.map((option) => (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-all duration-200 ${
                            answers[question.id] === option.id
                              ? "border-blue-300 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            checked={answers[question.id] === option.id}
                            onChange={() => updateAnswer(question.id, option.id)}
                            disabled={!poll.canVote || isSubmitting || hasSubmittedVote}
                            className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-200"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>

                    {submitAttempted && question.required && !answers[question.id] ? (
                      <p className="mt-3 text-sm text-red-600">Please select an option.</p>
                    ) : null}
                  </section>
                ))}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !poll.canVote ||
                      (poll.voteAccess === "authenticated" && !authToken) ||
                      hasSubmittedVote
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