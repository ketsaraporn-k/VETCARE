// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages...
import Dashboard from "./pages/Dashboard";
import Pets from "./pages/Pets";
import PetDetail from "./pages/PetDetail";
import Profile from "./pages/Profile";
import Auth from "./components/Auth";
import Appointments from "./pages/Appointments";
import Inventory from "./pages/Inventory";
import CashFlow from "./pages/CashFlow";
import ConsolidatedView from "./pages/ConsolidatedView";
import StaffDashboard from "./pages/StaffDashboard";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAlerts from "./pages/admin/Alerts";
import AdminInventoryUpdate from "./pages/admin/InventoryUpdate";
import MoveRequest from "./pages/admin/MoveRequest";
import MoveRequestsList from "./pages/admin/MoveRequestsList";
import MoveRequestHistory from "./pages/admin/MoveRequestHistory";
import BranchSummary from "./pages/BranchSummary";

// superAdmin pages
import UserRoleManage from "./pages/superAdmin/UserRoleManage.jsx";
import BranchManage from "./pages/superAdmin/BranchManage";
import BranchTransfer from "./pages/superAdmin/BranchTransfer";
import SuperAdmin from "./pages/superAdmin/SuperAdmin";

// Owner pages
import OwnerDashboard from "./pages/OwnerPet/OwnerDashboard";
import OwnerPetDetail from "./pages/OwnerPet/OwnerPetDetail";
import OwnerProfile from "./pages/OwnerPet/OwnerProfile";



// Layout
import MainLayout from "./layout/MainLayout";

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

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
              <Route path="pets" element={<Pets user={user} />} />
              <Route path="pet-detail/:id" element={<PetDetail user={user} />} />
              <Route path="profile" element={<Profile user={user} />} />
              <Route path="appointments" element={<Appointments user={user} />} />
              <Route path="inventory" element={<Inventory user={user} />} />
              <Route path="cash" element={<CashFlow user={user} />} />
              <Route path="/consolidated" element={<ConsolidatedView />} />
              <Route path="/staff-dashboard" element={<StaffDashboard />} />

              {/* admin area */}
              <Route path="admin/dashboard" element={<AdminDashboard user={user} />} />
              <Route path="admin/alerts" element={<AdminAlerts user={user} />} />
              <Route path="admin/inventory/update" element={<AdminInventoryUpdate user={user} />} />
              <Route path="branches/history" element={<MoveRequestHistory user={user} />} />
              <Route path="/branch-summary" element={<BranchSummary />} />

              {/* superadmin area */}
              <Route path="superadmin" element={<SuperAdmin user={user} />} />
              <Route path="/superadmin/roles" element={<UserRoleManage />} />
              <Route path="branches/manage" element={<BranchManage user={user} />} />
              <Route path="branches/transfer-request" element={<MoveRequest user={user} />} />
              <Route path="branches/move-requests" element={<MoveRequestsList user={user} />} />
              <Route path="branches/transfer" element={<BranchTransfer user={user} />} />


              {/* owner area */}
              <Route path="owner/dashboard" element={<OwnerDashboard user={user} />} />
              <Route path="owner/pet/:id" element={<OwnerPetDetail user={user} />} />
              <Route path="owner/profile" element={<OwnerProfile user={user} />} />

            </Route>

            <Route path="/login" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
