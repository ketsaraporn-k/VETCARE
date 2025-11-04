// src/pages/OwnerPet/OwnerDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerDashboard.css";

const OwnerDashboard = () => {
  const [pets, setPets] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // ดึงข้อมูลสัตว์เลี้ยงของเจ้าของ (mock data / API จริง)
    const fetchPets = async () => {
      const res = await fetch("http://localhost:3000/api/pets/owner");
      const data = await res.json();
      setPets(data);
    };
    fetchPets();
  }, []);

  return (
    <div className="owner-dashboard">
      <h2>My Pets</h2>
      <div className="pet-list">
        {pets.map((pet) => (
          <div
            key={pet._id}
            className="pet-card"
            onClick={() => navigate(`/pets/${pet._id}`)}
          >
            <img src={pet.imageUrl} alt={pet.name} />
            <h3>{pet.name}</h3>
            <p>{pet.breed}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OwnerDashboard;
