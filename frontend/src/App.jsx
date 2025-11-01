import React, { useState } from "react";
import Auth from "./components/Auth.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Profile from "./components/Profile.jsx";
import Pets from "./components/Pets.jsx";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  // ✅ ฟังก์ชันนี้จะถูกส่งไปให้ Auth.jsx เรียกเมื่อ login สำเร็จ
  const handleLogin = (userData) => {
    console.log("✅ Logged in:", userData);
    setUser(userData);
  };

  // ถ้ายังไม่ล็อกอิน → แสดงหน้า Login
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // ถ้าเป็น Admin หรือ Staff → เข้าหน้า Dashboard
  if (user.role === "admin" || user.role === "staff") {
    return <Dashboard user={user} />;
  }

  // ถ้าเป็นเจ้าของสัตว์ (owner) → เข้าหน้า Profile/Pets
  return (
    <div>
      <Profile user={user} />
      <Pets user={user} />
    </div>
  );
}

export default App;
