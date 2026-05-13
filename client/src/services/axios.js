import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api";

export const storageKeys = {
  token: "pollboard_token",
  user: "pollboard_user",
};

export const socketBaseURL =
  import.meta.env.VITE_SOCKET_URL ||
  apiBaseUrl.replace(/\/api\/?$/, "");

export const getStoredToken = () => localStorage.getItem(storageKeys.token);

export const getStoredUser = () => {
  const storedUser = localStorage.getItem(storageKeys.user);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(storageKeys.user);
    return null;
  }
};

export const saveAuthSession = (token, user) => {
  if (token) {
    localStorage.setItem(storageKeys.token, token);
  }

  if (user) {
    localStorage.setItem(storageKeys.user, JSON.stringify(user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(storageKeys.token);
  localStorage.removeItem(storageKeys.user);
};

export const getApiErrorMessage = (error) => {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  const responseData = error.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.error ||
    responseData?.details ||
    error.message ||
    "Something went wrong. Please try again."
  );
};

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new CustomEvent("pollboard:auth-expired"));
    }

    return Promise.reject(new Error(getApiErrorMessage(error)));
  },
);

export const requestFirstSuccessful = async (requestCallbacks) => {
  let lastError = null;

  for (const requestCallback of requestCallbacks) {
    try {
      return await requestCallback();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Request failed.");
};

export default api;