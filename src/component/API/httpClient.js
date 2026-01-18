import axios from "axios";

const PRODUCTION_URL =
  "https://backend-production-8c235.up.railway.app/api";

const httpClient = axios.create({
  baseURL: PRODUCTION_URL,
});

// Request interceptor: gắn Bearer token
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: chỉ trả response hoặc lỗi
httpClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default httpClient;
