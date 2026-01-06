import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// Text/annotation layers disabled below so CSS not needed
import './pdfManager.css';

// ----------------------------------------------------
// 1. IMPORT FILE PDF ĐÃ ĐỔI TÊN
// Đảm bảo đường dẫn này khớp chính xác với thư mục assets của bạn
import samplePdf from '../../assets/Email.pdf';
const SAMPLE_PDF_URL = samplePdf;
// ----------------------------------------------------


// Configure worker via react-pdf's pdfjs wrapper
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
const PdfManager = () => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  // Xử lý khi tài liệu tải thành công
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
    setIsPdfLoaded(true);
    setLoadingError(null);
  }
  
  // Xử lý khi có lỗi tải tài liệu
  function onDocumentLoadError(error) {
    console.error("Lỗi khi tải PDF:", error);
    setLoadingError("Không thể tải tài liệu PDF. Vui lòng kiểm tra đường dẫn file và tên file.");
    setIsPdfLoaded(false);
  }
  
  // Xử lý tải xuống
  const handleDownload = () => {
    // Mở file trong tab mới để trình duyệt xử lý tải xuống
    window.open(SAMPLE_PDF_URL, '_blank');
  };

  return (
    <div className="pdf-manager-panel">
      <header className="pdf-manager-header">
        <h1>📑 Xem và Tải File PDF</h1>
      </header>
      
      <div className="pdf-controls" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          onClick={handleDownload}
          style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Tải xuống File Gốc
        </button>
        
        {/* Bộ điều khiển trang */}
        {isPdfLoaded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Trang {pageNumber} / {numPages}</p>
                <button 
                    disabled={pageNumber <= 1} 
                    onClick={() => setPageNumber(prev => prev - 1)}
                    style={{ padding: '5px 10px', cursor: 'pointer' }}
                >
                    &lt; Trước
                </button>
                <button 
                    disabled={pageNumber >= numPages} 
                    onClick={() => setPageNumber(prev => prev + 1)}
                    style={{ padding: '5px 10px', cursor: 'pointer' }}
                >
                    Sau &gt;
                </button>
            </div>
        )}
      </div>

      {/* Hiển thị lỗi nếu có */}
      {loadingError && (
        <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px' }}>
          {loadingError}
        </div>
      )}

      {/* Vùng hiển thị PDF */}
      <div className="pdf-viewer-container" style={{ border: '1px solid #ccc', overflow: 'auto', maxHeight: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <Document
          file={SAMPLE_PDF_URL}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div style={{ padding: '20px' }}>Đang tải tài liệu PDF...</div>}
          noData={<div style={{ padding: '20px' }}>Không có dữ liệu PDF để hiển thị.</div>}
        >
          {/* Component Page hiển thị trang hiện tại */}
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={false} 
            renderAnnotationLayer={false} 
            scale={1.5}
          />
        </Document>
      </div>
    </div>
  );
};

export default PdfManager;