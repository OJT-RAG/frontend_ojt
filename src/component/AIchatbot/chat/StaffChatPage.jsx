import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../../API/UserAPI.js";
import "./StaffChatPage.scss";

const StaffChatPage = () => {
  const navigate = useNavigate();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("=== StaffChatPage mounted ===");

    const fetchStaffs = async () => {
      try {
        console.log("[1] Calling userApi.getAll()");
        const res = await userApi.getAll();

        console.log("[2] Raw response:", res);

        // ✅ FIX QUAN TRỌNG Ở ĐÂY
        const users =
          Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.data)
            ? res.data.data
            : [];

        console.log("[3] Normalized users:", users);

        if (users.length === 0) {
          throw new Error("User list is empty or invalid response shape");
        }

        const croStaffs = users.filter((u) => {
          console.log(
            "[4] Checking user:",
            u.userId,
            u.fullname,
            u.role
          );
          return u.role === "cro_staff";
        });

        console.log("[5] CRO staffs:", croStaffs);

        setStaffs(croStaffs);
      } catch (err) {
        console.error("[ERROR] Load staff failed:", err);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStaffs();
  }, []);

  return (
    <div className="staff-chat-root">
      <header className="staff-chat-header">
        <button onClick={() => navigate(-1)}>← Back</button>
        <h2>Select CRO Staff</h2>
      </header>

      <main className="staff-chat-main">
        {loading && <p>Loading...</p>}

        {!loading && error && (
          <p style={{ color: "red" }}>
            Error loading staff: {error}
          </p>
        )}

        {!loading && !error && staffs.length === 0 && (
          <p>No CRO staff available</p>
        )}

        <div className="staff-list">
          {staffs.map((staff) => (
            <button
              key={staff.userId}
              className="staff-item"
              onClick={() =>
                navigate(`/chat/staff/${staff.userId}`)
              }
            >
              <strong>{staff.fullname}</strong>
              <span>{staff.email}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StaffChatPage;
