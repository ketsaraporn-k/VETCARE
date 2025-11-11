// src/components/NotificationPopup.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";

const NotificationPopup = () => {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get("/notifications?limit=20"); // controller supports ?limit
        // controller returns: { notifications: [...], unread: n }
        const data = res.data;
        if (mounted) {
          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
            setUnread(data.unread || 0);
          } else if (Array.isArray(data)) {
            // fallback: some routes may return array directly
            setNotifications(data);
            setUnread(data.filter(n => n.status === 'unread').length);
          }
        }
      } catch (err) {
        // silent
      }
    };
    load();

    // optional: poll every minute
    const id = setInterval(load, 60 * 1000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="notification-popup" style={{ position: "fixed", right: 16, top: 16, zIndex: 50 }}>
      <div style={{ background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>🔔 Notifications</strong>
          <span style={{ marginLeft: 8, color: "#777" }}>{unread} unread</span>
        </div>
        <ul style={{ marginTop: 8, maxHeight: 300, overflow: "auto" }}>
          {notifications.slice(0, 8).map(n => (
            <li key={n._id || n.id || Math.random()} style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 13 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{new Date(n.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NotificationPopup;
