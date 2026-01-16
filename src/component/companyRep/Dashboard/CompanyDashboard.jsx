// src/pages/company/CompanyDashboard.jsx
import React, { useEffect, useState } from "react";
import { Card, Button, message } from "antd";
import { Link } from "react-router-dom";
import semesterApi from "../../API/SemesterAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";
import "./CompanyDashboard.css";

const CompanyDashboard = () => {
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 load semester giống Header
  useEffect(() => {
    const loadSemester = async () => {
      try {
        const res = await semesterApi.getAll();
        const list = Array.isArray(res?.data)
          ? res.data
          : res?.data?.data || [];

        const active = list.find((s) => s?.isActive);
        setActiveSemester(active || null);
      } catch {
        setActiveSemester(null);
      }
    };

    loadSemester();
  }, []);

  // 🔹 register semester cho company
  const handleRegisterSemester = async () => {
    const companyId = Number(localStorage.getItem("company_ID"));

    if (!companyId) {
      message.error("Không tìm thấy companyId");
      return;
    }

    if (!activeSemester?.id && !activeSemester?.semesterId) {
      message.error("Chưa có semester active");
      return;
    }

    const semesterId = activeSemester.id || activeSemester.semesterId;

    try {
      setLoading(true);

      await companySemesterApi.create({
        semesterId,
        companyId,
      });

      message.success("🎉 Đăng ký semester thành công");
    } catch (err) {
      message.error(
        err?.response?.data?.message || "Đăng ký semester thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

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

      <div className="company-actions">
        <Button
          type="primary"
          onClick={handleRegisterSemester}
          loading={loading}
          disabled={!activeSemester}
        >
          Register Current Semester
        </Button>

        <Link to="/company/chart">
          <Button className="chart-btn" style={{ marginLeft: 12 }}>
            View Charts →
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default CompanyDashboard;
