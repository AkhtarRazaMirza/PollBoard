import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function NotFoundPage({ authToken, currentUser, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        isAuthenticated={Boolean(authToken)}
        currentUser={currentUser}
        onLogout={onLogout}
        links={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
        ]}
      />

      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-center justify-center px-4 py-10 md:px-6">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-soft">
          <p className="text-sm font-medium text-blue-600">404</p>
          <h1 className="mt-3 text-3xl font-semibold text-gray-900">Page not found</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            The page you opened does not seem to be here anymore. You can head back
            home or jump into the dashboard.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">
              Go home
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              Open dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}