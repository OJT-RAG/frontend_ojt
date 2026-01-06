import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Jobdetail.scss';
import { JOBS } from './jobsData';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const jobId = Number(id);
  const job = JOBS.find(j => j.id === jobId);

  if (!job) {
    return (
      <div className="jd-page">
        <div className="jd-card">
          <h2>Job not found</h2>
          <div className="jd-actions">
            <button className="btn secondary" onClick={() => navigate(-1)}>Return</button>
            <button className="btn primary" onClick={() => navigate('/')}>Homepage</button>
          </div>
        </div>
      </div>
    );
  }

  const handleApply = () => {
    const key = 'appliedJobs';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    if (!current.includes(job.id)) current.push(job.id);
    localStorage.setItem(key, JSON.stringify(current));

    // Also record status for Bookmarks panel
    const STATUS_KEY = 'applyStatusMap';
    const map = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}');
    map[job.id] = 'waiting'; // default to waiting after apply
    localStorage.setItem(STATUS_KEY, JSON.stringify(map));

    // Record application meta (date + status) for CV Applications panel
    const META_KEY = 'applicationMeta';
    const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
    meta[job.id] = {
      date: new Date().toISOString(),
      status: 'waiting'
    };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    alert('Applied successfully! Your application has been sent to admin and recruiters.');
  };

  return (
    <div className="jd-page">
      <div className="jd-card">
        <header className="jd-header">
          <div className="jd-meta">
            <div className="jd-logo" aria-hidden="true">{job.company[0]}</div>
            <div className="jd-titles">
              <h1>{job.title}</h1>
              <p className="company">{job.company} • {job.location} • {job.salary}</p>
            </div>
          </div>
          <div className="jd-actions">
            <button className="btn secondary" onClick={() => navigate(-1)}>Return</button>
            <button className="btn primary" onClick={handleApply}>Apply</button>
          </div>
        </header>

        <section className="jd-section">
          <h3>Overview</h3>
          <p className="desc">{job.description}</p>
          <div className="chips">
            <span className="chip">Industry: {job.industry}</span>
            <span className={`chip ${job.difficulty.toLowerCase()}`}>Difficulty: {job.difficulty}</span>
            <span className="chip">Posted: {job.createdAt}</span>
          </div>
        </section>

        <section className="jd-grid">
          <div className="panel">
            <h3>Requirements</h3>
            <ul>
              {job.requirements.map((r, idx) => <li key={idx}>{r}</li>)}
            </ul>
          </div>
          <div className="panel">
            <h3>Benefits</h3>
            <ul>
              {job.benefits.map((b, idx) => <li key={idx}>{b}</li>)}
            </ul>
          </div>
        </section>

        <section className="panel">
          <h3>Open Levels</h3>
          <table className="levels">
            <thead>
              <tr>
                <th>Level</th>
                <th>Openings</th>
              </tr>
            </thead>
            <tbody>
              {job.levels.map((lv, idx) => (
                <tr key={idx}>
                  <td>{lv.level}</td>
                  <td>{lv.openings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
