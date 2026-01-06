import React, { useEffect, useMemo, useState } from 'react';
import './SemesterManager.scss';
import semesterApi from '../../API/SemesterAPI';

const SemesterManager = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [semesters, setSemesters] = useState([]);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await semesterApi.getAll();
        const list = res?.data?.data || [];
        if (cancelled) return;
        setSemesters(Array.isArray(list) ? list : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || 'Failed to load semesters');
        setSemesters([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedSemesters = useMemo(() => {
    return [...semesters].sort((a, b) => {
      const da = new Date(a?.startDate || 0).getTime();
      const db = new Date(b?.startDate || 0).getTime();
      return db - da;
    });
  }, [semesters]);

  const resetCreate = () => {
    setCreateForm({ name: '', startDate: '', endDate: '', isActive: false });
  };

  const startCreate = () => {
    setEditingId(null);
    setCreating(true);
    resetCreate();
  };

  const cancelCreate = () => {
    setCreating(false);
    resetCreate();
  };

  const startEdit = (s) => {
    setCreating(false);
    resetCreate();
    setEditingId(s?.semesterId ?? null);
    setEditForm({
      name: s?.name || '',
      startDate: s?.startDate || '',
      endDate: s?.endDate || '',
      isActive: !!s?.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', startDate: '', endDate: '', isActive: false });
  };

  const validateForm = (f) => {
    if (!String(f.name || '').trim()) return 'Name is required.';
    if (!f.startDate) return 'Start Date is required.';
    if (!f.endDate) return 'End Date is required.';
    const start = new Date(f.startDate).getTime();
    const end = new Date(f.endDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return 'Invalid date format.';
    if (end < start) return 'End Date must be after Start Date.';
    return null;
  };

  const saveCreate = async () => {
    const msg = validateForm(createForm);
    if (msg) {
      window.alert(msg);
      return;
    }
    try {
      const payload = {
        name: String(createForm.name).trim(),
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        isActive: !!createForm.isActive,
      };
      const res = await semesterApi.create(payload);
      const created = res?.data?.data;
      if (created?.semesterId != null) {
        setSemesters((prev) => [created, ...prev]);
      } else {
        // fallback: refresh list if response doesn't include entity
        const reload = await semesterApi.getAll();
        setSemesters(reload?.data?.data || []);
      }
      setCreating(false);
      resetCreate();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Create failed');
    }
  };

  const saveEdit = async (id) => {
    const msg = validateForm(editForm);
    if (msg) {
      window.alert(msg);
      return;
    }
    try {
      const payload = {
        name: String(editForm.name).trim(),
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        isActive: !!editForm.isActive,
      };
      const res = await semesterApi.update(id, payload);
      const updated = res?.data?.data;
      if (updated?.semesterId != null) {
        setSemesters((prev) => prev.map((s) => (s?.semesterId === id ? updated : s)));
      } else {
        const reload = await semesterApi.getAll();
        setSemesters(reload?.data?.data || []);
      }
      cancelEdit();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Update failed');
    }
  };

  const deleteSemester = async (id) => {
    const ok = window.confirm('Delete this semester?');
    if (!ok) return;
    try {
      await semesterApi.delete(id);
      setSemesters((prev) => prev.filter((s) => s?.semesterId !== id));
      if (editingId === id) cancelEdit();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Delete failed');
    }
  };

  return (
    <div className="admin-page semester-manager">
      <div className="page-header">
        <h1>Semester Management</h1>
        <p>Manage OJT semesters and timelines</p>
      </div>

      <div className="card">
        <div className="toolbar">
          <button className="btn-primary" type="button" onClick={startCreate} disabled={creating || loading}>
            Create New Semester
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <tr className="semester-row editing">
                <td>
                  <input
                    className="sm-input"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Semester name"
                  />
                </td>
                <td>
                  <input
                    className="sm-input"
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    className="sm-input"
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </td>
                <td>
                  <label className="sm-check">
                    <input
                      type="checkbox"
                      checked={createForm.isActive}
                      onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))}
                    />
                    Active
                  </label>
                </td>
                <td>
                  <button className="btn-primary" type="button" onClick={saveCreate}>Save</button>
                  <button className="btn-secondary" type="button" onClick={cancelCreate} style={{ marginLeft: 10 }}>Cancel</button>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={5}>Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5}>{error}</td>
              </tr>
            ) : sortedSemesters.length === 0 ? (
              <tr>
                <td colSpan={5}>No semesters found.</td>
              </tr>
            ) : (
              sortedSemesters.map((s) => {
                const isEditing = editingId === s.semesterId;
                const statusBadge = s.isActive ? 'active' : 'closed';

                return (
                  <tr key={s.semesterId} className={`semester-row ${isEditing ? 'editing' : ''}`}>
                    <td>
                      {isEditing ? (
                        <input
                          className="sm-input"
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        />
                      ) : (
                        s.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="sm-input"
                          type="date"
                          value={editForm.startDate}
                          onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                        />
                      ) : (
                        s.startDate
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="sm-input"
                          type="date"
                          value={editForm.endDate}
                          onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                        />
                      ) : (
                        s.endDate
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="sm-check">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                          />
                          Active
                        </label>
                      ) : (
                        <span className={`badge ${statusBadge}`}>{s.isActive ? 'Active' : 'Closed'}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <>
                          <button className="btn-primary" type="button" onClick={() => saveEdit(s.semesterId)}>Save</button>
                          <button className="btn-secondary" type="button" onClick={cancelEdit} style={{ marginLeft: 10 }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(s)}>Edit</button>
                          <button className="btn-danger" type="button" style={{ marginLeft: 10 }} onClick={() => deleteSemester(s.semesterId)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SemesterManager;
