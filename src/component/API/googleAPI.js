import httpClient from "./httpClient";

const googleAPI = {
  // Cập nhật user
  glogin: (data) => httpClient.get("/user/update", data),

};

export default googleAPI;