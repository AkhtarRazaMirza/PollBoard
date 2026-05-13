import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";
import api, {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
} from "./services/axios";

const toasterOptions = {
  duration: 3200,
  style: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "14px 16px",
    color: "#111827",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.10)",
  },
  success: {
    iconTheme: {
      primary: "#166534",
      secondary: "#ecfdf5",
    },
  },
  error: {
    iconTheme: {
      primary: "#b91c1c",
      secondary: "#fef2f2",
    },
  },
};

export default function App() {
  const [authToken, setAuthToken] = useState(getStoredToken());
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  const showNotification = (message, type = "info") => {
    const resolvedMessage = Array.isArray(message)
      ? message[0]
      : message;

    if (!resolvedMessage) {
      return;
    }

    if (type === "success") {
      toast.success(resolvedMessage);
      return;
    }

    if (type === "error") {
      toast.error(resolvedMessage);
      return;
    }

    toast(resolvedMessage);
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
    } catch {
      // Keep logout resilient even if the request fails.
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
      <Toaster position="top-center" toastOptions={toasterOptions} />
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