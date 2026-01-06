import React from "react";

const SESSIONS = [
  { id: 1, student: "Nguyễn Văn A", status: "Đang chờ" },
  { id: 2, student: "Trần Thị B", status: "Đang chat" },
  { id: 3, student: "Lê Văn C", status: "Đã xong" },
];

export default function ChatSessionList({ onSelect }) {
  return (
    <div className="session-list">
      <div className="session-header">Chat sessions</div>

      {SESSIONS.map((s) => (
        <div
          key={s.id}
          className="session-item"
          onClick={() => onSelect(s)}
        >
          <div className="session-name">{s.student}</div>
          <div className={`session-status ${s.status}`}>
            {s.status}
          </div>
        </div>
      ))}
    </div>
  );
}
