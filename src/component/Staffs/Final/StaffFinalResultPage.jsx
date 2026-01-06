import React, { useEffect, useState } from "react";
import {
  Table,
  Input,
  notification,
  Spin,
  Tag,
} from "antd";

import finalReportApi from "../../API/FinalReportAPI";
import userApi from "../../API/UserAPI";
import jobPositionApi from "../../API/JobPositionAPI";
import semesterApi from "../../API/SemesterAPI";

export default function StaffFinalResultPage() {
  const [loading, setLoading] = useState(false);

  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [search, setSearch] = useState("");

  // ===================== LOAD DATA =====================
  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        reportRes,
        userRes,
        jobRes,
        semesterRes,
      ] = await Promise.all([
        finalReportApi.getAll(),
        userApi.getAll(),
        jobPositionApi.getAll(),
        semesterApi.getAll(),
      ]);

      setReports(reportRes.data.data || []);
      setUsers(userRes.data.data || []);
      setJobPositions(jobRes.data.data || []);
      setSemesters(semesterRes.data.data || []);
    } catch (err) {
      notification.error({
        message: "Lỗi tải dữ liệu",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===================== HELPERS =====================
  const getStudentName = (userId) => {
    const u = users.find((x) => x.userId === userId);
    return u ? u.fullname : "-";
  };

  const getSemesterName = (semesterId) => {
    const s = semesters.find((x) => x.semesterId === semesterId);
    return s ? s.name : "-";
  };

  const getJobTitle = (jobPositionId) => {
    const j = jobPositions.find(
      (x) => x.jobPositionId === jobPositionId
    );
    return j ? j.jobTitle : "-";
  };

  // ===================== FILTER =====================
  const filteredReports = reports.filter((r) =>
    getStudentName(r.userId)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ===================== TABLE =====================
  const columns = [
    {
      title: "Sinh viên",
      render: (_, record) => getStudentName(record.userId),
    },
    {
      title: "Học kỳ",
      render: (_, record) => getSemesterName(record.semesterId),
    },
    {
      title: "Vị trí thực tập",
      render: (_, record) =>
        getJobTitle(record.jobPositionId),
    },
    {
      title: "File báo cáo",
      dataIndex: "studentReportFile",
      render: (file) =>
        file ? (
          <a
            href={file}
            target="_blank"
            rel="noreferrer"
          >
            Xem PDF
          </a>
        ) : (
          "Không có"
        ),
    },
    {
      title: "Điểm Final",
      dataIndex: "companyRating",
      render: (score) =>
        score !== null ? (
          <Tag color={score >= 5 ? "green" : "red"}>
            {score}
          </Tag>
        ) : (
          <Tag color="orange">Chưa chấm</Tag>
        ),
    },
    {
      title: "Nhận xét",
      dataIndex: "companyFeedback",
      render: (text) => text || "-",
    },
    {
      title: "Người chấm",
      dataIndex: "companyEvaluator",
      render: (text) => text || "-",
    },
    {
      title: "Ngày nộp",
      dataIndex: "submittedAt",
      render: (date) =>
        date
          ? new Date(date).toLocaleString()
          : "-",
    },
  ];

  // ===================== RENDER =====================
  return (
    <Spin spinning={loading}>
      <div style={{ padding: 24 }}>
        <h2>Staff – Kết quả Final của sinh viên</h2>

        <Input.Search
          placeholder="Tìm theo tên sinh viên"
          style={{ maxWidth: 300, marginBottom: 16 }}
          allowClear
          onChange={(e) => setSearch(e.target.value)}
        />

        <Table
          rowKey="finalreportId"
          dataSource={filteredReports}
          columns={columns}
          pagination={{ pageSize: 8 }}
        />
      </div>
    </Spin>
  );
}
