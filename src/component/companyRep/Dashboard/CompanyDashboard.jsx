// src/pages/company/CompanyDashboard.jsx
import React from "react";
import { Card, Button } from "antd";
import { Link } from "react-router-dom";
import "./CompanyDashboard.css";

const CompanyDashboard = () => {
  return (
    <div className="company-dashboard">
      <h1>Company Dashboard</h1>

      <div className="dashboard-cards">
        <Card className="dash-card">
          <h3>Total Interns</h3>
          <p>32</p>
        </Card>

        <Card className="dash-card">
          <h3>Reports Submitted</h3>
          <p>18</p>
        </Card>

        <Card className="dash-card">
          <h3>Pending Evaluations</h3>
          <p>6</p>
        </Card>
      </div>

      <Link to="/company/chart">
        <Button type="primary" className="chart-btn">
          View Charts →
        </Button>
      </Link>
    </div>
  );
};

export default CompanyDashboard;
