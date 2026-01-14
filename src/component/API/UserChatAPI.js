import httpClient from "./httpClient";

const userChatApi = {
  getConversation: (user1, user2) =>
    httpClient.get(
      `/user-chat/conversation?user1=${user1}&user2=${user2}`
    ),

  sendMessage: ({ senderId, receiverId, content }) =>
    httpClient.post("/user-chat/send", {
      senderId,
      receiverId,
      content,
    }),
};

export default userChatApi;
