// src/pages/OwnerAppointments.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./OwnerAppointments.css";

const OwnerAppointments = () => {
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppts = async () => {
    try {
      const res = await api.get("/owner/appointments");
      setAppts(res.data || []);
    } catch (err) {
      console.error("Error loading appts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppts();
  }, []);

  if (loading) return <p className="appt-loading">Loading appointments...</p>;

  return (
    <div className="appt-container">
      <h2 className="appt-title">📅 My Appointments</h2>

      <table className="appt-table">
        <thead>
          <tr>
            <th>Pet ID</th>
            <th>Date</th>
            <th>Status</th>
            <th>Service</th>
            <th>Branch</th>
          </tr>
        </thead>

        <tbody>
          {appts.length === 0 ? (
            <tr>
              <td colSpan="5" className="appt-empty">
                No appointments yet.
              </td>
            </tr>
          ) : (
            appts.map((a) => (
              <tr key={a._id}>
                <td>{a.petId}</td>
                <td>{a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "—"}</td>
                <td className={`status ${a.status}`}>{a.status}</td>
                <td>{a.serviceType || "—"}</td>
                <td>{a.branchName || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OwnerAppointments;
