// src/pages/PetDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import PetInfoCard from "../components/PetInfoCard";
import MedicalRecordPanel from "../components/MedicalRecordPanel";
import "./PetDetail.css";

const PetDetail = () => {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const fetchPet = async () => {
      try {
        // ใช้ api (axios instance) ที่มี baseURL และ token interceptor แล้ว
        const [petRes, apptRes] = await Promise.all([
          api.get(`/pets/${id}`),
          api.get(`/appointments/pet/${id}`) // ถ้า backend route ต่างกัน ให้ปรับเป็น /appointments?petId=... หรือ route ที่คุณมี
        ]);

        if (!mounted) return;
        setPet(petRes.data);
        setAppointments(apptRes.data || []);
      } catch (err) {
        console.error("Error loading pet detail:", err);
        // ถ้า 404 หรือ ไม่มีข้อมูล ให้ตั้ง pet = null (จะโชว์ Pet not found)
        if (err.response?.status === 404) {
          setPet(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPet();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <p>Loading pet details...</p>;
  if (!pet) return <p>Pet not found.</p>;

  return (
    <div className="pet-detail-page">
      <div className="pet-detail-top">
        <Link to="/pets" className="btn-back">← Back to Pets</Link>
        <PetInfoCard pet={pet} />
      </div>

      <div className="pet-detail-sections">
        <section className="records-section">
          <MedicalRecordPanel petId={id} />
        </section>

        <section className="appointments-section">
          <h3>Appointments for {pet.name}</h3>
          {appointments.length === 0 ? (
            <p>No appointments scheduled.</p>
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Purpose</th>
                  <th>Doctor</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a._id || a.id}>
                    <td>{new Date(a.date).toLocaleDateString()}</td>
                    <td>{new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{a.purpose}</td>
                    <td>{a.doctor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

export default PetDetail;
