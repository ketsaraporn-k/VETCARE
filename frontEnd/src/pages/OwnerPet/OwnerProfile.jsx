// src/pages/OwnerPet/OwnerProfile.jsx
import React, { useState, useEffect } from "react";
import "./OwnerProfile.css";

const Profile = () => {
  const [user, setUser] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    // ดึงข้อมูล user จาก backend
    const fetchUser = async () => {
      const res = await fetch("http://localhost:3000/api/users/me");
      const data = await res.json();
      setUser(data);
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    await fetch("http://localhost:3000/api/users/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    alert("Profile updated successfully!");
  };

  return (
    <div className="profile-page">
      <h2>My Profile</h2>
      <div className="profile-form">
        <label>Name:</label>
        <input name="name" value={user.name} onChange={handleChange} />

        <label>Phone:</label>
        <input name="phone" value={user.phone} onChange={handleChange} />

        <label>Email:</label>
        <input name="email" value={user.email} onChange={handleChange} />

        <button onClick={handleUpdate}>Update</button>
      </div>
    </div>
  );
};

export default Profile;
