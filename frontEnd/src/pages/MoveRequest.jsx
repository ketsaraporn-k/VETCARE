import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import "./MoveRequest.css"; // ถ้ามี CSS แยก

const MoveRequest = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [form, setForm] = useState({
    subjectUserId: "",
    toBranch: "",
    reason: "",
    metadata: ""
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // users: branch-specific; branches: all (for selecting target)
        const [bRes, uRes] = await Promise.all([
          api.get("/branches/all"),           // GET all branches for target select
          api.get("/branchAdmin/users")       // GET users in current branch
        ]);

        const loadedBranches = bRes.data || [];
        let loadedUsers = uRes.data?.users || uRes.data || [];
        if (loadedUsers && !Array.isArray(loadedUsers)) loadedUsers = [loadedUsers];

        setBranches(loadedBranches);
        setUsers(loadedUsers);

        // debug
        console.debug("Loaded branches:", loadedBranches.length, loadedBranches);
        console.debug("Loaded users:", loadedUsers.length, loadedUsers);
      } catch (err) {
        console.error("MoveRequest load err", err);
        if (err.response) {
          setErrorMsg(`Failed to load data: ${err.response.status} - ${err.response.data?.error || err.response.data?.message || JSON.stringify(err.response.data)}`);
        } else {
          setErrorMsg("Failed to load data (no response). Check server/network.");
        }
        setBranches([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // helper maps
  const branchMap = useMemo(() => {
    const m = new Map();
    branches.forEach(b => m.set(String(b._id || b.id), b));
    return m;
  }, [branches]);

  const userMap = useMemo(() => {
    const m = new Map();
    users.forEach(u => m.set(String(u._id || u.id), u));
    return m;
  }, [users]);

  const getBranchName = (bRef) => {
    if (!bRef) return "-";
    if (typeof bRef === "object") return bRef.branchName || bRef.name || (bRef._id || bRef.id);
    const b = branchMap.get(String(bRef));
    return b ? (b.branchName || b.name || (b._id || b.id)) : bRef;
  };

  const getUserLabel = (u) => {
    if (!u) return "-";
    if (typeof u === "object") {
      const branchName = u.branchId ? getBranchName(u.branchId) : null;
      const role = u.role ? ` [${u.role}]` : "";
      return `${u.username || u.name || (u._id || u.id)}${role}${branchName ? ` (branch: ${branchName})` : ""}`;
    }
    const obj = userMap.get(String(u));
    if (obj) return getUserLabel(obj);
    return u;
  };

  const subjectCurrentBranchId = (() => {
    if (!form.subjectUserId) return null;
    const subj = userMap.get(String(form.subjectUserId));
    if (!subj) return null;
    const bid = subj.branchId;
    if (!bid) return null;
    return (typeof bid === "object") ? (bid._id || bid.id) : bid;
  })();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.subjectUserId || !form.toBranch) return alert("Please select user and target branch.");
    if (subjectCurrentBranchId && String(subjectCurrentBranchId) === String(form.toBranch)) {
      return alert("Target branch is the user's current branch.");
    }

    const confirmMsg = `Create move request for ${getUserLabel(userMap.get(String(form.subjectUserId)) || form.subjectUserId)} to "${getBranchName(form.toBranch)}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.post("/branchAdmin/moveRequest", form);
      alert(res.data?.message || "Move request created");
      setForm({ subjectUserId: "", toBranch: "", reason: "", metadata: "" });
      navigate("/branches/move-requests");
    } catch (err) {
      console.error("create move request err", err);
      if (err.response) {
        alert(err.response.data?.error || err.response.data?.message || `Error ${err.response.status}`);
      } else {
        alert("Request failed (no response). Check network.");
      }
    }
  };

  if (loading) return <div style={{ padding: 16 }}><p>Loading...</p></div>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Create Move Request</h2>

      {errorMsg && (
        <div style={{ background: "#fff4e6", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <strong>Warning:</strong> {errorMsg}
        </div>
      )}

      <form onSubmit={handleCreate} style={{ maxWidth: 800 }}>
        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>Select user to move</div>
          <select
            value={form.subjectUserId}
            onChange={(e) => setForm({ ...form, subjectUserId: e.target.value })}
            style={{ width: "100%", padding: 10, borderRadius: 6 }}
          >
            <option value="">-- select user --</option>
            {users.length === 0 && <option disabled>-- No users available --</option>}
            {users.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>
                {getUserLabel(u)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>Target branch</div>
          <select
            value={form.toBranch}
            onChange={(e) => setForm({ ...form, toBranch: e.target.value })}
            style={{ width: "100%", padding: 10, borderRadius: 6 }}
          >
            <option value="">-- select branch --</option>
            {branches.map(b => {
              const id = b._id || b.id;
              const isCurrent = subjectCurrentBranchId && String(subjectCurrentBranchId) === String(id);
              return (
                <option key={id} value={id} disabled={isCurrent}>
                  {b.branchName || b.name || id}{isCurrent ? " (current)" : ""}
                </option>
              );
            })}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>Reason (optional)</div>
          <textarea
            placeholder="Reason (optional)"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={5}
            style={{ width: "100%", padding: 10, borderRadius: 6 }}
          />
        </label>

        <div style={{ marginTop: 12 }}>
          <button
            type="submit"
            disabled={!form.subjectUserId || !form.toBranch}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "#4b5563",
              color: "#fff",
              border: "none",
              cursor: (!form.subjectUserId || !form.toBranch) ? "not-allowed" : "pointer",
              opacity: (!form.subjectUserId || !form.toBranch) ? 0.6 : 1
            }}
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
};

export default MoveRequest;
