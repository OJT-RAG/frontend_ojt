import React, { useEffect, useState } from "react";
import "./DocumentManager.css";
import companyDocumentApi from "../../API/CompanyDocumentAPI";
import { useAuth } from "../../Hook/useAuth";
import semesterApi from "../../API/SemesterAPI";
import companySemesterApi from "../../API/CompanySemesterAPI";
import documentTagApi from "../../API/DocumentTagAPI";

export default function DocumentManager() {

  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const { authUser } = useAuth();
  const companyId = authUser?.company_id;
  const [tags, setTags] = useState([]);
  const [taggingDoc, setTaggingDoc] = useState(null);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  // ===== UPDATE FORM =====
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [semesterCompanyId, setSemesterCompanyId] = useState(null);

  useEffect(() => {
  const loadTags = async () => {
    try {
      const res = await documentTagApi.getAll();
      setTags(res.data.data || []);
    } catch (err) {
      console.error("Load document tags error:", err);
    }
  };
  
  loadTags();
}, []);

  // ================= LOAD DOCUMENTS =================
  useEffect(() => {
  if (semesterCompanyId) {
    loadDocuments();
  }
}, [semesterCompanyId]);

  useEffect(() => {
  if (!companyId) return;

  const loadSemesterCompany = async () => {
    try {
      // 1️⃣ Lấy semester
      const semesterRes = await semesterApi.getAll();
      const semesters = semesterRes.data.data || semesterRes.data;

      const currentSemester = semesters.find(
  s => s.isActive === true || s.isActive === 1
);

if (!currentSemester) {
  console.warn("Không có semester active");
  return;
}


      // 2️⃣ Lấy company–semester
      const csRes = await companySemesterApi.getByCompany(companyId);
      const companySemesters = csRes.data.data || csRes.data;

      // 3️⃣ Match đúng semester
      const matched = companySemesters.find(
        cs => cs.semesterId === currentSemester.semesterId
      );

      if (!matched) {
        console.warn("Company chưa đăng ký semester này");
        return;
      }

      // ✅ QUAN TRỌNG
      setSemesterCompanyId(matched.semesterCompanyId);
    } catch (err) {
      console.error("Load semesterCompanyId error:", err);
    }
  };

  loadSemesterCompany();
}, [companyId]);

useEffect(() => {
  console.log("AUTH USER:", authUser);
  console.log("COMPANY ID:", companyId);
}, [authUser, companyId]);


  const loadDocuments = async () => {
  try {
    const res = await companyDocumentApi.getAll();

    console.log(
      "ALL DOCS FROM API:",
      res.data.data.map(d => ({
        id: d.companyDocumentId,
        semesterCompanyId: d.semesterCompanyId,
        type: typeof d.semesterCompanyId
      }))
    );

    console.log(
      "CURRENT semesterCompanyId:",
      semesterCompanyId,
      typeof semesterCompanyId
    );

    const docs = res.data.data.filter(
      (doc) =>
        String(doc.semesterCompanyId) === String(semesterCompanyId)
    );

    const withTags = await Promise.all(
  docs.map(async (doc) => {
    const tagRes = await companyDocumentApi.getTags(
      doc.companyDocumentId
    );

    console.log(
      "TAGS API RAW:",
      tagRes.data
    );

    return {
      id: doc.companyDocumentId,
      name: doc.title,
      url: doc.fileUrl,
      uploadedBy: doc.uploadedBy,
      isPublic: doc.isPublic,
      tags: tagRes.data.tags || [], // ✅ CHÍNH XÁC
    };
  })
);



    setDocuments(withTags);
  } catch (err) {
    console.error("Load documents error:", err);
  }
};




  // ================= CREATE =================
  const handleUpload = async (e) => {
  const file = e.target.files[0];
  if (!file || !semesterCompanyId) return;

  try {
    setUploading(true);

    const formData = new FormData();
    formData.append("SemesterCompanyId", semesterCompanyId);
    formData.append("Title", file.name);
    formData.append("UploadedBy", authUser.id); // ✅ FIX
    formData.append("IsPublic", isPublic.toString());        // ✅ FIX
    formData.append("File", file);

    // 🧪 DEBUG – RẤT QUAN TRỌNG
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    await companyDocumentApi.create(formData);
    await loadDocuments();

    alert("Upload thành công!");
  } catch (err) {
    console.error("Upload error:", err.response?.data || err);
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
  setIsPublic(true); // 🔥 tạm thời
};


  // ================= UPDATE =================
  const handleUpdate = async () => {
  if (!editingDoc || !semesterCompanyId) return;

  try {
    setUploading(true);

    const formData = new FormData();
    formData.append("CompanyDocumentId", editingDoc.id);   // ✅ BẮT BUỘC
    formData.append("SemesterCompanyId", semesterCompanyId);
    formData.append("Title", editTitle);
    formData.append("UploadedBy", authUser.id);            // ✅ đúng user
    formData.append("IsPublic", isPublic.toString());       // ✅ string

    if (editFile) {
      formData.append("File", editFile);                   // ✅ chỉ gửi khi có
    }

    // 🧪 DEBUG UPDATE
    for (let pair of formData.entries()) {
      console.log("[UPDATE]", pair[0], pair[1]);
    }

    await companyDocumentApi.update(formData);
    await loadDocuments();

    alert("Cập nhật thành công!");
    closeUpdateForm();
  } catch (err) {
    console.error(
      "Update error:",
      err.response?.data || err
    );
    alert("Cập nhật thất bại!");
  } finally {
    setUploading(false);
  }
};
  const handleDelete = async (doc) => {
  const ok = window.confirm(
    `Bạn có chắc muốn xóa tài liệu "${doc.name}" không?`
  );
  if (!ok) return;

  try {
    setUploading(true);

    console.log("DELETE CompanyDocumentId =", doc.id);

    await companyDocumentApi.delete(doc.id);
    await loadDocuments();

    alert("Xóa tài liệu thành công!");
  } catch (err) {
    console.error(
      "Delete error:",
      err.response?.data || err
    );
    alert("Xóa tài liệu thất bại!");
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
      <th>Quyền</th>
      <th>Tags</th>
      <th>Action</th>
      
    </tr>
  </thead>

  <tbody>
  {filteredDocs.length === 0 ? (
    <tr>
      <td colSpan="4" className="no-data">
        Không có tài liệu
      </td>
    </tr>
  ) : (
    filteredDocs.map((doc) => (
      <tr key={doc.id}>
        {/* TÊN */}
        <td>
          <a href={doc.url} target="_blank" rel="noreferrer">
            {doc.name}
          </a>
        </td>

        {/* QUYỀN */}
        <td>
  <span
    className={`access-badge ${
      doc.isPublic ? "public" : "private"
    }`}
  >
    {doc.isPublic ? "Public" : "Private"}
  </span>
</td>


        {/* TAGS */}
        <td>
  {doc.tags.length > 0 ? (
    doc.tags.map((tag) => (
      <span
        key={tag.documenttagId}
        className="tag-pill"
      >
        {tag.name}

        <button
          className="tag-remove"
          title="Xoá tag"
          onClick={async () => {
            const ok = window.confirm(
              `Xoá tag "${tag.name}" khỏi tài liệu này?`
            );
            if (!ok) return;

            try {
              setUploading(true);

              console.log(
                "DELETE TAG:",
                doc.id,
                tag.documenttagId
              );

              await companyDocumentApi.deleteTag(
                doc.id,
                tag.documenttagId
              );

              await loadDocuments();
            } catch (err) {
              console.error(
                "Delete tag error:",
                err.response?.data || err
              );
              alert("Xoá tag thất bại!");
            } finally {
              setUploading(false);
            }
          }}
        >
          ×
        </button>
      </span>
    ))
  ) : (
    <span className="no-tag">—</span>
  )}
</td>



        {/* ACTION */}
       <td>
  <div className="action-group">
    <button
      className="update-btn"
      onClick={() => openUpdateForm(doc)}
    >
      Update
    </button>

    <button
      className="delete-btn"
      onClick={() => handleDelete(doc)}
      disabled={uploading}
    >
      Delete
    </button>

    <button
      className="tag-btn"
      onClick={() => {
        setTaggingDoc(doc);
        setSelectedTagId("");
      }}
    >
      Tag
    </button>
  </div>
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
  <label>Quyền truy cập</label>
  <select
    value={isPublic ? "true" : "false"}
    onChange={(e) =>
      setIsPublic(e.target.value === "true")
    }
  >
    <option value="true">🌍 Công khai</option>
    <option value="false">🔒 Riêng tư</option>
  </select>
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
{taggingDoc && (
  <div
    className="modal-overlay"
    onClick={() => setTaggingDoc(null)}
  >
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()}
    >
      <h3>Gắn tag tài liệu</h3>

      <p>
        <strong>{taggingDoc.name}</strong>
      </p>

      <div className="form-group">
        <label>Chọn tag</label>
        <select
          value={selectedTagId}
          onChange={(e) => setSelectedTagId(e.target.value)}
        >
          <option value="">-- Chọn tag --</option>

          {tags.map((tag) => (
            <option
              key={tag.documenttagId}
              value={tag.documenttagId}
            >
              {tag.name} ({tag.type})
            </option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button
          disabled={!selectedTagId}
          onClick={async () => {
            try {
              setUploading(true);

              console.log(
                "ADD TAG:",
                taggingDoc.id,
                selectedTagId
              );

              await documentTagApi.addTag(
                taggingDoc.id,
                selectedTagId
              );

              alert("Gắn tag thành công!");
              setTaggingDoc(null);
              await loadDocuments();
            } catch (err) {
              console.error(
                "Add tag error:",
                err.response?.data || err
              );
              alert("Gắn tag thất bại!");
            } finally {
              setUploading(false);
            }
          }}
        >
          Lưu
        </button>

        <button
          className="cancel-btn"
          onClick={() => setTaggingDoc(null)}
        >
          Hủy
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
}