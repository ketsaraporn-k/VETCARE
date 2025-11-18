import React, { useEffect, useState } from "react";
import api from "../../api/axiosConfig";
import "./InventoryUpdate.css";

const PAGE_SIZE = 15;
const DEFAULT_REORDER_QTY = 10; // fixed as requested

export default function AdminInventoryUpdate() {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
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

  const [showCreate, setShowCreate] = useState(false);
  const [newMed, setNewMed] = useState({
    medicineName: "",
    sku: "",
    stock: 0,
    unit: "pcs",
    manufacturer: "",
    category: ""
  });

  // detect current user from localStorage (used for branch restrictions)
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const currentUser = stored ? JSON.parse(stored) : null;
  const isSuper = (currentUser?.role || "").toString().toLowerCase() === "superadmin";

  useEffect(() => {
    // load branches if super, and load medicines
    (async () => {
      if (isSuper) {
        await loadBranches();
      }
      await loadPage(1);
    })();
    // eslint-disable-next-line
  }, [selectedBranchId]);

  useEffect(() => {
    // when filters change, reload page 1
    const t = setTimeout(() => loadPage(1), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q, sortBy, sortDir, filterLow]);

  // load branches (for super admin branch selector)
  const loadBranches = async () => {
    try {
      const tryUrls = ["/api/branches", "/branches", "/api/branches/all"];
      let res = null;
      for (const u of tryUrls) {
        try { res = await api.get(u); break; } catch (e) {}
      }
      const list = res?.data && Array.isArray(res.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setBranches(list || []);
      if (!selectedBranchId && (list || []).length) {
        setSelectedBranchId(String(list[0]._id || list[0].id));
      }
    } catch (err) {
      console.warn("loadBranches err", err);
      setBranches([]);
    }
  };

  // load medicines: backend returns branches with medicines; adaptively pick branch
  const loadPage = async (p = 1) => {
    setLoading(true);
    try {
      // GET /api/medicines (backend returns branch array)
      const tryUrls = ["/api/medicines", "/medicines"];
      let res = null;
      for (const u of tryUrls) {
        try { res = await api.get(u); break; } catch (e) {}
      }
      if (!res) throw new Error("No medicines endpoint");

      const payload = res.data;

      // payload is either: array of branches (super) or [branch] for non-super
      let branchList = Array.isArray(payload) ? payload : (payload && payload.branches ? payload.branches : []);

      if (!Array.isArray(branchList) || branchList.length === 0) {
        // maybe payload is an object for single branch
        if (payload && payload.medicines && payload.branchName) {
          branchList = [payload];
        } else {
          branchList = [];
        }
      }

      // determine branch to show:
      let branchToShow = null;
      if (isSuper) {
        branchToShow = branchList.find(b => String(b._id || b.id) === String(selectedBranchId)) || branchList[0] || null;
      } else {
        // non-super should get only user's branch (server usually returns that)
        branchToShow = branchList[0] || null;
      }

      const meds = (branchToShow && Array.isArray(branchToShow.medicines)) ? branchToShow.medicines.map(m => ({
        ...m,
        _branchId: branchToShow._id || branchToShow.id,
        branchName: branchToShow.branchName || branchToShow.name || ""
      })) : [];

      // apply client-side search / filter / sort / pagination
      let filtered = meds;
      if (q && q.trim()) {
        const qq = q.trim().toLowerCase();
        filtered = filtered.filter(m =>
          (m.medicineName || m.name || "").toString().toLowerCase().includes(qq) ||
          (m.sku || "").toString().toLowerCase().includes(qq) ||
          (m.manufacturer || "").toString().toLowerCase().includes(qq)
        );
      }
      if (filterLow) {
        filtered = filtered.filter(m => Number(m.stock || m.quantity || 0) <= (m.lowStockThreshold ?? DEFAULT_REORDER_QTY));
      }

      // sort
      filtered.sort((a,b) => {
        const keyA = (sortBy === "name" ? (a.medicineName || a.name || "") : (sortBy === "quantity" ? Number(a.stock ?? a.quantity ?? 0) : new Date(a.updatedAt || a.createdAt || 0))).toString();
        const keyB = (sortBy === "name" ? (b.medicineName || b.name || "") : (sortBy === "quantity" ? Number(b.stock ?? b.quantity ?? 0) : new Date(b.updatedAt || b.createdAt || 0))).toString();
        if (sortDir === "asc") return (keyA > keyB) ? 1 : (keyA < keyB) ? -1 : 0;
        return (keyA < keyB) ? 1 : (keyA > keyB) ? -1 : 0;
      });

      const totalCount = filtered.length;
      const start = (p - 1) * PAGE_SIZE;
      const pageItems = filtered.slice(start, start + PAGE_SIZE);

      setItems(pageItems);
      setTotal(totalCount);
      setPage(p);
      setSelected(new Set());
    } catch (err) {
      console.error("loadPage err", err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // selection helpers
  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };
  const selectAllOnPage = () => setSelected(new Set(items.map(it => it._id || it.id)));
  const clearSelection = () => setSelected(new Set());

  // inline update stock
  const inlineUpdate = async (id, payload) => {
    if (!window.confirm("ยืนยันการบันทึกการเปลี่ยนแปลง?")) return;
    try {
      // need branchId + medId per backend route
      const med = items.find(it => (it._id || it.id) === id);
      if (!med) throw new Error("Medicine not found on page");
      const branchId = med._branchId;
      const tryUrls = [`/api/medicines/${branchId}/${id}`, `/medicines/${branchId}/${id}`];
      let res = null;
      for (const u of tryUrls) {
        try { res = await api.put(u, payload); break; } catch (e) {}
      }
      setToast({ type: "success", text: "บันทึกเรียบร้อย" });
      await loadPage(page);
    } catch (err) {
      console.error("inlineUpdate err", err);
      setToast({ type: "error", text: "บันทึกล้มเหลว" });
    }
  };

  // bulk apply
  const applyBulk = async () => {
    if (selected.size === 0) return alert("เลือกรายการก่อน");
    if (!window.confirm(`Apply change ${bulkValue} to ${selected.size} items?`)) return;
    try {
      // we must call per-med endpoint because backend stores meds inside branches
      const ids = Array.from(selected);
      for (const id of ids) {
        const med = items.concat([]).find(it => (it._id || it.id) === id);
        if (!med) continue;
        const branchId = med._branchId;
        await api.put(`/api/medicines/${branchId}/${id}`, { change: Number(bulkValue) }).catch(() => api.put(`/medicines/${branchId}/${id}`, { change: Number(bulkValue) }));
      }
      setToast({ type: "success", text: "Applied" });
      await loadPage(page);
    } catch (err) {
      console.error("applyBulk err", err);
      setToast({ type: "error", text: "Bulk update failed" });
    }
  };

  // delete selected
  const deleteSelected = async () => {
    if (selected.size === 0) return alert("เลือกรายการก่อน");
    if (!window.confirm(`ลบ ${selected.size} รายการ?`)) return;
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        const med = items.concat([]).find(it => (it._id || it.id) === id);
        if (!med) continue;
        const branchId = med._branchId;
        await api.delete(`/api/medicines/${branchId}/${id}`).catch(() => api.delete(`/medicines/${branchId}/${id}`));
      }
      setToast({ type: "success", text: "Deleted" });
      await loadPage(page);
    } catch (err) {
      console.error("deleteSelected err", err);
      setToast({ type: "error", text: "Delete failed" });
    }
  };

  // open history
  const openHistory = async (id) => {
    try {
      const med = items.concat([]).find(it => (it._id || it.id) === id);
      if (!med) return;
      const branchId = med._branchId;
      const res = await api.get(`/api/medicines/${branchId}/${id}/history`).catch(() => api.get(`/medicines/${branchId}/${id}/history`));
      setHistoryItem({ id, data: res.data || [] });
    } catch (err) {
      console.error("openHistory err", err);
      setToast({ type: "error", text: "Load history failed" });
    }
  };

  // create medicine (Thai labels in modal)
  const doCreateMedicine = async (e) => {
    e && e.preventDefault();
    try {
      // branchId: for super, use selectedBranchId, for others use user's branch
      const branchId = isSuper ? selectedBranchId : (currentUser?.branchId || currentUser?.branch);
      if (!branchId) {
        return alert("ไม่พบสาขาที่จะเพิ่ม กรุณาเลือกสาขาหรือเช็คข้อมูลผู้ใช้");
      }
      const payload = {
        medicineName: newMed.medicineName,
        sku: newMed.sku,
        stock: Number(newMed.stock || 0),
        unit: newMed.unit || "pcs",
        lowStockThreshold: DEFAULT_REORDER_QTY, // fixed
        manufacturer: newMed.manufacturer || null,
        category: newMed.category || null,
        branchId // include for backend when user is super
      };
      const tryUrls = [`/api/medicines`, `/medicines`];
      let res = null;
      for (const u of tryUrls) {
        try { res = await api.post(u, payload); break; } catch (err) {}
      }
      if (!res) throw new Error("Create medicine failed");
      setToast({ type: "success", text: "สร้างยาเรียบร้อย" });
      setShowCreate(false);
      setNewMed({ medicineName: "", sku: "", stock: 0, unit: "pcs", manufacturer: "", category: "" });
      await loadPage(1);
    } catch (err) {
      console.error("create medicine err", err);
      setToast({ type: "error", text: "Create failed" });
    }
  };

  // small helpers
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const totalPages = Math.max(1, Math.ceil((total || items.length || 0) / PAGE_SIZE));

  return (
    <div className="aiu-page">
      <h2 className="aiu-title">Admin — Inventory Update</h2>

      <div className="aiu-controls">
        <div className="aiu-left">
          <div className="aiu-branch-row">
            {isSuper ? (
              <>
                <label>สาขา:</label>
                <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
                  <option value="">— เลือกสาขา —</option>
                  {branches.map(b => <option key={b._id || b.id} value={b._id || b.id}>{b.branchName || b.name}</option>)}
                </select>
              </>
            ) : (
              <div className="aiu-branch-fixed">สาขา: {currentUser?.branchName || currentUser?.branch || "-"}</div>
            )}
          </div>

          <input
            className="aiu-search"
            placeholder="ค้นหา ชื่อยา / SKU / ผู้ผลิต ..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        <div className="aiu-right">
          <div className="aiu-sort">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="quantity">Sort: Quantity</option>
              <option value="updatedAt">Sort: Updated</option>
            </select>
            <select value={sortDir} onChange={e => setSortDir(e.target.value)}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>

            <label className="aiu-low" title="Show only low stock">
              <input type="checkbox" checked={filterLow} onChange={e => setFilterLow(e.target.checked)} />
              <span>Low stock only</span>
            </label>
          </div>

          <div className="aiu-actions">
            <div className="aiu-select-actions">
              <button onClick={selectAllOnPage}>Select page</button>
              <button onClick={clearSelection}>Clear</button>
              <span className="aiu-selected">Selected: {selected.size}</span>
            </div>

            <div className="aiu-bulk">
              <span>Bulk change by</span>
              <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
              <button onClick={applyBulk}>Apply</button>
              <button onClick={deleteSelected} className="aiu-delete">Delete selected</button>
              <button className="btn-add" onClick={() => setShowCreate(true)}>+ เพิ่มยา</button>
            </div>
          </div>
        </div>
      </div>

      <div className="aiu-card">
        <table className="aiu-table">
          <thead>
            <tr>
              <th></th>
              <th>ชื่อ/รหัส</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>จุดสั่ง</th>
              <th>สถานะ</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="aiu-loading">Loading...</td></tr>
            ) : (!items || items.length === 0) ? (
              <tr><td colSpan={7} className="aiu-empty">No items</td></tr>
            ) : (
              items.map(it => {
                const qty = Number(it.stock ?? it.quantity ?? 0);
                const isLow = qty <= (it.lowStockThreshold ?? DEFAULT_REORDER_QTY);
                return (
                  <tr key={it._id || it.id}>
                    <td><input type="checkbox" checked={selected.has(it._id || it.id)} onChange={() => toggleSelect(it._id || it.id)} /></td>

                    <td className="aiu-name">
                      <div className="aiu-name-main">{it.medicineName || it.name || it.sku}</div>
                      <div className="aiu-name-sub">{it.sku || ""}</div>
                    </td>

                    <td>
                      <input
                        type="number"
                        defaultValue={qty}
                        className="aiu-input-num"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (isNaN(v)) return;
                          inlineUpdate(it._id || it.id, { setQuantity: v });
                        }}
                      />
                    </td>

                    <td>{it.unit || "-"}</td>

                    <td>{it.lowStockThreshold ?? DEFAULT_REORDER_QTY}</td>

                    <td>{isLow ? <span className="aiu-low-badge">Low</span> : <span className="aiu-ok-badge">OK</span>}</td>

                    <td className="aiu-actions-col">
                      <button onClick={() => {
                        const v = Number(prompt("Adjust by (positive add, negative reduce)", "0"));
                        if (v === null) return;
                        if (!confirm(`Apply change ${v} to ${it.medicineName || it.name}?`)) return;
                        inlineUpdate(it._id || it.id, { change: Number(v) });
                      }}>+/-</button>

                      <button onClick={() => openHistory(it._id || it.id)}>History</button>

                      <button disabled title="Restock fixed" className="aiu-disabled">Set Restock</button>

                      <button onClick={async () => {
                        if (!confirm("Delete this medicine?")) return;
                        try {
                          await api.delete(`/api/medicines/${it._branchId}/${(it._id || it.id)}`).catch(() => api.delete(`/medicines/${it._branchId}/${(it._id || it.id)}`));
                          setToast({ type: "success", text: "Deleted" });
                          await loadPage(page);
                        } catch (err) {
                          console.error(err);
                          setToast({ type: "error", text: "Delete failed" });
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
                    <strong>{h.action}</strong> — by {h.byName || h.by || h.byId} at {h.at ? new Date(h.at).toLocaleString() : '-'}
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

      {/* Create modal (thai labels) */}
      {showCreate && (
        <div className="aiu-modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="aiu-modal" onClick={(e) => e.stopPropagation()} onSubmit={doCreateMedicine}>
            <h3>เพิ่มยาใหม่</h3>

            <label>ชื่อยา</label>
            <input value={newMed.medicineName} required onChange={e => setNewMed(prev => ({ ...prev, medicineName: e.target.value }))} />

            <label>รหัส (SKU)</label>
            <input value={newMed.sku} onChange={e => setNewMed(prev => ({ ...prev, sku: e.target.value }))} />

            <label>จำนวนเริ่มต้น</label>
            <input type="number" value={newMed.stock} onChange={e => setNewMed(prev => ({ ...prev, stock: e.target.value }))} />

            <label>หน่วย</label>
            <select value={newMed.unit} onChange={e => setNewMed(prev => ({ ...prev, unit: e.target.value }))}>
              <option value="pcs">pcs</option>
              <option value="box">box</option>
              <option value="bottle">bottle</option>
              <option value="ml">ml</option>
            </select>

            <label>ผู้ผลิต</label>
            <input value={newMed.manufacturer} onChange={e => setNewMed(prev => ({ ...prev, manufacturer: e.target.value }))} />

            <label>หมวดหมู่</label>
            <select value={newMed.category} onChange={e => setNewMed(prev => ({ ...prev, category: e.target.value }))}>
              <option value="">— none —</option>
              <option value="antibiotic">Antibiotic</option>
              <option value="vaccine">Vaccine</option>
              <option value="supplement">Supplement</option>
              <option value="other">Other</option>
            </select>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowCreate(false)} className="btn ghost">ปิด</button>
              <button type="submit" className="btn">สร้าง</button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className={`aiu-toast ${toast.type === "error" ? "error" : "ok"}`}>{toast.text}</div>
      )}
    </div>
  );
}
