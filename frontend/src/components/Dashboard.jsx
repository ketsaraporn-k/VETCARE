import React, { useState, useEffect } from "react";

export default function Dashboard({ user }) {
  const [pets, setPets] = useState([]);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "staff") {
      // mock data แสดงรายชื่อสัตว์ทั้งหมด
      setPets([
        { id: 1, name: "Lucky", owner: "John", type: "Dog" },
        { id: 2, name: "Milo", owner: "Anna", type: "Cat" },
      ]);
    }
  }, [user]);

  if (!user) return <p>Please login first.</p>;

  if (user.role !== "admin" && user.role !== "staff") {
    return <p>❌ You do not have permission to access the Dashboard.</p>;
  }

  return (
    <div className="dashboard-container">
      <h2>📊 Pet Dashboard</h2>
      <table>
        <thead>
          <tr>
            <th>Pet Name</th>
            <th>Type</th>
            <th>Owner</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pets.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.type}</td>
              <td>{p.owner}</td>
              <td>
                <button onClick={() => alert(`Edit ${p.name}`)}>✏️ Edit</button>
                <button onClick={() => alert(`Delete ${p.name}`)}>🗑 Delete</button>
                <button onClick={() => alert(`View owner: ${p.owner}`)}>👁 View Owner</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
