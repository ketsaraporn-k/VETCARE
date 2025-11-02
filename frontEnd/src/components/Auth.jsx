// src/components/Auth.jsx
import React, { useState } from "react";
import "./Auth.css";


export default function Auth({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Login failed"}`);
        return;
      }

      alert(`✅ Welcome ${data.user.name} (${data.user.role})`);
      localStorage.setItem("token", data.token); // เก็บ token ไว้ใช้ต่อ
      onLogin(data.user); // ส่งข้อมูล user กลับไปให้ App.jsx
    } catch (err) {
      console.error("Login error:", err);
      alert("Server error!");
    }
  };

  return (
    <div className="auth-container">
      <h2>🔐 Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
