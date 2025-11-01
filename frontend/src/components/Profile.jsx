import React from "react";

export default function Profile({ user }) {
  if (!user) return <p>No profile data</p>;

  return (
    <div className="profile-card">
      <h2>👤 Profile</h2>
      <p><b>Name:</b> {user.username}</p>
      <p><b>Role:</b> {user.role}</p>
    </div>
  );
}
