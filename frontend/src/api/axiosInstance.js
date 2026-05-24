import axios from "axios";
import { getToken, removeToken } from "../utils/token";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach JWT ──
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ──
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalidated — clear local session and redirect to login.
      // Skip redirect if we're already on an auth page to avoid redirect loops.
      removeToken();
      const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
      const isAuthPage = authPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isAuthPage) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
