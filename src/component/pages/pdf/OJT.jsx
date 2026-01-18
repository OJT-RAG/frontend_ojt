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
					.map((d) => ({
						id: d?.ojtDocumentId ?? d?.OjtDocumentId ?? d?.id,
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
		setPdfFailed(false);
		setPdfError('');
		setNumPages(null);
		setPage(1);
	}, [activeDoc?.id]);

	// Download helpers (robust for deployed environment)
	const forceDownload = async (url, filename) => {
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error('HTTP '+res.status);
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
				const res = await fetch(d.url);
				if (!res.ok) continue;
				let ext = 'bin';
				try {
					const u = new URL(d.url);
					const name = u.pathname.split('/').pop() || '';
					if (name.includes('.')) ext = name.split('.').pop();
				} catch {
					// ignore
				}
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
								className={`doc-btn ${activeDoc.id === d.id ? 'active' : ''}`}
								onClick={() => { setActiveDoc(d); setNumPages(null); setPage(1); setPdfFailed(false); setPdfError(''); }}
							>{d.title}</button>
						</li>
					))}
				</ul>
				)}
				{!!activeDoc && numPages && (
					<div className="ojt-nav">
						<span className="pg-info">Trang {page}/{numPages}</span>
						<div className="pg-controls">
							<button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>←</button>
							<button disabled={page>=numPages} onClick={()=>setPage(p=>p+1)}>→</button>
						</div>
						<div className="dl-group">
							<a href={activeDoc.url} download className="download-btn">Download</a>
							<button className="download-btn" onClick={()=>forceDownload(activeDoc.url, `${activeDoc.id}`)}>Force</button>
							<button className="download-btn" onClick={downloadAll}>All (.zip)</button>
						</div>
					</div>
				)}
			</div>
			<div className="ojt-viewer">
				{!activeDoc ? (
					<div className="ojt-loading">Chọn tài liệu để xem.</div>
				) : pdfFailed ? (
					<div className="ojt-loading">
						{pdfError || 'Tài liệu này không thể xem trực tiếp.'}
						<div style={{ marginTop: 12 }}>
							<a className="download-btn" href={activeDoc.url} target="_blank" rel="noreferrer">Download</a>
						</div>
					</div>
				) : (
					<Document
						file={activeDoc.url}
						onLoadSuccess={onLoadSuccess}
						loading={<div className="ojt-loading">Đang tải tài liệu...</div>}
						noData={<div className="ojt-loading">Không có dữ liệu PDF.</div>}
						error={<div className="ojt-loading">Lỗi khi tải PDF. Vui lòng thử lại.</div>}
						onLoadError={onLoadError}
					>
						<Page
							pageNumber={page}
							renderTextLayer={false}
							renderAnnotationLayer={false}
							scale={1.4}
						/>
					</Document>
				)}
			</div>
		</div>
	);
}
