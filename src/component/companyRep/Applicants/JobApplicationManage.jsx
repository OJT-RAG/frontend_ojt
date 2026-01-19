import React, { useEffect, useState } from "react";
import jobApplicationApi from "../../API/JobApplicationAPI";
import jobPositionApi from "../../API/JobPositionAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";
import "./JobApplicationManage.scss";

const isDebugEnabled = () => {
  try {
    return (
      process.env.NODE_ENV !== "production" ||
      localStorage.getItem("debug_semester_company") === "1"
    );
  } catch (_) {
    return process.env.NODE_ENV !== "production";
  }
};

const debugLog = (...args) => {
  if (!isDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log("[Company Applicants]", ...args);
};

const getCompanyIdFromStorage = () => {
  const raw = localStorage.getItem("company_id");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveSemesterCompanyId = (sc) =>
  sc?.semesterCompanyId ?? sc?.semesterCompanyID ?? sc?.id ?? sc?.Id;

const resolveCompanyId = (sc) =>
  sc?.companyId ??
  sc?.companyID ??
  sc?.company_ID ??
  sc?.company?.companyId ??
  sc?.company?.company_ID;

const resolveJobPositionId = (jp) =>
  jp?.jobPositionId ?? jp?.jobPositionID ?? jp?.jobPositionid;

const resolveJobPositionCompanyId = (jp) =>
  jp?.companyId ?? jp?.companyID ?? jp?.company_ID ?? jp?.company_id ?? jp?.company?.companyId;

const resolveJobPositionSemesterCompanyId = (jp) =>
  jp?.semesterCompanyId ?? jp?.semesterCompanyID ?? jp?.semesterCompanyid;

export default function JobApplicationManage() {
  const [applications, setApplications] = useState([]);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [jobTitleByJobPositionId, setJobTitleByJobPositionId] = useState({});

  const fetchApplications = async () => {
    try {
      const companyId = getCompanyIdFromStorage();
      debugLog("fetchApplications() start", { companyId });

      if (!companyId) {
        debugLog("Missing company_id in localStorage; hide all applications for safety");
        setApplications([]);
        setJobTitleByJobPositionId({});
        return;
      }

      const [appRes, jobPosRes, scRes] = await Promise.all([
        jobApplicationApi.getAll(),
        jobPositionApi.getAll(),
        companySemesterApi.getByCompany(companyId).catch(() => ({ data: { data: [] } })),
      ]);

      const apps = appRes?.data?.data || [];
      const jobPositions = jobPosRes?.data?.data || [];
      const semesterCompanies = scRes?.data?.data || scRes?.data || [];

      const scCompanyIdByScId = new Map();
      for (const sc of semesterCompanies) {
        const scId = resolveSemesterCompanyId(sc);
        const scCompanyId = resolveCompanyId(sc);
        if (scId != null && scCompanyId != null) scCompanyIdByScId.set(scId, scCompanyId);
      }

      const allowedJobPositionIds = new Set();
      const titleMap = {};
      for (const jp of jobPositions) {
        const jpId = resolveJobPositionId(jp);
        if (jpId == null) continue;

        titleMap[jpId] = jp?.jobTitle || titleMap[jpId] || "";

        const directCompanyId = resolveJobPositionCompanyId(jp);
        if (directCompanyId != null) {
          if (directCompanyId === companyId) allowedJobPositionIds.add(jpId);
          continue;
        }

        const scId = resolveJobPositionSemesterCompanyId(jp);
        if (scId != null) {
          const mappedCompanyId = scCompanyIdByScId.get(scId);
          if (mappedCompanyId === companyId) allowedJobPositionIds.add(jpId);
        }
      }

      const visible = apps.filter((app) => allowedJobPositionIds.has(app.jobPositionId));
      const pendingApps = visible.filter((app) => app.status === "pending");

      debugLog("filter result", {
        appsTotal: apps.length,
        jobPositionsTotal: jobPositions.length,
        allowedJobPositionIds: allowedJobPositionIds.size,
        visible: visible.length,
        pending: pendingApps.length,
      });

      setJobTitleByJobPositionId(titleMap);
      setApplications(pendingApps);
    } catch (err) {
      console.error("Fetch job applications failed", err);
      debugLog("fetchApplications() error", {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });
    }
  };


  useEffect(() => {
    fetchApplications();
  }, []);

  // Toggle Pending <-> Accepted
  const handleToggleStatus = async (app) => {
    const newStatus = app.status === "accepted" ? "pending" : "accepted";

    try {
      await jobApplicationApi.updateStatus({
        jobApplicationId: app.jobApplicationId,
        status: newStatus,
      });
      fetchApplications();
    } catch (err) {
      console.error("Update status failed", err);
    }
  };

  // Reject application
  const handleReject = async (appId) => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      await jobApplicationApi.updateStatus({
        jobApplicationId: appId,
        status: "rejected",
        rejectedReason: rejectReason,
      });
      setRejectReason("");
      setRejectingId(null);
      fetchApplications();
    } catch (err) {
      console.error("Reject failed", err);
    }
  };

  return (
    <div className="job-application-manage">
      <h2>Quản lý đơn ứng tuyển</h2>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>User ID</th>
            <th>Job Position</th>
            <th>Status</th>
            <th>Applied At</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {applications.map((app) => (
            <tr key={app.jobApplicationId}>
              <td>{app.jobApplicationId}</td>
              <td>{app.userId}</td>
              <td>
                {app.jobPositionId}
                {jobTitleByJobPositionId[app.jobPositionId]
                  ? ` - ${jobTitleByJobPositionId[app.jobPositionId]}`
                  : ""}
              </td>
              <td className={`status ${app.status}`}>{app.status}</td>
              <td>{new Date(app.appliedAt).toLocaleString()}</td>

              <td className="actions">
                {app.status !== "rejected" && (
                  <>
                    <button
                      className="btn-toggle"
                      onClick={() => handleToggleStatus(app)}
                    >
                      {app.status === "accepted"
                        ? "Chuyển Pending"
                        : "Accept"}
                    </button>

                    <button
                      className="btn-reject"
                      onClick={() => setRejectingId(app.jobApplicationId)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Reject modal */}
      {rejectingId && (
        <div className="reject-modal">
          <div className="modal-content">
            <h3>Lý do từ chối</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do..."
            />
            <div className="modal-actions">
              <button onClick={() => handleReject(rejectingId)}>
                Xác nhận
              </button>
              <button
                className="cancel"
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason("");
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
