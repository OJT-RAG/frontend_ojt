import httpClient from "./httpClient";

const finalReportApi = {
  create: (data) => httpClient.post("/Finalreport/create", data),
  update: (data) => httpClient.put("/Finalreport/update", data),
  getAll: () => httpClient.get("/Finalreport/getAll"), // thêm GET tất cả report
};

export default finalReportApi;
