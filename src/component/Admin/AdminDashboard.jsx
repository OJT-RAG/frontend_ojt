import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import "./AdminDashboard.scss";

// Import pages
import DashboardOverview from "./pages/DashboardOverview";
import SemesterManager from "./pages/SemesterManager";
import UserManager from "./pages/UserManager";
import CompanyManager from "./pages/CompanyManager";
import JobManager from "./pages/JobManager";
import DocumentManager from "./pages/DocumentManager";
import Analytics from "./pages/Analytics";

const AdminDashboard = () => {
  const [activeModule, setActiveModule] = useState("dashboard");

  const renderContent = () => {
    switch (activeModule) {
      case "dashboard": return <DashboardOverview />;
      case "semesters": return <SemesterManager />;
      case "users": return <UserManager />;
      case "companies": return <CompanyManager />;
      case "jobs": return <JobManager />;
      case "documents": return <DocumentManager />;
      case "analytics": return <Analytics />;
      default: return <DashboardOverview />;
    }
  };

  return (
    <div className="admin-dashboard-root">
      <div className="admin-container">
        <AdminSidebar activeModule={activeModule} setActiveModule={setActiveModule} />
        <main className="admin-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
