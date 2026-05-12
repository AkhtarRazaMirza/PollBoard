import { Link } from "react-router-dom";

function formatDate(dateValue) {
  if (!dateValue) {
    return "No expiry";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "No expiry";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getQuestionCount(poll) {
  return poll.questions?.length || poll.questionCount || 0;
}

function getResponseCount(poll) {
  return (
    poll.responseCount ||
    poll.responsesCount ||
    poll.totalResponses ||
    poll.totalVotes ||
    poll.voteCount ||
    0
  );
}

function getStatus(poll) {
  if (poll.isClosed || poll.closed) {
    return "Closed";
  }

  const expiryValue = poll.expiresAt || poll.expiryDate;

  if (expiryValue && new Date(expiryValue) < new Date()) {
    return "Expired";
  }

  return "Active";
}

const statusStyles = {
  Active: "bg-green-50 text-green-700",
  Expired: "bg-amber-50 text-amber-700",
  Closed: "bg-gray-100 text-gray-700",
};

export default function PollCard({
  poll,
  showVoteAction = true,
  showResultsAction = true,
}) {
  const pollId = poll._id || poll.id;
  const status = getStatus(poll);
  const responses = getResponseCount(poll);
  const questionCount = getQuestionCount(poll);
  const createdDate = poll.createdAt || poll.createdOn;

  return (
    <article className="panel p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{poll.title}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                statusStyles[status] || statusStyles.Active
              }`}
            >
              {status}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            {poll.description || "A simple poll ready to collect responses."}
          </p>
        </div>

        <div className="text-left text-sm text-gray-500 sm:text-right">
          <p>{responses} responses</p>
          <p className="mt-1">{questionCount} questions</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
        <span>Created {formatDate(createdDate)}</span>
        <span>Expires {formatDate(poll.expiresAt || poll.expiryDate)}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {showVoteAction && pollId ? (
          <Link to={`/poll/${pollId}`} className="btn-primary">
            Open poll
          </Link>
        ) : null}

        {showResultsAction && pollId ? (
          <Link to={`/poll/${pollId}/results`} className="btn-secondary">
            View results
          </Link>
        ) : null}
      </div>
    </article>
  );
}