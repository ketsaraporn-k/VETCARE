// src/pages/Inventory.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axiosConfig";
import "./Inventory.css";

const DEFAULT_LOW_STOCK = Number(import.meta.env.VITE_LOW_STOCK_THRESHOLD || 5);

function ensureArray(maybe) {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe;
  if (maybe.data && Array.isArray(maybe.data)) return maybe.data;
  if (maybe.medicines && Array.isArray(maybe.medicines)) return maybe.medicines;
  if (maybe.branch && Array.isArray(maybe.branch.medicines)) return maybe.branch.medicines;
  return [];
}

function parseQuantity(m) {
  if (!m) return 0;
  if (typeof m.stock === "number") return m.stock;
  if (typeof m.quantity === "number") return m.quantity;
  if (typeof m.qty === "number") return m.qty;
  // sometimes inside batches sum is required; try common fields
  return Number(m.stock ?? m.quantity ?? m.qty ?? 0) || 0;
}

function idOf(x) { return x?._id || x?.id || ""; }

export default function Inventory({ branchId: propBranchId = null }) {
  // branchId prop (optional) or ?branchId query param
  const branchIdFromUrl = (() => {
    try {
      return new URLSearchParams(window.location.search).get("branchId");
    } catch {
      return null;
    }
  })();
  const branchId = propBranchId || branchIdFromUrl || null;

  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // get current user (for branch UI behavior)
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const currentUser = stored ? JSON.parse(stored) : null;
  const role = (currentUser?.role || "").toString().toLowerCase();
  const isSuper = role === "superadmin";

  // selected branch for superadmin viewing
  const [selectedBranchId, setSelectedBranchId] = useState(branchId || (isSuper ? "" : (currentUser?.branchId || currentUser?.branch || "")));

  // load branches (for super to choose)
  const loadBranches = async () => {
    try {
      const tryUrls = ["/api/branches", "/branches", "/api/branches/all"];
      let res = null;
      for (const u of tryUrls) {
        try { res = await api.get(u); break; } catch (e) { /* try next */ }
      }
      if (!res) return setBranches([]);
      const data = res.data;
      // normalize: API may return array or { data: [...] }
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setBranches(list);
      // if not set selectedBranchId yet and branches exist, pick first
      if (!selectedBranchId && list.length) setSelectedBranchId(String(list[0]._id || list[0].id));
    } catch (err) {
      console.warn("loadBranches err", err);
      setBranches([]);
    }
  };

  // main fetch: robustly try multiple endpoints and parse many shapes
  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // candidate fetchers (branch-scoped first if branchId present)
      const tryFns = [];

      // if we have a concrete branchId (either from props/current user/selected) try branch-specific endpoints
      const effectiveBranchId = selectedBranchId || branchId || currentUser?.branchId || currentUser?.branch || null;
      if (effectiveBranchId) {
        tryFns.push(() => api.get(`/api/branches/${effectiveBranchId}/medicines`));
        tryFns.push(() => api.get(`/branches/${effectiveBranchId}/medicines`));
        tryFns.push(() => api.get(`/api/branches/${effectiveBranchId}`));
        tryFns.push(() => api.get(`/branches/${effectiveBranchId}`));
        // some backends: /api/medicines?branchId=...
        tryFns.push(() => api.get("/api/medicines", { params: { branchId: effectiveBranchId } }));
        tryFns.push(() => api.get("/medicines", { params: { branchId: effectiveBranchId } }));
      }

      // general endpoints
      tryFns.push(() => api.get("/api/medicines"));
      tryFns.push(() => api.get("/medicines"));
      tryFns.push(() => api.get("/api/medicines/all"));
      tryFns.push(() => api.get("/medicines/all"));
      tryFns.push(() => api.get("/api/branches")); // last resort to flatten medicines from branches

      let res = null;
      for (const fn of tryFns) {
        try {
          res = await fn();
          if (res) break;
        } catch (e) {
          // continue to next endpoint
        }
      }
      if (!res) throw new Error("No medicines endpoint responded");

      const data = res.data;

      // Possible shapes:
      // 1) array of branches -> [{ branchName, medicines: [...] }, ...]
      // 2) single branch object -> { branchName, medicines: [...] }
      // 3) array of medicines -> [{ medicineName, stock, ... }, ...]
      // 4) object { data: [...medicines] } or { medicines: [...] }
      // 5) object { branch: { medicines: [...] }, medicine: {...} } (when single med endpoint)
      let meds = [];

      if (Array.isArray(data)) {
        // could be array of branches or array of medicines.
        // Heuristic: if first item has 'medicines' => branches
        if (data.length && data[0] && (Array.isArray(data[0].medicines) || typeof data[0].branchName !== "undefined")) {
          // flatten medicines across branches (or pick selected branch if present)
          const rows = data;
          if (effectiveBranchId) {
            const found = rows.find(b => String(b._id || b.id) === String(effectiveBranchId));
            meds = found ? (found.medicines || []) : [];
          } else {
            meds = rows.flatMap(b => Array.isArray(b.medicines) ? b.medicines.map(m => ({ ...m, _branchId: b._id || b.id, branchName: b.branchName || b.name })) : []);
          }
        } else {
          // treat as array of medicines
          meds = data;
        }
      } else if (data && Array.isArray(data.medicines)) {
        meds = data.medicines;
        // if it's a branch object, attach branch info
        if (data.branchName || data._id || data.id) {
          meds = meds.map(m => ({ ...m, _branchId: data._id || data.id, branchName: data.branchName || data.name }));
        }
      } else if (data && Array.isArray(data.data)) {
        meds = data.data;
      } else if (data && data.branch && Array.isArray(data.branch.medicines)) {
        meds = data.branch.medicines.map(m => ({ ...m, _branchId: data.branch._id || data.branch.id, branchName: data.branch.branchName || data.branch.name }));
      } else if (data && data.medicine && typeof data.medicine === "object") {
        meds = [data.medicine];
        if (data.branch) meds[0]._branchId = data.branch._id || data.branch.id;
      } else {
        // fallback: try ensureArray
        meds = ensureArray(data);
      }

      // normalize meds to have consistent fields (name, stock, unit, lowStockThreshold, updatedAt)
      const normalized = (Array.isArray(meds) ? meds : []).map(m => ({
        _id: m._id || m.id,
        medicineName: m.medicineName || m.name || m.title || "",
        sku: m.sku || m.code || "",
        stock: parseQuantity(m),
        unit: m.unit || m.u || "pcs",
        lowStockThreshold: Number(m.lowStockThreshold ?? m.min ?? DEFAULT_LOW_STOCK),
        updatedAt: m.updatedAt || m.updatedAtMedicine || m.createdAt || m.createdAtMedicine || null,
        branchName: m.branchName || m.branch || m._branchName || m.branchName || "",
        _branchId: m._branchId || m.branchId || m.branch?._id || m.branch?.id || null,
        raw: m
      }));

      setItems(normalized);
    } catch (err) {
      console.error("Error loading medicines:", err);
      setError(err?.response?.data?.error || err?.message || "Load failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // if super, load branches then items; else just items
    let mounted = true;
    (async () => {
      if (isSuper) {
        await loadBranches();
      }
      if (!mounted) return;
      await fetchItems();
    })();
    const id = setInterval(() => fetchItems(), 60_000);
    return () => { mounted = false; clearInterval(id); };
    // eslint-disable-next-line
  }, [selectedBranchId]);

  const inStockItems = useMemo(() => (items || []).filter(m => Number(m.stock) > 0), [items]);
  const lowItems = useMemo(() => (items || []).filter(m => Number(m.stock) <= (m.lowStockThreshold ?? DEFAULT_LOW_STOCK)), [items]);

  return (
    <div className="inventory-page" style={{ padding: 16 }}>
      <div className="inventory-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Medicine Inventory</h2>

        {isSuper && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 13 }}>Branch:</label>
            <select value={selectedBranchId || ""} onChange={(e) => setSelectedBranchId(e.target.value)}>
              <option value="">— All / select —</option>
              {branches.map(b => <option key={idOf(b)} value={idOf(b)}>{b.branchName || b.name || idOf(b)}</option>)}
            </select>
            <button onClick={() => fetchItems()}>Refresh</button>
          </div>
        )}
      </div>

      {loading && <p style={{ padding: 12 }}>Loading inventory...</p>}
      {error && <div style={{ color: "crimson", padding: 8 }}>Error: {String(error)}</div>}

      {!loading && (
        <>
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            <strong>Total items:</strong> {items.length} • <strong>Low stock:</strong> {lowItems.length}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Name</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Qty</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Unit</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Status</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {inStockItems.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 16, color: "#666" }}>No items in stock</td></tr>
              ) : inStockItems.map(m => {
                const isLow = Number(m.stock) <= (m.lowStockThreshold ?? DEFAULT_LOW_STOCK);
                return (
                  <tr key={m._id || `${m.medicineName}-${m._branchId}`} style={{ borderBottom: "1px solid #fafafa" }}>
                    <td style={{ padding: 8 }}>
                      <div style={{ fontWeight: 600 }}>{m.medicineName || "(unnamed)"}</div>
                      {m.sku ? <div style={{ fontSize: 12, color: "#666" }}>{m.sku}</div> : null}
                    </td>
                    <td style={{ padding: 8 }}>{Number.isFinite(Number(m.stock)) ? m.stock : "-"}</td>
                    <td style={{ padding: 8 }}>{m.unit || "-"}</td>
                    <td style={{ padding: 8 }}>{isLow ? <span style={{ color: "#b45309" }}>⚠ Low</span> : <span style={{ color: "#065f46" }}>OK</span>}</td>
                    <td style={{ padding: 8 }}>{m.updatedAt ? new Date(m.updatedAt).toLocaleString() : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
