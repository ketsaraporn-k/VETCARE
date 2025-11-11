// src/components/Auth.jsx
import React, { useState } from "react";
import api from "../api/axiosConfig";
import "./Auth.css";

export default function Auth({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1) send credentials. Backend may return { user } or { token, user } or set httpOnly cookie
      const res = await api.post("/api/users/login", { username, password });

      // backend might return sanitized user (cookie-based) or token+user
      const returned = res.data || {};
      if (returned.token) {
        try { localStorage.setItem("token", returned.token); } catch {}
      }

      // If backend returned user, use it; else fetch profile
      let user = returned.user || null;
      if (!user) {
        // try to fetch profile (cookie or bearer token)
        const prof = await api.get("/api/users/profile");
        user = prof.data;
      }

      if (!user) throw new Error("Login succeeded but no user returned");

      // persist user and call parent
      try { localStorage.setItem("user", JSON.stringify(user)); } catch {}
      if (onLogin) onLogin(user);
    } catch (err) {
      console.error("login err", err);
      const msg = err?.response?.data?.error || err.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Sign in</h2>
        {error && <div className="auth-error">{error}</div>}

        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
