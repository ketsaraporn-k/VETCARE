// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // ✅ ดึง role จาก user
  const getRolesFromUserProp = (u) => {
    if (!u) return [];
    const raw = u.role ?? u.roles ?? null;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(r => String(r).toLowerCase());
    return [String(raw).toLowerCase()];
  };

  const roles = getRolesFromUserProp(user);

  // 🐾 เมนูพื้นฐาน (ทุกคนเห็น)
  const baseMenu = [
    { name: "Dashboard", icon: "fa-solid fa-chart-line", path: "/" },
    { name: "Patients (Pets)", icon: "fa-solid fa-dog", path: "/pets" },
    { name: "Pet Detail (Demo)", icon: "fa-solid fa-id-badge", path: "/pet-detail/1" },
    { name: "Profile", icon: "fa-regular fa-user", path: "/profile" },
    { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    { name: "Inventory", icon: "fa-solid fa-box", path: "/inventory" },
    { name: "Branch Overview", icon: "fa-solid fa-layer-group", path: "/branches/overview" },
    
  ];

  // 👑 Owner (ลูกค้า) — ดูสรุปและนัดหมาย
  const ownerMenu = [
    { name: "Owner Dashboard", icon: "fa-solid fa-chart-line", path: "/" },
    { name: "My Profile", icon: "fa-regular fa-user", path: "/profile" },
    { name: "My Pets", icon: "fa-solid fa-dog", path: "/pets" },
    { name: "Pet Detail ", icon: "fa-solid fa-id-badge", path: "/pet-detail/1" },
    { name: "Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
  ];

  // 🧠 SuperAdmin
  const superAdminMenu = [
    { name: "SuperAdmin Dashboard", icon: "fa-solid fa-shield-halved", path: "/superadmin" },
    { name: "Manage All Branches", icon: "fa-solid fa-building", path: "/branches/manage" },
    { name: "Manage Users & Roles", icon: "fa-solid fa-users-gear", path: "/superadmin/roles" },
    { name: "Move Customers & Staff", icon: "fa-solid fa-arrows-rotate", path: "/branches/transfer" },
    { name: "Move Requests", icon: "fa-solid fa-list", path: "/branches/move-requests" },
    { name: "Consolidated View", icon: "fa-solid fa-chart-pie", path: "/consolidated" },
    { name: "Cash Flow", icon: "fa-solid fa-money-bill", path: "/cash" },
  ];

  // 🏢 Branch Admin
  const branchAdminMenu = [
    { name: "Branch Admin Dashboard", icon: "fa-solid fa-chart-pie", path: "/admin/dashboard" },
    { name: "Request Transfer (staff/customer)", icon: "fa-solid fa-paper-plane", path: "/branches/transfer-request" },
    { name: "View Move Requests", icon: "fa-solid fa-list", path: "/branches/move-requests" },
    { name: "Move Request History", icon: "fa-solid fa-clock-rotate-left", path: "/branches/history" },
    { name: "Stock Alerts & Appointments", icon: "fa-solid fa-bell", path: "/admin/alerts" },
    { name: "Update Inventory", icon: "fa-solid fa-boxes-packing", path: "/admin/inventory/update" },
    { name: "Branch Summary", icon: "fa-solid fa-layer-group", path: "/branch-summary" },
    { name: "Cash Flow", icon: "fa-solid fa-money-bill", path: "/cash" },
  ];



  // 👩‍⚕️ Staff (เมนูเฉพาะของ staff)
  const staffMenu = [
    { name: "Staff Dashboard", icon: "fa-solid fa-user-nurse", path: "/staff-dashboard" },
    { name: "My Appointments", icon: "fa-regular fa-calendar", path: "/appointments" },
    { name: "My Schedule", icon: "fa-solid fa-clock", path: "/schedule" },
    { name: "Inventory", icon: "fa-solid fa-box", path: "/inventory" },
  ];

  // ✅ กำหนดเมนูตาม role
  let menuItems = [...baseMenu];

  if (roles.includes("superadmin")) {
    menuItems = [...superAdminMenu, ...baseMenu];
  } else if (roles.includes("branchadmin")) {
    menuItems = [...branchAdminMenu, ...baseMenu];
  } else if (roles.includes("staff")) {
    menuItems = [...staffMenu, ...baseMenu]; // staff มี sidebar ของตัวเอง
  } else if (roles.includes("owner")) {
    // 👇 owner จะเห็นเฉพาะของตัวเองเท่านั้น
    menuItems = [...ownerMenu];
  } else {
    // ถ้าไม่ใช่ role พิเศษใด ๆ (เช่น staff)
    menuItems = [...baseMenu];
  }

  // 🧭 Logout
  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate("/login");
  };

  // 🖼️ UI
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
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role}</div>
        </div>

        <button className="logout-btn" onClick={handleLogoutClick}>
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
