// src/pages/BranchManage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./BranchManage.css";

// Adjust these endpoints if your backend mounts differently
const BRANCH_BASE = "/branches"; // maps to backEnd/routes/branchRoutes.js

const BranchManage = () => {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]); // for manager list (User model)
  const [loading, setLoading] = useState(true);
  const [newBranch, setNewBranch] = useState({
    branchName: "",
    address: "",
    phone: "",
    managerId: ""
  });

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

  // Fetch users for manager select (branchAdmin / superAdmin route returns users)
  const fetchUsers = async () => {
    try {
      // server.js mounts branchAdminActions at /api/branchAdmin
      const res = await api.get("/branchAdmin/users");
      setUsers(res.data?.users || res.data || []);
    } catch (err) {
      console.warn("fetchUsers failed", err);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBranch.branchName || !newBranch.branchName.trim()) {
      return alert("Branch name is required");
    }

    try {
      // build payload but omit managerId if empty string
      const payload = {
        branchName: newBranch.branchName,
        address: newBranch.address || undefined,
        phone: newBranch.phone || undefined,
      };
      if (newBranch.managerId && newBranch.managerId.trim() !== "") {
        payload.managerId = newBranch.managerId;
      }

      const res = await api.post(BRANCH_BASE, payload);
      setNewBranch({ branchName: "", address: "", phone: "", managerId: "" });
      fetchBranches();
    } catch (err) {
      console.error("create branch err", err);
      alert(err.response?.data?.error || "Failed to create branch");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this branch?")) return;
    try {
      await api.delete(`${BRANCH_BASE}/${id}`);
      fetchBranches();
    } catch (err) {
      console.error("delete branch err", err);
      alert("Delete failed");
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      // sanitize updates: don't send managerId = "" to backend
      const payload = { ...updates };
      if (payload.managerId === "") delete payload.managerId;
      await api.put(`${BRANCH_BASE}/${id}`, payload);
      fetchBranches();
    } catch (err) {
      console.error("update branch err", err);
      alert("Update failed");
    }
  };

  if (loading) return <p>Loading branches...</p>;

  return (
    <div className="branch-manage-page" style={{ padding: 16 }}>
      <h2>🏢 Branch Management</h2>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 2 }}>
          <h3>All Branches</h3>
          {branches.length === 0 ? (
            <p>No branches found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Name</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Address</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Phone</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Manager</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b._id || b.id}>
                    <td style={{ padding: 8 }}>{b.branchName}</td>
                    <td style={{ padding: 8 }}>{b.address || "-"}</td>
                    <td style={{ padding: 8 }}>{b.phone || "-"}</td>
                    <td style={{ padding: 8 }}>
                      {typeof b.managerId === "object"
                        ? (b.managerId.username || b.managerId.name || "-")
                        : (b.managerId || "-")}
                    </td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => handleDelete(b._id || b.id)}>Delete</button>
                      <button
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          const newPhone = prompt("New phone", b.phone || "");
                          if (newPhone !== null) handleUpdate(b._id || b.id, { phone: newPhone });
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h3>Add New Branch</h3>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              placeholder="Branch Name"
              value={newBranch.branchName}
              onChange={(e) => setNewBranch({ ...newBranch, branchName: e.target.value })}
              required
            />
            <input
              placeholder="Address"
              value={newBranch.address}
              onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
            />
            <input
              placeholder="Phone"
              value={newBranch.phone}
              onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
            />
            <select
              value={newBranch.managerId}
              onChange={(e) => setNewBranch({ ...newBranch, managerId: e.target.value })}
            >
              <option value="">-- Select manager (optional) --</option>
              {users.map(u => <option key={u._id || u.id} value={u._id || u.id}>{u.username || u.name}</option>)}
            </select>
            <button type="submit" disabled={!newBranch.branchName.trim()}>Add Branch</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BranchManage;
