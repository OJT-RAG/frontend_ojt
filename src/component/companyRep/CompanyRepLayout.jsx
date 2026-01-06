import React, { useState } from "react";
import { Layout } from "antd";
import Sidebar from "./CompanySidebar";
import CompanyRepDashboard from "./Dashboard/CompanyDashboard";
import JobManagement from "./JobManage/JobManagement";
import Profile from "./Profile/CompanyUpdatePage";
import CompanyFinalReport from "./Evaluation/CompanyFinalReport";
import DocumentManager from "./Document/DocumentManager";
import StudentSearch from "./Students/StudentManage";
import ApplicantManager from "./Applicants/ApplicantManager";
const { Sider, Content } = Layout;

const CompanyRepLayout = () => {
  const [activeModule, setActiveModule] = useState("dashboard");

  return (
    <Layout style={{ minHeight: "100vh", display: "flex" }}>
      
      <Sider width={280} style={{ background: "transparent" }}>
        <Sidebar 
          activeModule={activeModule}
          setActiveModule={setActiveModule}
        />
      </Sider>

      <div style={{ flex: 1, padding: "20px" }}>
        {activeModule === "dashboard" && <CompanyRepDashboard />}
        {activeModule === "jobs" && <div><JobManagement /></div>}
        {activeModule === "applicants" && <div>< ApplicantManager/></div>}
        {activeModule === "documents" && <div><DocumentManager /></div>}
        {activeModule === "students" && <div><StudentSearch /></div>}
        {activeModule === "final_report" && <div><CompanyFinalReport /></div>}
        {activeModule === "profile" && <div><Profile/></div>}
      </div>

    </Layout>
  );
};

export default CompanyRepLayout;
