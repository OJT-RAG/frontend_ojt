import React, { useState, useEffect } from "react";
import userApi from "../../API/UserAPI";
import majorApi from "../../API/MajorAPI";
import "./StudentManage.css";

export default function StudentManage() {
  const [students, setStudents] = useState([]);
  const [majors, setMajors] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [loading, setLoading] = useState(true);

  // ===== KIỂM TRA STUDENT =====
  const isStudentUser = (u) => {
    if (!u) return false;
    if (u.roleId != null && Number(u.roleId) === 3) return true;
    const roleText = String(u.role ?? u.roleName ?? "").toLowerCase();
    return roleText === "student";
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // ===== LẤY companyId USER ĐANG LOGIN =====
        const currentCompanyId = Number(
          localStorage.getItem("company_ID")
        );

        console.log("🔵 Current companyId:", currentCompanyId);

        const [userRes, majorRes] = await Promise.all([
          userApi.getAll(),
          majorApi.getAll(),
        ]);

        // ===== LẤY DATA USER =====
        const users = Array.isArray(userRes?.data)
          ? userRes.data
          : userRes?.data?.data || [];

        console.log("🟡 All users from API:", users);

        // ===== LỌC STUDENT + CÙNG companyId =====
        const filteredStudents = users.filter(
          (u) =>
            isStudentUser(u) &&
            u.companyId === currentCompanyId
        );

        console.log(
          "🟢 Students after companyId filter:",
          filteredStudents
        );

        setStudents(filteredStudents);
        setMajors(majorRes.data.data || []);
      } catch (error) {
        console.error("❌ Error loading data:", error);
        setStudents([]);
        setMajors([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ===== LỌC THEO TÊN + NGÀNH =====
  const filteredStudents = students.filter((stu) => {
    const matchName = String(stu.fullname ?? "")
      .toLowerCase()
      .includes(searchName.toLowerCase());

    const matchMajor =
      selectedMajor === "" || stu.majorId === Number(selectedMajor);

    return matchName && matchMajor;
  });

  return (
    <div className="student-search-container">
      <h2>Tra cứu sinh viên</h2>

      <div className="search-controls">
        <input
          type="text"
          placeholder="Nhập tên sinh viên..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />

        <select
          value={selectedMajor}
          onChange={(e) => setSelectedMajor(e.target.value)}
        >
          <option value="">-- Chọn ngành --</option>
          {majors.map((m) => (
            <option key={m.majorId} value={m.majorId}>
              {m.majorTitle}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : filteredStudents.length === 0 ? (
        <p>Không tìm thấy sinh viên</p>
      ) : (
        <table className="student-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Mã sinh viên</th>
              <th>Email</th>
              <th>Ngành</th>
              <th>Số điện thoại</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((stu) => {
              const major = majors.find(
                (m) => m.majorId === stu.majorId
              );
              return (
                <tr key={stu.userId}>
                  <td>{stu.fullname}</td>
                  <td>{stu.studentCode}</td>
                  <td>{stu.email}</td>
                  <td>{major?.majorTitle || "Chưa xác định"}</td>
                  <td>{stu.phone}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
