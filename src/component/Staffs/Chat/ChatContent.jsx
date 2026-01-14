import React, { useEffect, useRef, useState } from "react";
import userChatApi from "../../API/UserChatAPI";

const POLL_INTERVAL = 2000;

export default function ChatContent({ staffId, session }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!session) return;

    loadConversation();

    const timer = setInterval(loadConversation, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [session]);

  const loadConversation = async () => {
    try {
      const res = await userChatApi.getConversation(
        staffId,
        session.studentId
      );

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      setMessages(data);
    } catch (err) {
      console.error("Load conversation failed", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    await userChatApi.sendMessage({
      senderId: staffId,
      receiverId: session.studentId,
      content: input,
    });

    setInput("");
    await loadConversation();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!session) {
    return (
      <div className="chat-content empty">
        Chọn một session để bắt đầu chat
      </div>
    );
  }

  return (
    <div className="chat-content">
      <div className="chat-header">
        {session.studentName}
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-message ${
              m.senderId === staffId ? "me" : ""
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
        />
        <button onClick={sendMessage}>Gửi</button>
      </div>
    </div>
  );
}
