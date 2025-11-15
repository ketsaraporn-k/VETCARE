// src/pages/superAdmin/BranchTransfer.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import "./BranchTransfer.css";

/**
 * Notes:
 * - MOVE_REQ_ENDPOINT is set to a sensible default but may need adjusting to match your backend routes.
 *   If your backend exposes move-requests under another mount point, change this constant.
 */
const MOVE_REQ_ENDPOINTS = [
  "/api/branchAdmin/move-requests", // common in this project
  "/api/move-requests",
  "/api/branchAdmin/move_requests",
  "/api/admin/move-requests"
];

export default function BranchTransfer() {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    requesterId: "", subjectUserId: "", fromBranch: "", toBranch: "", reason: ""
  });
  const [error, setError] = useState(null);
  const [moveEndpoint, setMoveEndpoint] = useState(null);

  const detectMoveEndpoint = async () => {
    // Try endpoints until one works (read-only HEAD/GET). Fallback to first one.
    for (const ep of MOVE_REQ_ENDPOINTS) {
      try {
        await api.get(ep); // if 200, choose it
        setMoveEndpoint(ep);
        return ep;
      } catch (err) {
        // skip
      }
    }
    // fallback
    setMoveEndpoint(MOVE_REQ_ENDPOINTS[0]);
    return MOVE_REQ_ENDPOINTS[0];
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bRes, uRes] = await Promise.all([
        api.get("/api/branches/all").catch(() => api.get("/api/branches")),
        api.get("/api/users")
      ]);
      setBranches(Array.isArray(bRes.data) ? bRes.data : []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      const ep = await detectMoveEndpoint();
      // fetch existing move requests (if endpoint supports GET)
      try {
        const r = await api.get(ep);
        setRequests(Array.isArray(r.data) ? r.data : (r.data?.data || []));
      } catch (err) {
        setRequests([]);
      }
    } catch (err) {
      console.error("fetchAll err:", err);
      setError(err?.response?.data?.error || err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const submitRequest = async (e) => {
    e && e.preventDefault();
    setError(null);
    if (!form.requesterId || !form.subjectUserId || !form.fromBranch || !form.toBranch) {
      setError("Please select requester, subject user and both branches");
      return;
    }
    if (form.fromBranch === form.toBranch) {
      setError("target branch must be different from current branch");
      return;
    }
    setCreating(true);
    try {
      const ep = moveEndpoint || MOVE_REQ_ENDPOINTS[0];
      const payload = {
        requesterId: form.requesterId,
        subjectUserId: form.subjectUserId,
        fromBranch: form.fromBranch,
        toBranch: form.toBranch,
        reason: form.reason || ""
      };
      const res = await api.post(ep, payload);
      // optimistic add to list
      setRequests(prev => [res.data, ...prev]);
      setForm({ requesterId: "", subjectUserId: "", fromBranch: "", toBranch: "", reason: "" });
      alert("Move request created");
    } catch (err) {
      console.error("create moveRequest err:", err);
      setError(err?.response?.data?.error || err.message || "Failed to create request");
    } finally {
      setCreating(false);
    }
  };

  const cancelRequest = async (id) => {
    if (!window.confirm("Cancel this move request?")) return;
    try {
      const ep = moveEndpoint || MOVE_REQ_ENDPOINTS[0];
      // attempt DELETE or PUT /:id/cancel depending on backend
      try {
        await api.delete(`${ep}/${id}`);
      } catch (_) {
        // fallback: PUT status=cancelled
        await api.put(`${ep}/${id}`, { status: "cancelled" });
      }
      setRequests(prev => prev.filter(r => String(r._id || r.id) !== String(id)));
    } catch (err) {
      console.error("cancel request err:", err);
      alert(err?.response?.data?.error || err.message || "Cancel failed");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Branch Transfer (Move Requests)</h2>

      {loading && <p>Loading...</p>}
      {error && <div style={{ color: "crimson", marginBottom: 8 }}>{error}</div>}

      <section style={{ marginTop: 12, border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <h4>Create Move Request</h4>
        <form onSubmit={submitRequest} style={{ display: "grid", gap: 8, maxWidth: 720 }}>
          <label>
            Requester (who initiates)
            <select value={form.requesterId} onChange={e => setForm({...form, requesterId: e.target.value})} required>
              <option value="">-- select requester --</option>
              {users.map(u => <option key={u._id || u.id} value={u._id || u.id}>{u.username} — {u.name}</option>)}
            </select>
          </label>

          <label>
            Subject User (whose branch will change)
            <select value={form.subjectUserId} onChange={e => setForm({...form, subjectUserId: e.target.value})} required>
              <option value="">-- select user to move --</option>
              {users.map(u => <option key={u._id || u.id} value={u._id || u.id}>{u.username} — {u.name}</option>)}
            </select>
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              From Branch
              <select value={form.fromBranch} onChange={e => setForm({...form, fromBranch: e.target.value})} required>
                <option value="">-- from branch --</option>
                {branches.map(b => <option key={b._id || b.id} value={b._id || b.id}>{b.branchName}</option>)}
              </select>
            </label>

            <label style={{ flex: 1 }}>
              To Branch
              <select value={form.toBranch} onChange={e => setForm({...form, toBranch: e.target.value})} required>
                <option value="">-- to branch --</option>
                {branches.map(b => <option key={b._id || b.id} value={b._id || b.id}>{b.branchName}</option>)}
              </select>
            </label>
          </div>

          <label>
            Reason / Note
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Request"}</button>
            <button type="button" onClick={() => setForm({ requesterId: "", subjectUserId: "", fromBranch: "", toBranch: "", reason: "" })}>Reset</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 20 }}>
        <h4>Existing Move Requests</h4>
        {requests.length === 0 ? (
          <p style={{ color: "#666" }}>No move requests found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Requester</th>
                <th style={{ padding: 8 }}>Subject</th>
                <th style={{ padding: 8 }}>From</th>
                <th style={{ padding: 8 }}>To</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Requested At</th>
                <th style={{ padding: 8 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => {
                const rid = r._id || r.id;
                const requester = (r.requesterId && (r.requesterId.username || r.requesterId.name)) || (r.requesterId || "-");
                const subject = (r.subjectUserId && (r.subjectUserId.username || r.subjectUserId.name)) || (r.subjectUserId || "-");
                const fromName = (r.fromBranch && (r.fromBranch.branchName || r.fromBranch)) || (r.fromBranch || "-");
                const toName = (r.toBranch && (r.toBranch.branchName || r.toBranch)) || (r.toBranch || "-");
                return (
                  <tr key={rid} style={{ borderBottom: "1px solid #fafafa" }}>
                    <td style={{ padding: 8 }}>{requester}</td>
                    <td style={{ padding: 8 }}>{subject}</td>
                    <td style={{ padding: 8 }}>{fromName}</td>
                    <td style={{ padding: 8 }}>{toName}</td>
                    <td style={{ padding: 8 }}>{r.status || r.state || "pending"}</td>
                    <td style={{ padding: 8 }}>{r.requestDate ? new Date(r.requestDate).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : "-")}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => cancelRequest(rid)} style={{ color: "crimson" }}>Cancel</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
