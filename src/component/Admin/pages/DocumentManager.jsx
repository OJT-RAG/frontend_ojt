import React from 'react';
import './DocumentManager.scss';

const DocumentManager = () => {
  return (
    <div className="admin-page document-manager">
      <div className="page-header">
        <h1>Document Management</h1>
        <p>Manage university documents and templates</p>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <button className="btn-primary">Upload New Document</button>
          </div>
          <div className="toolbar-right">
            <button className="chip active">All</button>
            <button className="chip">Guides</button>
            <button className="chip">Templates</button>
          </div>
        </div>

        <div className="document-list">
          <div className="doc-item">
            <div className="doc-icon">PDF</div>
            <div className="doc-info">
              <h4>OJT Guide Spring 2025</h4>
              <p>Tags: #guide #spring2025</p>
            </div>
            <div className="doc-actions">
              <button className="btn-secondary">Download</button>
              <button className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;
