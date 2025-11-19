// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import api from "./api/axiosConfig";

// Pages...
import Dashboard from "./pages/Dashboard.jsx";
import Pets from "./pages/OwnerPets.jsx";
import PetDetail from "./pages/OwnerPetDetail.jsx";
import Profile from "./pages/OwnerProfile.jsx";
import Appointments from "./pages/OwnerAppointments.jsx";
import OwnerDashboard from "./pages/OwnerDashboard.jsx";


import Auth from "./components/Auth";
//Staff/Admin/SuperAdmin 
import StaffPets from "./pages/Pets.jsx";
import StaffPetDetail from "./pages/PetDetail.jsx";
import StaffAppointments from "./pages/StaffAppointments.jsx"; 
import Inventory from "./pages/Inventory";
import CashFlow from "./pages/CashFlow";
import StaffDashboard from "./pages/StaffDashboard";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAlerts from "./pages/admin/Alerts";
import AdminInventoryUpdate from "./pages/admin/InventoryUpdate";
import MoveRequest from "./pages/admin/MoveRequest";
import MoveRequestsList from "./pages/admin/MoveRequestsList";
import BranchSummary from "./pages/BranchSummary";

// superAdmin pages
import UserRoleManage from "./pages/superAdmin/UserRoleManage.jsx";
import BranchManage from "./pages/superAdmin/BranchManage";
import BranchTransfer from "./pages/superAdmin/BranchTransfer";
import SuperAdmin from "./pages/superAdmin/SuperAdmin";
import ConsolidatedCharts from "./pages/ConsolidatedCharts.jsx";

// Layout
import MainLayout from "./layout/MainLayout";

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const role = useMemo(() => String(user?.role || "").toLowerCase(), [user]);
  const isOwner = role === "owner";

  const handleLogin = (userData) => {
    setUser(userData);
    try { localStorage.setItem("user", JSON.stringify(userData)); } catch {}
  };

  const handleLogout = async () => {
    try {
      // try backend logout to clear cookie if backend uses httpOnly cookie
      await api.post("/api/users/logout").catch(() => {});
    } catch {}
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    setUser(null);
  };

  // on mount: try to load user from localStorage, else call profile endpoint
  useEffect(() => {
    let mounted = true;
    const stored = (() => {
      try { return localStorage.getItem("user"); } catch { return null; }
    })();
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        setCheckingAuth(false);
        return;
      } catch (e) { /* ignore */ }
    }

    // fallback: ask server for profile (cookie or bearer token)
    (async () => {
      try {
        const res = await api.get("/api/users/profile");
        if (!mounted) return;
        setUser(res.data);
        try { localStorage.setItem("user", JSON.stringify(res.data)); } catch {}
      } catch (err) {
        // not authenticated or server error -> keep user null
        if (mounted) setUser(null);
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (checkingAuth) {
    return <div style={{padding:20}}>Checking authentication...</div>;
  }

  return (
    <Router>
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Auth onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<MainLayout user={user} onLogout={handleLogout} />}>
              
              <Route index element={<Dashboard user={user} />} />

              {/* หน้า Owner Dashboard สำหรับ Owner */}
              {/* เพิ่ม Route path="/owner" แยกจาก Dashboard เดิม */}
              {isOwner && <Route path="owner" element={<OwnerDashboard user={user} />} />}
                

              {/* Pets list */}
              <Route path="pets" element={isOwner ? <Pets user={user} /> : <StaffPets user={user} />} />

              {/* Pet detail owner */}
              {isOwner ? (
                <Route path="pet-detail/:id" element={<PetDetail user={user} />} />
              ) : (
                <Route path="pet-detail/:ownerId/:petId" element={<StaffPetDetail user={user} />} />
              )}
              
              

              {/* อื่น ๆ */}
              <Route path="profile" element={<Profile user={user} />} />
              <Route path="appointments" element={ isOwner ? (<Appointments user={user} />) : (<StaffAppointments user={user} />)}/>
              <Route path="inventory" element={<Inventory user={user} />} />
              <Route path="cash" element={<CashFlow user={user} />} />
              <Route path="/staff-dashboard" element={<StaffDashboard />} />

              {/* admin area */}
              <Route path="admin/dashboard" element={<AdminDashboard user={user} />} />
              <Route path="admin/alerts" element={<AdminAlerts user={user} />} />
              <Route path="admin/inventory/update" element={<AdminInventoryUpdate user={user} />} />
              <Route path="/branch-summary" element={<BranchSummary />} />

              {/* superadmin area */}
              <Route path="superadmin" element={<SuperAdmin user={user} />} />
              <Route path="/superadmin/roles" element={<UserRoleManage />} />
              <Route path="branches/manage" element={<BranchManage user={user} />} />
              <Route path="branches/transfer-request" element={<MoveRequest user={user} />} />
              <Route path="branches/move-requests" element={<MoveRequestsList user={user} />} />
              <Route path="branches/transfer" element={<BranchTransfer user={user} />} />
              <Route path="consolidated" element={<ConsolidatedCharts user={user} />} />
            </Route>

            <Route path="/login" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;