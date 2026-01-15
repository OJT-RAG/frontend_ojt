// src/api/httpClient.js
import axios from "axios";

const httpClient = axios.create({
baseURL: "https://localhost:7031/api",

});

httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export default httpClient;
