// src/pages/company/CompanyDashboard.jsx
import React, { useEffect, useState } from "react";
import { Card, Button, message } from "antd";
import { Link } from "react-router-dom";
import semesterApi from "../../API/SemesterAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";
import companyApi from "../../API/CompanyAPI";
import "./CompanyDashboard.css";

const getCompanyIdFromStorage = () => {
  const raw =
    localStorage.getItem("company_id") ??
    localStorage.getItem("company_ID") ??
    localStorage.getItem("companyId");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getCompanyVerified = (c) => {
  if (typeof c?.is_Verified === "boolean") return c.is_Verified;
  if (typeof c?.isVerified === "boolean") return c.isVerified;
  if (typeof c?.is_verified === "boolean") return c.is_verified;
  if (typeof c?.isActive === "boolean") return c.isActive;

  const rawStatus = c?.status ?? c?.companyStatus ?? c?.state;
  const status = String(rawStatus ?? "").trim().toLowerCase();
  if (!status) return true;

  const approved = new Set(["approved", "approve", "verified", "active", "enabled"]);
  const blocked = new Set([
    "pending",
    "unapproved",
    "not approve",
    "not_approve",
    "disabled",
    "inactive",
    "rejected",
  ]);
  if (approved.has(status)) return true;
  if (blocked.has(status)) return false;
  return true;
};

const CompanyDashboard = () => {
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading, setLoading] = useState(false);
  const [companyVerified, setCompanyVerified] = useState(null);

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

  useEffect(() => {
    const loadCompany = async () => {
      const companyId = getCompanyIdFromStorage();
      if (!companyId) {
        setCompanyVerified(null);
        return;
      }
      try {
        const res = await companyApi.getById(companyId);
        const payload = res?.data?.data ?? res?.data ?? null;
        setCompanyVerified(getCompanyVerified(payload));
      } catch {
        // If we can't fetch status, do not block.
        setCompanyVerified(true);
      }
    };

    loadCompany();
  }, []);

  // 🔹 register semester cho company
  const handleRegisterSemester = async () => {
    const companyId = getCompanyIdFromStorage();

    if (!companyId) {
      message.error("Không tìm thấy companyId");
      return;
    }

    if (companyVerified === false) {
      message.error("Công ty chưa được duyệt hoặc đã bị vô hiệu hoá. Không thể đăng ký học kỳ.");
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
          disabled={!activeSemester || companyVerified === false}
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