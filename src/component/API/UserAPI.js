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

  // Student apply a job position (stores JobPositionId/SemesterId on the user).
  // Uses the same update endpoint the app already relies on.
  applyJobPosition: ({ userId, jobPositionId, semesterId }) => {
    const fd = new FormData();
    fd.append("UserId", String(userId ?? ""));
    fd.append("JobPositionId", String(jobPositionId ?? ""));
    if (semesterId != null) fd.append("SemesterId", String(semesterId));
    return httpClient.put("/user/update", fd);
  },

  // Not listed in the provided spec, but kept for compatibility.
  create: (data) => httpClient.post("/user/create", data),

  deleteById: (userId) => httpClient.delete(`/user/delete/${userId}`),
};

export default userApi;