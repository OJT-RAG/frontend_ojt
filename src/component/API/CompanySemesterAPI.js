import httpClient from "./httpClient";

const companySemesterApi = {
  // ✅ Register company vào semester
  create: (data) =>
    httpClient.post("/semester-company/create", data),

  // ✅ Lấy tất cả company – semester
  getAll: () =>
    httpClient.get("/semester-company/all"),

  // ✅ Lấy 1 company – semester theo id
  getById: (id) =>
    httpClient.get(`/semester-company/${id}`),
};

export default companySemesterApi;