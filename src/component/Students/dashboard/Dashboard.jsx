import React, { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import PdfManager from "../../pages/pdf/pdfManager.jsx";
import FinalReportPage from "../StudentsReport/FinalReportPage.jsx";
import UpdateUserPage from "../userProfile/UpdateUserPage.jsx";
import JobsPage from "../../profile/Joblist.jsx"
import "./Dashboard.css";

const Dashboard = () => {
  // Mặc định module PDF active
  const [activeModule, setActiveModule] = useState("pdf"); 

  // Render nội dung module tương ứng
  const renderContent = () => {
    switch (activeModule) {
      case "pdf":
        return <PdfManager />; 
      case "finalreport":
        return <FinalReportPage />; 
      case "updateuser":
        return <UpdateUserPage />;
      case "jobs":
        return <div><JobsPage/></div>; 
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
