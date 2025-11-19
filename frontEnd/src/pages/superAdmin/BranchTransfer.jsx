import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axiosConfig";
import "./BranchTransfer.css";

function idOf(x) { return x?._id || x?.id || x || ""; }

export default function BranchTransfer() {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const currentUser = stored ? JSON.parse(stored) : null;

  const [form, setForm] = useState({
    subjectUserId: "",
    fromBranch: "",
    toBranch: "",
    reason: ""
  });

  const [showReason, setShowReason] = useState(false);

  // load branches
  const loadBranches = async () => {
    try {
      const res = await api.get("/api/branches/all").catch(() => api.get("/api/branches"));
      const data = res?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.branches)) return data.branches;
      return [];
    } catch (err) {
      console.warn("loadBranches err", err);
      return [];
    }
  };

  // load users
  const loadUsers = async () => {
    try {
      const res = await api.get("/api/branchAdmin/users").catch(() => api.get("/api/users"));
      const data = res?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.users)) return data.users;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    } catch (err) {
      console.warn("loadUsers err", err);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const [b, u] = await Promise.all([loadBranches(), loadUsers()]);
        setBranches(b || []);
        setUsers(u || []);
      } catch (err) {
        console.error("fetchAll err", err);
        setError("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const branchMap = useMemo(() => {
    const m = new Map();
    branches.forEach(b => m.set(String(idOf(b)), b));
    return m;
  }, [branches]);

  const userMap = useMemo(() => {
    const m = new Map();
    users.forEach(u => m.set(String(idOf(u)), u));
    return m;
  }, [users]);

  const getBranchDisplay = (branchRef) => {
    if (!branchRef) return "";
    if (typeof branchRef === "object") return branchRef.branchName || branchRef.name || (branchRef._id || branchRef.id);
    const b = branchMap.get(String(branchRef));
    if (b) return b.branchName || b.name || String(branchRef);
    return String(branchRef);
  };

  const handleSubjectChange = (subjectUserId) => {
    setForm(prev => ({ ...prev, subjectUserId }));
    if (!subjectUserId) {
      setForm(prev => ({ ...prev, fromBranch: "" }));
      return;
    }
    const su = userMap.get(String(subjectUserId));
    if (su) {
      const bid = su.branchId || su.branch || su.branchRef || null;
      const resolved = bid ? (typeof bid === "object" ? (bid._id || bid.id) : bid) : "";
      setForm(prev => ({ ...prev, fromBranch: resolved }));
    } else {
      setForm(prev => ({ ...prev, fromBranch: "" }));
    }
  };

  const submitRequest = async (e) => {
    e && e.preventDefault();
    setError(null);
    setInfo(null);

    if (!form.subjectUserId) { setError("กรุณาเลือกผู้ที่จะย้าย (Subject user)"); return; }
    if (!form.toBranch) { setError("กรุณาเลือกสาขาปลายทาง (To branch)"); return; }
    if (!form.fromBranch) { setError("ไม่พบสาขาต้นทางของ Subject user — กรุณารีเฟรชเพื่อตรวจสอบข้อมูล"); return; }
    if (String(form.fromBranch) === String(form.toBranch)) { setError("Target branch must be different from current branch"); return; }

    setCreating(true);
    try {
      const roleLower = (currentUser?.role || "").toString().toLowerCase();

      if (roleLower === "superadmin") {
        // direct move for superAdmin
        const userId = form.subjectUserId;
        const payload = { targetBranch: form.toBranch };
        const res = await api.put(`/api/branchAdmin/moveUser/${userId}`, payload);
        setInfo(res.data?.message || "User moved (direct) by superAdmin");
        setForm({ subjectUserId: "", fromBranch: "", toBranch: "", reason: "" });
        setShowReason(false);
      } else {
        // create move request
        const ep = "/api/branchAdmin/moveRequest";
        const payload = {
          subjectUserId: form.subjectUserId,
          toBranch: form.toBranch,
          reason: form.reason || "",
          metadata: {}
        };
        const res = await api.post(ep, payload);
        setInfo(res?.data?.message || "Move request created");
        setForm({ subjectUserId: "", fromBranch: "", toBranch: "", reason: "" });
        setShowReason(false);
      }
    } catch (err) {
      console.error("create moveRequest err", err);
      if (err?.response) {
        const status = err.response.status;
        if (status === 403) setError(err.response.data?.error || "Permission denied (403).");
        else if (status === 422 || status === 409) setError(err.response.data?.error || err.response.data?.message || `Error ${status}`);
        else if (status === 401) setError("Authentication required (401). Please login.");
        else setError(err.response.data?.error || err.message || `Error ${status}`);
      } else setError(err.message || "Network error");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="bt-page"><p className="bt-loading">Loading...</p></div>;

  return (
    <div className="bt-page">
      <h2 className="bt-title">Branch Transfer</h2>

      {error && <div className="bt-alert bt-error">{error}</div>}
      {info && <div className="bt-alert bt-info">{info}</div>}

      <section className="bt-card">
        <h4 className="bt-card-title">Create Move Request / Move User</h4>

        <div className="bt-row">
          <div className="bt-label">Requester</div>
          <div className="bt-value">
            {currentUser ? `${currentUser.username || currentUser.name}${currentUser.name ? ` — ${currentUser.name}` : ""}` : <em>Not logged in (server auth required)</em>}
          </div>
        </div>

        <form className="bt-form" onSubmit={submitRequest}>
          <div className="bt-row">
            <label className="bt-field">
              <div className="bt-field-label">Subject User <span className="bt-required">*</span></div>
              <select className="bt-select" value={form.subjectUserId} onChange={(e) => handleSubjectChange(e.target.value)} required>
                <option value="">-- select user to move --</option>
                {users.length === 0 && <option disabled>-- No users available --</option>}
                {users.map(u => {
                  const uid = idOf(u);
                  const branchLabel = (u.branchId || u.branch) ? ` • ${getBranchDisplay(u.branchId || u.branch)}` : "";
                  return <option key={uid} value={uid}>{u.username || u.name || uid}{branchLabel}</option>;
                })}
              </select>
            </label>
          </div>

          <div className="bt-grid-2">
            <div className="bt-row">
              <div className="bt-field">
                <div className="bt-field-label">From Branch (auto)</div>
                <div className="bt-readonly">
                  {form.fromBranch ? getBranchDisplay(form.fromBranch) : <span className="bt-muted">No source branch found</span>}
                </div>
              </div>
            </div>

            <div className="bt-row">
              <label className="bt-field">
                <div className="bt-field-label">To Branch <span className="bt-required">*</span></div>
                <select className="bt-select" value={form.toBranch} onChange={(e) => setForm(prev => ({ ...prev, toBranch: e.target.value }))} required>
                  <option value="">-- to branch --</option>
                  {branches.map(b => <option key={idOf(b)} value={idOf(b)}>{b.branchName || b.name || idOf(b)}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="bt-row bt-reason-row">
            {!showReason ? (
              <button type="button" className="bt-link" onClick={() => setShowReason(true)}>+ Add reason / note (optional)</button>
            ) : (
              <label className="bt-field full">
                <div className="bt-field-label">Reason / Note</div>
                <textarea className="bt-textarea" value={form.reason} onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))} rows={3} />
                <div style={{ marginTop: 6 }}>
                  <button type="button" className="bt-small" onClick={() => { setForm(prev => ({ ...prev, reason: "" })); setShowReason(false); }}>Remove reason</button>
                </div>
              </label>
            )}
          </div>

          <div className="bt-actions">
            <button className="bt-btn" type="submit" disabled={creating}>{creating ? "Processing..." : ( (currentUser && (currentUser.role || "").toString().toLowerCase() === "superadmin") ? "Move user (direct)" : "Create request")}</button>
            <button type="button" className="bt-btn ghost" onClick={() => { setForm({ subjectUserId: "", fromBranch: "", toBranch: "", reason: "" }); setShowReason(false); setError(null); setInfo(null); }}>Reset</button>
          </div>
        </form>
      </section>
    </div>
  );
}
