// src/pages/ConsolidatedCharts.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axiosConfig";
import "./ConsolidatedCharts.css";
import {
  ResponsiveContainer,
  BarChart, Bar,
  ComposedChart,
  CartesianGrid,
  XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area
} from "recharts";

const COLORS = ["#06b6d4", "#7c3aed", "#ef4444", "#f59e0b", "#10b981", "#60a5fa", "#a78bfa"];
const PIE_COLORS = ["#7c3aed","#06b6d4","#f59e0b","#ef4444","#10b981","#60a5fa"];

function ensureArrayFromResponse(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data && Array.isArray(res.data.branches)) return res.data.branches;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}
function SafeNumber(v){ return (v == null || Number.isNaN(Number(v))) ? 0 : Number(v); }
function toDayKey(d) {
  if (!d) return "unknown";
  const dt = (typeof d === "string" || typeof d === "number") ? new Date(d) : (d instanceof Date ? d : null);
  if (!dt || Number.isNaN(dt.getTime())) return String(d).slice(0,10);
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,"0");
  const day = String(dt.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

export default function ConsolidatedCharts(){
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [patientByDay, setPatientByDay] = useState(null);
  const [stockByBranch, setStockByBranch] = useState(null);
  const [categoryShare, setCategoryShare] = useState(null);
  const [userRolesSummary, setUserRolesSummary] = useState(null);
  const [overview, setOverview] = useState({});

  useEffect(() => {
    let mounted = true;

    const branchEndpoints = ["/api/branches","/branches","/api/branches/all","/api/branch/branches"];
    const userEndpoints = ["/api/users","/users","/api/users/all"];
    const appointmentEndpoints = [
      "/api/staff/schedules",
      "/staff/schedules",
      "/api/appointments",
      "/appointments",
      "/appointments/daily",
      "/api/appointments/daily"
    ];

    const tryGet = async (eps, opts) => {
      for (const e of eps) {
        try {
          const res = await api.get(e, opts);
          return { ok: true, res, url: e };
        } catch (err) {
          // try next
        }
      }
      return { ok: false };
    };

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const [bTry, uTry] = await Promise.all([ tryGet(branchEndpoints), tryGet(userEndpoints) ]);

        // branches -> stock & category
        if (bTry.ok && bTry.res) {
          const rawBranches = ensureArrayFromResponse(bTry.res.data);
          const categories = new Set();
          rawBranches.forEach(b => {
            const meds = Array.isArray(b.medicines) ? b.medicines : [];
            meds.forEach(m => categories.add(m.category || "other"));
          });
          const cats = Array.from(categories);
          const table = rawBranches.map(b => {
            const row = { branch: b.branchName || b.name || String(b._id || b.id).slice(0,8) };
            const meds = Array.isArray(b.medicines) ? b.medicines : [];
            if (cats.length > 0 && meds.length > 0) {
              const counts = {};
              meds.forEach(m => {
                const c = m.category || "other";
                counts[c] = (counts[c] || 0) + SafeNumber(m.stock ?? m.quantity ?? m.count ?? 0);
              });
              cats.forEach(c => row[c] = SafeNumber(counts[c] || 0));
            } else {
              row.total = meds.reduce((s,m) => s + SafeNumber(m.stock ?? m.quantity ?? m.count ?? 0), 0);
            }
            return row;
          });
          setStockByBranch(table);
          const catTotals = {};
          table.forEach(r => Object.keys(r).forEach(k => { if (k !== "branch") catTotals[k] = (catTotals[k]||0) + SafeNumber(r[k]); }));
          setCategoryShare(Object.keys(catTotals).map(k => ({ name: k, value: catTotals[k] })));
          setOverview(prev => ({ ...(prev||{}), branches: rawBranches.length }));
        } else {
          setStockByBranch([]);
          setCategoryShare([]);
          setOverview(prev => ({ ...(prev||{}), branches: null }));
        }

        // users -> roles summary
        if (uTry.ok && uTry.res) {
          const rawUsers = ensureArrayFromResponse(uTry.res.data);
          const map = {};
          rawUsers.forEach(u => {
            let role = (u.role || (Array.isArray(u.roles) && u.roles[0]) || "unknown");
            if (typeof role !== "string") role = String(role);
            role = role.toLowerCase();
            map[role] = (map[role] || 0) + 1;
          });
          setUserRolesSummary(Object.keys(map).map(k => ({ name: k, value: map[k] })));
          setOverview(prev => ({ ...(prev||{}), users: rawUsers.length }));
        } else {
          setUserRolesSummary([]);
          setOverview(prev => ({ ...(prev||{}), users: null }));
        }

        // appointments: try candidate endpoints until usable
        let loadedAppointments = false;
        for (const ep of appointmentEndpoints) {
          try {
            const params = (ep.includes("/staff/") ? { all: 1 } : undefined);
            const res = await api.get(ep, { params }).catch(() => null);
            if (!res) continue;
            const raw = ensureArrayFromResponse(res.data);

            // CASE A: aggregated-like array where each item contains date + count (and maybe status)
            const aggregatedLike = Array.isArray(raw) && raw.length > 0 && raw.every(i => (i.date || i.day || i.label) && (typeof i.count === "number" || typeof i.patients === "number" || typeof i.value === "number"));
            if (aggregatedLike) {
              // sum only items flagged as done OR if there's no status property, assume it's already filtered
              const series = raw.map(d => {
                const status = (d.status || "").toString().toLowerCase();
                const count = SafeNumber(d.count ?? d.patients ?? d.value);
                return {
                  date: d.date || d.day || d.label,
                  patients: (status ? (status === "done" ? count : 0) : count)
                };
              }).filter(x => x.patients > 0 || true); // keep series but values may be zero
              setPatientByDay(series);
              setOverview(prev => ({ ...(prev||{}), patients: series.reduce((s,x)=>s+SafeNumber(x.patients),0) }));
              loadedAppointments = true;
              break;
            }

            // CASE B: raw appointment objects -> group by scheduledAt/date but COUNT only those with status === 'done'
            if (Array.isArray(raw) && raw.length > 0) {
              const grouped = {};
              let doneTotal = 0;
              raw.forEach(ap => {
                const status = (ap.status || "").toString().toLowerCase();
                if (status !== "done") return; // <-- important: only count done
                const dt = ap.scheduledAt || ap.date || ap.createdAt || ap.at || ap.time || ap.startTime;
                const key = toDayKey(dt);
                grouped[key] = (grouped[key] || 0) + 1;
                doneTotal++;
              });
              const series = Object.keys(grouped).sort().map(k => ({ date: k, patients: grouped[k] }));
              setPatientByDay(series);
              setOverview(prev => ({ ...(prev||{}), patients: doneTotal }));
              loadedAppointments = true;
              break;
            }

          } catch (err) {
            // try next endpoint
          }
        }

        if (!loadedAppointments) {
          setPatientByDay([]);
          setOverview(prev => ({ ...(prev||{}), patients: null }));
        }

      } catch (err) {
        console.error("ConsolidatedCharts fetch error", err);
        if (mounted) setError(err.message || "Failed to fetch");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => { mounted = false; };
  }, []);

  const stackKeys = useMemo(() => {
    if (!stockByBranch || stockByBranch.length === 0) return [];
    const keys = new Set();
    stockByBranch.forEach(r => Object.keys(r).forEach(k => { if (k !== "branch") keys.add(k); }));
    return Array.from(keys);
  }, [stockByBranch]);

  return (
    <div className="cc-root">
      <h1>Consolidated Dashboard — Real Data (appointments: done)</h1>

      {loading && <div className="cc-loading">Loading consolidated metrics from API...</div>}
      {error && <div className="cc-error">Error: {error}</div>}

      {!loading && !error && (
        <>
          <div className="cc-overview">
            <div className="cv-card"><div className="cv-card-title">Branches</div><div className="cv-card-value">{overview?.branches ?? "—"}</div></div>
            <div className="cv-card"><div className="cv-card-title">Active Users</div><div className="cv-card-value">{overview?.users ?? "—"}</div></div>
            <div className="cv-card"><div className="cv-card-title">Completed Appointments</div><div className="cv-card-value">{overview?.patients ?? "—"}</div></div>
            <div className="cv-card"><div className="cv-card-title">(No revenue)</div><div className="cv-card-value">—</div></div>
          </div>

          <div className="cc-grid">
            <div className="cc-card cc-chart-large">
              <h3>Completed appointments per day</h3>
              {Array.isArray(patientByDay) && patientByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={patientByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="patients" fill={COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: 12, color: "#475569" }}>
                  No completed-appointments data to display. (Check endpoint /api/staff/schedules or /appointments)
                </div>
              )}
            </div>

            <div className="cc-card cc-chart-medium">
              <h3>Stock per Branch (by category)</h3>
              {Array.isArray(stockByBranch) && stockByBranch.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={stockByBranch}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="branch" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {stackKeys.length > 0 ? stackKeys.map((k, idx) => (
                      <Bar key={k} dataKey={k} stackId="a" fill={COLORS[idx % COLORS.length]} />
                    )) : <Area dataKey="total" fill={COLORS[1]} stroke={COLORS[1]} />}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: 12, color: "#475569" }}>
                  No stock-by-branch data. (Check /branches response and ensure branch.medicines exists)
                </div>
              )}
            </div>

            <div className="cc-card cc-chart-pies">
              <h3>Category share</h3>
              {Array.isArray(categoryShare) && categoryShare.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Tooltip />
                    <Pie data={categoryShare} dataKey="value" nameKey="name" outerRadius={80} label>
                      {categoryShare.map((entry, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: 12, color: "#475569" }}>
                  No category data (derived from branch.medicines[].category). Check /branches response.
                </div>
              )}

              <h3 style={{ marginTop: 12 }}>Users by Role</h3>
              {Array.isArray(userRolesSummary) && userRolesSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Tooltip />
                    <Pie data={userRolesSummary} dataKey="value" nameKey="name" innerRadius={30} outerRadius={70} label>
                      {userRolesSummary.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: 12, color: "#475569" }}>
                  No users-by-role data. (Check endpoint /users and ensure each user has a role)
                </div>
              )}
            </div>
          </div>

          <section className="cc-section">
            <h2>Raw Reports / Recent</h2>
            <div className="cc-table-wrap">
              <table className="cc-table">
                <thead><tr><th>Metric</th><th>Value</th><th>Note</th></tr></thead>
                <tbody>
                  <tr><td>Total branches (loaded)</td><td>{overview?.branches ?? "—"}</td><td>From /branches</td></tr>
                  <tr><td>Total users</td><td>{overview?.users ?? "—"}</td><td>From /users</td></tr>
                  <tr><td>Completed appointments</td><td>{overview?.patients ?? "—"}</td><td>Count of appointments with status === 'done'</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
