import http from "./httpClient";

const jobPositionApi = {
  // Lấy tất cả vị trí công việc
  getAll: () => http.get("/job-position/getAll"),

  // Tạo mới vị trí công việc
  create: (data) => http.post("/job-position/create", data),

  // Cập nhật vị trí công việc
  update: (id, data) =>
    http.put(`/job-position/update/${id}`, data),

  // Xóa vị trí công việc
  delete: (id) =>
    http.delete(`/job-position/delete/${id}`),
};

export default jobPositionApi;
