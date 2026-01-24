import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./DocumentManager.scss";
import ojtDocumentApi from "../../API/OjtDocumentAPI";
import semesterApi from "../../API/SemesterAPI";
import { useAuth } from "../../Hook/useAuth";

const DEFAULT_RAG_BASE = "https://trongnhan312-ojt-rag-bot.hf.space";

const sanitizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/$/, "");
};

const DOCUMENT_TAG_OPTIONS = [
  { id: 1, name: "Internship Guide" },
  { id: 2, name: "Company Profile" },
  { id: 3, name: "Project Requirements" },
  { id: 4, name: "Evaluation Form" },
  { id: 5, name: "Technical Documentation" },
  { id: 6, name: "Resume Template" },
];

const getDocumentTagId = (tag) => tag?.documenttagId ?? tag?.documentTagId ?? tag?.id;

const resolveDocumentTagName = (tag) => {
  const name = typeof tag?.name === "string" ? tag.name.trim() : "";
  if (name) return name;
  const tagId = Number(getDocumentTagId(tag));
  const found = DOCUMENT_TAG_OPTIONS.find((item) => item.id === tagId);
  return found?.name || (tagId ? `Tag #${tagId}` : "Tag");
};

const DocumentManager = () => {
  const { authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [documents, setDocuments] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [filter, setFilter] = useState("all"); // all | general | semester
  const [semesterFilterOpen, setSemesterFilterOpen] = useState(false);
  const [semesterFilterSemesterId, setSemesterFilterSemesterId] = useState("");
  const [semesterFilterDraftId, setSemesterFilterDraftId] = useState("");
  const [search, setSearch] = useState("");

  const tableWrapperRef = useRef(null);
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    semesterId: "",
    isGeneral: true,
    file: null,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    semesterId: "",
    isGeneral: true,
    file: null,
  });

  const [appConfig, setAppConfig] = useState(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStatusError, setSyncStatusError] = useState("");
  const [syncLastUpdatedAt, setSyncLastUpdatedAt] = useState(null);
  const [syncPolling, setSyncPolling] = useState(false);
  const [syncHasStarted, setSyncHasStarted] = useState(false);
  const [syncForce, setSyncForce] = useState(false);

  const [tagsByDocId, setTagsByDocId] = useState({});
  const [tagsLoadingByDocId, setTagsLoadingByDocId] = useState({});

  const [addTagOpen, setAddTagOpen] = useState(false);
  const [addTagDocId, setAddTagDocId] = useState(null);
  const [addTagValue, setAddTagValue] = useState("");
  const [addTagSaving, setAddTagSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const response = await fetch("/app-config.json", { cache: "no-store" });
        if (!response.ok) return;
        const json = await response.json();
        if (isMounted) setAppConfig(json || {});
      } catch {
        if (isMounted) setAppConfig({});
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

  const normalizeSyncStatus = (raw) => {
    const obj = raw && typeof raw === "object" ? raw : {};
    return {
      is_running: !!(obj.is_running ?? obj.isRunning ?? obj.running),
      current_step: obj.current_step ?? obj.currentStep ?? obj.step ?? "",
      detail: obj.detail ?? obj.details ?? "",
      progress: obj.progress ?? obj.progress_text ?? obj.progressText ?? "",
      percentage: obj.percentage ?? obj.percent ?? "",
      last_finished: obj.last_finished ?? obj.lastFinished ?? null,
    };
  };

  const fetchSyncStatus = useCallback(async () => {
    if (!ragBaseUrl) throw new Error("Missing RAG base URL");

    const response = await fetch(`${ragBaseUrl}/SyncStatus`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === "string"
          ? payload
          : payload?.message || payload?.error || `HTTP ${response.status}`;
      throw new Error(message);
    }

    const status = normalizeSyncStatus(payload);
    setSyncStatus(status);
    setSyncLastUpdatedAt(Date.now());
    setSyncStatusError("");
    return status;
  }, [ragBaseUrl]);

  // Load current status once (useful if a sync was started elsewhere)
  useEffect(() => {
    let cancelled = false;
    if (!ragBaseUrl) return undefined;
    (async () => {
      try {
        const status = await fetchSyncStatus();
        if (cancelled) return;
        if (status?.is_running) {
          setSyncingNow(true);
          setSyncPolling(true);
          setSyncHasStarted(true);
          setSyncNotice((n) => n || "Syncing latest data… This may take a few minutes.");
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ragBaseUrl, fetchSyncStatus]);

  // Poll /SyncStatus every 5 seconds while polling is enabled
  useEffect(() => {
    if (!syncPolling) return undefined;
    if (!ragBaseUrl) return undefined;

    let cancelled = false;
    let intervalId = null;

    const tick = async () => {
      try {
        const status = await fetchSyncStatus();
        if (cancelled) return;

        if (status?.is_running) {
          setSyncHasStarted(true);
        }

        // Only auto-stop after we have observed the sync running at least once.
        if (status && status.is_running === false && syncHasStarted) {
          setSyncPolling(false);
          setSyncingNow(false);
          setSyncNotice((n) => (n && n.startsWith("Sync failed") ? n : "Sync finished."));
        }
      } catch (e) {
        if (cancelled) return;
        setSyncStatusError(e?.message || "Failed to fetch sync status");
      }
    };

    tick();
    intervalId = window.setInterval(tick, 60000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [syncPolling, ragBaseUrl, fetchSyncStatus, syncHasStarted]);

  useEffect(() => {
    let cancelled = false;
    let loggedOnce = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [docRes, semRes] = await Promise.all([
          ojtDocumentApi.getAll(),
          semesterApi.getAll(),
        ]);

        const list = docRes?.data?.data || [];
        const semList = semRes?.data?.data || [];

        if (!loggedOnce && Array.isArray(list) && list.length > 0) {
          loggedOnce = true;
          // eslint-disable-next-line no-console
          console.log("[DocumentManager] first document payload:", list[0]);
        }

        if (cancelled) return;
        setDocuments(sortDocumentsById(list));
        setSemesters(Array.isArray(semList) ? semList : []);

        if (!createForm.semesterId && Array.isArray(semList) && semList.length > 0) {
          setCreateForm((p) => ({ ...p, semesterId: String(semList[0]?.semesterId ?? "") }));
        }
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || "Failed to load documents");
        setDocuments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const semesterNameById = useMemo(() => {
    const map = new Map();
    for (const s of semesters) {
      if (s?.semesterId != null) map.set(Number(s.semesterId), s?.name || String(s.semesterId));
    }
    return map;
  }, [semesters]);

  const isSemesterActive = (value) => {
    if (value === true) return true;
    if (value === 1) return true;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      return v === "true" || v === "1";
    }
    return false;
  };

  const selectedSemesterLabel = useMemo(() => {
    const key = Number(semesterFilterSemesterId);
    return semesterNameById.get(key) || semesterFilterSemesterId || "";
  }, [semesterFilterSemesterId, semesterNameById]);

  const getDocId = (doc) => {
    const extractFromObject = (obj) => {
      if (!obj || typeof obj !== "object") return null;

      const directCandidates = [
        obj.ojtDocumentId,
        obj.OjtDocumentId,
        obj.ojtDocumentID,
        obj.OjtDocumentID,
        obj.ojt_document_id,
        obj.id,
        obj.Id,
        obj.documentId,
        obj.DocumentId,
      ];

      for (const value of directCandidates) {
        if (value == null) continue;
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) return n;
        const s = String(value).trim();
        if (s !== "") return value;
      }

      // Fallback: case-insensitive key match for common id keys.
      try {
        const keys = Object.keys(obj);
        const normalized = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
        const wanted = new Set(["ojtdocumentid", "documentid", "id"]);
        for (const k of keys) {
          if (!wanted.has(normalized(k))) continue;
          const value = obj[k];
          if (value == null) continue;
          const n = Number(value);
          if (Number.isFinite(n) && n > 0) return n;
          const s = String(value).trim();
          if (s !== "") return value;
        }
      } catch {
        // ignore
      }

      return null;
    };

    // Common nested shapes
    return (
      extractFromObject(doc) ||
      extractFromObject(doc?.ojtDocument) ||
      extractFromObject(doc?.OjtDocument) ||
      extractFromObject(doc?.data) ||
      null
    );
  };

  const sortDocumentsById = (list) => {
    if (!Array.isArray(list)) return [];
    const copy = [...list];
    copy.sort((a, b) => {
      const aId = getDocId(a);
      const bId = getDocId(b);

      const aNum = Number(aId);
      const bNum = Number(bId);
      const aIsNum = Number.isFinite(aNum);
      const bIsNum = Number.isFinite(bNum);

      if (aIsNum && bIsNum) return aNum - bNum; // ascending
      if (aIsNum) return -1;
      if (bIsNum) return 1;

      return String(aId ?? "").localeCompare(String(bId ?? ""));
    });
    return copy;
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setCreateForm((p) => ({ ...p, title: "", file: null }));
  };

  const openEdit = (doc) => {
    const docId = getDocId(doc);
    if (docId == null) return;
    setEditingDoc(doc);
    setEditForm({
      title: doc?.title || "",
      semesterId: String(doc?.semesterId ?? ""),
      isGeneral: !!doc?.isGeneral,
      file: null,
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingDoc(null);
    setEditForm({ title: "", semesterId: "", isGeneral: true, file: null });
  };

  const refreshDocuments = async () => {
    const docRes = await ojtDocumentApi.getAll();
    const list = docRes?.data?.data || [];
    setDocuments(sortDocumentsById(list));
  };

  const getCachedTags = (docId) => {
    const key = String(docId);
    return Object.prototype.hasOwnProperty.call(tagsByDocId, key) ? tagsByDocId[key] : null;
  };

  const loadTagsForDocument = async (docId, options) => {
    const silent = !!options?.silent;
    const key = String(docId);
    if (tagsLoadingByDocId[key]) return getCachedTags(docId) || [];

    try {
      setTagsLoadingByDocId((prev) => ({ ...prev, [key]: true }));
      const res = await ojtDocumentApi.getTags(docId);
      const payload = res?.data;
      const list =
        (Array.isArray(payload) ? payload : null) ||
        (Array.isArray(payload?.tags) ? payload.tags : null) ||
        (Array.isArray(payload?.data) ? payload.data : null);
      const tags = Array.isArray(list) ? list : [];
      setTagsByDocId((prev) => ({ ...prev, [key]: tags }));
      return tags;
    } catch (e) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.message || e?.response?.data?.title;
      if (!silent) {
        window.alert(serverMessage || (status ? `Failed to load tags (HTTP ${status})` : e?.message || "Failed to load tags"));
      }
      setTagsByDocId((prev) => ({ ...prev, [key]: [] }));
      return [];
    } finally {
      setTagsLoadingByDocId((prev) => ({ ...prev, [key]: false }));
    }
  };

  const closeAddTag = () => {
    if (addTagSaving) return;
    setAddTagOpen(false);
    setAddTagDocId(null);
    setAddTagValue("");
  };

  const addTagToDocument = (docId) => {
    if (!docId) return;
    const cached = getCachedTags(docId);
    const loading = !!tagsLoadingByDocId[String(docId)];
    if (loading || cached == null) return;
    if (Array.isArray(cached) && cached.length > 0) return;
    setAddTagDocId(docId);
    setAddTagValue("");
    setAddTagOpen(true);
  };

  const submitAddTag = async (event) => {
    event?.preventDefault?.();
    const docId = addTagDocId;
    const tagId = Number(String(addTagValue).trim());

    if (!docId) return;
    const cached = getCachedTags(docId);
    if (Array.isArray(cached) && cached.length > 0) {
      window.alert("This document already has a tag. Please remove it first.");
      return;
    }
    if (!Number.isFinite(tagId) || tagId <= 0) {
      window.alert("Please choose a tag.");
      return;
    }

    try {
      setAddTagSaving(true);
      await ojtDocumentApi.addTag(docId, tagId);
      await loadTagsForDocument(docId);
      closeAddTag();
    } catch (e) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.message || e?.response?.data?.title;
      window.alert(serverMessage || (status ? `Add tag failed (HTTP ${status})` : e?.message || "Add tag failed"));
    } finally {
      setAddTagSaving(false);
    }
  };

  const removeTagFromDocument = async (docId, tag) => {
    const tagId = tag?.documenttagId ?? tag?.documentTagId ?? tag?.id;
    if (!tagId) return;
    const ok = window.confirm(`Remove tag #${tagId} from document #${docId}?`);
    if (!ok) return;
    try {
      await ojtDocumentApi.removeTag(docId, tagId);
      await loadTagsForDocument(docId);
    } catch (e) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.message || e?.response?.data?.title;
      window.alert(serverMessage || (status ? `Remove tag failed (HTTP ${status})` : e?.message || "Remove tag failed"));
    }
  };

  const syncNow = async () => {
    if (syncingNow) return;
    if (!ragBaseUrl) {
      setSyncNotice("Sync is unavailable (missing RAG base URL).");
      return;
    }

    const forceParam = syncForce ? "true" : "false";

    setSyncingNow(true);
    setSyncPolling(false);
    setSyncHasStarted(false);
    setSyncStatusError("");
    setSyncNotice(`Syncing latest data (force=${forceParam})… This may take a few minutes.`);

    try {
      const response = await fetch(`${ragBaseUrl}/SyncNow?force=${forceParam}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || payload?.error || `HTTP ${response.status}`;
        throw new Error(message);
      }

      const message =
        typeof payload === "string"
          ? payload
          : payload?.message || payload?.status || "Sync started. Please wait a few minutes.";
      setSyncNotice(String(message));

      // Start polling and fetch first status immediately.
      setSyncPolling(true);
      try {
        const status = await fetchSyncStatus();
        if (status?.is_running) setSyncHasStarted(true);
      } catch {
        // ignore (polling will keep trying)
      }
    } catch (e) {
      setSyncNotice(`Sync failed: ${e?.message || "Unknown error"}`);
      setSyncPolling(false);
      setSyncingNow(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return "Please choose a file.";
    const name = String(file?.name || "").toLowerCase();
    const ok = name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx");
    if (!ok) return "Only PDF/DOC/DOCX files are allowed.";
    return null;
  };

  const submitCreate = async () => {
    const title = String(createForm.title || "").trim();
    const semesterId = String(createForm.semesterId || "").trim();
    const fileError = validateFile(createForm.file);
    if (!title) {
      window.alert("Title is required.");
      return;
    }
    if (!semesterId) {
      window.alert("Semester is required.");
      return;
    }
    if (fileError) {
      window.alert(fileError);
      return;
    }

    const uploadedBy = authUser?.id;
    if (!uploadedBy) {
      window.alert("Missing logged-in user id (UploadedBy).");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      // Use camelCase keys (commonly required by many backends for multipart binding)
      formData.append("title", title);
      formData.append("semesterId", semesterId);
      formData.append("isGeneral", String(!!createForm.isGeneral));
      formData.append("uploadedBy", String(uploadedBy));
      formData.append("file", createForm.file, createForm.file?.name);

      await ojtDocumentApi.create(formData);
      await refreshDocuments();
      closeUpload();
    } catch (e) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.message || e?.response?.data?.title;
      window.alert(serverMessage || (status ? `Upload failed (HTTP ${status})` : e?.message || "Upload failed"));
    } finally {
      setSaving(false);
    }
  };

  const submitUpdate = async () => {
    const docId = getDocId(editingDoc);
    if (!docId) return;

    const title = String(editForm.title || "").trim();
    const semesterId = String(editForm.semesterId || "").trim();
    if (!title) {
      window.alert("Title is required.");
      return;
    }
    if (!semesterId) {
      window.alert("Semester is required.");
      return;
    }
    if (editForm.file) {
      const fileError = validateFile(editForm.file);
      if (fileError) {
        window.alert(fileError);
        return;
      }
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("ojtDocumentId", String(docId));
      formData.append("title", title);
      formData.append("semesterId", semesterId);
      formData.append("isGeneral", String(!!editForm.isGeneral));
      if (editForm.file) formData.append("file", editForm.file, editForm.file?.name);

      await ojtDocumentApi.update(formData);
      await refreshDocuments();
      closeEdit();
    } catch (e) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.message || e?.response?.data?.title;
      window.alert(serverMessage || (status ? `Update failed (HTTP ${status})` : e?.message || "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async (doc) => {
    const docId = getDocId(doc);
    if (!docId) return;

    const ok = window.confirm(`Delete document #${docId}?`);
    if (!ok) return;

    // Must remove tags before deleting
    const existingTags = getCachedTags(docId);
    const tags = existingTags == null ? await loadTagsForDocument(docId) : existingTags;
    if (Array.isArray(tags) && tags.length > 0) {
      window.alert("Please remove this document's tags before deleting it.");
      return;
    }

    try {
      await ojtDocumentApi.delete(docId);
      setDocuments((prev) => sortDocumentsById((prev || []).filter((d) => getDocId(d) !== docId)));
      if (getDocId(editingDoc) === docId) closeEdit();
      setTagsByDocId((prev) => {
        const copy = { ...prev };
        delete copy[String(docId)];
        return copy;
      });
    } catch (e) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.message || e?.response?.data?.title;
      window.alert(serverMessage || (status ? `Delete failed (HTTP ${status})` : e?.message || "Delete failed"));
    }
  };

  const filteredDocuments = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return (documents || [])
      .filter((d) => {
        if (filter === "general") return !!d?.isGeneral;
        if (filter === "semester") {
          if (!semesterFilterSemesterId) return false;
          return String(d?.semesterId ?? "") === String(semesterFilterSemesterId);
        }
        return true;
      })
      .filter((d) => {
        if (!q) return true;
        const title = String(d?.title || "").toLowerCase();
        return title.includes(q);
      });
  }, [documents, filter, search, semesterFilterSemesterId]);

  const openSemesterFilterPicker = useCallback(() => {
    const active = (semesters || []).find((s) => isSemesterActive(s?.isActive));
    const fallback = active?.semesterId ?? semesters?.[0]?.semesterId ?? "";
    const initial = String(semesterFilterSemesterId || fallback || "");
    setSemesterFilterDraftId(initial);
    setSemesterFilterOpen(true);
  }, [semesters, semesterFilterSemesterId]);

  const closeSemesterFilterPicker = () => {
    setSemesterFilterOpen(false);
  };

  const applySemesterFilter = () => {
    const value = String(semesterFilterDraftId || "").trim();
    if (!value) {
      window.alert("Please choose a semester.");
      return;
    }
    setSemesterFilterSemesterId(value);
    setFilter("semester");
    setSemesterFilterOpen(false);
  };

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredDocuments.length / Math.max(1, pageSize))),
    [filteredDocuments.length, pageSize]
  );

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedDocuments = useMemo(() => {
    const safeSize = Math.max(1, pageSize);
    const start = (page - 1) * safeSize;
    return filteredDocuments.slice(start, start + safeSize);
  }, [filteredDocuments, page, pageSize]);

  const recomputePageSize = useCallback(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    const wrapperHeight = wrapper.getBoundingClientRect().height || 0;
    if (wrapperHeight <= 0) return;

    const headerEl = wrapper.querySelector("thead");
    const firstRowEl = wrapper.querySelector("tbody tr");

    const headerHeight = headerEl?.getBoundingClientRect().height || 44;
    const rowHeight = firstRowEl?.getBoundingClientRect().height || 56;

    // Small safety padding for borders/margins.
    const available = Math.max(0, wrapperHeight - headerHeight - 16);
    const nextSize = Math.max(4, Math.floor(available / Math.max(1, rowHeight)));

    setPageSize((prev) => (prev === nextSize ? prev : nextSize));
  }, []);

  useEffect(() => {
    recomputePageSize();
    const wrapper = tableWrapperRef.current;

    let ro = null;
    if (typeof window !== "undefined" && "ResizeObserver" in window && wrapper) {
      ro = new ResizeObserver(() => recomputePageSize());
      ro.observe(wrapper);
    }

    window.addEventListener("resize", recomputePageSize);
    return () => {
      window.removeEventListener("resize", recomputePageSize);
      if (ro) ro.disconnect();
    };
  }, [recomputePageSize]);

  useEffect(() => {
    let cancelled = false;
    const candidates = (pagedDocuments || []).map((doc) => getDocId(doc)).filter(Boolean);

    const missing = candidates.filter((docId) => {
      const key = String(docId);
      return getCachedTags(docId) == null && !tagsLoadingByDocId[key];
    });

    if (missing.length === 0) return;

    (async () => {
      const concurrency = 4;
      const queue = [...missing];
      const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (!cancelled && queue.length > 0) {
          const nextId = queue.shift();
          if (!nextId) continue;
          await loadTagsForDocument(nextId, { silent: true });
        }
      });
      await Promise.all(runners);
    })();

    return () => {
      cancelled = true;
    };
  }, [pagedDocuments, tagsByDocId, tagsLoadingByDocId]);

  return (
    <div className="admin-page document-manager">
      <div className="page-header">
        <h1>Document Management</h1>
        <p>Manage university documents and templates</p>
      </div>

      <div className="card">
        <div className="toolbar dm-toolbar">
          <div className="dm-toolbar-left">
            <button className="btn-primary" type="button" onClick={() => setUploadOpen(true)}>
              Upload New Document
            </button>
            <label
              className="dm-sync-force"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 10 }}
              title="When force=true, the server may re-sync everything."
            >
              <span style={{ opacity: 0.8, fontSize: 13 }}>Force</span>
              <select
                value={String(syncForce)}
                onChange={(e) => setSyncForce(e.target.value === "true")}
                disabled={syncingNow}
                style={{ padding: "6px 8px", borderRadius: 8 }}
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </label>
            <button
              className="btn-secondary dm-sync-btn"
              type="button"
              onClick={syncNow}
              disabled={syncingNow}
              title="Sync latest data from the source"
            >
              {syncingNow ? "Syncing…" : "Sync now"}
            </button>
            <input
              className="dm-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
            />
          </div>
          <div className="dm-toolbar-right">
            <button className={`chip ${filter === "all" ? "active" : ""}`} type="button" onClick={() => setFilter("all")}>All</button>
            <button className={`chip ${filter === "general" ? "active" : ""}`} type="button" onClick={() => setFilter("general")}>General</button>
            <button
              className={`chip ${filter === "semester" ? "active" : ""}`}
              type="button"
              onClick={openSemesterFilterPicker}
              title={selectedSemesterLabel ? `Semester: ${selectedSemesterLabel}` : "Choose a semester"}
            >
              By Semester{selectedSemesterLabel ? `: ${selectedSemesterLabel}` : ""}
            </button>
          </div>
        </div>

        {(syncingNow || syncNotice) && (
          <div className={`dm-sync-notice ${syncingNow ? "is-syncing" : ""}`}>{syncNotice}</div>
        )}

        {(syncingNow || syncPolling) && (
          <div className={`dm-sync-board ${syncingNow ? "is-syncing" : ""}`}>
            <div className="dm-sync-board-header">
              <div className="dm-sync-board-title">Sync progress</div>
              <div className={`dm-sync-state ${syncStatus?.is_running ? "is-running" : ""}`}>
                {syncStatus?.is_running ? "RUNNING" : "IDLE"}
              </div>
            </div>

            {syncStatusError && <div className="dm-sync-error">{syncStatusError}</div>}

            <table className="dm-sync-kv">
              <tbody>
                <tr>
                  <th>Current step</th>
                  <td>{syncStatus?.current_step || "-"}</td>
                </tr>
                <tr>
                  <th>Detail</th>
                  <td>{syncStatus?.detail || "-"}</td>
                </tr>
                <tr>
                  <th>Progress</th>
                  <td>{syncStatus?.progress || "-"}</td>
                </tr>
                <tr>
                  <th>Percentage</th>
                  <td>{syncStatus?.percentage || "-"}</td>
                </tr>
                <tr>
                  <th>Updated</th>
                  <td>{syncLastUpdatedAt ? new Date(syncLastUpdatedAt).toLocaleString() : "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="dm-table-wrapper" ref={tableWrapperRef}>
          <table className="admin-table dm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Semester</th>
                <th>General</th>
                <th>Tags</th>
                <th>Uploaded By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7}>{error}</td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7}>No documents found.</td>
                </tr>
              ) : (
                pagedDocuments.map((doc, idx) => {
                  const id = getDocId(doc);
                  const semesterId = doc?.semesterId;
                  const semesterName = semesterNameById.get(Number(semesterId)) || semesterId || "-";
                  const url = doc?.fileUrl;
                  const actionsDisabled = !id;
                  const tagKey = id != null ? String(id) : "";
                  const tags = id != null ? getCachedTags(id) : null;
                  const tagsLoading = !!(id != null && tagsLoadingByDocId[tagKey]);

                  return (
                    <tr key={id ?? `doc-row-${idx}`}>
                      <td>{id}</td>
                      <td className="dm-title">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            {doc?.title || "(untitled)"}
                          </a>
                        ) : (
                          doc?.title || "(untitled)"
                        )}
                      </td>
                      <td>{semesterName}</td>
                      <td>{doc?.isGeneral ? "Yes" : "No"}</td>
                      <td>
                        <div className="dm-tags">
                          {actionsDisabled ? (
                            <span className="dm-tags-empty">-</span>
                          ) : tags == null ? (
                            <span className="dm-tags-empty">{tagsLoading ? "Loading…" : "Loading…"}</span>
                          ) : tags.length === 0 ? (
                            <span className="dm-tags-empty">—</span>
                          ) : (
                            <div className="dm-tag-list">
                              {tags.map((tag) => {
                                const tagId = getDocumentTagId(tag);
                                const tagName = resolveDocumentTagName(tag);
                                return (
                                  <span
                                    key={`tag-${id}-${tagId}`}
                                    className="dm-tag-chip"
                                    title={tagId ? `#${tagId}` : ""}
                                  >
                                    <span className="dm-tag-name">{tagName}</span>
                                    <button
                                      type="button"
                                      className="dm-tag-remove"
                                      onClick={() => removeTagFromDocument(id, tag)}
                                      title="Remove tag"
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {!actionsDisabled && Array.isArray(tags) && tags.length === 0 && !tagsLoading && (
                            <button
                              className="btn-secondary dm-tag-add"
                              type="button"
                              onClick={() => addTagToDocument(id)}
                              title="Add tag"
                            >
                              + Tag
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{doc?.uploadedBy ?? "-"}</td>
                      <td className="dm-actions">
                        {url && (
                          <a className="btn-secondary" href={url} target="_blank" rel="noreferrer">
                            Download
                          </a>
                        )}
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => openEdit(doc)}
                          disabled={actionsDisabled}
                          title={actionsDisabled ? "Cannot edit: missing document id from API" : ""}
                        >
                          Update
                        </button>
                        <button
                          className="btn-danger"
                          type="button"
                          onClick={() => deleteDoc(doc)}
                          disabled={actionsDisabled}
                          title={actionsDisabled ? "Cannot delete: missing document id from API" : ""}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="dm-pagination">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ← Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next →
            </button>
          </div>
        )}
      </div>

      {semesterFilterOpen && (
        <div className="dm-modal-overlay" onClick={closeSemesterFilterPicker}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Choose semester</h3>

            <div className="dm-form">
              <label>
                Semester
                {semesters.length > 0 ? (
                  <select value={semesterFilterDraftId} onChange={(e) => setSemesterFilterDraftId(e.target.value)}>
                    <option value="">Select a semester...</option>
                    {semesters.map((s) => (
                      <option key={s?.semesterId} value={String(s?.semesterId ?? "")}>
                        {s?.name || s?.semesterName || s?.semesterId}
                        {isSemesterActive(s?.isActive) ? " (Active)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={semesterFilterDraftId}
                    onChange={(e) => setSemesterFilterDraftId(e.target.value)}
                    placeholder="SemesterId"
                  />
                )}
              </label>

              <div className="dm-form-actions">
                <button className="btn-primary" type="button" onClick={applySemesterFilter}>
                  Apply
                </button>
                <button className="btn-secondary" type="button" onClick={closeSemesterFilterPicker}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadOpen && (
        <div className="dm-modal-overlay" onClick={closeUpload}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Upload Document</h3>

            <div className="dm-form">
              <label>
                Title
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Enter document title"
                />
              </label>

              <label>
                Semester
                {semesters.length > 0 ? (
                  <select
                    value={createForm.semesterId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, semesterId: e.target.value }))}
                  >
                    {semesters.map((s) => (
                      <option key={s?.semesterId} value={String(s?.semesterId)}>
                        {s?.name || s?.semesterId}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={createForm.semesterId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, semesterId: e.target.value }))}
                    placeholder="SemesterId"
                  />
                )}
              </label>

              <label className="dm-check">
                <input
                  type="checkbox"
                  checked={!!createForm.isGeneral}
                  onChange={(e) => setCreateForm((p) => ({ ...p, isGeneral: e.target.checked }))}
                />
                General document
              </label>

              <label>
                File (PDF/DOC/DOCX)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCreateForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                />
              </label>

              <div className="dm-form-actions">
                <button className="btn-primary" type="button" onClick={submitCreate} disabled={saving}>
                  {saving ? "Uploading..." : "Upload"}
                </button>
                <button className="btn-secondary" type="button" onClick={closeUpload} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addTagOpen && (
        <div className="dm-modal-overlay" onClick={closeAddTag}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Tag</h3>

            <form className="dm-form" onSubmit={submitAddTag}>
              <label>
                Document tag
                <select
                  autoFocus
                  value={addTagValue}
                  onChange={(e) => setAddTagValue(e.target.value)}
                >
                  <option value="">Select a tag...</option>
                  {DOCUMENT_TAG_OPTIONS.map((tag) => (
                    <option key={tag.id} value={String(tag.id)}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="dm-form-actions">
                <button className="btn-primary" type="submit" disabled={addTagSaving}>
                  {addTagSaving ? "Adding..." : "Add"}
                </button>
                <button className="btn-secondary" type="button" onClick={closeAddTag} disabled={addTagSaving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="dm-modal-overlay" onClick={closeEdit}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Update Document</h3>

            <div className="dm-form">
              <label>
                Title
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Enter document title"
                />
              </label>

              <label>
                Semester
                {semesters.length > 0 ? (
                  <select
                    value={editForm.semesterId}
                    onChange={(e) => setEditForm((p) => ({ ...p, semesterId: e.target.value }))}
                  >
                    {semesters.map((s) => (
                      <option key={s?.semesterId} value={String(s?.semesterId)}>
                        {s?.name || s?.semesterId}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={editForm.semesterId}
                    onChange={(e) => setEditForm((p) => ({ ...p, semesterId: e.target.value }))}
                    placeholder="SemesterId"
                  />
                )}
              </label>

              <label className="dm-check">
                <input
                  type="checkbox"
                  checked={!!editForm.isGeneral}
                  onChange={(e) => setEditForm((p) => ({ ...p, isGeneral: e.target.checked }))}
                />
                General document
              </label>

              <label>
                Replace file (optional)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setEditForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                />
              </label>

              <div className="dm-form-actions">
                <button className="btn-primary" type="button" onClick={submitUpdate} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className="btn-secondary" type="button" onClick={closeEdit} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
