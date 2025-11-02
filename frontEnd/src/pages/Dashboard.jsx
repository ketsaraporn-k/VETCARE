import React from "react";
import "./Dashboard.css";
import NotificationPopup from "../components/NotificationPopup";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h3>Today's Appointments</h3>
        <p>You have 5 appointments today.</p>
      </div>

      <div className="dashboard-card">
        <h3>Active Patients</h3>
        <p>12 pets are under care.</p>
      </div>

      <div className="p-6">
      <h1 className="text-xl font-bold mb-3">🏥 แนะนำคลินิกของเรา</h1>
      <p>ยินดีต้อนรับสู่ระบบดูแลสัตว์เลี้ยงของคุณ</p>
      <NotificationPopup />
    </div>

    </div>

    
  );
};

export default Dashboard;
