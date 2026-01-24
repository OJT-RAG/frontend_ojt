import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils.jsx";
import { useI18n } from "../../i18n/i18n.jsx";
import "./ChatPage.scss";
import { useNavigate } from "react-router-dom";
import chatRoomApi from "../API/chatRoomApi.js";
import userApi from "../API/UserAPI.js";
import userChatApi from "../API/UserChatAPI";
import { useAuth } from "../Hook/useAuth.jsx";

import { FileText, Paperclip, Sparkles } from "lucide-react";

const LOCAL_STORAGE_KEY = "ojt-rag-chat-sessions";
const DEFAULT_RAG_BASE = "https://trongnhan312-ojt-rag-bot.hf.space";
const STAFF_FIXED_KEY = "fixed_staff_for_student";

const sanitizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/$/, "");
};

const nowIso = () => new Date().toISOString();

const formatSource = (source) => {
  if (source == null) return { key: "source-null", label: "", href: "" };

  if (typeof source === "string") {
    const trimmed = source.trim();
    const isHttp = /^https?:\/\//i.test(trimmed);
    return { key: trimmed || "source", label: trimmed, href: isHttp ? trimmed : "" };
  }

  if (typeof source === "object") {
    const displayName =
      typeof source.display_name === "string"
        ? source.display_name
        : typeof source.displayName === "string"
        ? source.displayName
        : "";

    const uri =
      typeof source.gcs_uri === "string"
        ? source.gcs_uri
        : typeof source.gcsUri === "string"
        ? source.gcsUri
        : typeof source.url === "string"
        ? source.url
        : "";

    const resourceName =
      typeof source.resource_name === "string"
        ? source.resource_name
        : typeof source.resourceName === "string"
        ? source.resourceName
        : "";

    const label = displayName || uri || resourceName || "source";
    const href = /^https?:\/\//i.test(uri) ? uri : "";
    const key = uri || resourceName || label;
    return { key, label, href };
  }

  const fallback = String(source);
  return { key: fallback, label: fallback, href: "" };
};
const getFixedStaff = (staffList, studentId) => {
  if (!Array.isArray(staffList) || staffList.length === 0) return null;
  if (!studentId) return null;

  const map = JSON.parse(localStorage.getItem(STAFF_FIXED_KEY) || "{}");

  // ✅ đã có staff → dùng lại
  if (map[studentId]) {
    return staffList.find(s => s.userId === map[studentId]) || null;
  }

  // ✅ chưa có → pick round-robin
  const picked = pickStaffRoundRobin(staffList);
  if (!picked) return null;

  map[studentId] = picked.userId;
  localStorage.setItem(STAFF_FIXED_KEY, JSON.stringify(map));

  return picked;
};
const CV_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");


const normalizeMessage = (message) => {
  if (!message || typeof message !== "object") return null;
  const roleRaw = message.role || message.sender;
  const role = roleRaw === "assistant" || roleRaw === "ai" ? "assistant" : "user";
  const text =
    typeof message.text === "string"
      ? message.text
      : typeof message.content === "string"
      ? message.content
      : "";

  return {
    id: message.id || `msg-${Math.random().toString(36).slice(2, 10)}`,
    role,
    text,
    timestamp: message.timestamp || message.ts || nowIso(),
    pending: Boolean(message.pending),
    error: Boolean(message.error),
    sources: Array.isArray(message.sources) ? message.sources : [],
  };
};

const normalizeSession = (session, translate, indexFallback = 1) => {
  if (!session || typeof session !== "object") return null;

  const index = typeof session.index === "number" ? session.index : indexFallback;
  const defaultTitle = getSessionTitle(translate, index);
  const messages = Array.isArray(session.messages)
    ? session.messages.map((item) => normalizeMessage(item)).filter(Boolean)
    : [];

  const createdAt = session.createdAt || session.updatedAt || messages[0]?.timestamp || nowIso();
  const updatedAt = session.updatedAt || messages[messages.length - 1]?.timestamp || createdAt;

  return {
    id: String(session.id || session.sessionId || `local-${Math.random().toString(36).slice(2, 10)}`),
    title:
      typeof session.title === "string" && session.title.trim().length > 0
        ? session.title.trim()
        : defaultTitle,
    messages,
    createdAt,
    updatedAt,
    origin: session.origin || "local",
    remoteId: session.remoteId || session.sessionId || null,
    type: session.type,
  staffId: session.staffId,
  };
};
  
const getSessionTitle = (translate, index = 1) => {
  const template = translate?.("chat_session_title_template");
  if (typeof template === "string" && template.length > 0) {
    const result = template.replace(/\{\{\s*index\s*\}\}/gi, String(index));
    if (!result.includes("{{") && result.trim().length > 0) {
      return result.trim();
    }
    if (template.trim().length > 0 && !template.includes("{{")) {
      return template.trim();
    }
  }
  return `Session ${index}`;
};

const createLocalSession = (translate, index = 1) => {
  const createdAt = nowIso();
  return {
    id: `local-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    title: getSessionTitle(translate, index),
    createdAt,
    updatedAt: createdAt,
    messages: [],
    origin: "local",
    type: "ai", // ✅ ADD
    remoteId: null,
  };
};
const STAFF_RR_KEY = "staff_round_robin_index";

const pickStaffRoundRobin = (staffList) => {
  if (!Array.isArray(staffList) || staffList.length === 0) return null;

  const rawIndex = Number(localStorage.getItem(STAFF_RR_KEY) || 0);
  const index = rawIndex % staffList.length;

  const picked = staffList[index];

  localStorage.setItem(STAFF_RR_KEY, String(index + 1));

  return picked;
};

const loadStoredSessions = (translate, storageKey = LOCAL_STORAGE_KEY) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, idx) => normalizeSession(item, translate, idx + 1))
      .filter(Boolean);
  } catch (error) {
    console.warn("Unable to read stored chat sessions", error);
    return [];
  }
};

const prepareHistorySessions = (payload, translate) => {
  if (!payload) return [];

  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.history)
    ? payload.history
    : Array.isArray(payload.sessions)
    ? payload.sessions
    : [];

  if (!entries.length) return [];

  const sessionMap = new Map();

  const ensureSession = (identifier) => {
    const key = identifier ? String(identifier) : `remote-${sessionMap.size + 1}`;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        id: key,
        remoteId: key,
        origin: "remote",
        messages: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
        title: getSessionTitle(translate, sessionMap.size + 1),
      });
    }
    return sessionMap.get(key);
  };

  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const sessionId = entry.sessionId || entry.session_id || entry.id || entry.session;
    const targetSession = ensureSession(sessionId);

    const normalizeHistoryMessage = (message) => {
      const normalized = normalizeMessage(message);
      if (!normalized) return null;
      if (!normalized.timestamp && entry.created_at) {
        normalized.timestamp = entry.created_at;
      }
      return normalized;
    };

    if (Array.isArray(entry.messages)) {
      entry.messages.forEach((msg) => {
        const normalized = normalizeHistoryMessage(msg);
        if (normalized) {
          targetSession.messages.push(normalized);
        }
      });
    } else {
      if (entry.question) {
        targetSession.messages.push(
          normalizeHistoryMessage({
            id: entry.questionId || `q-${Math.random().toString(36).slice(2, 10)}`,
            role: "user",
            text: entry.question,
            timestamp: entry.created_at || entry.timestamp || nowIso(),
          })
        );
      }
      if (entry.answer || entry.response) {
        targetSession.messages.push(
          normalizeHistoryMessage({
            id: entry.answerId || `a-${Math.random().toString(36).slice(2, 10)}`,
            role: "assistant",
            text: entry.answer || entry.response,
            timestamp: entry.updated_at || entry.timestamp || nowIso(),
          })
        );
      }
    }

    const createdAt = entry.created_at || entry.createdAt || targetSession.messages[0]?.timestamp || targetSession.createdAt;
    const updatedAt = entry.updated_at || entry.updatedAt || targetSession.messages[targetSession.messages.length - 1]?.timestamp || createdAt;

    targetSession.createdAt = createdAt;
    targetSession.updatedAt = updatedAt;

    if (typeof entry.title === "string" && entry.title.trim().length > 0) {
      targetSession.title = entry.title.trim();
    }
  });

  return Array.from(sessionMap.values()).map((session, index) => ({
    ...session,
    title:
      session.title && session.title.length > 0
        ? session.title
        : getSessionTitle(translate, index + 1),
  }));
};

const mergeSessions = (existingSessions, incomingSessions) => {
  if (!incomingSessions.length) return existingSessions;

  const existingMap = new Map(existingSessions.map((session) => [session.id, session]));
  const incomingIds = new Set(incomingSessions.map((session) => session.id));

  const mergedIncoming = incomingSessions.map((incoming) => {
    const current = existingMap.get(incoming.id);
    if (!current) return incoming;

    const existingMessageIds = new Set(incoming.messages.map((message) => message.id));
    const additionalMessages = current.messages.filter(
      (message) => !existingMessageIds.has(message.id)
    );

    const messages = [...incoming.messages, ...additionalMessages];
    const updatedAtCandidate = messages[messages.length - 1]?.timestamp || incoming.updatedAt;

    return {
      ...incoming,
      messages,
      updatedAt: updatedAtCandidate || incoming.updatedAt,
    };
  });

  const remainingExisting = existingSessions.filter((session) => !incomingIds.has(session.id));
  const combined = [...mergedIncoming, ...remainingExisting];

  return combined.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
};

const interpretStatus = (payload) => {
  const raw =
    typeof payload === "string"
      ? payload
      : (payload?.status || payload?.state || payload?.message || "").toString();
  const normalized = raw.trim().toLowerCase();

  if (["ok", "ready", "running", "online", "healthy"].includes(normalized)) {
    return "online";
  }

  if (["offline", "error", "failed", "unhealthy"].includes(normalized)) {
    return "offline";
  }

  return "unknown";
};

const buildNetworkHint = (error, url) => {
  const message = (error?.message || "").toLowerCase();
  const isAbort = error?.name === "AbortError";

  if (isAbort) {
    return "Request timed out. The RAG server may be slow/unreachable.";
  }

  // Browsers usually return TypeError: Failed to fetch for CORS/network failures.
  if (error instanceof TypeError || message.includes("failed to fetch") || message.includes("networkerror")) {
    return (
      "Network/CORS blocked the request. " +
      `Check the browser Console/Network tab for CORS errors. URL: ${url}`
    );
  }

  return "";
};

const fetchWithTimeout = async (url, options, timeoutMs = 60_000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const ChatPage = () => {
  const { t } = useI18n();
  const initialSessionsRef = useRef(null);
  const lastStorageKeyRef = useRef(null);
  const cvInputRef = useRef(null);
  const navigate = useNavigate();
  const { authUser, role: authRole } = useAuth();

  const currentUser = authUser;
  const currentUserId = currentUser
    ? Number(currentUser.userId ?? currentUser.id)
    : null;

  const currentUserRole = useMemo(() => {
    const fromContext = typeof authRole === "string" ? authRole.toLowerCase() : "";
    const fromUser = typeof currentUser?.role === "string" ? currentUser.role.toLowerCase() : "";
    return fromContext || fromUser || "";
  }, [authRole, currentUser]);

  const storageKey = useMemo(
    () => `${LOCAL_STORAGE_KEY}:${currentUserId ?? "guest"}`,
    [currentUserId]
  );

  // Only students can chat with staff (admin/company must not).
  const canChatWithStaff = currentUserRole === "student";

  if (initialSessionsRef.current === null) {
    const stored = loadStoredSessions(t, storageKey);
    initialSessionsRef.current = stored.length > 0 ? stored : [createLocalSession(t, 1)];
    lastStorageKeyRef.current = storageKey;
  }

  const [sessions, setSessions] = useState(initialSessionsRef.current);
  const createStaffSession = (staff) => {
  const staffUserId = Number(staff?.userId ?? staff?.id);

  if (!staffUserId) {
    console.error("❌ STAFF OBJECT INVALID", staff);
    return null;
  }

  return {
    id: `staff-${staffUserId}`,
    remoteId: `staff-${staffUserId}`,
    staffId: staffUserId,          // 🔥 QUAN TRỌNG
    title: `Chat with ${staff.fullname || staff.email}`,
    type: "staff",
    origin: "staff",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};


  const [activeSessionId, setActiveSessionId] = useState(
    initialSessionsRef.current[0]?.id || null
  );

  useEffect(() => {
    if (canChatWithStaff) return;

    setSessions((prev) => {
      const filtered = prev.filter((s) => s?.type !== "staff");

      if (filtered.length === 0) {
        const next = createLocalSession(t, 1);
        setActiveSessionId(next.id);
        return [next];
      }

      if (activeSessionId && !filtered.some((s) => s.id === activeSessionId)) {
        setActiveSessionId(filtered[0].id);
      }

      return filtered;
    });
  }, [canChatWithStaff, activeSessionId, t]);

  const handleIncomingStaffMessage = useCallback(
  (message) => {
    console.log("📨 SignalR incoming:", message);

    if (!message?.senderId || !message?.receiverId) return;

    setSessions(prev => {
      let targetSessionId = null;

      const updated = prev.map(session => {
        if (session.type !== "staff") return session;

        const staffId = session.staffId;
        const isRelated =
          (message.senderId === currentUserId &&
            message.receiverId === staffId) ||
          (message.senderId === staffId &&
            message.receiverId === currentUserId);

        if (!isRelated) return session;

        targetSessionId = session.id;

        if (session.messages.some(m => m.id === message.id)) {
          return session;
        }

        const newMsg = {
          id: message.id,
          role: message.senderId === currentUserId ? "user" : "assistant",
          text: message.content,
          timestamp: message.createdAt || nowIso(),
        };

        return {
          ...session,
          messages: [...session.messages, newMsg],
          updatedAt: newMsg.timestamp,
        };
      });

      // 🔥 AUTO OPEN SESSION IF NOT ACTIVE
      if (targetSessionId && targetSessionId !== activeSessionId) {
        setActiveSessionId(targetSessionId);
      }

      return updated;
    });
  },
  [currentUserId, activeSessionId]
);


// useChatHub(currentUserId, handleIncomingStaffMessage);
  const [inputValue, setInputValue] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState("");
  const [appConfig, setAppConfig] = useState(null);

  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("no-scroll");
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch (error) {
      console.warn("Unable to persist chat sessions", error);
    }
  }, [sessions, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    if (lastStorageKeyRef.current === storageKey) return;

    const stored = loadStoredSessions(t, storageKey);
    const nextSessions = stored.length > 0 ? stored : [createLocalSession(t, 1)];

    lastStorageKeyRef.current = storageKey;
    setSessions(nextSessions);
    setActiveSessionId(nextSessions[0]?.id || null);
  }, [storageKey, t]);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const response = await fetch("/app-config.json", { cache: "no-store" });
        if (!response.ok) return;
        const json = await response.json();
        if (isMounted) {
          setAppConfig(json || {});
        }
      } catch (error) {
        if (isMounted) {
          setAppConfig({});
        }
      }
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const ragBaseUrl = useMemo(() => {
    const env = process.env.REACT_APP_RAG_API_BASE_URL;
    const runtime = appConfig?.ragApiBaseUrl;
    return sanitizeBaseUrl(env || runtime || DEFAULT_RAG_BASE);
  }, [appConfig]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const isStaffSession = activeSession?.type === "staff";
  const hasStaffSession = useMemo(
  () => sessions.some(s => s.type === "staff"),
  [sessions]
);
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const scrollToBottom = useCallback(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, sessions, activeSessionId, sending]);
  const [staffList, setStaffList] = useState([]);

useEffect(() => {
  if (!canChatWithStaff) {
    setStaffList([]);
    return;
  }
  const loadStaff = async () => {
    try {
      const res = await userApi.getAll();
      const data = res?.data?.data || res?.data || [];

      const staffs = data.filter(u => u.role === "cro_staff");
      setStaffList(staffs);
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  };

  loadStaff();
}, [canChatWithStaff]);

useEffect(() => {
  if (!canChatWithStaff) return;
  if (!currentUserId) return;
  if (staffList.length === 0) return;

  // ✅ đã có staff session thì thôi
  const hasStaffSession = sessions.some(s => s.type === "staff");
  if (hasStaffSession) return;

  const staff = getFixedStaff(staffList, currentUserId);
  if (!staff) return;

  const session = createStaffSession(staff);
  if (!session) return;

  setSessions(prev => [session, ...prev]);
  setActiveSessionId(session.id);
}, [staffList, currentUserId, canChatWithStaff]);
  const handleCreateSession = () => {
    setLastError("");
    const nextSession = createLocalSession(t, sessions.length + 1);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
  };

  const resolveRemoteSessionId = (session) => {
    const raw = session?.remoteId ?? session?.id;
    if (raw == null) return null;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  };

  const handleDeleteSession = useCallback(
    async (session) => {
      if (!session) return;

      const confirmText =
        (typeof t === "function" && t("chat_confirm_delete_session")) ||
        "Delete this session?";

      if (typeof window !== "undefined" && !window.confirm(confirmText)) {
        return;
      }

      const isRemote = session.origin === "remote";
      const remoteSessionId = resolveRemoteSessionId(session);

      try {
        if (isRemote && remoteSessionId != null) {
          await chatRoomApi.delete(remoteSessionId);
        }

        setSessions((prev) => {
          const remaining = prev.filter((s) => s.id !== session.id);
          if (remaining.length === 0) {
            const next = createLocalSession(t, 1);
            setActiveSessionId(next.id);
            return [next];
          }

          if (activeSessionId === session.id) {
            setActiveSessionId(remaining[0].id);
          }

          return remaining;
        });
        setLastError("");
      } catch (error) {
        console.error("Failed to delete session", error);
        const message =
          error?.message
            ? `${(typeof t === "function" && t("chat_delete_failed")) || "Delete failed"} (${error.message})`
            : (typeof t === "function" && t("chat_delete_failed")) || "Delete failed";
        setLastError(message);
      }
    },
    [activeSessionId, t]
  );

  const suggestedQuestions = useMemo(() => {
    const suggestions = t("chat_suggestions");
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      return suggestions;
    }
    return [
      "What are the GPA requirements for OJT?",
      "How do I apply for an internship?",
      "What documents do I need for OJT registration?",
      "When is the OJT application deadline?",
    ];
  }, [t]);

  const clearCvFile = useCallback(() => {
    setCvFile(null);
    if (cvInputRef.current) {
      cvInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (!isStaffSession) return;
    if (cvFile) clearCvFile();
  }, [isStaffSession, cvFile, clearCvFile]);

  const handleCvFileChange = useCallback((event) => {
    const file = event?.target?.files?.[0] || null;
    if (!file) {
      setCvFile(null);
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      setLastError(
        (typeof t === "function" && t("chat_cv_file_too_large")) ||
          "CV file is too large (max 10MB)."
      );
      if (cvInputRef.current) {
        cvInputRef.current.value = "";
      }
      return;
    }

    setLastError("");
    setCvFile(file);
  }, [t]);
  useEffect(() => {
  if (!activeSession || activeSession.type !== "staff" || !activeSession.staffId) return;
  if (!canChatWithStaff) return;

  // load lần đầu
  loadStaffConversation(activeSession);

const staffId = activeSession.staffId;
  const sessionId = activeSession.id;

  const timer = setInterval(() => {
    loadStaffConversation({
      id: sessionId,
      staffId,
    });
  }, 3000);
  return () => clearInterval(timer);
}, [activeSessionId, activeSession?.staffId]);

  const loadStaffConversation = async (session) => {
  if (!canChatWithStaff) return;
  if (!currentUserId || !session?.staffId) return;

  try {
    const res = await userChatApi.getConversation(
      currentUserId,
      session.staffId
    );

    const data = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.data)
      ? res.data.data
      : [];

    setSessions(prev =>
      prev.map(s => {
        if (s.id !== session.id) return s;

        const existingIds = new Set(s.messages.map(m => m.id));
        const newMessages = data
          .map(m => ({
            id: m.id,
            role: m.senderId === currentUserId ? "user" : "assistant",
            text: m.content,
            timestamp: m.createdAt || m.timestamp,
          }))
          .filter(m => !existingIds.has(m.id));

        if (newMessages.length === 0) return s;

        return {
          ...s,
          messages: [...s.messages, ...newMessages],
          updatedAt: newMessages[newMessages.length - 1].timestamp,
        };
      })
    );
  } catch (err) {
    console.error("❌ Load staff conversation failed", err);
  }
};

const sendStaffMessage = async (session) => {
  if (!canChatWithStaff) {
    setLastError("Staff chat is only available for students");
    return;
  }
  console.log("🧪 sendStaffMessage debug", {
  currentUserId,
  session,
  staffId: session?.staffId,
});

  if (!inputValue.trim()) return;

  if (!currentUserId || !session?.staffId) {
    setLastError("Missing sender or receiver");
    return;
  }

  const payload = {
    senderId: currentUserId,
    receiverId: Number(session.staffId),
    content: inputValue.trim(),
  };

  console.log("📤 STAFF PAYLOAD", payload);

  
  setInputValue("");



  try {
    await userChatApi.sendMessage(payload);
  } catch (err) {
    console.error("❌ Staff send failed", err);
    setLastError("Send message failed");
  }
};



  const handleSend = useCallback(async () => {
     const currentSession = sessions.find(s => s.id === activeSessionId);

  // ✅ HARD BLOCK AI IF STAFF CHAT
  if (currentSession?.type === "staff") {
  if (!canChatWithStaff) {
    setLastError("Staff chat is only available for students");
    return;
  }

  if (!inputValue.trim()) {
    setLastError("Please enter a message");
    return;
  }

  await sendStaffMessage(currentSession);
  return; // ✅ chỉ return cho staff flow
}
    if (sending) return;
    const text = inputValue.trim();

    const defaultCvPrompt =
      (typeof t === "function" && t("chat_cv_default_prompt")) ||
      "Please review my CV and suggest improvements and suitable internship positions.";

    const question = text || (cvFile ? defaultCvPrompt : "");
    if (!question) return;

    setInputValue("");
    setLastError("");

    let sessionId = activeSessionId;
    setSending(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: cvFile && !text ? `${question}\n(CV: ${cvFile.name})` : question,
      timestamp: nowIso(),
    };
    setSessions((prev) => {
      let updatedSessionId = sessionId;
      let updatedSessions;

      const existing = updatedSessionId
        ? prev.find((session) => session.id === updatedSessionId)
        : undefined;

      if (!existing) {
        const newSession = createLocalSession(t, prev.length + 1);
        newSession.messages = [userMessage];
        newSession.updatedAt = userMessage.timestamp;
        updatedSessionId = newSession.id;
        updatedSessions = [newSession, ...prev];
      } else {
        updatedSessions = prev.map((session) =>
          session.id === updatedSessionId
            ? {
                ...session,
                messages: [...session.messages, userMessage],
                updatedAt: userMessage.timestamp,
              }
            : session
        );
      }

      sessionId = updatedSessionId;
      return updatedSessions;
    });

    setActiveSessionId((prevId) => prevId || sessionId);

    if (!ragBaseUrl) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [
                  ...session.messages,
                  {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    text: t("chat_status_error"),
                    timestamp: nowIso(),
                    error: true,
                  },
                ],
                updatedAt: nowIso(),
              }
            : session
        )
      );
      setLastError(t("chat_status_error"));
      setSending(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("question", question);
      // Keep session_id for backward compatibility with existing history behavior.
      formData.append("session_id", String(sessionId));
      if (cvFile) {
        formData.append("file", cvFile);
      }
      if (currentSession?.type === "staff") {
  throw new Error("Staff session must not call AI");
}
      const chatUrl = `${ragBaseUrl}/chat`;
      console.groupCollapsed("[ChatPage] POST /chat");
      console.log({
        chatUrl,
        origin: typeof window !== "undefined" ? window.location.origin : "(server)",
        hasFile: !!cvFile,
        questionLength: question.length,
        sessionId,
      });

      const response = await fetchWithTimeout(chatUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";
      let payload = null;
      if (contentType.includes("application/json")) {
        payload = await response.json().catch(async () => {
          const text = await response.text().catch(() => "");
          return text;
        });
      } else {
        payload = await response.text();
      }

      console.log({
        status: response.status,
        ok: response.ok,
        contentType,
        payloadPreview: typeof payload === "string" ? payload.slice(0, 300) : payload,
      });

      if (!response.ok) {
        console.error("Chat request failed", {
          url: chatUrl,
          status: response.status,
          statusText: response.statusText,
          payload,
        });
        console.groupEnd();
        throw new Error(
          typeof payload === "string"
            ? payload
            : payload?.message || payload?.error || `HTTP ${response.status}`
        );
      }

      const answer =
        typeof payload === "string"
          ? payload
          : payload?.answer || payload?.response || payload?.content || payload?.data || "";

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: answer && answer.length > 0 ? answer : t("chat_message_failed"),
        timestamp: nowIso(),
        sources: Array.isArray(payload?.sources) ? payload.sources : [],
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [...session.messages, assistantMessage],
                updatedAt: assistantMessage.timestamp,
              }
            : session
        )
      );

      // Clear CV after a successful send to avoid re-uploading by accident.
      if (cvFile) {
        clearCvFile();
      }

      console.groupEnd();
    } catch (error) {
      const chatUrl = `${ragBaseUrl}/chat`;
      const hint = buildNetworkHint(error, chatUrl);
      console.error("[ChatPage] Chat request failed", {
        chatUrl,
        origin: typeof window !== "undefined" ? window.location.origin : "(server)",
        error,
        hint,
      });
      try {
        console.groupEnd();
      } catch {
        // ignore
      }

      const message = hint || error?.message || t("chat_message_failed");
      setLastError(message);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [
                  ...session.messages,
                  {
                    id: `assistant-error-${Date.now()}`,
                    role: "assistant",
                    text: `${t("chat_message_failed")}\n${message}`,
                    timestamp: nowIso(),
                    error: true,
                  },
                ],
                updatedAt: nowIso(),
              }
            : session
        )
      );
    } finally {
      setSending(false);
    }
  }, [sending, inputValue, activeSessionId, ragBaseUrl, t, cvFile, clearCvFile, sendStaffMessage, canChatWithStaff, sessions]);

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setLastError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  const modelModeLabel = useMemo(() => {
    if (cvFile) {
      return (typeof t === "function" && t("chat_model_cv")) || "Model: CV Analysis Mode";
    }
    return (typeof t === "function" && t("chat_model_rag")) || "Model: RAG Mode";
  }, [cvFile, t]);

  const visibleSessions = useMemo(() => {
    return canChatWithStaff ? sessions : sessions.filter((s) => s?.type !== "staff");
  }, [canChatWithStaff, sessions]);

  return (
    <div className="chatpage-root">
      <div className="chatpage-shell">
        <aside className="chatpage-sidebar" aria-label="Chat sessions">
          <div className="sidebar-header">
            <button className="new-session-btn" onClick={handleCreateSession} type="button">
              {t("chat_new_session")}
            </button>
            {canChatWithStaff && (
              <button
  className="staff-chat-btn"
  type="button"
  disabled={hasStaffSession}   // ✅ BLOCK Ở ĐÂY
  onClick={() => {
    if (hasStaffSession) return; // ✅ CHỐT HẠ
    
    const staff = getFixedStaff(staffList, currentUserId);
    if (!staff) {
      setLastError("No staff available");
      return;
    }

    const session = createStaffSession(staff);
    if (!session) return;

    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
  }}
>
  {hasStaffSession ? "Staff chat already created" : "Chat with staff"}
</button>
            )}
          </div>
          <div className="session-list">
            {visibleSessions.map((session, index) => {
              const displayTitle =
  session.type === "staff"
    ? session.title
    : session.origin === "local"
    ? getSessionTitle(t, index + 1)
    : session.title || getSessionTitle(t, index + 1);

              return (
                <div key={session.id} className="session-row">
                  <button
                    type="button"
                    className={cn(
                      "session-item",
                      session.id === activeSessionId && "active",
                      session.origin === "remote" && "session-remote"
                    )}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setLastError("");
                    }}
                  >
                    <span className="session-title">{displayTitle}</span>
                    <span className="session-meta">{session.messages.length}</span>
                  </button>

                  <button
                    type="button"
                    className="session-delete"
                    onClick={() => handleDeleteSession(session)}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="chatpage-main">
          <header className="chatpage-main-header">
            <div className="chatpage-main-heading">
              <h1>{t("chat_ask_anything")}</h1>
              <p>{t("chat_sub")}</p>
            </div>
          </header>

          <div className="chatpage-messages" ref={chatScrollRef} aria-live="polite">
            {(!activeSession || activeSession.messages.length === 0) && (
              <div className="chatpage-empty">
                <p>
                  {isStaffSession
                    ? "No messages yet. Start your conversation with staff."
                    : t("chat_empty_state")}
                </p>

                {!isStaffSession && (
                  <div className="chatpage-suggestions">
                    {suggestedQuestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion}-${index}`}
                        type="button"
                        className="suggestion-btn"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSession?.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "chat-bubble",
                  message.role === "user" ? "user" : "ai",
                  message.error && "error",
                  message.pending && "pending"
                )}
              >
                <pre>{message.text}</pre>
                {message.sources && message.sources.length > 0 && (
                  <ul className="chat-sources">
                    {message.sources.map((source, index) => {
                      const info = formatSource(source);
                      return (
                        <li key={`${message.id}-source-${info.key}-${index}`}>
                          {info.href ? (
                            <a href={info.href} target="_blank" rel="noreferrer">
                              {info.label}
                            </a>
                          ) : (
                            <span>{info.label}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}

            {sending && (
              <div className="chat-bubble ai pending">
                <span className="typing-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {lastError && (
            <div className="chatpage-error" role="alert">
              {lastError}
            </div>
          )}

          <form className="chatpage-input" onSubmit={handleSubmit}>
            {!isStaffSession && (
              <>
                <div className="chatpage-file-row">
                  <input
                    ref={cvInputRef}
                    className="chatpage-file-input"
                    type="file"
                    accept={CV_ACCEPT}
                    onChange={handleCvFileChange}
                    disabled={sending}
                  />

                  <button
                    type="button"
                    className="attach-btn"
                    onClick={() => cvInputRef.current?.click()}
                    disabled={sending}
                  >
                    <Paperclip className="attach-icon" aria-hidden="true" />
                    <span className="attach-label">
                      {(typeof t === "function" && t("chat_attach_cv")) || "Import File"}
                    </span>
                  </button>

                  {cvFile && (
                    <div className="file-chip" title={cvFile.name}>
                      <span className="file-name">{cvFile.name}</span>
                      <button
                        type="button"
                        className="file-remove"
                        onClick={clearCvFile}
                        disabled={sending}
                        aria-label="Remove attached CV"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={cn("chatpage-model-badge", cvFile ? "is-cv" : "is-rag")}
                  role="note"
                  aria-label={modelModeLabel}
                  title={modelModeLabel}
                >
                  <span className="model-icon" aria-hidden="true">
                    {cvFile ? <FileText size={16} /> : <Sparkles size={16} />}
                  </span>
                  <span className="model-text">{modelModeLabel}</span>
                </div>
              </>
            )}

            <div className="chatpage-input-row">
              <input
                type="text"
                value={inputValue}
                placeholder={t("chat_placeholder")}
                onChange={(event) => setInputValue(event.target.value)}
                disabled={sending}
              />
              <button
                className="send-btn"
                type="submit"
                disabled={sending || (inputValue.trim().length === 0 && !cvFile)}
              >
                {sending ? t("chat_sending_state") : t("chat_send_button")}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default ChatPage;
