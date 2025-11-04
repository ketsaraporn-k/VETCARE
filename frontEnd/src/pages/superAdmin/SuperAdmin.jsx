// src/pages/superAdmin/SuperAdmin.jsx
import React from "react";
import "./SuperAdmin.css";

export default function SuperAdmin() {
  return (
    <div className="superadmin-page" style={{ padding: 16 }}>
      <h2>SuperAdmin Dashboard</h2>
      <p>Welcome, SuperAdmin — use the sidebar to access management tools.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div className="card">
          <h4>Manage Branches</h4>
          <p>View / create / edit branches.</p>
        </div>

        <div className="card">
          <h4>Manage Users & Roles</h4>
          <p>Assign roles, move users between branches, and view history.</p>
        </div>
      </div>
    </div>
  );
}
