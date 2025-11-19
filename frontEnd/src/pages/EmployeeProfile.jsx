
// src/pages/EmployeeProfile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./EmployeeProfile.css";

const EmployeeProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    addressUser: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/users/me"); 
        setProfile(res.data);
        setFormData({
          name: res.data.name || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          addressUser: res.data.addressUser || "",
        });
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    try {
      const res = await axios.put("/users/update-profile", formData);
      setProfile(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  if (loading) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile-container">
      <h2>User Profile</h2>

      <div className="profile-card">
        <div className="profile-picture-section">
          {profile?.profilePicture?.url ? (
            <img
              src={profile.profilePicture.url}
              alt="Profile"
              className="profile-img"
            />
          ) : (
            <div className="profile-img placeholder">No Image</div>
          )}
        </div>

        <div className="profile-info">
          {/* Username & Role cannot be edited */}
          <p>
            <strong>Username:</strong> {profile.username}
          </p>
          <p>
            <strong>Role:</strong> {profile.role}
          </p>

          {isEditing ? (
            <>
              <label>Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
              />

              <label>Email</label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
              />

              <label>Phone</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />

              <label>Address</label>
              <textarea
                name="addressUser"
                value={formData.addressUser}
                onChange={handleChange}
              />

              <button className="save-btn" onClick={saveProfile}>
                Save
              </button>
              <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <p>
                <strong>Name:</strong> {profile.name}
              </p>
              <p>
                <strong>Email:</strong> {profile.email || "-"}
              </p>
              <p>
                <strong>Phone:</strong> {profile.phone || "-"}
              </p>
              <p>
                <strong>Address:</strong> {profile.addressUser || "-"}
              </p>

              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
