// src/components/company/CompanySidebar.jsx
import React from "react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  FileStack,
  BookOpen,
  User
} from "lucide-react";
import "./CompanySidebar.css";

const CompanySidebar = ({ activeModule, setActiveModule }) => {
  const menuItems = [
    { id: "dashboard",     label: "Dashboard",          icon: <LayoutDashboard size={20} /> },
    { id: "jobs",          label: "Job Management",     icon: <Briefcase size={20} /> },
    { id: "applicants",    label: "Applicants",         icon: <Users size={20} /> },
    { id: "documents",     label: "Company Documents",  icon: <FileStack size={20} /> },
    { id: "students",      label: "Students OJT",       icon: <BookOpen size={20} /> },
    { id: "final_report",  label: "Final Report",       icon: <FileText size={20} /> },
    { id: "profile",       label: "Profile",            icon: <User size={20} /> }
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Company REP</h2>
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

export default CompanySidebar;
