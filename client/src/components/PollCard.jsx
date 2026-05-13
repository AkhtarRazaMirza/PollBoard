import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  formatShortDate,
  getPollStatus,
  getQuestionCount,
  getResponseCount,
  getVoteAccessLabel,
  normalizePoll,
} from "../utils/polls";

const statusStyles = {
  active: "bg-green-50 text-green-700",
  expired: "bg-amber-50 text-amber-700",
  closed: "bg-gray-100 text-gray-700",
  published: "bg-blue-50 text-blue-700",
};

const statusLabels = {
  active: "Active",
  expired: "Expired",
  closed: "Closed",
  published: "Published",
};

export default function PollCard({
  poll,
  showVoteAction = true,
  showResultsAction = true,
}) {
  const normalizedPoll = normalizePoll(poll);
  const pollId = normalizedPoll.id;
  const status = getPollStatus(normalizedPoll);
  const responses = getResponseCount(normalizedPoll);
  const questionCount = getQuestionCount(normalizedPoll);
  const resultsVisibility = normalizedPoll.resultsPublished
    ? "Public results"
    : "Private results";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="panel p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {normalizedPoll.title}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                statusStyles[status] || statusStyles.active
              }`}
            >
              {statusLabels[status] || "Active"}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            {normalizedPoll.description || "A simple poll ready to collect responses."}
          </p>
        </div>

        <div className="text-left text-sm text-gray-500 sm:text-right">
          <p>{responses} responses</p>
          <p className="mt-1">{questionCount} questions</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
        <span>Created {formatShortDate(normalizedPoll.createdAt)}</span>
        <span>Expires {formatShortDate(normalizedPoll.expiresAt)}</span>
        <span>{getVoteAccessLabel(normalizedPoll)}</span>
        <span>{resultsVisibility}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {showVoteAction && pollId ? (
          <Link to={`/poll/${pollId}`} className="btn-primary">
            {normalizedPoll.resultsPublished ? "View live results" : "Open poll"}
          </Link>
        ) : null}

        {showResultsAction && pollId ? (
          <Link to={`/poll/${pollId}/results`} className="btn-secondary">
            View results
          </Link>
        ) : null}
      </div>
    </motion.article>
  );
}