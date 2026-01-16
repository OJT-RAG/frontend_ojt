import React, { useEffect, useState } from "react";
import { Column } from "@ant-design/plots";
import semesterApi from "../../API/SemesterAPI";
import semesterCompanyApi from "../../API/CompanySemesterAPI";
import finalReportApi from "../../API/FinalReportAPI";
import "./StaffDashboard.css";

const StaffDashboard = () => {
  const [stats, setStats] = useState([
    { title: "Total Companies (Active Semester)", value: 0 },
    { title: "Active Semester", value: "-" },
    { title: "Pending Approvals", value: 0 },
  ]);

  const [scoreData, setScoreData] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        /* ================= SEMESTER (CHỈ DÙNG CHO STATS) ================= */
        const semesterRes = await semesterApi.getAll();
        const semesters = Array.isArray(semesterRes?.data)
          ? semesterRes.data
          : semesterRes?.data?.data || [];

        const activeSemester = semesters.find((s) => s.isActive);

        if (activeSemester) {
          const scRes = await semesterCompanyApi.getAll();
          const semesterCompanies = Array.isArray(scRes?.data)
            ? scRes.data
            : scRes?.data?.data || [];

          const filtered = semesterCompanies.filter(
            (sc) => sc.semesterId === activeSemester.semesterId
          );

          const uniqueCompanyCount = new Set(
            filtered.map((sc) => sc.companyId)
          ).size;

          const pendingCount = filtered.filter(
            (sc) => !sc.approvedAt
          ).length;

          setStats([
            {
              title: "Total Companies (Active Semester)",
              value: uniqueCompanyCount,
            },
            {
              title: "Active Semester",
              value: activeSemester.name,
            },
            {
              title: "Pending Approvals",
              value: pendingCount,
            },
          ]);
        }

        /* ================= FINAL REPORT (CHỈ LẤY ĐIỂM) ================= */
        const reportRes = await finalReportApi.getAll();
        const reports = Array.isArray(reportRes?.data)
          ? reportRes.data
          : reportRes?.data?.data || [];

        // 👉 THỐNG KÊ ĐIỂM 1 → 5 (KHÔNG QUAN TÂM SEMESTER)
        const scoreMap = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };

        reports.forEach((r) => {
          if (r.companyRating >= 1 && r.companyRating <= 5) {
            scoreMap[r.companyRating]++;
          }
        });

        const chartData = Object.keys(scoreMap).map((key) => ({
          score: `⭐ ${key}`,
          count: scoreMap[key],
        }));

        setScoreData(chartData);
      } catch (err) {
        console.error("Dashboard load error", err);
      }
    };

    loadDashboardData();
  }, []);

  const columnConfig = {
    data: scoreData,
    xField: "score",
    yField: "count",
    label: {
      position: "top",
    },
    meta: {
      score: { alias: "Điểm đánh giá" },
      count: { alias: "Số sinh viên" },
    },
  };

  return (
    <div className="staff-dashboard">
      <h1 className="dashboard-title">Staff Dashboard</h1>

      {/* ===== STAT CARDS ===== */}
      <div className="stats-container">
        {stats.map((item, index) => (
          <div key={index} className="stat-card">
            <h2>{item.value}</h2>
            <p>{item.title}</p>
          </div>
        ))}
      </div>

      {/* ===== CHART ===== */}
      <div className="chart-container">
        <h2>Student Rating Distribution (1 – 5)</h2>
        <Column {...columnConfig} />
      </div>
    </div>
  );
};

export default StaffDashboard;
