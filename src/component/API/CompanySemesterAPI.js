import httpClient from "./httpClient";

const companySemesterApi = {
  // ✅ Register company vào semester
  create: (data) =>
    httpClient.post("/semester-company/create", data),

  // ✅ Lấy tất cả company – semester
  getAll: () =>
    httpClient.get("/semester-company/all"),
};

export default companySemesterApi;