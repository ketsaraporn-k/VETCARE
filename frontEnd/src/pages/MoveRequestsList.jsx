// src/pages/MoveRequestsList.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";

/*
  MoveRequestsList (updated)
  - GET /branchAdmin/moveRequests
  - Approve: PUT /branchAdmin/moveRequest/approve/:id (superAdmin)
  - Reject:  PUT /branchAdmin/moveRequest/reject/:id  (superAdmin)
  - Cancel:  PUT /branchAdmin/moveRequest/cancel/:id  (requester OR superAdmin)  <-- changed
*/

const MoveRequestsList = ({ user: propUser }) => {
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const parsed = stored ? JSON.parse(stored) : null;
  const currentUser = propUser || parsed || {};

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const isSuper = (currentUser.role || "").toString().toLowerCase() === "superadmin";
  const isBranchAdmin = (currentUser.role || "").toString().toLowerCase() === "branchadmin";

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/branchAdmin/moveRequests");
      const data = res.data?.moveRequests || res.data || [];
      setRequests(data);
    } catch (err) {
      console.error("fetchRequests err:", err);
      setError(err.response?.data?.error || err.message || "Failed to load move requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!confirm("Approve this move request?")) return;
    try {
      setProcessingId(id);
      await api.put(`/branchAdmin/moveRequest/approve/${id}`);
      await fetchRequests();
      alert("Approved.");
    } catch (err) {
      console.error("approve err:", err);
      alert(err.response?.data?.error || "Approve failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Rejection reason (optional):", "");
    if (reason === null) return; // cancelled
    try {
      setProcessingId(id);
      await api.put(`/branchAdmin/moveRequest/reject/${id}`, { reason });
      await fetchRequests();
      alert("Rejected.");
    } catch (err) {
      console.error("reject err:", err);
      alert(err.response?.data?.error || "Reject failed");
    } finally {
      setProcessingId(null);
    }
  };

  // UPDATED: call PUT /moveRequest/cancel/:id with optional reason
  const handleCancel = async (id) => {
    const reason = prompt("Cancellation reason (optional):", "");
    if (reason === null) return; // user cancelled prompt
    if (!confirm("Cancel (mark as cancelled) this move request?")) return;

    try {
      setProcessingId(id);
      await api.put(`/branchAdmin/moveRequest/cancel/${id}`, { reason });
      await fetchRequests();
      alert("Cancelled.");
    } catch (err) {
      console.error("cancel err:", err);
      alert(err.response?.data?.error || "Cancel failed");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 16 }}><p>Loading move requests...</p></div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Move Requests</h2>

      {error && (
        <div style={{ background: "#ffe6e6", color: "#900", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {requests.length === 0 ? (
        <p>No move requests found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Requester</th>
                <th style={thStyle}>Subject</th>
                <th style={thStyle}>From Branch</th>
                <th style={thStyle}>To Branch</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const id = r._id || r.id;
                const isPending = r.status === "pending";
                const isRequester = (r.requesterId && (r.requesterId._id || r.requesterId) && String((r.requesterId._id || r.requesterId)) === String(currentUser._id || currentUser.id));

                return (
                  <tr key={id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={tdStyle}>
                      {r.requesterId?.username || r.requesterId?.name || (r.requesterId?._id ? `id:${r.requesterId._id}` : "-")}
                    </td>
                    <td style={tdStyle}>
                      {r.subjectUserId?.username || r.subjectUserId?.name || (r.subjectUserId?._id ? `id:${r.subjectUserId._id}` : "-")}
                    </td>
                    <td style={tdStyle}>{r.fromBranch?.branchName || r.fromBranch || "-"}</td>
                    <td style={tdStyle}>{r.toBranch?.branchName || r.toBranch || "-"}</td>
                    <td style={tdStyle}>{r.reason || "-"}</td>
                    <td style={tdStyle}>{r.status}</td>
                    <td style={tdStyle}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                    <td style={tdStyle}>
                      {isPending ? (
                        isSuper ? (
                          <>
                            <button
                              onClick={() => handleApprove(id)}
                              disabled={processingId === id}
                              style={{ marginRight: 8, background: "#10b981", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}
                            >
                              {processingId === id ? "Processing..." : "Approve"}
                            </button>

                            <button
                              onClick={() => handleReject(id)}
                              disabled={processingId === id}
                              style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}
                            >
                              {processingId === id ? "Processing..." : "Reject"}
                            </button>
                          </>
                        ) : (
                          // not super: only allow requester to cancel pending
                          isRequester ? (
                            <button
                              onClick={() => handleCancel(id)}
                              disabled={processingId === id}
                              style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}
                            >
                              {processingId === id ? "Processing..." : "Cancel"}
                            </button>
                          ) : (
                            <span style={{ color: "#666" }}>Pending</span>
                          )
                        )
                      ) : (
                        <span style={{ color: "#666" }}>Processed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// simple cell styles
const thStyle = { textAlign: "left", padding: "8px 10px", background: "#fafafa" };
const tdStyle = { padding: "10px" };

export default MoveRequestsList;
