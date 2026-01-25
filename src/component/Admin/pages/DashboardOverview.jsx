import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Spin } from 'antd';
import { Pie } from '@ant-design/plots';
import { useI18n } from '../../../i18n/i18n.jsx';
import userApi from '../../API/UserAPI';
import companyApi from '../../API/CompanyAPI';
import ojtDocumentApi from '../../API/OjtDocumentAPI';
import jobPositionApi from '../../API/JobPositionAPI';

const getApiList = (res) => {
  const list = res?.data?.data;
  return Array.isArray(list) ? list : [];
};

const normalizeRole = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'student') return 'student';
  if (raw === 'company' || raw.startsWith('company')) return 'company';
  if (raw === 'cro_staff' || raw === 'cro staff' || raw === 'crostaff' || raw === 'staff') return 'staff';
  if (raw.endsWith('staff')) return 'staff';
  return '';
};

const formatCount = (value) => {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat().format(n);
};

const DashboardOverview = () => {
  const { t } = useI18n();

  const tf = useCallback(
    (key, fallback) => {
      const value = t(key);
      if (value == null) return fallback;
      const s = String(value).trim();
      if (!s) return fallback;
      if (s === key) return fallback;
      return s;
    },
    [t]
  );

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [metrics, setMetrics] = useState({
    totalUsers: null,
    totalCompanies: null,
    totalDocuments: null,
    totalJobPositions: null,
    roles: { student: 0, staff: 0, company: 0 },
    lastUpdatedAt: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const results = await Promise.allSettled([
      userApi.getAll(),
      companyApi.getAll(),
      ojtDocumentApi.getAll(),
      jobPositionApi.getAll(),
    ]);

    const nextErrors = {};

    const usersRes = results[0].status === 'fulfilled' ? results[0].value : null;
    const companiesRes = results[1].status === 'fulfilled' ? results[1].value : null;
    const docsRes = results[2].status === 'fulfilled' ? results[2].value : null;
    const jobPosRes = results[3].status === 'fulfilled' ? results[3].value : null;

    if (!usersRes) nextErrors.users = results[0].reason?.message || 'Failed to load users';
    if (!companiesRes) nextErrors.companies = results[1].reason?.message || 'Failed to load companies';
    if (!docsRes) nextErrors.documents = results[2].reason?.message || 'Failed to load documents';
    if (!jobPosRes) nextErrors.jobs = results[3].reason?.message || 'Failed to load job positions';

    const users = usersRes ? getApiList(usersRes) : [];
    const companies = companiesRes ? getApiList(companiesRes) : [];
    const docs = docsRes ? getApiList(docsRes) : [];
    const jobPositions = jobPosRes ? getApiList(jobPosRes) : [];

    const roles = { student: 0, staff: 0, company: 0 };
    for (const u of users) {
      const normalized = normalizeRole(u?.role ?? u?.Role);
      if (normalized === 'student') roles.student += 1;
      if (normalized === 'staff') roles.staff += 1;
      if (normalized === 'company') roles.company += 1;
    }

    setMetrics({
      totalUsers: usersRes ? users.length : null,
      totalCompanies: companiesRes ? companies.length : null,
      totalDocuments: docsRes ? docs.length : null,
      totalJobPositions: jobPosRes ? jobPositions.length : null,
      roles,
      lastUpdatedAt: Date.now(),
    });
    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pieData = useMemo(() => {
    return [
      { type: 'Student', value: metrics.roles.student || 0 },
      { type: 'Staff', value: metrics.roles.staff || 0 },
      { type: 'Company', value: metrics.roles.company || 0 },
    ];
  }, [metrics.roles]);

  const pieConfig = useMemo(() => {
    return {
      data: pieData,
      angleField: 'value',
      colorField: 'type',
      radius: 0.9,
      legend: { position: 'bottom' },
      label: false,
      tooltip: {
        formatter: (datum) => ({ name: datum?.type || 'Role', value: formatCount(datum?.value) }),
      },
      interactions: [{ type: 'element-active' }],
    };
  }, [pieData, metrics.totalUsers]);

  const updatedLabel = useMemo(() => {
    if (!metrics.lastUpdatedAt) return '';
    try {
      return new Date(metrics.lastUpdatedAt).toLocaleString();
    } catch {
      return '';
    }
  }, [metrics.lastUpdatedAt]);

  return (
    <div className="admin-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>{tf('admin_dashboard_title', 'Dashboard Overview')}</h1>
            <p>{tf('admin_dashboard_subtitle', 'System-wide statistics and alerts')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {updatedLabel ? (
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Updated: {updatedLabel}</span>
            ) : null}
            <button type="button" className="btn-primary" onClick={load} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid-cols-4">
        <div className="card">
          <h3>{tf('admin_dash_total_companies', 'Companies')}</h3>
          <div className="stat-value">{formatCount(metrics.totalCompanies)}</div>
          {errors.companies ? <div style={{ marginTop: '0.5rem', color: '#ef4444' }}>{errors.companies}</div> : null}
        </div>
        <div className="card">
          <h3>{tf('admin_dash_total_documents', 'Total documents')}</h3>
          <div className="stat-value">{formatCount(metrics.totalDocuments)}</div>
          {errors.documents ? <div style={{ marginTop: '0.5rem', color: '#ef4444' }}>{errors.documents}</div> : null}
        </div>
        <div className="card">
          <h3>{tf('admin_dash_job_positions_total', 'Total positions')}</h3>
          <div className="stat-value">{formatCount(metrics.totalJobPositions)}</div>
          {errors.jobs ? <div style={{ marginTop: '0.5rem', color: '#ef4444' }}>{errors.jobs}</div> : null}
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3>{tf('admin_dash_users_by_role', 'User by role')}</h3>
          <div style={{ minHeight: 280 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
                <Spin size="large" />
              </div>
            ) : errors.users ? (
              <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                {errors.users}
              </div>
            ) : (
              <Pie {...pieConfig} />
            )}
          </div>
        </div>
        <div className="card">
          <h3>{tf('admin_dash_role_breakdown', 'Role breakdown')}</h3>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
              <Spin size="large" />
            </div>
          ) : errors.users ? (
            <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              {errors.users}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: '#334155', fontWeight: 600 }}>Students</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{formatCount(metrics.roles.student)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: '#334155', fontWeight: 600 }}>Staff</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{formatCount(metrics.roles.staff)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: '#334155', fontWeight: 600 }}>Company</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{formatCount(metrics.roles.company)}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: '#64748b' }}>Total users (all roles)</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{formatCount(metrics.totalUsers)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
