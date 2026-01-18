import React, { useEffect, useMemo, useState } from "react";
import "./DocumentManager.scss";
import ojtDocumentApi from "../../API/OjtDocumentAPI";
import semesterApi from "../../API/SemesterAPI";
import { useAuth } from "../../Hook/useAuth";

const DocumentManager = () => {
  const { authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [documents, setDocuments] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [filter, setFilter] = useState("all"); // all | general | semester
  const [search, setSearch] = useState("");

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

    try {
      await ojtDocumentApi.delete(docId);
      setDocuments((prev) => sortDocumentsById((prev || []).filter((d) => getDocId(d) !== docId)));
      if (getDocId(editingDoc) === docId) closeEdit();
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
        if (filter === "semester") return !d?.isGeneral;
        return true;
      })
      .filter((d) => {
        if (!q) return true;
        const title = String(d?.title || "").toLowerCase();
        return title.includes(q);
      });
  }, [documents, filter, search]);

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
            <button className={`chip ${filter === "semester" ? "active" : ""}`} type="button" onClick={() => setFilter("semester")}>By Semester</button>
          </div>
        </div>

        <table className="admin-table dm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Semester</th>
              <th>General</th>
              <th>Uploaded By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6}>{error}</td>
              </tr>
            ) : filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={6}>No documents found.</td>
              </tr>
            ) : (
              filteredDocuments.map((doc, idx) => {
                const id = getDocId(doc);
                const semesterId = doc?.semesterId;
                const semesterName = semesterNameById.get(Number(semesterId)) || semesterId || "-";
                const url = doc?.fileUrl;
                const actionsDisabled = !id;

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
