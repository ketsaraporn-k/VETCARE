import React, { useEffect, useState } from "react";
import { getUpcoming } from "../api/appointmentApi";

const NotificationPopup = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getUpcoming().then(res => setNotifications(res.data)).catch(() => {});
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-xl shadow-lg">
      <h4 className="font-bold mb-2">📅 นัดหมายใกล้ถึง</h4>
      <ul>
        {notifications.map(n => (
          <li key={n._id}>
            {n.pet.name} — {new Date(n.date).toLocaleDateString()}  
            ({n.purpose})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationPopup;
