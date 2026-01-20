import httpClient from "./httpClient";

const ojtDocumentApi = {
  getAll: () => httpClient.get("/OjtDocument/getAll"),
  getById: (id) => httpClient.get(`/OjtDocument/get/${id}`),

  // Expect multipart/form-data
  create: (formData) => httpClient.post("/OjtDocument/create", formData),
  update: (formData) => httpClient.put("/OjtDocument/update", formData),

  delete: (id) => httpClient.delete(`/OjtDocument/delete/${id}`),

  // Tags
  getTags: (id) => httpClient.get(`/OjtDocument/${id}/tags`),
  // Backend expects a JSON number in the request body (e.g. 5) with Content-Type: application/json
  addTag: (id, tagId) =>
    httpClient.post(`/OjtDocument/${id}/tags`, JSON.stringify(tagId), {
      headers: { "Content-Type": "application/json" },
    }),
  removeTag: (id, tagId) => httpClient.delete(`/OjtDocument/${id}/tags/${tagId}`),

  // Optional: some backends return the file as a blob
  download: (id) => httpClient.get(`/OjtDocument/download/${id}`, { responseType: "blob" }),
};

export default ojtDocumentApi;
