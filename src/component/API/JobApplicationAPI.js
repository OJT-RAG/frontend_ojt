import httpClient from "./httpClient";

const jobApplicationApi = {
  // Lấy tất cả đơn ứng tuyển
  getAll: () => httpClient.get("/JobApplication/getAll"),

  // Tạo đơn ứng tuyển
  create: (data) =>
    httpClient.post("/JobApplication/create", {
      userId: data.userId,
      jobPositionId: data.jobPositionId,
    }),

  // Cập nhật trạng thái (accepted / pending / rejected)
  updateStatus: (data) =>
    httpClient.put("/JobApplication/update-status", {
      jobApplicationId: data.jobApplicationId,
      status: data.status,
      rejectedReason: data.rejectedReason || "",
    }),
};

export default jobApplicationApi;
