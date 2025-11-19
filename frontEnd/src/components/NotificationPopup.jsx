// src/components/NotificationPopup.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../api/axiosConfig";
import "./notification.popup.fixed.css";

/**
 * NotificationPopup (complete)
 * - Robust mark-all-read / mark-read with fallbacks
 * - Enriches IDs in messages by trying common resource endpoints
 * - Accessibility (aria-modal, focus trap, inert fallback)
 * - Console debug to help identify missing backend routes
 */

export default function NotificationPopup() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const prevFocusRef = useRef(null);
  const resourceCacheRef = useRef(new Map());

  const getAppRoot = () =>
    document.getElementById("app-root") ||
    document.getElementById("root") ||
    document.querySelector("main") ||
    document.body;

  // ---------- helpers ----------
  const shortId = (id) => (id && id.length > 12 ? id.slice(0, 8) + "…" + id.slice(-4) : id);

  const extractIdsFromText = (text) => {
    if (!text || typeof text !== "string") return [];
    const ids = new Set();
    const mongoRe = /[0-9a-fA-F]{24}/g;
    let m;
    while ((m = mongoRe.exec(text))) ids.add(m[0]);
    const uuidRe = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g;
    while ((m = uuidRe.exec(text))) ids.add(m[0]);
    // long hex fallback
    const longHex = /[0-9a-fA-F]{12,}/g;
    while ((m = longHex.exec(text))) ids.add(m[0]);
    return Array.from(ids);
  };

  // candidate endpoints to resolve an id -> resource
  const RESOURCE_ENDPOINTS = [
    (id) => `/api/moveRequests/${id}`,
    (id) => `/moveRequests/${id}`,
    (id) => `/branchAdmin/moveRequest/${id}`,
    (id) => `/api/users/${id}`,
    (id) => `/users/${id}`,
    (id) => `/api/branches/${id}`,
    (id) => `/branches/${id}`,
    (id) => `/api/pets/${id}`,
    (id) => `/pets/${id}`,
  ];

  // fetch resource for id with cache
  const fetchResourceForId = async (id) => {
    const cache = resourceCacheRef.current;
    if (cache.has(id)) return cache.get(id);

    for (const mk of RESOURCE_ENDPOINTS) {
      const url = mk(id);
      try {
        const res = await api.get(url);
        if (res && res.data) {
          const data = res.data;
          const normalized = {
            id,
            source: url,
            raw: data,
            name:
              data.name ||
              data.branchName ||
              data.username ||
              data.fullName ||
              data.petName ||
              data.title ||
              null,
            moveRequest: data.requester || data.requesterId || data.subjectUser || null,
          };
          cache.set(id, normalized);
          console.debug("[fetchResourceForId] resolved", id, "via", url, normalized.name);
          return normalized;
        }
      } catch (err) {
        // try next
      }
    }
    const fallback = { id, source: null, raw: null, name: null, moveRequest: null };
    cache.set(id, fallback);
    console.debug("[fetchResourceForId] not found", id);
    return fallback;
  };

  const buildFormattedMessage = (n, resourcesById = {}) => {
    const original = n.message || "";
    // pattern: Move request approved: <id>
    const moveApprovedRe = /Move request approved:\s*([0-9a-fA-F\-]{8,})/i;
    const mApproved = original.match(moveApprovedRe);
    if (mApproved) {
      const id = mApproved[1];
      const r = resourcesById[id];
      if (r && r.moveRequest) {
        const mr = r.moveRequest;
        const requesterName = (mr.requester && (mr.requester.name || mr.requester.fullName || mr.requester.username)) || mr.requesterName || null;
        const subjectName = (mr.subjectUser && (mr.subjectUser.name || mr.subjectUser.fullName)) || mr.subjectUserName || null;
        const parts = ["Move Request Approved"];
        if (subjectName) parts.push(`for ${subjectName}`);
        if (requesterName) parts.push(`by ${requesterName}`);
        parts.push(`#${shortId(id)}`);
        return parts.join(" • ");
      } else if (r && r.name) {
        return `Move Request Approved • ${r.name} • #${shortId(id)}`;
      } else {
        return `Move Request Approved • #${shortId(id)}`;
      }
    }

    const ids = extractIdsFromText(original);
    if (ids.length === 1) {
      const id = ids[0];
      const r = resourcesById[id];
      if (r && r.name) return original.replace(id, `${r.name} (#${shortId(id)})`);
      if (r && r.moveRequest) {
        const mr = r.moveRequest;
        const who = (mr.subjectUser && (mr.subjectUser.name || mr.subjectUser.fullName)) || mr.subjectUserName || null;
        if (who) return original.replace(id, `${who} (#${shortId(id)})`);
      }
      return original.replace(/[0-9a-fA-F]{12,}/g, `#${shortId(id)}`);
    }

    return original.replace(/[0-9a-fA-F]{12,}/g, (s) => `#${shortId(s)}`);
  };

  const enrichList = async (list) => {
    if (!Array.isArray(list)) return list;
    const ids = new Set();
    list.forEach((n) => {
      extractIdsFromText(n.message || "").forEach((i) => ids.add(i));
    });
    await Promise.allSettled(Array.from(ids).map((id) => fetchResourceForId(id)));
    const resourcesById = {};
    Array.from(ids).forEach((id) => {
      if (resourceCacheRef.current.has(id)) resourcesById[id] = resourceCacheRef.current.get(id);
    });
    return list.map((n) => ({ ...n, formattedMessage: buildFormattedMessage(n, resourcesById) }));
  };

  // ---------- load notifications ----------
  const loadNotifications = async () => {
    try {
      const tryUrls = ["/notifications?limit=50", "/api/notifications?limit=50", "/api/notifications", "/notifications"];
      let arr = null;
      for (const u of tryUrls) {
        try {
          const res = await api.get(u);
          const data = res.data;
          if (!data) continue;
          const list = Array.isArray(data.notifications) ? data.notifications : Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : null;
          if (Array.isArray(list)) {
            arr = list;
            console.debug("[loadNotifications] got list from", u, "len=", list.length);
            break;
          }
        } catch (err) {
          // try next
        }
      }
      if (!arr) {
        console.warn("[loadNotifications] no notifications endpoint responded");
        setNotifications([]);
        setUnread(0);
        return;
      }
      const enriched = await enrichList(arr);
      setNotifications(enriched);
      setUnread(enriched.filter((x) => x.status === "unread").length);
    } catch (err) {
      console.error("loadNotifications err", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadNotifications();
    })();
    const id = setInterval(loadNotifications, 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // ---------- click outside to close ----------
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  // ---------- focus + inert + keyboard trap ----------
  useEffect(() => {
    const appRoot = getAppRoot();
    if (open) {
      prevFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      try {
        if (appRoot && "inert" in appRoot) appRoot.inert = true;
        else if (appRoot) appRoot.setAttribute("aria-hidden", "true");
      } catch (e) {
        if (appRoot) appRoot.setAttribute("aria-hidden", "true");
      }
      setTimeout(() => {
        const p = panelRef.current;
        if (!p) return;
        const f = p.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (f && typeof f.focus === "function") f.focus();
        else {
          p.setAttribute("tabindex", "-1");
          p.focus();
        }
      }, 0);

      const onKey = (ev) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          setOpen(false);
          return;
        }
        if (ev.key === "Tab") {
          const p = panelRef.current;
          if (!p) return;
          const nodes = Array.from(p.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((n) => !n.hasAttribute("disabled"));
          if (nodes.length === 0) {
            ev.preventDefault();
            return;
          }
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (ev.shiftKey) {
            if (document.activeElement === first) {
              ev.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              ev.preventDefault();
              first.focus();
            }
          }
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    } else {
      try {
        if (appRoot && "inert" in appRoot) appRoot.inert = false;
        else if (appRoot) appRoot.removeAttribute("aria-hidden");
      } catch (e) {
        if (appRoot) appRoot.removeAttribute("aria-hidden");
      }
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === "function") {
        prevFocusRef.current.focus();
      } else if (bellRef.current && typeof bellRef.current.focus === "function") {
        bellRef.current.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---------- mark single item read (robust) ----------
  const markItemRead = async (id) => {
    // optimistic
    setNotifications((prev) => prev.map((n) => ((n._id === id || n.id === id) ? { ...n, status: "read" } : n)));
    setUnread((u) => Math.max(0, u - 1));

    const candidates = [
      `/notifications/${id}/read`,
      `/api/notifications/${id}/read`,
      `/notifications/read/${id}`,
      `/api/notifications/read/${id}`,
      `/notifications/${id}/mark-read`,
      `/api/notifications/${id}/mark-read`,
      `/notifications/${id}`,
      `/api/notifications/${id}`,
    ];

    let success = false;
    for (const path of candidates) {
      try {
        // try POST then PUT fallback
        try {
          const r = await api.post(path);
          if (r && r.status >= 200 && r.status < 300) {
            success = true;
            break;
          }
        } catch (e) {
          // try put
          try {
            const r2 = await api.put(path);
            if (r2 && r2.status >= 200 && r2.status < 300) {
              success = true;
              break;
            }
          } catch (e2) {
            // continue
          }
        }
      } catch (err) {
        // continue to next path
      }
    }

    if (!success) {
      // rollback by reloading server state
      await loadNotifications();
      console.warn("[markItemRead] failed for", id);
      alert("Failed to mark item read on server. See console/Network for details.");
      return;
    }

    // success -> reload authoritative state
    await loadNotifications();
  };

  // ---------- mark all read (collection-first then per-item fallback) ----------
  const markAllRead = async (e) => {
    e && e.stopPropagation();

    // optimistic UI
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
    setUnread(0);

    // try collection endpoints first
    const collectionCandidates = [
      { url: "/notifications/mark-all-read", method: "post" },
      { url: "/api/notifications/mark-all-read", method: "post" },
      { url: "/notifications/markAllRead", method: "post" },
      { url: "/api/notifications/markAllRead", method: "post" },
      { url: "/notifications/mark-all", method: "post" },
      { url: "/api/notifications/mark-all", method: "post" },
      { url: "/api/notifications", method: "post", payload: { action: "markAllRead" } },
      { url: "/notifications", method: "post", payload: { action: "markAllRead" } },
    ];

    const tryRequest = async (c) => {
      try {
        console.debug("[markAllRead] trying", c.method.toUpperCase(), c.url, c.payload || "");
        if (c.method === "post") return await api.post(c.url, c.payload || {});
        if (c.method === "put") return await api.put(c.url, c.payload || {});
        if (c.method === "get") return await api.get(c.url);
        return null;
      } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        console.warn("[markAllRead] candidate failed", c.url, status, data || err.message);
        return { error: true, status, data };
      }
    };

    for (const c of collectionCandidates) {
      const out = await tryRequest(c);
      if (out && !out.error) {
        await loadNotifications();
        return;
      }
    }

    // collection endpoints didn't exist -> try per-item endpoints for each notification id
    const perItemCandidates = (id) => [
      `/notifications/${id}/read`,
      `/api/notifications/${id}/read`,
      `/notifications/read/${id}`,
      `/api/notifications/read/${id}`,
      `/notifications/${id}/mark-read`,
      `/api/notifications/${id}/mark-read`,
      `/notifications/${id}`,
      `/api/notifications/${id}`,
    ];

    const ids = notifications.map((n) => n._id || n.id).filter(Boolean);
    let anySuccess = false;
    for (const id of ids) {
      for (const path of perItemCandidates(id)) {
        try {
          // try POST
          try {
            const r = await api.post(path);
            if (r && r.status >= 200 && r.status < 300) {
              anySuccess = true;
              break;
            }
          } catch (e) {
            // try put
            try {
              const r2 = await api.put(path);
              if (r2 && r2.status >= 200 && r2.status < 300) {
                anySuccess = true;
                break;
              }
            } catch (e2) {
              // continue
            }
          }
        } catch (err) {
          // continue to next path
        }
      }
    }

    if (anySuccess) {
      await loadNotifications();
      return;
    }

    // all attempts failed -> rollback reload and inform user
    await loadNotifications();
    alert(
      "ไม่สามารถทำเครื่องหมายว่าอ่านทั้งหมดได้ (ไม่มี endpoint ที่คาดไว้บน backend).\n" +
      "กรุณาดู Console/Network เพื่อดูรายละเอียด request แล้วส่งข้อมูลมาที่ผม (Request URL + Response body) เดี๋ยวผมช่วยชี้จุดให้."
    );
  };

  // ---------- click item handler ----------
  const onItemClick = async (n) => {
    try {
      if (n.status === "unread") {
        await markItemRead(n._id || n.id);
      }
      // optionally navigate or open relevant page
    } catch (err) {
      console.error(err);
    }
  };

  const hasNotifications = Array.isArray(notifications) && notifications.length > 0;

  return (
    <div className="np-root-fixed">
      <button
        ref={bellRef}
        className={`np-bell ${open ? "open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          // open + mark all read if unread (UX choice)
          if (!open && unread > 0) {
            setOpen(true);
            setTimeout(() => markAllRead(), 0);
          } else {
            setOpen((v) => !v);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="np-panel-fixed"
        aria-label="Open notifications"
      >
        <span className="np-bell-icon">🔔</span>
        {unread > 0 && (
          <span className="np-dot np-dot-bounce" aria-hidden="true">
            {unread}
          </span>
        )}
      </button>

      {hasNotifications && (
        <div id="np-panel-fixed" ref={panelRef} className={`np-panel-fixed ${open ? "show" : ""}`} role="dialog" aria-modal="true">
          <div className="np-header-fixed">
            <div>
              <div className="np-title-fixed">Notifications</div>
              <div className="np-sub-fixed">{unread} unread</div>
            </div>
            <div className="np-actions-fixed">
              <button className="np-small-fixed" onClick={markAllRead}>Mark all read</button>
              <button className="np-close-fixed" onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-label="Close notifications">&times;</button>
            </div>
          </div>

          <div className="np-list-fixed" role="list">
            {notifications.slice(0, 50).map((n) => (
              <div key={n._id || n.id} role="listitem" className={`np-item-fixed ${n.status === "unread" ? "unread" : ""}`} onClick={() => onItemClick(n)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onItemClick(n); } }}>
                <div className="np-item-ico-fixed" aria-hidden="true">{n.type === "low_stock" ? "⚠" : "🔔"}</div>
                <div className="np-item-body-fixed">
                  <div className="np-msg-fixed">{n.formattedMessage || n.message}</div>
                  <div className="np-meta-fixed">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="np-footer-fixed"><div className="np-note-fixed">Showing latest notifications</div></div>
        </div>
      )}
    </div>
  );
}
