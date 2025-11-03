// src/pages/Inventory.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./Inventory.css";

const LOW_STOCK_THRESHOLD = Number(import.meta.env.VITE_LOW_STOCK_THRESHOLD || 5);

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // notifications
  const [notifications, setNotifications] = useState([]);
  const [notiOpen, setNotiOpen] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/medicines");
      setItems(res.data || []);
    } catch (err) {
      console.error("Error loading medicines:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications?limit=20");
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Notification fetch error:", err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchItems();
      fetchNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // show only in-stock items (quantity > 0)
  const inStockItems = items.filter(m => {
    const q = typeof m.quantity === "number" ? m.quantity : Number(m.quantity || 0);
    return q > 0;
  });

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  const handleNotiClick = async (n) => {
    try {
      if (n.status === "unread") {
        await api.put(`/notifications/${n._id}/read`);
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, status: 'read' } : x));
      }
      if (n.type === "move_request") {
        window.location.href = "/branches/move-requests";
      } else if (n.type === "appointment_upcoming") {
        window.location.href = "/appointments";
      } else if (n.type === "low_stock") {
        window.scrollTo({ top: 200, behavior: "smooth" });
      }
    } catch (err) {
      console.error("handleNotiClick err", err);
    }
  };

  if (loading) return <p style={{ padding: 16 }}>Loading inventory...</p>;

  return (
    <div className="inventory-page" style={{ padding: 16 }}>
      <div className="inventory-header" style={{ position: "relative" }}>
        <h2>Medicine Inventory</h2>

        <div className="notification-bell-wrapper">
          <button className="noti-bell-btn" onClick={() => setNotiOpen(v => !v)} aria-label="Notifications">
            🔔
            {unreadCount > 0 && <span className="noti-dot">{unreadCount}</span>}
          </button>

          {notiOpen && (
            <div className="noti-panel">
              <h4 style={{ margin: "4px 8px" }}>Notifications</h4>
              <div className="noti-list">
                {notifications.length === 0 && <div className="noti-empty">No notifications</div>}
                {notifications.map(n => (
                  <div
                    key={n._id}
                    className={`noti-item ${n.status === "unread" ? "unread" : ""}`}
                    onClick={() => handleNotiClick(n)}
                  >
                    <div className="noti-icon">
                      {n.type === "low_stock" ? "⚠️" : n.type === "move_request" ? "🔁" : n.type === "appointment_upcoming" ? "📅" : "🔔"}
                    </div>
                    <div className="noti-body">
                      <div className="noti-msg">{n.message}</div>
                      <div className="noti-meta">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* show only in-stock items */}
      <table className="inventory-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, background: "#fafafa" }}>Name</th>
            <th style={{ textAlign: "left", padding: 8, background: "#fafafa" }}>Quantity</th>
            <th style={{ textAlign: "left", padding: 8, background: "#fafafa" }}>Unit</th>
            <th style={{ textAlign: "left", padding: 8, background: "#fafafa" }}>Status</th>
            <th style={{ textAlign: "left", padding: 8, background: "#fafafa" }}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {inStockItems.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: 16, color: "#666" }}>No items in stock</td>
            </tr>
          ) : (
            inStockItems.map(m => {
              const q = typeof m.quantity === "number" ? m.quantity : Number(m.quantity || 0);
              const isLow = q <= LOW_STOCK_THRESHOLD;
              return (
                <tr key={m._id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    {m.name}
                    {isLow && <span className="low-badge" style={{ marginLeft: 8 }}>⚠ Low</span>}
                  </td>
                  <td style={{ padding: 8 }}>{q}</td>
                  <td style={{ padding: 8 }}>{m.unit || "-"}</td>
                  <td style={{ padding: 8 }}>{isLow ? <span className="text-red">Low Stock</span> : <span className="text-green">Normal</span>}</td>
                  <td style={{ padding: 8 }}>{m.updatedAt ? new Date(m.updatedAt).toLocaleString() : "-"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
  );
};

export default Inventory;
