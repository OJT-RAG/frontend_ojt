import httpClient from "./httpClient";

const isDebugEnabled = () => {
  try {
    return (
      process.env.NODE_ENV !== "production" ||
      localStorage.getItem("debug_semester_company") === "1"
    );
  } catch (_) {
    return process.env.NODE_ENV !== "production";
  }
};

const debugLog = (...args) => {
  if (!isDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log("[semester-company api]", ...args);
};

const companySemesterApi = {
  // ✅ Register company vào semester
  create: async (data) => {
    debugLog("POST /semester-company/create payload:", data);
    const res = await httpClient.post("/semester-company/create", data);
    debugLog("POST /semester-company/create response:", res?.data);
    return res;
  },

  // ✅ Lấy tất cả company – semester
  getAll: async () => {
    debugLog("GET /semester-company/all");
    const res = await httpClient.get("/semester-company/all");
    debugLog("GET /semester-company/all response:", res?.data);
    return res;
  },

  // ✅ Lấy 1 company – semester theo id
  getById: async (id) => {
    debugLog(`GET /semester-company/${id}`);
    const res = await httpClient.get(`/semester-company/${id}`);
    debugLog(`GET /semester-company/${id} response:`, res?.data);
    return res;
  },
  // ✅ Lấy theo semester
  getBySemester: async (semesterId) => {
    debugLog(`GET /semester-company/semester/${semesterId}`);
    const res = await httpClient.get(`/semester-company/semester/${semesterId}`);
    debugLog(`GET /semester-company/semester/${semesterId} response:`, res?.data);
    return res;
  },

  // ✅ Lấy theo company
  getByCompany: async (companyId) => {
    debugLog(`GET /semester-company/company/${companyId}`);
    const res = await httpClient.get(`/semester-company/company/${companyId}`);
    debugLog(`GET /semester-company/company/${companyId} response:`, res?.data);
    return res;
  },

  // ✅ Update/approve
  update: async (data) => {
    debugLog("PUT /semester-company/update payload:", data);
    const res = await httpClient.put("/semester-company/update", data);
    debugLog("PUT /semester-company/update response:", res?.data);
    return res;
  },

  // Backwards-compatible alias
  approve: async (data) => {
    debugLog("PUT /semester-company/update (approve alias) payload:", data);
    const res = await httpClient.put("/semester-company/update", data);
    debugLog("PUT /semester-company/update (approve alias) response:", res?.data);
    return res;
  },

  // ✅ Delete company khỏi semester
  delete: async (id) => {
    debugLog(`DELETE /semester-company/delete/${id}`);
    const res = await httpClient.delete(`/semester-company/delete/${id}`);
    debugLog(`DELETE /semester-company/delete/${id} response:`, res?.data);
    return res;
  },
};

export default companySemesterApi;