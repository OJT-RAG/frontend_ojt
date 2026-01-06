import React from "react";
import "./StaffDashboard.css";

const StaffDashboard = () => {
  // Dữ liệu giả
  const stats = [
    { title: "Total Semesters", value: 4 },
    { title: "Active Semester", value: "Spring 2025" },
    { title: "Pending Approvals", value: 3 },
  ];

  return (
    <div className="staff-dashboard">
      <h1 className="dashboard-title">Staff Dashboard</h1>

      <div className="stats-container">
        {stats.map((item, index) => (
          <div key={index} className="stat-card">
            <h2>{item.value}</h2>
            <p>{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffDashboard;