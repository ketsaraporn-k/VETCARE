// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const getRolesFromUserProp = (u) => {
    if (!u) return [];
    const raw = u.role ?? u.roles ?? null;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(r => String(r).toLowerCase());
    return [String(raw).toLowerCase()];
  };

  const roles = getRolesFromUserProp(user);

  const baseMenu = [
    { name: "Dashboard", icon: "fa-solid fa-chart-line", path: "/" },
    { name: "Patients (Pets)", icon: "fa-solid fa-dog", path: "/pets" },
    { name: "Pet Detail (Demo)", icon: "fa-solid fa-id-badge", path: "/pet-detail/1" },
    { name: "Profile", icon: "fa-regular fa-user", path: "/profile" },
    { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    { name: "Inventory", icon: "fa-solid fa-box", path: "/inventory" },
    { name: "Cash Flow", icon: "fa-solid fa-money-bill", path: "/cash" },
  ];

  const superAdminMenu = [
    { name: "SuperAdmin Dashboard", icon: "fa-solid fa-shield-halved", path: "/superadmin" },
    { name: "Manage All Branches", icon: "fa-solid fa-building", path: "/branches/manage" },
    { name: "View Consolidated Data", icon: "fa-solid fa-layer-group", path: "/branches/overview" },
    { name: "Move Customers & Staff", icon: "fa-solid fa-arrows-rotate", path: "/branches/transfer" },
    { name: "Move Requests", icon: "fa-solid fa-list", path: "/branches/move-requests" },
  ];

  const branchAdminMenu = [
    { name: "Branch Admin", icon: "fa-solid fa-screwdriver-wrench", path: "/admin" },
    // keep only one transfer-request link (remove duplicate)
    { name: "Request Transfer (staff/customer)", icon: "fa-solid fa-paper-plane", path: "/branches/transfer-request" },
    { name: "View Move Requests", icon: "fa-solid fa-list", path: "/branches/move-requests" },
    { name: "Move Request History", icon: "fa-solid fa-clock-rotate-left", path: "/branches/history" },
    { name: "Stock Alerts & Appointments", icon: "fa-solid fa-bell", path: "/admin/alerts" },
    { name: "Update Inventory (Admin)", icon: "fa-solid fa-boxes-packing", path: "/admin/inventory/update" },

  ];

  let menuItems = [...baseMenu];
  if (roles.includes("superadmin")) {
    menuItems = [...superAdminMenu, ...menuItems];
  } else if (roles.includes("branchadmin")) {
    menuItems = [...branchAdminMenu, ...menuItems];
  }

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate("/login");
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
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
            >
              <i className={item.icon} style={{ width: 20 }}></i>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-profile">
        <img src="/images/avatar.png" alt="avatar" />
        <div className="info">
          <p>{user?.name || user?.username || "Pretty102"}</p>
          <p>{roles.length ? roles.join(", ") : "User"}</p>
        </div>

        <button className="logout-btn" onClick={handleLogoutClick}>
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
