import React from 'react';
import './CompanyManager.scss';

const CompanyManager = () => {
  return (
    <div className="admin-page company-manager">
      <div className="page-header">
        <h1>Company Management</h1>
        <p>Approve and manage participating companies</p>
      </div>

      <div className="card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Tax Code</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>FPT Software</td>
              <td>0101234567</td>
              <td><span className="badge success">Approved</span></td>
              <td><button>Details</button></td>
            </tr>
            <tr>
              <td>Tech Startup Inc</td>
              <td>0109876543</td>
              <td><span className="badge warning">Pending</span></td>
              <td>
                <button className="btn-success">Approve</button>
                <button className="btn-danger">Reject</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompanyManager;
