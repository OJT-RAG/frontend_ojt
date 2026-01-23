import React, { useEffect, useMemo, useState } from "react";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import "./OJTdocsAdmin.scss";

const DEFAULT_RAG_BASE = "https://trongnhan312-ojt-rag-bot.hf.space";
const RAGDOCS_URL_MAP_KEY = "ragdocs_import_url_map_v1";

const isProbablyUrl = (value) => {
	if (typeof value !== "string") return false;
	const v = value.trim().toLowerCase();
	return v.startsWith("http://") || v.startsWith("https://");
};

const loadImportUrlMap = () => {
	try {
		const raw = localStorage.getItem(RAGDOCS_URL_MAP_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const saveImportUrlMap = (list) => {
	try {
		localStorage.setItem(RAGDOCS_URL_MAP_KEY, JSON.stringify(list));
	} catch {
		// ignore
	}
};

const rememberImportUrl = ({ label, url }) => {
	const safeLabel = typeof label === "string" ? label.trim() : "";
	const safeUrl = typeof url === "string" ? url.trim() : "";
	if (!safeLabel || !safeUrl) return;
	const current = loadImportUrlMap();
	const next = [
		{ label: safeLabel, url: safeUrl, savedAt: Date.now() },
		...current.filter((x) => x?.label !== safeLabel),
	].slice(0, 200);
	saveImportUrlMap(next);
};

const findImportUrlForLabel = (label) => {
	const safeLabel = typeof label === "string" ? label.trim() : "";
	if (!safeLabel) return "";
	const current = loadImportUrlMap();
	const hit = current.find((x) => x?.label === safeLabel && typeof x?.url === "string");
	return hit?.url?.trim() || "";
};

const sanitizeBaseUrl = (value) => {
	if (!value || typeof value !== "string") return "";
	return value.trim().replace(/\/$/, "");
};

const normalizeFileEntry = (entry) => {
	// Backend may return strings (resource_name) OR objects ({display_name,resource_name,...}).
	if (entry == null) return { key: "file-null", resourceName: "", label: "" };
	if (typeof entry === "string") {
		const v = entry.trim();
		return { key: v || "file", resourceName: v, label: v, rawResourceName: v };
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
		const urlCandidate =
			typeof entry.url === "string"
				? entry.url
				: typeof entry.source_url === "string"
				? entry.source_url
				: typeof entry.sourceUrl === "string"
				? entry.sourceUrl
				: "";

		const label = displayName || resourceName || "(unknown file)";
		const key = resourceName || displayName || JSON.stringify(entry);
		return {
			key,
			resourceName,
			rawResourceName: resourceName,
			label,
			url: urlCandidate,
			raw: entry,
		};
	}

	const fallback = String(entry);
	return { key: fallback, resourceName: fallback, label: fallback };
};

const extractApiMessage = (payload, textFallback, defaultMessage) => {
	if (typeof payload === "string" && payload.trim()) return payload.trim();
	if (payload && typeof payload === "object") {
		const msg = payload?.message || payload?.detail || payload?.status;
		if (typeof msg === "string" && msg.trim()) return msg.trim();
	}
	if (typeof textFallback === "string" && textFallback.trim()) return textFallback.trim();
	return defaultMessage;
};

const OJTdocsAdmin = () => {
	const [files, setFiles] = useState([]);
	const [rawFiles, setRawFiles] = useState(null);
	const [loading, setLoading] = useState(false);
	const [importing, setImporting] = useState(false);
	const [deleting, setDeleting] = useState(null);
	const [error, setError] = useState("");
	const [urlInput, setUrlInput] = useState("");

	const baseUrl = useMemo(() => {
		const env = process.env.REACT_APP_RAG_API_BASE_URL;
		return sanitizeBaseUrl(env || DEFAULT_RAG_BASE);
	}, []);

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

			const normalized = list.map((entry) => {
				const file = normalizeFileEntry(entry);
				const urlFromApi = typeof file.url === "string" ? file.url.trim() : "";
				const mappedUrl = findImportUrlForLabel(file.label);
				const deleteKey =
					(urlFromApi && isProbablyUrl(urlFromApi))
						? urlFromApi
						: (mappedUrl && isProbablyUrl(mappedUrl))
						? mappedUrl
						: file.resourceName;
				return { ...file, deleteKey, mappedUrl };
			});
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
		const inputUrl = urlInput.trim();
		if (!inputUrl) {
			setError("Vui lòng nhập URL");
			return;
		}
		setImporting(true);
		setError("");
		try {
			const url = `${baseUrl}/import_pdf?url=${encodeURIComponent(inputUrl)}`;
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
			const title = typeof payload?.title === "string" ? payload.title.trim() : "";
			if (title) {
				rememberImportUrl({ label: title, url: inputUrl });
			}
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
		let deleteKey =
			typeof file === "string"
				? file
				: typeof file?.deleteKey === "string"
				? file.deleteKey
				: file?.resourceName;
		deleteKey = typeof deleteKey === "string" ? deleteKey.trim() : "";
		if (!deleteKey) {
			console.error("Delete failed: missing resource_name", file);
			setError("Missing resource_name for delete");
			return;
		}

		// If we don't know the original URL yet, ask once and remember it.
		if (!isProbablyUrl(deleteKey) && typeof file === "object" && file?.label) {
			const maybeUrl = window.prompt(
				"Không tìm thấy link gốc để xóa. Dán URL Google Drive đã dùng để import (sẽ lưu lại để lần sau bấm Delete không cần nhập):",
				""
			);
			if (typeof maybeUrl === "string" && maybeUrl.trim() && isProbablyUrl(maybeUrl)) {
				rememberImportUrl({ label: file.label, url: maybeUrl.trim() });
				deleteKey = maybeUrl.trim();
			}
		}

		const ok = window.confirm(`Delete this file?\n\n${deleteKey}`);
		if (!ok) return;
		setDeleting(deleteKey);
		setError("");
		try {
			const url = `${baseUrl}/delete_file?resource_name=${encodeURIComponent(deleteKey)}`;
			const res = await fetch(url, {
				method: "DELETE",
				headers: {
					Accept: "application/json",
				},
			});
			const text = await res.text();
			let payload = null;
			try {
				payload = text ? JSON.parse(text) : null;
			} catch {
				payload = null;
			}
			if (!res.ok) {
				console.error("Delete failed", res.status, res.statusText, text);
				throw new Error(extractApiMessage(payload, text, `HTTP ${res.status}`));
			}
			console.groupCollapsed("[RAGdocs] /delete_file response");
			console.log({ url, status: res.status, payload: payload ?? text });
			console.groupEnd();
			await loadFiles();
			Toastify({
				text: extractApiMessage(payload, text, "Delete thành công"),
				duration: 1000,
				gravity: "top",
				position: "right",
				close: true,
				style: {
					background: "#dc2626",
					color: "#fff",
					fontWeight: "700",
				},
			}).showToast();
		} catch (err) {
			setError(err.message || "Failed to delete file");
		} finally {
			setDeleting(null);
		}
	};

	useEffect(() => {
		loadFiles();
	}, []);

	return (
		<div className="ragdocs-page">
			<div className="ragdocs-hero">
				<div>
					<p className="eyebrow">RAGdocs Manage</p>
					<h1>Quản lý tài liệu RAG</h1>
					<p className="sub">CRUD tài liệu mà AI chatbot sử dụng để trả lời.</p>
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
											<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
												<code className="code-chip">{file.label}</code>
												{typeof file.deleteKey === "string" && file.deleteKey.trim() && (
													<div className="muted" style={{ wordBreak: "break-all" }}>
														Delete key: <code>{file.deleteKey}</code>
													</div>
												)}
											</div>
										</td>
										<td>
											<button
												className="btn danger"
												onClick={() => handleDelete(file)}
												disabled={deleting === file.deleteKey}
											>
												{deleting === file.deleteKey ? "Deleting..." : "Delete"}
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
							<p className="muted">Dán URL để RAG index PDF/docs.</p>
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
