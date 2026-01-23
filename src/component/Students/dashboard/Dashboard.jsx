import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import PdfManager from "../../pages/pdf/pdfManager.jsx";
import FinalReportPage from "../StudentsReport/FinalReportPage.jsx";
import UpdateUserPage from "../userProfile/UpdateUserPage.jsx";
import StudentJobsPage from "../jobs/StudentJobsPage.jsx";
import CV from "../../profile/CV.jsx";
import "./Dashboard.css";

const Dashboard = () => {
  const location = useLocation();

  // Mặc định module PDF active
  const [activeModule, setActiveModule] = useState("pdf");

  // Allow deep-linking to a dashboard module via navigation state
  useEffect(() => {
    const next = location?.state?.activeModule;
    if (typeof next === "string" && next.length > 0) {
      setActiveModule(next);
    }
  }, [location?.state]);

  // Render nội dung module tương ứng
  const renderContent = () => {
    switch (activeModule) {
      case "profile":
        return <CV onEditProfile={() => setActiveModule("updateuser")} />;
      case "pdf":
        return <PdfManager />; 
      case "finalreport":
        return <FinalReportPage />; 
      case "updateuser":
        return <UpdateUserPage />;
      case "jobs":
        return <StudentJobsPage />;
      case "settings":
        return <div>Nội dung Cài đặt sẽ ở đây...</div>; 
      default:
        return <PdfManager />; 
    }
  };

  return (
    <div className="dashboard-root">
      <div className="dashboard-container">
        {/* Truyền state và hàm set state vào Sidebar */}
        <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
        <div className="dashboard-content">
          <div className="dashboard-surface">
            {/* Render nội dung module tương ứng */}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
