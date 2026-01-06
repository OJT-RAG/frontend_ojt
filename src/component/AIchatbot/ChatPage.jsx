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

const LOCAL_STORAGE_KEY = "ojt-rag-chat-sessions";
const DEFAULT_RAG_BASE = "https://ojt-rag-python.onrender.com";

const sanitizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/$/, "");
};

const nowIso = () => new Date().toISOString();


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
    remoteId: null,
  };
};

const loadStoredSessions = (translate) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
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

const ChatPage = () => {
  const { t } = useI18n();
  const initialSessionsRef = useRef(null);

  if (initialSessionsRef.current === null) {
    const stored = loadStoredSessions(t);
    initialSessionsRef.current = stored.length > 0 ? stored : [createLocalSession(t, 1)];
  }

  const [sessions, setSessions] = useState(initialSessionsRef.current);
  const [activeSessionId, setActiveSessionId] = useState(
    initialSessionsRef.current[0]?.id || null
  );
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({ state: "checking", lastChecked: null });
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
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.warn("Unable to persist chat sessions", error);
    }
  }, [sessions]);

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

  useEffect(() => {
    if (!ragBaseUrl) return;

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${ragBaseUrl}/status`, {
          headers: { Accept: "application/json" },
        });
        let payload = null;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          payload = await response.json();
        } else {
          const text = await response.text();
          payload = text;
        }
        if (!cancelled) {
          setServiceStatus({
            state: interpretStatus(payload),
            lastChecked: nowIso(),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setServiceStatus({ state: "offline", lastChecked: nowIso(), error: error.message });
        }
      }
    };

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(`${ragBaseUrl}/history`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          const text = await response.text();
          console.error("History request failed", {
            url: `${ragBaseUrl}/history`,
            status: response.status,
            statusText: response.statusText,
            body: text,
          });
          throw new Error(`HTTP ${response.status}`);
        }
        let payload = null;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          payload = await response.json();
        } else {
          const text = await response.text();
          try {
            payload = JSON.parse(text);
          } catch (error) {
            payload = null;
          }
        }
        const historySessions = prepareHistorySessions(payload, t);
        if (!cancelled && historySessions.length > 0) {
          setSessions((prev) => mergeSessions(prev, historySessions));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load chat history", error);
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    };

    fetchStatus();
    fetchHistory();

    const interval = setInterval(fetchStatus, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ragBaseUrl, t]);

  const refreshHistory = useCallback(async () => {
    if (!ragBaseUrl) return;
    setLoadingHistory(true);
    try {
      const response = await fetch(`${ragBaseUrl}/history`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let payload = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        const text = await response.text();
        try {
          payload = JSON.parse(text);
        } catch (error) {
          payload = null;
        }
      }
      const historySessions = prepareHistorySessions(payload, t);
      if (historySessions.length > 0) {
        setSessions((prev) => mergeSessions(prev, historySessions));
      }
      setLastError("");
    } catch (error) {
      console.error("Failed to refresh chat history", error);
      const message = error?.message ? `${t("chat_message_failed")} (${error.message})` : t("chat_message_failed");
      setLastError(message);
    } finally {
      setLoadingHistory(false);
    }
  }, [ragBaseUrl, t]);

  const handleCreateSession = () => {
    setLastError("");
    const nextSession = createLocalSession(t, sessions.length + 1);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
  };

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

  const handleSend = useCallback(async () => {
    if (sending) return;
    const text = inputValue.trim();
    if (!text) return;

    setInputValue("");
    setLastError("");

    let sessionId = activeSessionId;
    setSending(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
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
      const response = await fetch(`${ragBaseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          question: text,
          session_id: sessionId,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      let payload = null;
      if (contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        payload = await response.text();
      }

      if (!response.ok) {
        console.error("Chat request failed", {
          url: `${ragBaseUrl}/chat`,
          status: response.status,
          statusText: response.statusText,
          payload,
        });
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
    } catch (error) {
      console.error("Chat request failed", error);
      const message = error?.message || t("chat_message_failed");
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
  }, [sending, inputValue, activeSessionId, ragBaseUrl, t]);

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setLastError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  const statusLabel =
    serviceStatus.state === "online"
      ? t("chat_status_ready")
      : serviceStatus.state === "offline"
      ? t("chat_status_error")
      : t("chat_service_checking");

  return (
    <div className="chatpage-root">
      <div className="chatpage-shell">
        <aside className="chatpage-sidebar" aria-label="Chat sessions">
          <div className="sidebar-header">
            <button className="new-session-btn" onClick={handleCreateSession} type="button">
              {t("chat_new_session")}
            </button>
            <button
              className="refresh-history-btn"
              onClick={refreshHistory}
              type="button"
              disabled={loadingHistory}
            >
              {loadingHistory ? t("chat_loading_history") : t("chat_history_refresh")}
            </button>
          </div>

          <div className="session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
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
                <span className="session-title">{session.title || t("chat_session_untitled")}</span>
                <span className="session-meta">{session.messages.length}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="chatpage-main">
          <header className="chatpage-main-header">
            <div className="chatpage-main-heading">
              <h1>{t("chat_ask_anything")}</h1>
              <p>{t("chat_sub")}</p>
            </div>
            <div
              className={cn(
                "chatpage-status",
                serviceStatus.state === "online" && "is-online",
                serviceStatus.state === "offline" && "is-offline"
              )}
              role="status"
              aria-live="polite"
            >
              <span className={cn("status-indicator", `status-${serviceStatus.state}`)} />
              <span>{statusLabel}</span>
            </div>
          </header>

          <div className="chatpage-messages" ref={chatScrollRef} aria-live="polite">
            {loadingHistory && (
              <div className="chatpage-loading">
                <span>{t("chat_loading_history")}</span>
              </div>
            )}

            {!loadingHistory && (!activeSession || activeSession.messages.length === 0) && (
              <div className="chatpage-empty">
                <p>{t("chat_empty_state")}</p>
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
                    {message.sources.map((source, index) => (
                      <li key={`${message.id}-source-${index}`}>{source}</li>
                    ))}
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
            <input
              type="text"
              value={inputValue}
              placeholder={t("chat_placeholder")}
              onChange={(event) => setInputValue(event.target.value)}
              disabled={sending}
            />
            <button type="submit" disabled={sending || inputValue.trim().length === 0}>
              {sending ? t("chat_sending_state") : t("chat_send_button")}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default ChatPage;
