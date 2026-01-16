import httpClient from "./httpClient";

const companyApi = {
  getAll: () => httpClient.get("/Company/getAll"),

  getById: (id) => httpClient.get(`/Company/get/${id}`),

  create: (data) => httpClient.post("/Company/create", data),

  update: (data) => {
    // Admin spec uses JSON with PUT. Some existing UI sends FormData, so support both.
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    return httpClient.put("/Company/update", data, isFormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined);
  },

  deleteById: (id) => httpClient.delete(`/Company/delete/${id}`),
};

export default companyApi;
