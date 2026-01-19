import React, { useEffect, useState } from "react";
import jobApplicationApi from "../../API/JobApplicationAPI";
import userApi from "../../API/UserAPI";
import jobPositionApi from "../../API/JobPositionAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";
import "./StudentManage.css";

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
  console.log("[StudentManage]", ...args);
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

const resolveUserId = (u) => u?.userId ?? u?.id ?? u?.UserId;

const normalizeRole = (role) => String(role || "").toLowerCase();

export default function StudentManage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      const companyId = getCompanyIdFromStorage();
      debugLog("fetchStudents() start", { companyId });

      if (!companyId) {
        debugLog("Missing company_id in localStorage; returning empty list for safety");
        setStudents([]);
        return;
      }

      const [appRes, userRes, jobPosRes, scRes] = await Promise.all([
        jobApplicationApi.getAll(),
        userApi.getAll(),
        jobPositionApi.getAll(),
        companySemesterApi.getByCompany(companyId).catch(() => ({ data: { data: [] } })),
      ]);

      const apps = appRes?.data?.data || [];
      const users = userRes?.data?.data || [];
      const jobPositions = jobPosRes?.data?.data || [];
      const semesterCompanies = scRes?.data?.data || scRes?.data || [];

      debugLog("Loaded", {
        apps: apps.length,
        users: users.length,
        jobPositions: jobPositions.length,
        semesterCompanies: semesterCompanies.length,
      });

      // Build semesterCompanyId -> companyId map
      const scCompanyIdByScId = new Map();
      for (const sc of semesterCompanies) {
        const scId = resolveSemesterCompanyId(sc);
        const scCompanyId = resolveCompanyId(sc);
        if (scId != null && scCompanyId != null) scCompanyIdByScId.set(scId, scCompanyId);
      }

      // Build allowed jobPositionIds for this company
      const allowedJobPositionIds = new Set();
      for (const jp of jobPositions) {
        const jpId = resolveJobPositionId(jp);
        if (jpId == null) continue;

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

      // Filter accepted applications for this company
      const acceptedApps = apps.filter(
        (app) => app.status === "accepted" && allowedJobPositionIds.has(app.jobPositionId)
      );

      // Unique userIds
      const acceptedUserIdSet = new Set(acceptedApps.map((app) => app.userId).filter(Boolean));

      // Keep only student users (avoid showing staff accounts)
      const acceptedStudents = users
        .filter((u) => acceptedUserIdSet.has(resolveUserId(u)))
        .filter((u) => normalizeRole(u.role) === "student");

      debugLog("Result", {
        allowedJobPositionIds: allowedJobPositionIds.size,
        acceptedApps: acceptedApps.length,
        acceptedUserIds: acceptedUserIdSet.size,
        acceptedStudents: acceptedStudents.length,
      });

      setStudents(acceptedStudents);
    } catch (error) {
      console.error("[StudentManage] Error:", error);
      debugLog("fetchStudents() error", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="student-manage">
      <h2>Danh sách sinh viên đã được nhận</h2>

      {students.length === 0 ? (
        <p>Không có sinh viên nào</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Ngày sinh</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.userId}>
                <td>{student.userId}</td>
                <td>{student.fullname}</td>
                <td>{student.email}</td>
                <td>{student.phone}</td>
                <td>
                  {student.dob
                    ? new Date(student.dob).toLocaleDateString()
                    : "-"}
                </td>
                <td>{student.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
