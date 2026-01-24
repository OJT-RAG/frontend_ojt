import React, { useEffect, useMemo, useState } from 'react';
import './UserManager.scss';
import userApi from '../../API/UserAPI';
import majorApi from '../../API/MajorAPI';
import { useAuth } from '../../Hook/useAuth';
import { pickAvatarUrl } from '../../lib/utils.jsx';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const UserManager = () => {
  const { authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [majors, setMajors] = useState([]);

  const currentUserId = useMemo(() => {
    const fromContext = Number(authUser?.id ?? authUser?.userId ?? 0) || 0;
    if (fromContext) return fromContext;

    try {
      const raw = localStorage.getItem('authUser');
      const parsed = raw ? JSON.parse(raw) : {};
      return Number(parsed?.id ?? parsed?.userId ?? 0) || 0;
    } catch {
      return 0;
    }
  }, [authUser]);

  const [editingUser, setEditingUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState({ open: false, userId: 0, nextStatus: 'active' });
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [editAvatarPreviewUrl, setEditAvatarPreviewUrl] = useState('');
  const [editAvatarPreviewIsObjectUrl, setEditAvatarPreviewIsObjectUrl] = useState(false);
  const [editForm, setEditForm] = useState({
    fullname: '',
    studentCode: '',
    dob: '',
    phone: '',
    role: '',
    majorId: '',
    companyId: '',
    password: '',
    avatarFile: null,
    cvFile: null,
  });
  const [editInitial, setEditInitial] = useState(null);

  const isAdmin = useMemo(() => {
    const raw = String(authUser?.role ?? authUser?.Role ?? '').trim().toLowerCase();
    return raw === 'admin';
  }, [authUser]);

  const isRoleLockedByMajor = (u) => {
    const raw = u?.majorId;
    if (raw == null) return false;
    const s = String(raw).trim();
    return s !== '' && s !== '0';
  };

  const normalizeRoleValue = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (lower === 'admin') return 'admin';
    if (lower === 'student') return 'student';
    if (lower === 'company') return 'company';
    if (lower === 'cro_staff' || lower === 'cro staff' || lower === 'crostaff') return 'cro_staff';
    return '';
  };

  const roleOptions = useMemo(() => {
    return [
      { value: 'admin', label: 'Admin' },
      { value: 'student', label: 'Student' },
      { value: 'cro_staff', label: 'CRO Staff' },
      { value: 'company', label: 'Company' },
    ];
  }, []);

  const [query, setQuery] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [userRes, majorRes] = await Promise.all([
          userApi.getAll(),
          majorApi.getAll(),
        ]);

        const userList = userRes?.data?.data || [];
        const majorList = majorRes?.data?.data || [];

        if (cancelled) return;
        setUsers(Array.isArray(userList) ? userList : []);
        setMajors(Array.isArray(majorList) ? majorList : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || 'Failed to load users');
        setUsers([]);
        setMajors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUsers = async () => {
    try {
      const res = await userApi.getAll();
      const userList = res?.data?.data || [];
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Failed to refresh users');
    }
  };

  const majorOptions = useMemo(() => {
    return majors
      .map((m) => {
        const id = m?.majorId ?? m?.MajorId ?? m?.id ?? m?.Id;
        const name = m?.majorTitle ?? m?.majorName ?? m?.name ?? String(id ?? '');
        if (id == null) return null;
        return { id: String(id), name };
      })
      .filter(Boolean);
  }, [majors]);

  const majorMap = useMemo(() => {
    const map = new Map();
    majorOptions.forEach((m) => map.set(Number(m.id), m.name));
    return map;
  }, [majorOptions]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const majorId = majorFilter ? Number(majorFilter) : null;
    const role = roleFilter ? String(roleFilter).trim().toLowerCase() : '';

    return users.filter((u) => {
      if (majorId != null && Number(u?.majorId) !== majorId) return false;

      if (role) {
        const userRole = String(u?.role ?? u?.Role ?? '').trim().toLowerCase();
        if (userRole !== role) return false;
      }

      if (!q) return true;
      const studentCode = String(u?.studentCode || '').toLowerCase();
      const fullname = String(u?.fullname || '').toLowerCase();
      const email = String(u?.email || '').toLowerCase();
      return studentCode.includes(q) || fullname.includes(q) || email.includes(q);
    });
  }, [users, query, majorFilter, roleFilter]);

  const exportCsv = () => {
    const rows = filteredUsers.map((u) => {
      const majorName = u?.majorId != null ? (majorMap.get(Number(u.majorId)) || String(u.majorId)) : '';
      const roleName = getRoleLabel(u);
      return {
        userId: u?.userId ?? '',
        role: roleName,
        studentCode: u?.studentCode ?? '',
        fullname: u?.fullname ?? '',
        email: u?.email ?? '',
        major: majorName,
        phone: u?.phone ?? '',
        dob: u?.dob ?? '',
        avatarUrl: u?.avatarUrl ?? '',
        cvUrl: u?.cvUrl ?? '',
        createAt: u?.createAt ?? '',
      };
    });

    const headers = Object.keys(rows[0] || {
      userId: '', role: '', studentCode: '', fullname: '', email: '', major: '', phone: '', dob: '', avatarUrl: '', cvUrl: '', createAt: ''
    });

    const escape = (value) => {
      const s = String(value ?? '');
      if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = [headers.join(',')]
      .concat(rows.map((r) => headers.map((h) => escape(r[h])).join(',')))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const getAccountStatus = (u) => {
    const raw = u?.accountStatus ?? u?.AccountStatus ?? u?.status ?? u?.Status;
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === 'inactive' || s === 'disabled' || s === 'deactive' || s === 'deactivated') return 'inactive';
    if (s === 'active') return 'active';
    // Default to active if backend doesn't return a status.
    return 'active';
  };

  const handleToggleStatus = (u) => {
    const targetId = Number(u?.userId) || 0;
    if (!targetId) return;

    if (currentUserId && targetId === Number(currentUserId)) {
      window.alert("You can't deactivate the account you're currently using.");
      return;
    }

    const current = getAccountStatus(u);
    const next = current === 'active' ? 'inactive' : 'active';
    setStatusConfirm({ open: true, userId: targetId, nextStatus: next });
  };

  const closeStatusConfirm = () => {
    if (statusSaving) return;
    setStatusConfirm({ open: false, userId: 0, nextStatus: 'active' });
  };

  const confirmToggleStatus = async () => {
    const targetId = Number(statusConfirm.userId) || 0;
    if (!targetId) {
      closeStatusConfirm();
      return;
    }

    setStatusSaving(true);
    try {
      await userApi.updateStatus({ userId: targetId, accountStatus: statusConfirm.nextStatus });
      setUsers((prev) =>
        prev.map((x) =>
          Number(x?.userId) === targetId
            ? { ...x, accountStatus: statusConfirm.nextStatus, AccountStatus: statusConfirm.nextStatus }
            : x
        )
      );
      // Re-fetch so the table matches what the backend persisted.
      await refreshUsers();
      closeStatusConfirm();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Update status failed');
    } finally {
      setStatusSaving(false);
    }
  };

  // Delete is intentionally disabled in UI; replaced by activate/deactivate.

  const openEdit = (u) => {
    setEditingUser(u);
    setAvatarInputKey((k) => k + 1);

    const initialRole = normalizeRoleValue(u?.role ?? u?.Role ?? getRoleLabel(u));
    const initial = {
      fullname: u?.fullname ?? '',
      studentCode: u?.studentCode ?? '',
      dob: u?.dob ? String(u.dob).slice(0, 10) : '',
      phone: u?.phone ?? '',
      role: initialRole,
      majorId: u?.majorId != null ? String(u.majorId) : '',
      companyId: u?.companyId != null ? String(u.companyId) : '',
    };
    setEditInitial(initial);
    setEditForm({
      ...initial,
      password: '',
      avatarFile: null,
      cvFile: null,
    });

    setEditAvatarPreviewUrl(pickAvatarUrl(u) || '');
    setEditAvatarPreviewIsObjectUrl(false);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditingUser(null);
    setEditInitial(null);
    if (editAvatarPreviewIsObjectUrl && editAvatarPreviewUrl) {
      try { URL.revokeObjectURL(editAvatarPreviewUrl); } catch {}
    }
    setEditAvatarPreviewUrl('');
    setEditAvatarPreviewIsObjectUrl(false);
    setAvatarInputKey((k) => k + 1);
    setEditForm({
      fullname: '',
      studentCode: '',
      dob: '',
      phone: '',
      role: '',
      majorId: '',
      companyId: '',
      password: '',
      avatarFile: null,
      cvFile: null,
    });
  };

  const setField = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser?.userId) return;

    if (!editForm.fullname?.trim()) {
      window.alert('Full name is required');
      return;
    }

    const fd = new FormData();
    fd.append('UserId', String(editingUser.userId));

    const hasChanged = (value, initialValue) => (String(value ?? '') !== String(initialValue ?? ''));

    const appendIfChangedText = (fieldName, value, initialValue) => {
      const next = String(value ?? '');
      const prev = String(initialValue ?? '');
      if (!editInitial || next !== prev) {
        // Avoid sending undefined/null; backend expects strings.
        fd.append(fieldName, next);
      }
    };

    const appendIfChangedInt = (fieldName, value, initialValue) => {
      const nextRaw = String(value ?? '').trim();
      const prevRaw = String(initialValue ?? '').trim();
      if (editInitial && nextRaw === prevRaw) return;

      // Important: do NOT send empty string for numeric fields (can cause backend 500).
      if (nextRaw === '') {
        console.warn(`[Admin][UserUpdate] Skipping ${fieldName}=<empty>. Backend may not accept empty numeric values.`);
        return;
      }

      const n = Number(nextRaw);
      if (!Number.isFinite(n)) {
        console.warn(`[Admin][UserUpdate] Skipping ${fieldName} (not a number):`, nextRaw);
        return;
      }

      fd.append(fieldName, String(n));
    };

    appendIfChangedText('Fullname', editForm.fullname, editInitial?.fullname);
    appendIfChangedText('StudentCode', editForm.studentCode, editInitial?.studentCode);
    appendIfChangedText('Dob', editForm.dob, editInitial?.dob);
    appendIfChangedText('Phone', editForm.phone, editInitial?.phone);

    // Admin-only: allow changing role among supported values.
    const nextRole = normalizeRoleValue(editForm.role);
    const prevRole = String(editInitial?.role ?? '');
    const roleLocked = isRoleLockedByMajor(editingUser);
    const roleChanged = Boolean(isAdmin && nextRole && nextRole !== prevRole && !roleLocked);
    if (isAdmin && nextRole && !roleLocked) {
      appendIfChangedText('Role', nextRole, editInitial?.role);

      // IMPORTANT: backend can reject role changes when incompatible fields remain.
      // Example: changing a student (has MajorId) into company/admin/cro_staff.
      // We clear foreign keys that don't apply to the selected role.
      if (roleChanged) {
        if (nextRole === 'student') {
          // Students should not be tied to a company.
          fd.append('CompanyId', '');
        } else if (nextRole === 'company') {
          // Companies should not have a major.
          fd.append('MajorId', '');
        } else {
          // Admin/CRO staff: clear both.
          fd.append('MajorId', '');
          fd.append('CompanyId', '');
        }
      }
    }

    appendIfChangedInt('MajorId', editForm.majorId, editInitial?.majorId);
    appendIfChangedInt('CompanyId', editForm.companyId, editInitial?.companyId);

    if (editForm.password?.trim()) {
      fd.append('Password', editForm.password);
    }
    if (editForm.avatarFile instanceof File) {
      fd.append('AvatarUrl', editForm.avatarFile);
    }
    if (editForm.cvFile instanceof File) {
      fd.append('CvUrl', editForm.cvFile);
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
      console.groupCollapsed('[Admin][UserUpdate] FormData');
      console.log('userId:', editingUser.userId);
      console.table(entries.map(([k, v]) => ({ key: k, value: typeof v === 'string' ? v : JSON.stringify(v) })));
      console.log('raw entries:', entries);
      console.groupEnd();
    } catch (logError) {
      console.warn('[Admin][UserUpdate] Failed to log FormData', logError);
    }

    setEditSaving(true);
    try {
      await userApi.update(fd);
      await refreshUsers();
      closeEdit();
    } catch (err) {
      console.error('[Admin][UserUpdate] Request failed', {
        message: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        url: err?.config?.url,
        method: err?.config?.method,
      });
      window.alert(err?.response?.data?.message || err?.response?.data || err?.message || 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const formatDob = (dob) => {
    if (!dob) return '-';
    try {
      // API returns YYYY-MM-DD (date-only) or ISO.
      const d = new Date(dob);
      if (Number.isNaN(d.getTime())) return String(dob);
      return d.toLocaleDateString();
    } catch {
      return String(dob);
    }
  };

  const getInitials = (fullNameOrEmail) => {
    const s = String(fullNameOrEmail || '').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return (first + last).toUpperCase() || s[0].toUpperCase();
  };

  const getRoleLabel = (u) => {
    const raw = (u?.role ?? u?.Role ?? '').toString().trim();
    if (raw) return raw;

    // Fallback inference when API doesn't include role.
    if (u?.studentCode) return 'student';
    if (u?.companyId != null) return 'company';
    return 'staff';
  };

  const isAllowedAvatarFile = (file) => {
    if (!(file instanceof File)) return false;
    const allowedTypes = new Set(['image/png', 'image/jpeg']);
    if (allowedTypes.has(file.type)) return true;
    // Fallback when some browsers don't provide a type.
    const name = String(file.name || '').toLowerCase();
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setField('avatarFile', null);
      if (editAvatarPreviewIsObjectUrl && editAvatarPreviewUrl) {
        try { URL.revokeObjectURL(editAvatarPreviewUrl); } catch {}
      }
      setEditAvatarPreviewIsObjectUrl(false);
      setEditAvatarPreviewUrl(pickAvatarUrl(editingUser) || '');
      return;
    }

    if (!isAllowedAvatarFile(file)) {
      window.alert('Avatar must be a PNG or JPG image.');
      setField('avatarFile', null);
      setAvatarInputKey((k) => k + 1);
      return;
    }

    setField('avatarFile', file);
    if (editAvatarPreviewIsObjectUrl && editAvatarPreviewUrl) {
      try { URL.revokeObjectURL(editAvatarPreviewUrl); } catch {}
    }
    const url = URL.createObjectURL(file);
    setEditAvatarPreviewUrl(url);
    setEditAvatarPreviewIsObjectUrl(true);
  };

  const UserAvatar = ({ url, label }) => {
    const [broken, setBroken] = useState(false);
    const initials = getInitials(label);

    const normalizedUrl = useMemo(() => pickAvatarUrl({ avatarUrl: url }), [url]);

    if (!normalizedUrl || broken) {
      return (
        <div className="user-avatar fallback" aria-label="avatar placeholder">
          {initials}
        </div>
      );
    }

    return (
      <img
        className="user-avatar"
        src={normalizedUrl}
        alt={label || 'avatar'}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  };

  return (
    <div className="admin-page user-manager">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage student accounts and OJT status</p>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by Student Code, Name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)}>
            <option value="">All Majors</option>
            {majorOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="student">Student</option>
            <option value="cro_staff">CRO Staff</option>
            <option value="company">Company</option>
          </select>
          <button className="btn-secondary" type="button" onClick={exportCsv} disabled={loading || filteredUsers.length === 0}>
            Export List
          </button>
        </div>
        
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student Code</th>
              <th>Name</th>
              <th>User</th>
              <th>Role</th>
              <th>Major</th>
              <th>DOB</th>
              <th>Phone</th>
              <th>CV</th>
              <th>Avatar</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10}>Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={10}>{error}</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={10}>No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const majorName = u?.majorId != null ? (majorMap.get(Number(u.majorId)) || String(u.majorId)) : '-';
                const roleName = getRoleLabel(u);
                const status = getAccountStatus(u);
                const isSelf = currentUserId && Number(u?.userId) === Number(currentUserId);
                return (
                  <tr key={u.userId}>
                    <td>{u.studentCode || '-'}</td>
                    <td>{u.fullname || '-'}</td>
                    <td>{u.email || '-'}</td>
                    <td>{roleName}</td>
                    <td>{majorName}</td>
                    <td>{formatDob(u.dob)}</td>
                    <td>{u.phone || '-'}</td>
                    <td>
                      {u.cvUrl ? (
                        <a className="btn-secondary" href={u.cvUrl} target="_blank" rel="noreferrer">
                          Download CV
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    <td>
                      <UserAvatar url={u.avatarUrl || u.avatarURL} label={u.fullname || u.email} />
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn-secondary" type="button" onClick={() => openEdit(u)}>
                          Edit
                        </button>
                        <button
                          className={status === 'active' ? 'btn-danger' : 'btn-secondary'}
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf}
                          title={isSelf ? "You can't change your own status." : (status === 'active' ? 'Deactivate user' : 'Activate user')}
                        >
                          {status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <Modal
          open={statusConfirm.open}
          centered
          confirmLoading={statusSaving}
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <ExclamationCircleOutlined />
              {statusConfirm.nextStatus === 'inactive' ? 'Deactivate this user?' : 'Activate this user?'}
            </span>
          }
          okText={statusConfirm.nextStatus === 'inactive' ? 'Deactivate' : 'Activate'}
          cancelText="Cancel"
          okButtonProps={statusConfirm.nextStatus === 'inactive' ? { danger: true } : undefined}
          onOk={confirmToggleStatus}
          onCancel={closeStatusConfirm}
          maskClosable={!statusSaving}
          keyboard={!statusSaving}
        >
          {statusConfirm.nextStatus === 'inactive'
            ? 'This user will not be able to log in until you reactivate them.'
            : 'This user will regain access to the system.'}
        </Modal>

        {editingUser && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <h3>Edit User</h3>
                <button className="modal-close" type="button" onClick={closeEdit} aria-label="Close" disabled={editSaving}>
                  ×
                </button>
              </div>

              <form className="modal-body" onSubmit={handleUpdate}>
                <div className="form-grid">
                  <label>
                    Full name
                    <input value={editForm.fullname} onChange={(e) => setField('fullname', e.target.value)} />
                  </label>

                  <label>
                    Student code
                    <input value={editForm.studentCode} onChange={(e) => setField('studentCode', e.target.value)} />
                  </label>

                  <label>
                    DOB
                    <input type="date" value={editForm.dob} onChange={(e) => setField('dob', e.target.value)} />
                  </label>

                  <label>
                    Phone
                    <input value={editForm.phone} onChange={(e) => setField('phone', e.target.value)} />
                  </label>

                  <label>
                    Role
                    <select
                      value={editForm.role}
                      onChange={(e) => setField('role', e.target.value)}
                      disabled={!isAdmin || isRoleLockedByMajor(editingUser)}
                      title={
                        !isAdmin
                          ? 'Only admin can change role'
                          : (isRoleLockedByMajor(editingUser) ? 'Role is locked because this user already has a major' : 'Change role')
                      }
                    >
                      <option value="">(no change)</option>
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Major
                    <select value={editForm.majorId} onChange={(e) => setField('majorId', e.target.value)}>
                      <option value="">(no major)</option>
                      {majorOptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Company ID
                    <input type="number" value={editForm.companyId} onChange={(e) => setField('companyId', e.target.value)} />
                  </label>

                  <label>
                    New password
                    <input type="password" value={editForm.password} onChange={(e) => setField('password', e.target.value)} placeholder="Leave blank to keep" />
                  </label>

                  <label>
                    Avatar file
                    <input
                      key={avatarInputKey}
                      type="file"
                      accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                      onChange={handleAvatarFileChange}
                    />
                    <div className="avatar-preview" aria-label="Selected avatar preview">
                      {editAvatarPreviewUrl ? (
                        <img
                          src={editAvatarPreviewUrl}
                          alt={editForm.fullname ? `${editForm.fullname} avatar` : 'avatar preview'}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="avatar-fallback">{getInitials(editForm.fullname || editingUser?.email)}</div>
                      )}
                    </div>
                  </label>

                  <label>
                    CV file
                    <input type="file" accept="application/pdf,.pdf" onChange={(e) => setField('cvFile', e.target.files?.[0] || null)} />
                  </label>
                </div>

                <div className="modal-actions">
                  <button className="btn-secondary" type="button" onClick={closeEdit} disabled={editSaving}>
                    Cancel
                  </button>
                  <button className="btn-primary" type="submit" disabled={editSaving}>
                    {editSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManager;
