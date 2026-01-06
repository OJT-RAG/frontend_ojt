import httpClient from "./httpClient";

const userApi = {
  login: (data) => httpClient.post("/user/login", data),

  // Swagger: POST /api/auth/google-login
  googleLogin: (data) => httpClient.post("/auth/google-login", data),

  getAll: () => httpClient.get("/user/getAll"),

  // Backend spec: GET /api/user/get/{id}
  getById: (userId) => httpClient.get(`/user/get/${userId}`),

  // Not listed in the provided spec, but used by existing UI.
  update: (data) => httpClient.put("/user/update", data),

  // Not listed in the provided spec, but kept for compatibility.
  create: (data) => httpClient.post("/user/create", data),

  deleteById: (userId) => httpClient.delete(`/user/delete/${userId}`),
};

export default userApi;