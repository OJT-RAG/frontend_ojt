import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import './OJT.scss';

import introPdf from '../../assets/GIỚI THIỆU VỀ CHƯƠNG TRÌNH HỌC KỲ OJT FPTU (ON-THE-JOB-TRAINING).pdf';
import guidePdf from '../../assets/TÀI LIỆU HƯỚNG DẪN SV OJT KỲ SPRING 2026.pdf';

// Configure pdf.js worker via react-pdf's pdfjs wrapper
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const docs = [
	{ id: 'intro', title: 'Giới thiệu chương trình OJT FPTU', file: introPdf },
	{ id: 'guide', title: 'Tài liệu hướng dẫn SV OJT kỳ Spring 2026', file: guidePdf }
];

export default function OJT() {
	const [activeDoc, setActiveDoc] = useState(docs[0]);
	const [numPages, setNumPages] = useState(null);
	const [page, setPage] = useState(1);

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
				const res = await fetch(d.file);
				if (!res.ok) continue;
				zip.file(`${d.id}.pdf`, await res.blob());
			}
			const blob = await zip.generateAsync({ type: 'blob' });
			saveAs(blob, 'ojt-documents.zip');
		} catch (e) {
			console.error('Zip download failed', e);
			alert('Zip download failed.');
		}
	};

	const onLoadSuccess = ({ numPages }) => { setNumPages(numPages); setPage(1); };

	return (
		<div className="ojt-page">
			<div className="ojt-sidebar">
				<h2 className="ojt-heading">OJT Documents</h2>
				<ul className="ojt-doc-list">
					{docs.map(d => (
						<li key={d.id}>
							<button
								className={`doc-btn ${activeDoc.id === d.id ? 'active' : ''}`}
								onClick={() => { setActiveDoc(d); setNumPages(null); setPage(1); }}
							>{d.title}</button>
						</li>
					))}
				</ul>
				{numPages && (
					<div className="ojt-nav">
						<span className="pg-info">Trang {page}/{numPages}</span>
						<div className="pg-controls">
							<button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>←</button>
							<button disabled={page>=numPages} onClick={()=>setPage(p=>p+1)}>→</button>
						</div>
						<div className="dl-group">
							<a href={activeDoc.file} download className="download-btn">Download</a>
							<button className="download-btn" onClick={()=>forceDownload(activeDoc.file, `${activeDoc.id}.pdf`)}>Force</button>
							<button className="download-btn" onClick={downloadAll}>All (.zip)</button>
						</div>
					</div>
				)}
			</div>
			<div className="ojt-viewer">
				<Document
					file={activeDoc.file}
					onLoadSuccess={onLoadSuccess}
					loading={<div className="ojt-loading">Đang tải tài liệu...</div>}
					noData={<div className="ojt-loading">Không có dữ liệu PDF.</div>}
					error={<div className="ojt-loading">Lỗi khi tải PDF. Vui lòng thử lại.</div>}
					onLoadError={(e)=>console.error('PDF Load Error:', e)}
				>
					<Page
						pageNumber={page}
						renderTextLayer={false}
						renderAnnotationLayer={false}
						scale={1.4}
					/>
				</Document>
			</div>
		</div>
	);
}
