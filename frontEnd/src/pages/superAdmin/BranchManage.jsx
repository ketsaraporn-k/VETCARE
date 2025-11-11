// src/pages/superAdmin/BranchManage.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import "./BranchManage.css";

/**
 * BranchManage (improved) - full file to replace previous one
 *
 * Assumptions:
 * - api is axios instance configured with baseURL and withCredentials:true
 * - backend supports:
 *    GET  /api/branches? q=&page=&pageSize=
 *    GET  /api/branches/:id
 *    POST /api/branches
 *    PUT  /api/branches/:id
 *    DELETE /api/branches/:id
 *    GET  /api/users?role=branchAdmin  (or returns list of users)
 *
 * Notes:
 * - This file is defensive about different shapes of responses.
 * - It uses _id or id interchangeably.
 */

function idOf(x) {
  return x?._id || x?.id || x || "";
}

function ensureArrayFromResponse(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data && Array.isArray(res.data)) return res.data;
  if (res.data && res.data.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
}

export default function BranchManage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // search & pagination
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);

  // managers dropdown
  const [managers, setManagers] = useState([]);

  // modals & forms
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ branchName: "", addressBranch: "", phone: "", managerId: "" });

  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState(null);

  // fetch branches list (page & optional q)
  const fetchBranches = async ({ page = 1, q = "" } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/branches", { params: { page, pageSize, q } });
      // flexible parse
      const data = ensureArrayFromResponse(res.data);
      setBranches(data);
      // total / page info
      const totalFromRes = res.data?.total ?? res.data?.meta?.total ?? (Array.isArray(res.data) ? res.data.length : data.length);
      setTotal(Number(totalFromRes || data.length || 0));
      setPage(Number(res.data?.page || page));
    } catch (err) {
      console.error("fetchBranches err:", err);
      setError(err?.response?.data?.error || err.message || "Unable to fetch branches");
      setBranches([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // fetch managers (branchAdmin)
  const fetchManagers = async () => {
    try {
      const res = await api.get("/api/users", { params: { role: "branchAdmin" } });
      const list = ensureArrayFromResponse(res.data);
      setManagers(list);
    } catch (err) {
      console.warn("fetchManagers err:", err);
      // fallback: if endpoint not available, try all users
      try {
        const r2 = await api.get("/api/users");
        setManagers(ensureArrayFromResponse(r2.data).filter(u => (u.role || "").toLowerCase().includes("branch")));
      } catch (e) {
        setManagers([]);
      }
    }
  };

  useEffect(() => {
    fetchBranches({ page: 1, q: "" });
    fetchManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e) => {
    const v = e.target.value;
    setQ(v);
    setPage(1);
    fetchBranches({ page: 1, q: v });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ branchName: "", addressBranch: "", phone: "", managerId: "" });
    setShowForm(true);
    setError(null);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      branchName: b.branchName || "",
      addressBranch: b.addressBranch || "",
      phone: b.phone || "",
      managerId: idOf(b.managerId || b.manager) || ""
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setEditing(null);
    setForm({ branchName: "", addressBranch: "", phone: "", managerId: "" });
    setShowForm(false);
  };

  const submitForm = async (e) => {
    e && e.preventDefault();
    setError(null);
    if (!form.branchName || form.branchName.trim().length < 2) {
      setError("กรุณาระบุชื่อสาขา (อย่างน้อย 2 ตัวอักษร)");
      return;
    }
    try {
      if (editing) {
        const id = idOf(editing);
        const res = await api.put(`/api/branches/${id}`, {
          branchName: form.branchName,
          addressBranch: form.addressBranch,
          phone: form.phone,
          managerId: form.managerId || null
        });
        // updated branch returned in many shapes
        const updated = res.data || res.data?.branch || res.data?.data || res;
        setBranches(prev => prev.map(x => (idOf(x) === id ? (updated || { ...x, ...form }) : x)));
      } else {
        const res = await api.post("/api/branches", {
          branchName: form.branchName,
          addressBranch: form.addressBranch,
          phone: form.phone,
          managerId: form.managerId || null
        });
        const created = res.data || res.data?.branch || res.data?.data || res;
        setBranches(prev => [created, ...prev]);
      }
      closeForm();
    } catch (err) {
      console.error("submitForm err:", err);
      setError(err?.response?.data?.error || err.message || "Save failed");
    }
  };

  const handleDelete = async (b) => {
    const id = idOf(b);
    if (!id) return;
    if (!window.confirm(`ยืนยันการลบสาขา: ${b.branchName} ?`)) return;
    try {
      await api.delete(`/api/branches/${id}`);
      setBranches(prev => prev.filter(x => idOf(x) !== id));
    } catch (err) {
      console.error("handleDelete err:", err);
      alert(err?.response?.data?.error || err.message || "Delete failed");
    }
  };

  const viewDetail = async (b) => {
    const id = idOf(b);
    if (!id) return;
    setDetail(null);
    setShowDetail(true);
    try {
      const res = await api.get(`/api/branches/${id}`);
      const full = res.data || res.data?.branch || res.data?.data || res;
      setDetail(full);
    } catch (err) {
      console.error("viewDetail err:", err);
      setDetail({ error: err?.response?.data?.error || err.message || "Unable to load" });
    }
  };

  // assign manager quick (optimistic)
  const assignManager = async (branchId, managerId) => {
    if (!branchId) return;
    const idStr = String(branchId);
    // optimistic update
    setBranches(prev => prev.map(b => (String(idOf(b)) === idStr ? { ...b, managerId } : b)));
    try {
      const res = await api.put(`/api/branches/${branchId}`, { managerId: managerId || null });
      const updated = res.data || res.data?.branch || res.data?.data || res;
      setBranches(prev => prev.map(b => (String(idOf(b)) === idStr ? (updated || b) : b)));
      if (detail && String(idOf(detail)) === idStr) setDetail(prev => ({ ...(prev || {}), managerId }));
    } catch (err) {
      console.error("assignManager err:", err);
      alert(err?.response?.data?.error || err.message || "Assign failed");
      // revert by re-fetching
      fetchBranches({ page, q });
    }
  };

  const goPage = (p) => {
    const next = Math.max(1, p);
    setPage(next);
    fetchBranches({ page: next, q });
  };

  const totalPages = Math.max(1, Math.ceil((total || branches.length) / pageSize));

  return (
    <div className="branch-manage-root">
      <header className="bm-header">
        <h2>Manage Branches</h2>
        <div className="bm-actions">
          <button className="btn" onClick={openCreate}>+ Create Branch</button>
          <button className="btn ghost" onClick={() => fetchBranches({ page, q })}>Refresh</button>
        </div>
      </header>

      <div className="bm-controls">
        <input className="bm-search" placeholder="Search branch name / address..." value={q} onChange={onSearch} />
        <div className="bm-meta">{loading ? "Loading..." : `${total || branches.length} items`}</div>
      </div>

      {error && <div className="bm-error">{error}</div>}

      <div className="bm-table-wrap">
        <table className="bm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Manager</th>
              <th>Phone</th>
              <th className="tcenter">Medicines</th>
              <th className="tcenter">Schedules</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!branches || branches.length === 0) && !loading ? (
              <tr><td colSpan={6} className="empty">No branches found</td></tr>
            ) : branches.map(b => (
              <tr key={idOf(b)}>
                <td>{b.branchName}</td>
                <td>
                  <div className="manager-line">
                    <div className="mgr-name">
                      {b.managerName || (b.manager && (b.manager.name || b.manager.username)) || (typeof b.managerId === "string" && b.managerId ? "Assigned" : "—")}
                    </div>
                    <div>
                      <select value={idOf(b.manager || b.managerId) || ""} onChange={(e) => assignManager(idOf(b), e.target.value)}>
                        <option value="">— assign —</option>
                        {managers.map(m => <option key={idOf(m)} value={idOf(m)}>{m.name || m.username}</option>)}
                      </select>
                    </div>
                  </div>
                </td>
                <td>{b.phone || "-"}</td>
                <td className="tcenter">{typeof b.medicinesCount !== "undefined" ? b.medicinesCount : (b.medicines ? b.medicines.length : "-")}</td>
                <td className="tcenter">{typeof b.schedulesCount !== "undefined" ? b.schedulesCount : (b.schedules ? b.schedules.length : "-")}</td>
                <td>
                  <div className="actions-row">
                    <button className="btn small" onClick={() => viewDetail(b)}>View</button>
                    <button className="btn small" onClick={() => openEdit(b)}>Edit</button>
                    <button className="btn small danger" onClick={() => handleDelete(b)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bm-pager">
        <button className="btn" onClick={() => goPage(page - 1)} disabled={page <= 1}>Prev</button>
        <div>Page {page} / {totalPages}</div>
        <button className="btn" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>Next</button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="bm-modal-backdrop" onClick={closeForm}>
          <form className="bm-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitForm}>
            <h3>{editing ? "Edit Branch" : "Create Branch"}</h3>

            <label>Branch Name *</label>
            <input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} required />

            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            <label>Address</label>
            <textarea value={form.addressBranch} onChange={(e) => setForm({ ...form, addressBranch: e.target.value })} rows={3} />

            <label>Manager</label>
            <select value={form.managerId || ""} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">— none —</option>
              {managers.map(m => <option key={idOf(m)} value={idOf(m)}>{m.name || m.username}</option>)}
            </select>

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn">{editing ? "Save" : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Detail modal */}
      {showDetail && (
        <div className="bm-modal-backdrop" onClick={() => setShowDetail(false)}>
          <div className="bm-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="detail-head">
              <h3>{detail?.branchName || "Branch Detail"}</h3>
              <div><button className="btn" onClick={() => setShowDetail(false)}>Close</button></div>
            </div>

            {!detail && <div>Loading...</div>}
            {detail && detail.error && <div className="bm-error">{detail.error}</div>}

            {detail && !detail.error && (
              <>
                <div className="detail-row"><strong>Phone:</strong> {detail.phone || "-"}</div>
                <div className="detail-row"><strong>Address:</strong> {detail.addressBranch || "-"}</div>
                <div className="detail-row"><strong>Manager:</strong> {(detail.managerName || detail.manager?.name) || (detail.managerId ? detail.managerId : "-")}</div>

                <hr />

                <h4>Medicines ({(detail.medicines || []).length})</h4>
                <div className="list-scroll">
                  {(detail.medicines || []).map(m => (
                    <div key={idOf(m)} className="list-item">
                      <div className="li-left">{m.medicineName}</div>
                      <div className="li-right">Stock: {m.stock ?? 0}</div>
                      <div className="li-sub">Threshold: {m.lowStockThreshold ?? 5} • Alert: {m.lowStockAlert ? "Yes" : "No"}</div>
                    </div>
                  ))}
                  {(!detail.medicines || detail.medicines.length === 0) && <div className="muted">No medicines</div>}
                </div>

                <hr />

                <h4>Upcoming schedules</h4>
                <div className="list-scroll">
                  {(detail.schedules || []).slice(0, 12).map(s => (
                    <div key={idOf(s)} className="list-item">
                      <div className="li-left">{s.serviceType || "Appointment"} — {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "-"}</div>
                      <div className="li-sub">{s.notes || ""}</div>
                    </div>
                  ))}
                  {(!detail.schedules || detail.schedules.length === 0) && <div className="muted">No schedules</div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
