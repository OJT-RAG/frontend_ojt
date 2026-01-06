import React, { useState } from "react";
import "./DocumentManager.css";

// Import tài liệu mẫu
import SVOJT from "../../assets/TÀI LIỆU HƯỚNG DẪN SV OJT KỲ SPRING 2026.pdf";
import Email from "../../assets/GIỚI THIỆU VỀ CHƯƠNG TRÌNH HỌC KỲ OJT FPTU (ON-THE-JOB-TRAINING).pdf";

export default function DocumentManager() {
  const [search, setSearch] = useState("");

  const [documents, setDocuments] = useState([
    { id: 1, name: "Hướng dẫn SV OJT.pdf", size: "2.1 MB", url: SVOJT },
    { id: 2, name: "Mẫu email mời thực tập.docx", size: "90 KB", url: Email },
    { id: 3, name: "Quy định công ty.pdf", size: "800 KB", url: null },
  ]);

  // Upload file local
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newDoc = {
      id: Date.now(),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
      url: URL.createObjectURL(file), // Tạo link tạm để download
    };

    setDocuments([...documents, newDoc]);
  };

  // Xóa tài liệu
  const deleteDoc = (id) => {
    setDocuments(documents.filter((d) => d.id !== id));
  };

  // Tìm kiếm
  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="doc-container">
      <h2 className="doc-title">Quản lý tài liệu</h2>

      {/* Search & Upload */}
      <div className="doc-actions">
        <input
          type="text"
          className="doc-search"
          placeholder="Tìm tài liệu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <label className="upload-btn">
          Upload tài liệu
          <input type="file" style={{ display: "none" }} onChange={handleUpload} />
        </label>
      </div>

      {/* Document List */}
      <table className="doc-table">
        <thead>
          <tr>
            <th>Tên tài liệu</th>
            <th>Kích thước</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {filteredDocs.length === 0 ? (
            <tr>
              <td colSpan="3" className="no-data">
                Không tìm thấy tài liệu
              </td>
            </tr>
          ) : (
            filteredDocs.map((doc) => (
              <tr key={doc.id}>
                <td>
                  {doc.url ? (
                    <a href={doc.url} download={doc.name} className="doc-link">
                      {doc.name}
                    </a>
                  ) : (
                    doc.name
                  )}
                </td>

                <td>{doc.size}</td>

                <td>
                  <button className="delete-btn" onClick={() => deleteDoc(doc.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
