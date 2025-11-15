// src/pages/PetDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import "./StaffPets.css";

import TreatmentHistory from "./TreatmentHistory";
import VaccinationHistory from "./VaccinationHistory";
import { SPECIES_OPTIONS, BREED_OPTIONS } from "../constants/pets";

const StaffPetDetail = ({ user: userFromApp }) => {
  const { ownerId, petId } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    species: "",
    breed: "",
    dob: "",
  });

  const [extraSpecies, setExtraSpecies] = useState([]);
  const [extraBreeds, setExtraBreeds] = useState({}); // { [speciesKey]: [{value,label}] }

  const [showSpeciesList, setShowSpeciesList] = useState(false);
  const [showBreedList, setShowBreedList] = useState(false);

  const user = useMemo(() => {
    if (userFromApp) return userFromApp;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [userFromApp]);

  const canManage =
    !!user &&
    ["staff", "doctor", "branchadmin", "branchadmin", "superadmin", "superadmin"].includes(
      String(user.role || "").toLowerCase()
    );

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("extraSpecies") || "[]");
      const b = JSON.parse(localStorage.getItem("extraBreeds") || "{}");
      if (Array.isArray(s)) setExtraSpecies(s);
      if (b && typeof b === "object") setExtraBreeds(b);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get(`/api/staff/pets/${ownerId}/${petId}`)
      .then((res) => {
        if (!alive) return;
        const data = res.data || {};
        setPet(data);

        const dobRaw = data.birthDate || data.dob || data.age || "";
        setEditForm({
          name: data.name || "",
          species: data.species || "",
          breed: data.breed || "",
          dob: dobRaw ? new Date(dobRaw).toISOString().slice(0, 10) : "",
        });
      })
      .catch((err) => {
        console.error("load pet error:", err);
        if (alive) setPet(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [ownerId, petId]);

  const slug = (str) =>
    String(str || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

  const formatAge = (dobStr) => {
    if (!dobStr) return "-";
    const d = new Date(dobStr);
    if (Number.isNaN(d.getTime())) return dobStr;

    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();

    if (now.getDate() < d.getDate()) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return "-";

    const parts = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months >= 0) parts.push(`${months} เดือน`);
    return parts.join(" ") || "0 เดือน";
  };

  if (loading) return <p className="staffpet-loading">Loading...</p>;
  if (!pet) return <p className="staffpet-loading">Pet not found.</p>;

  // ===== options & autocomplete =====
  const allSpeciesOptions = [...SPECIES_OPTIONS, ...extraSpecies];

  const normalizedSpecies = editForm.species.trim().toLowerCase();
  const foundSpecies = allSpeciesOptions.find(
    (s) =>
      s.value.toLowerCase() === normalizedSpecies ||
      s.label.toLowerCase() === normalizedSpecies
  );
  const speciesKey = foundSpecies
    ? foundSpecies.value
    : normalizedSpecies || "other";

  const baseBreedOptions = [
    ...(BREED_OPTIONS[speciesKey] || []),
    ...((extraBreeds[speciesKey] || [])),
  ];

  const speciesSuggestions =
    normalizedSpecies === ""
      ? allSpeciesOptions
      : allSpeciesOptions.filter((s) =>
          (s.label + s.value).toLowerCase().includes(normalizedSpecies)
        );

  const normalizedBreed = editForm.breed.trim().toLowerCase();
  const breedSuggestions =
    normalizedBreed === ""
      ? baseBreedOptions
      : baseBreedOptions.filter((b) =>
          (b.label + b.value).toLowerCase().includes(normalizedBreed)
        );

  const dobDisplay =
    pet.birthDate || pet.dob || pet.age || editForm.dob || "";

  const handleChange = (field, value) => {
    setEditForm((f) => ({ ...f, [field]: value }));
  };

  const handleCancelEdit = () => {
    if (!pet) return;
    const dobRaw = pet.birthDate || pet.dob || pet.age || "";
    setEditForm({
      name: pet.name || "",
      species: pet.species || "",
      breed: pet.breed || "",
      dob: dobRaw ? new Date(dobRaw).toISOString().slice(0, 10) : "",
    });
    setEditing(false);
    setShowSpeciesList(false);
    setShowBreedList(false);
  };

  const saveExtrasToStorage = (newExtraSpecies, newExtraBreeds) => {
    try {
      localStorage.setItem("extraSpecies", JSON.stringify(newExtraSpecies));
      localStorage.setItem("extraBreeds", JSON.stringify(newExtraBreeds));
    } catch {
      /* ignore */
    }
  };

  const ensureExtraOptions = (
    speciesValue,
    speciesLabel,
    breedValue,
    breedLabel
  ) => {
    const speciesLower = speciesValue.toLowerCase();
    const allSpecies = [...SPECIES_OPTIONS, ...extraSpecies];
    const hasSpecies = allSpecies.some(
      (s) =>
        s.value.toLowerCase() === speciesLower ||
        s.label.toLowerCase() === speciesLabel.toLowerCase()
    );

    let newExtraSpecies = extraSpecies;
    if (!hasSpecies && speciesValue) {
      const newOpt = { value: speciesValue, label: speciesLabel || speciesValue };
      newExtraSpecies = [...extraSpecies, newOpt];
      setExtraSpecies(newExtraSpecies);
    }

    const breedKey = speciesValue || "other";
    const existingBreeds = [
      ...(BREED_OPTIONS[breedKey] || []),
      ...((extraBreeds[breedKey] || [])),
    ];
    const hasBreed = existingBreeds.some(
      (b) =>
        b.value.toLowerCase() === breedValue.toLowerCase() ||
        b.label.toLowerCase() === breedLabel.toLowerCase()
    );

    let newExtraBreeds = extraBreeds;
    if (!hasBreed && breedValue) {
      const newBreedOpt = { value: breedValue, label: breedLabel || breedValue };
      newExtraBreeds = {
        ...extraBreeds,
        [breedKey]: [...((extraBreeds[breedKey] || [])), newBreedOpt],
      };
      setExtraBreeds(newExtraBreeds);
    }

    saveExtrasToStorage(newExtraSpecies, newExtraBreeds);
  };

  const handleSave = async () => {
    try {
      const body = {
        name: editForm.name.trim(),
        species: editForm.species.trim(),
        breed: editForm.breed.trim(),
        age: editForm.dob ? new Date(editForm.dob).toISOString().slice(0, 10) : "",
      };

      const res = await api.put(`/api/staff/pets/${ownerId}/${petId}`, body);
      const updated = res.data || body;

      setPet((prev) => ({
        ...(prev || {}),
        ...updated,
      }));

      const finalSpeciesLabel =
        foundSpecies?.label || editForm.species.trim();
      const finalSpeciesValue = foundSpecies?.value || slug(editForm.species);
      const finalBreedLabel = editForm.breed.trim();
      const finalBreedValue = slug(editForm.breed);

      if (finalSpeciesValue && finalBreedValue) {
        ensureExtraOptions(
          finalSpeciesValue,
          finalSpeciesLabel,
          finalBreedValue,
          finalBreedLabel
        );
      }

      setEditing(false);
      setShowSpeciesList(false);
      setShowBreedList(false);
      alert("Saved pet details");
    } catch (err) {
      console.error("save pet error:", err);
      alert(err.response?.data?.error || "ไม่สามารถบันทึกข้อมูลสัตว์ได้");
    }
  };

  const ageText = formatAge(dobDisplay);

  const branchLabel =
    pet.owner?.branchName ||
    pet.branchName ||
    (pet.owner?.branchId
      ? String(pet.owner.branchId).slice(-5)
      : pet.branchId
      ? String(pet.branchId).slice(-5)
      : "-");

  return (
    <div className="staffpet-detail-page">
      <div className="staffpet-detail-header">
        <Link to="/pets" className="staffpet-back">
          ← Back to Pets
        </Link>
        <div>
          <h1 className="staffpet-detail-title">Pet Detail</h1>
          <p className="staffpet-detail-subtitle">
            Detailed pet medical information
          </p>
        </div>
        {canManage && (
          <button
            className="staffpet-button staffpet-button-primary"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Cancel Edit" : "Edit Pet"}
          </button>
        )}
      </div>

      <div className="staffpet-info-card">
        <div className="staffpet-avatar">
          <span role="img" aria-label="pet">
            🐾
          </span>
        </div>

        {!editing ? (
          <div className="staffpet-info-details">
            <h2 className="staffpet-name">{pet.name}</h2>
            <p>
              <strong>Owner:</strong> {pet.owner?.name || "-"}
            </p>
            <p>
              <strong>Branch:</strong> {branchLabel}
            </p>
            <p>
              <strong>Species:</strong> {pet.species || "-"}
            </p>
            <p>
              <strong>Breed:</strong> {pet.breed || "-"}
            </p>
            <p>
              <strong>Date of Birth:</strong>{" "}
              {dobDisplay ? dobDisplay.toString().slice(0, 10) : "-"}
            </p>
            <p>
              <strong>Age:</strong> {ageText}
            </p>
          </div>
        ) : (
          <div className="staffpet-info-details staffpet-edit-form">
            <div className="staffpet-edit-row">
              <label>
                Name
                <input
                  className="staffpet-input"
                  value={editForm.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </label>
            </div>

            <div className="staffpet-edit-row">
              <label>
                Species
                <div className="staffpet-autocomplete-wrapper">
                  <input
                    className="staffpet-input"
                    value={editForm.species}
                    onChange={(e) => {
                      handleChange("species", e.target.value);
                      setShowSpeciesList(true);
                    }}
                    onFocus={() => setShowSpeciesList(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSpeciesList(false), 150);
                    }}
                    placeholder="Start typing species..."
                  />
                  {showSpeciesList && speciesSuggestions.length > 0 && (
                    <ul className="staffpet-autocomplete-list">
                      {speciesSuggestions.slice(0, 8).map((opt) => (
                        <li
                          key={opt.value}
                          className="staffpet-autocomplete-item"
                          onMouseDown={() => {
                            handleChange("species", opt.label);
                            setShowSpeciesList(false);
                          }}
                        >
                          {opt.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </label>
            </div>

            <div className="staffpet-edit-row">
              <label>
                Breed
                <div className="staffpet-autocomplete-wrapper">
                  <input
                    className="staffpet-input"
                    value={editForm.breed}
                    onChange={(e) => {
                      handleChange("breed", e.target.value);
                      setShowBreedList(true);
                    }}
                    onFocus={() => setShowBreedList(true)}
                    onBlur={() => {
                      setTimeout(() => setShowBreedList(false), 150);
                    }}
                    placeholder="Start typing breed..."
                  />
                  {showBreedList && breedSuggestions.length > 0 && (
                    <ul className="staffpet-autocomplete-list">
                      {breedSuggestions.slice(0, 10).map((opt) => (
                        <li
                          key={opt.value}
                          className="staffpet-autocomplete-item"
                          onMouseDown={() => {
                            handleChange("breed", opt.label);
                            setShowBreedList(false);
                          }}
                        >
                          {opt.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </label>
            </div>

            <div className="staffpet-edit-row">
              <label>
                Date of Birth
                <input
                  type="date"
                  className="staffpet-input"
                  value={editForm.dob}
                  onChange={(e) => handleChange("dob", e.target.value)}
                />
              </label>
            </div>

            <div className="staffpet-edit-actions">
              <button
                type="button"
                className="staffpet-button staffpet-button-ghost"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="staffpet-button staffpet-button-primary"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="staffpet-detail-grid">
        <TreatmentHistory
          ownerId={ownerId}
          petId={petId}
          canManage={canManage}
          user={user}
        />
        <VaccinationHistory
          ownerId={ownerId}
          petId={petId}
          canManage={canManage}
          user={user}
        />
      </div>
    </div>
  );
};

export default StaffPetDetail;
