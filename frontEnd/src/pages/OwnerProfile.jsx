// / frontEnd/src/pages/OwnerProfile.jsx 
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./OwnerProfile.css";

const OwnerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  //   โหลดข้อมูลผู้ใช้
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data.user || res.data;

        setProfile({
          ...user,
          id: user.id || user._id,
          addressUser: user.addressUser || "", // ✅ เพิ่ม fallback
          profilePicture: user.profilePicture || { url: null, filename: null }, // ✅ เพิ่ม fallback
        });

        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching profile:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
        }
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // input-change
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  //  บันทึกข้อมูล owner
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.put(
        `http://localhost:3000/api/users/${profile.id}`,
        {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          addressUser: profile.addressUser,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updated = res.data.user || res.data;

      setProfile({
        ...updated,
        id: updated.id || updated._id,
        addressUser: updated.addressUser || "",
        profilePicture: updated.profilePicture || profile.profilePicture,
      });

      setIsEditing(false);
      alert("✅ บันทึกข้อมูลสำเร็จ");
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      alert("ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  //  อัปโหลดรูปภาพ
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

      setProfile({
        ...profile,
        profilePicture: res.data.profilePicture || profile.profilePicture,
      });

      alert("✅ อัปโหลดรูปสำเร็จ");
    } catch (error) {
      console.error("❌ Error uploading avatar:", error);
      alert("ไม่สามารถอัปโหลดรูปได้");
    }
  };

  // Loading state
  if (loading) return <p>⏳ กำลังโหลดข้อมูล...</p>;
  if (!profile) return <p>ไม่พบข้อมูลผู้ใช้</p>;

  return (
    <div className="profile-page">
      <h2>ข้อมูลส่วนตัว</h2>

      <div className="profile-card">
        <div className="avatar-section">
          <img
            src={
              profile.profilePicture?.url
                ? `http://localhost:3000${profile.profilePicture.url}`
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

          <label>ที่อยู่</label>
          {isEditing ? (
            <input
              type="text"
              name="addressUser"
              value={profile.addressUser || ""}
              onChange={handleChange}
            />
          ) : (
            <p>{profile.addressUser}</p>
          )}

          <label>สัตว์เลี้ยง</label>
          {profile.pets && profile.pets.length > 0 ? (
            <ul className="pet-list">
              {profile.pets.map((pet) => (
                <li key={pet._id || pet.id}>
                  {pet.name} ({pet.species || "ไม่ระบุ"}, {pet.breed || "ไม่ระบุ"})
                </li>
              ))}
            </ul>
          ) : (
            <p>ยังไม่มีสัตว์เลี้ยง</p>
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
