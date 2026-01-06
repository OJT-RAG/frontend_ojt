import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './CV.scss';
import fptBadge from '../assets/fpt.png';
import { useI18n } from '../../i18n/i18n.jsx';
import userApi from '../API/UserAPI.js';

function CV({ student }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  // Remove internal panel state; CV now only shows profile info.

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (student) {
        setProfile(student);
        return;
      }

      let authUser = null;
      try {
        authUser = JSON.parse(localStorage.getItem('authUser') || 'null');
      } catch {
        authUser = null;
      }

      const userId = Number(authUser?.id) || 0;
      if (!userId) {
        setProfile(null);
        return;
      }

      try {
        const res = await userApi.getById(userId);
        const u = res?.data?.data ?? res?.data ?? null;
        if (cancelled) return;
        setProfile(u);
      } catch {
        if (cancelled) return;
        setProfile(null);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [student]);

  const data = useMemo(() => {
    // If parent passes legacy shape (already in CV format), accept it.
    if (profile && (profile.name || profile.studentNumber)) {
      return {
        name: profile.name || '-',
        major: profile.major || '-',
        studentNumber: profile.studentNumber || '-',
        dob: profile.dob || '-',
        currentSemester: profile.currentSemester || '-',
        joinSemester: profile.joinSemester || '-',
        expectedGraduate: profile.expectedGraduate || '-',
        avatarUrl: profile.avatarUrl || null,
      };
    }

    // Map API user shape -> CV view model.
    const majorText =
      profile?.majorTitle ||
      profile?.majorName ||
      (profile?.majorId != null ? String(profile.majorId) : '-');

    return {
      name: profile?.fullname || '-',
      major: majorText,
      studentNumber: profile?.studentCode || '-',
      dob: profile?.dob || '-',
      currentSemester: profile?.currentSemester || '-',
      joinSemester: profile?.joinSemester || '-',
      expectedGraduate: profile?.expectedGraduate || '-',
      avatarUrl: profile?.avatarUrl || null,
    };
  }, [profile]);

  const getInitials = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  };

  // Applications panel state
  const [showApps, setShowApps] = useState(false); // full panel visible
  const [appsCollapsed, setAppsCollapsed] = useState(false); // minimize inside panel
  const [appsBoardView, setAppsBoardView] = useState(true); // Board (kanban) vs Table

  // Load application meta and jobs data (lazy import to avoid circular)
  const [applicationMeta, setApplicationMeta] = useState(() => {
    try { return JSON.parse(localStorage.getItem('applicationMeta') || '{}'); } catch { return {}; }
  });
  const [applyStatusMap, setApplyStatusMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('applyStatusMap') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    const sync = () => {
      try { setApplicationMeta(JSON.parse(localStorage.getItem('applicationMeta') || '{}')); } catch {}
      try { setApplyStatusMap(JSON.parse(localStorage.getItem('applyStatusMap') || '{}')); } catch {}
    };
    // Listen for storage changes (if multiple tabs)
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Get jobs dataset (static import)
  // We only need id, title, company for application table.
  const { JOBS } = require('./jobsData');
  const applicationRows = useMemo(() => {
    return Object.entries(applicationMeta).map(([id, meta]) => {
      const job = JOBS.find(j => j.id === Number(id));
      return {
        id: Number(id),
        company: job?.company || 'Unknown',
        title: job?.title || 'Unknown',
        date: meta?.date || null,
        status: (applyStatusMap[id] || meta?.status || 'waiting')
      };
    }).sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [applicationMeta, applyStatusMap, JOBS]);

  const formatDate = (iso) => {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString(); } catch { return '-'; }
  };

  // Normalize statuses for board
  const normalizeStatus = (s) => {
    if (s === 'waiting' || s === 'none' || s === 'pending') return 'pending';
    if (s === 'applied' || s === 'accepted') return 'accepted';
    if (s === 'interview') return 'interview';
    if (s === 'rejected') return 'rejected';
    return 'pending';
  };

  // Kanban columns derived from rows
  const boardColumns = useMemo(() => {
    const cols = { pending: [], interview: [], accepted: [], rejected: [] };
    applicationRows.forEach(r => { cols[normalizeStatus(r.status)].push(r); });
    return cols;
  }, [applicationRows]);

  // Drag & Drop handlers
  const [draggingId, setDraggingId] = useState(null);
  const onDragStart = (id) => setDraggingId(id);
  const onDragEnd = () => setDraggingId(null);
  const onDropTo = (status) => {
    if (draggingId == null) return;
    const id = draggingId;
    // Update both maps and persist
    setApplyStatusMap(prev => {
      const next = { ...prev, [id]: status };
      localStorage.setItem('applyStatusMap', JSON.stringify(next));
      return next;
    });
    setApplicationMeta(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), status, date: (prev[id]?.date || new Date().toISOString()) } };
      localStorage.setItem('applicationMeta', JSON.stringify(next));
      return next;
    });
    setDraggingId(null);
  };

  // Decorative text logo only; no navigation to avoid accidental redirects

  return (
    <div className="cv-page">
      {/* animated background layer */}
      <div className="cv-anim-bg" aria-hidden="true">
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
        <span className="orb o4" />
        <span className="orb o5" />
      </div>

      {/* top-right brand image */}
      <img
        className="brand-top-right"
        src={fptBadge}
        alt="FPT University"
        aria-hidden="false"
      />

      <div
        className="fpt-uni-logo"
        role="button"
        tabIndex={0}
        aria-label={t('home')}
        onClick={() => navigate('/')}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/')}
      >
        FPT UNIVERSITY
      </div>

      <div className="cv-container">
        <div className="cv-card">
          <div className="cv-header">
          <h1>{t('cv_title')}</h1>
          <div className="cv-actions">
            <button type="button" className="btn secondary" onClick={() => navigate('/')}>{t('home')}</button>
            <button type="button" className="btn primary" onClick={() => navigate('/profile/update')}>{t('edit_profile')}</button>
            <button
              type="button"
              className={`btn apps-toggle ${showApps ? 'on' : ''}`}
              onClick={() => { setShowApps(s => !s); if (!showApps) setAppsCollapsed(false); }}
            >
              {showApps ? 'Hide Applications' : 'My Applications'}
            </button>
          </div>
        </div>

        <div className="cv-content">
          <div className="cv-avatar">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={`${data.name} avatar`} />
            ) : (
              <div className="avatar-fallback" aria-label="Avatar placeholder">
                {getInitials(data.name)}
              </div>
            )}
          </div>

          <div className="cv-info">
            <div className="info-grid">
              <div className="info-item">
                <div className="label">{t('name')}</div>
                <div className="value">{data.name}</div>
              </div>
              <div className="info-item">
                <div className="label">{t('major')}</div>
                <div className="value">{data.major}</div>
              </div>
              <div className="info-item">
                <div className="label">{t('student_number')}</div>
                <div className="value">{data.studentNumber}</div>
              </div>
              <div className="info-item">
                <div className="label">{t('date_of_birth')}</div>
                <div className="value">{data.dob}</div>
              </div>
              <div className="info-item">
                <div className="label">{t('current_semester')}</div>
                <div className="value">{data.currentSemester}</div>
              </div>
              <div className="info-item">
                <div className="label">{t('join_in')}</div>
                <div className="value">{data.joinSemester}</div>
              </div>
              <div className="info-item">
                <div className="label">{t('expected_graduate')}</div>
                <div className="value">{data.expectedGraduate}</div>
              </div>
            </div>

            <div className="cv-footer">
              <button type="button" className="btn ghost" onClick={() => window.print()}>{t('download_print')}</button>
            </div>
          </div>
          </div>
          {/* Applications Panel */}
          {showApps && (
            <div className={`apps-panel ${appsCollapsed ? 'collapsed' : ''}`}> 
              <div className="apps-panel-header">
                <h3>My Applications</h3>
                <div className="apps-header-actions">
                  <div className="apps-view-toggle">
                    <button
                      type="button"
                      className={`mini-btn ${appsBoardView ? 'active' : ''}`}
                      onClick={() => setAppsBoardView(true)}
                      title="Board View"
                    >Board</button>
                    <button
                      type="button"
                      className={`mini-btn ${!appsBoardView ? 'active' : ''}`}
                      onClick={() => setAppsBoardView(false)}
                      title="Table View"
                    >Table</button>
                  </div>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => setAppsCollapsed(c => !c)}
                    title={appsCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {appsCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                  <button
                    type="button"
                    className="mini-btn danger"
                    onClick={() => setShowApps(false)}
                    title="Close"
                  >
                    Close
                  </button>
                </div>
              </div>
              {!appsCollapsed && (
                <div className="apps-body">
                  {applicationRows.length === 0 ? (
                    <div className="apps-empty">No applications yet.</div>
                  ) : (
                    <>
                      {appsBoardView ? (
                        <div className="apps-board">
                          {(['pending','interview','accepted','rejected']).map(col => (
                            <div
                              key={col}
                              className={`apps-col ${col}`}
                              onDragOver={(e)=>e.preventDefault()}
                              onDrop={()=>onDropTo(col)}
                            >
                              <div className="apps-col-header">
                                <span className="title">{col === 'pending' ? 'Pending' : col.charAt(0).toUpperCase()+col.slice(1)}</span>
                                <span className="count">{boardColumns[col].length}</span>
                              </div>
                              <div className="apps-col-body">
                                {boardColumns[col].map(card => (
                                  <div
                                    key={card.id}
                                    className={`app-card ${draggingId===card.id?'dragging':''}`}
                                    draggable
                                    onDragStart={()=>onDragStart(card.id)}
                                    onDragEnd={onDragEnd}
                                    title={`${card.title} @ ${card.company}`}
                                  >
                                    <div className="card-title">{card.title}</div>
                                    <div className="card-sub">{card.company}</div>
                                    <div className="card-meta">
                                      <span className="meta-date">{formatDate(card.date)}</span>
                                      <span className={`app-status pill ${normalizeStatus(card.status)}`}></span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <table className="apps-table">
                          <thead>
                            <tr>
                              <th>Date Applied</th>
                              <th>Status</th>
                              <th>Job</th>
                              <th>Company</th>
                            </tr>
                          </thead>
                          <tbody>
                            {applicationRows.map(row => (
                              <tr key={row.id}>
                                <td>{formatDate(row.date)}</td>
                                <td><span className={`app-status ${normalizeStatus(row.status)}`}>{normalizeStatus(row.status) === 'accepted' ? 'Accepted' : normalizeStatus(row.status) === 'interview' ? 'Interview' : normalizeStatus(row.status) === 'rejected' ? 'Rejected' : 'Pending'}</span></td>
                                <td>{row.title}</td>
                                <td>{row.company}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CV;
