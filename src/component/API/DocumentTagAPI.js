import httpClient from "./httpClient";

const documentTagApi = {
  // ✅ Lấy tất cả tag
  getAll: () => httpClient.get("/document-tag/all"),

  // ✅ Gán tag cho document
  // POST /CompanyDocument/tags?id={docId}&tagId={tagId}
  addTag: (documentId, tagId) =>
    httpClient.post("/CompanyDocument/tags", null, {
      params: {
        id: documentId,
        tagId: tagId,
      },
    }),
};

export default documentTagApi;
