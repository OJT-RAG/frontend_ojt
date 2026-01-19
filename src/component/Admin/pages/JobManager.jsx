import React from "react";
import JobManagement from "../../companyRep/JobManage/JobManagement";
import "./JobManager.scss";

const JobManager = () => {
  return (
    <div className="admin-page job-manager">
      <JobManagement variant="admin" />
    </div>
  );
};

export default JobManager;
