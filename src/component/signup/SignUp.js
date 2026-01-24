import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { useI18n } from '../../i18n/i18n.jsx';
import majorApi from '../API/MajorAPI';
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
    avatarFile: null,
    cvFile: null,
  });
  const [touched, setTouched] = useState({
    fullname: false,
    email: false,
    studentCode: false,
    phone: false,
  });
  const [errors, setErrors] = useState({
    fullname: '',
    email: '',
    studentCode: '',
    phone: '',
  });
  const [majors, setMajors] = useState([]);
  const [majorsLoading, setMajorsLoading] = useState(false);
  const [majorsError, setMajorsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizeStudentCode = (value) => String(value || '').trim().toLowerCase();
  const normalizePhone = (value) => String(value || '').replace(/\D+/g, '');

  const getUserEmail = (u) => u?.email ?? u?.Email ?? u?.userEmail ?? u?.UserEmail;
  const getUserPhone = (u) => u?.phone ?? u?.Phone ?? u?.mobile ?? u?.Mobile ?? u?.phoneNumber ?? u?.PhoneNumber;
  const getUserStudentCode = (u) => u?.studentCode ?? u?.StudentCode ?? u?.student_code ?? u?.Student_Code;

  function validateField(name, value) {
    const v = (value ?? '').toString().trim();

    if (name === 'fullname') {
      if (!v) return t('error_fullname_required');
      // Only allow letters + spaces. Disallow numbers and special characters.
      if (!/^[\p{L}\s]+$/u.test(v)) return t('error_fullname_invalid');
      return '';
    }

    if (name === 'studentCode') {
      if (!v) return '';
      // No special characters. Allow letters and digits only.
      if (!/^[A-Za-z0-9]+$/.test(v)) return t('error_studentcode_invalid');
      return '';
    }

    if (name === 'email') {
      if (!v) return tr('error_email_required', 'Email is required.');
      // Lightweight email check; input type=email handles most cases.
      if (!/^\S+@\S+\.\S+$/.test(v)) return tr('error_email_invalid', 'Email is invalid.');
      return '';
    }

    if (name === 'phone') {
      if (!v) return '';
      // No alphabet and no special characters. Digits only.
      if (!/^\d+$/.test(v)) return t('error_phone_invalid');
      return '';
    }

    return '';
  }

  function onChange(e) {
    const { name, value, files } = e.target;
    if (name === 'avatarFile' || name === 'cvFile') {
      setForm((prev) => ({ ...prev, [name]: files?.[0] || null }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'fullname' || name === 'studentCode' || name === 'phone' || name === 'email') {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  }

  function onBlur(e) {
    const { name, value } = e.target;
    if (name === 'fullname' || name === 'studentCode' || name === 'phone' || name === 'email') {
      setTouched((prev) => ({ ...prev, [name]: true }));
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  }

  const checkDuplicates = async () => {
    const email = normalizeEmail(form.email);
    const phone = normalizePhone(form.phone);
    const studentCode = normalizeStudentCode(form.studentCode);

    // Only check fields that are filled.
    if (!email && !phone && !studentCode) return { email: '', phone: '', studentCode: '' };

    const res = await userApi.getAll();
    const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];

    let emailDup = false;
    let phoneDup = false;
    let studentDup = false;

    for (const u of list) {
      if (!emailDup && email) {
        const uEmail = normalizeEmail(getUserEmail(u));
        if (uEmail && uEmail === email) emailDup = true;
      }
      if (!phoneDup && phone) {
        const uPhone = normalizePhone(getUserPhone(u));
        if (uPhone && uPhone === phone) phoneDup = true;
      }
      if (!studentDup && studentCode) {
        const uStudent = normalizeStudentCode(getUserStudentCode(u));
        if (uStudent && uStudent === studentCode) studentDup = true;
      }
      if (emailDup && phoneDup && studentDup) break;
    }

    return {
      email: emailDup ? tr('error_email_duplicate', 'Email already exists.') : '',
      phone: phoneDup ? tr('error_phone_duplicate', 'Phone already exists.') : '',
      studentCode: studentDup ? tr('error_studentcode_duplicate', 'Student number already exists.') : '',
    };
  };

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

  useEffect(() => {
    loadMajors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {
      fullname: validateField('fullname', form.fullname),
      email: validateField('email', form.email),
      studentCode: validateField('studentCode', form.studentCode),
      phone: validateField('phone', form.phone),
    };
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    setTouched((prev) => ({ ...prev, fullname: true, email: true, studentCode: true, phone: true }));
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    if (form.password !== form.confirm) {
      notification.error({
        message: t('error_password_mismatch'),
        placement: 'topRight',
        duration: 3,
      });
      return;
    }

    // Duplicate validation (email/phone/student number)
    try {
      const dupErrors = await checkDuplicates();
      if (dupErrors.email || dupErrors.phone || dupErrors.studentCode) {
        setTouched((prev) => ({ ...prev, email: true, studentCode: true, phone: true }));
        setErrors((prev) => ({
          ...prev,
          email: dupErrors.email || prev.email,
          phone: dupErrors.phone || prev.phone,
          studentCode: dupErrors.studentCode || prev.studentCode,
        }));
        return;
      }
    } catch (dupErr) {
      // eslint-disable-next-line no-console
      console.warn('[SignUp] duplicate check failed', dupErr);
      notification.error({
        message: tr('error_duplicate_check_failed', 'Cannot validate duplicates right now. Please try again.'),
        placement: 'topRight',
        duration: 3,
      });
      return;
    }

    setSubmitting(true);
    try {
      // Backend (Swagger) expects multipart/form-data for /api/user/create.
      const fd = new FormData();
      fd.append('MajorId', String(form.majorId ? Number(form.majorId) : 0));
      // CompanyId is intentionally not chosen at signup; send empty for backend compatibility.
      fd.append('CompanyId', '');
      fd.append('Email', form.email || '');
      fd.append('Password', form.password || '');
      fd.append('Fullname', form.fullname || '');
      fd.append('StudentCode', form.studentCode || '');
      fd.append('Dob', form.dob || '');
      fd.append('Phone', form.phone || '');

      // Optional files (Swagger fields are string($binary)).
      if (form.avatarFile instanceof File) {
        fd.append('AvatarUrl', form.avatarFile);
      } else {
        fd.append('AvatarUrl', '');
      }
      if (form.cvFile instanceof File) {
        fd.append('CvUrl', form.cvFile);
      } else {
        fd.append('CvUrl', '');
      }

      // Debug outgoing payload
      try {
        const entries = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const [k, v] of fd.entries()) {
          if (v instanceof File) {
            entries.push([k, { name: v.name, type: v.type, size: v.size }]);
          } else {
            entries.push([k, v]);
          }
        }
        // eslint-disable-next-line no-console
        console.groupCollapsed('[SignUp] /user/create FormData');
        // eslint-disable-next-line no-console
        console.table(entries.map(([k, v]) => ({ key: k, value: typeof v === 'string' ? v : JSON.stringify(v) })));
        // eslint-disable-next-line no-console
        console.log('raw entries:', entries);
        // eslint-disable-next-line no-console
        console.groupEnd();
      } catch (logErr) {
        // eslint-disable-next-line no-console
        console.warn('[SignUp] Failed to log FormData', logErr);
      }

      const res = await userApi.create(fd);
      const serverMsg = res?.data?.message;
      notification.success({
        message: serverMsg || t('signup_created_account') || 'Created new account.',
        placement: 'topRight',
        duration: 3,
      });

      // Give the toast time to render before unmounting this page.
      window.setTimeout(() => {
        navigate('/login', { replace: true, state: { flash: 'signup_success' } });
      }, 350);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Signup failed:', {
        message: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        url: err?.config?.url,
        method: err?.config?.method,
      });
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      notification.error({
        message: serverMsg || err?.message || t('signup_submit_error'),
        placement: 'topRight',
        duration: 4,
      });
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

        <input
          className={touched.fullname && errors.fullname ? 'input-error' : ''}
          name="fullname"
          placeholder={t('full_name')}
          value={form.fullname}
          onChange={onChange}
          onBlur={onBlur}
          required
          aria-label={t('full_name')}
        />
        {touched.fullname && errors.fullname && (
          <div className="field-error" role="alert">{errors.fullname}</div>
        )}
        <input
          className={touched.email && errors.email ? 'input-error' : ''}
          name="email"
          type="email"
          placeholder={t('email_placeholder')}
          value={form.email}
          onChange={onChange}
          onBlur={onBlur}
          required
          aria-label="Email"
        />
        {touched.email && errors.email && (
          <div className="field-error" role="alert">{errors.email}</div>
        )}
        <input name="password" type="password" placeholder={t('password')} value={form.password} onChange={onChange} required aria-label={t('password')} />
        <input name="confirm" type="password" placeholder={t('confirm_password')} value={form.confirm} onChange={onChange} required aria-label={t('confirm_password')} />

        <input
          className={touched.studentCode && errors.studentCode ? 'input-error' : ''}
          name="studentCode"
          placeholder={t('student_number')}
          value={form.studentCode}
          onChange={onChange}
          onBlur={onBlur}
          aria-label={t('student_number')}
        />
        {touched.studentCode && errors.studentCode && (
          <div className="field-error" role="alert">{errors.studentCode}</div>
        )}

        <input
          className={touched.phone && errors.phone ? 'input-error' : ''}
          name="phone"
          placeholder={t('phone')}
          value={form.phone}
          onChange={onChange}
          onBlur={onBlur}
          aria-label={t('phone')}
        />
        {touched.phone && errors.phone && (
          <div className="field-error" role="alert">{errors.phone}</div>
        )}
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
      <label style={{ width: '100%', display: 'block' }}>
        {t('avatar_url')}
        <input name="avatarFile" type="file" accept="image/*" onChange={onChange} aria-label={t('avatar_url')} />
      </label>
      <label style={{ width: '100%', display: 'block' }}>
        {t('cv_url')}
        <input name="cvFile" type="file" accept="application/pdf,.pdf" onChange={onChange} aria-label={t('cv_url')} />
      </label>

        <div className="row">
          <button
            type="submit"
            disabled={submitting || Boolean(errors.fullname) || Boolean(errors.email) || Boolean(errors.studentCode) || Boolean(errors.phone)}
          >
            {submitting ? t('creating') : t('create_account_btn')}
          </button>
        </div>
        <p className="note">{t('terms_note')}</p>
      </form>
    </div>
  );
}

export default SignUp;
