import React from 'react';
import './JobManager.scss';

const JobManager = () => {
  return (
    <div className="admin-page job-manager">
      <div className="page-header">
        <h1>Jobs Overview</h1>
        <p>Monitor all job postings across the system</p>
      </div>

      <div className="card">
        <div className="filters">
          <div className="filter-group">
            <button className="chip active">All Semesters</button>
            <button className="chip">Spring 2025</button>
            <button className="chip">Fall 2024</button>
          </div>
          <div className="filter-group">
            <select>
              <option>All Companies</option>
              <option>FPT Software</option>
            </select>
            <select>
              <option>All Industries</option>
              <option>Software</option>
              <option>AI</option>
            </select>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Posted Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>React Developer</td>
              <td>FPT Software</td>
              <td>2025-02-20</td>
              <td>Active</td>
              <td><button className="btn-danger">Remove</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobManager;
