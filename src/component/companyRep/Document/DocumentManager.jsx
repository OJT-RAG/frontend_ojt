import React, { useEffect, useState } from "react";
import "./DocumentManager.css";
import ojtDocumentApi from "../../API/OjtDocumentAPI";
import semesterApi from "../../API/SemesterAPI";
import { useAuth } from "../../Hook/useAuth";

export default function DocumentManager() {
  const [semesterId, setSemesterId] = useState(null);
    const { authUser } = useAuth(); // 👈 lấy user đang đăng nhập

  const uploadedBy = authUser?.id; 
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
// ===== CREATE FORM =====
const [showUploadForm, setShowUploadForm] = useState(false);
const [uploadTitle, setUploadTitle] = useState("");
const [uploadFile, setUploadFile] = useState(null);

  // ===== UPDATE FORM =====
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFile, setEditFile] = useState(null);

  useEffect(() => {
  loadActiveSemester();
}, []);

const loadActiveSemester = async () => {
  try {
    const res = await semesterApi.getAll();

    const activeSemester = res.data.data.find(
      (s) => s.isActive === true
    );

    if (!activeSemester) {
      console.error("Không có semester active");
      return;
    }

    setSemesterId(activeSemester.semesterId);
  } catch (err) {
    console.error("Load semester error:", err);
  }
};

  // ================= LOAD DOCUMENTS =================
useEffect(() => {
  if (!semesterId) return;
  loadDocuments();
}, [semesterId]);


const loadDocuments = async () => {
  try {
    const res = await ojtDocumentApi.getAll();

    const filtered = res.data.data
  .filter(
    (doc) =>
      doc.semesterId === semesterId &&
      doc.uploadedBy === uploadedBy
  )
  .map(doc => ({
    id: doc.ojtdocumentId,
    name: doc.title,
    url: doc.fileUrl,
    uploadedBy: doc.uploadedBy,
  }));


    setDocuments(filtered);
  } catch (err) {
    console.error("Load OJT documents error:", err);
  }
};


  // ================= CREATE =================
const handleUpload = async () => {
  if (!uploadedBy) {
    alert("Bạn cần đăng nhập để upload");
    return;
  }

  if (!semesterId) {
    alert("Chưa có học kỳ đang hoạt động");
    return;
  }

  if (!uploadTitle || !uploadFile) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  try {
    setUploading(true);

    const formData = new FormData();
    formData.append("Title", uploadTitle);
    formData.append("SemesterId", semesterId);
    formData.append("UploadedBy", uploadedBy);
    formData.append("IsGeneral", true);
    formData.append("File", uploadFile);

    await ojtDocumentApi.create(formData);
    await loadDocuments();

    alert("Upload thành công!");

    // reset form
    setUploadTitle("");
    setUploadFile(null);
    setShowUploadForm(false);
  } catch (err) {
    console.error(err);
    alert("Upload thất bại!");
  } finally {
    setUploading(false);
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
    formData.append("OjtDocumentId", editingDoc.id); // ✅
    formData.append("SemesterId", semesterId);
    formData.append("Title", editTitle);
    formData.append("UploadedBy", uploadedBy);
    formData.append("IsGeneral", true);

    if (editFile) {
      formData.append("File", editFile);
    }

    await ojtDocumentApi.update(formData); // ✅
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
      <h2>Quản lý tài liệu</h2>

      {/* ACTIONS */}
      <div className="doc-actions">
        <div className="doc-search-wrapper">
  <span className="search-icon">🔍</span>
  <input
    className="doc-search"
    placeholder="Tìm kiếm tài liệu..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>


        <button
  className="upload-btn"
  disabled={!uploadedBy || !semesterId}
  onClick={() => setShowUploadForm(true)}
>
  Upload
</button>


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
{showUploadForm && (
  <div className="modal-overlay" onClick={() => setShowUploadForm(false)}>
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()}
    >
      <h3>Upload tài liệu</h3>

      <div className="form-group">
        <label>Tiêu đề</label>
        <input
          value={uploadTitle}
          onChange={(e) => setUploadTitle(e.target.value)}
          placeholder="Nhập tiêu đề tài liệu"
        />
      </div>

      <div className="form-group">
        <label>File</label>
        <input
          type="file"
          onChange={(e) => setUploadFile(e.target.files[0])}
        />
        {uploadFile && (
          <small className="file-name">
            Đã chọn: {uploadFile.name}
          </small>
        )}
      </div>

      <div className="form-actions">
        <button
          onClick={handleUpload}
          disabled={uploading || !uploadTitle || !uploadFile}
        >
          {uploading ? "Đang upload..." : "Upload"}
        </button>

        <button
          className="cancel-btn"
          onClick={() => setShowUploadForm(false)}
        >
          Hủy
        </button>
      </div>
    </div>
  </div>
)}


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