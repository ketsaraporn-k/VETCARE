// src/pages/Pets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosConfig";
import "./StaffPets.css";
import { SPECIES_OPTIONS, BREED_OPTIONS } from "../constants/pets";

const StaffPets = ({ user: userFromApp }) => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // modal เพิ่มสัตว์ใหม่
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    ownerId: "",          // id จริง
    ownerKeyword: "",     // ข้อความที่ใช้ค้นหา/แสดง
    branchIdOverride: "",
    name: "",
    species: "",
    breed: "",
    sex: "",
    birthDate: "",
    age: "",
  });

  // autocomplete
  const [showSpeciesList, setShowSpeciesList] = useState(false);
  const [showBreedList, setShowBreedList] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [showOwnerList, setShowOwnerList] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);

  const user = useMemo(() => {
    if (userFromApp) return userFromApp;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [userFromApp]);

  const role = String(user?.role || "").toLowerCase();
  const isSuper = role === "superadmin";

  const fetchPets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = { q, page, pageSize };

      if (isSuper) {
        params.all = 1;
      } else {
        params.branchId = user.branchId;
      }

      const res = await api.get("/api/staff/pets", { params });
      setPets(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Error fetching pets:", err);
      setPets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, pageSize, user?.branchId, role]);

  if (loading) return <p className="staffpet-loading">Loading pets...</p>;

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // ---------- helper: species / breed ----------
  const normalizeSpeciesKey = (input) => {
    const n = String(input || "").toLowerCase().trim();
    if (!n) return "";
    const found = SPECIES_OPTIONS.find(
      (s) =>
        s.value.toLowerCase() === n ||
        s.label.toLowerCase() === n
    );
    return found ? found.value.toLowerCase() : n;
  };

  const speciesKey = normalizeSpeciesKey(addForm.species);

  const allBreedOptions = Object.values(BREED_OPTIONS).flat();
  const activeBreedOptions = speciesKey
    ? BREED_OPTIONS[speciesKey] || []
    : allBreedOptions;

  const filteredSpeciesOptions = SPECIES_OPTIONS.filter((opt) =>
    (opt.label + opt.value)
      .toLowerCase()
      .includes(addForm.species.toLowerCase())
  );

  const filteredBreedOptions = activeBreedOptions.filter((opt) =>
    (opt.label + opt.value)
      .toLowerCase()
      .includes(addForm.breed.toLowerCase())
  );

  // helper คำนวณอายุจากวันเกิด
  const calcAgeLabel = (birthDate) => {
    if (!birthDate) return "";
    const dob = new Date(birthDate);
    if (isNaN(dob.getTime())) return "";

    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();

    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) {
      years = 0;
      months = 0;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months > 0) parts.push(`${months} เดือน`);
    if (!parts.length) return "น้อยกว่า 1 เดือน";
    return parts.join(" ");
  };

  // ---------- search เจ้าของจากชื่อ / id ----------
  const searchOwners = async (keyword) => {
    const q = keyword.trim();
    setOwnerOptions([]);
    if (q.length < 2) return; // กัน spam

    setOwnerLoading(true);
    try {
      const params = { q };

      if (isSuper) {
        params.all = 1;
      } else {
        params.branchId = user?.branchId;
      }

      const res = await api.get("/api/staff/owners", { params });
      setOwnerOptions(res.data?.data || []);
    } catch (err) {
      console.error("search owners error:", err);
      setOwnerOptions([]);
    } finally {
      setOwnerLoading(false);
    }
  };

  // ---------- submit เพิ่มสัตว์ใหม่ ----------
  const submitAddPet = async (e) => {
    e.preventDefault();

    if (!addForm.ownerId.trim()) {
      alert("กรุณาเลือกเจ้าของ (Owner) จากรายการ");
      return;
    }
    if (!addForm.name.trim()) {
      alert("กรุณากรอกชื่อสัตว์ (Name)");
      return;
    }

    const branchId = isSuper
      ? (addForm.branchIdOverride || user?.branchId)
      : user?.branchId;

    if (!branchId) {
      alert("branchId missing (สำหรับ superAdmin ต้องกรอก Branch ID ด้วย)");
      return;
    }

    let ageString = addForm.age;
    if (addForm.birthDate) {
      const label = calcAgeLabel(addForm.birthDate);
      if (label) ageString = label;
    }

    const payload = {
      ownerId: addForm.ownerId.trim(),
      branchId: branchId,
      name: addForm.name.trim(),
      species: addForm.species || null,
      breed: addForm.breed || null,
      sex: addForm.sex || null,
      age: ageString || null,
      metadata: {},
    };

    if (addForm.birthDate) {
      payload.metadata.birthDate = addForm.birthDate;
    }

    try {
      await api.post("/api/staff/pets", payload);
      setShowAddModal(false);
      setAddForm({
        ownerId: "",
        ownerKeyword: "",
        branchIdOverride: "",
        name: "",
        species: "",
        breed: "",
        sex: "",
        birthDate: "",
        age: "",
      });
      setOwnerOptions([]);
      await fetchPets();
    } catch (err) {
      console.error("create pet error:", err);
      alert(
        err.response?.data?.error ||
          "สร้างข้อมูลสัตว์ไม่สำเร็จ"
      );
    }
  };

  return (
    <div className="staffpet-container">
      <h2 className="staffpet-title">
        {isSuper ? "All Pets (All Branches)" : "Pets in My Branch"}
      </h2>

      <div className="staffpet-actions">
        <input
          className="staffpet-search"
          placeholder="Search pets..."
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />

        <button
          className="staffpet-button staffpet-button-primary"
          onClick={() => setShowAddModal(true)}
        >
          ＋ Add New Pet
        </button>
      </div>

      <table className="staffpet-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Species</th>
            <th>Owner</th>
            {isSuper && <th>Branch</th>}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {pets.map((pet) => (
            <tr key={pet._id}>
              <td>{pet._id}</td>
              <td>{pet.name || "-"}</td>
              <td>{pet.species || "-"}</td>
              <td>{pet.owner?.name || "-"}</td>
              {isSuper && (
                <td>{pet.branchId ? String(pet.branchId).slice(-5) : "-"}</td>
              )}
              <td>
                <Link
                  to={`/pet-detail/${pet.owner?.id}/${pet._id}`}
                  className="staffpet-button staffpet-button-view"
                >
                  🔍 View Detail
                </Link>
              </td>
            </tr>
          ))}
          {!pets.length && (
            <tr>
              <td
                colSpan={isSuper ? 6 : 5}
                style={{ textAlign: "center", padding: "16px" }}
              >
                No pets found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pages > 1 && (
        <div className="staffpet-pagination">
          <button
            className="staffpet-button staffpet-button-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ◀ Prev
          </button>
          <span className="staffpet-page-label">
            Page {page} / {pages}
          </span>
          <button
            className="staffpet-button staffpet-button-secondary"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next ▶
          </button>
        </div>
      )}

      {/* ---------- Popup Add New Pet ---------- */}
      {showAddModal && (
        <div
          className="staffpet-modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="staffpet-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="staffpet-modal-title">Add New Pet</h3>
            <form className="staffpet-modal-form" onSubmit={submitAddPet}>
              {/* Owner search */}
              <label>
                Owner (ค้นหาจากชื่อหรือ ID)
                <div className="staffpet-autocomplete-wrapper">
                  <input
                    className="staffpet-input"
                    value={addForm.ownerKeyword}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAddForm({
                        ...addForm,
                        ownerKeyword: value,
                        ownerId: "", // reset id ถ้าพิมพ์ใหม่
                      });
                      setShowOwnerList(true);
                      searchOwners(value);
                    }}
                    onFocus={() => {
                      if (addForm.ownerKeyword) {
                        setShowOwnerList(true);
                      }
                    }}
                    onBlur={() =>
                      setTimeout(() => setShowOwnerList(false), 150)
                    }
                    placeholder="เช่น Nancy, 6602..., ObjectId ฯลฯ"
                  />
                  {ownerLoading && (
                    <div className="staffpet-autocomplete-hint">
                      Searching...
                    </div>
                  )}
                  {showOwnerList && ownerOptions.length > 0 && (
                    <ul className="staffpet-autocomplete-list staffpet-owner-list">
                      {ownerOptions.slice(0, 10).map((o) => {
                        const shortId = String(o.id || o._id || "").slice(-6);
                        return (
                          <li
                            key={o.id || o._id}
                            className="staffpet-autocomplete-item"
                            onMouseDown={() => {
                              setAddForm({
                                ...addForm,
                                ownerId: o.id || o._id,
                                ownerKeyword: `${o.name} (${o.username || shortId})`,
                              });
                              setShowOwnerList(false);
                            }}
                          >
                            <div className="owner-main">
                              {o.name}{" "}
                              {o.username ? `(${o.username})` : ""}
                            </div>
                            <div className="owner-sub">
                              ID: {shortId}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </label>

              {isSuper && (
                <label>
                  Branch ID (สำหรับ SuperAdmin)
                  <input
                    className="staffpet-input"
                    value={addForm.branchIdOverride}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        branchIdOverride: e.target.value,
                      })
                    }
                    placeholder="ถ้าไม่ใส่ จะใช้ branchId ของผู้ใช้ปัจจุบัน"
                  />
                </label>
              )}

              <label>
                Name
                <input
                  className="staffpet-input"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Species
                <div className="staffpet-autocomplete-wrapper">
                  <input
                    className="staffpet-input"
                    value={addForm.species}
                    onChange={(e) => {
                      setAddForm({
                        ...addForm,
                        species: e.target.value,
                      });
                      setShowSpeciesList(true);
                    }}
                    onFocus={() => setShowSpeciesList(true)}
                    onBlur={() =>
                      setTimeout(() => setShowSpeciesList(false), 150)
                    }
                    placeholder="เช่น Dog, Cat, Rabbit..."
                  />
                  {showSpeciesList && filteredSpeciesOptions.length > 0 && (
                    <ul className="staffpet-autocomplete-list">
                      {filteredSpeciesOptions.slice(0, 8).map((opt) => (
                        <li
                          key={opt.value}
                          className="staffpet-autocomplete-item"
                          onMouseDown={() => {
                            setAddForm({
                              ...addForm,
                              species: opt.label,
                              breed: "", // reset breed เมื่อเปลี่ยน species
                            });
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

              <label>
                Breed
                <div className="staffpet-autocomplete-wrapper">
                  <input
                    className="staffpet-input"
                    value={addForm.breed}
                    onChange={(e) => {
                      setAddForm({
                        ...addForm,
                        breed: e.target.value,
                      });
                      setShowBreedList(true);
                    }}
                    onFocus={() => setShowBreedList(true)}
                    onBlur={() =>
                      setTimeout(() => setShowBreedList(false), 150)
                    }
                    placeholder={
                      speciesKey
                        ? "เลือกสายพันธุ์ตาม species"
                        : "เริ่มพิมพ์เพื่อค้นหาสายพันธุ์"
                    }
                  />
                  {showBreedList && filteredBreedOptions.length > 0 && (
                    <ul className="staffpet-autocomplete-list">
                      {filteredBreedOptions.slice(0, 10).map((opt) => (
                        <li
                          key={opt.value}
                          className="staffpet-autocomplete-item"
                          onMouseDown={() => {
                            setAddForm({
                              ...addForm,
                              breed: opt.label,
                            });
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

              <label>
                Sex
                <select
                  className="staffpet-input"
                  value={addForm.sex}
                  onChange={(e) =>
                    setAddForm({ ...addForm, sex: e.target.value })
                  }
                >
                  <option value="">-</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>

              <label>
                Date of Birth
                <input
                  type="date"
                  className="staffpet-input"
                  value={addForm.birthDate}
                  onChange={(e) =>
                    setAddForm({ ...addForm, birthDate: e.target.value })
                  }
                />
              </label>

              <label>
                Age (optional override)
                <input
                  className="staffpet-input"
                  value={addForm.age}
                  onChange={(e) =>
                    setAddForm({ ...addForm, age: e.target.value })
                  }
                  placeholder="ถ้าเว้นไว้ ระบบจะคำนวณจากวันเกิดให้"
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPets;
