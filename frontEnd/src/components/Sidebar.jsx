// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();

  const menuItems = [
    { name: "Dashboard", icon: "fa-solid fa-chart-line", path: "/" },
    { name: "Patients (Pets)", icon: "fa-solid fa-dog", path: "/pets" },
    { name: "Pet Detail (Demo)", icon: "fa-solid fa-id-badge", path: "/pet-detail/1" },
    { name: "Profile", icon: "fa-regular fa-user", path: "/profile" },
    { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    { name: "Inventory", icon: "fa-solid fa-box", path: "/inventory" },
    { name: "Cash Flow", icon: "fa-solid fa-money-bill", path: "/cash" },
  ];

  const handleLogoutClick = () => {
    onLogout(); // เคลียร์ข้อมูล
    navigate("/login"); // ✅ กลับหน้า login
  };

  return (
    <div className="sidebar">
      <div>
        <div className="sidebar-logo">
          <img src="/logo-vet.png" alt="logo" />
          <span>VetCare</span>
        </div>

        <nav>
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "menu-item active" : "menu-item"
              }
            >
              <i className={item.icon}></i>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-profile">
        <img src="/images/avatar.png" alt="avatar" />
        <div className="info">
          <p>Pretty102</p>
          <p>Clinic Owner</p>
        </div>

        {/* 🔽 Logout Button */}
        <button className="logout-btn" onClick={handleLogoutClick}>
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
