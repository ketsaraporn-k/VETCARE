import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axiosConfig";
import "./BranchManage.css";

function idOf(x) { return x?._id || x?.id || x || ""; }
function ensureArrayFromResponse(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data && Array.isArray(res.data)) return res.data;
  if (res.data && res.data.data && Array.isArray(res.data.data)) return res.data.data;
  if (Array.isArray(res?.data?.branches)) return res.data.branches;
  return [];
}
function useDebounced(value, wait = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), wait);
    return () => clearTimeout(t);
  }, [value, wait]);
  return v;
}

export default function BranchManage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // search & pagination
  const [q, setQ] = useState("");
  const debQ = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [total, setTotal] = useState(0);

  // managers dropdown
  const [managers, setManagers] = useState([]);

  // modals & forms
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ branchName: "", addressBranch: "", phone: "", managerId: "" });

  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState(null);

  // medicines modal
  const [medModal, setMedModal] = useState({ open: false, branchId: null, loading: false, medicines: [], error: null });

  useEffect(() => { fetchManagers(); }, []);

  // fetch branches whenever debounced query or page changes
  useEffect(() => { fetchBranches({ page, q: debQ }); }, [debQ, page]);

  async function fetchBranches({ page = 1, q = "" } = {}) {
    setLoading(true);
    setError(null);
    try {
      const tryEndpoints = [
        "/api/branches",
        "/branches",
        "/api/branches/all",
        "/api/branch/branches"
      ];
      let res = null;
      for (const ep of tryEndpoints) {
        try {
          res = await api.get(ep, { params: { page, pageSize, q } });
          if (res) break;
        } catch (err) { /* ignore and try next */ }
      }
      if (!res) throw new Error("No branches endpoint responded");
      const data = ensureArrayFromResponse(res.data);
      setBranches(data);
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
  }

  async function fetchManagers() {
    try {
      const tryEndpoints = [
        "/api/users?role=branchAdmin",
        "/api/users",
        "/users"
      ];
      let res = null;
      for (const ep of tryEndpoints) {
        try { res = await api.get(ep); break; } catch (e) {}
      }
      const list = ensureArrayFromResponse(res?.data);
      const filtered = list.filter(u => {
        const r = (u.role || "").toString().toLowerCase();
        return r.includes("branch") || r === "branchadmin" || r === "staff" || r === "admin";
      });
      setManagers(filtered);
    } catch (err) {
      console.warn("fetchManagers err:", err);
      setManagers([]);
    }
  }

  const onSearch = (e) => {
    setQ(e.target.value);
    setPage(1);
  };

  // displayedBranches = apply client-side filter (name / address / phone)
  const displayedBranches = useMemo(() => {
    if (!debQ || debQ.trim() === "") return branches;
    const term = debQ.trim().toLowerCase();
    return branches.filter(b => {
      const name = (b.branchName || "").toString().toLowerCase();
      const addr = (b.addressBranch || "").toString().toLowerCase();
      const phone = (b.phone || "").toString().toLowerCase();
      return name.includes(term) || addr.includes(term) || phone.includes(term);
    });
  }, [branches, debQ]);

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
        }).catch(async () => await api.put(`/branches/${id}`, {
          branchName: form.branchName,
          addressBranch: form.addressBranch,
          phone: form.phone,
          managerId: form.managerId || null
        }));
        const updated = res.data || res.data?.branch || res.data?.data || {};
        setBranches(prev => prev.map(x => (idOf(x) === id ? (updated || { ...x, ...form }) : x)));
      } else {
        const res = await api.post("/api/branches", {
          branchName: form.branchName,
          addressBranch: form.addressBranch,
          phone: form.phone,
          managerId: form.managerId || null
        }).catch(async () => await api.post("/branches", {
          branchName: form.branchName,
          addressBranch: form.addressBranch,
          phone: form.phone,
          managerId: form.managerId || null
        }));
        const created = res.data || res.data?.branch || res.data?.data || {};
        setBranches(prev => [created, ...prev]);
        setTotal(prev => prev + 1);
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
      const tryUrls = [
        `/api/branches/${id}`,
        `/branches/${id}`
      ];
      let ok = false;
      for (const u of tryUrls) {
        try {
          await api.delete(u);
          ok = true; break;
        } catch (e) {}
      }
      if (!ok) throw new Error("Delete failed (no route)");
      setBranches(prev => prev.filter(x => idOf(x) !== id));
      setTotal(prev => Math.max(0, prev - 1));
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
      const tryUrls = [
        `/api/branches/${id}`,
        `/branches/${id}`
      ];
      let res = null;
      for (const u of tryUrls) {
        try { res = await api.get(u); break; } catch (e) {}
      }
      if (!res) throw new Error("Not found");
      const full = res.data || res.data?.branch || res.data?.data || {};
      setDetail(full);
    } catch (err) {
      console.error("viewDetail err:", err);
      setDetail({ error: err?.response?.data?.error || err.message || "Unable to load" });
    }
  };

  const assignManager = async (branchId, managerId) => {
    if (!branchId) return;
    const idStr = String(branchId);
    // optimistic UI
    setBranches(prev => prev.map(b => (String(idOf(b)) === idStr ? { ...b, managerId } : b)));
    try {
      const tryUrls = [
        `/api/branches/${branchId}`,
        `/branches/${branchId}`
      ];
      let res = null;
      for (const u of tryUrls) {
        try {
          res = await api.put(u, { managerId: managerId || null });
          if (res) break;
        } catch (e) {}
      }

      if (managerId) {
        const tryUserUrls = [
          `/api/users/${managerId}`,
          `/users/${managerId}`,
          `/api/users/${managerId}/assign-branch`,
          `/api/branchAdmin/assignManager`
        ];
        for (const u of tryUserUrls) {
          try {
            if (u.endsWith("/assignManager")) {
              await api.post(u, { userId: managerId, branchId });
            } else {
              await api.put(u, { branchId });
            }
            break;
          } catch (e) {}
        }
      }

      const updated = res?.data || null;
      if (updated) {
        setBranches(prev => prev.map(b => (String(idOf(b)) === idStr ? (updated || b) : b)));
        if (detail && String(idOf(detail)) === idStr) setDetail(prev => ({ ...(prev || {}), ...(updated || {}) }));
      }
    } catch (err) {
      console.error("assignManager err:", err);
      alert(err?.response?.data?.error || err.message || "Assign failed");
      fetchBranches({ page, q: debQ });
    }
  };

  // medicines modal: open and fetch medicines for branch
  const openMedicinesModal = async (branch) => {
    const id = idOf(branch);
    setMedModal({ open: true, branchId: id, loading: true, medicines: [], error: null });
    try {
      // try common endpoints for branch medicines
      const tryUrls = [
        `/api/branches/${id}/medicines`,
        `/branches/${id}/medicines`,
        `/api/branches/${id}`,
        `/branches/${id}`
      ];
      let res = null;
      for (const u of tryUrls) {
        try { res = await api.get(u); break; } catch (e) {}
      }
      if (!res) throw new Error("No medicines endpoint responded");
      // resolve medicines array in possible shapes
      let meds = [];
      if (Array.isArray(res.data)) meds = res.data;
      else if (Array.isArray(res.data?.medicines)) meds = res.data.medicines;
      else if (Array.isArray(res.data?.data)) meds = res.data.data;
      else if (Array.isArray(res.data?.branch?.medicines)) meds = res.data.branch.medicines;
      else if (Array.isArray(res.data?.branch?.medicines)) meds = res.data.branch.medicines;
      // fallback: if res.data has medicines nested as object entries
      setMedModal({ open: true, branchId: id, loading: false, medicines: meds || [], error: null });
    } catch (err) {
      console.error("openMedicinesModal err:", err);
      setMedModal({ open: true, branchId: idOf(branch), loading: false, medicines: [], error: err?.response?.data?.error || err.message || "Cannot load medicines" });
    }
  };

  const closeMedModal = () => setMedModal({ open: false, branchId: null, loading: false, medicines: [], error: null });

  const totalPages = Math.max(1, Math.ceil((total || branches.length) / pageSize));
  const goPage = (p) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
  };

  const managerLabel = (m) => (m?.name || m?.username || m?.email || idOf(m));

  return (
    <div className="bm-root">
      <header className="bm-header">
        <div>
          <h2 className="bm-title">Manage Branches</h2>
          <div className="bm-sub">Branch management & transfer requests</div>
        </div>

        <div className="bm-actions">
          <button className="bm-btn bm-btn-primary" onClick={openCreate}>+ Create Branch</button>
          <button className="bm-btn" onClick={() => { fetchBranches({ page, q: debQ }); fetchManagers(); }}>Refresh</button>
        </div>
      </header>

      <div className="bm-controls">
        <input className="bm-search bm-input" placeholder="Search branch name / address / phone..." value={q} onChange={onSearch} />
        <div className="bm-meta">{loading ? "Loading..." : `${total || branches.length} items`}</div>
      </div>

      {error && <div className="bm-error">{error}</div>}

      <div className="bm-table-wrap">
        <table className="bm-table" role="table" aria-label="Branches table">
          <thead>
            <tr>
              <th style={{width: "28%"}}>Name</th>
              <th style={{width: "28%"}}>Manager</th>
              <th style={{width: "12%"}}>Phone</th>
              <th className="tcenter" style={{width: "8%"}}>Medicines</th>
              <th className="tcenter" style={{width: "8%"}}>Schedules</th>
              <th style={{width: "16%"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!displayedBranches || displayedBranches.length === 0) && !loading ? (
              <tr><td colSpan={6} className="bm-empty">No branches found</td></tr>
            ) : displayedBranches.map(b => (
              <tr key={idOf(b)}>
                <td className="bm-branch-col">
                  <div className="bm-branch-name">{b.branchName}</div>
                  {b.addressBranch && <div className="bm-branch-addr">{b.addressBranch}</div>}
                </td>

                <td>
                  <div className="manager-line">
                    <div className="mgr-name small">{b.managerName || (b.manager && (b.manager.name || b.manager.username)) || (idOf(b.managerId) ? "" : "—")}</div>
                    <select className="bm-select" value={idOf(b.manager || b.managerId) || ""} onChange={(e) => assignManager(idOf(b), e.target.value)}>
                      <option value="">— assign —</option>
                      {managers.map(m => <option key={idOf(m)} value={idOf(m)}>{managerLabel(m)}</option>)}
                    </select>
                  </div>
                </td>

                <td>{b.phone || "-"}</td>

                <td className="tcenter bm-meds-cell" onClick={() => openMedicinesModal(b)} title="Click to view inventory">
                  {typeof b.medicinesCount !== "undefined" ? b.medicinesCount : (b.medicines ? b.medicines.length : "-")}
                </td>

                <td className="tcenter">{typeof b.schedulesCount !== "undefined" ? b.schedulesCount : (b.schedules ? b.schedules.length : "-")}</td>

                <td>
                  <div className="actions-row">
                    <button className="bm-btn small" onClick={() => viewDetail(b)}>View</button>
                    <button className="bm-btn small" onClick={() => openEdit(b)}>Edit</button>
                    <button className="bm-btn small bm-btn-delete" onClick={() => handleDelete(b)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bm-pager">
        <button className="bm-btn" onClick={() => goPage(page - 1)} disabled={page <= 1}>Prev</button>
        <div>Page {page} / {totalPages}</div>
        <button className="bm-btn" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>Next</button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="bm-modal-backdrop" onClick={closeForm}>
          <form className="bm-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitForm}>
            <h3>{editing ? "Edit Branch" : "Create Branch"}</h3>

            <label className="bm-label">Branch Name *</label>
            <input className="bm-input" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} required />

            <label className="bm-label">Phone</label>
            <input className="bm-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            <label className="bm-label">Address</label>
            <textarea className="bm-input" value={form.addressBranch} onChange={(e) => setForm({ ...form, addressBranch: e.target.value })} rows={3} />

            <label className="bm-label">Manager</label>
            <select className="bm-input" value={form.managerId || ""} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">— none —</option>
              {managers.map(m => <option key={idOf(m)} value={idOf(m)}>{managerLabel(m)}</option>)}
            </select>

            <div className="bm-modal-actions">
              <button type="button" className="bm-btn" onClick={closeForm}>Cancel</button>
              <button type="submit" className="bm-btn bm-btn-primary">{editing ? "Save" : "Create"}</button>
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
              <div><button className="bm-btn" onClick={() => setShowDetail(false)}>Close</button></div>
            </div>

            {!detail && <div className="bm-loading">Loading...</div>}
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
                      <div className="li-sub">Threshold: {m.lowStockThreshold ?? 5}</div>
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

      {/* Medicines modal */}
      {medModal.open && (
        <div className="bm-modal-backdrop" onClick={closeMedModal}>
          <div className="bm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Inventory — Branch {medModal.branchId || ""}</h3>

            {medModal.loading && <div className="bm-loading">Loading medicines...</div>}
            {medModal.error && <div className="bm-error">{medModal.error}</div>}

            {!medModal.loading && !medModal.error && (
              <>
                <div style={{ maxHeight: 320, overflow: "auto", marginTop: 8 }}>
                  {medModal.medicines.length === 0 ? (
                    <div className="muted">No medicines found</div>
                  ) : medModal.medicines.map(m => (
                    <div key={idOf(m)} className="list-item">
                      <div className="li-left">{m.medicineName || m.name || idOf(m)}</div>
                      <div className="li-sub">Stock: {m.stock ?? m.qty ?? 0} • Min: {m.lowStockThreshold ?? m.min ?? "-"}</div>
                    </div>
                  ))}
                </div>
                <div className="bm-modal-actions">
                  <button className="bm-btn" onClick={closeMedModal}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
