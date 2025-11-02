// src/pages/CashFlow.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./CashFlow.css";

const CashFlow = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", type: "income", amount: "", note: "" });

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await api.get("/cashflow");
      setEntries(res.data || []);
    } catch (err) {
      console.error("Error fetching cashflow:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post("/cashflow", { ...form, amount: Number(form.amount) });
      setForm({ date: "", type: "income", amount: "", note: "" });
      fetchEntries();
    } catch (err) {
      console.error("Add cashflow failed:", err);
      alert("Failed to add");
    }
  };

  const balance = entries.reduce(
    (sum, i) => (i.type === "income" ? sum + Number(i.amount) : sum - Number(i.amount)),
    0
  );

  if (loading) return <p>Loading cash flow...</p>;

  return (
    <div className="cashflow-page" style={{ padding: 16 }}>
      <h2>Cash Flow</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="balance-card" style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 12 }}>
            <h3>Current Balance</h3>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{balance.toLocaleString()}</p>
          </div>

          <div className="cashflow-list">
            <h3>Entries</h3>
            <table className="cashflow-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Date</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Type</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Amount</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e._id || e.id}>
                    <td style={{ padding: 8 }}>{new Date(e.date).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>{e.type}</td>
                    <td style={{ padding: 8 }}>{Number(e.amount).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ width: 320 }}>
          <div className="add-entry" style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <h3>Add Entry</h3>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Amount"
                required
              />
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Note"
              />
              <div style={{ marginTop: 8 }}>
                <button type="submit">Add</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlow;
