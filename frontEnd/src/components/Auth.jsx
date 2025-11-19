// src/components/Auth.jsx
import React, { useState } from "react";
import api from "../api/axiosConfig";
import "./Auth.css";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");

  //  เพิ่มฟิลด์ confirmPassword + name สำหรับสมัคร
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "", //  เพิ่ม
    name: "" //  เพิ่ม
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // ⭐ เพิ่ม state สำหรับ Show / Hide password
  const [showPassword, setShowPassword] = useState(false);  // ⭐ เพิ่ม
  const [showConfirm, setShowConfirm] = useState(false);    // ⭐ เพิ่ม

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg("");

    try {
      if (mode === "register") {
        //  ตรวจสอบว่ารหัสผ่านตรงกันหรือไม่
        if (form.password !== form.confirmPassword) {
          setError("Passwords do not match!");
          setLoading(false);
          return;
        }

        //  ส่งข้อมูลเพิ่ม name ไปด้วย
        await api.post("/api/users/register", {
          username: form.username,
          password: form.password,
          name: form.name
        });

        setSuccessMsg("Account created! Please log in.");
        setMode("login");

        //  reset ฟอร์มใหม่ทั้งหมด
        setForm({
          username: "",
          password: "",
          confirmPassword: "",
          name: ""
        });

        return;
      }

      // ---------------- LOGIN MODE ----------------
      const res = await api.post("/api/users/login", form);
      const returned = res.data || {};

      if (returned.token) localStorage.setItem("token", returned.token);

      let user = returned.user || null;
      if (!user) {
        const prof = await api.get("/api/users/profile");
        user = prof.data;
      }

      localStorage.setItem("user", JSON.stringify(user));
      if (onLogin) onLogin(user);

    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Branding Header */}
        <div className="brand">
          <img src="/clinic.png" alt="Vetcare Logo" className="brand-logo" />
          <div className="brand-text">
            <h1>VETCARE</h1>
            <p>Veterinary Clinic Management System</p>
          </div>
        </div>

        <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>

        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="auth-success">{successMsg}</div>}

        <form onSubmit={handleSubmit}>

          {/*  ฟิลด์เฉพาะ Register: Full Name */}
          {mode === "register" && (
            <>
              <label>Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </>
          )}

          <label>Username</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />

          {/* ⭐ PASSWORD with Show/Hide */}
          <label>Password</label>
          <div className="password-wrapper">   {/* ⭐ เพิ่ม wrapper */}
            <input
              type={showPassword ? "text" : "password"}   // ⭐ เปลี่ยน type
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />

            {/* ⭐ ปุ่มสลับ Show/Hide */}
            <span
              className="toggle-pass"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
            </span>
          </div>

          {/*  ฟิลด์เฉพาะ Register: Confirm Password */}
          {mode === "register" && (
            <>
              <label>Confirm Password</label>

              {/* ⭐ Confirm password with Show/Hide */}
              <div className="password-wrapper">   {/* ⭐ เพิ่ม wrapper */}
                <input
                  type={showConfirm ? "text" : "password"}  // ⭐ เปลี่ยน type
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />

                {/* ⭐ ปุ่ม Show/Hide */}
                <span
                  className="toggle-pass"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  <i className={showConfirm ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                </span>
              </div>
            </>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="switch-mode">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <span onClick={() => setMode("register")}>Create one</span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span onClick={() => setMode("login")}>Sign in</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
