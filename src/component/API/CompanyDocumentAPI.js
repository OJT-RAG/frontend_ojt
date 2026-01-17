import httpClient from "./httpClient";

const companyDocumentApi = {
  getAll: () => httpClient.get("/CompanyDocument/getAll"),

  create: (formData) =>
    httpClient.post("/CompanyDocument/create", formData),

  update: (formData) =>
    httpClient.put("/CompanyDocument/update", formData),
};

export default companyDocumentApi;