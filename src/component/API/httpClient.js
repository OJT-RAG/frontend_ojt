import axios from "axios";

// 1. Danh sách các URL tiềm năng
const LOCAL_URL = "https://localhost:7031/api";
const PRODUCTION_URL = "https://backend-production-8c235.up.railway.app/api";

const httpClient = axios.create({
  baseURL: PRODUCTION_URL, // Mặc định thử localhost trước
});

// Interceptor cho Request: Thêm Token như cũ
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Interceptor cho Response: Bắt lỗi kết nối để đổi URL
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi kết nối (Network Error) và chưa từng thử đổi URL
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Đổi baseURL sang link Production
      originalRequest.baseURL = PRODUCTION_URL;
      
      console.warn("Localhost không phản hồi, đang thử kết nối tới Production...");
      
      // Thực hiện lại chính request đó với URL mới
      return httpClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default httpClient;