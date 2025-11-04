// src/pages/OwnerPet/OwnerPetDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./OwnerPetDetail.css";

const PetDetail = () => {
  const { id } = useParams();
  const [pet, setPet] = useState(null);

  useEffect(() => {
    const fetchPetDetail = async () => {
      const res = await fetch(`http://localhost:3000/api/pets/${id}`);
      const data = await res.json();
      setPet(data);
    };
    fetchPetDetail();
  }, [id]);

  if (!pet) return <div>Loading...</div>;

  return (
    <div className="pet-detail">
      <div className="pet-info">
        <img src={pet.imageUrl} alt={pet.name} />
        <h2>{pet.name}</h2>
        <p><strong>Breed:</strong> {pet.breed}</p>
        <p><strong>Gender:</strong> {pet.gender}</p>
        <p><strong>Age:</strong> {pet.age} months</p>
        <p><strong>Weight:</strong> {pet.weight} kg</p>
      </div>

      <div className="medical-records">
        <h3>Medical History</h3>
        {pet.records?.length > 0 ? (
          <ul>
            {pet.records.map((record) => (
              <li key={record._id}>
                <span>{record.date}</span> - {record.description}
              </li>
            ))}
          </ul>
        ) : (
          <p>No medical records found.</p>
        )}
      </div>
    </div>
  );
};

export default PetDetail;
