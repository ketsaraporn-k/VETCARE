// src/pages/ConsolidatedView.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./ConsolidatedView.css";

function StatCard({ title, value, hint }) {
  return (
    <div className="cv-card">
      <div className="cv-card-title">{title}</div>
      <div className="cv-card-value">{value}</div>
      {hint && <div className="cv-card-hint">{hint}</div>}
    </div>
  );
}

export default function ConsolidatedView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // consolidated data
  const [overview, setOverview] = useState(null); // from /api/stat/overview or /api/stat
  const [reports, setReports] = useState([]); // from /api/report/consolidated or similar
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // try three endpoints that are commonly used in your backend
        const [statRes, reportRes, branchRes] = await Promise.allSettled([
          api.get("/stat/overview").catch(() => api.get("/stat")), // try both
          api.get("/report/consolidated").catch(() => api.get("/report")),
          api.get("/branches"),
        ]);

        if (!mounted) return;

        // overview
        if (statRes.status === "fulfilled") {
          setOverview(statRes.value.data);
        } else {
          setOverview(null);
          console.warn("stat fetch failed:", statRes.reason);
        }

        // reports
        if (reportRes.status === "fulfilled") {
          // ensure array
          setReports(Array.isArray(reportRes.value.data) ? reportRes.value.data : [reportRes.value.data]);
        } else {
          setReports([]);
          console.warn("report fetch failed:", reportRes.reason);
        }

        // branches
        if (branchRes.status === "fulfilled") {
          setBranches(branchRes.value.data || []);
        } else {
          setBranches([]);
          console.warn("branches fetch failed:", branchRes.reason);
        }
      } catch (err) {
        console.error("fetchAll error:", err);
        setError(err.message || "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => { mounted = false; };
  }, []);

  const renderOverviewCards = () => {
    // overview may look like:
    // { totalUsers: 10, totalBranches: 3, totalPatients: 123, totalRevenue: 12345 }
    const ov = overview || {};
    return (
      <div className="cv-cards">
        <StatCard title="Branches" value={ov.totalBranches ?? branches.length ?? "—"} hint={`${branches.length ?? 0} loaded`} />
        <StatCard title="Total Patients" value={ov.totalPatients ?? ov.patients ?? "—"} />
        <StatCard title="Active Users" value={ov.totalUsers ?? ov.users ?? "—"} />
        <StatCard title="Revenue (24h)" value={ov.totalRevenue ? formatCurrency(ov.totalRevenue) : (ov.revenue ? formatCurrency(ov.revenue) : "—")} />
      </div>
    );
  };

  const formatCurrency = (n) => {
    if (n == null) return "—";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    } catch {
      return String(n);
    }
  };

  return (
    <div className="cv-root">
      <h1>View Consolidated Data</h1>

      {loading && <div className="cv-loading">Loading consolidated data…</div>}
      {error && <div className="cv-error">Error: {error}</div>}

      {!loading && !error && (
        <>
          {renderOverviewCards()}

          <section className="cv-section">
            <h2>Recent Consolidated Reports</h2>
            {reports.length === 0 ? (
              <p className="cv-muted">No consolidated reports found.</p>
            ) : (
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Type</th>
                    <th>Scope</th>
                    <th>Value / Note</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={r.id || r._id || i}>
                      <td>{r.title || r.name || `Report ${i+1}`}</td>
                      <td>{r.type || "summary"}</td>
                      <td>{r.scope || (r.branchId ? `Branch ${String(r.branchId).slice(0,8)}` : "All")}</td>
                      <td>{r.value ?? r.note ?? JSON.stringify(r.summary || r.data || {})}</td>
                      <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="cv-section">
            <h2>Branches Loaded</h2>
            {branches.length === 0 ? (
              <p className="cv-muted">No branch data loaded.</p>
            ) : (
              <div className="cv-branches">
                {branches.map(b => (
                  <div key={b._id || b.id} className="cv-branch">
                    <div className="branch-title">{b.branchName || b.name || String(b._id || b.id).slice(0,8)}</div>
                    <div className="branch-meta">ID: {(b._id || b.id) ? String(b._id || b.id).slice(0,10) : "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
