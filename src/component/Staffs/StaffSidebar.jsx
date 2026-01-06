// src/components/staff/StaffSidebar.jsx
import React from "react";
import {
  LayoutDashboard,
  CalendarRange,
} from "lucide-react";
import "./StaffSidebar.css";

const StaffSidebar = ({ activeModule, setActiveModule }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "semester", label: "Semester", icon: <CalendarRange size={20} /> },
    { id: "final", label: "Final Report", icon: <CalendarRange size={20} /> },
    { id: "chat", label: "Chat", icon: <CalendarRange size={20} /> },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Staff Panel</h2>
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

export default StaffSidebar;