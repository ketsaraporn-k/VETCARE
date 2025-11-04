// src/pages/Pets.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./OwnerPets.css";

const Pets = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ เรียก API จาก backend MongoDB
    axios
      .get("http://localhost:3000/api/pets")
      .then((res) => {
        setPets(res.data); // ดึงข้อมูลจาก API
      })
      .catch((err) => {
        console.error("Error fetching pets:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading pets...</p>;

  return (
    <div className="pets-container">
      <h2>All Registered Pets</h2>

      <table className="pets-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Species</th>
            <th>Owner</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {pets.map((pet) => (
            <tr key={pet._id}>
              <td>{pet._id}</td>
              <td>{pet.name}</td>
              <td>{pet.species}</td>
              <td>{pet.ownerName}</td>
              <td>
                <Link to={`/pet-detail/${pet._id}`} className="btn-view">
                  🔍 View Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Pets;
