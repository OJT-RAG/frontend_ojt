import httpClient from "./httpClient";

const companyApi = {
  
  update: (data) =>
    httpClient.post("/Company/update", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  getById: (id) =>
    httpClient.get(`/Company/get/${id}`),

  getAll: () =>
    httpClient.get("/Company/getAll"),
};

export default companyApi;
