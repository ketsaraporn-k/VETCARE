// src/pages/TreatmentHistory.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axiosConfig";

const TreatmentHistory = ({ ownerId, petId, canManage, user }) => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");

  
  const [medicines, setMedicines] = useState([]);

  const [form, setForm] = useState({
    treatmentDate: "",
    symptoms: "",
    diagnosis: "",
    prescription: "", // map -> notes
    medicineId: "",
    quantityUsed: 1,
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

  // -------------------- LOAD TREATMENTS --------------------
  const fetchTreatments = async () => {
    if (!ownerId || !petId) return;
    try {
      const res = await api.get(
        `/api/staff/treatments/${ownerId}/${petId}`
      );
      const data = res.data?.treatments || res.data?.data || res.data || [];
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("load treatments error:", err);
    }
  };

  // -------------------- LOAD MEDICINES (ตาม branch) --------------------
  const fetchMedicines = async () => {
    if (!currentUser?.branchId) return;
    try {
      const res = await api.get("/api/medicines");
      const data = res.data || [];
      let meds = [];

      if (Array.isArray(data)) {
        // superAdmin: data = branches หลายอัน, staff: data = [branch เดียว]
        const branch =
          data.find(
            (b) => String(b._id) === String(currentUser.branchId)
          ) || data[0];
        if (branch && Array.isArray(branch.medicines)) {
          meds = branch.medicines;
        }
      }

      setMedicines(meds);
    } catch (err) {
      console.error("load medicines error:", err);
      setMedicines([]);
    }
  };

  useEffect(() => {
    fetchTreatments();
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, petId, currentUser?.branchId]);

  // -------------------- FILTER TABLE --------------------
  const filtered = rows
    .filter((r) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        (r.symptoms || "").toLowerCase().includes(q) ||
        (r.diagnosis || "").toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q) ||
        (r.medicineNameSnapshot || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  // -------------------- MODAL HANDLERS --------------------
  const openCreate = () => {
    setMode("create");
    setForm({
      treatmentDate: "",
      symptoms: "",
      diagnosis: "",
      prescription: "",
      medicineId: "",
      quantityUsed: 1,
      _id: "",
    });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setForm({
      treatmentDate: row.treatmentDate
        ? new Date(row.treatmentDate).toISOString().slice(0, 16)
        : "",
      symptoms: row.symptoms || "",
      diagnosis: row.diagnosis || "",
      prescription: row.notes || "",
      medicineId: row.medicineId || "",
      quantityUsed: row.quantityUsed || 1,
      _id: row._id,
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  // -------------------- SUBMIT --------------------
  const submit = async (e) => {
    e.preventDefault();
    if (!ownerId || !petId) {
      alert("missing ownerId/petId");
      return;
    }
    if (!currentUser?.branchId) {
      alert("missing branchId");
      return;
    }

    try {
      // หา medicine ที่เลือกจาก list
      const selectedMed = medicines.find(
        (m) => String(m._id) === String(form.medicineId)
      );

      const payload = {
        branchId: currentUser.branchId,
        treatmentDate: form.treatmentDate,
        symptoms: form.symptoms,
        diagnosis: form.diagnosis,
        notes: form.prescription,
      };

      if (selectedMed) {
        payload.medicineId = selectedMed._id;
        payload.medicineNameSnapshot = selectedMed.medicineName;
        payload.quantityUsed = Number(form.quantityUsed) || 1;
      }

      await api.post(
        `/api/staff/treatments/${ownerId}/${petId}`,
        payload
      );
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
            placeholder="Search treatments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canManage && (
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
              <th>Medicine</th>
              <th>Notes</th>
              {canManage && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t._id}>
                <td>
                  {t.treatmentDate
                    ? new Date(t.treatmentDate).toLocaleString()
                    : "-"}
                </td>
                <td>{t.diagnosis || "-"}</td>
                <td>{t.symptoms || "-"}</td>
                <td>{t.medicineNameSnapshot || "-"}</td>
                <td>{t.notes || "-"}</td>
                {canManage && (
                  <td>
                    <button
                      className="staffpet-button staffpet-button-ghost"
                      onClick={() => openEdit(t)}
                    >
                      ✎ Edit
                    </button>
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

      {showModal && (
        <div className="petdetail-modal-overlay" onClick={closeModal}>
          <div
            className="petdetail-modal"
            onClick={(e) => e.stopPropagation()}
          >
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

              <label>
                Medicine (optional)
                <select
                  className="staffpet-input"
                  value={form.medicineId}
                  onChange={(e) =>
                    setForm({ ...form, medicineId: e.target.value })
                  }
                >
                  <option value="">— No medicine —</option>
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.medicineName} (stock: {m.stock ?? 0}{" "}
                      {m.unit || ""})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Quantity Used
                <input
                  type="number"
                  min="1"
                  className="staffpet-input"
                  value={form.quantityUsed}
                  onChange={(e) =>
                    setForm({ ...form, quantityUsed: e.target.value })
                  }
                />
              </label>

              <label>
                Notes / Prescription
                <textarea
                  rows={2}
                  className="staffpet-input"
                  value={form.prescription}
                  onChange={(e) =>
                    setForm({ ...form, prescription: e.target.value })
                  }
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
