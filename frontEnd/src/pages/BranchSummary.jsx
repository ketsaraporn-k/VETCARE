// src/pages/BranchSummary.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./BranchPages.css";

export default function BranchSummary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);

  // list of branches (for selection if user has none)
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // read current user from localStorage
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const role = (user?.role || "").toLowerCase();
  // tolerant read for branch id (support many shapes)
  const getBranchIdFromUser = (u) => {
    if (!u) return null;
    // possible shapes:
    // user.branchId (string) or user.branchId._id (object)
    // user.branch (string) or user.branch._id
    // user.branchIdId or user.branchIdId?
    const b = u.branchId ?? u.branch ?? u.branch_id ?? u.branchIdId ?? null;
    if (!b) return null;
    if (typeof b === "string") return b;
    if (typeof b === "object") return b._id || b.id || null;
    return null;
  };

  const userBranchId = getBranchIdFromUser(user);

  // effect: if user has branchId, set selectedBranchId; otherwise if branchAdmin, fetch branches for selection
  useEffect(() => {

    if (userBranchId) {
      setSelectedBranchId(String(userBranchId));
    } else if (role === "branchadmin") {
      // fetch branches so branchAdmin can choose (sometimes admin may manage multiple)
      fetchBranches();
    }
    // always attempt to fetch data if we already have selectedBranchId (maybe from previous session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🏥 แปลง branchId -> ชื่อ
  const getBranchNameById = (id) => {
    if (!id) return "N/A";
    const match = branches.find(b => String(b._id) === String(id) || String(b.id) === String(id));
    return match ? (match.branchName || match.name || "N/A") : String(id).slice(0, 8);
  };

  useEffect(() => {
    if (!selectedBranchId) {
      // no selected branch -> don't try fetching branch-specific data
      setOverview(null);
      setTreatments([]);
      setVaccinations([]);
      setLoading(false);
      return;
    }
    fetchBranchData(selectedBranchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  // fetch available branches for selection
  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/branches");
      setBranches(res.data || []);
      // if only one branch returned, preselect it
      if (Array.isArray(res.data) && res.data.length === 1) {
        setSelectedBranchId(String(res.data[0]._id || res.data[0].id));
      }
    } catch (err) {
      console.error("fetchBranches error:", err);
      setError("Failed to load branches for selection.");
    } finally {
      setLoading(false);
    }
  };

  // fetch overview + treatments + vaccinations for a branch
  const fetchBranchData = async (branchId) => {
    setLoading(true);
    setError(null);
    try {
      // try a few likely endpoints; Promise.allSettled so one failure doesn't kill others
      const overviewP = api.get(`/stat/branch/${branchId}`).catch(() => api.get(`/stat/branch?branchId=${branchId}`)).catch(() => api.get(`/stat`));
      const treatmentsP = api.get(`/treatments/branch/${branchId}`).catch(() => api.get(`/treatments?branchId=${branchId}`)).catch(() => api.get(`/treatments`));
      const vaccP = api.get(`/vaccinations/branch/${branchId}`).catch(() => api.get(`/vaccinations?branchId=${branchId}`)).catch(() => api.get(`/vaccinations`));

      const [ovRes, trRes, vRes] = await Promise.allSettled([overviewP, treatmentsP, vaccP]);

      if (ovRes.status === "fulfilled") setOverview(ovRes.value.data);
      else {
        console.warn("overview fetch failed", ovRes.reason);
        setOverview(null);
      }

      if (trRes.status === "fulfilled") setTreatments(Array.isArray(trRes.value.data) ? trRes.value.data : [trRes.value.data]);
      else {
        console.warn("treatments fetch failed", trRes.reason);
        setTreatments([]);
      }

      if (vRes.status === "fulfilled") setVaccinations(Array.isArray(vRes.value.data) ? vRes.value.data : [vRes.value.data]);
      else {
        console.warn("vaccinations fetch failed", vRes.reason);
        setVaccinations([]);
      }

    } catch (err) {
      console.error("fetchBranchData error:", err);
      setError("Failed to load branch data");
    } finally {
      setLoading(false);
    }
  };

  // UI helpers
  const formatCurrency = (n) => {
    if (n == null) return "-";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    } catch {
      return String(n);
    }
  };

  // If no branch assigned to the user
  if (!userBranchId && role !== "branchadmin") {
    // user doesn't have branch and is not branchAdmin -> show message
    return (
      <div className="bp-root">
        <h2>Branch Summary</h2>
        <div className="bp-error">
          Your account has no branch assigned.
          <div style={{ marginTop: 8 }}>
            If you should have access to a branch, please contact your administrator to assign your account to a branch.
          </div>
        </div>
      </div>
    );
  }

  // Render selection UI if user is branchAdmin but has no branch assigned
  return (
    <div className="bp-root">
      <h2>Branch Summary</h2>

      {role === "branchadmin" && !selectedBranchId && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>You don't have a branch selected. Choose a branch to view its summary:</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ padding: 8 }}
            >
              <option value="">-- Select branch --</option>
              {branches.map(b => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.branchName || b.name || (String(b._id || b.id).slice(0, 8))}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                if (!selectedBranchId) return alert("Please select a branch first.");
                fetchBranchData(selectedBranchId);
              }}
              style={{ padding: "8px 12px" }}
            >
              Load Branch
            </button>

            <button
              onClick={() => fetchBranches()}
              style={{ padding: "8px 12px" }}
            >
              Refresh branches
            </button>
          </div>
          <div style={{ marginTop: 8, color: "#6b7280" }}>
            If your branch is not listed, ask a SuperAdmin to assign your account to the correct branch.
          </div>
        </div>
      )}

      {loading && <p>Loading branch data...</p>}
      {error && <div className="bp-error">{error}</div>}

      {!loading && selectedBranchId && (
        <>
          <h3>
            {overview?.branchName || getBranchNameById(selectedBranchId)}
          </h3>

          <div className="bp-cards">
            <div className="bp-card">
              <div className="bp-card-title">Active Patients</div>
              <div className="bp-card-value">{overview?.patients ?? overview?.totalPatients ?? "-"}</div>
            </div>
            <div className="bp-card">
              <div className="bp-card-title">Today Appointments</div>
              <div className="bp-card-value">{overview?.todayAppointments ?? overview?.appointmentsToday ?? "-"}</div>
            </div>
            <div className="bp-card">
              <div className="bp-card-title">Revenue (period)</div>
              <div className="bp-card-value">{overview?.revenue ? formatCurrency(overview.revenue) : "-"}</div>
            </div>
            <div className="bp-card">
              <div className="bp-card-title">Low-stock Items</div>
              <div className="bp-card-value">{overview?.stockLowCount ?? overview?.lowStock ?? "-"}</div>
            </div>
          </div>

          <section className="bp-section">
            <h3>Recent Treatments</h3>
            {treatments.length === 0 ? <p className="bp-muted">No recent treatments</p> :
              <table className="bp-table">
                <thead><tr><th>Pet</th><th>Owner</th><th>Service</th><th>Date</th></tr></thead>
                <tbody>
                  {treatments.slice(0, 10).map((t, i) => (
                    <tr key={t._id || t.id || i}>
                      <td>{t.petName || t.pet || "-"}</td>
                      <td>{t.ownerName || t.owner || "-"}</td>
                      <td>{t.service || t.treatmentType || "-"}</td>
                      <td>{t.date ? new Date(t.date).toLocaleString() : (t.createdAt ? new Date(t.createdAt).toLocaleString() : "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </section>

          <section className="bp-section">
            <h3>Upcoming Vaccinations</h3>
            {vaccinations.length === 0 ? <p className="bp-muted">No upcoming vaccinations</p> :
              <table className="bp-table">
                <thead><tr><th>Pet</th><th>Vaccine</th><th>Owner</th><th>Schedule</th></tr></thead>
                <tbody>
                  {vaccinations.slice(0, 10).map((v, i) => (
                    <tr key={v._id || v.id || i}>
                      <td>{v.petName || v.pet || "-"}</td>
                      <td>{v.vaccine || v.vaccineName || "-"}</td>
                      <td>{v.ownerName || v.owner || "-"}</td>
                      <td>{v.date ? new Date(v.date).toLocaleString() : (v.scheduledAt ? new Date(v.scheduledAt).toLocaleString() : "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </section>
        </>
      )}

      {/* If user has a branch assigned via user data, but selectedBranchId not set yet,
          show a button to load it quickly */}
      {!selectedBranchId && userBranchId && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setSelectedBranchId(String(userBranchId))} style={{ padding: "8px 12px" }}>
            Load My Branch ({String(userBranchId).slice(0, 8)})
          </button>
        </div>
      )}
    </div>
  );
}
