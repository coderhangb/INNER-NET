import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? import.meta.env.VITE_API_URL || "http://localhost:3000"
      : "",
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    config.headers["X-CSRF-Protection"] = "1";
  }

  return config;
});