import React, { useEffect, useState } from "react";
import "./DocumentManager.css";
import companyDocumentApi from "../../API/CompanyDocumentAPI";

export default function DocumentManager() {
  const semesterCompanyId = 4; // 🔥 semester đang chọn
  const uploadedBy = 11;

  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  // ===== UPDATE FORM =====
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFile, setEditFile] = useState(null);

  // ================= LOAD DOCUMENTS =================
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
  try {
    const res = await companyDocumentApi.getAll();

    // 🔥 LƯU Ý: data nằm trong res.data.data
    const filtered = res.data.data
      .filter(
        (doc) => doc.semesterCompanyId === semesterCompanyId
      )
      .map((doc) => ({
        id: doc.companyDocumentId,
        name: doc.title,
        size: "-", // backend không trả size
        url: doc.fileUrl,
        uploadedBy: doc.uploadedBy,
      }));

    setDocuments(filtered);
  } catch (err) {
    console.error("Load documents error:", err);
  }
};
  // ================= CREATE =================
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("SemesterCompanyId", semesterCompanyId);
      formData.append("Title", file.name);
      formData.append("UploadedBy", uploadedBy);
      formData.append("IsPublic", true);
      formData.append("File", file);

      await companyDocumentApi.create(formData);
      await loadDocuments();

      alert("Upload thành công!");
    } catch (err) {
      console.error(err);
      alert("Upload thất bại!");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ================= OPEN UPDATE =================
  const openUpdateForm = (doc) => {
    setEditingDoc(doc);
    setEditTitle(doc.name);
    setEditFile(null);
  };

  // ================= UPDATE =================
  const handleUpdate = async () => {
    if (!editingDoc) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("CompanyDocumentId", editingDoc.id);
      formData.append("SemesterCompanyId", semesterCompanyId);
      formData.append("Title", editTitle);
      formData.append("UploadedBy", uploadedBy);
      formData.append("IsPublic", true);

      if (editFile) {
        formData.append("File", editFile);
      }

      await companyDocumentApi.update(formData);
      await loadDocuments();

      alert("Cập nhật thành công!");
      closeUpdateForm();
    } catch (err) {
      console.error(err);
      alert("Cập nhật thất bại!");
    } finally {
      setUploading(false);
    }
  };

  const closeUpdateForm = () => {
    setEditingDoc(null);
    setEditTitle("");
    setEditFile(null);
  };

  // ================= SEARCH =================
  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="doc-container">
      <h2>Quản lý tài liệu (SemesterCompany #{semesterCompanyId})</h2>

      {/* ACTIONS */}
      <div className="doc-actions">
        <input
          placeholder="Tìm tài liệu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <label className="upload-btn">
          Upload
          <input type="file" hidden onChange={handleUpload} />
        </label>
      </div>

      {/* TABLE */}
      <table className="doc-table">
  <thead>
    <tr>
      <th>Tên</th>
      <th>Action</th>
    </tr>
  </thead>

  <tbody>
    {filteredDocs.length === 0 ? (
      <tr>
        <td colSpan="2" className="no-data">
          Không có tài liệu
        </td>
      </tr>
    ) : (
      filteredDocs.map((doc) => (
        <tr key={doc.id}>
          <td>
            <a href={doc.url} target="_blank" rel="noreferrer">
              {doc.name}
            </a>
          </td>
          <td>
            <button
              className="update-btn"
              onClick={() => openUpdateForm(doc)}
            >
              Update
            </button>
          </td>
        </tr>
      ))
    )}
  </tbody>
</table>


      {/* UPDATE FORM */}
      {editingDoc && (
  <div className="modal-overlay" onClick={closeUpdateForm}>
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()}
    >
      <h3>Cập nhật tài liệu</h3>

      <div className="form-group">
        <label>Tiêu đề</label>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Nhập tiêu đề tài liệu"
        />
      </div>

      <div className="form-group">
        <label>File mới (không bắt buộc)</label>
        <input
          type="file"
          onChange={(e) => setEditFile(e.target.files[0])}
        />
        {editFile && (
          <small className="file-name">
            Đã chọn: {editFile.name}
          </small>
        )}
      </div>

      <div className="form-actions">
        <button onClick={handleUpdate} disabled={uploading}>
          {uploading ? "Đang lưu..." : "Lưu"}
        </button>

        <button className="cancel-btn" onClick={closeUpdateForm}>
          Hủy
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
