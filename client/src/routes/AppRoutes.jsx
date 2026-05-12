import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import CreatePollPage from "../pages/CreatePollPage";
import DashboardPage from "../pages/DashboardPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";
import PollPage from "../pages/PollPage";
import ResultsPage from "../pages/ResultsPage";
import SignupPage from "../pages/SignupPage";

function ProtectedRoute({ authToken }) {
  const location = useLocation();

  if (!authToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function PublicOnlyRoute({ authToken, children }) {
  if (authToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function AppRoutes({
  authToken,
  currentUser,
  logout,
  showNotification,
  updateAuthSession,
}) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            authToken={authToken}
            currentUser={currentUser}
            onLogout={logout}
          />
        }
      />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute authToken={authToken}>
            <LoginPage
              showNotification={showNotification}
              updateAuthSession={updateAuthSession}
            />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/signup"
        element={
          <PublicOnlyRoute authToken={authToken}>
            <SignupPage
              showNotification={showNotification}
              updateAuthSession={updateAuthSession}
            />
          </PublicOnlyRoute>
        }
      />

      <Route element={<ProtectedRoute authToken={authToken} />}>
        <Route
          element={<DashboardLayout currentUser={currentUser} onLogout={logout} />}
        >
          <Route
            path="/dashboard"
            element={<DashboardPage showNotification={showNotification} />}
          />
          <Route
            path="/create-poll"
            element={<CreatePollPage showNotification={showNotification} />}
          />
        </Route>
      </Route>

      <Route
        path="/poll/:id"
        element={
          <PollPage
            authToken={authToken}
            currentUser={currentUser}
            onLogout={logout}
            showNotification={showNotification}
          />
        }
      />
      <Route
        path="/poll/:id/results"
        element={
          <ResultsPage
            authToken={authToken}
            currentUser={currentUser}
            onLogout={logout}
          />
        }
      />

      <Route
        path="*"
        element={
          <NotFoundPage
            authToken={authToken}
            currentUser={currentUser}
            onLogout={logout}
          />
        }
      />
    </Routes>
  );
}