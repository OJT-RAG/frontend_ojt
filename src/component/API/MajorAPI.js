import httpClient from "./httpClient";

const majorApi = {
  getAll: () => httpClient.get("/Major/getAll"),

  getById: (id) => httpClient.get(`/Major/get/${id}`),

  create: (data) => httpClient.post("/Major/create", data),

  update: (data) => httpClient.put("/Major/update", data),
};

export default majorApi;
