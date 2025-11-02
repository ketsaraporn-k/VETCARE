// src/pages/BranchTransfer.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";

const BranchTransfer = ({ user: propUser }) => {
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const parsed = stored ? JSON.parse(stored) : null;
  const currentUser = propUser || parsed || { role: null };

  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectUserId, setSubjectUserId] = useState("");
  const [targetBranch, setTargetBranch] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [bRes, uRes] = await Promise.all([
          api.get("/branches"),               // unchanged
          api.get("/branchAdmin/users")       // <--- changed
        ]);
        setBranches(bRes.data || []);
        setUsers(uRes.data?.users || uRes.data || []);
      } catch (err) {
        console.error("BranchTransfer load err", err);
        setBranches([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isSuper = (currentUser.role || "").toString().toLowerCase() === "superadmin";
  const isBranchAdmin = (currentUser.role || "").toString().toLowerCase() === "branchadmin";

  const handleDirectMove = async (e) => {
    e.preventDefault();
    if (!subjectUserId || !targetBranch) return alert("Select user and target branch");
    try {
      const res = await api.put(`/branchAdmin/moveUser/${subjectUserId}`, { targetBranch }); // <--- changed
      alert(res.data?.message || "User moved");
    } catch (err) {
      console.error("direct move err", err);
      alert(err.response?.data?.error || "Direct move failed");
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!subjectUserId || !targetBranch) return alert("Select user and target branch");
    try {
      const payload = { subjectUserId, toBranch: targetBranch, reason, metadata: null };
      const res = await api.post("/branchAdmin/moveRequest", payload); // <--- changed
      alert(res.data?.message || "Move request created");
      setReason("");
    } catch (err) {
      console.error("create move request err", err);
      alert(err.response?.data?.error || "Create move request failed");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Branch Transfer</h2>
      <p>Role detected: <strong>{currentUser.role || "unknown"}</strong></p>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h3>Select user to move</h3>
          <select value={subjectUserId} onChange={(e) => setSubjectUserId(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">-- select user --</option>
            {users.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>
                {u.username || u.name} {u.branchId ? ` (branch: ${typeof u.branchId === "object" ? (u.branchId.branchName || u.branchId._id) : u.branchId})` : ""}
              </option>
            ))}
          </select>

          <h3 style={{ marginTop: 16 }}>Select target branch</h3>
          <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">-- select branch --</option>
            {branches.map(b => <option key={b._id || b.id} value={b._id || b.id}>{b.branchName || b.name}</option>)}
          </select>
        </div>

        <div style={{ flex: 1 }}>
          {isSuper && (
            <>
              <h3>Direct Move (superAdmin)</h3>
              <form onSubmit={handleDirectMove} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="submit" disabled={!subjectUserId || !targetBranch}>Move User Now</button>
              </form>
            </>
          )}

          {isBranchAdmin && (
            <>
              <h3>Create Move Request (branchAdmin)</h3>
              <form onSubmit={handleCreateRequest} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
                <button type="submit" disabled={!subjectUserId || !targetBranch}>Create Move Request</button>
              </form>
            </>
          )}

          {!isSuper && !isBranchAdmin && <p>You do not have permission to perform branch transfers.</p>}
        </div>
      </div>
    </div>
  );
};

export default BranchTransfer;
