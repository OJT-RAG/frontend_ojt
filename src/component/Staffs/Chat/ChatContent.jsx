import React, { useState } from "react";

export default function ChatContent({ session }) {
  const [messages, setMessages] = useState([
    { from: "student", text: "Thầy ơi em hỏi chút ạ" },
    { from: "staff", text: "Em hỏi đi" },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages([...messages, { from: "staff", text: input }]);
    setInput("");
  };

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
        {session.student}
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-message ${m.from === "staff" ? "me" : ""}`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
        />
        <button onClick={sendMessage}>Gửi</button>
      </div>
    </div>
  );
}
