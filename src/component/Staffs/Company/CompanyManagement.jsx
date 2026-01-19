import React, { useEffect, useState } from "react";
import companySemesterApi from "../../API/CompanySemesterAPI";
import companyApi from "../../API/CompanyAPI";
import "./CompanyManagement.scss";

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [companyMap, setCompanyMap] = useState({});
  const [loading, setLoading] = useState(false);

  // ===== Fetch company list & build map =====
  const fetchCompanyMap = async () => {
    try {
      const res = await companyApi.getAll();

      console.log("[CompanyAPI] res.data:", res.data);

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      const map = {};
      list.forEach((c) => {
        map[c.company_ID] = c;
      });

      console.log("[CompanyMap]", map);

      setCompanyMap(map);
    } catch (err) {
      console.error("Failed to fetch companies", err);
      setCompanyMap({});
    }
  };

  // ===== Fetch semester-company list =====
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await companySemesterApi.getAll();

      console.log("[CompanySemester] res.data:", res.data);

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      setCompanies(list);
    } catch (err) {
      console.error("Failed to fetch semester companies", err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyMap();
    fetchCompanies();
  }, []);

  // ===== Approve =====
  const handleApprove = async (item) => {
  try {
    const payload = {
      semesterCompanyId: item.semesterCompanyId,
      semesterId: item.semesterId,
      companyId: item.companyId,
      approvedAt: new Date().toISOString(),
    };

    console.log("[Approve payload]", payload);

    // ✅ chỉ truyền payload
    await companySemesterApi.approve(payload);

    fetchCompanies();
  } catch (err) {
    console.error("Approve failed", err);
  }
};


  // ===== Delete =====
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this company from semester?")) return;

    try {
      await companySemesterApi.delete(id);
      fetchCompanies();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className="company-management">
      <h1>Company Management</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="company-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Company</th>
              <th>Semester ID</th>
              <th>Approved At</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {companies.length === 0 && (
              <tr>
                <td colSpan="5" className="empty">
                  No data
                </td>
              </tr>
            )}

            {companies.map((item) => {
              const company = companyMap[item.companyId];

              return (
                <tr key={item.semesterCompanyId}>
                  <td>{item.semesterCompanyId}</td>

                  <td>
                    <div className="company-cell">
                    
                      <div>
                        <div className="name">
                          {company?.name || "Unknown"}
                        </div>
                        <div className="email">
                          {company?.contact_Email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>{item.semesterId}</td>

                  <td>
                    {item.approvedAt
                      ? new Date(item.approvedAt).toLocaleString()
                      : "Pending"}
                  </td>

                  <td className="actions">
  {!item.approvedAt && (
    <button
      className="approve"
      onClick={() => handleApprove(item)}
    >
      Approve
    </button>
  )}

  <button
    className="delete"
    onClick={() => handleDelete(item.semesterCompanyId)}
  >
    Delete
  </button>
</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
