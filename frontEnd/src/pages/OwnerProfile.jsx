// src/pages/OwnerProfile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./OwnerProfile.css";

const OwnerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ ดึงข้อมูลโปรไฟล์
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching profile:", error);
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // ✅ บันทึกการแก้ไข
  const handleSave = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.put(
      `http://localhost:3000/api/users/${profile._id}`,
      profile,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // ✅ ถ้า backend ไม่ส่ง avatar กลับ ให้ใช้ของเดิม
    setProfile({
      ...res.data.user,
      avatar: res.data.user.avatar || profile.avatar,
    });

    setIsEditing(false);
    alert("✅ บันทึกข้อมูลสำเร็จ");
  } catch (error) {
    console.error("❌ Error saving profile:", error);
    alert("ไม่สามารถบันทึกข้อมูลได้");
  }
};

  //  อัปโหลดรูปโปรไฟล์
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:3000/api/users/upload-avatar",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setProfile({ ...profile, avatar: res.data.avatar });
      alert("✅ อัปโหลดรูปสำเร็จ");
    } catch (error) {
      console.error("❌ Error uploading avatar:", error);
      alert("ไม่สามารถอัปโหลดรูปได้");
    }
  };


  if (loading) return <p>⏳ กำลังโหลดข้อมูล...</p>;
  if (!profile) return <p>ไม่พบข้อมูลผู้ใช้</p>;

  return (
    <div className="profile-page">
      <h2>ข้อมูลส่วนตัว</h2>

      <div className="profile-card">
        <div className="avatar-section">
          <img
    src={
      profile.avatar
        ? profile.avatar.startsWith("http")
          ? profile.avatar
          : `http://localhost:3000${profile.avatar}`
        : "/default-avatar.png"
    }
    alt="avatar"
    className="profile-avatar"
  />

  {isEditing && (
    <input type="file" accept="image/*" onChange={handleUpload} />
  )}
        </div>

        <div className="info-section">
          <label>ชื่อ-นามสกุล</label>
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={profile.name || ""}
              onChange={handleChange}
            />
          ) : (
            <p>{profile.name}</p>
          )}

          <label>อีเมล</label>
          {isEditing ? (
            <input
              type="email"
              name="email"
              value={profile.email || ""}
              onChange={handleChange}
            />
          ) : (
            <p>{profile.email}</p>
          )}

          <label>เบอร์โทร</label>
          {isEditing ? (
            <input
              type="text"
              name="phone"
              value={profile.phone || ""}
              onChange={handleChange}
            />
          ) : (
            <p>{profile.phone}</p>
          )}
        </div>

        <div className="button-section">
          {isEditing ? (
            <>
              <button className="save-btn" onClick={handleSave}>
                💾 บันทึก
              </button>
              <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                ❌ ยกเลิก
              </button>
            </>
          ) : (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              ✏️ แก้ไขข้อมูล
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile;
