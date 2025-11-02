import React from "react";
import "./PetInfoCard.css";

const PetInfoCard = ({ pet }) => {
  if (!pet) return null;

  return (
    <div className="pet-card">
      <img
        src={pet.image || "/images/default-pet.png"}
        alt={pet.name}
        className="pet-card-image"
      />

      <div className="pet-card-info">
        <h2>{pet.name}</h2>
        <p><strong>Species:</strong> {pet.species}</p>
        <p><strong>Breed:</strong> {pet.breed}</p>
        <p><strong>Age:</strong> {pet.age} years</p>
        <p><strong>Owner:</strong> {pet.owner}</p>
      </div>
    </div>
  );
};

export default PetInfoCard;
