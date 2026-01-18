import React, { useEffect, useState } from "react";
import jobApplicationApi from "../../API/JobApplicationAPI";
import "./JobApplicationManage.scss";

export default function JobApplicationManage() {
  const [applications, setApplications] = useState([]);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState(null);

  const fetchApplications = async () => {
    try {
      const res = await jobApplicationApi.getAll();
      setApplications(res.data.data || []);
    } catch (err) {
      console.error("Fetch job applications failed", err);
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
              <td>{app.jobPositionId}</td>
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
