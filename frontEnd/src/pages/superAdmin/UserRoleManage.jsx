// src/pages/superAdmin/UserRoleManage.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import "./UserRoleManage.css";

/**
 * UserRoleManage - full page
 * - list users (search + pagination)
 * - create user (modal)
 * - edit user (modal)
 * - change role (dropdown + branch assign)
 * - reset password (modal)
 * - delete user (confirm)
 *
 * Paste/replace this file entirely.
 */

const DEFAULT_PAGE_SIZE = 12;

function idOf(x) { return x?._id || x?.id || x || ""; }

export default function UserRoleManage() {
  // data
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);

  // ui states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // search / paging
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  // forms / modals
  const [showForm, setShowForm] = useState(false); // create/edit
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
    fetchUsers();
    fetchBranches();
    // eslint-disable-next-line
  }, [page]);

  async function fetchUsers({ page = 1, q = "" } = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/users", { params: { page, pageSize, q } });
      // handle various payload shapes
      const data = res.data?.data || res.data || [];
      setUsers(Array.isArray(data) ? data : []);
      setPage(Number(res.data?.page || page));
      setTotal(Number(res.data?.total ?? (Array.isArray(data) ? data.length : 0)));
    } catch (err) {
      console.error("fetchUsers err:", err);
      setError(err?.response?.data?.error || err.message || "Cannot load users");
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBranches() {
    try {
      const res = await api.get("/api/branches");
      const list = res.data?.data || res.data || [];
      setBranches(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("fetchBranches err:", err);
      setBranches([]);
    }
  }

  // search handler (debounce could be added)
  const onSearch = (e) => {
    const v = e.target.value;
    setQ(v);
    setPage(1);
    fetchUsers({ page: 1, q: v });
  };

  // open create form
  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: "", password: "", name: "", email: "", phone: "", role: "staff", branchId: "" });
    setShowForm(true);
    setError(null);
  };

  // open edit form
  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      username: u.username || "",
      password: "", // blank unless resetting
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

  // submit create or edit
  const submitForm = async (e) => {
    e && e.preventDefault();
    setError(null);

    // validate
    if (!form.username || !form.name) {
      setError("username และ name จำเป็น");
      return;
    }
    try {
      if (editingUser) {
        // update user
        const id = idOf(editingUser);
        // don't send empty password
        const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role, branchId: form.branchId || null };
        if (form.password && form.password.length >= 6) payload.password = form.password;
        const res = await api.put(`/api/users/${id}`, payload);
        const updated = res.data?.user || res.data || {};
        // update local list
        setUsers(prev => prev.map(x => (idOf(x) === id ? { ...x, ...(updated || {}) } : x)));
      } else {
        // create
        const payload = { username: form.username, password: form.password || "123456", name: form.name, email: form.email, phone: form.phone, role: form.role, branchId: form.branchId || null };
        const res = await api.post("/api/users", payload);
        const created = res.data || res.data?.user || {};
        // prepend to list
        setUsers(prev => [created, ...prev]);
        setTotal(prev => prev + 1);
      }
      closeForm();
    } catch (err) {
      console.error("submitForm err:", err);
      setError(err?.response?.data?.error || err.message || "Save failed");
    }
  };

  // change role (controls branchId requirement on backend)
  const changeRole = async (user, newRole, branchIdForRole = null) => {
    try {
      const id = idOf(user);
      const payload = { role: newRole };
      if (branchIdForRole) payload.branchId = branchIdForRole;
      const res = await api.put(`/api/users/${id}/role`, payload);
      const updated = res.data?.user || res.data || {};
      setUsers(prev => prev.map(x => (idOf(x) === id ? { ...x, ...(updated || {}) } : x)));
    } catch (err) {
      console.error("changeRole err:", err);
      alert(err?.response?.data?.error || err.message || "Change role failed");
      // optionally refresh
      fetchUsers({ page, q });
    }
  };

  // open reset password modal
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
      await api.put(`/api/users/${idOf(resetUser)}/reset-password`, { newPassword });
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
      await api.delete(`/api/users/${idOf(u)}`);
      setUsers(prev => prev.filter(x => idOf(x) !== idOf(u)));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("delete user err:", err);
      alert(err?.response?.data?.error || err.message || "Delete failed");
    }
  };

  const goPage = (p) => {
    const next = Math.max(1, p);
    setPage(next);
    fetchUsers({ page: next, q });
  };

  return (
    <div className="userrole-root">
      <header className="urm-header">
        <h2>Manage Users & Roles</h2>
        <div className="urm-actions">
          <button className="btn" onClick={openCreate}>+ Create User</button>
          <button className="btn ghost" onClick={() => fetchUsers({ page, q })}>Refresh</button>
        </div>
      </header>

      <div className="urm-controls">
        <input placeholder="Search username / name / email..." value={q} onChange={onSearch} />
        <div className="urm-meta">{loading ? "Loading..." : `${total || users.length} users`}</div>
      </div>

      {error && <div className="urm-error">{error}</div>}

      <table className="urm-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Name</th>
            <th>Role</th>
            <th>Branch</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(!users || users.length === 0) && !loading ? (
            <tr><td colSpan={6} style={{ textAlign: "center", padding: 20 }}>No users</td></tr>
          ) : users.map(u => (
            <tr key={idOf(u)}>
              <td>{u.username}</td>
              <td>{u.name}</td>
              <td>
                <select value={u.role} onChange={(e) => {
                  const nr = e.target.value;
                  // if role requires branch (staff/branchAdmin) prompt branch selection
                  if (["staff", "branchAdmin"].includes(nr)) {
                    const chosen = prompt("Enter branchId (or leave blank to assign later):", u.branchId || "");
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
              <td>{u.branchId || "-"}</td>
              <td>{u.phone || "-"}</td>
              <td>
                <div className="urm-actions-row">
                  <button className="btn small" onClick={() => openEdit(u)}>Edit</button>
                  <button className="btn small" onClick={() => openReset(u)}>Reset PW</button>
                  <button className="btn small danger" onClick={() => handleDelete(u)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="urm-pager">
        <button className="btn" onClick={() => goPage(page - 1)} disabled={page <= 1}>Prev</button>
        <div>Page {page} — {Math.max(1, Math.ceil((total || users.length) / pageSize))}</div>
        <button className="btn" onClick={() => goPage(page + 1)} disabled={page >= Math.ceil((total || users.length) / pageSize)}>Next</button>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submitForm}>
            <h3>{editingUser ? "Edit User" : "Create User"}</h3>

            {!editingUser && (
              <>
                <label>Username</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                <label>Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 chars (optional - default 123456)" />
              </>
            )}

            {editingUser && (
              <>
                <label>Change password (optional)</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="leave blank to keep" />
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
              {branches.map(b => <option key={idOf(b)} value={idOf(b)}>{b.branchName}</option>)}
            </select>

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn">{editingUser ? "Save" : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Reset password modal */}
      {showReset && resetUser && (
        <div className="modal-backdrop" onClick={closeReset}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reset password for {resetUser.username || resetUser.name}</h3>
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="modal-actions">
              <button className="btn ghost" onClick={closeReset}>Cancel</button>
              <button className="btn" onClick={submitReset}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
