// src/pages/MoveRequestHistory.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";

const MoveRequestHistory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openRow, setOpenRow] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get("/branchAdmin/moveRequests/history");
                const data = res.data?.moveRequests || res.data || [];
                setItems(data);
            } catch (err) {
                console.error("load history err", err);
                setError(err.response?.data?.error || err.message || "Failed to load history");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div style={{ padding: 16 }}><p>Loading history...</p></div>;
    if (error) return <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>;

    return (
        <div style={{ padding: 16 }}>
            <h2>Move Request History</h2>
            {items.length === 0 ? (
                <p>No move requests found.</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={th}>Requester</th>
                                <th style={th}>Subject</th>
                                <th style={th}>From</th>
                                <th style={th}>To</th>
                                <th style={th}>Status</th>
                                <th style={th}>Created</th>
                                <th style={th}>History</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((r) => {
                                const id = r._id || r.id;
                                return (
                                    <React.Fragment key={id}>
                                        <tr style={{ borderBottom: "1px solid #eee" }}>
                                            <td style={td}>{r.requesterId?.username || r.requesterId?.name || '-'}</td>
                                            <td style={td}>{r.subjectUserId?.username || r.subjectUserId?.name || '-'}</td>
                                            <td style={td}>{r.fromBranch?.branchName || '-'}</td>
                                            <td style={td}>{r.toBranch?.branchName || '-'}</td>
                                            <td style={td}>{r.status}</td>
                                            <td style={td}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                                            <td style={td}>
                                                <button onClick={() => setOpenRow(openRow === id ? null : id)} style={btnStyle}>
                                                    {openRow === id ? 'Hide' : 'Show'}
                                                </button>
                                            </td>
                                        </tr>

                                        {openRow === id && (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 12, background: "#fafafa" }}>
                                                    <div><strong>Reason:</strong> {r.reason || '-'}</div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <strong>History</strong>
                                                        <ol style={{ marginTop: 6 }}>
                                                            {(r.history || []).map((h, idx) => (
                                                                <li key={idx} style={{ marginBottom: 8 }}>
                                                                    <div>
                                                                        <strong>{h.action}</strong> — by {h.by?.username || h.by?.name || (h.by ? `id:${h.by}` : 'system')} at {h.at ? new Date(h.at).toLocaleString() : '-'}
                                                                    </div>
                                                                    {h.reason && <div>Reason: {h.reason}</div>}
                                                                    {h.note && <div>Note: {h.note}</div>}
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const th = { textAlign: "left", padding: "8px 10px", background: "#fafafa" };
const td = { padding: "10px", verticalAlign: "top" };
const btnStyle = { padding: "6px 10px", borderRadius: 6, border: "none", background: "#374151", color: "#fff", cursor: "pointer" };

export default MoveRequestHistory;
