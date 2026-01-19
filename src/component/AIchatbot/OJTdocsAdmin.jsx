import React, { useEffect, useMemo, useState } from "react";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import "./OJTdocsAdmin.scss";

const DEFAULT_RAG_BASE = "https://ojt-rag-python.onrender.com";

const sanitizeBaseUrl = (value) => {
	if (!value || typeof value !== "string") return "";
	return value.trim().replace(/\/$/, "");
};

const normalizeFileEntry = (entry) => {
	// Backend may return strings (resource_name) OR objects ({display_name,resource_name,...}).
	if (entry == null) return { key: "file-null", resourceName: "", label: "" };
	if (typeof entry === "string") {
		const v = entry.trim();
		return { key: v || "file", resourceName: v, label: v };
	}
	if (typeof entry === "object") {
		const displayName =
			typeof entry.display_name === "string"
				? entry.display_name
				: typeof entry.displayName === "string"
				? entry.displayName
				: "";
		const resourceName =
			typeof entry.resource_name === "string"
				? entry.resource_name
				: typeof entry.resourceName === "string"
				? entry.resourceName
				: "";

		const label = displayName || resourceName || "(unknown file)";
		const key = resourceName || displayName || JSON.stringify(entry);
		return { key, resourceName, label, raw: entry };
	}

	const fallback = String(entry);
	return { key: fallback, gcsUri: fallback, label: fallback };
};

const OJTdocsAdmin = () => {
	const [files, setFiles] = useState([]);
	const [rawFiles, setRawFiles] = useState(null);
	const [loading, setLoading] = useState(false);
	const [importing, setImporting] = useState(false);
	const [deleting, setDeleting] = useState(null);
	const [error, setError] = useState("");
	const [status, setStatus] = useState({ state: "checking", message: "" });
	const [urlInput, setUrlInput] = useState("");

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
			const data = await res.json().catch(() => ({}));
			const list = Array.isArray(data)
				? data
				: Array.isArray(data?.files)
				? data.files
				: [];
			setRawFiles(list);

			const normalized = list.map((entry) => normalizeFileEntry(entry));
			console.groupCollapsed("[RAGdocs] /list_files response");
			console.log({ url: `${baseUrl}/list_files`, count: list.length, sample: list[0] });
			console.log("raw files:", list);
			console.log("normalized files:", normalized);
			console.groupEnd();

			setFiles(normalized);
		} catch (err) {
			setError(err.message || "Failed to load files");
		} finally {
			setLoading(false);
		}
	};

	const handleImport = async (event) => {
		event.preventDefault();
		if (!urlInput.trim()) {
			setError("Vui lòng nhập URL");
			return;
		}
		setImporting(true);
		setError("");
		try {
			const url = `${baseUrl}/import_pdf?url=${encodeURIComponent(urlInput.trim())}`;
			const res = await fetch(url, { method: "POST" });
			const text = await res.text();
			let payload = null;
			try {
				payload = text ? JSON.parse(text) : null;
			} catch {
				payload = null;
			}
			if (!res.ok) {
				console.error("Import failed", res.status, res.statusText, text);
				throw new Error(text || `HTTP ${res.status}`);
			}
			console.groupCollapsed("[RAGdocs] /import_pdf response");
			console.log({ url, status: res.status, payload: payload ?? text });
			console.groupEnd();
			setUrlInput("");
			await loadFiles();
			const successText =
				payload?.message || payload?.title || "Upload tài liệu thành công";
			Toastify({
				text: successText,
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

	const handleDelete = async (file) => {
		const resourceName = typeof file === "string" ? file : file?.resourceName;
		if (!resourceName) {
			console.error("Delete failed: missing resource_name", file);
			setError("Missing resource_name for delete");
			return;
		}
		setDeleting(resourceName);
		setError("");
		try {
			const url = `${baseUrl}/delete_file?resource_name=${encodeURIComponent(resourceName)}`;
			const res = await fetch(url, { method: "DELETE" });
			const text = await res.text();
			let payload = null;
			try {
				payload = text ? JSON.parse(text) : null;
			} catch {
				payload = null;
			}
			if (!res.ok) {
				console.error("Delete failed", res.status, res.statusText, text);
				throw new Error(text || `HTTP ${res.status}`);
			}
			console.groupCollapsed("[RAGdocs] /delete_file response");
			console.log({ url, status: res.status, payload: payload ?? text });
			console.groupEnd();
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
					{Array.isArray(rawFiles) && rawFiles.length > 0 && files.length === 0 && (
						<div className="alert">
							Unexpected file format from API. Check console logs.
						</div>
					)}

					<div className="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>File / resource_name</th>
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
									<tr key={file.key}>
										<td>
											<code className="code-chip">{file.label}</code>
										</td>
										<td>
											<button
												className="btn danger"
												onClick={() => handleDelete(file)}
												disabled={deleting === file.resourceName}
											>
												{deleting === file.resourceName ? "Deleting..." : "Delete"}
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
						<label htmlFor="url">Add PDF/docs URL</label>
						<input
							id="url"
							type="text"
							placeholder="https://drive.google.com/..."
							value={urlInput}
							onChange={(e) => setUrlInput(e.target.value)}
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
