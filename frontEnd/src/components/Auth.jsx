// src/components/Auth.jsx
import React, { useState } from "react";
import api from "../api/axiosConfig";
import "./Auth.css";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

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
        await api.post("/api/users/register", form);
        setSuccessMsg("Account created! Please log in.");
        setMode("login");
        setForm({ username: "", password: "" });
        return;
      }

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
          <label>Username</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />

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
