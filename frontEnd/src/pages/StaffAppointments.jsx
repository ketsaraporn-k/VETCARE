// src/pages/StaffAppointments.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axiosConfig";
import "../layout/StaffAppointments.css";

/* ===== Helpers ===== */
function toKey(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDateTime(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// date -> YYYY-MM-DD
function toDateInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// date -> HH:mm
function toTimeInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// 30-minute slots 09:00–19:30
function generateTimeSlots(start, end, stepMinutes) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const slots = [];
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur <= endMin) {
    const h = String(Math.floor(cur / 60)).padStart(2, "0");
    const m = String(cur % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += stepMinutes;
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots("09:00", "19:30", 30);

/* ===== Component ===== */
const StaffAppointments = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [branchLabel, setBranchLabel] = useState("-");
  const [branchFilter, setBranchFilter] = useState("ALL");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [viewAppt, setViewAppt] = useState(null);

  const [form, setForm] = useState({
    petId: "",
    petLabel: "",
    doctorId: "",
    serviceType: "",
    date: "",
    time: "",
    note: "",
  });

  // pet combobox
  const [petQuery, setPetQuery] = useState("");
  const [isPetOpen, setIsPetOpen] = useState(false);
  const petComboRef = useRef(null);

  const role = useMemo(() => String(user?.role || "").toLowerCase(), [user]);
  const isSuper = role === "superadmin";
  const isDoctor = role === "doctor";
  const isBranchAdmin = role === "branchadmin";

  const todayKey = toKey(new Date());

  /* ===== Load branch name ===== */
  useEffect(() => {
    const loadBranch = async () => {
      if (!user) return;
      if (isSuper) {
        setBranchLabel("All branches");
        return;
      }
      if (!user.branchId) {
        setBranchLabel("-");
        return;
      }
      if (user.branchName) {
        setBranchLabel(user.branchName);
        return;
      }
      try {
        const res = await api.get(`/api/branches/${user.branchId}`);
        const b = res.data || {};
        setBranchLabel(b.branchName || b.name || String(user.branchId));
      } catch (err) {
        console.error("load branch label err:", err);
        setBranchLabel(String(user.branchId));
      }
    };
    loadBranch();
  }, [user?.branchId, user?.branchName, isSuper, user]);

  /* ===== Load appointments ===== */
  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = {};
      if (isSuper) {
        params.all = 1;
      } else if (user.branchId) {
        params.branchId = user.branchId;
      }

      const res = await api.get("/api/staff/schedules", { params });
      const data = res.data?.data || res.data || [];
      let rows = Array.isArray(data) ? data : [];

      // doctor เห็นเฉพาะนัดของตัวเอง (กัน backend ยังไม่ filter)
      if (!isSuper && isDoctor) {
        const uid = String(user?.id || user?._id || "");
        rows = rows.filter((a) => {
          const did = a.doctorId || a.staffId;
          return did && String(did) === uid;
        });
      }

      setAppointments(rows);
    } catch (err) {
      console.error("load staff appointments err:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  /* ===== Load pets ===== */
  const fetchPets = async () => {
    if (!user?.branchId || isSuper) return;
    setLoadingPets(true);
    try {
      const res = await api.get("/api/staff/pets", {
        params: { branchId: user.branchId, page: 1, pageSize: 100 },
      });

      const raw = res.data?.data || res.data?.pets || res.data || [];

      const mapped = (Array.isArray(raw) ? raw : []).map((p) => ({
        id: p._id || p.id,
        name: p.name || p.petName || "Unnamed",
        owner:
          p.ownerName || p.owner?.name || p.ownerNameText || "Unknown owner",
      }));

      setPets(mapped.filter((p) => p.id));
    } catch (err) {
      console.error("load pets for dropdown err:", err);
      setPets([]);
    } finally {
      setLoadingPets(false);
    }
  };

  /* ===== Load doctors ===== */
  const fetchDoctors = async () => {
    if (!user?.branchId) return;
    setLoadingDoctors(true);
    try {
      const res = await api.get("/api/staff/doctors", {
        params: { branchId: user.branchId },
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
    fetchAppointments();
    fetchPets();
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId, role]);

  /* ===== Branch options for super ===== */
  const branchOptions = useMemo(() => {
    if (!isSuper) return [];
    const map = new Map();
    appointments.forEach((a) => {
      const id = a.branch?.id || a.branchId;
      const name = a.branch?.branchName || a.branchName || "Unknown branch";
      if (id && !map.has(String(id))) {
        map.set(String(id), { id: String(id), name });
      }
    });
    return Array.from(map.values());
  }, [appointments, isSuper]);

  useEffect(() => {
    if (!isSuper) return;
    if (branchOptions.length === 0) {
      setBranchFilter("ALL");
      return;
    }
    if (branchFilter !== "ALL") {
      const ok = branchOptions.some((b) => b.id === branchFilter);
      if (!ok) setBranchFilter("ALL");
    }
  }, [branchOptions, isSuper, branchFilter]);

  /* ===== Click outside pet combobox ===== */
  useEffect(() => {
    const onClickOutside = (e) => {
      if (petComboRef.current && !petComboRef.current.contains(e.target)) {
        setIsPetOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  /* ===== Calendar helpers ===== */
  const monthLabel = useMemo(() => {
    const d = currentMonth;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
    });
  }, [currentMonth]);

  const apptByDay = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      const k = toKey(a.scheduledAt);
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(a);
    });
    return map;
  }, [appointments]);

  function buildMonthGrid(baseDate) {
    const start = new Date(baseDate);
    start.setDate(1);
    const firstDay = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - firstDay);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }

  const days = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  const selectedKey = toKey(selectedDate);
  const currentMonthIndex = currentMonth.getMonth();

  /* ===== Appointments of selected day ===== */
  const dayAppointments = useMemo(() => {
    const all = apptByDay[selectedKey] || [];

    // filter by branch (super)
    let list = all;
    if (isSuper && branchFilter !== "ALL") {
      list = list.filter((a) => {
        const bid = a.branch?.id || a.branchId;
        return bid && String(bid) === String(branchFilter);
      });
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((a) => {
      return (
        (a.serviceType || "").toLowerCase().includes(q) ||
        (a.status || "").toLowerCase().includes(q) ||
        (a.notes || "").toLowerCase().includes(q)
      );
    });
  }, [apptByDay, selectedKey, search, isSuper, branchFilter]);

  /* ===== Upcoming today ===== */
  const upcomingToday = useMemo(() => {
    const now = new Date();

    let base = (appointments || []).filter((a) => {
      const k = toKey(a.scheduledAt);
      if (k !== todayKey) return false;
      const d = new Date(a.scheduledAt);
      if (isNaN(d.getTime())) return false;
      return d >= now;
    });

    if (isSuper && branchFilter !== "ALL") {
      base = base.filter((a) => {
        const bid = a.branch?.id || a.branchId;
        return bid && String(bid) === String(branchFilter);
      });
    }

    return base
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .slice(0, 4);
  }, [appointments, todayKey, isSuper, branchFilter]);

  /* ===== Month navigation ===== */
  const goPrevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };

  const goNextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  const goToday = () => {
    const now = new Date();
    const m = new Date(now.getFullYear(), now.getMonth(), 1);
    setCurrentMonth(m);
    setSelectedDate(now);
  };

  /* ===== Pet combobox helpers ===== */
  const filteredPets = useMemo(() => {
    const q = (petQuery || "").trim().toLowerCase();
    const list = pets || [];
    if (!q) return list;
    return list.filter((p) => {
      const base = `${p.name || ""} ${p.owner || ""}`.toLowerCase();
      return base.includes(q);
    });
  }, [pets, petQuery]);

  const handlePetInputChange = (e) => {
    const v = e.target.value;
    setPetQuery(v);
    setIsPetOpen(true);
    setForm((prev) => ({
      ...prev,
      petId: "",
      petLabel: v,
    }));
  };

  const handleSelectPet = (p) => {
    const label = `${p.name} — ${p.owner}`;
    setForm((prev) => ({
      ...prev,
      petId: p.id,
      petLabel: label,
    }));
    setPetQuery("");
    setIsPetOpen(false);
  };

  const getPetLabel = (appt) => {
    const petId = appt.petId || appt.pet?._id || appt.pet?.id;
    if (!petId) return "-";
    const p = pets.find((x) => String(x.id) === String(petId));
    return p ? p.name : "-";
  };

  const getDoctorLabel = (appt) => {
    const docId = appt.doctorId || appt.staffId;
    if (!docId) return "-";
    const d = doctors.find((x) => String(x.id) === String(docId));
    return d ? d.name : "-";
  };

  /* ===== Modal: add appointment ===== */
  const openModal = () => {
    if (!user?.branchId && !isSuper) {
      alert("ไม่พบ branchId ของผู้ใช้");
      return;
    }
    const base = new Date(selectedDate || new Date());
    base.setHours(9, 0, 0, 0);

    setEditingAppt(null);
    setPetQuery("");

    setForm({
      petId: "",
      petLabel: "",
      doctorId: isDoctor ? user?.id || user?._id || "" : "",
      serviceType: "",
      date: toDateInputValue(base),
      time: "09:00",
      note: "",
    });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    const base = row.scheduledAt ? new Date(row.scheduledAt) : new Date();
    let dateVal = toDateInputValue(base);
    let timeVal = toTimeInputValue(base);
    if (!TIME_SLOTS.includes(timeVal)) {
      timeVal = TIME_SLOTS[0];
    }

    const petIdFromRow = row.petId || row.pet?.id || row.pet?._id || "";
    const petItem = pets.find((p) => String(p.id) === String(petIdFromRow));
    const label = petItem ? `${petItem.name} — ${petItem.owner}` : "";

    setEditingAppt(row);
    setPetQuery("");

    setForm({
      petId: petIdFromRow,
      petLabel: label,
      doctorId: row.doctorId || row.staffId || "",
      serviceType: row.serviceType || "",
      date: dateVal,
      time: timeVal,
      note: row.notes || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAppt(null);
    setPetQuery("");
  };

  /* ===== Submit (create / update) ===== */
  const submit = async (e) => {
    e.preventDefault();
    if (!form.petId) {
      alert("กรุณาเลือกสัตว์");
      return;
    }
    if (!form.date) {
      alert("กรุณาเลือกวัน");
      return;
    }
    if (!form.time) {
      alert("กรุณาเลือกเวลานัด (09:00–19:30)");
      return;
    }

    const scheduledAtStr = `${form.date}T${form.time}`;
    const currentUserId = user?.id || user?._id;

    try {
      if (!isSuper && !user?.branchId) {
        alert("ไม่พบ branchId ของผู้ใช้");
        return;
      }

      if (editingAppt) {
        const branchId = isSuper
          ? editingAppt.branch?.id || editingAppt.branchId
          : user.branchId;

        await api.put(`/api/staff/schedules/${branchId}/${editingAppt._id}`, {
          serviceType: form.serviceType || "general",
          scheduledAt: scheduledAtStr,
          notes: form.note,
          doctorId:
            form.doctorId ||
            editingAppt.doctorId ||
            editingAppt.staffId ||
            (role === "doctor" ? currentUserId : undefined),
          staffId: currentUserId || undefined,
        });
      } else {
        await api.post("/api/staff/schedules", {
          petId: form.petId,
          branchId: isSuper ? null : user.branchId,
          staffId: currentUserId || undefined,
          doctorId:
            form.doctorId || (role === "doctor" ? currentUserId : undefined),
          serviceType: form.serviceType || "general",
          scheduledAt: scheduledAtStr,
          notes: form.note,
        });
      }

      await fetchAppointments();
      setShowModal(false);
      setEditingAppt(null);
    } catch (err) {
      console.error("create/update schedule err", err);
      alert(err.response?.data?.error || "บันทึกนัดไม่สำเร็จ");
    }
  };

  /* ===== Change status ===== */
  const updateStatus = async (row, newStatus) => {
    try {
      const branchId = isSuper
        ? row.branch?.id || row.branchId
        : user.branchId;

      if (!branchId) {
        alert("ไม่พบ branchId ของนัดหมายนี้");
        return;
      }

      await api.put(`/api/staff/schedules/${branchId}/${row._id}/status`, {
        status: newStatus,
      });
      await fetchAppointments();
    } catch (err) {
      console.error("update status err:", err);
      alert(err.response?.data?.error || "เปลี่ยนสถานะไม่สำเร็จ");
    }
  };

  /* ===== Delete (branchAdmin / super) ===== */
  const deleteAppointment = async (row) => {
    if (!window.confirm("ต้องการลบนัดหมายนี้หรือไม่?")) return;

    try {
      const branchId = isSuper
        ? row.branch?.id || row.branchId
        : user.branchId;

      if (!branchId) {
        alert("ไม่พบ branchId ของนัดหมายนี้");
        return;
      }

      await api.delete(`/api/staff/schedules/${branchId}/${row._id}`);
      await fetchAppointments();
    } catch (err) {
      console.error("delete schedule err", err);
      alert(err.response?.data?.error || "ลบนัดหมายไม่สำเร็จ");
    }
  };

  /* ===== Render ===== */
  return (
    <div className="appt-page">
      <div className="appt-header">
        <div>
          <h2 className="appt-title">
            {isSuper
              ? "All Appointments (Calendar View)"
              : "Appointments Calendar"}
          </h2>
          {!isSuper && (
            <p className="appt-subtitle">Branch: {branchLabel}</p>
          )}
        </div>

        <div className="appt-header-actions">
          <button className="appt-btn-outline" onClick={goPrevMonth}>
            ‹
          </button>
          <span className="appt-month-label">{monthLabel}</span>
          <button className="appt-btn-outline" onClick={goNextMonth}>
            ›
          </button>
          <button className="appt-btn-outline" onClick={goToday}>
            Today
          </button>

          {isSuper && (
            <select
              className="appt-search appt-branch-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="ALL">All branches</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <input
            className="appt-search"
            placeholder="Search by service / status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!isSuper && (
            <button className="appt-btn-primary" onClick={openModal}>
              ＋ Add Appointment
            </button>
          )}
        </div>
      </div>

      <div className="appt-layout">
        {/* Calendar */}
        <div className="appt-calendar">
          <div className="appt-calendar-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="appt-calendar-weekday">
                {d}
              </div>
            ))}
          </div>
          <div className="appt-calendar-grid">
            {days.map((d) => {
              const key = toKey(d);
              const inMonth = d.getMonth() === currentMonthIndex;
              const has = !!apptByDay[key];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;

              let className = "appt-calendar-day";
              if (!inMonth) className += " appt-calendar-day--other";
              if (isToday) className += " appt-calendar-day--today";
              if (has) className += " appt-calendar-day--has";
              if (isSelected) className += " appt-calendar-day--selected";

              return (
                <button
                  key={key + d.getTime()}
                  type="button"
                  className={className}
                  onClick={() => setSelectedDate(d)}
                >
                  <span className="appt-calendar-day-number">
                    {d.getDate()}
                  </span>
                  {has && (
                    <span className="appt-calendar-dot" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="appt-right">
          {/* Today upcoming */}
          <div className="appt-upcoming">
            <div className="appt-upcoming-head">
              <h3>Today&apos;s Upcoming</h3>
              <span className="appt-upcoming-date">
                {formatDateLabel(new Date())}
              </span>
            </div>

            {upcomingToday.length === 0 ? (
              <p className="appt-upcoming-empty">
                No upcoming appointments today.
              </p>
            ) : (
              <ul className="appt-upcoming-list">
                {upcomingToday.map((a) => (
                  <li key={a._id} className="appt-upcoming-item">
                    <div>
                      <div className="appt-upcoming-time">
                        {formatDateTime(a.scheduledAt)}
                      </div>
                      <div className="appt-upcoming-service">
                        {a.serviceType || "-"}
                      </div>
                    </div>
                    <span
                      className={`status-badge status-${
                        a.status || "pending"
                      }`}
                    >
                      {a.status || "pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail list */}
          <div className="appt-list">
            <div className="appt-list-header">
              <h3>Appointments on {formatDateLabel(selectedDate)}</h3>
              {loading && (
                <span className="appt-list-loading">Loading…</span>
              )}
            </div>

            {!loading && dayAppointments.length === 0 ? (
              <p className="section-empty">No appointments on this day.</p>
            ) : (
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Pet</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    {isSuper ? <th>Branch</th> : <th>Manage</th>}
                  </tr>
                </thead>
                <tbody>
                  {dayAppointments.map((a) => (
                    <tr key={a._id}>
                      <td>{formatDateTime(a.scheduledAt)}</td>
                      <td>{getPetLabel(a)}</td>
                      <td>{getDoctorLabel(a)}</td>
                      <td
                        className={`status-badge status-${
                          a.status || "pending"
                        }`}
                      >
                        {a.status || "pending"}
                      </td>

                      {isSuper ? (
                        <td>
                          {a.branch?.branchName || a.branchName || "-"}
                        </td>
                      ) : (
                        <td className="appt-manage-cell">
                          <select
                            className="appt-status-select"
                            value={a.status || "pending"}
                            onChange={(e) =>
                              updateStatus(a, e.target.value)
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="done">Done</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          <button
                            type="button"
                            className="appt-status-btn"
                            onClick={() => setViewAppt(a)}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="appt-status-btn appt-status-edit"
                            onClick={() => openEditModal(a)}
                          >
                            Edit
                          </button>

                          {isBranchAdmin && (
                            <button
                              type="button"
                              className="appt-status-btn appt-status-danger"
                              onClick={() => deleteAppointment(a)}
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
          </div>
        </div>
      </div>

      {/* View Modal */}
      {viewAppt && (
        <div
          className="petdetail-modal-overlay"
          onClick={() => setViewAppt(null)}
        >
          <div
            className="petdetail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Appointment Detail</h3>
            <div className="modal-view-content">
              <p>
                <strong>Date / Time:</strong>{" "}
                {formatDateLabel(viewAppt.scheduledAt)}{" "}
                {formatDateTime(viewAppt.scheduledAt)}
              </p>
              <p>
                <strong>Pet:</strong> {getPetLabel(viewAppt)}
              </p>
              <p>
                <strong>Doctor:</strong> {getDoctorLabel(viewAppt)}
              </p>
              <p>
                <strong>Service:</strong> {viewAppt.serviceType || "-"}
              </p>
              <p>
                <strong>Status:</strong> {viewAppt.status || "pending"}
              </p>
              <p>
                <strong>Notes:</strong> {viewAppt.notes || "-"}
              </p>
              {isSuper && (
                <p>
                  <strong>Branch:</strong>{" "}
                  {viewAppt.branch?.branchName ||
                    viewAppt.branchName ||
                    "-"}
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewAppt(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="petdetail-modal-overlay" onClick={closeModal}>
          <div
            className="petdetail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">
              {editingAppt ? "Edit Appointment" : "Add Appointment"}
            </h3>
            <form onSubmit={submit} className="modal-form">
              {/* Pet combobox */}
              <label>
                Pet
                <div className="appt-pet-combobox" ref={petComboRef}>
                  <input
                    type="text"
                    className="staffpet-input"
                    placeholder={
                      loadingPets ? "Loading pets..." : "pet name — owner"
                    }
                    value={form.petLabel || petQuery || ""}
                    onChange={handlePetInputChange}
                    onFocus={() => setIsPetOpen(true)}
                    readOnly={!!editingAppt}
                  />
                  {isPetOpen && !editingAppt && (
                    <div className="appt-pet-options">
                      {filteredPets.length === 0 ? (
                        <div className="appt-pet-option appt-pet-option--empty">
                          No matches
                        </div>
                      ) : (
                        filteredPets.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="appt-pet-option"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectPet(p);
                            }}
                          >
                            <span className="appt-pet-option-name">
                              {p.name}
                            </span>
                            <span className="appt-pet-option-owner">
                              {p.owner}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </label>

              {/* Doctor */}
              <label>
                Doctor
                <select
                  className="staffpet-input"
                  value={form.doctorId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      doctorId: e.target.value,
                    }))
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

              <label>
                Service Type
                <input
                  type="text"
                  className="staffpet-input"
                  value={form.serviceType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      serviceType: e.target.value,
                    }))
                  }
                  placeholder="e.g. checkup, vaccination"
                  required
                />
              </label>

              {/* Date & time */}
              <label>
                Date
                <input
                  type="date"
                  className="staffpet-input"
                  value={form.date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                Time (09:00–19:30)
                <select
                  className="staffpet-input"
                  value={form.time}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select time (30 min each)...</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Note
                <textarea
                  rows={2}
                  className="staffpet-input"
                  value={form.note}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder="Extra note for this appointment"
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

export default StaffAppointments;
