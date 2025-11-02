// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import Pets from "./pages/Pets";
import PetDetail from "./pages/PetDetail";
import Profile from "./pages/Profile";
import Auth from "./components/Auth"; // ✅ ใช้ Auth ของคุณ

// Layout
import MainLayout from "./layout/MainLayout";

function App() {
  const [user, setUser] = useState(null);

  // ✅ เมื่อ Login สำเร็จ → เก็บ user ไว้ใน state
  const handleLogin = (userData) => {
    console.log("✅ Logged in:", userData);
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // ✅ ฟังก์ชัน Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  // ✅ โหลดข้อมูลผู้ใช้จาก localStorage (กันรีเฟรชแล้วหลุด)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // 🔒 ถ้ายังไม่ล็อกอิน → ไปหน้า Login
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // ✅ ส่วนหลักหลังล็อกอิน
  return (
    <Router>
      <MainLayout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/pets" element={<Pets user={user} />} />
          <Route path="/pet-detail/:id" element={<PetDetail user={user} />} />
          <Route path="/profile" element={<Profile user={user} />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
