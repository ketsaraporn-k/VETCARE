import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axiosConfig";
import "./UserRoleManage.css";

/**
 * UserRoleManage (final)
 * - client-side search (name, email, phone, branch)
 * - role filter
 * - optional group/sort by role
 * - pagination (pageSize = 10)
 * - uses CSS classes matching provided .urm- styles
 *
 * NOTE: backend routes are NOT changed (will call /api/users or /users fallback)
 */

const PAGE_SIZE = 10;
function idOf(x) { return x?._id || x?.id || x || ""; }

export default function UserRoleManage() {
  // data
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchMap, setBranchMap] = useState({});

  // ui states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // search / paging / filtering
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState(""); // "" = all
  const [groupByRole, setGroupByRole] = useState(false);

  // forms / modals (kept minimal)
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    role: "staff",
    branchId: ""
  });

  const [showReset, setShowReset] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    // load branches and users on mount (and when page changes)
    fetchBranches();
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  async function fetchBranches() {
    try {
      const tryEndpoints = [
        "/api/branches",
        "/branches",
        "/api/branches/all"
      ];
      let res = null;
      for (const ep of tryEndpoints) {
        try { res = await api.get(ep); break; } catch (e) {}
      }
      const list = (res?.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data?.branches) ? res.data.branches : []));
      setBranches(list || []);
      const map = {};
      (list || []).forEach(b => map[idOf(b)] = b.branchName || b.name || idOf(b));
      setBranchMap(map);
    } catch (err) {
      console.warn("fetchBranches err:", err);
      setBranches([]);
      setBranchMap({});
    }
  }

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      // fetch all users (server supports paging but we will handle client-side search/filter)
      const res = await api.get("/api/users").catch(async (e) => {
        try { return await api.get("/users"); } catch (e2) { throw e; }
      });
      // some responses wrap as { users: [...] } or { data: [...] }
      let data = res.data?.users || res.data?.data || res.data || [];
      if (!Array.isArray(data)) data = [];
      setUsers(data);
      setTotal(data.length);
      setPage(1);
    } catch (err) {
      console.error("fetchUsers err:", err);
      setError(err?.response?.data?.error || err.message || "Cannot load users");
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // SEARCH: filter by name, email, phone, branch (client-side)
  const normalizedQuery = (str) => (str || "").toString().toLowerCase().trim();

  const filtered = useMemo(() => {
    const qn = normalizedQuery(q);
    let list = Array.isArray(users) ? [...users] : [];

    // apply role filter if set
    if (roleFilter) {
      list = list.filter(u => (u.role || "").toString().toLowerCase() === roleFilter.toString().toLowerCase());
    }

    // apply search q (only name, email, phone, branch)
    if (qn) {
      list = list.filter(u => {
        const name = normalizedQuery(u.name || u.username || u.displayName);
        const email = normalizedQuery(u.email);
        const phone = normalizedQuery(u.phone);
        // branch: try branchMap then user.branchName or branchId
        const branchNameFromMap = branchMap[idOf(u.branchId)] || branchMap[idOf(u.branch)] || "";
        const branchName = normalizedQuery(branchNameFromMap || u.branchName || u.branch || u.branchId || "");
        return name.includes(qn) || email.includes(qn) || phone.includes(qn) || branchName.includes(qn);
      });
    }

    // optional grouping/sorting by role
    if (groupByRole) {
      list.sort((a, b) => {
        const ra = (a.role || "").toString().toLowerCase();
        const rb = (b.role || "").toString().toLowerCase();
        if (ra === rb) return (a.name || "").localeCompare(b.name || "");
        return ra.localeCompare(rb);
      });
    } else {
      // default: sort by name
      list.sort((a, b) => (a.name || a.username || "").localeCompare(b.name || b.username || ""));
    }

    setTotal(list.length);
    return list;
    // eslint-disable-next-line
  }, [users, q, roleFilter, groupByRole, JSON.stringify(branchMap)]);

  // pagination: slice filtered
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // handlers
  const onSearchChange = (e) => {
    setQ(e.target.value);
    setPage(1);
  };

  const onRoleFilterChange = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const toggleGroupByRole = () => {
    setGroupByRole(v => !v);
    setPage(1);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: "", password: "", name: "", email: "", phone: "", role: "staff", branchId: "" });
    setShowForm(true);
    setError(null);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      username: u.username || "",
      password: "",
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role || "staff",
      branchId: u.branchId || ""
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setEditingUser(null);
    setShowForm(false);
  };

  const submitForm = async (e) => {
    e && e.preventDefault();
    setError(null);
    if (!form.username || !form.name) {
      setError("username และ name จำเป็น");
      return;
    }
    try {
      if (editingUser) {
        const id = idOf(editingUser);
        const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role, branchId: form.branchId || null };
        if (form.password && form.password.length >= 6) payload.password = form.password;
        const res = await api.put(`/api/users/${id}`, payload).catch(async () => await api.put(`/users/${id}`, payload));
        const updated = res.data?.user || res.data || {};
        setUsers(prev => prev.map(x => (idOf(x) === id ? { ...x, ...(updated || {}) } : x)));
      } else {
        const payload = { username: form.username, password: form.password || "123456", name: form.name, email: form.email, phone: form.phone, role: form.role, branchId: form.branchId || null };
        const res = await api.post("/api/users", payload).catch(async () => await api.post("/users", payload));
        const created = res.data || res.data?.user || {};
        setUsers(prev => [created, ...prev]);
        setTotal(prev => prev + 1);
      }
      closeForm();
    } catch (err) {
      console.error("submitForm err:", err);
      setError(err?.response?.data?.error || err.message || "Save failed");
    }
  };

  const changeRole = async (user, newRole, branchIdForRole = null) => {
    try {
      const id = idOf(user);
      const payload = { role: newRole };
      if (branchIdForRole) payload.branchId = branchIdForRole;
      const tryUrls = [
        `/api/users/${id}/role`,
        `/api/users/${id}`,
        `/users/${id}/role`,
        `/users/${id}`
      ];
      let res = null;
      for (const u of tryUrls) {
        try {
          res = await api.put(u, payload);
          break;
        } catch (e) {}
      }
      const updated = res?.data?.user || res?.data || {};
      setUsers(prev => prev.map(x => (idOf(x) === id ? { ...x, ...(updated || {}) } : x)));
    } catch (err) {
      console.error("changeRole err:", err);
      alert(err?.response?.data?.error || err.message || "Change role failed");
      fetchUsers();
    }
  };

  const openReset = (u) => {
    setResetUser(u);
    setNewPassword("");
    setShowReset(true);
  };
  const closeReset = () => { setResetUser(null); setShowReset(false); }

  const submitReset = async () => {
    if (!resetUser) return;
    if (!newPassword || newPassword.length < 6) {
      alert("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }
    try {
      await api.put(`/api/users/${idOf(resetUser)}/reset-password`, { newPassword }).catch(async () => await api.put(`/users/${idOf(resetUser)}/reset-password`, { newPassword }));
      alert("Reset password success");
      closeReset();
    } catch (err) {
      console.error("submitReset err:", err);
      alert(err?.response?.data?.error || err.message || "Reset failed");
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Confirm delete user ${u.username || u.name}?`)) return;
    try {
      await api.delete(`/api/users/${idOf(u)}`).catch(async () => await api.delete(`/users/${idOf(u)}`));
      setUsers(prev => prev.filter(x => idOf(x) !== idOf(u)));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("delete user err:", err);
      alert(err?.response?.data?.error || err.message || "Delete failed");
    }
  };

  const goPage = (p) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
  };

  return (
    <div className="urm-root">
      <header className="urm-header">
        <h2>Manage Users & Roles</h2>
        <div className="urm-actions">
          <button className="urm-btn" onClick={openCreate}>+ Create</button>
          <button className="urm-btn ghost" onClick={() => { fetchUsers(); fetchBranches(); }}>Refresh</button>
        </div>
      </header>

      <div className="urm-controls">
        <input
          className="urm-search"
          placeholder="Search name / email / phone / branch..."
          value={q}
          onChange={onSearchChange}
        />
        <select className="urm-role-filter" value={roleFilter} onChange={onRoleFilterChange}>
          <option value="">All roles</option>
          <option value="owner">owner</option>
          <option value="superadmin">superAdmin</option>
          <option value="branchadmin">branchAdmin</option>
          <option value="doctor">doctor</option>
          <option value="staff">staff</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={groupByRole} onChange={toggleGroupByRole} />
          <span style={{ fontSize: 13, color: "#6b7280" }}>Group / sort by role</span>
        </label>

        <div className="urm-meta">{loading ? "Loading..." : `${total} result${total !== 1 ? "s" : ""}`}</div>
      </div>

      {error && <div className="urm-error">{error}</div>}

      <div className="urm-table-wrap">
        <table className="urm-table" role="table" aria-label="Users table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Phone</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!paged || paged.length === 0) && !loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 20 }}>No users</td></tr>
            ) : paged.map(u => (
              <tr key={idOf(u)}>
                <td>{u.username}</td>
                <td>{u.name}</td>
                <td>
                  <select value={u.role || "staff"} onChange={(e) => {
                    const nr = e.target.value;
                    // if role needs a branch, keep current branch or show prompt inline simple
                    if (["staff", "branchAdmin"].includes(nr)) {
                      // prefer selected branch from existing u.branchId
                      const chosen = u.branchId || "";
                      changeRole(u, nr, chosen || null);
                    } else {
                      changeRole(u, nr, null);
                    }
                  }}>
                    <option value="owner">owner</option>
                    <option value="staff">staff</option>
                    <option value="doctor">doctor</option>
                    <option value="branchAdmin">branchAdmin</option>
                    <option value="superAdmin">superAdmin</option>
                  </select>
                </td>
                <td>{(u.branchId && branchMap[idOf(u.branchId)]) ? branchMap[idOf(u.branchId)] : (u.branchName || u.branch || "-")}</td>
                <td>{u.phone || "-"}</td>
                <td style={{ textAlign: "center" }}>
                  <div className="urm-actions-row">
                    <button className="urm-btn small" onClick={() => openEdit(u)}>Edit</button>
                    <button className="urm-btn small" onClick={() => openReset(u)}>Reset</button>
                    <button className="urm-btn small danger" onClick={() => handleDelete(u)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="urm-pager">
        <button className="urm-btn" onClick={() => goPage(page - 1)} disabled={page <= 1}>Prev</button>
        <div>Page {currentPage} of {totalPages}</div>
        <button className="urm-btn" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>Next</button>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="urm-modal-backdrop" onClick={closeForm}>
          <form className="urm-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitForm}>
            <h3>{editingUser ? "Edit User" : "Create User"}</h3>

            {!editingUser && (
              <>
                <label>Username</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                <label>Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 chars (optional)" />
              </>
            )}

            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

            <label>Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="owner">owner</option>
              <option value="staff">staff</option>
              <option value="doctor">doctor</option>
              <option value="branchAdmin">branchAdmin</option>
              <option value="superAdmin">superAdmin</option>
            </select>

            <label>Branch (optional)</label>
            <select value={form.branchId || ""} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">— none —</option>
              {branches.map(b => <option key={idOf(b)} value={idOf(b)}>{b.branchName || b.name}</option>)}
            </select>

            <div className="urm-modal-actions">
              <button type="button" className="urm-btn ghost" onClick={closeForm}>Cancel</button>
              <button type="submit" className="urm-btn">{editingUser ? "Save" : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Reset password modal */}
      {showReset && resetUser && (
        <div className="urm-modal-backdrop" onClick={closeReset}>
          <div className="urm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reset password for {resetUser.username || resetUser.name}</h3>
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="urm-modal-actions">
              <button className="urm-btn ghost" onClick={closeReset}>Cancel</button>
              <button className="urm-btn" onClick={submitReset}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
