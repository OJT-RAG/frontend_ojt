import React, { useEffect, useState } from "react";
import jobApplicationApi from "../../API/JobApplicationAPI";
import userApi from "../../API/UserAPI";
import "./StudentManage.css";

export default function StudentManage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      console.log("[StudentManage] Fetching JobApplications...");
      const appRes = await jobApplicationApi.getAll();

      console.log("[StudentManage] All applications:", appRes.data);

      // 1️⃣ Lọc các đơn accepted
      const acceptedApps = appRes.data.data.filter(
        (app) => app.status === "accepted"
      );

      console.log("[StudentManage] Accepted applications:", acceptedApps);

      // 2️⃣ Lấy danh sách userId từ đơn accepted
      const acceptedUserIds = acceptedApps.map((app) => app.userId);

      console.log("[StudentManage] Accepted userIds:", acceptedUserIds);

      // 3️⃣ Lấy toàn bộ user
      console.log("[StudentManage] Fetching users...");
      const userRes = await userApi.getAll();

      console.log("[StudentManage] All users:", userRes.data);

      // 4️⃣ Lọc user theo userId
      const users = userRes.data.data;

const acceptedStudents = users.filter((user) =>
  acceptedUserIds.includes(user.userId)
);


      console.log("[StudentManage] Final students:", acceptedStudents);

      setStudents(acceptedStudents);
    } catch (error) {
      console.error("[StudentManage] Error:", error);
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
