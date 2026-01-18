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

        if (cancelled) return;
        setDocuments(Array.isArray(list) ? list : []);
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

  const closeUpload = () => {
    setUploadOpen(false);
    setCreateForm((p) => ({ ...p, title: "", file: null }));
  };

  const openEdit = (doc) => {
    const docId = doc?.ojtDocumentId ?? doc?.OjtDocumentId;
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
    setDocuments(Array.isArray(list) ? list : []);
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
      formData.append("Title", title);
      formData.append("SemesterId", semesterId);
      formData.append("IsGeneral", String(!!createForm.isGeneral));
      formData.append("UploadedBy", String(uploadedBy));
      formData.append("File", createForm.file);

      await ojtDocumentApi.create(formData);
      await refreshDocuments();
      closeUpload();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const submitUpdate = async () => {
    const docId = editingDoc?.ojtDocumentId ?? editingDoc?.OjtDocumentId;
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
      formData.append("OjtDocumentId", String(docId));
      formData.append("Title", title);
      formData.append("SemesterId", semesterId);
      formData.append("IsGeneral", String(!!editForm.isGeneral));
      if (editForm.file) formData.append("File", editForm.file);

      await ojtDocumentApi.update(formData);
      await refreshDocuments();
      closeEdit();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async (doc) => {
    const docId = doc?.ojtDocumentId ?? doc?.OjtDocumentId;
    if (!docId) return;

    const ok = window.confirm(`Delete document #${docId}?`);
    if (!ok) return;

    try {
      await ojtDocumentApi.delete(docId);
      setDocuments((prev) => prev.filter((d) => (d?.ojtDocumentId ?? d?.OjtDocumentId) !== docId));
      if ((editingDoc?.ojtDocumentId ?? editingDoc?.OjtDocumentId) === docId) closeEdit();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || "Delete failed");
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
              filteredDocuments.map((doc) => {
                const id = doc?.ojtDocumentId ?? doc?.OjtDocumentId;
                const semesterId = doc?.semesterId;
                const semesterName = semesterNameById.get(Number(semesterId)) || semesterId || "-";
                const url = doc?.fileUrl;

                return (
                  <tr key={id}>
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
                      <button className="btn-secondary" type="button" onClick={() => openEdit(doc)}>
                        Update
                      </button>
                      <button className="btn-danger" type="button" onClick={() => deleteDoc(doc)}>
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
