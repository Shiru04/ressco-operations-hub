import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    // Normalize backend error shape
    const payload = error?.response?.data;
    const normalized = {
      status: error?.response?.status,
      code: payload?.error?.code || "REQUEST_FAILED",
      message: payload?.error?.message || error.message || "Request failed",
      details: payload?.error?.details || null,
    };
    return Promise.reject(normalized);
  }
);
