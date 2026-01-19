import httpClient from "./httpClient";

const companyApi = {
  getAll: () => httpClient.get("/Company/getAll"),

  getById: (id) => httpClient.get(`/Company/get/${id}`),

  create: (data) => httpClient.post("/Company/create", data),

  // Swagger: PUT /api/Company/update (application/json)
  update: (data) => httpClient.put("/Company/update", data),

  deleteById: (id) => httpClient.delete(`/Company/delete/${id}`),
};

export default companyApi;
