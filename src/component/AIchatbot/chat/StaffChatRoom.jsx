import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import userChatApi from "../../API/UserChatAPI.js";
import useChatHub from "../../Hook/useChathub.js";
import "./StaffChatRoom.scss";

const POLL_INTERVAL = 3000; // Fallback polling every 3 seconds

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
  const [signalRActive, setSignalRActive] = useState(false);

  const bottomRef = useRef(null);
  const prevCountRef = useRef(0);
  const lastMessageIdRef = useRef(null);

  /* =======================
     📡 SIGNALR REALTIME
  ======================= */
  const handleIncomingMessage = (message) => {
    console.log("📨 SignalR message received:", message);
    setSignalRActive(true); // Mark SignalR as working

    const otherUserId = Number(staffId);

    const isRelated =
      (message.senderId === currentUserId &&
        message.receiverId === otherUserId) ||
      (message.senderId === otherUserId &&
        message.receiverId === currentUserId);

    console.log("🔍 Message relevance check:", {
      isRelated,
      messageSenderId: message.senderId,
      messageReceiverId: message.receiverId,
      currentUserId,
      otherUserId,
    });

    if (!isRelated) {
      console.log("❌ Message not for this conversation");
      return;
    }

    console.log("✅ Adding message to state via SignalR");

    setMessages((prev) => {
      // Prevent duplicates
      const exists = prev.some(
        (m) =>
          m.id === message.id ||
          (m.content === message.content &&
            m.senderId === message.senderId &&
            Math.abs(new Date(m.timestamp || m.createdAt) - new Date(message.timestamp || message.createdAt)) < 1000)
      );

      if (exists) {
        console.log("⚠️ Duplicate message, skipping");
        return prev;
      }

      return [...prev, message];
    });
  };

  useChatHub(currentUserId, handleIncomingMessage);

  /* =======================
     🚀 INIT + POLLING
  ======================= */
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

    // Initial load
    loadConversation();

    // 🔄 Fallback polling (in case SignalR fails)
    const pollTimer = setInterval(() => {
      if (!signalRActive) {
        console.log("🔄 Polling fallback (SignalR inactive)");
        loadConversation(true); // Silent reload
      } else {
        console.log("✅ SignalR active, skipping poll");
      }
    }, POLL_INTERVAL);

    // Reset SignalR status every 10 seconds to re-check
    const resetTimer = setInterval(() => {
      setSignalRActive(false);
    }, 10000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(resetTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  /* =======================
     📥 LOAD CHAT
  ======================= */
  const loadConversation = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError("");
      }

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

      console.log("📨 Messages loaded:", data.length);

      // Only update if there are actual changes
      setMessages((prev) => {
        const lastId = data[data.length - 1]?.id;
        if (lastId === lastMessageIdRef.current) {
          console.log("⏭️ No new messages, skipping update");
          return prev;
        }
        lastMessageIdRef.current = lastId;
        return data;
      });
    } catch (err) {
      console.error(
        "❌ Load conversation failed:",
        err.response?.data || err
      );
      if (!silent) {
        setError("Failed to load conversation");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  /* =======================
     ⬇️ AUTO SCROLL (SMART)
  ======================= */
  useEffect(() => {
    // Only scroll if new messages arrived
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  /* =======================
     📤 SEND MESSAGE
  ======================= */
  const handleSend = async () => {
    if (!input.trim()) return;

    const payload = {
      senderId: currentUserId,
      receiverId: Number(staffId),
      content: input.trim(),
    };

    console.log("📤 SEND PAYLOAD:", payload);

    const tempMessage = {
      id: `temp-${Date.now()}`,
      ...payload,
      timestamp: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, tempMessage]);
    setInput("");

    try {
      await userChatApi.sendMessage(payload);
      console.log("✅ Message sent successfully");

      // SignalR should add the real message, or polling will catch it
      // Remove temp message after 2 seconds if real one arrives
      setTimeout(() => {
        setMessages((prev) =>
          prev.filter((m) => !m.id?.toString().startsWith("temp-"))
        );
      }, 2000);
    } catch (err) {
      console.error(
        "❌ Send message failed:",
        err.response?.data || err
      );

      // Remove optimistic message on failure
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempMessage.id)
      );

      alert("Send message failed – check console");
    }
  };

  /* =======================
     🖼️ UI
  ======================= */
  return (
    <div className="staff-chatroom-root">
      <div className="staff-chatroom-shell">
        <main className="staff-chatroom-main">
          <header className="staff-chatroom-header">
            <button onClick={() => navigate(-1)}>← Back</button>
            <div className="connection-status">
              {signalRActive ? "🟢 Real-time" : "🟡 Polling"}
            </div>
          </header>

          {loading && (
            <div className="chatpage-loading">
              <p>Loading messages...</p>
            </div>
          )}

          {!loading && error && (
            <div className="chatpage-error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="chatpage-empty">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}

          <div className="chat-messages">
            {messages.map((msg, idx) => {
              const isMine = msg.senderId === currentUserId;

              return (
                <div
                  key={msg.id || idx}
                  className={`chat-bubble ${isMine ? "mine" : "theirs"}`}
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
    </div>
  );
};

export default StaffChatRoom;