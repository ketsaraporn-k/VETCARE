// src/components/NotificationPopup.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../api/axiosConfig";

export default function NotificationPopup() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get("/notifications?limit=20");
        const data = res.data;
        if (!mounted) return;
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnread(data.unread || data.notifications.filter(n => n.status === "unread").length);
        } else if (Array.isArray(data)) {
          setNotifications(data);
          setUnread(data.filter(n => n.status === 'unread').length);
        } else {
          setNotifications([]);
          setUnread(0);
        }
      } catch (err) {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 60 * 1000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // close when click outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  if (!notifications || notifications.length === 0) {
    // still render bell (so user can toggle) — but hide panel if no notifications
    return (
      <div className="np-root" ref={rootRef}>
        <button className={`np-bell ${open ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}>
          <span className="np-bell-icon">🔔</span>
          {unread > 0 && <span className="np-dot">{unread}</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="np-root" ref={rootRef} aria-haspopup="true" aria-expanded={open}>
      <button
        className={`np-bell ${open ? 'open' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="Open notifications"
      >
        <span className="np-bell-icon">🔔</span>
        {unread > 0 && <span className="np-dot">{unread}</span>}
      </button>

      <div className={`np-panel ${open ? 'show' : ''}`} role="dialog" aria-hidden={!open}>
        <div className="np-header">
          <div>
            <div className="np-title">Notifications</div>
            <div className="np-sub">{unread} unread</div>
          </div>
          <div className="np-actions">
            <button className="np-small" onClick={(e) => { e.stopPropagation(); /* mark all read action */ }}>Mark all read</button>
            <button className="np-close" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>&times;</button>
          </div>
        </div>

        <div className="np-list">
          {notifications.slice(0, 20).map(n => (
            <div key={n._id || n.id} className={`np-item ${n.status === 'unread' ? 'unread' : ''}`} onClick={() => {
              // handle click (navigate or mark read)
              // do not close automatically unless desired
            }}>
              <div className="np-item-ico">{n.type === 'low_stock' ? '⚠' : '🔔'}</div>
              <div className="np-item-body">
                <div className="np-msg">{n.message}</div>
                <div className="np-meta">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="np-footer">
          <div className="np-note">Showing latest notifications</div>
        </div>
      </div>
    </div>
  );
}
