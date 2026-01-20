import React, { useEffect, useState } from "react";
import majorApi from "../../API/MajorAPI";
import companyApi from "../../API/CompanyAPI";
import ojtDocumentApi from "../../API/OjtDocumentAPI";
import CompanySemesterPie from "./CompanySemesterPie";
import "./StaffDashboard.css";

export default function StaffDashboard() {
  const [totalMajor, setTotalMajor] = useState(0);
  const [totalCompany, setTotalCompany] = useState(0);
  const [totalDocument, setTotalDocument] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
  try {
    setLoading(true);

    const [majorRes, companyRes, documentRes] = await Promise.all([
      majorApi.getAll(),
      companyApi.getAll(),
      ojtDocumentApi.getAll(),
    ]);

    setTotalMajor(majorRes?.data?.data?.length || 0);
    setTotalCompany(companyRes?.data?.data?.length || 0);
    setTotalDocument(documentRes?.data?.data?.length || 0);
  } catch (error) {
    console.error("❌ Error loading dashboard data:", error?.response || error);
  } finally {
    setLoading(false);
  }
};



  if (loading) {
    return <div className="staff-dashboard loading">Loading dashboard...</div>;
  }

  return (
    <div className="staff-dashboard">
      <h2 className="dashboard-title">Staff Dashboard</h2>

      <div className="dashboard-cards">
        <div className="dashboard-card major">
          <div className="card-title">Total Majors</div>
          <div className="card-value">{totalMajor}</div>
        </div>

        <div className="dashboard-card company">
          <div className="card-title">Total Companies</div>
          <div className="card-value">{totalCompany}</div>
        </div>

        <div className="dashboard-card document">
          <div className="card-title">Total Documents</div>
          <div className="card-value">{totalDocument}</div>
        </div>
      </div>

      <CompanySemesterPie />
    </div>
  );
}
