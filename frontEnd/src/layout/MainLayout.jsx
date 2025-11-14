// src/layout/MainLayout.jsx
import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import HeaderBreadcrumb from "../components/HeaderBreadcrumb";
import "./MainLayout.css";

const MainLayout = ({ user, onLogout }) => {
  const location = useLocation();
  const path = location.pathname;

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
  } else if (path.startsWith("/owner/dashboard")) {
  title = "My Pets";
  subtitle = "View all your pets and their medical history";
} else if (path.startsWith("/owner/pet")) {
  title = "Pet Medical History";
  subtitle = "Check your pet’s medical record";
} else if (path.startsWith("/owner/profile")) {
  title = "My Profile";
  subtitle = "Manage your personal information";
}

  return (
    <div className="main-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content">
        <HeaderBreadcrumb title={title} subtitle={subtitle} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
