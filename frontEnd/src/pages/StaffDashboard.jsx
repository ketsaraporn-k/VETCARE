// src/pages/StaffDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./BranchPages.css";

export default function StaffDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myTasks, setMyTasks] = useState([]); // upcoming appointments / assigned cases
  const [mySchedules, setMySchedules] = useState([]);

  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const role = user?.role;
  const userId = user?.id || user?._id;

  useEffect(() => {
    if (!role || role !== "staff") {
      setError("Access denied — this page is for Staff only.");
      setLoading(false);
      return;
    }
    if (!userId) {
      setError("No user session found.");
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        // try sensible endpoints
        const profileP = api.get(`/users/${userId}`).catch(() => api.get(`/staff/me`));
        const tasksP = api.get(`/appointments?assignedTo=${userId}`).catch(() => api.get(`/tasks?assignedTo=${userId}`)).catch(() => api.get(`/appointments`));
        const schedP = api.get(`/schedules/staff/${userId}`).catch(() => api.get(`/schedules?staffId=${userId}`)).catch(() => api.get(`/schedules`));

        const [pf, tk, sd] = await Promise.allSettled([profileP, tasksP, schedP]);

        if (!mounted) return;

        if (pf.status === "fulfilled") setProfile(pf.value.data);
        else setProfile(null);

        if (tk.status === "fulfilled") setMyTasks(Array.isArray(tk.value.data) ? tk.value.data : [tk.value.data]);
        else setMyTasks([]);

        if (sd.status === "fulfilled") setMySchedules(Array.isArray(sd.value.data) ? sd.value.data : [sd.value.data]);
        else setMySchedules([]);

      } catch (err) {
        console.error("fetchStaff error:", err);
        if (mounted) setError(err.message || "Failed to load staff data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStaff();
    return () => { mounted = false; };
  }, [role, userId]);

  if (loading) return <div className="bp-root"><h2>Staff Dashboard</h2><p>Loading...</p></div>;
  if (error) return <div className="bp-root"><h2>Staff Dashboard</h2><div className="bp-error">{error}</div></div>;

  return (
    <div className="bp-root">
      <h2>Staff Dashboard — {profile?.name || profile?.username || "Staff"}</h2>

      <section className="bp-section">
        <h3>Your Profile</h3>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div>
            <div><strong>Name:</strong> {profile?.name || "-"}</div>
            <div><strong>Username:</strong> {profile?.username || "-"}</div>
            <div><strong>Role:</strong> {profile?.role || "-"}</div>
            <div><strong>Branch:</strong> {profile?.branchId?.branchName || profile?.branchId || "-"}</div>
          </div>
        </div>
      </section>

      <section className="bp-section">
        <h3>Your Upcoming Tasks</h3>
        {myTasks.length === 0 ? <p className="bp-muted">No assigned tasks or appointments.</p> :
          <table className="bp-table">
            <thead><tr><th>Time</th><th>Pet</th><th>Owner</th><th>Service</th></tr></thead>
            <tbody>
              {myTasks.slice(0, 12).map((t, i) => (
                <tr key={t._id || t.id || i}>
                  <td>{t.time || t.date ? new Date(t.time || t.date).toLocaleString() : "-"}</td>
                  <td>{t.petName || t.pet || "-"}</td>
                  <td>{t.ownerName || t.owner || "-"}</td>
                  <td>{t.service || t.type || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </section>

      <section className="bp-section">
        <h3>Your Schedule</h3>
        {mySchedules.length === 0 ? <p className="bp-muted">No schedule found.</p> :
          <table className="bp-table">
            <thead><tr><th>Date</th><th>Shift</th><th>Notes</th></tr></thead>
            <tbody>
              {mySchedules.slice(0, 12).map((s, i) => (
                <tr key={s._id || s.id || i}>
                  <td>{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                  <td>{s.shift || s.slot || "-"}</td>
                  <td>{s.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </section>
    </div>
  );
}
