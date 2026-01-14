import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import userChatApi from "../../API/UserChatAPI.js";
import "./StaffChatRoom.scss";

/**
 * 🔍 Try to find logged-in user from ANY localStorage key
 */
const findUserFromLocalStorage = () => {
  console.group("🔍 Scan localStorage");

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const raw = localStorage.getItem(key);

    try {
      const parsed = JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.id &&
        parsed.email &&
        parsed.role
      ) {
        console.log("✅ Found user at key:", key, parsed);
        console.groupEnd();
        return parsed;
      }
    } catch {
      // ignore non-json
    }
  }

  console.warn("❌ No valid user object found in localStorage");
  console.groupEnd();
  return null;
};

const StaffChatRoom = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();

  const user = findUserFromLocalStorage();
  const currentUserId = user ? Number(user.id) : null;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  // ===== INIT =====
  useEffect(() => {
    console.group("🧪 StaffChatRoom INIT");
    console.log("currentUserId:", currentUserId);
    console.log("staffId:", staffId);
    console.groupEnd();

    if (!currentUserId) {
      setError("❌ Cannot detect logged-in user");
      setLoading(false);
      return;
    }

    if (!staffId) {
      setError("❌ Missing staffId");
      setLoading(false);
      return;
    }

    loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  // ===== LOAD CHAT =====
  const loadConversation = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("📥 Load conversation:", currentUserId, staffId);

      const res = await userChatApi.getConversation(
        currentUserId,
        Number(staffId)
      );

      const data =
        Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];

      console.log("📨 Messages:", data);

      setMessages(data);
    } catch (err) {
      console.error(
        "❌ Load conversation failed:",
        err.response?.data || err
      );
      setError("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  // ===== AUTO SCROLL =====
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===== SEND MESSAGE =====
  const handleSend = async () => {
    if (!input.trim()) return;

    const payload = {
      senderId: currentUserId,
      receiverId: Number(staffId),
      content: input,
    };

    console.log("📤 SEND PAYLOAD:", payload);

    try {
      await userChatApi.sendMessage(payload);
      setInput("");
      await loadConversation();
    } catch (err) {
      console.error(
        "❌ Send message failed:",
        err.response?.data || err
      );
      alert("Send message failed – check console");
    }
  };

  return (
    <div className="staff-chatroom-root">
      <header className="staff-chatroom-header">
        <button onClick={() => navigate(-1)}>← Back</button>
        <h3>Chat with CRO Staff</h3>
      </header>

      <main className="staff-chatroom-main">
        {loading && <p>Loading messages...</p>}

        {!loading && error && (
          <p style={{ color: "red" }}>{error}</p>
        )}

        <div className="chat-messages">
          {messages.map((msg, idx) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div
                key={idx}
                className={`chat-bubble ${
                  isMine ? "mine" : "theirs"
                }`}
              >
                {msg.content}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) =>
              e.key === "Enter" && handleSend()
            }
          />
          <button onClick={handleSend}>Send</button>
        </div>
      </main>
    </div>
  );
};

export default StaffChatRoom;
