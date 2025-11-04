// frontEnd/src/pages/Appointments.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAppt, setNewAppt] = useState({
    petId: "",
    date: "",
    purpose: "",
    doctor: ""
  });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/appointments");
      setAppointments(res.data || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/appointments", newAppt);
      setNewAppt({ petId: "", date: "", purpose: "", doctor: "" });
      fetchAppointments();
    } catch (err) {
      console.error("Create appointment failed:", err);
      alert("Failed to create appointment");
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("ยืนยันยกเลิกนัดใช่หรือไม่?")) return;
    try {
      await api.delete(`/appointments/${id}`);
      fetchAppointments();
    } catch (err) {
      console.error("Cancel failed:", err);
      alert("Failed to cancel");
    }
  };

  if (loading) return <p>Loading appointments...</p>;

  return (
    <div className="appointments-page" style={{ padding: 16 }}>
      <h2>Appointments</h2>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 2 }}>
          <h3>All Appointments</h3>
          {appointments.length === 0 ? (
            <p>No appointments yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Pet</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Date</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Purpose</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Doctor</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a._id || a.id}>
                    <td style={{ padding: 8 }}>{a.pet?.name || a.petId || "—"}</td>
                    <td style={{ padding: 8 }}>{new Date(a.date).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{a.purpose}</td>
                    <td style={{ padding: 8 }}>{a.doctor}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => handleCancel(a._id || a.id)}>Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h3>Schedule New Appointment</h3>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input placeholder="petId" value={newAppt.petId} onChange={(e) => setNewAppt({ ...newAppt, petId: e.target.value })} required />
            <input type="datetime-local" value={newAppt.date} onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })} required />
            <input placeholder="Purpose" value={newAppt.purpose} onChange={(e) => setNewAppt({ ...newAppt, purpose: e.target.value })} required />
            <input placeholder="Doctor" value={newAppt.doctor} onChange={(e) => setNewAppt({ ...newAppt, doctor: e.target.value })} />
            <button type="submit">Create</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
