import { useEffect, useState } from "react";
import AppRoutes from "./routes/AppRoutes";
import api, {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
} from "./services/axios";

const notificationStyles = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

function ToastMessage({ notification }) {
  if (!notification) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-full max-w-sm -translate-x-1/2 px-4">
      <div
        className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-soft ${
          notificationStyles[notification.type] || notificationStyles.info
        }`}
      >
        {notification.message}
      </div>
    </div>
  );
}

export default function App() {
  const [authToken, setAuthToken] = useState(getStoredToken());
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
  };

  const updateAuthSession = ({ token, user, message }) => {
    saveAuthSession(token, user);
    setAuthToken(token);
    setCurrentUser(user);

    if (message) {
      showNotification(message, "success");
    }
  };

  const logout = async ({ silent = false } = {}) => {
    try {
      if (authToken) {
        await api.post("/auth/logout");
      }
    } catch (error) {
      // A missing logout endpoint should not block the user from leaving the session.
    } finally {
      clearAuthSession();
      setAuthToken(null);
      setCurrentUser(null);

      if (!silent) {
        showNotification("You are logged out.", "info");
      }
    }
  };

  useEffect(() => {
    if (!notification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearAuthSession();
      setAuthToken(null);
      setCurrentUser(null);
      showNotification("Your session expired. Please log in again.", "error");
    };

    window.addEventListener("pollboard:auth-expired", handleAuthExpired);

    return () => {
      window.removeEventListener("pollboard:auth-expired", handleAuthExpired);
    };
  }, []);

  return (
    <>
      <ToastMessage notification={notification} />
      <AppRoutes
        authToken={authToken}
        currentUser={currentUser}
        logout={logout}
        showNotification={showNotification}
        updateAuthSession={updateAuthSession}
      />
    </>
  );
}