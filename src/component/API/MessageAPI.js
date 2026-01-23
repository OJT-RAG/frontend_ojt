import httpClient from "./httpClient";

const messageApi = {
  getAll: () => httpClient.get("/Message/getAll"),
  getById: (id) => httpClient.get(`/Message/get/${id}`),
  getByChatRoomId: (chatRoomId) =>
    httpClient.get(`/Message/chat-room/${chatRoomId}`),

  create: (data) => httpClient.post("/Message/create", data),
  update: (data) => httpClient.put("/Message/update", data),
  deleteById: (id) => httpClient.delete(`/Message/delete/${id}`),
};

export default messageApi;
