import React, { useEffect, useState } from "react";
import userApi from "../../API/UserAPI";
import userChatApi from "../../API/UserChatAPI";
import "./ChatSessionList.scss";

export default function ChatSessionList({ staffId, onSelect }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) return;

    const loadSessions = async () => {
      try {
        setLoading(true);

        // 1️⃣ Load users
        const usersRes = await userApi.getAll();
        const users = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data?.data || [];

        // 2️⃣ Lọc student
        const students = users.filter(
          (u) => u.role === "student"
        );

        // 3️⃣ Gọi conversation SONG SONG
        const tasks = students.map((student) => {
          const studentId = student.userId;
          if (!studentId) return null;

          return userChatApi
            .getConversation(staffId, studentId)
            .then((res) => {
              const messages = Array.isArray(res.data)
                ? res.data
                : res.data?.data || [];

              if (messages.length === 0) return null;

              const last = messages[messages.length - 1];

              return {
                studentId,
                studentName:
                  student.fullname ||
                  student.email ||
                  `Student #${studentId}`,
                lastMessage: last.content,
                sentAt: last.sentAt,
              };
            })
            .catch(() => null);
        });

        // 4️⃣ Tổng hợp kết quả
        const results = await Promise.allSettled(tasks);

        const sessions = results
          .filter((r) => r.status === "fulfilled" && r.value)
          .map((r) => r.value)
          .sort(
            (a, b) =>
              new Date(b.sentAt) - new Date(a.sentAt)
          );

        setSessions(sessions);
      } catch (err) {
        console.error("❌ Load session list failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [staffId]);

  // ===== RENDER =====

  if (loading) {
    return (
      <div className="session-list">
        <div className="session-header">
          Chat sessions
        </div>
        <div className="session-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-item">
              <div className="skeleton-name shimmer" />
              <div className="skeleton-last shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="session-list">
      <div className="session-header">
        Chat sessions
      </div>

      {sessions.length === 0 && (
        <div className="session-empty">
          Chưa có student nào nhắn
        </div>
      )}

      {sessions.map((s) => (
        <div
          key={s.studentId}
          className="session-item"
          onClick={() => onSelect(s)}
        >
          <div className="session-name">
            {s.studentName}
          </div>
          <div className="session-last">
            {s.lastMessage}
          </div>
        </div>
      ))}
    </div>
  );
}
