import React, { useEffect, useMemo, useState } from 'react';
import './UserManager.scss';
import userApi from '../../API/UserAPI';
import majorApi from '../../API/MajorAPI';

const UserManager = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [majors, setMajors] = useState([]);

  const [editingUser, setEditingUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullname: '',
    studentCode: '',
    dob: '',
    phone: '',
    majorId: '',
    companyId: '',
    password: '',
    avatarFile: null,
    cvFile: null,
  });
  const [editInitial, setEditInitial] = useState(null);

  const [query, setQuery] = useState('');
  const [majorFilter, setMajorFilter] = useState('');

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

    return users.filter((u) => {
      if (majorId != null && Number(u?.majorId) !== majorId) return false;
      if (!q) return true;
      const studentCode = String(u?.studentCode || '').toLowerCase();
      const fullname = String(u?.fullname || '').toLowerCase();
      const email = String(u?.email || '').toLowerCase();
      return studentCode.includes(q) || fullname.includes(q) || email.includes(q);
    });
  }, [users, query, majorFilter]);

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

  const handleDelete = async (userId) => {
    const ok = window.confirm('Delete this user?');
    if (!ok) return;
    try {
      await userApi.deleteById(userId);
      setUsers((prev) => prev.filter((u) => u?.userId !== userId));
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Delete failed');
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    const initial = {
      fullname: u?.fullname ?? '',
      studentCode: u?.studentCode ?? '',
      dob: u?.dob ? String(u.dob).slice(0, 10) : '',
      phone: u?.phone ?? '',
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
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditingUser(null);
    setEditInitial(null);
    setEditForm({
      fullname: '',
      studentCode: '',
      dob: '',
      phone: '',
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

    const appendIfChanged = (fieldName, value, initialValue) => {
      if (!editInitial) {
        fd.append(fieldName, value ?? '');
        return;
      }
      if ((value ?? '') !== (initialValue ?? '')) {
        fd.append(fieldName, value ?? '');
      }
    };

    appendIfChanged('Fullname', editForm.fullname, editInitial?.fullname);
    appendIfChanged('StudentCode', editForm.studentCode, editInitial?.studentCode);
    appendIfChanged('Dob', editForm.dob, editInitial?.dob);
    appendIfChanged('Phone', editForm.phone, editInitial?.phone);
    appendIfChanged('MajorId', editForm.majorId, editInitial?.majorId);
    appendIfChanged('CompanyId', editForm.companyId, editInitial?.companyId);

    if (editForm.password?.trim()) {
      fd.append('Password', editForm.password);
    }
    if (editForm.avatarFile instanceof File) {
      fd.append('AvatarUrl', editForm.avatarFile);
    }
    if (editForm.cvFile instanceof File) {
      fd.append('CvUrl', editForm.cvFile);
    }

    setEditSaving(true);
    try {
      await userApi.update(fd);
      await refreshUsers();
      closeEdit();
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Update failed');
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
                      {u.avatarUrl ? (
                        <img className="user-avatar" src={u.avatarUrl} alt={u.fullname || 'avatar'} />
                      ) : (
                        <div className="user-avatar fallback" aria-label="avatar placeholder">
                          {getInitials(u.fullname || u.email)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn-secondary" type="button" onClick={() => openEdit(u)}>
                          Edit
                        </button>
                        <button
                          className="btn-danger"
                          type="button"
                          onClick={() => handleDelete(u.userId)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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
                    <input type="file" accept="image/*" onChange={(e) => setField('avatarFile', e.target.files?.[0] || null)} />
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
