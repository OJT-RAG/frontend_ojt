import React from 'react';
import { useI18n } from '../../../i18n/i18n.jsx';

const DashboardOverview = () => {
  const { t } = useI18n();
  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>{t('admin_dashboard_title') || 'Dashboard Overview'}</h1>
        <p>{t('admin_dashboard_subtitle') || 'System-wide statistics and alerts'}</p>
      </div>

      <div className="grid-cols-4">
        <div className="card">
          <h3>{t('admin_dash_students_interning') || 'Students Interning'}</h3>
          <div className="stat-value">1,234</div>
        </div>
        <div className="card">
          <h3>{t('admin_dash_active_jobs') || 'Active Jobs'}</h3>
          <div className="stat-value">567</div>
        </div>
        <div className="card">
          <h3>{t('admin_dash_company_approvals') || 'Company Approvals'}</h3>
          <div className="stat-value">89</div>
        </div>
        <div className="card">
          <h3>{t('admin_dash_pending_alerts') || 'Pending Alerts'}</h3>
          <div className="stat-value text-red">12</div>
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3>{t('admin_dash_heatmap_major') || 'Heatmap by Major'}</h3>
          <div className="chart-placeholder">[{t('admin_dash_heatmap_placeholder') || 'Heatmap Chart Placeholder'}]</div>
        </div>
        <div className="card">
          <h3>{t('admin_dash_recent_activity') || 'Recent Activity'}</h3>
          <div className="list-placeholder">[{t('admin_dash_activity_placeholder') || 'Activity List Placeholder'}]</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
