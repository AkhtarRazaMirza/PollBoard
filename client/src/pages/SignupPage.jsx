import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import api from "../services/axios";

function validateSignup(values) {
  const errors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Last name is required.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  }

  if (values.password.trim().length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  return errors;
}

export default function SignupPage({ showNotification }) {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState("");

  const validationErrors = useMemo(() => validateSignup(formValues), [formValues]);

  const updateField = (fieldName, value) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      [fieldName]: value,
    }));
  };

  const submitSignup = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setServerError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim(),
        email: formValues.email.trim(),
        password: formValues.password,
      };

      await api.post("/auth/signup", payload);
      showNotification("Account created successfully. Please log in.", "success");
      navigate("/login", { replace: true });
    } catch (error) {
      const message = error.message || "Signup failed. Please try again.";
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
          <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Start building polls, collecting responses, and keeping everything in
            one place.
          </p>

          <form onSubmit={submitSignup} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                First name
              </label>
              <input
                type="text"
                value={formValues.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                className="field"
                placeholder="First name"
              />
              {submitAttempted && validationErrors.firstName ? (
                <p className="mt-2 text-sm text-red-600">{validationErrors.firstName}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Last name
              </label>
              <input
                type="text"
                value={formValues.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                className="field"
                placeholder="Last name"
              />
              {submitAttempted && validationErrors.lastName ? (
                <p className="mt-2 text-sm text-red-600">{validationErrors.lastName}</p>
              ) : null}
            </div>

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
                placeholder="At least 8 characters"
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
                  Creating account
                </span>
              ) : (
                "Sign up"
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-link">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}