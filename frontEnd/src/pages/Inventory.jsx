import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axiosConfig";
import "./Inventory.css";

/**
 * Inventory (bell removed)
 * - Notification UI removed per request
 * - Still uses fallback endpoints to fetch medicines
 */

const LOW_STOCK_THRESHOLD = Number(import.meta.env.VITE_LOW_STOCK_THRESHOLD || 5);

function ensureArray(maybe) {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe;
  if (maybe.data && Array.isArray(maybe.data)) return maybe.data;
  if (maybe.medicines && Array.isArray(maybe.medicines)) return maybe.medicines;
  return [];
}

function parseQuantity(m) {
  if (typeof m.quantity === "number") return m.quantity;
  if (m.qty && typeof m.qty === "number") return m.qty;
  return Number(m.quantity || m.qty || 0);
}

export default function Inventory({ branchId: propBranchId = null }) {
  const branchIdFromUrl = (() => {
    try {
      return new URLSearchParams(window.location.search).get("branchId");
    } catch {
      return null;
    }
  })();
  const branchId = propBranchId || branchIdFromUrl || null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // notifications state kept but UI removed (in case used elsewhere)
  const [notifications, setNotifications] = useState([]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const tryFns = [];

      if (branchId) {
        tryFns.push(() => api.get(`/api/branches/${branchId}/medicines`));
        tryFns.push(() => api.get(`/branches/${branchId}/medicines`));
        tryFns.push(() => api.get(`/api/branches/${branchId}`));
        tryFns.push(() => api.get(`/branches/${branchId}`));
      }

      tryFns.push(() => api.get("/api/medicines", { params: { branchId } }));
      tryFns.push(() => api.get("/medicines", { params: { branchId } }));
      tryFns.push(() => api.get("/api/medicines/all"));
      tryFns.push(() => api.get("/medicines/all"));

      let res = null;
      for (const fn of tryFns) {
        try {
          res = await fn();
          if (res) break;
        } catch (e) {
          // try next
        }
      }
      if (!res) throw new Error("No medicines endpoint responded");

      let list = [];
      if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.data?.medicines)) list = res.data.medicines;
      else if (Array.isArray(res.data?.data)) list = res.data.data;
      else if (Array.isArray(res.data?.branch?.medicines)) list = res.data.branch.medicines;
      else list = ensureArray(res.data);

      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading medicines:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const tryUrls = [
        () => api.get("/api/notifications?limit=20"),
        () => api.get("/notifications?limit=20"),
        () => api.get("/api/alerts?limit=20"),
      ];
      let res = null;
      for (const fn of tryUrls) {
        try { res = await fn(); break; } catch (e) {}
      }
      if (!res) { setNotifications([]); return; }
      let list = [];
      if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.data?.notifications)) list = res.data.notifications;
      else if (Array.isArray(res.data?.data)) list = res.data.data;
      else list = ensureArray(res.data);
      setNotifications((list || []).map(n => ({ _id: n._id || n.id, ...n })));
    } catch (err) {
      console.error("Notification fetch error:", err);
      setNotifications([]);
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
    // eslint-disable-next-line
  }, [branchId]);

  const inStockItems = useMemo(() => {
    return (items || []).filter(m => {
      const q = parseQuantity(m);
      return q > 0;
    });
  }, [items]);

  if (loading) return <p style={{ padding: 16 }}>Loading inventory...</p>;

  return (
    <div className="inventory-page" style={{ padding: 16 }}>
      <div className="inventory-header" style={{ position: "relative" }}>
        <h2>Medicine Inventory {branchId ? ` — Branch ${branchId}` : ""}</h2>
        {/* Notification bell intentionally removed as requested */}
      </div>

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
              const q = parseQuantity(m);
              const isLow = q <= LOW_STOCK_THRESHOLD;
              return (
                <tr key={m._id || m.id} data-medicine-id={m._id || m.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    {m.name || m.medicineName || m.title || "(unnamed)"}
                    {isLow && <span className="low-badge" style={{ marginLeft: 8 }}>⚠ Low</span>}
                  </td>
                  <td style={{ padding: 8 }}>{Number.isFinite(q) ? q : "-"}</td>
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
}
