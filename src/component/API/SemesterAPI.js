import httpClient from "./httpClient";

const semesterApi = {
  getAll: () => httpClient.get("/Semester/getAll"),
  getById: (id) => httpClient.get(`/Semester/get/${id}`),
  create: (data) => httpClient.post("/Semester/create", data),
  update: (id, data) => httpClient.put(`/Semester/update/${id}`, data),
  delete: (id) => httpClient.delete(`/Semester/delete/${id}`),
};

export default semesterApi;