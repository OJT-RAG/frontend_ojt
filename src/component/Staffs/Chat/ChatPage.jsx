import React, { useState } from "react";
import ChatContent from "./ChatContent";
import ChatSessionList from "./ChatSessionList";
import "./chat.css";

export default function ChatPage() {
  const [activeSession, setActiveSession] = useState(null);

  return (
    <div className="chat-page">
      {/* CHAT GIỮA */}
      <ChatContent session={activeSession} />

      {/* SESSION LIST BÊN PHẢI */}
      <ChatSessionList onSelect={setActiveSession} />
    </div>
  );
}
