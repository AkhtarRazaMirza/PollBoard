import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import api from "../services/axios";

function validateLogin(values) {
  const errors = {};

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  }

  if (!values.password.trim()) {
    errors.password = "Password is required.";
  }

  return errors;
}

function extractAuthSession(payload, fallbackEmail) {
  const token =
    payload?.token ||
    payload?.accessToken ||
    payload?.jwt ||

    payload?.message?.token ||
    payload?.message?.accessToken ||

    payload?.data?.token ||
    payload?.data?.accessToken;

  const user =
    payload?.user ||
    payload?.message?.user ||
    payload?.data?.user ||
    payload?.account ||
    payload?.data?.account || {
      email: fallbackEmail,
    };

  return { token, user };
}

export default function LoginPage({ showNotification, updateAuthSession }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState("");

  const validationErrors = useMemo(() => validateLogin(formValues), [formValues]);
  const redirectPath = location.state?.from || "/dashboard";

  const updateField = (fieldName, value) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      [fieldName]: value,
    }));
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setServerError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/auth/login", formValues);
      console.log(response.data);
      const { token, user } = extractAuthSession(response.data, formValues.email);

      if (!token) {
        throw new Error("Login worked, but no token came back from the server.");
      }

      updateAuthSession({
        token,
        user,
        message: "Welcome back.",
      });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message = error.message || "Login failed. Please try again.";
      setServerError(message);
      showNotification(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-center justify-center px-4 py-10 md:px-6">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-soft sm:p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Log in</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Use your account to create polls, manage responses, and keep track of
            results.
          </p>

          <form onSubmit={submitLogin} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={formValues.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="field"
                placeholder="you@example.com"
              />
              {submitAttempted && validationErrors.email ? (
                <p className="mt-2 text-sm text-red-600">{validationErrors.email}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={formValues.password}
                onChange={(event) => updateField("password", event.target.value)}
                className="field"
                placeholder="Enter your password"
              />
              {submitAttempted && validationErrors.password ? (
                <p className="mt-2 text-sm text-red-600">
                  {validationErrors.password}
                </p>
              ) : null}
            </div>

            {serverError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" tone="light" />
                  Signing in
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600">
            New here?{" "}
            <Link to="/signup" className="text-link">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}