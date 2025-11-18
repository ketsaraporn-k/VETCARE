// src/pages/MoveRequestsList.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axiosConfig";
import "./MoveRequestsList.css"; // make sure this imports your .mr-* CSS

const CANDIDATE_GET_ENDPOINTS = [
  "/api/branchAdmin/moveRequests",
  "/branchAdmin/moveRequests",
  "/api/branchAdmin/move-requests",
  "/api/branchAdmin/move_requests",
  "/api/move-requests",
  "/api/move_requests",
  "/api/moveRequests",
  "/branchAdmin/move-requests",
  "/moveRequests",
  "/move-requests"
];

function tryParseMoveRequests(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.moveRequests)) return payload.moveRequests;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.moveRequests && Array.isArray(payload.moveRequests.data)) return payload.moveRequests.data;
  return [];
}

export default function MoveRequestsList({ user: propUser }) {
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const parsed = stored ? JSON.parse(stored) : null;
  const currentUser = propUser || parsed || {};

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [detectedGetEndpoint, setDetectedGetEndpoint] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPayload, setRejectPayload] = useState({ id: null, reason: "" });

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const isSuper = (currentUser.role || "").toString().toLowerCase() === "superadmin";

  const detectGetEndpoint = async () => {
    for (const ep of CANDIDATE_GET_ENDPOINTS) {
      try {
        const res = await api.get(ep);
        if (res && res.status >= 200 && res.status < 300) return ep;
      } catch (err) { /* try next */ }
    }
    return null;
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      let ep = detectedGetEndpoint;
      if (!ep) {
        ep = await detectGetEndpoint();
        setDetectedGetEndpoint(ep);
      }
      if (!ep) throw new Error("No moveRequests endpoint detected. Check backend routes.");
      const res = await api.get(ep);
      const parsedList = tryParseMoveRequests(res.data);
      if (mountedRef.current) setRequests(parsedList);
    } catch (err) {
      console.error("fetchRequests err:", err);
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message;
      setError(serverMsg || err.message || "Failed to load move requests");
      if (mountedRef.current) setRequests([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, [detectedGetEndpoint]);

  const tryActionOnVariants = async (actionName, id, body = {}) => {
    const candidates = [
      `/api/branchAdmin/moveRequest/${actionName}/${id}`,
      `/api/branchAdmin/move-requests/${actionName}/${id}`,
      `/api/branchAdmin/move_requests/${actionName}/${id}`,
      `/branchAdmin/moveRequest/${actionName}/${id}`,
      `/branchAdmin/move-requests/${actionName}/${id}`,
      `/moveRequest/${actionName}/${id}`,
      `/move-requests/${actionName}/${id}`,
      `/api/move-requests/${actionName}/${id}`,
      `/api/move_requests/${actionName}/${id}`,
      // alternate: PUT /api/branchAdmin/moveRequest/cancel/:id etc
      `/api/branchAdmin/moveRequest/${actionName}/${id}`,
      `/api/branchAdmin/moveRequest/${id}`, // some APIs expect body { action: 'cancel' } but we try simple PUT first
      `/api/branchAdmin/move-requests/${id}`
    ];

    let lastErr = null;
    for (const url of candidates) {
      try {
        // prefer PUT for actions
        const res = await api.put(url, body);
        if (res && res.status >= 200 && res.status < 300) return res;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("No action endpoint succeeded");
  };

  const handleApprove = async (id) => {
    if (!confirm("Approve this move request?")) return;
    try {
      setProcessingId(id);
      await tryActionOnVariants("approve", id);
      await fetchRequests();
      alert("Approved.");
    } catch (err) {
      console.error("approve err:", err);
      alert(err?.response?.data?.error || err?.message || "Approve failed");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (id) => {
    setRejectPayload({ id, reason: "" });
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    const { id, reason } = rejectPayload;
    if (!id) return;
    try {
      setProcessingId(id);
      setShowRejectModal(false);
      await tryActionOnVariants("reject", id, { reason });
      await fetchRequests();
      alert("Rejected.");
    } catch (err) {
      console.error("reject err:", err);
      alert(err?.response?.data?.error || err?.message || "Reject failed");
    } finally {
      setProcessingId(null);
      setRejectPayload({ id: null, reason: "" });
    }
  };

  const openCancelConfirm = async (id) => {
    const reason = prompt("Cancellation reason (optional):", "");
    if (reason === null) return;
    if (!confirm("Cancel (mark as cancelled) this move request?")) return;
    try {
      setProcessingId(id);
      await tryActionOnVariants("cancel", id, { reason });
      await fetchRequests();
      alert("Cancelled.");
    } catch (err) {
      console.error("cancel err:", err);
      alert(err?.response?.data?.error || err?.message || "Cancel failed");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mr-page">
      <h2 className="mr-title">Move Requests</h2>

      {loading && <div className="mr-loading">Loading move requests...</div>}

      {error && <div className="mr-error"><strong>Error:</strong> {error}</div>}

      <div className="mr-table-wrap">
        <table className="mr-table">
          <thead>
            <tr>
              <th>Requester</th>
              <th>Subject</th>
              <th>From Branch</th>
              <th>To Branch</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {(!requests || requests.length === 0) ? (
              <tr><td colSpan={8} style={{ padding: 16, textAlign: "center" }}>No move requests found.</td></tr>
            ) : requests.map((r) => {
              const id = r._id || r.id;
              const isPending = (r.status || "").toString().toLowerCase() === "pending";
              const isRequester = (r.requesterId && (r.requesterId._id || r.requesterId) && String((r.requesterId._id || r.requesterId)) === String(currentUser._id || currentUser.id));

              return (
                <tr key={id}>
                  <td>{r.requesterId?.username || r.requesterId?.name || (r.requesterId?._id ? `id:${r.requesterId._id}` : "-")}</td>
                  <td>{r.subjectUserId?.username || r.subjectUserId?.name || (r.subjectUserId?._id ? `id:${r.subjectUserId._id}` : "-")}</td>
                  <td>{(r.fromBranch && (r.fromBranch.branchName || r.fromBranch)) || "-"}</td>
                  <td>{(r.toBranch && (r.toBranch.branchName || r.toBranch)) || "-"}</td>
                  <td className="mr-reason" title={r.reason || ""}>{r.reason || "-"}</td>
                  <td>{r.status || "-"}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : (r.requestDate ? new Date(r.requestDate).toLocaleString() : "-")}</td>
                  <td>
                    <div className="mr-actions">
                      {isPending ? (
                        isSuper ? (
                          <>
                            <button className="mr-btn mr-btn-approve" onClick={() => handleApprove(id)} disabled={processingId === id}>
                              {processingId === id ? "..." : "Approve"}
                            </button>
                            <button className="mr-btn mr-btn-reject" onClick={() => openRejectModal(id)} disabled={processingId === id}>
                              {processingId === id ? "..." : "Reject"}
                            </button>
                          </>
                        ) : (
                          isRequester ? (
                            <button className="mr-btn" onClick={() => openCancelConfirm(id)} disabled={processingId === id}>
                              {processingId === id ? "..." : "Cancel"}
                            </button>
                          ) : (
                            <span className="mr-processed">Pending</span>
                          )
                        )
                      ) : (
                        <span className="mr-processed">Processed</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="mr-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="mr-modal" onClick={e => e.stopPropagation()}>
            <h3>Reject Move Request</h3>
            <div className="mr-modal-sub">Provide a reason for rejecting this request (optional)</div>
            <textarea
              className="mr-textarea"
              rows={4}
              value={rejectPayload.reason}
              onChange={(e) => setRejectPayload(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Rejection reason (optional)"
            />
            <div className="mr-modal-actions">
              <button className="mr-btn" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="mr-btn mr-btn-reject" onClick={submitReject} disabled={!rejectPayload.id}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
