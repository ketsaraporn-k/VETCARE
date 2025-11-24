// src/pages/BranchSummary.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axiosConfig";
import "./BranchPages.css";

/**
 * BranchSummary (improved)
 * - ดึง branch object จริง (prefer /api/branches/:id -> /branches/:id -> /api/branches -> /branches)
 * - ดึง users ของสาขา (หลายรูปแบบ)
 * - คำนวณ lowStockCount จาก branch.medicines
 * - ดึง schedules/appointments เพื่อคำนวณ total / today / done
 * - tolerant/fallback endpoints เพื่อให้ compatible กับหลาย backend shapes
 */

function idOf(x) { return x?._id || x?.id || x || ""; }

export default function BranchSummary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQ, setUserQ] = useState("");

  // read current user from localStorage (tolerant)
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  const role = (currentUser?.role || "").toLowerCase();
  const getBranchIdFromUser = (u) => {
    if (!u) return null;
    const b = u.branchId ?? u.branch ?? u.branch_id ?? null;
    if (!b) return null;
    if (typeof b === "string") return b;
    if (typeof b === "object") return b._id || b.id || null;
    return null;
  };
  const userBranchId = getBranchIdFromUser(currentUser);

  // initial: prefer user's branchId
  useEffect(() => {
    if (userBranchId) setSelectedBranchId(String(userBranchId));
    else if (role === "branchadmin") fetchBranches(); // allow selection for branchadmin
    // eslint-disable-next-line
  }, []);

  // whenever branch selected -> fetch branch/full data + users
  useEffect(() => {
    if (!selectedBranchId) {
      setOverview(null);
      setTreatments([]);
      setVaccinations([]);
      setUsers([]);
      setLoading(false);
      return;
    }
    loadBranchAll(selectedBranchId);
    // eslint-disable-next-line
  }, [selectedBranchId]);

  /* ========== Helpers/fetchers ========== */

  async function fetchBranches() {
    setLoading(true);
    setError(null);
    try {
      const tryUrls = ["/api/branches", "/branches", "/api/branches/all", "/api/branch/branches"];
      let res = null;
      for (const u of tryUrls) {
        try { res = await api.get(u); break; } catch (e) { /* try next */ }
      }
      const data = res?.data ?? [];
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setBranches(arr);
      if (!selectedBranchId && arr.length === 1) setSelectedBranchId(String(arr[0]._id || arr[0].id));
    } catch (err) {
      console.error("fetchBranches err", err);
      setError("Cannot load branches");
    } finally {
      setLoading(false);
    }
  }

  // core: load branch object, users, appointments, treatments, vaccinations
  async function loadBranchAll(branchId) {
    setLoading(true);
    setError(null);
    setOverview(null);
    setTreatments([]);
    setVaccinations([]);
    setUsers([]);
    try {
      // 1) try to fetch branch resource (many shapes)
      let branchRes = null;
      const branchUrls = [
        `/api/branches/${branchId}`,
        `/branches/${branchId}`,
        `/api/branch/${branchId}`,
        `/api/branches?id=${branchId}`,
        `/api/branches`,
      ];
      for (const u of branchUrls) {
        try { branchRes = await api.get(u); break; } catch (e) { /* next */ }
      }

      const branchObj = resolveBranchFromResponse(branchRes?.data, branchId);

      // 2) fetch users for branch (fallback order)
      const usersPromise = fetchUsersForBranch(branchId);

      // 3) fetch schedules/appointments for branch (to compute counts)
      const schedulesPromise = fetchSchedulesForBranch(branchId);

      // 4) fetch treatments/vaccinations (best-effort)
      const tP = api.get(`/treatments/branch/${branchId}`).catch(() => api.get(`/treatments?branchId=${branchId}`)).catch(() => api.get(`/treatments`));
      const vP = api.get(`/vaccinations/branch/${branchId}`).catch(() => api.get(`/vaccinations?branchId=${branchId}`)).catch(() => api.get(`/vaccinations`));

      const [usersList, schedules, tRes, vRes] = await Promise.all([usersPromise, schedulesPromise, tP.catch(e => null), vP.catch(e => null)]);

      // compute overview fields
      const meds = (branchObj && Array.isArray(branchObj.medicines)) ? branchObj.medicines : [];
      const lowStockCount = meds.reduce((acc, m) => {
        const qty = Number(m.stock ?? m.quantity ?? m.qty ?? 0);
        const th = Number(m.lowStockThreshold ?? m.min ?? 5);
        return acc + ((qty <= th) ? 1 : 0);
      }, 0);

      // schedules: count total, today, done
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      let totalAppts = 0, todayAppts = 0, doneAppts = 0;
      if (Array.isArray(schedules)) {
        totalAppts = schedules.length;
        schedules.forEach(s => {
          const d = s.scheduledAt ? new Date(s.scheduledAt) : (s.date ? new Date(s.date) : null);
          if (d && !isNaN(d.getTime())) {
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (k === todayKey) todayAppts++;
          }
          if ((s.status || "").toString().toLowerCase() === "done") doneAppts++;
        });
      }

      // treatments/vaccinations
      const treatArr = tRes?.data ? (Array.isArray(tRes.data) ? tRes.data : [tRes.data]) : [];
      const vaccArr = vRes?.data ? (Array.isArray(vRes.data) ? vRes.data : [vRes.data]) : [];

      // users normalized
      const normalizedUsers = (usersList || []).map(u => ({
        id: u._id || u.id || u.userId,
        name: u.name || u.fullName || u.username || u.displayName || "Unnamed",
        role: u.role || (u.roles && u.roles[0]) || "user",
        email: u.email || u.username || "",
        phone: u.phone || u.mobile || ""
      })).filter(x => x.id);

      setOverview({
        branchId,
        branchName: branchObj?.branchName || branchObj?.name || getBranchNameFromBranches(branchId),
        medicines: meds,
        lowStockCount,
        totalAppointments: totalAppts,
        todayAppointments: todayAppts,
        doneAppointments: doneAppts,
      });

      setTreatments(treatArr);
      setVaccinations(vaccArr);
      setUsers(normalizedUsers);

    } catch (err) {
      console.error("loadBranchAll err", err);
      setError(err?.response?.data?.error || err.message || "Failed to load branch data");
    } finally {
      setLoading(false);
    }
  }

  function resolveBranchFromResponse(data, branchIdFallback) {
    if (!data) return null;
    // many shapes: object branch, { branch: {...} }, array of branches, branches[0], etc.
    if (Array.isArray(data)) {
      // try to find by id
      const f = data.find(b => String(b._id || b.id) === String(branchIdFallback));
      return f || data[0] || null;
    }
    if (data.branch) return data.branch;
    if (data.data && (Array.isArray(data.data) ? data.data.find(b => String(b._id || b.id) === String(branchIdFallback)) || data.data[0] : data.data)) {
      return Array.isArray(data.data) ? (data.data.find(b => String(b._id || b.id) === String(branchIdFallback)) || data.data[0]) : data.data;
    }
    // if it's a branch-like object
    const possibleKeys = ["branchName", "name", "medicines", "schedules"];
    for (const k of possibleKeys) if (Object.prototype.hasOwnProperty.call(data, k)) return data;
    // fallback null
    return null;
  }

  function getBranchNameFromBranches(id) {
    const b = branches.find(x => String(x._id || x.id) === String(id));
    return b ? (b.branchName || b.name) : (id ? String(id).slice(0, 8) : "N/A");
  }

  // fetch users for branch (robust)
  async function fetchUsersForBranch(branchId) {
    setUsersLoading(true);
    try {
      // Try endpoints that commonly support filtering by branchId (pass param)
      const tryFns = [
        () => api.get("/api/users", { params: { branchId } }),
        () => api.get("/users", { params: { branchId } }),
        () => api.get("/api/users", { params: { branch: branchId } }),
        () => api.get(`/api/branches/${branchId}/users`),
        () => api.get(`/branches/${branchId}/users`),
        () => api.get(`/api/branch/${branchId}/users`),
        () => api.get("/api/users") // last resort: get all and filter client-side
      ];

      let res = null;
      for (const fn of tryFns) {
        try { res = await fn(); break; } catch (e) { /* try next */ }
      }

      if (!res) {
        setUsers([]);
        setUsersLoading(false);
        return [];
      }

      // Normalize response to array
      let list = [];
      if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.data?.data)) list = res.data.data;
      else if (Array.isArray(res.data?.users)) list = res.data.users;
      else if (Array.isArray(res.data?.items)) list = res.data.items;
      else list = [];

      // Filter users to only those that belong to this branchId.
      // Support many shapes: user.branchId (string or object), user.branch, user.assignedBranch, user.branch_id etc.
      const filtered = (list || []).filter(u => {
        const b = u.branchId ?? u.branch ?? u.branch_id ?? u.assignedBranch ?? u.branchId?.id ?? u.branchId?._id ?? null;
        if (!b) return false;
        if (typeof b === "object") {
          return String(b._id || b.id || b) === String(branchId);
        }
        return String(b) === String(branchId);
      });

      setUsers(filtered);
      setUsersLoading(false);
      return filtered;
    } catch (err) {
      console.error("fetchUsersForBranch err", err);
      setUsers([]);
      setUsersLoading(false);
      return [];
    }
  }
    
  // fetch schedules/appointments for branch (robust)
  async function fetchSchedulesForBranch(branchId) {
    try {
      const tryFns = [
        () => api.get("/api/staff/schedules", { params: { branchId } }),
        () => api.get("/staff/schedules", { params: { branchId } }),
        () => api.get(`/api/branches/${branchId}/schedules`),
        () => api.get(`/branches/${branchId}/schedules`),
        () => api.get(`/api/schedules`, { params: { branchId } }),
      ];
      let res = null;
      for (const fn of tryFns) {
        try { res = await fn(); break; } catch (e) { /* next */ }
      }
      if (!res) return [];
      // possible shapes
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data?.schedules)) return res.data.schedules;
      if (res.data?.branch && Array.isArray(res.data.branch.schedules)) return res.data.branch.schedules;
      return [];
    } catch (err) {
      console.error("fetchSchedulesForBranch err", err);
      return [];
    }
  }

  /* ========== UI helpers ========== */

  const filteredUsers = useMemo(() => {
    const q = (userQ || "").trim().toLowerCase();
    if (!q) return users;
    return (users || []).filter(u => {
      const name = (u.name || u.fullName || u.username || "").toString().toLowerCase();
      const roleText = (u.role || "").toString().toLowerCase();
      const email = (u.email || u.username || "").toString().toLowerCase();
      return name.includes(q) || roleText.includes(q) || email.includes(q);
    });
  }, [users, userQ]);

  const formatCurrency = (n) => {
    if (n == null) return "-";
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n); }
    catch { return String(n); }
  };

  /* ========== Render ========== */

  // if user has no branch and not branchadmin => message
  if (!userBranchId && role !== "branchadmin") {
    return (
      <div className="bp-root">
        <h2>Branch Summary</h2>
        <div className="bp-error">
          Your account has no branch assigned.
          <div style={{ marginTop: 8 }}>
            If you should have access to a branch, please contact your administrator to assign your account to a branch.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bp-root">
      <h2>Branch Summary</h2>

      {role === "branchadmin" && !selectedBranchId && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>You don't have a branch selected. Choose a branch to view its summary:</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} style={{ padding: 8 }}>
              <option value="">-- Select branch --</option>
              {branches.map(b => <option key={idOf(b)} value={idOf(b)}>{b.branchName || b.name || String(idOf(b)).slice(0, 8)}</option>)}
            </select>
            <button onClick={() => { if (selectedBranchId) { loadBranchAll(selectedBranchId); fetchUsersForBranch(selectedBranchId); } }} style={{ padding: "8px 12px" }}>Load Branch</button>
            <button onClick={() => fetchBranches()} style={{ padding: "8px 12px" }}>Refresh branches</button>
          </div>
        </div>
      )}

      {loading && <p>Loading branch data...</p>}
      {error && <div className="bp-error">{error}</div>}

      {!loading && selectedBranchId && overview && (
        <>
          <h3>{overview.branchName || getBranchNameFromBranches(selectedBranchId)}</h3>

          <div className="bp-cards">
            {/* <div className="bp-card">
              <div className="bp-card-title">Active Patients (est.)</div>
              <div className="bp-card-value">{overview.patients ?? "-"}</div>
            </div> */}

            <div className="bp-card">
              <div className="bp-card-title">Today Appointments</div>
              <div className="bp-card-value">{overview.todayAppointments ?? 0}</div>
            </div>

            <div className="bp-card">
              <div className="bp-card-title">Appointments Done</div>
              <div className="bp-card-value">{overview.doneAppointments ?? 0}</div>
            </div>

            <div className="bp-card">
              <div className="bp-card-title">Low-stock Items</div>
              <div className="bp-card-value">{overview.lowStockCount ?? 0}</div>
            </div>
          </div>

          <section className="bp-section">
            <h3>Users in this branch ({users.length})</h3>

            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input placeholder="Search users by name / role / email..." value={userQ} onChange={(e) => setUserQ(e.target.value)} style={{ padding: 8, flex: 1 }} />
              <button onClick={() => fetchUsersForBranch(selectedBranchId)} className="btn">Refresh</button>
            </div>

            {usersLoading ? <p>Loading users…</p> : (
              filteredUsers.length === 0 ? <p className="bp-muted">No users found.</p> :
                <table className="bp-table">
                  <thead><tr><th>Name</th><th>Username/Email</th><th>Role</th><th>Phone</th></tr></thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id || u._id || u.email}>
                        <td>{u.name || u.fullName || u.username}</td>
                        <td style={{ color: "#374151" }}>{u.username || u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.phone || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
          </section>

          {/* <section className="bp-section">
            <h3>Recent Treatments</h3>
            {treatments.length === 0 ? <p className="bp-muted">No recent treatments</p> :
              <table className="bp-table">
                <thead><tr><th>Pet</th><th>Owner</th><th>Service</th><th>Date</th></tr></thead>
                <tbody>
                  {treatments.slice(0, 10).map((t, i) => (
                    <tr key={t._id || t.id || i}>
                      <td>{t.petName || t.pet || "-"}</td>
                      <td>{t.ownerName || t.owner || "-"}</td>
                      <td>{t.service || t.treatmentType || "-"}</td>
                      <td>{t.date ? new Date(t.date).toLocaleString() : (t.createdAt ? new Date(t.createdAt).toLocaleString() : "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </section>

          <section className="bp-section">
            <h3>Upcoming Vaccinations</h3>
            {vaccinations.length === 0 ? <p className="bp-muted">No upcoming vaccinations</p> :
              <table className="bp-table">
                <thead><tr><th>Pet</th><th>Vaccine</th><th>Owner</th><th>Schedule</th></tr></thead>
                <tbody>
                  {vaccinations.slice(0, 10).map((v, i) => (
                    <tr key={v._id || v.id || i}>
                      <td>{v.petName || v.pet || "-"}</td>
                      <td>{v.vaccine || v.vaccineName || "-"}</td>
                      <td>{v.ownerName || v.owner || "-"}</td>
                      <td>{v.date ? new Date(v.date).toLocaleString() : (v.scheduledAt ? new Date(v.scheduledAt).toLocaleString() : "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </section> */}
        </>
      )}

      {!selectedBranchId && userBranchId && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setSelectedBranchId(String(userBranchId))} style={{ padding: "8px 12px" }}>
            Load My Branch ({String(userBranchId).slice(0, 8)})
          </button>
        </div>
      )}
    </div>
  );
}
