import httpClient from "./httpClient";

const jobBookmarkApi = {
  getAll: () => httpClient.get("/JobBookmark/getAll"),

  getById: (id) => httpClient.get(`/JobBookmark/get/${id}`),

  getByUserId: (userId) => httpClient.get(`/JobBookmark/user/${userId}`),

  create: ({ userId, jobPositionId }) =>
    httpClient.post("/JobBookmark/create", {
      userId,
      jobPositionId,
    }),

  update: ({ jobBookmarkId, userId, jobPositionId }) =>
    httpClient.put("/JobBookmark/update", {
      jobBookmarkId,
      userId,
      jobPositionId,
    }),

  deleteById: (id) => httpClient.delete(`/JobBookmark/delete/${id}`),
};

export default jobBookmarkApi;
