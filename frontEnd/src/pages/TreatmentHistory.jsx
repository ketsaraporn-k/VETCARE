// src/pages/TreatmentHistory.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axiosConfig";
import "../layout/TreatmentHistory.css";

function formatDateTime(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

const TreatmentHistory = ({ ownerId, petId, canManage, user }) => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [viewRow, setViewRow] = useState(null);

  // ==== medicines state ====
  const [medicines, setMedicines] = useState([]);
  const [medSearch, setMedSearch] = useState("");
  const [medDropdownOpen, setMedDropdownOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState("");
  const [selectedQty, setSelectedQty] = useState(0);
  const [medLines, setMedLines] = useState([]);

  const medInputWrapperRef = useRef(null);

  // ==== doctors ====
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [form, setForm] = useState({
    treatmentDate: "",
    symptoms: "",
    diagnosis: "",
    notes: "",
    doctorId: "",
    _id: "",
  });

  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  const role = useMemo(
    () => String(currentUser?.role || "").toLowerCase(),
    [currentUser]
  );
  const isDoctor = role === "doctor";
  const isSuperAdmin = role === "superadmin";

  // -------------------- LOAD TREATMENTS --------------------
  const fetchTreatments = async () => {
    if (!ownerId || !petId) return;
    try {
      const res = await api.get(`/api/staff/treatments/${ownerId}/${petId}`);
      const data = res.data?.treatments || res.data?.data || res.data || [];
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("load treatments error:", err);
      setRows([]);
    }
  };

  // -------------------- LOAD MEDICINES (ตาม branch) --------------------
  const fetchMedicines = async () => {
    if (!currentUser?.branchId) return;
    try {
      const res = await api.get("/api/medicines");
      const raw = res.data?.data || res.data?.branches || res.data || [];
      const branches = Array.isArray(raw) ? raw : [];

      let meds = [];
      if (branches.length) {
        const branch =
          branches.find(
            (b) => String(b._id) === String(currentUser.branchId)
          ) || branches[0];

        const branchMeds = Array.isArray(branch?.medicines)
          ? branch.medicines
          : [];

        // เอายาที่ไม่ใช่ vaccine
        meds = branchMeds.filter((m) => {
          const cat = String(m.category || m.type || "").toLowerCase();
          return !cat.includes("vaccine");
        });
      }

      console.log("medicines from /api/medicines =>", res.data, meds);
      setMedicines(meds || []);
    } catch (err) {
      console.error("load medicines error:", err);
      setMedicines([]);
    }
  };

  // -------------------- LOAD DOCTORS --------------------
  const fetchDoctors = async () => {
    if (!currentUser?.branchId) return;
    setLoadingDoctors(true);
    try {
      const res = await api.get("/api/staff/doctors", {
        params: { branchId: currentUser.branchId },
      });
      const raw = res.data?.data || res.data || [];
      const mapped = (Array.isArray(raw) ? raw : []).map((d) => ({
        id: d.id || d._id,
        name: d.name || "Unknown doctor",
        specialty: d.doctorProfile?.specialty || "",
      }));
      setDoctors(mapped.filter((d) => d.id));
    } catch (err) {
      console.error("load doctors err:", err);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
    fetchMedicines();
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, petId, currentUser?.branchId]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        medInputWrapperRef.current &&
        !medInputWrapperRef.current.contains(e.target)
      ) {
        setMedDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -------------------- FILTER TABLE --------------------
  const filtered = rows
    .filter((r) => {
      const q = search.toLowerCase();
      if (!q) return true;
      const medsText = (r.medicines || [])
        .map((m) => m.medicineNameSnapshot)
        .join(" ");
      return (
        (r.symptoms || "").toLowerCase().includes(q) ||
        (r.diagnosis || "").toLowerCase().includes(q) ||
        medsText.toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  // -------------------- MEDICINE HELPERS --------------------
  const filteredMedicineOptions = useMemo(() => {
    const q = medSearch.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter((m) => {
      const base = `${m.medicineName || ""} ${m.code || ""}`.toLowerCase();
      return base.includes(q);
    });
  }, [medicines, medSearch]);

  const handleSelectMedicine = (med) => {
    setSelectedMedId(String(med._id));
    setMedSearch(med.medicineName);
    setMedDropdownOpen(false);
  };

  const addMedicineLine = () => {
    if (isSuperAdmin) {
      alert("SuperAdmin สามารถดูประวัติได้อย่างเดียว");
      return;
    }

    if (!selectedMedId) {
      alert("กรุณาเลือกยา");
      return;
    }
    const med = medicines.find((m) => String(m._id) === String(selectedMedId));
    if (!med) {
      alert("ไม่พบบัญชียาในสาขา");
      return;
    }

    const qty = Math.max(0, Number(selectedQty) || 0);
    if (qty <= 0) {
      alert("กรุณาระบุจำนวนยา (> 0)");
      return;
    }

    setMedLines((prev) => {
      const exists = prev.find(
        (p) => String(p.medicineId) === String(selectedMedId)
      );
      if (exists) {
        return prev.map((p) =>
          String(p.medicineId) === String(selectedMedId)
            ? { ...p, quantityUsed: p.quantityUsed + qty }
            : p
        );
      }
      return [
        ...prev,
        {
          key: `${selectedMedId}-${Date.now()}`,
          medicineId: selectedMedId,
          medicineNameSnapshot: med.medicineName,
          quantityUsed: qty,
        },
      ];
    });

    setSelectedQty(0);
    setMedSearch("");
    setSelectedMedId("");
  };

  const removeMedicineLine = (key) => {
    if (isSuperAdmin) {
      alert("SuperAdmin สามารถดูประวัติได้อย่างเดียว");
      return;
    }
    setMedLines((prev) => prev.filter((m) => m.key !== key));
  };

  // -------------------- MODAL HANDLERS --------------------
  const openCreate = () => {
    if (isSuperAdmin) {
      alert("SuperAdmin สามารถดูประวัติได้อย่างเดียว");
      return;
    }

    setMode("create");
    setForm({
      treatmentDate: "",
      symptoms: "",
      diagnosis: "",
      notes: "",
      doctorId: isDoctor ? currentUser?.id || currentUser?._id || "" : "",
      _id: "",
    });
    setMedLines([]);
    setSelectedMedId("");
    setSelectedQty(0);
    setMedSearch("");
    setMedDropdownOpen(false);
    setShowModal(true);
  };

  const openEdit = (row) => {
    if (isSuperAdmin) {
      alert("SuperAdmin สามารถดูประวัติได้อย่างเดียว");
      return;
    }

    setMode("edit");
    setForm({
      treatmentDate: row.treatmentDate
        ? new Date(row.treatmentDate).toISOString().slice(0, 16)
        : "",
      symptoms: row.symptoms || "",
      diagnosis: row.diagnosis || "",
      notes: row.notes || "",
      doctorId: row.staffId || "",
      _id: row._id,
    });

    const medsArr = (
      row.medicines && row.medicines.length
        ? row.medicines
        : row.medicineId
        ? [
            {
              medicineId: row.medicineId,
              medicineNameSnapshot: row.medicineNameSnapshot,
              quantityUsed: row.quantityUsed || 1,
            },
          ]
        : []
    ).map((m, idx) => ({
      key: `${m.medicineId || idx}-${Date.now()}-${idx}`,
      medicineId: m.medicineId,
      medicineNameSnapshot: m.medicineNameSnapshot,
      quantityUsed: Number(m.quantityUsed || 1) || 1,
    }));

    setMedLines(medsArr);
    setSelectedMedId("");
    setSelectedQty(0);
    setMedSearch("");
    setMedDropdownOpen(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setMedLines([]);
    setSelectedMedId("");
    setSelectedQty(0);
    setMedSearch("");
    setMedDropdownOpen(false);
  };

  const openView = (row) => setViewRow(row);
  const closeView = () => setViewRow(null);

  // -------------------- SUBMIT (CREATE/UPDATE) --------------------
  const submit = async (e) => {
    e.preventDefault();

    if (isSuperAdmin) {
      alert("SuperAdmin สามารถดูประวัติได้อย่างเดียว");
      return;
    }

    if (!ownerId || !petId) {
      alert("missing ownerId/petId");
      return;
    }
    if (!currentUser?.branchId && currentUser?.role !== "superAdmin") {
      alert("missing branchId");
      return;
    }

    try {
      // กันลืมกด Add
      let medPayload = [...medLines];
      if (!medPayload.length && selectedMedId && Number(selectedQty) > 0) {
        const med = medicines.find(
          (m) => String(m._id) === String(selectedMedId)
        );
        if (med) {
          medPayload.push({
            medicineId: selectedMedId,
            medicineNameSnapshot: med.medicineName,
            quantityUsed: Math.max(0, Number(selectedQty) || 0),
          });
        }
      }

      const payload = {
        branchId: currentUser.branchId,
        treatmentDate: form.treatmentDate,
        symptoms: form.symptoms,
        diagnosis: form.diagnosis,
        notes: form.notes,
      };

      if (form.doctorId) {
        payload.doctorId = form.doctorId;
      }

      if (medPayload.length) {
        payload.medicines = medPayload.map((m) => ({
          medicineId: m.medicineId,
          medicineNameSnapshot: m.medicineNameSnapshot,
          quantityUsed: m.quantityUsed,
        }));
      }

      if (mode === "create") {
        await api.post(`/api/staff/treatments/${ownerId}/${petId}`, payload);
      } else {
        await api.put(
          `/api/staff/treatments/${ownerId}/${petId}/${form._id}`,
          payload
        );
      }

      await fetchTreatments();
      setShowModal(false);
    } catch (err) {
      console.error("save treatment error:", err);
      alert(err.response?.data?.error || "บันทึกการรักษาไม่สำเร็จ");
    }
  };

  // ==================== RENDER ====================
  return (
    <section className="pet-section">
      <div className="section-top">
        <h3 className="section-title">Treatment History</h3>
        <div className="section-actions">
          <input
            className="petdetail-search"
            placeholder="Search by symptoms / diagnosis / medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* SuperAdmin ห้ามเพิ่ม */}
          {canManage && !isSuperAdmin && (
            <button
              className="staffpet-button staffpet-button-primary"
              onClick={openCreate}
            >
              ＋ Add Treatment
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="section-empty">No treatment records.</p>
      ) : (
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Diagnosis</th>
              <th>Symptoms</th>
              {/* <th>Medicine</th> */}
              <th>Doctor</th>
              <th>Branch</th>
              {/* superAdmin ยังมีปุ่ม View ได้ */}
              {(canManage || isSuperAdmin) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t._id}>
                <td>{formatDateTime(t.treatmentDate)}</td>
                <td>{t.diagnosis || "-"}</td>
                <td>{t.symptoms || "-"}</td>
                {/* <td>{medsText || "-"}</td> */}
                <td>{t.doctorNameSnapshot || "-"}</td>
                <td>{t.branchNameSnapshot || "-"}</td>
                {(canManage || isSuperAdmin) && (
                  <td className="treat-actions-cell">
                    {/* ทุกคนที่ดูได้ (รวม superAdmin / staff) มีปุ่ม View */}
                    <button
                      className="staffpet-button staffpet-button-ghost"
                      onClick={() => openView(t)}
                    >
                      View
                    </button>

                    {/* แก้ไข: allowed = canManage และไม่ใช่ superAdmin (staff / branchAdmin / doctor แก้ได้) */}
                    {canManage && !isSuperAdmin && (
                      <button
                        className="staffpet-button staffpet-button-ghost"
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </button>
                    )}

                    {/* ลบ: ห้าม staff ⇒ อนุญาตเฉพาะ branchAdmin + doctor (ตาม backend) */}
                    {canManage && !isSuperAdmin && role !== "staff" && (
                      <button
                        className="staffpet-button staffpet-button-danger"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "ต้องการลบประวัติการรักษารายการนี้หรือไม่?"
                            )
                          )
                            return;
                          try {
                            await api.delete(
                              `/api/staff/treatments/${ownerId}/${petId}/${t._id}`
                            );
                            await fetchTreatments();
                          } catch (err) {
                            console.error("delete treatment err", err);
                            alert(
                              err.response?.data?.error ||
                                "ลบประวัติการรักษาไม่สำเร็จ"
                            );
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {rows.length > 5 && (
        <p className="section-more">Showing latest 5 records.</p>
      )}

      {/* VIEW MODAL */}
      {viewRow && (
        <div className="petdetail-modal-overlay" onClick={closeView}>
          <div className="petdetail-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Treatment Detail</h3>
            <div className="modal-view-content">
              <p>
                <strong>Date:</strong> {formatDateTime(viewRow.treatmentDate)}
              </p>
              <p>
                <strong>Doctor:</strong> {viewRow.doctorNameSnapshot || "-"}
              </p>
              <p>
                <strong>Branch:</strong> {viewRow.branchNameSnapshot || "-"}
              </p>
              <p>
                <strong>Symptoms:</strong> {viewRow.symptoms || "-"}
              </p>
              <p>
                <strong>Diagnosis:</strong> {viewRow.diagnosis || "-"}
              </p>
              <p>
                <strong>Medicines:</strong>{" "}
                {viewRow.medicines && viewRow.medicines.length
                  ? viewRow.medicines
                      .map(
                        (m) =>
                          `${m.medicineNameSnapshot || "-"}${
                            m.quantityUsed ? ` (${m.quantityUsed})` : ""
                          }`
                      )
                      .join(", ")
                  : viewRow.medicineNameSnapshot || "-"}
              </p>
              <p>
                <strong>Notes / Prescription:</strong> {viewRow.notes || "-"}
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeView}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT/CREATE MODAL */}
      {showModal && !isSuperAdmin && (
        <div className="petdetail-modal-overlay" onClick={closeModal}>
          <div className="petdetail-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {mode === "create" ? "Add Treatment" : "Edit Treatment"}
            </h3>
            <form onSubmit={submit} className="modal-form">
              <label>
                Treatment Date
                <input
                  type="datetime-local"
                  className="staffpet-input"
                  value={form.treatmentDate}
                  onChange={(e) =>
                    setForm({ ...form, treatmentDate: e.target.value })
                  }
                />
              </label>

              <label>
                Symptoms
                <input
                  type="text"
                  className="staffpet-input"
                  value={form.symptoms}
                  onChange={(e) =>
                    setForm({ ...form, symptoms: e.target.value })
                  }
                />
              </label>

              <label>
                Diagnosis
                <input
                  type="text"
                  className="staffpet-input"
                  value={form.diagnosis}
                  onChange={(e) =>
                    setForm({ ...form, diagnosis: e.target.value })
                  }
                />
              </label>

              {/* Doctor */}
              <label>
                Doctor
                <select
                  className="staffpet-input"
                  value={form.doctorId}
                  onChange={(e) =>
                    setForm({ ...form, doctorId: e.target.value })
                  }
                  disabled={isDoctor}
                >
                  <option value="">
                    {loadingDoctors
                      ? "Loading doctors..."
                      : isDoctor
                      ? "You (current doctor)"
                      : "Select doctor..."}
                  </option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.specialty ? ` — ${d.specialty}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {/* Medicines multi + custom dropdown */}
              <div className="treat-medicine-block">
                <label>Medicines (optional)</label>

                {!medicines.length && (
                  <p className="treat-med-empty">
                    No medicines found for this branch.
                  </p>
                )}

                <div className="treat-med-row">
                  <div
                    className="treat-med-autocomplete"
                    ref={medInputWrapperRef}
                  >
                    <input
                      type="text"
                      className="staffpet-input"
                      placeholder="Type to search medicine..."
                      value={medSearch}
                      onChange={(e) => {
                        setMedSearch(e.target.value);
                        setMedDropdownOpen(true);
                      }}
                      onFocus={() => setMedDropdownOpen(true)}
                    />

                    {medDropdownOpen && filteredMedicineOptions.length > 0 && (
                      <ul className="treat-med-dropdown">
                        {filteredMedicineOptions.map((m) => (
                          <li
                            key={m._id}
                            className="treat-med-dropdown-item"
                            onMouseDown={() => handleSelectMedicine(m)}
                          >
                            <span className="treat-med-name">
                              {m.medicineName}
                            </span>
                            <span className="treat-med-meta">
                              stock: {m.stock ?? 0} {m.unit || ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <input
                    type="number"
                    min="0"
                    className="staffpet-input treat-med-qty"
                    value={selectedQty}
                    onChange={(e) =>
                      setSelectedQty(Number(e.target.value) || 0)
                    }
                  />
                  <button
                    type="button"
                    className="staffpet-button staffpet-button-primary"
                    onClick={addMedicineLine}
                  >
                    Add
                  </button>
                </div>

                {medLines.length > 0 && (
                  <ul className="treat-med-list">
                    {medLines.map((m) => (
                      <li key={m.key} className="treat-med-item">
                        <span>
                          {m.medicineNameSnapshot} — {m.quantityUsed}
                        </span>
                        <button
                          type="button"
                          className="staffpet-button staffpet-button-ghost"
                          onClick={() => removeMedicineLine(m.key)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label>
                Notes / Prescription
                <textarea
                  rows={2}
                  className="staffpet-input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {mode === "create" ? "Save" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default TreatmentHistory;
