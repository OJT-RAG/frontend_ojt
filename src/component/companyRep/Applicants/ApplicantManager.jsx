import React, { useState, useEffect } from "react";
import "./ApplicantManager.css";

export default function ApplicantManager() {
  const [applicants, setApplicants] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [searchMajor, setSearchMajor] = useState("");

  // Dữ liệu mẫu
  useEffect(() => {
    setApplicants([
      {
        id: 1,
        fullname: "Nguyễn Văn A",
        major: "Information Security",
        submitDate: "2025-11-20",
        cvUrl: "#",
        status: "Pending"
      },
      {
        id: 2,
        fullname: "Trần Thị B",
        major: "Computer Science",
        submitDate: "2025-11-21",
        cvUrl: "#",
        status: "Pending"
      },
      {
        id: 3,
        fullname: "Lê Hoàng C",
        major: "Information Security",
        submitDate: "2025-11-22",
        cvUrl: "#",
        status: "Pending"
      },
    ]);
  }, []);

  // Xử lý phỏng vấn
  const handleInterview = (id) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Interview Scheduled" } : a
      )
    );
  };

  // Xử lý từ chối
  const handleReject = (id) => {
    setApplicants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Rejected" } : a))
    );
  };

  // Lọc theo tên và ngành
  const filteredApplicants = applicants.filter((app) => {
    const matchName = app.fullname.toLowerCase().includes(searchName.toLowerCase());
    const matchMajor = searchMajor === "" || app.major === searchMajor;
    return matchName && matchMajor;
  });

  // Lấy danh sách ngành
  const majors = Array.from(new Set(applicants.map((a) => a.major)));

  return (
    <div className="applicant-container">
      <h2>Quản lý Applicant</h2>

      <div className="search-controls">
        <input
          type="text"
          placeholder="Tìm theo tên..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <select
          value={searchMajor}
          onChange={(e) => setSearchMajor(e.target.value)}
        >
          <option value="">-- Chọn ngành --</option>
          {majors.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <table className="applicant-table">
        <thead>
          <tr>
            <th>Tên</th>
            <th>Ngành</th>
            <th>Ngày nộp</th>
            <th>CV</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredApplicants.length === 0 ? (
            <tr>
              <td colSpan="6" className="no-data">
                Không tìm thấy applicant
              </td>
            </tr>
          ) : (
            filteredApplicants.map((app) => (
              <tr key={app.id}>
                <td>{app.fullname}</td>
                <td>{app.major}</td>
                <td>{app.submitDate}</td>
                <td>
                  <a href={app.cvUrl} target="_blank" rel="noreferrer">
                    Xem CV
                  </a>
                </td>
                <td>{app.status}</td>
                <td>
                  <button
                    className="interview-btn"
                    onClick={() => handleInterview(app.id)}
                  >
                    Phỏng vấn
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleReject(app.id)}
                  >
                    Từ chối
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
