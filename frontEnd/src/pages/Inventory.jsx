// src/pages/Inventory.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./Inventory.css";

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjust, setAdjust] = useState({ id: "", change: 0 });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory");
      setItems(res.data || []);
    } catch (err) {
      console.error("Error loading inventory:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjust.id) return alert("Please select an item to adjust.");
    try {
      await api.patch(`/inventory/${adjust.id}`, { change: Number(adjust.change) });
      setAdjust({ id: "", change: 0 });
      fetchItems();
    } catch (err) {
      console.error("Adjust failed:", err);
      alert("Failed to update stock");
    }
  };

  if (loading) return <p>Loading inventory...</p>;

  return (
    <div className="inventory-page" style={{ padding: 16 }}>
      <h2>Inventory</h2>

      <table className="inventory-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>SKU</th>
            <th style={{ textAlign: "left", padding: 8 }}>Name</th>
            <th style={{ textAlign: "left", padding: 8 }}>Stock</th>
            <th style={{ textAlign: "left", padding: 8 }}>Location</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it._id || it.id}>
              <td style={{ padding: 8 }}>{it.sku || it._id || it.id}</td>
              <td style={{ padding: 8 }}>{it.name}</td>
              <td style={{ padding: 8 }}>{it.stock}</td>
              <td style={{ padding: 8 }}>{it.location || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inventory-adjust" style={{ marginTop: 16 }}>
        <h3>Adjust Stock</h3>
        <form onSubmit={handleAdjust} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={adjust.id}
            onChange={e => setAdjust({ ...adjust, id: e.target.value })}
            required
          >
            <option value="">-- select item --</option>
            {items.map(it => <option value={it._id || it.id} key={it._id || it.id}>{it.name}</option>)}
          </select>

          <input
            type="number"
            value={adjust.change}
            onChange={e => setAdjust({ ...adjust, change: e.target.value })}
            placeholder="positive to add, negative to reduce"
          />

          <button type="submit">Apply</button>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
