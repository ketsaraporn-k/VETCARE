// src/pages/MoveRequest.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";

const MoveRequest = () => {
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [form, setForm] = useState({ subjectUserId: "", toBranch: "", reason: "", metadata: "" });

    useEffect(() => {
        const load = async () => {
            try {
                const [bRes, uRes] = await Promise.all([api.get("/branches"), api.get("/branchAdmin/users")]); // <--- changed
                setBranches(bRes.data || []);
                setUsers(uRes.data?.users || uRes.data || []);
            } catch (err) { console.error(err); setBranches([]); setUsers([]); }
        };
        load();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post("/branchAdmin/moveRequest", form); // <--- changed
            alert("Move request created");
            setForm({ subjectUserId: "", toBranch: "", reason: "", metadata: "" });
        } catch (err) {
            console.error(err);
            alert("Failed to create move request");
        }
    };

    return (
    <div className="move-request-page">
        <h2>Create Move Request</h2>
        <form onSubmit={handleCreate}>
            <select value={form.subjectUserId} onChange={(e) => setForm({ ...form, subjectUserId: e.target.value })}>
                <option value="">-- select user --</option>
                {users.map(u => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                        {u.username}
                    </option>
                ))}
            </select>

            <select value={form.toBranch} onChange={(e) => setForm({ ...form, toBranch: e.target.value })}>
                <option value="">-- select branch --</option>
                {branches.map(b => (
                    <option key={b._id || b.id} value={b._id || b.id}>{b.branchName}</option>
                ))}
            </select>

            <textarea
                placeholder="Reason (optional)"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            <button type="submit">Submit Request</button>
        </form>
    </div>);
};

export default MoveRequest;
