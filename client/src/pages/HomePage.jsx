import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import PollCard from "../components/PollCard";
import api, { requestFirstSuccessful } from "../services/axios";
import { normalizePolls } from "../utils/polls";

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
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel overflow-hidden p-6 sm:p-8"
          >
            <div className="pointer-events-none absolute" />
            <p className="text-sm font-medium text-blue-600">Simple online polling</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              PollBoard helps you run clean, shareable polls with live analytics and
              a calmer voting experience.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
              Build a poll, share the link, and keep the results readable on any
              screen. It is shaped for student teams, hackathons, demos, and small
              communities that want something polished without getting complicated.
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
          </motion.div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="panel p-5"
            >
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Why people use it
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-6 text-gray-600">
                <div>
                  <p className="font-semibold text-gray-900">Fast to set up</p>
                  <p className="mt-1">Create a poll in a minute and share it right away.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Realtime analytics</p>
                  <p className="mt-1">Watch responses land without refreshing the page.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Flexible voting</p>
                  <p className="mt-1">Choose anonymous or authenticated voting per poll.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="panel p-5"
            >
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
            </motion.div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Create polls",
              text: "Add as many questions as you need and keep the flow structured.",
            },
            {
              label: "Collect votes",
              text: "Share a single link so people can respond from any device.",
            },
            {
              label: "Review results",
              text: "Track trends, turnout, and the strongest options in one place.",
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.04 }}
              className="panel p-5"
            >
              <h2 className="text-base font-semibold text-gray-900">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.text}</p>
            </motion.div>
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
            <EmptyState title="Could not load recent polls" description={errorMessage} />
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
                <PollCard key={poll.id} poll={poll} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}