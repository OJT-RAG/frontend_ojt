import React, { useEffect, useState } from 'react';
import './CompanyManager.scss';
import companyApi from '../../API/CompanyAPI';
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

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

  const getCompanyName = (c) => String(c?.name ?? '').trim();

  const getCompanyTaxCode = (c) =>
    String(c?.tax_Code ?? c?.taxCode ?? '').trim();

  const getVerified = (c) => {
    if (typeof c?.is_Verified === 'boolean') return c.is_Verified;
    if (typeof c?.isVerified === 'boolean') return c.isVerified;
    if (typeof c?.is_verified === 'boolean') return c.is_verified;
    return false;
  };

  const showToast = (type, text) => {
    const background =
      type === 'success'
        ? 'linear-gradient(135deg, #1f9d57, #34d399)'
        : type === 'warning'
          ? 'linear-gradient(135deg, #b45309, #f59e0b)'
          : 'linear-gradient(135deg, #b91c1c, #ef4444)';

    Toastify({
      text: String(text || ''),
      duration: 2500,
      gravity: 'top',
      position: 'right',
      close: true,
      stopOnFocus: true,
      style: { background },
    }).showToast();
  };

  const normalizeName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const normalizeTaxCode = (v) => String(v || '').trim();
  const normalizeAddress = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const normalizeEmail = (v) => String(v || '').trim().toLowerCase();
  const normalizePhone = (v) => String(v || '').trim();
  const normalizeWebsite = (v) => {
    const raw = String(v || '').trim().toLowerCase();
    if (!raw) return '';
    // Remove trailing slashes and common protocol prefixes for comparison.
    const noProto = raw.replace(/^https?:\/\//, '');
    return noProto.replace(/\/+$/, '');
  };

  const validateDuplicate = (form, currentId) => {
    const name = normalizeName(form?.name);
    const taxCode = normalizeTaxCode(form?.tax_Code);
    const address = normalizeAddress(form?.address);
    const website = normalizeWebsite(form?.website);
    const contactEmail = normalizeEmail(form?.contact_Email);
    const phone = normalizePhone(form?.phone);
    const currentNumericId = currentId != null ? Number(currentId) : null;

    if (name) {
      const dupName = companies.some((c) => {
        const id = getCompanyId(c);
        const idNum = id != null ? Number(id) : null;
        if (currentNumericId != null && idNum === currentNumericId) return false;
        return normalizeName(getCompanyName(c)) === name;
      });
      if (dupName) return 'Duplicate company name.';
    }

    if (taxCode) {
      const dupTax = companies.some((c) => {
        const id = getCompanyId(c);
        const idNum = id != null ? Number(id) : null;
        if (currentNumericId != null && idNum === currentNumericId) return false;
        return normalizeTaxCode(getCompanyTaxCode(c)) === taxCode;
      });
      if (dupTax) return 'Duplicate tax code.';
    }

    if (address) {
      const dupAddress = companies.some((c) => {
        const id = getCompanyId(c);
        const idNum = id != null ? Number(id) : null;
        if (currentNumericId != null && idNum === currentNumericId) return false;
        return normalizeAddress(c?.address) === address;
      });
      if (dupAddress) return 'Duplicate address.';
    }

    if (website) {
      const dupWebsite = companies.some((c) => {
        const id = getCompanyId(c);
        const idNum = id != null ? Number(id) : null;
        if (currentNumericId != null && idNum === currentNumericId) return false;
        return normalizeWebsite(c?.website) === website;
      });
      if (dupWebsite) return 'Duplicate website.';
    }

    if (contactEmail) {
      const dupEmail = companies.some((c) => {
        const id = getCompanyId(c);
        const idNum = id != null ? Number(id) : null;
        if (currentNumericId != null && idNum === currentNumericId) return false;
        return normalizeEmail(c?.contact_Email ?? c?.contactEmail) === contactEmail;
      });
      if (dupEmail) return 'Duplicate contact email.';
    }

    if (phone) {
      const dupPhone = companies.some((c) => {
        const id = getCompanyId(c);
        const idNum = id != null ? Number(id) : null;
        if (currentNumericId != null && idNum === currentNumericId) return false;
        return normalizePhone(c?.phone) === phone;
      });
      if (dupPhone) return 'Duplicate phone.';
    }

    return null;
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
    const name = String(f?.name || '').trim();
    const taxCode = String(f?.tax_Code || '').trim();
    const phone = String(f?.phone || '').trim();

    if (!name) return 'Company name is required.';
    if (/\d/.test(name)) return 'Company name cannot contain numbers.';

    if (!taxCode) return 'Tax code is required.';
    // Must be a non-negative number with exactly 10 digits (allow leading zeros).
    if (!/^\d{10}$/.test(taxCode)) return 'Tax code must be exactly 10 digits (e.g., 0100101010).';

    // Phone must follow format XXX-XXXXXXXX (e.g., 024-73008888).
    // Keep optional: only validate when provided.
    if (phone && !/^\d{3}-\d{8}$/.test(phone)) return 'Phone must follow format 024-73008888.';

    return null;
  };

  const saveCreate = async () => {
    const msg = validateForm(createForm);
    if (msg) {
      showToast('error', msg);
      return;
    }

    const dupMsg = validateDuplicate(createForm, null);
    if (dupMsg) {
      showToast('warning', dupMsg);
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
      showToast('success', 'Company created successfully.');
    } catch (e) {
      showToast('error', e?.response?.data?.message || e?.message || 'Create failed');
    }
  };

  const saveEdit = async (id) => {
    const msg = validateForm(editForm);
    if (msg) {
      showToast('error', msg);
      return;
    }

    const dupMsg = validateDuplicate(editForm, id);
    if (dupMsg) {
      showToast('warning', dupMsg);
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
      showToast('success', 'Company updated successfully.');
    } catch (e) {
      showToast('error', e?.response?.data?.message || e?.message || 'Update failed');
    }
  };

  const deleteCompany = async (id, isApproved) => {
    if (isApproved) {
      showToast('warning', "Can't delete: company is Approved.");
      return;
    }
    const ok = window.confirm('Delete this company?');
    if (!ok) return;
    try {
      await companyApi.deleteById(id);
      setCompanies((prev) => prev.filter((c) => Number(getCompanyId(c)) !== Number(id)));
      if (editingId === id) cancelEdit();
      showToast('success', 'Company deleted successfully.');
    } catch (e) {
      showToast('error', e?.response?.data?.message || e?.message || 'Delete failed');
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
                    inputMode="numeric"
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
                    placeholder="024-73008888"
                    inputMode="tel"
                    pattern="\d{3}-\d{8}"
                    title="Format: 024-73008888"
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
                          inputMode="numeric"
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
                          inputMode="tel"
                          placeholder="024-73008888"
                          pattern="\d{3}-\d{8}"
                          title="Format: 024-73008888"
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
                          <button
                            className="btn-danger"
                            type="button"
                            style={{ marginLeft: 10 }}
                            onClick={() => deleteCompany(numericId, verified)}
                            disabled={numericId == null}
                            title={verified ? "Can't delete: Approved" : 'Delete'}
                          >
                            Delete
                          </button>
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
