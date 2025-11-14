import React, { useEffect, useState } from "react";
import axios from "axios";
import "./MedicalRecordPanel.css";

const MedicalRecordPanel = ({ petId }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/medical-records/${petId}`)
      .then((res) => {
        setRecords(res.data);
      })
      .catch((err) => console.error("Error fetching medical records:", err))
      .finally(() => setLoading(false));
  }, [petId]);

  if (loading) return <p>Loading medical records...</p>;

  return (
    <div className="record-panel">
      <h3>Medical History</h3>
      {records.length === 0 ? (
        <p className="no-records">No medical records available.</p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Diagnosis</th>
              <th>Treatment</th>
              <th>Doctor</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, index) => (
              <tr key={index}>
                <td>{r.date}</td>
                <td>{r.diagnosis}</td>
                <td>{r.treatment}</td>
                <td>{r.doctor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MedicalRecordPanel;
