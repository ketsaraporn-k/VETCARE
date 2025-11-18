// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

/**
 * Robust Sidebar
 * - tolerant role parser (string, array, object, mixed)
 * - builds menuItems only from the provided role-specific lists
 * - safe defaults (no base menu injected)
 */

const Sidebar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // parse roles from user prop into normalized array of strings like ["superadmin"]
  const getRolesFromUserProp = (u) => {
    if (!u) return [];

    let raw = u.role ?? u.roles ?? null;
    if (!raw) return [];

    // single object like { name: 'SuperAdmin' } or { roleName: 'super admin' }
    if (typeof raw === "object" && !Array.isArray(raw)) {
      const values = Object.values(raw).filter(v => typeof v === "string" && v.trim().length);
      if (values.length) {
        // pick the first meaningful string and normalize
        return [values[0].toLowerCase().replace(/\s+/g, "")];
      }
      return [];
    }

    // single string
    if (typeof raw === "string") {
      return [raw.toLowerCase().replace(/\s+/g, "")];
    }

    // array of mixed items
    if (Array.isArray(raw)) {
      return raw
        .map(r => {
          if (!r) return null;
          if (typeof r === "string") return r.toLowerCase().replace(/\s+/g, "");
          if (typeof r === "object") {
            const vals = Object.values(r).filter(v => typeof v === "string" && v.trim().length);
            if (vals.length) return vals[0].toLowerCase().replace(/\s+/g, "");
            return null;
          }
          return String(r).toLowerCase().replace(/\s+/g, "");
        })
        .filter(Boolean);
    }

    return [];
  };

  const roles = getRolesFromUserProp(user || {});

  // role-specific menus (only the pages you provided)
  const ownerMenu = [
    { name: "Owner Dashboard", icon: "fa-solid fa-chart-line", path: "/" },
    { name: "Owner Profile", icon: "fa-regular fa-user", path: "/profile" },
    { name: "Owner Pets", icon: "fa-solid fa-dog", path: "/pets" },
    { name: "Owner Pet Detail", icon: "fa-solid fa-id-badge", path: "/pet-detail/1" },
    { name: "Owner Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
  ];

  const superAdminMenu = [
    { name: "SuperAdmin Dashboard", icon: "fa-solid fa-shield-halved", path: "/superadmin" },
    { name: "Manage All Branches", icon: "fa-solid fa-building", path: "/branches/manage" },
    { name: "Manage Users & Roles", icon: "fa-solid fa-users-gear", path: "/superadmin/roles" },
    { name: "Move Customers & Staff", icon: "fa-solid fa-arrows-rotate", path: "/branches/transfer" },
    { name: "Move Requests", icon: "fa-solid fa-list", path: "/branches/move-requests" },
    { name: "Patients (Pets)", icon: "fa-solid fa-dog", path: "/pets" },
    { name: "Consolidated View", icon: "fa-solid fa-chart-pie", path: "/consolidated" },
    { name: "Update Inventory", icon: "fa-solid fa-boxes-packing", path: "/admin/inventory/update" },
    { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    { name: "Inventory", icon: "fa-solid fa-box", path: "/inventory" }
  ];

  const branchAdminMenu = [
    { name: "Branch Admin Dashboard", icon: "fa-solid fa-chart-pie", path: "/admin/dashboard" },
    { name: "Request Transfer (staff/customer)", icon: "fa-solid fa-paper-plane", path: "/branches/transfer-request" },
    { name: "View Move Requests", icon: "fa-solid fa-list", path: "/branches/move-requests" },
    { name: "Update Inventory", icon: "fa-solid fa-boxes-packing", path: "/admin/inventory/update" },
    { name: "Branch Summary", icon: "fa-solid fa-layer-group", path: "/branch-summary" },
    { name: "Profile", icon: "fa-regular fa-user", path: "/profile" },
    { name: "Patients (Pets)", icon: "fa-solid fa-dog", path: "/pets" },
    { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    { name: "Inventory", icon: "fa-solid fa-box", path: "/inventory" }
  ];

  const doctorMenu = [
    { name: "Doctor Dashboard", icon: "fa-solid fa-stethoscope", path: "/doctor" },
    { name: "Profile", icon: "fa-regular fa-user", path: "/profile" },
    { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    { name: "Update Inventory", icon: "fa-solid fa-boxes-packing", path: "/admin/inventory/update" },
    { name: "Inventory", icon: "fa-solid fa-box", path: "/inventory" },
    { name: "Patients (Pets)", icon: "fa-solid fa-dog", path: "/pets" },
  ];

  const staffMenu = [
    { name: "Staff Dashboard", icon: "fa-solid fa-user-nurse", path: "/staff-dashboard" },
    { name: "Profile", icon: "fa-regular fa-user", path: "/profile" },
    { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    { name: "Inventory", icon: "fa-solid fa-box", path: "/inventory" },
    { name: "Patients (Pets)", icon: "fa-solid fa-dog", path: "/pets" },
  ];

  // build menuItems safely
  let menuItems = [];

  if (roles.includes("superadmin")) {
    menuItems = superAdminMenu;
  } else if (roles.includes("branchadmin")) {
    menuItems = branchAdminMenu;
  } else if (roles.includes("doctor")) {
    menuItems = doctorMenu;
  } else if (roles.includes("staff")) {
    menuItems = staffMenu;
  } else if (roles.includes("owner")) {
    menuItems = ownerMenu;
  } else {
    // fallback: if no recognized role, show a minimal set (you can change or leave empty)
    menuItems = [
      { name: "Profile", icon: "fa-regular fa-user", path: "/profile" },
      { name: "Patients (Pets)", icon: "fa-solid fa-dog", path: "/pets" },
      { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    ];
  }

  const handleLogoutClick = async () => {
    if (onLogout) await onLogout();
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
              <i className={item.icon} style={{ width: 20 }} aria-hidden="true" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-profile">
        <img src="/images/avatar.png" alt="avatar" />
        <div className="info">
          <div className="user-name">{user?.name || user?.username || "Guest"}</div>
          <div className="user-role">{Array.isArray(user?.role) ? user.role.join(", ") : user?.role}</div>
        </div>

        <button className="logout-btn" onClick={handleLogoutClick}>
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
