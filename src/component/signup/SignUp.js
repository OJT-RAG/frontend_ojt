import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/i18n.jsx';
import majorApi from '../API/MajorAPI';
import companyApi from '../API/CompanyAPI';
import userApi from '../API/UserAPI';
import './SignUp.scss';

function SignUp() {
  const [form, setForm] = useState({
    fullname: '',
    email: '',
    password: '',
    confirm: '',
    studentCode: '',
    phone: '',
    dob: '',
    majorId: '',
    companyId: '',
    avatarUrl: '',
    cvUrl: '',
  });
  const [majors, setMajors] = useState([]);
  const [majorsLoading, setMajorsLoading] = useState(false);
  const [majorsError, setMajorsError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  const loadMajors = async () => {
    let cancelled = false;
    setMajorsError('');
    setMajorsLoading(true);
    try {
      const res = await majorApi.getAll();
      const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
      const normalized = list
        .map((m) => {
          const id = m?.majorId ?? m?.MajorId ?? m?.Major_ID ?? m?.id ?? m?.Id;
          const title = m?.majorTitle ?? m?.Major_Title ?? m?.majorName ?? m?.MajorName ?? m?.Name ?? m?.name;
          const code = m?.majorCode ?? m?.MajorCode ?? m?.code ?? m?.Code;
          if (id == null) return null;
          return { id: String(id), name: title ? (code ? `${title} (${code})` : title) : String(id) };
        })
        .filter(Boolean);
      if (!cancelled) setMajors(normalized);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load majors', e);
      setMajorsError(e?.message || 'Failed to load majors');
      if (!cancelled) setMajors([]);
    } finally {
      if (!cancelled) setMajorsLoading(false);
    }
    return () => { cancelled = true; };
  };

  const loadCompanies = async () => {
    let cancelled = false;
    setCompaniesError('');
    setCompaniesLoading(true);
    try {
      const res = await companyApi.getAll();
      const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
      const normalized = list
        .map((c) => {
          const id = c?.company_ID ?? c?.Company_ID ?? c?.companyId ?? c?.CompanyId ?? c?.id ?? c?.Id;
          const name = c?.name ?? c?.Name;
          if (id == null) return null;
          return { id: String(id), name: name ? String(name) : String(id) };
        })
        .filter(Boolean);
      if (!cancelled) setCompanies(normalized);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load companies', e);
      setCompaniesError(e?.message || 'Failed to load companies');
      if (!cancelled) setCompanies([]);
    } finally {
      if (!cancelled) setCompaniesLoading(false);
    }
    return () => { cancelled = true; };
  };

  useEffect(() => {
    loadMajors();
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      alert(t('error_password_mismatch'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        majorId: form.majorId ? Number(form.majorId) : 0,
        companyId: form.companyId ? Number(form.companyId) : 0,
        // Backend DB requires role NOT NULL; default new accounts to student.
        // (DTO binding is case-insensitive; include roleId as a fallback if backend uses numeric roles.)
        role: 'student',
        roleId: 3,
        email: form.email || '',
        password: form.password || '',
        fullname: form.fullname || '',
        studentCode: form.studentCode || '',
        dob: form.dob || null, // expects YYYY-MM-DD
        phone: form.phone || '',
        avatarUrl: form.avatarUrl || '',
        cvUrl: form.cvUrl || '',
      };

      const res = await userApi.create(payload);
      const serverMsg = res?.data?.message;
      alert(serverMsg || t('signup_submit_success'));
      navigate('/login', { replace: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Signup failed:', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      alert(serverMsg || err.message || t('signup_submit_error'));
    } finally {
      setSubmitting(false);
    }
  }

  const handleReturn = () => {
    navigate('/login'); // use { replace: true } if you don't want users to go back
  };

  const handleLogoHome = (e) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="signup-container">
      <div
        className="fpt-uni-logo"
        role="button"
        tabIndex={0}
        onClick={handleLogoHome}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLogoHome(e)}
      >
        FPT UNIVERSITY
      </div>
      <button type="button" className="return-top" onClick={handleReturn}>
        {t('return')}
      </button>
      <form className="signup-form" onSubmit={handleSubmit}>
        <div className="signup-logo">FPT</div>
        <h2>{t('signup_title')}</h2>

        <input name="fullname" placeholder={t('full_name')} value={form.fullname} onChange={onChange} required aria-label={t('full_name')} />
        <input name="email" type="email" placeholder={t('email_placeholder')} value={form.email} onChange={onChange} required aria-label="Email" />
        <input name="password" type="password" placeholder={t('password')} value={form.password} onChange={onChange} required aria-label={t('password')} />
        <input name="confirm" type="password" placeholder={t('confirm_password')} value={form.confirm} onChange={onChange} required aria-label={t('confirm_password')} />

        <input name="studentCode" placeholder={t('student_number')} value={form.studentCode} onChange={onChange} aria-label={t('student_number')} />
        <input name="phone" placeholder={t('phone')} value={form.phone} onChange={onChange} aria-label={t('phone')} />
        <input name="dob" type="date" placeholder={t('date_of_birth')} value={form.dob} onChange={onChange} aria-label={t('date_of_birth')} />

        <select name="majorId" value={form.majorId} onChange={onChange} aria-label={t('major')} required>
          <option value="" disabled>{majorsLoading ? t('loading') : t('select_major')}</option>
          {majors.map((m, idx) => {
            const id = (m && typeof m === 'object') ? m.id : (m != null ? String(m) : String(idx));
            const label = (m && typeof m === 'object') ? (m.name || id) : (m != null ? String(m) : id);
            return (
              <option key={`${id}-${idx}`} value={id}>{label}</option>
            );
          })}
          {!majorsLoading && majors.length === 0 && (
            <option value="" disabled>({t('no_majors_found')})</option>
          )}
        </select>
        {majorsError && (
          <div style={{ fontSize: '12px', color: '#b94a48', marginTop: '6px' }}>
            {majorsError}
            <button type="button" onClick={loadMajors} style={{ marginLeft: 8 }} disabled={majorsLoading}>
              {majorsLoading ? t('loading') : 'Reload Majors'}
            </button>
          </div>
        )}
        <select name="companyId" value={form.companyId} onChange={onChange} aria-label={t('company')} required>
          <option value="" disabled>{companiesLoading ? t('loading') : t('company')}</option>
          {companies.map((c, idx) => {
            const id = (c && typeof c === 'object') ? c.id : (c != null ? String(c) : String(idx));
            const label = (c && typeof c === 'object') ? (c.name || id) : (c != null ? String(c) : id);
            return (
              <option key={`${id}-${idx}`} value={id}>{label}</option>
            );
          })}
          {!companiesLoading && companies.length === 0 && (
            <option value="" disabled>(No companies found)</option>
          )}
        </select>
        {companiesError && (
          <div style={{ fontSize: '12px', color: '#b94a48', marginTop: '6px' }}>
            {companiesError}
            <button type="button" onClick={loadCompanies} style={{ marginLeft: 8 }} disabled={companiesLoading}>
              {companiesLoading ? t('loading') : 'Reload Companies'}
            </button>
          </div>
        )}

        <input name="avatarUrl" placeholder={t('avatar_url')} value={form.avatarUrl} onChange={onChange} aria-label={t('avatar_url')} />
        <input name="cvUrl" placeholder={t('cv_url')} value={form.cvUrl} onChange={onChange} aria-label={t('cv_url')} />

        <div className="row">
          <button type="submit" disabled={submitting}>{submitting ? t('creating') : t('create_account_btn')}</button>
        </div>
        <p className="note">{t('terms_note')}</p>
      </form>
    </div>
  );
}

export default SignUp;
