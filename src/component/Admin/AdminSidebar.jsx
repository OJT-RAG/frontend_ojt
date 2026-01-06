import React from "react";
import { useI18n } from "../..//i18n/i18n.jsx";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Building2, 
  Briefcase, 
  FileText, 
  BarChart2 
} from "lucide-react";
import "./AdminSidebar.scss";

const AdminSidebar = ({ activeModule, setActiveModule }) => {
  const { t } = useI18n();
  const menuItems = [
    { id: "dashboard", label: t("admin_dashboard"), icon: <LayoutDashboard size={20} /> },
    { id: "semesters", label: t("admin_semesters"), icon: <Calendar size={20} /> },
    { id: "users", label: t("admin_users"), icon: <Users size={20} /> },
    { id: "companies", label: t("admin_companies"), icon: <Building2 size={20} /> },
    { id: "jobs", label: t("admin_jobs"), icon: <Briefcase size={20} /> },
    { id: "documents", label: t("admin_documents"), icon: <FileText size={20} /> },
    { id: "analytics", label: t("admin_analytics"), icon: <BarChart2 size={20} /> },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">{t("admin_title")}</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-btn ${activeModule === item.id ? "active" : ""}`}
            onClick={() => setActiveModule(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
