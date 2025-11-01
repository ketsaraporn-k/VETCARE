import React, { useState, useEffect } from "react";

export default function Pets({ user }) {
  const [pets, setPets] = useState([]);

  useEffect(() => {
    if (user) {
      // mock ข้อมูลสัตว์เลี้ยง
      setPets([
        { id: 1, name: "Lucky", type: "Dog" },
        { id: 2, name: "Milo", type: "Cat" },
      ]);
    }
  }, [user]);

  return (
    <div>
      <h2>🐶 Your Pets</h2>
      <ul>
        {pets.map((p) => (
          <li key={p.id}>{p.name} ({p.type})</li>
        ))}
      </ul>
    </div>
  );
}
