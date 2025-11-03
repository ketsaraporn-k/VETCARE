// src/pages/admin/InventoryUpdate.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import "./InventoryUpdate.css";

const PAGE_SIZE = 15;
const LOW_STOCK_THRESHOLD = Number(import.meta.env.VITE_LOW_STOCK_THRESHOLD || 5);

export default function AdminInventoryUpdate() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [filterLow, setFilterLow] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkValue, setBulkValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);

  useEffect(() => {
    loadPage(1);
    // eslint-disable-next-line
  }, [q, sortBy, sortDir, filterLow]);

  const loadPage = async (p = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", PAGE_SIZE);
      qs.set("page", p);
      if (q) qs.set("q", q);
      if (sortBy) qs.set("sortBy", sortBy);
      if (sortDir) qs.set("sortDir", sortDir);
      if (filterLow) qs.set("low", "true");

      const res = await api.get(`/medicines?${qs.toString()}`);
      const data = res.data || {};
      setItems(data.items || data || []);
      setTotal(data.total ?? (Array.isArray(data) ? data.length : 0));
      setPage(p);
      setSelected(new Set());
    } catch (err) {
      console.error("loadPage err", err);
      setItems([]);
      setTotal(0);
      setToast({ type: "error", text: "Load failed" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const selectAllOnPage = () => {
    setSelected(new Set(items.map(it => it._id)));
  };

  const clearSelection = () => setSelected(new Set());

  const inlineUpdate = async (id, payload) => {
    if (!confirm("Confirm save changes?")) return;
    try {
      const res = await api.put(`/medicines/${id}`, payload);
      setItems(prev => prev.map(it => (it._id === id ? (res.data || { ...it, ...payload }) : it)));
      setToast({ type: "success", text: "Saved" });
    } catch (err) {
      console.error("inlineUpdate err", err);
      setToast({ type: "error", text: "Save failed" });
    }
  };

  const applyBulk = async () => {
    if (selected.size === 0) return alert("Select items first");
    if (!confirm(`Apply change ${bulkValue} to ${selected.size} items?`)) return;
    try {
      const ids = Array.from(selected);
      try {
        await api.put("/medicines/bulk", { ids, change: Number(bulkValue) });
      } catch (e) {
        await Promise.all(ids.map(id => api.put(`/medicines/${id}`, { change: Number(bulkValue) })));
      }
      setToast({ type: "success", text: "Bulk update applied" });
      loadPage(page);
    } catch (err) {
      console.error("applyBulk err", err);
      setToast({ type: "error", text: "Bulk update failed" });
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return alert("Select items first");
    if (!confirm(`Delete ${selected.size} medicines? This is permanent.`)) return;
    try {
      const ids = Array.from(selected);
      await api.post("/medicines/bulk-delete", { ids });
      setToast({ type: "success", text: "Deleted" });
      loadPage(page);
    } catch (err) {
      console.error("deleteSelected err", err);
      setToast({ type: "error", text: "Delete failed" });
    }
  };

  const openHistory = async (id) => {
    try {
      const res = await api.get(`/medicines/${id}/history`);
      setHistoryItem({ id, data: res.data || [] });
    } catch (err) {
      console.error("openHistory err", err);
      setToast({ type: "error", text: "Failed to load history" });
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const totalPages = Math.max(1, Math.ceil((total || items.length || 0) / PAGE_SIZE));

  return (
    <div className="aiu-page">
      <h2 className="aiu-title">Admin — Inventory Update</h2>

      <div className="aiu-controls">
        <input className="aiu-search" placeholder="Search name or sku" value={q} onChange={e => setQ(e.target.value)} />

        <div className="aiu-filters">
          <label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="quantity">Sort: Quantity</option>
              <option value="updatedAt">Sort: Updated</option>
            </select>
          </label>

          <label>
            <select value={sortDir} onChange={e => setSortDir(e.target.value)}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>

          <label className="aiu-low">
            <input type="checkbox" checked={filterLow} onChange={e => setFilterLow(e.target.checked)} /> Low stock only
          </label>
        </div>
      </div>

      <div className="aiu-actions">
        <div>
          <button onClick={selectAllOnPage}>Select page</button>
          <button onClick={clearSelection}>Clear</button>
          <span className="aiu-selected">Selected: {selected.size}</span>
        </div>

        <div className="aiu-bulk">
          <span>Bulk change by</span>
          <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
          <button onClick={applyBulk}>Apply</button>
          <button onClick={deleteSelected} className="aiu-delete">Delete selected</button>
        </div>
      </div>

      <div className="aiu-card">
        <table className="aiu-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Reorder</th>
              <th>Low?</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="aiu-loading">Loading...</td></tr>
            ) : (!items || items.length === 0) ? (
              <tr><td colSpan={8} className="aiu-empty">No items</td></tr>
            ) : (
              items.map(it => {
                const isLow = (it.quantity != null) && (it.quantity <= (it.reorderQty ?? LOW_STOCK_THRESHOLD));
                return (
                  <tr key={it._id}>
                    <td><input type="checkbox" checked={selected.has(it._id)} onChange={() => toggleSelect(it._id)} /></td>

                    <td className="aiu-name">
                      <div className="aiu-name-main">{it.name}</div>
                      <div className="aiu-name-sub">{it.sku || ""}</div>
                    </td>

                    <td>
                      <input
                        type="number"
                        defaultValue={it.quantity ?? 0}
                        className="aiu-input-num"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (isNaN(v)) return;
                          inlineUpdate(it._id, { setQuantity: v });
                        }}
                      />
                    </td>

                    <td>{it.unit || "-"}</td>

                    <td>
                      <input
                        defaultValue={it.reorderQty ?? ""}
                        placeholder="reorder"
                        className="aiu-input-small"
                        onBlur={(e) => {
                          const v = Number(e.target.value || 0);
                          inlineUpdate(it._id, { reorderQty: v });
                        }}
                      />
                    </td>

                    <td>{isLow ? <span className="aiu-low-badge">Low</span> : <span className="aiu-ok-badge">OK</span>}</td>

                    <td>{it.updatedAt ? new Date(it.updatedAt).toLocaleString() : "-"}</td>

                    <td className="aiu-actions-col">
                      <button onClick={() => {
                        const v = Number(prompt("Adjust by (positive add, negative reduce)", "0"));
                        if (v === null) return;
                        if (!confirm(`Apply change ${v} to ${it.name}?`)) return;
                        api.put(`/medicines/${it._id}`, { change: Number(v) }).then(() => loadPage(page)).catch(e => {
                          console.error(e); setToast({ type: "error", text: "Failed" });
                        });
                      }}>Adj</button>

                      <button onClick={() => openHistory(it._id)}>History</button>

                      <button onClick={() => {
                        if (!confirm("Mark low-stock alert resolved?")) return;
                        api.put(`/medicines/${it._id}`, { lowStockAlert: false }).then(() => loadPage(page)).catch(e => {
                          console.error(e); setToast({ type: "error", text: "Failed" });
                        });
                      }}>Resolve</button>

                      <button onClick={async () => {
                        if (!confirm("Delete this medicine?")) return;
                        try {
                          await api.delete(`/medicines/${it._id}`);
                          setToast({ type: "success", text: "Deleted" });
                          loadPage(page);
                        } catch (err) {
                          console.error(err); setToast({ type: "error", text: "Delete failed" });
                        }
                      }} className="aiu-delete">Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="aiu-footer">
        <div>Page {page} / {totalPages || 1} • Total: {total}</div>
        <div className="aiu-pager">
          <button onClick={() => loadPage(Math.max(1, page - 1))}>Prev</button>
          <button onClick={() => loadPage(Math.min(totalPages, page + 1))}>Next</button>
        </div>
      </div>

      {historyItem && (
        <div className="aiu-modal-backdrop" onClick={() => setHistoryItem(null)}>
          <div className="aiu-modal" onClick={(e) => e.stopPropagation()}>
            <h3>History for {historyItem.id}</h3>
            {historyItem.data.length === 0 ? <div>No history</div> : (
              <ul>
                {historyItem.data.map((h, idx) => (
                  <li key={idx}>
                    <strong>{h.action}</strong> — by {h.byName || h.by || h.byId} at {new Date(h.at).toLocaleString()}
                    {h.note ? <div style={{ marginLeft: 8 }}>{h.note}</div> : null}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setHistoryItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`aiu-toast ${toast.type === "error" ? "error" : "ok"}`}>{toast.text}</div>
      )}
    </div>
  );
}
