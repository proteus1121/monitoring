import Menu from "../../components/menu/Menu";
import React, { useState, useEffect } from 'react';
import './DevicePage.css';

const DevicePage = () => {
    const [devices, setDevices] = useState([]);
    const [form, setForm] = useState({
        id: null,
        name: '',
        description: '',
        criticalValue: '',
        status: 'ACTIVE',
    });

    const fetchDevices = async () => {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/devices`, {credentials: "include"});
        const data = await res.json();
        setDevices(data);
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const resetForm = () => {
        setForm({
            id: null,
            name: '',
            description: '',
            criticalValue: '',
            status: 'ACTIVE',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = form.id ? 'PUT' : 'POST';
        const url = form.id ? `devices/${form.id}` : 'devices';

        await fetch(`${process.env.REACT_APP_BACKEND_URL}/${url}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: form.name,
                description: form.description,
                criticalValue: parseFloat(form.criticalValue),
                status: form.status,
            }),
            credentials: "include"
        });

        resetForm();
        fetchDevices();
    };

    const handleDelete = async (id) => {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/devices/${id}`, { method: 'DELETE', credentials: "include" });
        fetchDevices();
    };

    const handleEdit = (device) => {
        setForm({
            id: device.id,
            name: device.name,
            description: device.description,
            criticalValue: device.criticalValue,
            status: device.status,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="container">
            <Menu />
            <h1>Device Manager</h1>

            <form onSubmit={handleSubmit} className="form">
                <h2>{form.id ? 'Edit Device' : 'Add Device'}</h2>
                <input
                    className="input"
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
                <textarea
                    className="textarea"
                    placeholder="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                />
                <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder="Critical Value"
                    value={form.criticalValue}
                    onChange={(e) => setForm({ ...form, criticalValue: e.target.value })}
                    required
                />
                <select
                    className="select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                </select>
                <div className="button-row">
                    <button type="submit" className="button">Save</button>
                    <button type="button" className="button-outline" onClick={resetForm}>Cancel</button>
                </div>
            </form>

            <div className="device-list">
                {devices.map((device) => (
                    <div key={device.id} className="card">
                        <h3>{device.name}</h3>
                        <p>{device.description}</p>
                        <p><strong>Critical Value:</strong> {device.criticalValue}</p>
                        <p><strong>Status:</strong> {device.status}</p>
                        <p><strong>Last Checked:</strong> {device.lastChecked?.replace('T', ' ').slice(0, 19) || '—'}</p>
                        <div className="button-row">
                            <button onClick={() => handleEdit(device)} className="button">Edit</button>
                            <button onClick={() => handleDelete(device.id)} className="button-danger">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DevicePage;