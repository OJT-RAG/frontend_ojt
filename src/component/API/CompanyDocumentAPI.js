import httpClient from "./httpClient";

const companyDocumentApi = {
  getAll: () => httpClient.get("/CompanyDocument/getAll"),

  create: (formData) =>
    httpClient.post("/CompanyDocument/create", formData),

  update: (formData) =>
    httpClient.put("/CompanyDocument/update", formData),

  delete: (id) =>
    httpClient.delete(`/CompanyDocument/delete/${id}`),

  getTags: (id) =>
    httpClient.get(`/CompanyDocument/${id}/tags`),

  // ✅ ADD TAG
  updateTag: (documentId, tagId) =>
    httpClient.post("/CompanyDocument/tags", null, {
      params: {
        id: documentId,
        tagId: tagId,
      },
    }),

  // 🆕 DELETE TAG
  deleteTag: (documentId, tagId) =>
    httpClient.delete(
      `/CompanyDocument/${documentId}/tags/${tagId}`
    ),
};

export default companyDocumentApi;
