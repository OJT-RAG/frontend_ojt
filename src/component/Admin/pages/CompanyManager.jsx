import React, { useEffect, useState } from 'react';
import './CompanyManager.scss';
import companyApi from '../../API/CompanyAPI';

const CompanyManager = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    tax_Code: '',
    address: '',
    website: '',
    contact_Email: '',
    phone: '',
    logo_URL: '',
    is_Verified: false,
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    tax_Code: '',
    address: '',
    website: '',
    contact_Email: '',
    phone: '',
    logo_URL: '',
    is_Verified: false,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [companyRes] = await Promise.all([
          companyApi.getAll(),
        ]);

        const list = companyRes?.data?.data || [];
        if (cancelled) return;
        setCompanies(Array.isArray(list) ? list : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || 'Failed to load companies');
        setCompanies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCompanies = async () => {
    try {
      const res = await companyApi.getAll();
      const list = res?.data?.data || [];
      setCompanies(Array.isArray(list) ? list : []);
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Failed to refresh companies');
    }
  };

  const getCompanyId = (c) => (
    c?.company_ID ?? c?.Company_ID ?? c?.companyId ?? c?.CompanyId ?? c?.id ?? c?.Id
  );

  const getVerified = (c) => {
    if (typeof c?.is_Verified === 'boolean') return c.is_Verified;
    if (typeof c?.isVerified === 'boolean') return c.isVerified;
    if (typeof c?.is_verified === 'boolean') return c.is_verified;
    return false;
  };

  const resetCreate = () => {
    setCreateForm({
      name: '',
      tax_Code: '',
      address: '',
      website: '',
      contact_Email: '',
      phone: '',
      logo_URL: '',
      is_Verified: false,
    });
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

  const startEdit = (c) => {
    setCreating(false);
    resetCreate();
    const id = getCompanyId(c);
    setEditingId(id != null ? Number(id) : null);
    setEditForm({
      name: c?.name ?? '',
      tax_Code: c?.tax_Code ?? c?.taxCode ?? '',
      address: c?.address ?? '',
      website: c?.website ?? '',
      contact_Email: c?.contact_Email ?? c?.contactEmail ?? '',
      phone: c?.phone ?? '',
      logo_URL: c?.logo_URL ?? c?.logoUrl ?? '',
      is_Verified: getVerified(c),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: '',
      tax_Code: '',
      address: '',
      website: '',
      contact_Email: '',
      phone: '',
      logo_URL: '',
      is_Verified: false,
    });
  };

  const validateForm = (f) => {
    if (!String(f.name || '').trim()) return 'Company name is required.';
    if (!String(f.tax_Code || '').trim()) return 'Tax code is required.';
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
        tax_Code: String(createForm.tax_Code).trim(),
        address: String(createForm.address || '').trim(),
        website: String(createForm.website || '').trim(),
        contact_Email: String(createForm.contact_Email || '').trim(),
        phone: String(createForm.phone || '').trim(),
        logo_URL: String(createForm.logo_URL || '').trim(),
        is_Verified: !!createForm.is_Verified,
      };

      await companyApi.create(payload);
      await refreshCompanies();
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
        tax_Code: String(editForm.tax_Code).trim(),
        address: String(editForm.address || '').trim(),
        website: String(editForm.website || '').trim(),
        contact_Email: String(editForm.contact_Email || '').trim(),
        phone: String(editForm.phone || '').trim(),
        logo_URL: String(editForm.logo_URL || '').trim(),
        is_Verified: !!editForm.is_Verified,
        company_ID: Number(id),
      };

      await companyApi.update(payload);
      await refreshCompanies();
      cancelEdit();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Update failed');
    }
  };

  const deleteCompany = async (id) => {
    const ok = window.confirm('Delete this company?');
    if (!ok) return;
    try {
      await companyApi.deleteById(id);
      setCompanies((prev) => prev.filter((c) => Number(getCompanyId(c)) !== Number(id)));
      if (editingId === id) cancelEdit();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || 'Delete failed');
    }
  };

  return (
    <div className="admin-page company-manager">
      <div className="page-header">
        <h1>Company Management</h1>
        <p>Approve and manage participating companies</p>
      </div>

      <div className="card">
        <div className="toolbar">
          <button className="btn-primary" type="button" onClick={startCreate} disabled={creating || loading}>
            Create New Company
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Tax Code</th>
              <th>Address</th>
              <th>Website</th>
              <th>Status</th>
              <th>Contact Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <tr className="company-row editing">
                <td>
                  <input
                    className="cm-input"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Company name"
                  />
                </td>
                <td>
                  <input
                    className="cm-input"
                    value={createForm.tax_Code}
                    onChange={(e) => setCreateForm((p) => ({ ...p, tax_Code: e.target.value }))}
                    placeholder="Tax code"
                  />
                </td>
                <td>
                  <input
                    className="cm-input"
                    value={createForm.address}
                    onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Address"
                  />
                </td>
                <td>
                  <input
                    className="cm-input"
                    value={createForm.website}
                    onChange={(e) => setCreateForm((p) => ({ ...p, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </td>
                <td>
                  <label className="cm-check">
                    <input
                      type="checkbox"
                      checked={createForm.is_Verified}
                      onChange={(e) => setCreateForm((p) => ({ ...p, is_Verified: e.target.checked }))}
                    />
                    Verified
                  </label>
                </td>
                <td>
                  <input
                    className="cm-input"
                    value={createForm.contact_Email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, contact_Email: e.target.value }))}
                    placeholder="email@company.com"
                  />
                </td>
                <td>
                  <input
                    className="cm-input"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Phone"
                  />
                </td>
                <td>
                  <button className="btn-primary" type="button" onClick={saveCreate}>Save</button>
                  <button className="btn-secondary" type="button" onClick={cancelCreate} style={{ marginLeft: 10 }}>Cancel</button>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={8}>Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8}>{error}</td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={8}>No companies found.</td>
              </tr>
            ) : (
              companies.map((c) => {
                const id = getCompanyId(c);
                const numericId = id != null ? Number(id) : null;
                const isEditing = numericId != null && editingId === numericId;
                const verified = getVerified(c);

                return (
                  <tr key={numericId ?? JSON.stringify(c)} className={`company-row ${isEditing ? 'editing' : ''}`}>
                    <td>
                      {isEditing ? (
                        <input
                          className="cm-input"
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        />
                      ) : (
                        c?.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="cm-input"
                          value={editForm.tax_Code}
                          onChange={(e) => setEditForm((p) => ({ ...p, tax_Code: e.target.value }))}
                        />
                      ) : (
                        c?.tax_Code ?? c?.taxCode ?? '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="cm-input"
                          value={editForm.address}
                          onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                          placeholder="Address"
                        />
                      ) : (
                        c?.address ?? '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="cm-input"
                          value={editForm.website}
                          onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))}
                          placeholder="https://..."
                        />
                      ) : c?.website ? (
                        <a href={c.website} target="_blank" rel="noreferrer">{c.website}</a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="cm-check">
                          <input
                            type="checkbox"
                            checked={!!editForm.is_Verified}
                            onChange={(e) => setEditForm((p) => ({ ...p, is_Verified: e.target.checked }))}
                          />
                          Verified
                        </label>
                      ) : (
                        <span className={`badge ${verified ? 'success' : 'warning'}`}>{verified ? 'Approved' : 'Pending'}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="cm-input"
                          value={editForm.contact_Email}
                          onChange={(e) => setEditForm((p) => ({ ...p, contact_Email: e.target.value }))}
                        />
                      ) : (
                        c?.contact_Email ?? c?.contactEmail ?? '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="cm-input"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                        />
                      ) : (
                        c?.phone ?? '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <>
                          <button className="btn-primary" type="button" onClick={() => saveEdit(numericId)} disabled={numericId == null}>Save</button>
                          <button className="btn-secondary" type="button" onClick={cancelEdit} style={{ marginLeft: 10 }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(c)} disabled={numericId == null}>Edit</button>
                          <button className="btn-danger" type="button" style={{ marginLeft: 10 }} onClick={() => deleteCompany(numericId)} disabled={numericId == null}>Delete</button>
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

export default CompanyManager;
