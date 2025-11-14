import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axiosConfig";
import "./BranchTransfer.css";

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
        // load branches and users
        const [bRes, uRes] = await Promise.all([
          api.get("/branches"),
          api.get("/branchAdmin/users")
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

  // fast lookup maps
  const branchMap = useMemo(() => {
    const m = new Map();
    branches.forEach(b => m.set(b._id || b.id, b));
    return m;
  }, [branches]);

  const userMap = useMemo(() => {
    const m = new Map();
    users.forEach(u => m.set(u._id || u.id, u));
    return m;
  }, [users]);

  // helpers to display readable text
  const getBranchName = (bRef) => {
    if (!bRef) return "-";
    if (typeof bRef === "object") return bRef.branchName || bRef.name || (bRef._id || bRef.id) || "-";
    const b = branchMap.get(bRef);
    return b ? (b.branchName || b.name || (b._id || b.id)) : (bRef || "-");
  };

  const getUserLabel = (u) => {
    if (!u) return "-";
    const branchName = getBranchName(u.branchId);
    const role = u.role ? ` [${u.role}]` : "";
    return `${u.username || u.name}${role} ${u.branchId ? `(branch: ${branchName})` : ""}`;
  };

  const isSuper = (currentUser.role || "").toString().toLowerCase() === "superadmin";
  const isBranchAdmin = (currentUser.role || "").toString().toLowerCase() === "branchadmin";

  const handleDirectMove = async (e) => {
    e.preventDefault();
    if (!subjectUserId || !targetBranch) return alert("Select user and target branch");

    // confirm
    const subject = userMap.get(subjectUserId);
    const confirmMsg = `Move ${subject ? (subject.username || subject.name) : subjectUserId} to "${getBranchName(targetBranch)}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.put(`/branchAdmin/moveUser/${subjectUserId}`, { targetBranch });
      alert(res.data?.message || "User moved");
      // reset selections
      setSubjectUserId("");
      setTargetBranch("");
      // reload data
      const bRes = await api.get("/branches");
      const uRes = await api.get("/branchAdmin/users");
      setBranches(bRes.data || []);
      setUsers(uRes.data?.users || uRes.data || []);
    } catch (err) {
      console.error("direct move err", err);
      alert(err.response?.data?.error || "Direct move failed");
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!subjectUserId || !targetBranch) return alert("Select user and target branch");

    const subject = userMap.get(subjectUserId);
    const confirmMsg = `Create move request for ${subject ? (subject.username || subject.name) : subjectUserId} to "${getBranchName(targetBranch)}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const payload = { subjectUserId, toBranch: targetBranch, reason, metadata: null };
      const res = await api.post("/branchAdmin/moveRequest", payload);
      alert(res.data?.message || "Move request created");
      setReason("");
      setSubjectUserId("");
      setTargetBranch("");
    } catch (err) {
      console.error("create move request err", err);
      alert(err.response?.data?.error || "Create move request failed");
    }
  };

  if (loading) return <p className="bt-loading">Loading...</p>;

  return (
    <div className="bt-page">
      <h2 className="bt-title">Branch Transfer</h2>
      <p>Role detected: <strong>{currentUser.role || "unknown"}</strong></p>

      <div className="bt-layout">
        <div className="bt-col">
          <h3>Select user to move</h3>
          <select
            value={subjectUserId}
            onChange={(e) => setSubjectUserId(e.target.value)}
            className="bt-select"
          >
            <option value="">-- select user --</option>
            {users.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>
                {getUserLabel(u)}
              </option>
            ))}
          </select>

          <h3 style={{ marginTop: 16 }}>Select target branch</h3>
          <select
            value={targetBranch}
            onChange={(e) => setTargetBranch(e.target.value)}
            className="bt-select"
          >
            <option value="">-- select branch --</option>
            {branches.map(b => {
              // if subject selected and branch equals user's current branch -> disable option
              const subject = userMap.get(subjectUserId);
              const subjectBranchId = subject ? (typeof subject.branchId === "object" ? (subject.branchId._id || subject.branchId.id) : subject.branchId) : null;
              const isSame = subjectBranchId && (subjectBranchId === (b._id || b.id));
              return (
                <option key={b._id || b.id} value={b._id || b.id} disabled={isSame}>
                  {b.branchName || b.name || (b._id || b.id)}{isSame ? " (current)" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div className="bt-col">
          {isSuper && (
            <>
              <h3>Direct Move (superAdmin)</h3>
              <form onSubmit={handleDirectMove} className="bt-form">
                <button type="submit" className="bt-btn" disabled={!subjectUserId || !targetBranch}>Move User Now</button>
              </form>
            </>
          )}

          {isBranchAdmin && (
            <>
              <h3>Create Move Request (branchAdmin)</h3>
              <form onSubmit={handleCreateRequest} className="bt-form">
                <textarea
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="bt-textarea"
                />
                <button type="submit" className="bt-btn" disabled={!subjectUserId || !targetBranch}>Create Move Request</button>
              </form>
            </>
          )}

          {!isSuper && !isBranchAdmin && <p className="bt-no-perm">You do not have permission to perform branch transfers.</p>}
        </div>
      </div>
    </div>
  );
};

export default BranchTransfer;
