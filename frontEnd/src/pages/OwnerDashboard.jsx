// src/pages/OwnerDashboard.jsx
import React, { useEffect, useState } from "react";
import NotificationPopup from "../components/NotificationPopup";
import "./OwnerDashboard.css";   // ใช้ไฟล์ CSS แยก ไม่กระทบ Dashboard อื่น

const OwnerDashboard = () => {

  // -----------------------------
  // (NEW) state สำหรับข้อมูลจริง
  // -----------------------------
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // (NEW) โหลดข้อมูลจาก backend
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงสัตว์เลี้ยงทั้งหมดของ owner
        const resPets = await fetch("http://localhost:3000/api/pets/my", {
          credentials: "include", // สำคัญมาก ใช้ cookie auth
        });
        const petsData = await resPets.json();

        // ดึงนัดหมายทั้งหมด
        const resAppt = await fetch("http://localhost:3000/api/owner/appointments", {
          credentials: "include",
        });
        const apptData = await resAppt.json();

        setPets(petsData);
        setAppointments(apptData);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p className="owner-loading">Loading...</p>;

  const todayAppointments = appointments.filter(a => {
    const today = new Date().toDateString();
    return new Date(a.scheduledAt).toDateString() === today;
  });

  const upcoming = appointments[0] || null;

  return (
    <div className="owner-dashboard">

      {/* การ์ดจำนวนสัตว์เลี้ยง */}
      <div className="owner-card">
        <h3> <img src="/kitten.png" className="OwnerDashboard-icon"/>
          สัตว์เลี้ยงทั้งหมด</h3>
        <p>{pets.length} ตัว</p>
      </div>

      {/* การ์ดนัดวันนี้ */}
      <div className="owner-card">
        <h3> <img src="/calendar.png" className="OwnerDashboard-icon"/>
             นัดวันนี้</h3>
        <p>{todayAppointments.length} รายการ</p>
      </div>

      {/* นัดถัดไป */}
      <div className="owner-card">
        <h3> <img src="/Next-Apppoint.png" className="OwnerDashboard-icon"/> 
           นัดถัดไป</h3>
        {upcoming ? (
          <p>
            {upcoming.petName} — {new Date(upcoming.scheduledAt).toLocaleString()}
          </p>
        ) : (
          <p>ไม่มีนัดหมาย</p>
        )}
      </div>

      {/* Welcome message + Notification popup */}
      <div className="owner-section">
        <h2 className="owner-title"> 
          <img src="/doctor.png" className="OwnerDashboard-icon"/>
           ยินดีต้อนรับ!🎉</h2>
        <p>ระบบดูแลสัตว์เลี้ยงของคุณ</p>
        <NotificationPopup />
      </div>

    </div>
  );
};

export default OwnerDashboard;
