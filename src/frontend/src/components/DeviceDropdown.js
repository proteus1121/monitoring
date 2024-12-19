import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DeviceDropdown = ({ onDeviceSelect }) => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDevices = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/devices`, {withCredentials: true});
            setDevices(response.data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleSelectionChange = (event) => {
        const deviceId = Number(event.target.value);
        const selectedDevice = devices.find((device) => device.id === deviceId);

        if (selectedDevice) {
            onDeviceSelect(deviceId, selectedDevice.criticalValue);
        } else {
            onDeviceSelect(null, null);
        }
    };

    if (loading) return <p>Loading devices...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <label htmlFor="device-select">Select a Device:</label>
            <select id="device-select" onChange={handleSelectionChange}>
                <option value="">-- Choose a Device --</option>
                {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                        {device.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default DeviceDropdown;