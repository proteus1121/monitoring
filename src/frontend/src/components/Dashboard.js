// src/components/Dashboard.js
import React, {useState} from 'react';
import SensorDataChart from "./SensorDataChart";
import DeviceDropdown from "./DeviceDropdown";
import GeneralDataChart from "./GeneralDataChart";

const Dashboard = () => {
    const [selectedDevice, setSelectedDevice] = useState({id: null, criticalValue: null});

    const handleDeviceSelection = (deviceId, criticalValue) => {
        setSelectedDevice({id: deviceId, criticalValue});
    };

    return (
        <div className="container">
            <h2>Welcome to the Dashboard</h2>
            <DeviceDropdown onDeviceSelect={handleDeviceSelection}/>
            {(<GeneralDataChart/>)}
            {selectedDevice && (
                <SensorDataChart deviceId={selectedDevice.id} criticalValue={selectedDevice.criticalValue}/>
            )}
        </div>
    );
};

export default Dashboard;
