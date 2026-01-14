import React, { useEffect, useState } from "react";
import userApi from "../../API/UserAPI";
import userChatApi from "../../API/UserChatAPI";

export default function ChatSessionList({ staffId, onSelect }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) return;

    const loadSessions = async () => {
      try {
        setLoading(true);

        console.log("[1] Load all users");
        const usersRes = await userApi.getAll();

        const users = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data?.data || [];

        // ✅ LẤY ĐÚNG STUDENT
        const students = users.filter(
          (u) => u.role === "Student"
        );

        console.log("[2] Students:", students);

        const result = [];

        for (const student of students) {
          const studentId = student.userId; // ✅ CHUẨN

          try {
            const res = await userChatApi.getConversation(
              staffId,
              studentId
            );

            const messages = Array.isArray(res.data)
              ? res.data
              : res.data?.data || [];

            if (messages.length > 0) {
              const last = messages[messages.length - 1];

              result.push({
                studentId: studentId,
                studentName:
                  student.fullname ||
                  student.email ||
                  `Student #${studentId}`,
                lastMessage: last.content,
                sentAt: last.sentAt,
              });
            }
          } catch {
            console.log(
              `No conversation with student ${studentId}`
            );
          }
        }

        setSessions(result);
      } catch (err) {
        console.error("❌ Load session list failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [staffId]);

  if (loading) {
    return <div className="session-list">Loading...</div>;
  }

  return (
    <div className="session-list">
      <div className="session-header">Chat sessions</div>

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
