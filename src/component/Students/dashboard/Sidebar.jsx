import React from "react";
import { Settings, FileText } from "lucide-react"; 
import "./Sidebar.css";

const Sidebar = ({ activeModule, setActiveModule }) => {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Modules</h2>

      {/* Nút Quản lý PDF */}
      <button
        className={`sidebar-btn ${activeModule === "pdf" ? "active" : ""}`}
        onClick={() => setActiveModule("pdf")}
      >
        <FileText /> Quản lý PDF
      </button>

      {/* Nút Gửi báo cáo cuối kỳ */}
      <button
        className={`sidebar-btn ${activeModule === "finalreport" ? "active" : ""}`}
        onClick={() => setActiveModule("finalreport")}
      >
        <FileText /> Gửi báo cáo cuối kỳ
      </button>

      {/* Nút Chỉnh sửa thông tin */}
      <button
        className={`sidebar-btn ${activeModule === "updateuser" ? "active" : ""}`}
        onClick={() => setActiveModule("updateuser")}
      >
        <FileText /> Chỉnh sửa thông tin
      </button>

      <button
        className={`sidebar-btn ${activeModule === "jobs" ? "active" : ""}`}
        onClick={() => setActiveModule("jobs")}
      >
        <FileText /> Công việc
      </button>

      {/* Nút Cài đặt */}
      <button
        className={`sidebar-btn ${activeModule === "settings" ? "active" : ""}`}
        onClick={() => setActiveModule("settings")}
        disabled
      >
        <Settings /> Cài đặt (Sắp ra mắt)
      </button>
    </aside>
  );
};

export default Sidebar;
