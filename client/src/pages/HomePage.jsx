import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
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

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

function normalizePolls(payload) {
  return extractPollList(payload).map((poll, index) => ({
    ...poll,
    id: poll.id || poll._id || `poll-${index}`,
    title: poll.title || "Untitled poll",
    description: poll.description || "",
  }));
}

export default function HomePage({ authToken, currentUser, onLogout }) {
  const [recentPolls, setRecentPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchRecentPolls = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await requestFirstSuccessful([
          () => api.get("/polls/recent"),
          () => api.get("/polls"),
        ]);

        setRecentPolls(normalizePolls(response.data).slice(0, 4));
      } catch (error) {
        setErrorMessage(error.message || "Could not load recent polls right now.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentPolls();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        isAuthenticated={Boolean(authToken)}
        currentUser={currentUser}
        onLogout={onLogout}
        links={
          authToken
            ? [
              { label: "Recent polls", href: "#recent-polls" },
              { label: "Dashboard", to: "/dashboard" },
              { label: "Create poll", to: "/create-poll" },
            ]
            : [{ label: "Recent polls", href: "#recent-polls" }]
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="panel p-6 sm:p-8">
            <p className="text-sm font-medium text-blue-600">Simple online polling</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              PollBoard helps you put together clear polls without a lot of setup.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
              Build a poll, share the link, and keep results easy to read. It is made
              for classes, student teams, project demos, and small communities that
              just need something practical.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={authToken ? "/create-poll" : "/signup"}
                className="btn-primary"
              >
                {authToken ? "Create a poll" : "Get started"}
              </Link>

              {authToken ? (
                <Link to="/dashboard" className="btn-secondary">
                  Open dashboard
                </Link>
              ) : (
                <a href="#recent-polls" className="btn-secondary">
                  Browse recent polls
                </a>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="panel p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Why people use it
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-6 text-gray-600">
                <div>
                  <p className="font-semibold text-gray-900">Fast to set up</p>
                  <p className="mt-1">Create a poll in a minute and share it right away.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Clear results</p>
                  <p className="mt-1">See which options are leading without digging around.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Flexible voting</p>
                  <p className="mt-1">Use anonymous mode when you want more honest answers.</p>
                </div>
              </div>
            </div>

            <div className="panel p-5">
              <p className="text-sm text-gray-500">Typical uses</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Class feedback", "Club decisions", "Sprint check-ins", "Demo day votes"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Create polls",
              text: "Add as many questions as you need and keep the form structured.",
            },
            {
              label: "Collect votes",
              text: "Share a single link so people can answer on any device.",
            },
            {
              label: "Review results",
              text: "See totals and percentages in a layout that stays easy to scan.",
            },
          ].map((item) => (
            <div key={item.label} className="panel p-5">
              <h2 className="text-base font-semibold text-gray-900">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.text}</p>
            </div>
          ))}
        </section>

        <section id="recent-polls" className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Recent polls</h2>
              <p className="mt-1 text-sm text-gray-600">
                A quick look at what is active right now.
              </p>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner className="py-16" />
          ) : errorMessage ? (
            <EmptyState
              title="Could not load recent polls"
              description={errorMessage}
            />
          ) : recentPolls.length === 0 ? (
            <EmptyState
              title="No polls yet"
              description="Once polls are created, they will show up here so people can jump in quickly."
              actionLabel={authToken ? "Create the first poll" : "Sign up to create a poll"}
              actionTo={authToken ? "/create-poll" : "/signup"}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {recentPolls.map((poll) => (
                <PollCard key={poll.id || poll._id} poll={poll} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}