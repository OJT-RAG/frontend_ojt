import httpClient from "./httpClient";

const chatRoomApi = {
  getAll: () => httpClient.get("/ChatRoom/getAll"),
  getById: (id) => httpClient.get(`/ChatRoom/get/${id}`),
  getByUser: (userId) => httpClient.get(`/ChatRoom/user/${userId}`),

  create: (data) => httpClient.post("/ChatRoom/create", data),

  update: (data) => httpClient.put("/ChatRoom/update", data),

  delete: (id) => httpClient.delete(`/ChatRoom/delete/${id}`)
};

export default chatRoomApi;
