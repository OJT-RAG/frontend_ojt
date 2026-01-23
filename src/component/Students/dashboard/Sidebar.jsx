import React from "react";
import { Settings, FileText } from "lucide-react"; 
import "./Sidebar.css";
import { useAuth } from "../../Hook/useAuth";

const Sidebar = ({ activeModule, setActiveModule }) => {
  const { authUser: user } = useAuth(); // 🔑 FIX Ở ĐÂY

  // 🔒 Nếu đã có company_id thì khóa nút Công việc
  const disableJobs = Boolean(user?.company_id);
console.log("company_id:", user?.company_id);
console.log("disableJobs:", disableJobs);
console.log("FULL USER FROM useAuth:", user);

  return (
    <aside className="sidebar">
      
      <h2 className="sidebar-title">Modules</h2>

      <button
        className={`sidebar-btn ${activeModule === "profile" ? "active" : ""}`}
        onClick={() => setActiveModule("profile")}
      >
        <FileText /> Hồ sơ
      </button>

      <button
        className={`sidebar-btn ${activeModule === "pdf" ? "active" : ""}`}
        onClick={() => setActiveModule("pdf")}
      >
        <FileText /> Quản lý PDF
      </button>

      <button
        className={`sidebar-btn ${activeModule === "finalreport" ? "active" : ""}`}
        onClick={() => setActiveModule("finalreport")}
      >
        <FileText /> Gửi báo cáo cuối kỳ
      </button>

      <button
        className={`sidebar-btn ${activeModule === "updateuser" ? "active" : ""}`}
        onClick={() => setActiveModule("updateuser")}
      >
        <FileText /> Chỉnh sửa thông tin
      </button>

      {/* 🔒 Công việc */}
      <button
        className={`sidebar-btn ${activeModule === "jobs" ? "active" : ""}`}
        disabled={disableJobs}
        title={disableJobs ? "Bạn đã được nhận vào công ty" : ""}
        onClick={() => setActiveModule("jobs")}
      >
        <FileText /> Công việc
      </button>

      <button
        className={`sidebar-btn ${activeModule === "settings" ? "active" : ""}`}
        disabled
      >
        <Settings /> Cài đặt (Sắp ra mắt)
      </button>
    </aside>
  );
};

export default Sidebar;
