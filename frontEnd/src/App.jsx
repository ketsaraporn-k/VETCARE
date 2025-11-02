// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import Pets from "./pages/Pets";
import PetDetail from "./pages/PetDetail";
import Profile from "./pages/Profile";
import Auth from "./components/Auth";

// Layout
import MainLayout from "./layout/MainLayout";

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    console.log("✅ Logged in:", userData);
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

  // ถ้ายังไม่ล็อกอิน → ไปหน้า /login (หรือแสดง Auth)
  // ผมใช้ route /login เพื่อรองรับการเข้าหน้าตรง ๆ
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
              {/* เพิ่ม routes อื่น ๆ ที่ต้องการ */}
            </Route>
            <Route path="/login" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
