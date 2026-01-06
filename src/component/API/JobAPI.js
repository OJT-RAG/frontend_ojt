import http from "./httpClient";

const jobApi = {
  getAll: () => http.get("/job-title-overview/getAll"),
  create: (data) => http.post("/job-title-overview/create", data),
  update: (id, data) => http.put(`/job-title-overview/update/${id}`, data),
  delete: (id) => http.delete(`/job-title-overview/delete/${id}`)
};

export default jobApi;
