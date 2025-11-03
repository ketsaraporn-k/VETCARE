import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axiosConfig";
import "./BranchManage.css";

const BRANCH_BASE = "/branches"; // adjust if needed

const BranchManage = () => {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBranch, setNewBranch] = useState({
    branchName: "",
    address: "",
    phone: "",
    managerId: ""
  });

  // editing modal state
  const [editing, setEditing] = useState(null); // { id, branchName, address, phone, managerId }

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await api.get(BRANCH_BASE);
      setBranches(res.data || []);
    } catch (err) {
      console.error("fetchBranches err", err);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/branchAdmin/users");
      setUsers(res.data?.users || res.data || []);
    } catch (err) {
      console.warn("fetchUsers failed", err);
      setUsers([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchUsers();
      await fetchBranches();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userMap = useMemo(() => {
    const m = new Map();
    users.forEach(u => m.set(u._id || u.id, u));
    return m;
  }, [users]);

  const getManagerName = (managerId) => {
    if (!managerId) return "-";
    if (typeof managerId === "object") return managerId.username || managerId.name || "-";
    const user = userMap.get(managerId);
    if (user) return user.username || user.name || "-";
    return managerId || "-";
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBranch.branchName || !newBranch.branchName.trim()) {
      return alert("Branch name is required");
    }

    try {
      const payload = {
        branchName: newBranch.branchName,
        address: newBranch.address || undefined,
        phone: newBranch.phone || undefined,
      };
      if (newBranch.managerId && newBranch.managerId.trim() !== "") {
        payload.managerId = newBranch.managerId;
      }
      await api.post(BRANCH_BASE, payload);
      setNewBranch({ branchName: "", address: "", phone: "", managerId: "" });
      fetchBranches();
    } catch (err) {
      console.error("create branch err", err);
      alert(err.response?.data?.error || "Failed to create branch");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this branch?")) return;
    try {
      await api.delete(`${BRANCH_BASE}/${id}`);
      fetchBranches();
    } catch (err) {
      console.error("delete branch err", err);
      alert("Delete failed");
    }
  };

  /**
   * Handle update:
   * - If managerId === "" -> user selected "No manager" -> set to null to remove manager relationship.
   * - If managerId is omitted, don't touch it.
   */
  const handleUpdate = async (id, updates) => {
    try {
      const payload = { ...updates };

      // If managerId is empty string => explicitly set to null so backend can remove it.
      if (payload.hasOwnProperty("managerId") && payload.managerId === "") {
        payload.managerId = null;
      }

      // If the payload includes only unchanged or empty values, you might still send them --
      // backend should handle partial updates (PATCH/PUT).
      await api.put(`${BRANCH_BASE}/${id}`, payload);
      fetchBranches();
      setEditing(null);
    } catch (err) {
      console.error("update branch err", err);
      alert(err.response?.data?.error || "Update failed");
    }
  };

  const openEditModal = (b) => {
    setEditing({
      id: b._id || b.id,
      branchName: b.branchName || "",
      address: b.address || "",
      phone: b.phone || "",
      // managerId may be object or id -> standardize to id string or "" (no manager)
      managerId: (typeof b.managerId === "object" ? (b.managerId._id || b.managerId.id || "") : (b.managerId || ""))
    });
  };

  // Filter branch admins for selects (case-insensitive contains "branch")
  const branchAdmins = users.filter(u => {
    if (!u.role) return false;
    return u.role.toString().toLowerCase().includes("branch");
  });

  if (loading) return <p className="bm-loading">Loading branches...</p>;

  return (
    <div className="bm-page">
      <h2 className="bm-title">🏢 Branch Management</h2>

      <div className="bm-layout">
        <div className="bm-left">
          <h3>All Branches</h3>

          {branches.length === 0 ? (
            <p>No branches found.</p>
          ) : (
            <table className="bm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Manager</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b._id || b.id}>
                    <td>{b.branchName}</td>
                    <td>{b.address || "-"}</td>
                    <td>{b.phone || "-"}</td>
                    <td>{getManagerName(b.managerId)}</td>
                    <td className="bm-actions">
                      <button className="bm-btn bm-btn-delete" onClick={() => handleDelete(b._id || b.id)}>Delete</button>
                      <button className="bm-btn bm-btn-edit" onClick={() => openEditModal(b)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bm-right">
          <h3>Add New Branch</h3>
          <form className="bm-form" onSubmit={handleCreate}>
            <input
              className="bm-input"
              placeholder="Branch Name"
              value={newBranch.branchName}
              onChange={(e) => setNewBranch({ ...newBranch, branchName: e.target.value })}
              required
            />
            <input
              className="bm-input"
              placeholder="Address"
              value={newBranch.address}
              onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
            />
            <input
              className="bm-input"
              placeholder="Phone"
              value={newBranch.phone}
              onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
            />
            <select
              className="bm-input"
              value={newBranch.managerId}
              onChange={(e) => setNewBranch({ ...newBranch, managerId: e.target.value })}
            >
              <option value="">-- Select manager (optional) --</option>
              {branchAdmins.length === 0 && <option disabled>-- No branchAdmin users available --</option>}
              {branchAdmins.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.username || u.name || u.email || (u._id || u.id)}
                </option>
              ))}
            </select>
            <button className="bm-btn bm-btn-primary" type="submit" disabled={!newBranch.branchName.trim()}>Add Branch</button>
          </form>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <h3>Edit Branch</h3>

            <div className="bm-form">
              <label className="bm-label">
                Name
                <input
                  className="bm-input"
                  value={editing.branchName}
                  onChange={(e) => setEditing({ ...editing, branchName: e.target.value })}
                />
              </label>

              <label className="bm-label">
                Address
                <input
                  className="bm-input"
                  value={editing.address}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                />
              </label>

              <label className="bm-label">
                Phone
                <input
                  className="bm-input"
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </label>

              <label className="bm-label">
                Manager
                <select
                  className="bm-input"
                  value={editing.managerId}
                  onChange={(e) => setEditing({ ...editing, managerId: e.target.value })}
                >
                  <option value="">-- No manager --</option>
                  {branchAdmins.length === 0 && <option disabled>-- No branchAdmin users available --</option>}
                  {branchAdmins.map(u => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {u.username || u.name || u.email || (u._id || u.id)}
                    </option>
                  ))}
                </select>
                <div className="bm-note">เลือก <em>No manager</em> เพื่อปลดผู้จัดการออกจากสาขา</div>
              </label>

              <div className="bm-modal-actions">
                <button className="bm-btn" onClick={() => setEditing(null)}>Cancel</button>
                <button
                  className="bm-btn bm-btn-primary"
                  onClick={() => {
                    // Ask for confirmation before saving
                    const ok = window.confirm("Save changes to this branch?");
                    if (!ok) return;

                    // collect updates
                    const updates = {
                      branchName: editing.branchName,
                      address: editing.address,
                      phone: editing.phone,
                      // If user chooses no manager -> value === "" -> handleUpdate will set to null
                      managerId: editing.managerId
                    };
                    handleUpdate(editing.id, updates);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManage;
