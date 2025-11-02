import React from "react";
import "./Dashboard.css";

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
    </div>
  );
};

export default Dashboard;
