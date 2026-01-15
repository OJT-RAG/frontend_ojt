import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Table, Tag, message, Modal } from "antd";
import { RefreshCcw, Search } from "lucide-react";
import jobPositionApi from "../../API/JobPositionAPI";
import jobDescriptionApi from "../../API/JobDescriptionAPI";
import majorApi from "../../API/MajorAPI";
import semesterApi from "../../API/SemesterAPI";
import userApi from "../../API/UserAPI";
import "./StudentJobsPage.css";

const safeParseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const resolveStudentContext = () => {
  const userInfo = safeParseJson(localStorage.getItem("userInfo") || "{}", {});
  const authUser = safeParseJson(localStorage.getItem("authUser") || "{}", {});

  const userId = Number(userInfo?.userId ?? authUser?.id ?? authUser?.userId ?? 0) || 0;
  const currentJobPositionId = Number(userInfo?.jobPositionId ?? authUser?.jobPositionId ?? 0) || 0;
  const currentSemesterId = Number(userInfo?.semesterId ?? authUser?.semesterId ?? 0) || 0;

  return { userId, currentJobPositionId, currentSemesterId, userInfo, authUser };
};

export default function StudentJobsPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");

  const [majors, setMajors] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [descriptionsByJobPositionId, setDescriptionsByJobPositionId] = useState({});

  const [applyingId, setApplyingId] = useState(null);

  const refresh = async () => {
    try {
      setLoading(true);

      const [posRes, majorRes, semesterRes, descRes] = await Promise.all([
        jobPositionApi.getAll(),
        majorApi.getAll(),
        semesterApi.getAll(),
        jobDescriptionApi.getAll(),
      ]);

      const list = posRes?.data?.data || [];
      setRows(list);
      setMajors(majorRes?.data?.data || []);
      setSemesters(semesterRes?.data?.data || []);

      const descList = descRes?.data?.data || [];
      const map = {};
      for (const item of descList) {
        const jobPositionId = item.jobPositionId ?? item.jobPositionID ?? item.jobPositionid;
        const text = item.jobDescription ?? item.description ?? item.jobDesc ?? "";
        if (jobPositionId != null) map[jobPositionId] = { ...item, _text: text };
      }
      setDescriptionsByJobPositionId(map);
    } catch (err) {
      console.error("Failed to fetch job positions:", err);
      messageApi.error(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to load job positions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const majorTitleById = useMemo(() => {
    const map = {};
    for (const m of majors) map[m.majorId] = m.majorTitle;
    return map;
  }, [majors]);

  const semesterNameById = useMemo(() => {
    const map = {};
    for (const s of semesters) map[s.semesterId] = s.name;
    return map;
  }, [semesters]);

  const filteredRows = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((jp) => {
      const title = (jp?.jobTitle || "").toLowerCase();
      const location = (jp?.location || "").toLowerCase();
      const salary = (jp?.salaryRange || "").toLowerCase();
      const major = (majorTitleById[jp?.majorId] || "").toLowerCase();
      const semester = (semesterNameById[jp?.semesterId] || "").toLowerCase();
      const desc = (descriptionsByJobPositionId[jp?.jobPositionId]?._text || "").toLowerCase();
      return (
        title.includes(q) ||
        location.includes(q) ||
        salary.includes(q) ||
        major.includes(q) ||
        semester.includes(q) ||
        desc.includes(q)
      );
    });
  }, [rows, query, majorTitleById, semesterNameById, descriptionsByJobPositionId]);

  const handleApply = async (record) => {
    const { userId, currentJobPositionId } = resolveStudentContext();
    if (!userId) {
      messageApi.warning("Please login first.");
      return;
    }

    const jobPositionId = record?.jobPositionId;
    const semesterId = record?.semesterId;

    const isSwitching = currentJobPositionId && currentJobPositionId !== jobPositionId;

    const ok = await new Promise((resolve) => {
      Modal.confirm({
        title: isSwitching ? "Change applied job?" : "Apply for this job?",
        content: isSwitching
          ? "You already applied to another job position. Applying here will replace your current selection."
          : "Your profile will be updated with this job position.",
        okText: "Apply",
        cancelText: "Cancel",
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!ok) return;

    try {
      setApplyingId(jobPositionId);
      await userApi.applyJobPosition({ userId, jobPositionId, semesterId });

      // Keep localStorage in sync so other pages (e.g. FinalReport) see it immediately.
      const ctx = resolveStudentContext();
      const nextUserInfo = {
        ...(ctx.userInfo || {}),
        userId,
        jobPositionId,
        semesterId,
      };
      localStorage.setItem("userInfo", JSON.stringify(nextUserInfo));

      messageApi.success("Applied successfully.");
    } catch (err) {
      console.error("Apply failed:", err);
      messageApi.error(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Apply failed. Please try again."
      );
    } finally {
      setApplyingId(null);
    }
  };

  const columns = [
    { title: "ID", dataIndex: "jobPositionId", key: "jobPositionId", width: 80 },
    { title: "Job Title", dataIndex: "jobTitle", key: "jobTitle" },
    {
      title: "Major",
      dataIndex: "majorId",
      key: "majorId",
      render: (majorId) => majorTitleById[majorId] || majorId || "-",
    },
    {
      title: "Semester",
      dataIndex: "semesterId",
      key: "semesterId",
      render: (semesterId) => semesterNameById[semesterId] || semesterId || "-",
    },
    { title: "Location", dataIndex: "location", key: "location" },
    { title: "Salary", dataIndex: "salaryRange", key: "salaryRange" },
    {
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      width: 90,
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>{isActive ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Description",
      key: "description",
      render: (_, record) => {
        const text = descriptionsByJobPositionId[record.jobPositionId]?._text;
        if (!text) return <span style={{ color: "#999" }}>—</span>;
        return <span title={text}>{text.length > 80 ? `${text.slice(0, 80)}…` : text}</span>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, record) => {
        const { currentJobPositionId } = resolveStudentContext();
        const isApplied = currentJobPositionId && currentJobPositionId === record.jobPositionId;
        const disabled = !record?.isActive || applyingId === record.jobPositionId;

        if (isApplied) {
          return <Tag color="blue">Applied</Tag>;
        }

        return (
          <Button
            type="primary"
            onClick={() => handleApply(record)}
            loading={applyingId === record.jobPositionId}
            disabled={disabled}
          >
            Apply
          </Button>
        );
      },
    },
  ];

  return (
    <div className="student-jobs-root">
      {contextHolder}

      <div className="student-jobs-header">
        <h2 className="student-jobs-title">Job Positions</h2>
        <div className="student-jobs-controls">
          <Input
            className="student-jobs-search"
            placeholder="Search title, major, location, semester..."
            prefix={<Search size={16} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            allowClear
          />
          <Button icon={<RefreshCcw size={16} />} onClick={refresh} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Table
        rowKey={(r) => r.jobPositionId}
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        pagination={{ pageSize: 8, showSizeChanger: true }}
      />
    </div>
  );
}
