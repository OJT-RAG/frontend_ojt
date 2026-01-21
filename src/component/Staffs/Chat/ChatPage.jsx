import React, { useState } from "react";
import ChatContent from "./ChatContent";
import ChatSessionList from "./ChatSessionList";
import "./ChatPage.css";

/** 🔍 Lấy staff từ localStorage */
const findStaff = () => {
  for (let i = 0; i < localStorage.length; i++) {
    try {
      const parsed = JSON.parse(localStorage.getItem(localStorage.key(i)));
      if (parsed?.id && parsed?.role === "cro_staff") return parsed;
    } catch {}
  }
  return null;
};

export default function ChatPage() {
  const staff = findStaff();
  const staffId = staff?.id;

  const [activeSession, setActiveSession] = useState(null);

  if (!staffId) {
    return <div>❌ Không xác định được staff</div>;
  }

  return (
    <div className="chat-page">
      <ChatContent
        staffId={staffId}
        session={activeSession}
      />

      <ChatSessionList
        staffId={staffId}
        onSelect={setActiveSession}
      />
    </div>
  );
}
