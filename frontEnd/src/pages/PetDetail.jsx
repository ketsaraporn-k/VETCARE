import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import "../layout/StaffPets.css";

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
    allergies: [], // {name,note}
  });

  const [extraSpecies, setExtraSpecies] = useState([]);
  const [extraBreeds, setExtraBreeds] = useState({});
  const [showSpeciesList, setShowSpeciesList] = useState(false);
  const [showBreedList, setShowBreedList] = useState(false);

  const [branchName, setBranchName] = useState("-");

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
    ["staff", "doctor", "branchadmin", "superadmin"].includes(
      String(user.role || "").toLowerCase()
    );

  // helpers
  const slug = (str) =>
    String(str || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

  const safeDateForInput = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

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

  // extra species/breeds
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("extraSpecies") || "[]");
      const b = JSON.parse(localStorage.getItem("extraBreeds") || "{}");
      if (Array.isArray(s)) setExtraSpecies(s);
      if (b && typeof b === "object") setExtraBreeds(b);
    } catch {
      //
    }
  }, []);

  // load pet
  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get(`/api/staff/pets/${ownerId}/${petId}`)
      .then(async (res) => {
        if (!alive) return;
        const data = res.data || {};

        const dobRaw =
          data.metadata?.birthDate ||
          data.birthDate ||
          data.dob ||
          data.age ||
          "";

        const allergiesArr = Array.isArray(data.drugAllergies)
          ? data.drugAllergies.map((a) => ({
              name: a.name || "",
              note: a.note || "",
              _id: a._id,
            }))
          : [];

        setPet(data);
        setEditForm({
          name: data.name || "",
          species: data.species || "",
          breed: data.breed || "",
          dob: safeDateForInput(dobRaw),
          allergies: allergiesArr,
        });

        const ownerBranchId = data.owner?.branchId || data.branchId;
        const inlineBranchName = data.owner?.branchName || data.branchName;
        if (inlineBranchName) {
          setBranchName(inlineBranchName);
        } else if (ownerBranchId) {
          try {
            const bRes = await api.get(`/api/branches/${ownerBranchId}`);
            const b = bRes.data || {};
            setBranchName(b.branchName || b.name || String(ownerBranchId));
          } catch {
            setBranchName(String(ownerBranchId));
          }
        } else {
          setBranchName("-");
        }
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

  if (loading) return <p className="staffpet-loading">Loading...</p>;
  if (!pet) return <p className="staffpet-loading">Pet not found.</p>;

  // options & autocomplete
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

  const dobRaw =
    pet.metadata?.birthDate ||
    pet.birthDate ||
    pet.dob ||
    pet.age ||
    editForm.dob ||
    "";

  const dobDisplay = dobRaw;
  const ageText = formatAge(dobRaw);

  const handleChange = (field, value) => {
    setEditForm((f) => ({ ...f, [field]: value }));
  };

  const handleCancelEdit = () => {
    if (!pet) return;
    const raw =
      pet.metadata?.birthDate ||
      pet.birthDate ||
      pet.dob ||
      pet.age ||
      "";
    const allergiesArr = Array.isArray(pet.drugAllergies)
      ? pet.drugAllergies.map((a) => ({
          name: a.name || "",
          note: a.note || "",
          _id: a._id,
        }))
      : [];
    setEditForm({
      name: pet.name || "",
      species: pet.species || "",
      breed: pet.breed || "",
      dob: safeDateForInput(raw),
      allergies: allergiesArr,
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
      //
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
      const metadata = {
        ...(pet.metadata || {}),
        birthDate: editForm.dob || null,
      };

      const allergiesPayload = (editForm.allergies || [])
        .filter((a) => a.name && a.name.trim())
        .map((a) => ({
          name: a.name.trim(),
          note: a.note?.trim() || null,
        }));

      const body = {
        name: editForm.name.trim(),
        species: editForm.species.trim(),
        breed: editForm.breed.trim(),
        age: editForm.dob
          ? new Date(editForm.dob).toISOString().slice(0, 10)
          : pet.age || "",
        metadata,
        drugAllergies: allergiesPayload,
      };

      const res = await api.put(`/api/staff/pets/${ownerId}/${petId}`, body);
      const updated = res.data?.pet || res.data || body;

      setPet((prev) => ({
        ...(prev || {}),
        ...updated,
        metadata,
        drugAllergies: allergiesPayload,
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

  const allergies = Array.isArray(pet.drugAllergies)
    ? pet.drugAllergies
    : [];

  // edit allergy helpers
  const updateAllergyField = (index, field, value) => {
    setEditForm((f) => {
      const next = [...(f.allergies || [])];
      next[index] = { ...(next[index] || {}), [field]: value };
      return { ...f, allergies: next };
    });
  };

  const addAllergy = () => {
    setEditForm((f) => ({
      ...f,
      allergies: [...(f.allergies || []), { name: "", note: "" }],
    }));
  };

  const removeAllergy = (index) => {
    setEditForm((f) => ({
      ...f,
      allergies: (f.allergies || []).filter((_, i) => i !== index),
    }));
  };

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
            onClick={() =>
              editing ? handleCancelEdit() : setEditing(true)
            }
          >
            {editing ? "Cancel Edit" : "Edit Pet"}
          </button>
        )}
      </div>

      <div className="staffpet-info-card">
        <div className="staffpet-avatar">
          {/* ภายหลังค่อยดึงจากรูป owner/pet */}
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
              <strong>Branch:</strong> {branchName}
            </p>
            <p>
              <strong>Species:</strong> {pet.species || "-"}
            </p>
            <p>
              <strong>Breed:</strong> {pet.breed || "-"}
            </p>
            <p>
              <strong>Date of Birth:</strong>{" "}
              {dobDisplay ? String(dobDisplay).slice(0, 10) : "-"}
            </p>
            <p>
              <strong>Age:</strong> {ageText}
            </p>

            <p>
              <strong>Drug Allergies:</strong>{" "}
              {allergies.length === 0 && "No known drug allergies"}
            </p>
            {allergies.length > 0 && (
              <ul className="staffpet-allergy-list">
                {allergies.map((a) => (
                  <li key={a._id || a.name}>
                    <span className="allergy-name">{a.name}</span>
                    {a.note && (
                      <span className="allergy-note"> — {a.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
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
                    onBlur={() =>
                      setTimeout(() => setShowSpeciesList(false), 150)
                    }
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
                    onBlur={() =>
                      setTimeout(() => setShowBreedList(false), 150)
                    }
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

            <div className="staffpet-edit-row">
              <label>
                Drug Allergies
                <div className="allergy-edit-list">
                  {(editForm.allergies || []).map((a, idx) => (
                    <div key={idx} className="allergy-edit-row">
                      <input
                        className="staffpet-input"
                        placeholder="Drug name"
                        value={a.name}
                        onChange={(e) =>
                          updateAllergyField(idx, "name", e.target.value)
                        }
                      />
                      <input
                        className="staffpet-input"
                        placeholder="Note (optional)"
                        value={a.note || ""}
                        onChange={(e) =>
                          updateAllergyField(idx, "note", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="staffpet-button staffpet-button-ghost"
                        onClick={() => removeAllergy(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="staffpet-button staffpet-button-secondary"
                    onClick={addAllergy}
                    style={{ marginTop: "8px" }}
                  >
                    + Add Allergy
                  </button>
                </div>
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
