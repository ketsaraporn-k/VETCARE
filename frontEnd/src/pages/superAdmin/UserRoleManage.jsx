// src/pages/UserRoleManage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axiosConfig";
import "./UserRoleManage.css";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "staff", label: "Staff" },
  { value: "branchAdmin", label: "Branch Admin" },
  { value: "superAdmin", label: "Super Admin" },
];

export default function UserRoleManage() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState("");

  // read current user from localStorage (adjust if you store differently)
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const currentUserId = currentUser?.id || currentUser?._id || null;

  // fetch users + branches
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Fetching users & branches...");
      const [uRes, bRes] = await Promise.all([api.get("/users"), api.get("/branches")]);
      setUsers(uRes.data || []);
      setBranches(bRes.data || []);
      console.log("Fetched users:", (uRes.data || []).length, "branches:", (bRes.data || []).length);
    } catch (err) {
      console.error("fetchData error:", err);
      alert("Failed to load users or branches: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // create a lookup map from branches for fast id -> name
  const branchesMap = useMemo(() => {
    const m = new Map();
    branches.forEach(b => {
      const id = b._id || b.id;
      const name = b.branchName || b.name || b.displayName || null;
      if (id) m.set(String(id), name || "N/A");
    });
    return m;
  }, [branches]);

  // helper to get branch name for a user (supports many shapes)
  const getBranchName = (u) => {
    if (!u) return "N/A";

    // 1) if backend populated branch object directly with branchName/name
    if (u.branchId && (u.branchId.branchName || u.branchId.name || u.branchId.displayName)) {
      return u.branchId.branchName || u.branchId.name || u.branchId.displayName || "N/A";
    }

    // 2) if branchId is object with _id or id, or simple string id
    const possibleId = (u.branchId && (u.branchId._id || u.branchId.id)) || u.branchId;
    if (possibleId) {
      const mapped = branchesMap.get(String(possibleId));
      if (mapped) return mapped;
      // fallback show short id if no mapping found
      return String(possibleId).slice(0, 8) + (String(possibleId).length > 8 ? "..." : "");
    }

    // 3) no branch
    return "N/A";
  };

  // change role handler — backend mount uses /api/admin (do not change backend)
  const handleChangeRole = async (userId, newRole) => {
    if (!confirm(`Change role of this user to "${newRole}" ?`)) return;
    if (String(userId) === String(currentUserId)) {
      return alert("You cannot change your own role.");
    }

    try {
      const res = await api.put(`/admin/changeRole/${userId}`, { newRole });
      console.log("Change role response:", res.data);
      alert("Role updated successfully");

      // update only the changed user locally (avoid refetch)
      setUsers(prev => prev.map(u => (String(u._id || u.id) === String(userId) ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error("Change role error:", err);
      alert(err.response?.data?.error || err.message || "Failed to update role");
    }
  };

  // normalize branch id for filtering (supports different shapes)
  const getBranchIdString = (u) => {
    if (!u) return "";
    const bid = (u.branchId && (u.branchId._id || u.branchId.id)) || u.branchId;
    return bid ? String(bid) : "";
  };

  const filteredUsers = filterBranch
    ? users.filter(u => getBranchIdString(u) === filterBranch)
    : users;

  return (
    <div className="user-role-manage-page" style={{ padding: 20 }}>
      <h2>SuperAdmin — Manage User Roles</h2>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <div className="filter-bar" style={{ margin: "12px 0" }}>
            <label style={{ marginRight: 8 }}>Filter by Branch:</label>
            <select
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              style={{ padding: "6px 8px" }}
            >
              <option value="">All branches</option>
              {branches.map(b => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.branchName || b.name || b.displayName || (String(b._id || b.id).slice(0, 8) + "...")}
                </option>
              ))}
            </select>
          </div>

          <table className="user-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                <th style={{ padding: "12px" }}>Username</th>
                <th style={{ padding: "12px" }}>Name</th>
                <th style={{ padding: "12px" }}>Branch</th>
                <th style={{ padding: "12px" }}>Role</th>
                <th style={{ padding: "12px" }}>Change Role</th>
                <th style={{ padding: "12px" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#666", padding: 20 }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const id = u._id || u.id;
                  const uBranchName = getBranchName(u);
                  const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleString() : "-";

                  return (
                    <tr key={id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px" }}>{u.username}</td>
                      <td style={{ padding: "12px" }}>{u.name || "-"}</td>
                      <td style={{ padding: "12px" }}>{uBranchName}</td>
                      <td style={{ padding: "12px" }}>{u.role}</td>
                      <td style={{ padding: "12px" }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(id, e.target.value)}
                          disabled={String(id) === String(currentUserId)}
                          style={{ padding: "6px" }}
                        >
                          {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "12px" }}>{createdAt}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
