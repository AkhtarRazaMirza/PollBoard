import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import PollCard from "../components/PollCard";
import api, { requestFirstSuccessful } from "../services/axios";

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

    id:
      poll.id ||
      poll._id ||
      `poll-${index}`,

    title:
      poll.title ||
      poll.pollTitle ||
      "Untitled poll",

    description:
      poll.description ||
      poll.pollDescription ||
      "",
  }));
}

function getStatus(poll) {
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

export default function DashboardPage() {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchDashboardPolls = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await requestFirstSuccessful([
        () => api.get("/polls/my-polls"),
        () => api.get("/polls/created"),
        () => api.get("/polls/me"),
      ]);
      console.log(response.data);

      setPolls(normalizePolls(response.data));
    } catch (error) {
      setErrorMessage(error.message || "Could not load your polls.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardPolls();
  }, []);

  const stats = useMemo(() => {
    const totalPolls = polls.length;
    const activePolls = polls.filter((poll) => getStatus(poll) === "Active").length;
    const totalResponses = polls.reduce(
      (sum, poll) => sum + Number(getResponses(poll)),
      0,
    );

    return [
      { label: "Total polls", value: totalPolls },
      { label: "Active polls", value: activePolls },
      { label: "Responses", value: totalResponses },
    ];
  }, [polls]);

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
      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="panel p-5">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="panel p-5">
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
      </section>
    </div>
  );
}