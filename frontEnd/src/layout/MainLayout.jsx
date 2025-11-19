// src/layout/MainLayout.jsx
import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import HeaderBreadcrumb from "../components/HeaderBreadcrumb";
import NotificationPopup from "../components/NotificationPopup";
import "./MainLayout.css";

const MainLayout = ({ user, onLogout }) => {
  const location = useLocation();
  const path = location.pathname || "/";

  // defensive: ensure we always have a user object where UI expects it
  const safeUser = user || (typeof window !== "undefined" && (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })()) || null;

  // choose titles by path (add or tweak cases as you want)
  let title = "Dashboard";
  let subtitle = "Welcome to VetCare Dashboard";

  if (path.startsWith("/pets")) {
    title = "Patients (Pets)";
    subtitle = "Manage all your registered pets";
  } else if (path.startsWith("/pet-detail")) {
    title = "Pet Detail";
    subtitle = "Detailed pet medical information";
  } else if (path.startsWith("/profile")) {
    title = "Profile";
    subtitle = "View and update your profile information";
  } else if (path.startsWith("/appointments")) {
    title = "Appointments";
    subtitle = "View and manage appointments";
  } else if (path.startsWith("/inventory")) {
    title = "Inventory";
    subtitle = "Stock and medicines overview";
  } else if (path.startsWith("/admin")) {
    title = "Branch Admin";
    subtitle = "Admin tools and alerts";
  } else if (path.startsWith("/superadmin")) {
    title = "Super Admin";
    subtitle = "System-wide management";
  } else if (path.startsWith("/branches")) {
    title = "Branches";
    subtitle = "Branch management & transfer requests";
  } else if (path.startsWith("/employee-profile")) {
    title = "Employee Profile";
    subtitle = "----------";
  }

  return (
    <div className="main-layout" style={{ minHeight: "100vh", display: "flex" }}>
      <Sidebar user={safeUser} onLogout={onLogout} />

      <div className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <HeaderBreadcrumb title={title} subtitle={subtitle} user={safeUser} />

        <main className="page-content" style={{ padding: 20, flex: 1, background: "#f6f7fb" }}>
          <Outlet />
        </main>
      </div>

      {/* global notification popup (mounted once) */}
      <NotificationPopup />
    </div>
  );
};

export default MainLayout;