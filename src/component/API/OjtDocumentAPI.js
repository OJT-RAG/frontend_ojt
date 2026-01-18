import httpClient from "./httpClient";

const ojtDocumentApi = {
  getAll: () => httpClient.get("/OjtDocument/getAll"),
  getById: (id) => httpClient.get(`/OjtDocument/get/${id}`),

  // Expect multipart/form-data
  create: (formData) => httpClient.post("/OjtDocument/create", formData),
  update: (formData) => httpClient.put("/OjtDocument/update", formData),

  delete: (id) => httpClient.delete(`/OjtDocument/delete/${id}`),

  // Optional: some backends return the file as a blob
  download: (id) => httpClient.get(`/OjtDocument/download/${id}`, { responseType: "blob" }),
};

export default ojtDocumentApi;
