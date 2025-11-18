// src/pages/OwnerAppointments.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";   // ⬅ ใช้ axios ตรง ๆ แบบ OwnerPets.jsx
import "./OwnerAppointments.css";

const OwnerAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedAppts, setSelectedAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  /** ========== FETCH OWNER APPOINTMENTS ========== */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("❌ No token found in localStorage");
      setLoading(false);
      return;
    }

    axios
      .get("http://localhost:3000/api/owner/appointments", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        setAppointments(res.data);
      })
      .catch((err) => {
        console.error("❌ Error fetching owner appointments:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading appointments...</p>;

  /** ========== CALENDAR ========= */
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const daysInMonth = Array.from(
    { length: endOfMonth.getDate() },
    (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDate = (d) => d.toISOString().split("T")[0];

  /** GROUP APPOINTMENT BY DAY */
  const apptByDay = (date) => {
    const dayStr = formatDate(date);
    return appointments.filter((a) => a.scheduledAt.startsWith(dayStr));
  };

  const openModal = (day) => {
    setSelectedDay(day);
    setSelectedAppts(apptByDay(day));
  };

  const closeModal = () => {
    setSelectedDay(null);
    setSelectedAppts([]);
  };

  const statusColor = {
    pending: "#fff3cd",
    confirmed: "#d4edda",
    done: "#cce5ff",
    cancelled: "#f8d7da",
  };

  return (
    <div className="calendar-container">

      {/* HEADER MONTH */}
      <div className="calendar-header">
        <button onClick={handlePrevMonth}>‹</button>
        <h2>
          {currentDate.toLocaleString("th-TH", { month: "long" })}{" "}
          {currentDate.getFullYear() + 543}
        </h2>
        <button onClick={handleNextMonth}>›</button>
      </div>

      {/* DAY NAME */}
      <div className="calendar-grid">
        {["อา","จ","อ","พ","พฤ","ศ","ส"].map((d) => (
          <div key={d} className="calendar-dayname">{d}</div>
        ))}

        {/* BLANK CELLS */}
        {Array(startOfMonth.getDay())
          .fill(null)
          .map((_, i) => (
            <div key={`blank-${i}`} className="calendar-day blank"></div>
          ))}

        {/* DAYS */}
        {daysInMonth.map((day, index) => (
          <div
            key={index}
            className="calendar-day"
            onClick={() => openModal(day)}
          >
            <div className="date-number">{day.getDate()}</div>

            {apptByDay(day).map((appt) => (
              <div
                key={appt._id}
                className="appt-item"
                style={{ background: statusColor[appt.status] }}
              >
                🐾 {appt.petName || "Unknown Pet"}
                <br />
                {new Date(appt.scheduledAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selectedDay && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>นัดวันที่ {selectedDay.toLocaleDateString("th-TH")}</h3>

            {selectedAppts.length === 0 && <p>ไม่มีนัดหมาย</p>}

            {selectedAppts.map((a) => (
              <div
                key={a._id}
                className="modal-appt-item"
                style={{ background: statusColor[a.status] }}
              >
                <strong>🐾 {a.petName}</strong>
                <br />
                เวลา{" "}
                {new Date(a.scheduledAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                <br />
                ประเภทบริการ: {a.serviceType}
                <br />
                สถานะ: {a.status}
                {a.notes && (
                  <>
                    <br />
                    หมายเหตุ: {a.notes}
                  </>
                )}
              </div>
            ))}

            <button className="close-btn" onClick={closeModal}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerAppointments;
