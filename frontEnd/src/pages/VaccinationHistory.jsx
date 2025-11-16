// src/pages/VaccinationHistory.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axiosConfig";
import { VACCINE_OPTIONS } from "../constants/vaccines";
import "../layout/VaccinationHistory.css";

const VaccinationHistory = ({ ownerId, petId, canManage, user }) => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");

  const [form, setForm] = useState({
    dateGiven: "",
    vaccineType: "",
    nextDueDate: "",
    doses: 1,
    note: "",
    _id: "",
  });

  const [showList, setShowList] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  // ---- role logic ตามที่ต้องการ ----
  const role = String(currentUser?.role || "").toLowerCase();
  const isSuperAdmin = role === "superadmin";
  const isStaff = role === "staff";

  const fetchData = async () => {
    if (!ownerId || !petId) return;
    try {
      const res = await api.get(`/api/staff/vaccinations/${ownerId}/${petId}`);
      setRows(res.data?.vaccinations || []);
    } catch (err) {
      console.error("load vaccinations error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ownerId, petId]);

  const filtered = rows
    .filter((r) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        (r.medicineNameSnapshot || "").toLowerCase().includes(q) ||
        (r.vaccineType || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  const filteredOptions = VACCINE_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes((form.vaccineType || "").toLowerCase())
  );

  const openCreate = () => {
    setMode("create");
    setForm({
      dateGiven: "",
      vaccineType: "",
      nextDueDate: "",
      doses: 1,
      note: "",
      _id: "",
    });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setForm({
      dateGiven: row.dateGiven
        ? new Date(row.dateGiven).toISOString().slice(0, 16)
        : "",
      vaccineType: row.medicineNameSnapshot || row.vaccineType || "",
      nextDueDate: row.nextDueDate
        ? new Date(row.nextDueDate).toISOString().slice(0, 16)
        : "",
      doses: row.doseQty || 1,
      note: row.note || "",
      _id: row._id,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowList(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!ownerId || !petId) {
      alert("missing ownerId/petId");
      return;
    }

    const doseNumber = Number(form.doses) || 1;

    try {
      await api.post(`/api/staff/vaccinations/${ownerId}/${petId}`, {
        branchId: currentUser?.branchId,
        dateGiven: form.dateGiven,
        vaccineType: form.vaccineType,
        nextDueDate: form.nextDueDate,
        doseQty: doseNumber,
        note: form.note,
      });
      await fetchData();
      setShowModal(false);
      setShowList(false);
    } catch (err) {
      console.error("save vaccine error:", err);
      alert(err.response?.data?.error || "บันทึกวัคซีนไม่สำเร็จ");
    }
  };

  const handleDelete = async (vac) => {
    if (!ownerId || !petId || !vac?._id) return;
    const ok = window.confirm(
      `ลบประวัคซีน "${vac.medicineNameSnapshot || vac.vaccineType || "-"}" ?`
    );
    if (!ok) return;

    try {
      setDeletingId(vac._id);
      await api.delete(
        `/api/staff/vaccinations/${ownerId}/${petId}/${vac._id}`
      );
      await fetchData();
    } catch (err) {
      console.error("delete vaccine error:", err);
      alert(err.response?.data?.error || "ลบวัคซีนไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  };

  // ==================== RENDER ====================
  return (
    <section className="pet-section">
      <div className="section-top">
        <h3 className="section-title">Vaccination History</h3>
        <div className="section-actions">
          <input
            className="petdetail-search"
            placeholder="Search vaccinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* superAdmin ดูอย่างเดียว → ไม่ต้องมีปุ่ม */}
          {canManage && !isSuperAdmin && (
            <button
              className="staffpet-button staffpet-button-primary"
              onClick={openCreate}
            >
              ＋ Add Vaccine
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="section-empty">No vaccination records.</p>
      ) : (
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vaccine</th>
              <th>Doses</th>
              <th>Next Due</th>
              {/* column Action แสดงเฉพาะคนที่แก้ไขได้ */}
              {canManage && !isSuperAdmin && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v._id}>
                <td>
                  {v.dateGiven ? new Date(v.dateGiven).toLocaleString() : "-"}
                </td>
                <td>{v.medicineNameSnapshot || v.vaccineType || "-"}</td>
                <td>{v.doseQty || 1}</td>
                <td>
                  {v.nextDueDate
                    ? new Date(v.nextDueDate).toLocaleDateString()
                    : "-"}
                </td>
                {canManage && !isSuperAdmin && (
                  <td style={{ whiteSpace: "nowrap" }}>
                    {/* ทุก role ที่ไม่ใช่ superAdmin แก้ไขได้ */}
                    <button
                      className="staffpet-button staffpet-button-ghost"
                      onClick={() => openEdit(v)}
                    >
                      ✎ Edit
                    </button>

                    {/* ปุ่มลบ: ห้าม staff ลบ → ซ่อนเฉพาะ staff */}
                    {!isStaff && (
                      <button
                        className="staffpet-button staffpet-button-danger"
                        disabled={deletingId === v._id}
                        onClick={() => handleDelete(v)}
                        style={{ marginLeft: 8 }}
                      >
                        {deletingId === v._id ? "Deleting..." : "🗑 Delete"}
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

      {/* superAdmin ดูเฉย ๆ → ไม่ต้องมี modal */}
      {showModal && !isSuperAdmin && (
        <div className="petdetail-modal-overlay" onClick={closeModal}>
          <div className="petdetail-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {mode === "create" ? "Add Vaccination" : "Edit Vaccination"}
            </h3>
            <form onSubmit={submit} className="modal-form">
              <label>
                Date Given
                <input
                  type="datetime-local"
                  className="staffpet-input"
                  value={form.dateGiven}
                  onChange={(e) =>
                    setForm({ ...form, dateGiven: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Vaccine Type
                <div className="staffpet-vaccine-wrapper">
                  <input
                    type="text"
                    className="staffpet-input"
                    value={form.vaccineType}
                    onChange={(e) => {
                      setForm({ ...form, vaccineType: e.target.value });
                      setShowList(true);
                    }}
                    onFocus={() => setShowList(true)}
                    onBlur={() => {
                      setTimeout(() => setShowList(false), 150);
                    }}
                    placeholder="Start typing vaccine name..."
                    required
                  />
                  {showList && filteredOptions.length > 0 && (
                    <ul className="staffpet-vaccine-list">
                      {filteredOptions.slice(0, 8).map((opt) => (
                        <li
                          key={opt.value}
                          className="staffpet-vaccine-item"
                          onMouseDown={() => {
                            setForm({ ...form, vaccineType: opt.value });
                            setShowList(false);
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
                Doses
                <input
                  type="number"
                  min="1"
                  className="staffpet-input"
                  value={form.doses}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      doses: e.target.value,
                    })
                  }
                  placeholder="เช่น 1, 2, 3"
                />
              </label>

              <label>
                Note
                <textarea
                  rows={2}
                  className="staffpet-input"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Optional notes..."
                />
              </label>

              <label>
                Next Due Date
                <input
                  type="datetime-local"
                  className="staffpet-input"
                  value={form.nextDueDate}
                  onChange={(e) =>
                    setForm({ ...form, nextDueDate: e.target.value })
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

export default VaccinationHistory;
