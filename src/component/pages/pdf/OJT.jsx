import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import './OJT.scss';

import ojtDocumentApi from '../../API/OjtDocumentAPI';

// Configure pdf.js worker via react-pdf's pdfjs wrapper
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function OJT() {
	const [docs, setDocs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const [activeDoc, setActiveDoc] = useState(null);
	const [numPages, setNumPages] = useState(null);
	const [page, setPage] = useState(1);
	const [pdfFailed, setPdfFailed] = useState(false);
	const [pdfError, setPdfError] = useState('');
	const [pdfFile, setPdfFile] = useState(null);
	const [pdfLoading, setPdfLoading] = useState(false);
	const [pdfDebug, setPdfDebug] = useState(null);
	const [pdfObjectUrl, setPdfObjectUrl] = useState('');
	const [embedUrl, setEmbedUrl] = useState('');
	const [downloadUrlOverride, setDownloadUrlOverride] = useState('');

	const getDocId = (doc) => {
		const extractFromObject = (obj) => {
			if (!obj || typeof obj !== 'object') return null;

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
				if (s !== '') return value;
			}

			try {
				const keys = Object.keys(obj);
				const normalized = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
				const wanted = new Set(['ojtdocumentid', 'documentid', 'id']);
				for (const k of keys) {
					if (!wanted.has(normalized(k))) continue;
					const value = obj[k];
					if (value == null) continue;
					const n = Number(value);
					if (Number.isFinite(n) && n > 0) return n;
					const s = String(value).trim();
					if (s !== '') return value;
				}
			} catch {
				// ignore
			}

			return null;
		};

		return (
			extractFromObject(doc) ||
			extractFromObject(doc?.ojtDocument) ||
			extractFromObject(doc?.OjtDocument) ||
			extractFromObject(doc?.data) ||
			null
		);
	};

	const getGoogleDriveFileId = (url) => {
		if (!url) return '';
		try {
			const u = new URL(url);
			if (!/drive\.google\.com$/i.test(u.hostname)) return '';
			const byQuery = u.searchParams.get('id');
			if (byQuery) return byQuery;
			const m = u.pathname.match(/\/file\/d\/([^/]+)/i);
			return m?.[1] || '';
		} catch {
			const m = String(url).match(/drive\.google\.com\/file\/d\/([^/]+)/i);
			return m?.[1] || '';
		}
	};

	const getDocLinks = (url) => {
		const fileId = getGoogleDriveFileId(url);
		if (!fileId) return { mode: 'pdfjs', previewUrl: url, downloadUrl: url };
		return {
			mode: 'drive',
			previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
			downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
		};
	};

	const resetPdfState = () => {
		setPdfFailed(false);
		setPdfError('');
		setNumPages(null);
		setPage(1);
		setPdfFile(null);
		setPdfDebug(null);
		setPdfLoading(false);
		setEmbedUrl('');
		setDownloadUrlOverride('');
		setPdfObjectUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return '';
		});
	};

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setError('');
			try {
				const res = await ojtDocumentApi.getAll();
				const list = res?.data?.data || [];
				const normalized = (Array.isArray(list) ? list : [])
					.filter((d) => !!d?.isGeneral) // public OJT Docs only shows general documents
					.map((d, idx) => ({
						id: getDocId(d) ?? d?.fileUrl ?? `${idx}`,
						title: d?.title || '(untitled)',
						url: d?.fileUrl,
						isGeneral: !!d?.isGeneral,
						semesterId: d?.semesterId,
					}))
					.filter((d) => !!d.url);

				normalized.sort((a, b) => {
					const aNum = Number(a.id);
					const bNum = Number(b.id);
					if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
					return String(a.title).localeCompare(String(b.title));
				});

				if (cancelled) return;
				setDocs(normalized);
				setActiveDoc(normalized[0] || null);
				setNumPages(null);
				setPage(1);
				setPdfFailed(false);
				setPdfError('');
			} catch (e) {
				if (cancelled) return;
				setDocs([]);
				setActiveDoc(null);
				setError(e?.response?.data?.message || e?.message || 'Failed to load documents');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		// When switching documents, retry PDF preview.
		resetPdfState();
	}, [activeDoc?.id]);

	useEffect(() => {
		let cancelled = false;
		const toAsciiPreview = (uint8) => {
			try {
				const slice = uint8?.slice?.(0, 200) || uint8;
				return new TextDecoder('utf-8', { fatal: false }).decode(slice);
			} catch {
				return '';
			}
		};

		const looksLikePdf = (uint8) => {
			if (!uint8 || uint8.length < 5) return false;
			return (
				uint8[0] === 0x25 && // %
				uint8[1] === 0x50 && // P
				uint8[2] === 0x44 && // D
				uint8[3] === 0x46 && // F
				uint8[4] === 0x2d // -
			);
		};

		const loadPdfPreview = async () => {
			if (!activeDoc?.url && !activeDoc?.id) return;

			const links = getDocLinks(activeDoc?.url);
			if (links.mode === 'drive') {
				// Google Drive "view" links return HTML, not a PDF. Use Drive's embedded preview.
				setEmbedUrl(links.previewUrl);
				setDownloadUrlOverride(links.downloadUrl);
				setPdfLoading(false);
				setPdfFailed(false);
				setPdfError('');
				setPdfFile(null);
				setPdfDebug({
					docId: activeDoc?.id,
					title: activeDoc?.title,
					url: activeDoc?.url,
					mode: 'drive',
					previewUrl: links.previewUrl,
					downloadUrl: links.downloadUrl,
					timestamp: new Date().toISOString(),
				});
				return;
			}

			setPdfLoading(true);
			setPdfFailed(false);
			setPdfError('');
			setPdfDebug(null);
			setPdfFile(null);

			const debugBase = {
				docId: activeDoc?.id,
				title: activeDoc?.title,
				url: activeDoc?.url,
				timestamp: new Date().toISOString(),
			};

			// 1) Preferred: hit backend download endpoint (includes Bearer token via axios interceptor)
			if (activeDoc?.id != null) {
				try {
					const res = await ojtDocumentApi.download(activeDoc.id);
					const blob = res?.data;
					const size = blob?.size ?? 0;
					const type = blob?.type || '';
					const headBuf = await blob.slice(0, 256).arrayBuffer();
					const head = new Uint8Array(headBuf);
					const headAscii = toAsciiPreview(head);
					const debug = {
						...debugBase,
						path: 'download(id)',
						blobType: type,
						blobSize: size,
						headAscii,
						looksLikePdf: looksLikePdf(head),
					};
					console.groupCollapsed('[OJT PDF] download(id) preview');
					console.log(debug);
					console.groupEnd();
					if (cancelled) return;

					if (!looksLikePdf(head)) {
						setPdfDebug(debug);
						throw new Error('Downloaded content does not look like a PDF (missing %PDF- header).');
					}

					const objectUrl = URL.createObjectURL(blob);
					setPdfObjectUrl((prev) => {
						if (prev) URL.revokeObjectURL(prev);
						return objectUrl;
					});
					setPdfDebug(debug);
					setPdfFile(blob);
					setPdfLoading(false);
					return;
				} catch (e) {
					if (cancelled) return;
					console.warn('[OJT PDF] download(id) failed, falling back to direct URL', e);
					setPdfDebug((prev) => ({
						...(prev || debugBase),
						path: 'download(id)',
						axiosError: e?.response?.data || e?.message || String(e),
					}));
				}
			}

			// 2) Fallback: fetch the direct fileUrl and validate response
			if (!activeDoc?.url) {
				setPdfFailed(true);
				setPdfError('Missing file URL for this document.');
				setPdfLoading(false);
				return;
			}
			setDownloadUrlOverride(activeDoc.url);
			try {
				const res = await fetch(activeDoc.url, {
					method: 'GET',
					headers: { Accept: 'application/pdf,*/*' },
				});
				const contentType = res.headers.get('content-type') || '';
				const contentLength = res.headers.get('content-length') || '';
				const buf = await res.arrayBuffer();
				const bytes = new Uint8Array(buf);
				const headAscii = toAsciiPreview(bytes);
				const debug = {
					...debugBase,
					path: 'fetch(url)',
					status: res.status,
					ok: res.ok,
					contentType,
					contentLength,
					byteLength: buf?.byteLength || 0,
					headAscii,
					looksLikePdf: looksLikePdf(bytes),
				};
				console.groupCollapsed('[OJT PDF] fetch(url) preview');
				console.log(debug);
				console.groupEnd();
				if (cancelled) return;

				setPdfDebug(debug);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				if (!looksLikePdf(bytes)) {
					throw new Error(
						`Response is not a valid PDF. content-type=${contentType || '(none)'}; head=${JSON.stringify(headAscii)}`
					);
				}

				setPdfFile({ data: buf });
				setPdfLoading(false);
			} catch (e) {
				if (cancelled) return;
				setPdfFailed(true);
				setPdfError(e?.message || 'Failed to load PDF preview.');
				setPdfLoading(false);
				console.error('[OJT PDF] preview failed', e);
			}
		};

		loadPdfPreview();
		return () => {
			cancelled = true;
		};
	}, [activeDoc?.id, activeDoc?.url]);

	// Download helpers (robust for deployed environment)
	const forceDownload = async (url, filename) => {
		try {
			// Prefer already fetched blob (auth-safe), then objectUrl, then raw url
			if (pdfObjectUrl) {
				const a = document.createElement('a');
				a.href = pdfObjectUrl;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				a.remove();
				return;
			}
			const res = await fetch(url, { headers: { Accept: 'application/pdf,*/*' } });
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const blob = await res.blob();
			const objectUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = objectUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(objectUrl);
		} catch (e) {
			console.error('Download failed', e);
			alert('Download failed. Please try again later.');
		}
	};

	const downloadAll = async () => {
		try {
			const [{ default: JSZip }, { saveAs }] = await Promise.all([
				import('jszip'),
				import('file-saver')
			]);
			const zip = new JSZip();
			for (const d of docs) {
				const links = getDocLinks(d.url);
				const res = await fetch(links.downloadUrl);
				if (!res.ok) continue;
				let ext = 'bin';
				try {
					const u = new URL(links.downloadUrl);
					const name = u.pathname.split('/').pop() || '';
					if (name.includes('.')) ext = name.split('.').pop();
				} catch {
					// ignore
				}
				if (ext === 'bin') ext = 'pdf';
				const safeTitle = String(d.title || 'document').replace(/[\\/:*?"<>|]/g, '').trim() || 'document';
				zip.file(`${d.id}-${safeTitle}.${ext}`, await res.blob());
			}
			const blob = await zip.generateAsync({ type: 'blob' });
			saveAs(blob, 'ojt-documents.zip');
		} catch (e) {
			console.error('Zip download failed', e);
			alert('Zip download failed.');
		}
	};

	const onLoadSuccess = ({ numPages }) => {
		setPdfFailed(false);
		setPdfError('');
		setNumPages(numPages);
		setPage(1);
	};

	const onLoadError = (e) => {
		setPdfFailed(true);
		setNumPages(null);
		setPdfError(e?.message || 'Không thể xem trực tiếp.');
		console.error('PDF Load Error:', e);
	};

	const onSourceError = (e) => {
		setPdfFailed(true);
		setNumPages(null);
		setPdfError(e?.message || 'PDF source error.');
		console.error('PDF Source Error:', e);
	};

	const effectiveDownloadUrl = downloadUrlOverride || pdfObjectUrl || activeDoc?.url || '';

	return (
		<div className="ojt-page">
			<div className="ojt-sidebar">
				<h2 className="ojt-heading">OJT Documents</h2>
				{loading ? (
					<div className="ojt-loading">Đang tải tài liệu...</div>
				) : error ? (
					<div className="ojt-loading">{error}</div>
				) : docs.length === 0 ? (
					<div className="ojt-loading">Không có tài liệu.</div>
				) : (
				<ul className="ojt-doc-list">
					{docs.map(d => (
						<li key={d.id}>
							<button
								className={`doc-btn ${activeDoc?.id === d.id ? 'active' : ''}`}
								onClick={() => { setActiveDoc(d); setNumPages(null); setPage(1); setPdfFailed(false); setPdfError(''); }}
							>{d.title}</button>
						</li>
					))}
				</ul>
				)}
				{!!activeDoc && (
					<div className="ojt-nav">
						{numPages ? (
							<>
								<span className="pg-info">Trang {page}/{numPages}</span>
								<div className="pg-controls">
									<button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>←</button>
									<button disabled={page>=numPages} onClick={()=>setPage(p=>p+1)}>→</button>
								</div>
							</>
						) : (
							<span className="pg-info">&nbsp;</span>
						)}
						<div className="dl-group">
							<a
								href={effectiveDownloadUrl || activeDoc.url}
								target="_blank"
								rel="noreferrer"
								className="download-btn"
							>
								Download
							</a>
							<button className="download-btn" onClick={()=>forceDownload(effectiveDownloadUrl || activeDoc.url, `${activeDoc.id || 'document'}`)}>Force</button>
							<button className="download-btn" onClick={downloadAll}>All (.zip)</button>
						</div>
					</div>
				)}
			</div>
			<div className="ojt-viewer">
				{!activeDoc ? (
					<div className="ojt-loading">Chọn tài liệu để xem.</div>
				) : pdfLoading ? (
					<div className="ojt-loading">Đang tải PDF preview...</div>
				) : pdfFailed ? (
					<div className="ojt-loading">
						{pdfError || 'Tài liệu này không thể xem trực tiếp.'}
						<div style={{ marginTop: 12 }}>
							<a className="download-btn" href={effectiveDownloadUrl || activeDoc.url} target="_blank" rel="noreferrer">Download</a>
						</div>
						{pdfDebug && (
							<pre style={{
								marginTop: 12,
								textAlign: 'left',
								maxWidth: 900,
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
								opacity: 0.9,
								background: 'rgba(0,0,0,0.03)',
								padding: 12,
								borderRadius: 8,
							}}>
								{JSON.stringify(pdfDebug, null, 2)}
							</pre>
						)}
					</div>
				) : (
					embedUrl ? (
						<iframe
							title={activeDoc?.title || 'PDF Preview'}
							src={embedUrl}
							style={{ width: '100%', height: '80vh', border: 'none', borderRadius: 8 }}
							allow="autoplay"
						/>
					) : (
						<Document
							file={pdfFile || activeDoc.url}
							onLoadSuccess={onLoadSuccess}
							loading={<div className="ojt-loading">Đang tải tài liệu...</div>}
							noData={<div className="ojt-loading">Không có dữ liệu PDF.</div>}
							error={<div className="ojt-loading">Lỗi khi tải PDF. Vui lòng thử lại.</div>}
							onLoadError={onLoadError}
							onSourceError={onSourceError}
						>
							<Page
								pageNumber={page}
								renderTextLayer={false}
								renderAnnotationLayer={false}
								scale={1.4}
							/>
						</Document>
					)
				)}
			</div>
		</div>
	);
}
