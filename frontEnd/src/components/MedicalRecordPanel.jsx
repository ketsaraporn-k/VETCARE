// src/components/MedicalRecordPanel.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import "./MedicalRecordPanel.css";

const MedicalRecordPanel = ({ petId }) => {
  const [treatments, setTreatments] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!petId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // staff endpoints (mounted at /api/staff)
        const [tRes, vRes] = await Promise.allSettled([
          api.get(`/staff/treatments/${petId}`),
          api.get(`/staff/vaccinations/${petId}`)
        ]);

        if (!cancelled) {
          if (tRes.status === "fulfilled") setTreatments(tRes.value.data || []);
          if (vRes.status === "fulfilled") setVaccinations(vRes.value.data || []);
        }
      } catch (err) {
        console.error("Error fetching medical records:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [petId]);

  if (!petId) return <p>No pet selected.</p>;
  if (loading) return <p>Loading medical records...</p>;

  return (
    <div className="record-panel">
      <h3>Medical History</h3>

      <section>
        <h4>Treatments</h4>
        {treatments.length === 0 ? <p className="no-records">No treatment records.</p> : (
          <table className="record-table">
            <thead>
              <tr><th>Date</th><th>Diagnosis</th><th>Treatment</th><th>Staff</th></tr>
            </thead>
            <tbody>
              {treatments.map((t) => (
                <tr key={t._id || t.id || Math.random()}>
                  <td>{t.treatmentDate ? new Date(t.treatmentDate).toLocaleString() : (t.date || "—")}</td>
                  <td>{t.diagnosis || t.symptoms || "—"}</td>
                  <td>{t.notes || t.prescription || t.medicineNameSnapshot || "—"}</td>
                  <td>{(t.staffId && (t.staffId.name || t.staffId)) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h4>Vaccinations</h4>
        {vaccinations.length === 0 ? <p className="no-records">No vaccination records.</p> : (
          <table className="record-table">
            <thead>
              <tr><th>Date</th><th>Vaccine</th><th>Dose</th><th>Next Due</th></tr>
            </thead>
            <tbody>
              {vaccinations.map((v) => (
                <tr key={v._id || v.id || Math.random()}>
                  <td>{v.dateGiven ? new Date(v.dateGiven).toLocaleString() : (v.date || "—")}</td>
                  <td>{v.medicineNameSnapshot || v.vaccineName || v.vaccineType || "—"}</td>
                  <td>{v.doseQty || v.dose || "—"}</td>
                  <td>{v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default MedicalRecordPanel;
