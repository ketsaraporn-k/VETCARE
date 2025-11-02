// src/pages/MoveRequestsList.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";

/*
  MoveRequestsList
  - ดึงรายการคำขอย้ายจาก backend: GET /api/branchAdmin/moveRequests
  - SuperAdmin สามารถ Approve -> PUT /api/branchAdmin/moveRequest/approve/:id
  - SuperAdmin สามารถ Reject  -> PUT /api/branchAdmin/moveRequest/reject/:id (ส่ง { reason })
  - BranchAdmin จะเห็นคำขอของสาขาตัวเอง (backend filter)
*/

const MoveRequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null); // id ที่กำลัง approve/reject

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/branchAdmin/moveRequests");
      // backend คืน { moveRequests: [...] } หรือ [...]
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
      // refresh
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
    if (reason === null) return; // user cancelled
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
              {requests.map((r) => (
                <tr key={r._id || r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>
                    {r.requesterId?.username || r.requesterId?.name || (r.requesterId?._id ? `id:${r.requesterId._id}` : "-")}
                  </td>
                  <td style={tdStyle}>
                    {r.subjectUserId?.username || r.subjectUserId?.name || (r.subjectUserId?._id ? `id:${r.subjectUserId._id}` : "-")}
                  </td>
                  <td style={tdStyle}>
                    {r.fromBranch?.branchName || r.fromBranch || "-"}
                  </td>
                  <td style={tdStyle}>
                    {r.toBranch?.branchName || r.toBranch || "-"}
                  </td>
                  <td style={tdStyle}>{r.reason || "-"}</td>
                  <td style={tdStyle}>{r.status}</td>
                  <td style={tdStyle}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                  <td style={tdStyle}>
                    {r.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleApprove(r._id || r.id)}
                          disabled={processingId === (r._id || r.id)}
                          style={{ marginRight: 8 }}
                        >
                          {processingId === (r._id || r.id) ? "Processing..." : "Approve"}
                        </button>

                        <button
                          onClick={() => handleReject(r._id || r.id)}
                          disabled={processingId === (r._id || r.id)}
                        >
                          {processingId === (r._id || r.id) ? "Processing..." : "Reject"}
                        </button>
                      </>
                    ) : (
                      <span style={{ color: "#666" }}>Processed</span>
                    )}
                  </td>
                </tr>
              ))}
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
