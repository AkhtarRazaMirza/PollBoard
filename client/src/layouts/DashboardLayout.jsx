import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const pageDetails = {
  "/dashboard": {
    eyebrow: "Overview",
    title: "Your polls",
    description:
      "See what is active, what has expired, and where you might want to follow up.",
  },
  "/create-poll": {
    eyebrow: "Builder",
    title: "Create a new poll",
    description:
      "Set the basics first, then keep each question clear and easy to answer.",
  },
};

export default function DashboardLayout({ currentUser, onLogout }) {
  const location = useLocation();
  const details =
    pageDetails[location.pathname] || pageDetails["/dashboard"];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        isAuthenticated
        currentUser={currentUser}
        onLogout={onLogout}
        links={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Create poll", to: "/create-poll" },
        ]}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-6">
          <section className="panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              {details.eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              {details.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {details.description}
            </p>
          </section>

          <Outlet />
        </main>
      </div>
    </div>
  );
}