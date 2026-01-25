import React, { useEffect, useMemo, useState } from "react";
import { Button, Descriptions, Input, Modal, Table, Tag, message } from "antd";
import { Bookmark, BookmarkCheck, RefreshCcw, Search } from "lucide-react";
import jobPositionApi from "../../API/JobPositionAPI";
import jobDescriptionApi from "../../API/JobDescriptionAPI";
import majorApi from "../../API/MajorAPI";
import semesterApi from "../../API/SemesterAPI";
import jobApplicationApi from "../../API/JobApplicationAPI";
import jobBookmarkApi from "../../API/JobBookmarkAPI";
import companyApi from "../../API/CompanyAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";

import "./StudentJobsPage.css";

const safeParseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const resolveAuthContext = () => {
  const authUserRaw = localStorage.getItem("authUser");
  const authUser = safeParseJson(authUserRaw || "{}", {});

  const userId =
    Number(authUser?.id ?? authUser?.userId ?? 0) || 0;

  console.log("[AUTH CONTEXT]");
  console.log("raw authUser:", authUserRaw);
  console.log("parsed authUser:", authUser);
  console.log("resolved userId:", userId);

  return { userId, authUser };
};

const resolveJobDescriptionText = (item) => {
  if (!item) return "";
  return (
    item?.jobDescription ??
    item?.jobDescription1 ??
    item?.description ??
    item?.jobDesc ??
    ""
  );
};

const sortByJobPositionIdAsc = (list) => {
  const arr = Array.isArray(list) ? [...list] : [];
  arr.sort((a, b) => {
    const aId = Number(a?.jobPositionId ?? a?.jobPositionID ?? a?.jobPositionid);
    const bId = Number(b?.jobPositionId ?? b?.jobPositionID ?? b?.jobPositionid);
    const aOk = Number.isFinite(aId);
    const bOk = Number.isFinite(bId);
    if (aOk && bOk) return aId - bId;
    if (aOk) return -1;
    if (bOk) return 1;
    return 0;
  });
  return arr;
};


export default function StudentJobsPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");

  const [majors, setMajors] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [descriptionsByJobPositionId, setDescriptionsByJobPositionId] = useState({});

  const [companies, setCompanies] = useState([]);
  const [semesterCompanies, setSemesterCompanies] = useState([]);

  const [isDescViewOpen, setIsDescViewOpen] = useState(false);
  const [descViewJob, setDescViewJob] = useState(null);
  const [descViewRecord, setDescViewRecord] = useState(null);
  const [descViewLoading, setDescViewLoading] = useState(false);

  const [applyingId, setApplyingId] = useState(null);

  const [applicationByJobPositionId, setApplicationByJobPositionId] = useState({});
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  const [bookmarkByJobPositionId, setBookmarkByJobPositionId] = useState({});
  const [bookmarkBusyId, setBookmarkBusyId] = useState(null);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  const loadBookmarks = async () => {
    const { userId } = resolveAuthContext();
    if (!userId) {
      setBookmarkByJobPositionId({});
      return;
    }

    const res = await jobBookmarkApi.getByUserId(userId);
    const list = res?.data?.data || [];
    const map = {};
    for (const b of list) {
      const jobPositionId = b?.jobPositionId ?? b?.jobPositionID;
      const jobBookmarkId = b?.jobBookmarkId ?? b?.jobBookmarkID ?? b?.id;
      if (jobPositionId != null && jobBookmarkId != null) {
        map[jobPositionId] = jobBookmarkId;
      }
    }
    setBookmarkByJobPositionId(map);
  };

  const loadApplications = async () => {
    const { userId } = resolveAuthContext();
    if (!userId) {
      setApplicationByJobPositionId({});
      return;
    }

    setApplicationsLoading(true);
    try {
      const res = await jobApplicationApi.getAll();
      const list = res?.data?.data || [];

      const map = {};
      for (const a of list) {
        if (Number(a?.userId) !== Number(userId)) continue;
        const jobPositionId = a?.jobPositionId;
        if (!jobPositionId) continue;
        // Keep the latest by updateAt/appliedAt when available
        const prev = map[jobPositionId];
        if (!prev) {
          map[jobPositionId] = a;
          continue;
        }
        const prevTime = new Date(prev?.updateAt || prev?.appliedAt || prev?.createAt || 0).getTime();
        const nextTime = new Date(a?.updateAt || a?.appliedAt || a?.createAt || 0).getTime();
        if (nextTime >= prevTime) map[jobPositionId] = a;
      }

      setApplicationByJobPositionId(map);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);

      const [posRes, majorRes, semesterRes, descRes, companyRes, semesterCompanyRes] = await Promise.all([
        jobPositionApi.getAll(),
        majorApi.getAll(),
        semesterApi.getAll(),
        jobDescriptionApi.getAll(),
        companyApi.getAll(),
        companySemesterApi.getAll(),
      ]);

      const list = posRes?.data?.data || [];
      setRows(sortByJobPositionIdAsc(list));
      setMajors(majorRes?.data?.data || []);
      setSemesters(semesterRes?.data?.data || []);
      setCompanies(companyRes?.data?.data || []);
      setSemesterCompanies(semesterCompanyRes?.data?.data || []);

      const descList = descRes?.data?.data || [];
      const map = {};
      for (const item of descList) {
        const jobPositionId = item.jobPositionId ?? item.jobPositionID ?? item.jobPositionid;
        const text = resolveJobDescriptionText(item);
        if (jobPositionId != null) map[jobPositionId] = { ...item, _text: text };
      }
      setDescriptionsByJobPositionId(map);

      // Load bookmarks for current user (best-effort)
      try {
        await loadBookmarks();
      } catch (bookmarkErr) {
        console.warn("Failed to load bookmarks:", bookmarkErr);
      }

      // Load job applications for current user (best-effort)
      try {
        await loadApplications();
      } catch (appErr) {
        console.warn("Failed to load applications:", appErr);
      }
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

  const companyNameById = useMemo(() => {
    const map = new Map();
    for (const c of companies) {
      const id = c?.companyId ?? c?.companyID ?? c?.company_ID ?? c?.id ?? c?.Id;
      if (id != null) map.set(id, c?.companyName ?? c?.name ?? c?.fullName ?? "-");
    }
    return map;
  }, [companies]);

  const semesterCompanyCompanyIdByScId = useMemo(() => {
    const map = new Map();
    for (const sc of semesterCompanies) {
      const scId = sc?.semesterCompanyId ?? sc?.semesterCompanyID ?? sc?.semesterCompanyid ?? sc?.id;
      const companyId = sc?.companyId ?? sc?.companyID ?? sc?.company_ID ?? sc?.company_id ?? sc?.company?.companyId;
      if (scId != null && companyId != null) map.set(scId, companyId);
    }
    return map;
  }, [semesterCompanies]);

  const resolveJobPositionSemesterCompanyId = (jp) =>
    jp?.semesterCompanyId ?? jp?.semesterCompanyID ?? jp?.semesterCompanyid;

  const resolveJobPositionCompanyId = (jp) =>
    jp?.companyId ?? jp?.companyID ?? jp?.company_ID ?? jp?.company_id ?? jp?.company?.companyId;

  const getCompanyNameForJob = (jp) => {
    const directCompanyId = resolveJobPositionCompanyId(jp);
    if (directCompanyId != null) return companyNameById.get(directCompanyId) || "-";

    const scId = resolveJobPositionSemesterCompanyId(jp);
    if (scId != null) {
      const mappedCompanyId = semesterCompanyCompanyIdByScId.get(scId);
      return companyNameById.get(mappedCompanyId) || "-";
    }

    return "-";
  };

  const openDescriptionViewModal = async (record) => {
    const jobPositionId = record?.jobPositionId;
    if (!jobPositionId) {
      messageApi.warning("Missing Job Position ID");
      return;
    }

    setIsDescViewOpen(true);
    setDescViewJob(record);
    setDescViewRecord(null);
    setDescViewLoading(true);

    try {
      const existingFromMap = descriptionsByJobPositionId[jobPositionId];
      if (existingFromMap) {
        setDescViewRecord(existingFromMap);
        return;
      }

      const res = await jobDescriptionApi.getAll();
      const list = res?.data?.data || [];

      const found = list.find((item) => {
        const jpId = item?.jobPositionId ?? item?.jobPositionID ?? item?.jobPositionid;
        return Number(jpId) === Number(jobPositionId);
      });

      const text = resolveJobDescriptionText(found);
      setDescViewRecord(found ? { ...found, _text: text } : { jobPositionId, _text: "" });
    } catch (err) {
      console.error("Failed to load job description:", err);
      messageApi.error("Failed to load job description");
    } finally {
      setDescViewLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    let list = rows;

    if (showBookmarkedOnly) {
      list = list.filter((jp) => !!bookmarkByJobPositionId[jp?.jobPositionId]);
    }

    if (!q) return sortByJobPositionIdAsc(list);

    const filtered = list.filter((jp) => {
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
    return sortByJobPositionIdAsc(filtered);
  }, [rows, query, majorTitleById, semesterNameById, descriptionsByJobPositionId, showBookmarkedOnly, bookmarkByJobPositionId]);

  const toggleBookmark = async (record) => {
    const { userId } = resolveAuthContext();
    if (!userId) {
      messageApi.warning("Please login first.");
      return;
    }

    const jobPositionId = record?.jobPositionId;
    if (!jobPositionId) {
      messageApi.error("Invalid job position.");
      return;
    }

    const existingBookmarkId = bookmarkByJobPositionId[jobPositionId];
    try {
      setBookmarkBusyId(jobPositionId);

      if (existingBookmarkId) {
        await jobBookmarkApi.deleteById(existingBookmarkId);
        setBookmarkByJobPositionId((prev) => {
          const next = { ...prev };
          delete next[jobPositionId];
          return next;
        });
        messageApi.success("Removed from bookmarks");
      } else {
        const res = await jobBookmarkApi.create({ userId, jobPositionId });
        const createdId =
          res?.data?.data?.jobBookmarkId ||
          res?.data?.data?.jobBookmarkID ||
          res?.data?.data?.id;
        if (createdId) {
          setBookmarkByJobPositionId((prev) => ({ ...prev, [jobPositionId]: createdId }));
        } else {
          // Fallback: reload bookmark list
          await loadBookmarks();
        }
        messageApi.success("Bookmarked");
      }
    } catch (err) {
      console.error("[BOOKMARK] error:", err);
      messageApi.error(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Bookmark action failed"
      );
    } finally {
      setBookmarkBusyId(null);
    }
  };

  const handleApply = async (record) => {
  const { userId } = resolveAuthContext();

  if (!userId) {
    messageApi.warning("Please login first.");
    console.warn("[APPLY] No userId found");
    return;
  }

  const jobPositionId = record?.jobPositionId;

  // Disallow applying when the position is full.
  const desc = descriptionsByJobPositionId?.[jobPositionId];
  const hireQuantity = Number(desc?.hireQuantity ?? 0);
  const appliedQuantity = Number(desc?.appliedQuantity ?? 0);
  const isFull = hireQuantity > 0 && appliedQuantity >= hireQuantity;
  if (isFull) {
    messageApi.warning("This job position is full.");
    return;
  }

  const existing = applicationByJobPositionId[jobPositionId];
  if (existing?.status) {
    messageApi.info(`You already applied (${existing.status}).`);
    return;
  }

  console.log("[APPLY CLICK]");
  console.log("userId:", userId);
  console.log("jobPositionId:", jobPositionId);
  console.log("full record:", record);

  if (!jobPositionId) {
    messageApi.error("Invalid job position.");
    return;
  }

  try {
    setApplyingId(jobPositionId);

    const payload = {
      userId,
      jobPositionId,
    };

    console.log("[JOB APPLICATION CREATE] payload:", payload);

    const res = await jobApplicationApi.create(payload);

    console.log("[JOB APPLICATION CREATE] response:", res);

    // Backend typically creates with status=pending
    setApplicationByJobPositionId((prev) => ({
      ...prev,
      [jobPositionId]: res?.data?.data || { userId, jobPositionId, status: "pending" },
    }));
    messageApi.success("Applied successfully");

    // Refresh from server (best-effort) to sync status
    try {
      await loadApplications();
    } catch {}
  } catch (err) {
    console.error("[JOB APPLICATION CREATE] error:", err);
    console.error("response data:", err?.response?.data);

    messageApi.error(
      err?.response?.data?.message ||
        err?.response?.data ||
        "Apply failed"
    );
  } finally {
    setApplyingId(null);
  }
};

  const statusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "accepted") return "green";
    if (s === "rejected") return "red";
    if (s === "pending") return "gold";
    return "default";
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
        const preview = text ? (text.length > 80 ? `${text.slice(0, 80)}…` : text) : "";
        return (
          <div className="student-jobs-desc-cell">
            {text ? (
              <span className="student-jobs-desc-preview" title={text}>
                {preview}
              </span>
            ) : (
              <span style={{ color: "#999" }}>—</span>
            )}
            <Button
              type="link"
              size="small"
              className="student-jobs-desc-viewall"
              onClick={() => openDescriptionViewModal(record)}
            >
              View all
            </Button>
          </div>
        );
      },
    },
    {
      title: "Bookmark",
      key: "bookmark",
      width: 140,
      render: (_, record) => {
        const jobPositionId = record?.jobPositionId;
        const isBookmarked = !!bookmarkByJobPositionId[jobPositionId];
        const busy = bookmarkBusyId === jobPositionId;
        return (
          <Button
            onClick={() => toggleBookmark(record)}
            loading={busy}
            icon={isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          >
            {isBookmarked ? "Saved" : "Save"}
          </Button>
        );
      },
    },
    {
  title: "Actions",
  key: "actions",
  width: 160,
  render: (_, record) => {
    const app = applicationByJobPositionId[record?.jobPositionId];
    const status = app?.status;
    const desc = descriptionsByJobPositionId?.[record?.jobPositionId];
    const hireQuantity = Number(desc?.hireQuantity ?? 0);
    const appliedQuantity = Number(desc?.appliedQuantity ?? 0);
    const isFull = hireQuantity > 0 && appliedQuantity >= hireQuantity;

    const disabled =
      !record?.isActive || isFull || applyingId === record.jobPositionId || !!status;

    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {status ? (
          <Tag color={statusColor(status)} style={{ marginInlineEnd: 0 }}>
            {String(status).toUpperCase()}
          </Tag>
        ) : null}
        <Button
          type="primary"
          onClick={() => handleApply(record)}
          loading={applyingId === record.jobPositionId}
          disabled={disabled}
        >
          {status ? "Applied" : "Apply"}
        </Button>
      </div>
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
          <Button
            onClick={() => setShowBookmarkedOnly((v) => !v)}
            icon={showBookmarkedOnly ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          >
            {showBookmarkedOnly ? "Bookmarks" : "All"}
          </Button>
          <Button icon={<RefreshCcw size={16} />} onClick={refresh} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Table
        rowKey={(r) => r.jobPositionId}
        columns={columns}
        dataSource={filteredRows}
        loading={loading || applicationsLoading}
        pagination={{ pageSize: 8, showSizeChanger: true }}
      />

      <Modal
        title="Job description"
        open={isDescViewOpen}
        onCancel={() => setIsDescViewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDescViewOpen(false)}>
            Close
          </Button>,
        ]}
        width={720}
      >
        <Descriptions
          bordered
          size="small"
          column={1}
          items={[
            {
              key: "company",
              label: "Company",
              children: getCompanyNameForJob(descViewJob),
            },
            {
              key: "hireQuantity",
              label: "Hire quantity",
              children: String(descViewRecord?.hireQuantity ?? 0),
            },
            {
              key: "appliedQuantity",
              label: "Apply quantity",
              children: String(descViewRecord?.appliedQuantity ?? 0),
            },
            {
              key: "description",
              label: "Description",
              children: (
                <div className="student-jobs-desc-modal-text" aria-busy={descViewLoading}>
                  {descViewLoading ? "Loading..." : descViewRecord?._text || "—"}
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
