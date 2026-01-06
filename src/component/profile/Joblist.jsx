import React, { useMemo, useState, useEffect } from 'react';
import './Joblist.scss';
import { Link } from 'react-router-dom';
import { JOBS } from './jobsData';
import { useI18n } from '../../i18n/i18n.jsx';

// Difficulty color mapping (basic badges)
const difficultyStyles = {
  Easy: 'diff-easy',
  Medium: 'diff-medium',
  Hard: 'diff-hard'
};

// Mock dataset (will be replaced by backend later)
const MOCK_JOBS = JOBS;

export default function JobList({ defaultIndustry = 'SE' }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState(defaultIndustry); // FE | IB | GD | SE
  const [sortMode, setSortMode] = useState('newest'); // newest | best
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // LocalStorage keys
  const BOOKMARK_KEY = 'bookmarkedJobs';
  const APPLY_STATUS_KEY = 'applyStatusMap'; // { [jobId]: 'applied' | 'waiting' | 'none' }

  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]'); } catch { return []; }
  });
  const [applyStatus, setApplyStatus] = useState(() => {
    try { return JSON.parse(localStorage.getItem(APPLY_STATUS_KEY) || '{}'); } catch { return {}; }
  });

  // Persist bookmark/status changes
  useEffect(() => { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarkedIds)); }, [bookmarkedIds]);
  useEffect(() => { localStorage.setItem(APPLY_STATUS_KEY, JSON.stringify(applyStatus)); }, [applyStatus]);

  // When defaultIndustry changes (from CV major), sync initial state
  useEffect(() => {
    if (defaultIndustry && !query) {
      setIndustry(defaultIndustry);
    }
  }, [defaultIndustry, query]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (industry) list = list.filter(j => j.industry === industry);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(j =>
        j.company.toLowerCase().includes(q) ||
        j.title.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }
    if (sortMode === 'newest') {
      list = [...list].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortMode === 'best') {
      // naive: easiest difficulty first then newest
      const rank = { Easy: 1, Medium: 2, Hard: 3 };
      list = [...list].sort((a,b) => rank[a.difficulty] - rank[b.difficulty] || (new Date(b.createdAt) - new Date(a.createdAt)));
    }
    return list;
  }, [jobs, industry, query, sortMode]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate fetch delay
    setTimeout(() => {
      // Placeholder: in real fetch, update jobs state from API
      setJobs(prev => [...prev]);
      setIsRefreshing(false);
    }, 800);
  };

  // Toggle bookmark for a job
  const toggleBookmark = (id) => {
    setBookmarkedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Derived: bookmarked jobs
  const bookmarkedJobs = useMemo(() => jobs.filter(j => bookmarkedIds.includes(j.id)), [jobs, bookmarkedIds]);

  // Helper: read status with fallbacks from old 'appliedJobs'
  useEffect(() => {
    // migrate: if appliedJobs exists, mark those as 'applied' when empty
    const appliedRaw = localStorage.getItem('appliedJobs');
    if (appliedRaw) {
      try {
        const arr = JSON.parse(appliedRaw);
        if (Array.isArray(arr) && arr.length) {
          setApplyStatus(prev => {
            const next = { ...prev };
            arr.forEach(id => { if (!next[id]) next[id] = 'applied'; });
            return next;
          });
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="joblist-root">
      <div className="joblist-header">
        <h2 className="joblist-title">{t('jobs_title') || 'Internship Opportunities'}</h2>
        <div className="joblist-controls">
          <button
            className="jl-bookmark-btn"
            onClick={() => setShowBookmarks(s => !s)}
            title={t('jobs_bookmark_tooltip') || 'View bookmarked jobs'}
          >
            {t('jobs_bookmark') || 'Bookmark'}
            {bookmarkedIds.length > 0 && (
              <span className="jl-bookmark-count">{bookmarkedIds.length}</span>
            )}
          </button>
          <input
            className="jl-input"
            placeholder={t('jobs_search_placeholder') || 'Search company, title, location...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="jl-select"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">{t('jobs_all_majors') || 'All'}</option>
            <option value="SE">SE</option>
            <option value="FE">FE</option>
            <option value="IB">IB</option>
            <option value="GD">GD</option>
          </select>
          <div className="jl-seg">
            <button
              className={sortMode === 'newest' ? 'active' : ''}
              onClick={() => setSortMode('newest')}
            >{t('jobs_sort_newest') || 'Newest'}</button>
            <button
              className={sortMode === 'best' ? 'active' : ''}
              onClick={() => setSortMode('best')}
            >{t('jobs_sort_best') || 'Best Match'}</button>
          </div>
          <button className="jl-refresh" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing 
              ? (t('jobs_updating') || 'Updating...') 
              : (t('jobs_update') || 'Update')}
          </button>
        </div>
      </div>

      {/* Bookmark Panel */}
      {showBookmarks && (
        <div className="bookmark-panel">
          <div className="bp-header">
            <h3>{t('jobs_bookmarks') || 'Bookmarks'}</h3>
            <button className="bp-close" onClick={() => setShowBookmarks(false)}>
              {t('close') || 'Close'}
            </button>
          </div>
          {bookmarkedJobs.length === 0 ? (
            <div className="bp-empty">{t('jobs_empty_bookmarks') || 'No saved jobs yet.'}</div>
          ) : (
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{t('admin_company_name') || 'Company'}</th>
                  <th>{t('jobs_role') || 'Role'}</th>
                  <th>{t('jobs_location') || 'Location'}</th>
                  <th>{t('cv_apps_status') || 'Status'}</th>
                  <th>{t('admin_actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {bookmarkedJobs.map(job => {
                  const status = applyStatus[job.id] || 'none';
                  return (
                    <tr key={`bm-${job.id}`}>
                      <td>{job.company}</td>
                      <td>{job.title}</td>
                      <td>{job.location}</td>
                      <td>
                        <span className={`status-badge ${status}`}>
                          {status === 'applied'
                            ? (t('jobs_status_applied') || 'Applied')
                            : status === 'waiting'
                              ? (t('jobs_status_waiting') || 'Waiting for response')
                              : (t('jobs_status_none') || 'Not applied')}
                        </span>
                      </td>
                      <td className="bp-actions">
                        <button className="bp-unsave" onClick={() => toggleBookmark(job.id)}>
                          {t('jobs_unsave') || 'Unsave'}
                        </button>
                        <Link className="bp-detail" to={`/jobs/${job.id}`}>
                          {t('detail') || 'Detail'}
                        </Link>
                        <select
                          className="bp-status-select"
                          value={applyStatus[job.id] || 'none'}
                          onChange={(e) => setApplyStatus(prev => ({ ...prev, [job.id]: e.target.value }))}
                        >
                          <option value="none">{t('jobs_status_none') || 'Not applied'}</option>
                          <option value="waiting">{t('jobs_status_waiting') || 'Waiting for response'}</option>
                          <option value="applied">{t('jobs_status_applied') || 'Applied'}</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="joblist-table-wrapper">
        <table className="joblist-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Industry</th>
              <th>Role</th>
              <th>Difficulty</th>
              <th>Salary</th>
              <th>Location</th>
              <th>Posted</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="jl-empty">No jobs found.</td>
              </tr>
            )}
            {filtered.map(job => (
              <tr key={job.id}>
                <td>{job.company}</td>
                <td>{job.industry}</td>
                <td>{job.title}</td>
                <td><span className={`jl-badge ${difficultyStyles[job.difficulty]}`}>{job.difficulty}</span></td>
                <td>{job.salary}</td>
                <td>{job.location}</td>
                <td>{job.createdAt}</td>
                <td>
                  <div className="jl-actions">
                    <Link className="jl-detail" to={`/jobs/${job.id}`}>Detail</Link>
                    <button
                      className={`jl-save ${bookmarkedIds.includes(job.id) ? 'saved' : ''}`}
                      onClick={() => toggleBookmark(job.id)}
                    >
                      {bookmarkedIds.includes(job.id) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
