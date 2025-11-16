// src/pages/OwnerPetDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "./OwnerPetDetail.css";

const OwnerPetDetail = () => {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/pets/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setPet(res.data))
      .catch((err) => console.error("Error fetching pet detail:", err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading pet details...</p>;
  if (!pet) return <p>Pet not found.</p>;

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : "-";

  return (
    <div className="pet-detail-container">
      <h2>Pet Detail: {pet.name}</h2>
      <img
        src={pet.profilePicture?.url || "/images/default-pet.png"}
        alt={pet.name}
        className="pet-avatar"
      />

      <section>
        <h3>Basic Info</h3>
        <table className="info-table">
          <tbody>
            <tr><td>Species</td><td>{pet.species}</td></tr>
            <tr><td>Breed</td><td>{pet.breed}</td></tr>
            <tr><td>Sex</td><td>{pet.sex}</td></tr>
            <tr><td>Age</td><td>{pet.age}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3>Treatments</h3>
        {pet.treatments.length === 0 ? (
          <p>No treatment records.</p>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Symptoms</th>
                <th>Diagnosis</th>
                <th>Medicine</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {pet.treatments.map((t) => (
                <tr key={t._id}>
                  <td>{formatDate(t.treatmentDate)}</td>
                  <td>{t.symptoms}</td>
                  <td>{t.diagnosis}</td>
                  <td>{t.medicineNameSnapshot}</td>
                  <td>{t.quantityUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Vaccinations</h3>
        {pet.vaccinations.length === 0 ? (
          <p>No vaccination records.</p>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>Vaccine</th>
                <th>Dose</th>
                <th>Date Given</th>
                <th>Next Due</th>
                <th>Batch</th>
              </tr>
            </thead>
            <tbody>
              {pet.vaccinations.map((v) => (
                <tr key={v._id}>
                  <td>{v.medicineNameSnapshot}</td>
                  <td>{v.doseQty}</td>
                  <td>{formatDate(v.dateGiven)}</td>
                  <td>{formatDate(v.nextDueDate)}</td>
                  <td>{v.batch || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Drug Allergies</h3>
        {pet.drugAllergies.length === 0 ? (
          <p>No drug allergy records.</p>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>Drug</th>
                <th>Reaction</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {pet.drugAllergies.map((a) => (
                <tr key={a._id}>
                  <td>{a.name}</td>
                  <td>{a.reaction}</td>
                  <td>{a.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Link to="/pets" className="btn-back">← Back to Pets</Link>
    </div>
  );
};

export default OwnerPetDetail;
