// src/pages/MoveRequest.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosConfig";
import "./MoveRequest.css";

/**
 * MoveRequest (updated)
 * - No requester select: use current user from localStorage (server uses auth)
 * - Auto fromBranch from selected subject user
 * - superAdmin: can target any branch and performs direct move (PUT /api/branchAdmin/moveUser/:userId)
 * - branchAdmin: creates move request (POST /api/branchAdmin/moveRequest)
 */

const MOVE_REQ_ENDPOINTS = [
  "/api/branchAdmin/move-requests",
  "/api/branchAdmin/moveRequest",
  "/api/move-requests",
  "/branchAdmin/move-requests",
  "/api/branchAdmin/move_requests",
  "/api/move_requests",
  "/api/admin/move-requests"
];

export default function MoveRequest() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moveEndpoint, setMoveEndpoint] = useState(null);

  const [form, setForm] = useState({ subjectUserId: "", fromBranch: "", toBranch: "", reason: "" });

  // current user (try localStorage)
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const currentUser = stored ? JSON.parse(stored) : null;
  const currentRole = (currentUser?.role || "").toString().toLowerCase();
  const currentBranchId = (currentUser?.branchId || currentUser?.branch) || null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // load branches: try a few endpoints
        const branchEndpoints = ["/api/branches/all", "/api/branches", "/branches", "/api/branch/branches"];
        let bRes = null;
        for (const ep of branchEndpoints) {
          try { bRes = await api.get(ep); break; } catch (e) { /* continue */ }
        }
        const loadedBranches = bRes?.data && Array.isArray(bRes.data) ? bRes.data :
          (Array.isArray(bRes?.data?.data) ? bRes.data.data :
            (Array.isArray(bRes?.data?.branches) ? bRes.data.branches : []));
        setBranches(loadedBranches || []);

        // load users
        // if superAdmin -> use GET /api/users (all)
        // else try branchAdmin users endpoint then fallback
        let uRes = null;
        if (currentRole === "superadmin") {
          try { uRes = await api.get("/api/users"); } catch (e) { uRes = null; }
        } 
        if (!uRes) {
          const userEndpoints = [
            "/api/branchAdmin/users",
            `/api/users?branchId=${currentBranchId || ""}`,
            "/api/users",
            "/users"
          ];
          for (const ep of userEndpoints) {
            try { uRes = await api.get(ep); break; } catch (e) { /* continue */ }
          }
        }

        let loadedUsers = uRes?.data?.users || uRes?.data || [];
        if (!Array.isArray(loadedUsers)) {
          // normalize single-object responses
          loadedUsers = loadedUsers ? [loadedUsers] : [];
        }

        // If current user is not superAdmin, enforce branch filtering client-side (defensive)
        if (currentRole !== "superadmin" && currentBranchId) {
          loadedUsers = loadedUsers.filter(u => {
            const bid = u.branchId || u.branch || null;
            if (!bid) return false;
            return String(bid) === String(currentBranchId);
          });
        }

        setUsers(loadedUsers || []);

        // detect move endpoint (GET)
        for (const ep of MOVE_REQ_ENDPOINTS) {
          try {
            await api.get(ep);
            setMoveEndpoint(ep);
            break;
          } catch (e) { /* ignore */ }
        }
        if (!moveEndpoint) setMoveEndpoint(MOVE_REQ_ENDPOINTS[0]);

      } catch (err) {
        console.error("MoveRequest load err:", err);
        setError(err?.response?.data?.error || err.message || "Failed to load data");
        setBranches([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line
  }, []);

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

  // derive subject's current branch id
  const subjectCurrentBranchId = (() => {
    if (!form.subjectUserId) return null;
    const subj = userMap.get(String(form.subjectUserId));
    if (!subj) return null;
    const bid = subj.branchId || subj.branch || null;
    if (!bid) return null;
    return (typeof bid === "object") ? (bid._id || bid.id) : bid;
  })();

  // when subject changes, auto-fill fromBranch
  useEffect(() => {
    if (!form.subjectUserId) {
      setForm(prev => ({ ...prev, fromBranch: "" }));
      return;
    }
    const subj = userMap.get(String(form.subjectUserId));
    const bid = subj ? (subj.branchId || subj.branch || null) : null;
    const resolved = bid ? (typeof bid === "object" ? (bid._id || bid.id) : bid) : "";
    setForm(prev => ({ ...prev, fromBranch: resolved }));
    // eslint-disable-next-line
  }, [form.subjectUserId, users]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.subjectUserId || !form.toBranch) {
      alert("Please select user and target branch.");
      return;
    }
    if (subjectCurrentBranchId && String(subjectCurrentBranchId) === String(form.toBranch)) {
      alert("Target branch is the user's current branch.");
      return;
    }

    // confirm
    if (!window.confirm(`Proceed to move ${getUserLabel(userMap.get(String(form.subjectUserId)) || form.subjectUserId)} → ${getBranchName(form.toBranch)}?`)) return;

    try {
      // superAdmin -> direct move using PUT /moveUser/:userId
      if (currentRole === "superadmin") {
        const userId = form.subjectUserId;
        const res = await api.put(`/api/branchAdmin/moveUser/${userId}`, { targetBranch: form.toBranch });
        // refresh users & requests (best-effort)
        try {
          const uRes = await api.get("/api/users");
          setUsers(Array.isArray(uRes.data) ? uRes.data : (uRes.data?.users || []));
        } catch (e) { /* ignore */ }
        try {
          const rRes = await api.get("/api/branchAdmin/moveRequests");
          setMoveEndpoint(prev => prev);
        } catch (e) { /* ignore */ }

        alert(res.data?.message || "User moved (direct).");
        setForm({ subjectUserId: "", fromBranch: "", toBranch: "", reason: "" });
        return;
      }

      // branchAdmin -> create pending request (POST /moveRequest)
      const ep = moveEndpoint || "/api/branchAdmin/moveRequest";
      // payload: do NOT include requesterId (server uses req.user)
      const payload = {
        subjectUserId: form.subjectUserId,
        toBranch: form.toBranch,
        reason: form.reason || ""
      };

      // try posting; try a few shapes if needed
      let res = null;
      try { res = await api.post(ep, payload); } catch (err1) {
        // fallback to singular path
        const ep2 = (ep.includes("move-requests") || ep.includes("move_requests")) ? ep.replace(/move-requests|move_requests/g, "moveRequest") : ep;
        res = await api.post(ep2, payload);
      }

      alert(res.data?.message || "Move request created");
      setForm({ subjectUserId: "", fromBranch: "", toBranch: "", reason: "" });
      navigate("/branches/move-requests");
    } catch (err) {
      console.error("create move request err", err);
      if (err?.response) {
        setError(err.response.data?.error || err.response.data?.message || `Error ${err.response.status}`);
        alert(err.response.data?.error || err.response.data?.message || `Error ${err.response.status}`);
      } else {
        setError(err.message || "Network error");
        alert(err.message || "Network error");
      }
    }
  };

  if (loading) return <div style={{ padding: 16 }}><p>Loading...</p></div>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Create Move Request</h2>

      {error && <div style={{ color: "crimson", marginBottom: 8 }}>{error}</div>}

      <form onSubmit={handleCreate} style={{ maxWidth: 800 }}>
        {/* requester removed: currentUser is requester */}
        <div style={{ marginBottom: 8 }}>
          <strong>Requester:</strong>{" "}
          <span>{currentUser ? `${currentUser.username || currentUser.name} ${currentUser.name ? `— ${currentUser.name}` : ""}` : "Not logged in"}</span>
          {currentRole === "superadmin" && <span style={{ marginLeft: 12, color: "#6b7280" }}>(superAdmin — direct move will be applied)</span>}
        </div>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>Select user to move</div>
          <select value={form.subjectUserId} onChange={(e) => setForm({ ...form, subjectUserId: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 6 }}>
            <option value="">-- select user --</option>
            {users.length === 0 && <option disabled>-- No users available --</option>}
            {users.map(u => <option key={u._id || u.id} value={u._id || u.id}>{getUserLabel(u)}</option>)}
          </select>
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1 }}>
            <div style={{ marginBottom: 6 }}>From Branch</div>
            <input readOnly value={getBranchName(form.fromBranch)} style={{ width: "100%", padding: 10, borderRadius: 6 }} />
          </label>

          <label style={{ flex: 1 }}>
            <div style={{ marginBottom: 6 }}>To Branch</div>
            <select value={form.toBranch} onChange={(e) => setForm({ ...form, toBranch: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 6 }}>
              <option value="">-- to branch --</option>
              {branches.map(b => {
                const id = b._id || b.id;
                const isCurrent = subjectCurrentBranchId && String(subjectCurrentBranchId) === String(id);
                // for superAdmin allow selecting any branch (don't disable current unless you want)
                const disabled = (currentRole !== "superadmin") && isCurrent;
                return <option key={id} value={id} disabled={disabled}>{b.branchName || b.name}{disabled ? " (current)" : ""}</option>;
              })}
            </select>
          </label>
        </div>

        <label style={{ display: "block", marginTop: 12 }}>
          <div style={{ marginBottom: 6 }}>Reason (optional)</div>
          <textarea placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={4} style={{ width: "100%", padding: 10, borderRadius: 6 }} />
        </label>

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={!form.subjectUserId || !form.toBranch} style={{
            padding: "10px 18px", borderRadius: 8, background: "#4b5563", color: "#fff", border: "none",
            cursor: (!form.subjectUserId || !form.toBranch) ? "not-allowed" : "pointer", opacity: (!form.subjectUserId || !form.toBranch) ? 0.6 : 1
          }}>
            {currentRole === "superadmin" ? "Direct move (apply now)" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
