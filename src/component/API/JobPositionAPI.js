import http from "./httpClient";

const jobPositionApi = {
  // Lấy tất cả vị trí công việc
  getAll: () => http.get("/job-position/getAll"),

  // Tạo mới vị trí công việc
  create: (data) => http.post("/job-position/create", data),

  // Cập nhật vị trí công việc
  update: (dataOrId, maybeData) => {
    // Swagger: PUT /api/job-position/update (no {id} in route)
    // Back-compat: if called as update(id, data) we'll merge id into payload.
    if (typeof dataOrId === "number") {
      return http.put("/job-position/update", {
        ...(maybeData || {}),
        jobPositionId: dataOrId,
      });
    }
    return http.put("/job-position/update", dataOrId);
  },

  // Xóa vị trí công việc
  delete: (id) =>
    http.delete(`/job-position/delete/${id}`),
};

export default jobPositionApi;
