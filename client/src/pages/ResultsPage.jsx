import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import api, { requestFirstSuccessful } from "../services/axios";

function normalizeResults(payload) {

  const source = payload?.data || payload;

  const title =
    source?.pollTitle ||
    "Poll results";

  const description =
    source?.description || "";

  const totalVotes = Number(
    source?.totalVotes || 0
  );

  const questionSource =
    source?.results || [];

  const questions = questionSource.map(
    (question, questionIndex) => {

      const options = Object.entries(
        question.results || {}
      ).map(
        ([label, votes], optionIndex) => ({
          id: `option-${questionIndex}-${optionIndex}`,
          label,
          votes: Number(votes),
        })
      );

      const questionVotes = options.reduce(
        (sum, option) => sum + option.votes,
        0
      );

      return {
        id:
          question.questionId ||
          `question-${questionIndex}`,

        prompt:
          question.question ||
          `Question ${questionIndex + 1}`,

        options: options.map((option) => ({
          ...option,
          percentage:
            questionVotes > 0
              ? Math.round(
                  (option.votes / questionVotes) * 100
                )
              : 0,
        })),

        totalVotes: questionVotes,
      };
    }
  );

  return {
    title,
    description,
    totalVotes,
    questions,
  };
}

export default function ResultsPage({ authToken, currentUser, onLogout }) {
  const { id } = useParams();
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await requestFirstSuccessful([
          () => api.get(`/polls/${id}/results`),
          () => api.get(`/results/${id}`),
        ]);
        console.log(response.data);


        setResults(normalizeResults(response.data));
      } catch (error) {
        setErrorMessage(error.message || "Could not load poll results.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [id]);

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
          <LoadingSpinner className="py-24" />
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
                </div>

                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{results.totalVotes} total votes</p>
                  <p className="mt-1">Updated from the latest responses.</p>
                </div>
              </div>
            </section>

            {results.questions.map((question, questionIndex) => (
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}