// src/components/MedicalRecordPanel.jsx
import React from "react";
import "./MedicalRecordPanel.css";

const MedicalRecordPanel = ({ pet }) => {
  if (!pet) return <p>No medical records available.</p>;

  const { treatments = [], vaccinations = [], drugAllergies = [] } = pet;

  return (
    <div className="medical-record-panel">
      <h3>Medical Records for {pet.name}</h3>

      {/* Treatments */}
      <section className="treatments-section">
        <h4>Treatments</h4>
        {treatments.length === 0 ? (
          <p>No treatment records.</p>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Branch</th>
                <th>Symptoms</th>
                <th>Diagnosis</th>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {treatments.map(t => (
                <tr key={t._id}>
                  <td>{new Date(t.treatmentDate).toLocaleDateString()}</td>
                  <td>{t.branchId}</td>
                  <td>{t.symptoms}</td>
                  <td>{t.diagnosis}</td>
                  <td>{t.medicineNameSnapshot}</td>
                  <td>{t.quantityUsed}</td>
                  <td>{t.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Vaccinations */}
      <section className="vaccinations-section">
        <h4>Vaccinations</h4>
        {vaccinations.length === 0 ? (
          <p>No vaccination records.</p>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>Date Given</th>
                <th>Next Due Date</th>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Branch</th>
              </tr>
            </thead>
            <tbody>
              {vaccinations.map(v => (
                <tr key={v._id}>
                  <td>{new Date(v.dateGiven).toLocaleDateString()}</td>
                  <td>{v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString() : "-"}</td>
                  <td>{v.medicineNameSnapshot}</td>
                  <td>{v.batch}</td>
                  <td>{v.branchId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Drug Allergies */}
      <section className="allergies-section">
        <h4>Drug Allergies</h4>
        {drugAllergies.length === 0 ? (
          <p>No drug allergies recorded.</p>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Reaction</th>
                <th>Severity</th>
                <th>Note</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {drugAllergies.map(d => (
                <tr key={d._id}>
                  <td>{d.name}</td>
                  <td>{d.reaction}</td>
                  <td>{d.severity}</td>
                  <td>{d.note || "-"}</td>
                  <td>{new Date(d.recordedAt).toLocaleDateString()}</td>
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
