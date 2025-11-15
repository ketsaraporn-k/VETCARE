// src/components/PetInfoCard.jsx
import React from "react";
import "./PetInfoCard.css";

const PetInfoCard = ({ pet, owner }) => {
  if (!pet) return null;

  // owner prop can be string or object { id, name, username }
  const ownerName = owner?.name || owner?.username || pet.owner?.name || pet.owner || "—";

  return (
    <div className="pet-card">
      <img
        src={pet.image || "/images/default-pet.png"}
        alt={pet.name}
        className="pet-card-image"
      />

      <div className="pet-card-info">
        <h2>{pet.name}</h2>
        <p><strong>Species:</strong> {pet.species || "—"}</p>
        <p><strong>Breed:</strong> {pet.breed || "—"}</p>
        <p><strong>Age:</strong> {pet.age || "—"}</p>
        <p><strong>Owner:</strong> {ownerName}</p>
      </div>
    </div>
  );
};

export default PetInfoCard;
