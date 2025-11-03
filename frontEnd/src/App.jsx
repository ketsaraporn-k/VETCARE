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
import SuperAdmin from "./pages/SuperAdmin";
import BranchManage from "./pages/BranchManage";
import MoveRequest from "./pages/MoveRequest";
import MoveRequestsList from "./pages/MoveRequestsList";
import BranchTransfer from "./pages/BranchTransfer";
import MoveRequestHistory from "./pages/MoveRequestHistory";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAlerts from "./pages/admin/Alerts";
import AdminInventoryUpdate from "./pages/admin/InventoryUpdate";


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
              <Route path="superadmin" element={<SuperAdmin user={user} />} />

              {/* admin area */}
              <Route path="admin/dashboard" element={<AdminDashboard user={user} />} />
              <Route path="admin/alerts" element={<AdminAlerts user={user} />} />
              <Route path="admin/inventory/update" element={<AdminInventoryUpdate user={user} />} />
              <Route path="branches/history" element={<MoveRequestHistory user={user} />} />



              {/* branches area */}
              <Route path="branches/manage" element={<BranchManage user={user} />} />
              <Route path="branches/transfer-request" element={<MoveRequest user={user} />} />
              <Route path="branches/move-requests" element={<MoveRequestsList user={user} />} />
              <Route path="branches/transfer" element={<BranchTransfer user={user} />} />
            </Route>

            <Route path="/login" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
