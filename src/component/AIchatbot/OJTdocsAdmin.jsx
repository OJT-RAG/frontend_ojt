import React, { useEffect, useMemo, useState } from "react";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import "./OJTdocsAdmin.scss";

const DEFAULT_RAG_BASE = "https://ojt-rag-python.onrender.com";

const sanitizeBaseUrl = (value) => {
	if (!value || typeof value !== "string") return "";
	return value.trim().replace(/\/$/, "");
};

const OJTdocsAdmin = () => {
	const [files, setFiles] = useState([]);
	const [loading, setLoading] = useState(false);
	const [importing, setImporting] = useState(false);
	const [deleting, setDeleting] = useState(null);
	const [error, setError] = useState("");
	const [status, setStatus] = useState({ state: "checking", message: "" });
	const [gcsUri, setGcsUri] = useState("");

	const baseUrl = useMemo(() => {
		const env = process.env.REACT_APP_RAG_API_BASE_URL;
		return sanitizeBaseUrl(env || DEFAULT_RAG_BASE);
	}, []);

	const fetchStatus = async () => {
		try {
			const res = await fetch(`${baseUrl}/status`);
			const payload = await res.json().catch(() => ({}));
			setStatus({
				state: res.ok ? "online" : "offline",
				message: payload?.status || payload?.message || res.statusText,
			});
		} catch (err) {
			console.error("Status check failed", err);
			setStatus({ state: "offline", message: err.message });
		}
	};

	const loadFiles = async () => {
		setLoading(true);
		setError("");
		try {
			const res = await fetch(`${baseUrl}/list_files`);
			if (!res.ok) {
				const text = await res.text();
				console.error("List files failed", res.status, res.statusText, text);
				throw new Error(text || `HTTP ${res.status}`);
			}
			const data = await res.json();
			setFiles(Array.isArray(data?.files) ? data.files : []);
		} catch (err) {
			setError(err.message || "Failed to load files");
		} finally {
			setLoading(false);
		}
	};

	const handleImport = async (event) => {
		event.preventDefault();
		if (!gcsUri.trim()) {
			setError("Vui lòng nhập link (gcs_uri)");
			return;
		}
		setImporting(true);
		setError("");
		try {
			const url = `${baseUrl}/import_pdf?gcs_uri=${encodeURIComponent(gcsUri.trim())}`;
			const res = await fetch(url, { method: "POST" });
			const text = await res.text();
			if (!res.ok) {
				console.error("Import failed", res.status, res.statusText, text);
				throw new Error(text || `HTTP ${res.status}`);
			}
			setGcsUri("");
			await loadFiles();
			Toastify({
				text: "Upload tài liệu thành công",
				duration: 1000,
				gravity: "top",
				position: "right",
				close: true,
				style: {
					background: "#16a34a",
					color: "#fff",
					fontWeight: "700",
				},
			}).showToast();
		} catch (err) {
			setError(err.message || "Failed to import PDF");
		} finally {
			setImporting(false);
		}
	};

	const handleDelete = async (fileId) => {
		setDeleting(fileId);
		setError("");
		try {
			const url = `${baseUrl}/delete_file?gcs_uri=${encodeURIComponent(fileId)}`;
			const res = await fetch(url, { method: "DELETE" });
			const text = await res.text();
			if (!res.ok) {
				console.error("Delete failed", res.status, res.statusText, text);
				throw new Error(text || `HTTP ${res.status}`);
			}
			await loadFiles();
		} catch (err) {
			setError(err.message || "Failed to delete file");
		} finally {
			setDeleting(null);
		}
	};

	useEffect(() => {
		fetchStatus();
		loadFiles();
		const timer = setInterval(fetchStatus, 60000);
		return () => clearInterval(timer);
	}, []);

	return (
		<div className="ragdocs-page">
			<div className="ragdocs-hero">
				<div>
					<p className="eyebrow">RAGdocs Manage</p>
					<h1>Quản lý tài liệu RAG</h1>
					<p className="sub">CRUD tài liệu mà AI chatbot sử dụng để trả lời.</p>
				</div>
				<div className={`status-chip ${status.state}`}>
					<span className="dot" />
					<span>{status.message || status.state}</span>
				</div>
			</div>

			<div className="ragdocs-grid">
				<div className="card">
					<div className="card-header">
						<div>
							<h3>Danh sách tài liệu</h3>
							<p className="muted">Các file mà RAG đang index.</p>
						</div>
						<button className="btn ghost" onClick={loadFiles} disabled={loading}>
							{loading ? "Đang tải..." : "Refresh"}
						</button>
					</div>

					{error && <div className="alert">{error}</div>}

					<div className="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>File ID / gcs_uri</th>
									<th style={{ width: "140px" }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{files.length === 0 && (
									<tr>
										<td colSpan={2} className="empty">Không có file nào.</td>
									</tr>
								)}
								{files.map((file) => (
									<tr key={file}>
										<td>
											<code className="code-chip">{file}</code>
										</td>
										<td>
											<button
												className="btn danger"
												onClick={() => handleDelete(file)}
												disabled={deleting === file}
											>
												{deleting === file ? "Deleting..." : "Delete"}
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				<div className="card">
					<div className="card-header">
						<div>
							<h3>Import tài liệu</h3>
							<p className="muted">Dán link (gcs_uri) để RAG index PDF/docs.</p>
						</div>
					</div>

					<form className="import-form" onSubmit={handleImport}>
						<label htmlFor="gcs_uri">Add PDF/docs</label>
						<input
							id="gcs_uri"
							type="text"
							placeholder="https://drive.google.com/..."
							value={gcsUri}
							onChange={(e) => setGcsUri(e.target.value)}
							disabled={importing}
						/>
						<button className="btn primary" type="submit" disabled={importing}>
							{importing ? "Đang import..." : "Import"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default OJTdocsAdmin;
