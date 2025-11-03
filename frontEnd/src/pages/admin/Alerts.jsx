// src/pages/admin/Alerts.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import "./Admin.css";

export default function AdminAlerts() {
  const [notifications, setNotifications] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowOnly, setLowOnly] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // notifications for this admin (server returns user's notifications)
      const [nRes, mRes] = await Promise.all([
        api.get("/notifications?limit=100"),
        api.get("/medicines")
      ]);
      const notis = nRes.data || [];
      let meds = mRes.data || [];

      // if backend doesn't offer low filter, filter here
      meds = meds.filter(m => m.quantity != null && m.quantity <= (Number(import.meta.env.VITE_LOW_STOCK_THRESHOLD || 5)));

      setNotifications(notis);
      setMedicines(meds);
    } catch (err) {
      console.error("AdminAlerts fetch err", err);
      setNotifications([]);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000); // refresh 1 min
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: "read" } : n));
    } catch (err) {
      console.error("markRead err", err);
    }
  };

  const handleCreatePO = (medicine) => {
    // navigate to purchase/create with prefilled medicine or call backend
    // example:
    if (!confirm(`Create purchase order for "${medicine.name}"?`)) return;
    // placeholder: you must implement backend route to create PO
    // api.post('/purchase-orders', { lines: [{ medicineId: medicine._id, qty:  (medicine.reorderQty||10) }] })
    alert(`(placeholder) Create PO for ${medicine.name}`);
  };

  return (
    <div className="admin-page" style={{ padding: 16 }}>
      <h2>Admin — Alerts</h2>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Left: Low stock list */}
        <div style={{ flex: 1 }}>
          <h3>Low stock medicines</h3>
          <div className="card">
            <div style={{ marginBottom: 8 }}>
              <label><input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} /> show only low</label>
            </div>

            {loading ? <p>Loading...</p> : (
              medicines.length === 0 ? <p>No low-stock medicines.</p> : (
                <table className="mini-table">
                  <thead>
                    <tr><th>Name</th><th>Qty</th><th>Unit</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {medicines.map(m => (
                      <tr key={m._id}>
                        <td>{m.name}</td>
                        <td>{m.quantity}</td>
                        <td>{m.unit || "-"}</td>
                        <td>
                          <button onClick={() => handleCreatePO(m)}>Create PO</button>
                          <button onClick={() => {
                            if (!confirm("Mark as resolved (suppress alert)?")) return;
                            // Option: set lowStockAlert = false via API
                            api.put(`/medicines/${m._id}`, { lowStockAlert: false })
                              .then(()=> fetchAll()).catch(e=> console.error(e));
                          }} style={{ marginLeft: 8 }}>Mark resolved</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

        {/* Right: Notifications by type */}
        <div style={{ width: 420 }}>
          <h3>Notifications</h3>
          <div className="card">
            {loading ? <p>Loading...</p> : (
              notifications.length === 0 ? <p>No notifications</p> : (
                notifications.map(n => (
                  <div key={n._id} className={`noti-item ${n.status !== 'read' ? 'unread' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{n.message}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{n.type} — {new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ marginLeft: 8 }}>
                      {n.status !== 'read' && <button onClick={() => markRead(n._id)}>Mark read</button>}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
