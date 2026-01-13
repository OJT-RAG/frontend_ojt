import http from "./httpClient";

const jobDescriptionApi = {
  getAll: () => http.get("/JobDescription/getAll"),
  get: (id) => http.get(`/JobDescription/get/${id}`),
  create: (data) => http.post("/JobDescription/create", data),
  update: (data) => http.put("/JobDescription/update", data),
  delete: (id) => http.delete(`/JobDescription/delete/${id}`),
};

export default jobDescriptionApi;
