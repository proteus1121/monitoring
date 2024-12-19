// src/components/Dashboard.js
import React from "react";
import SensorDataChart from "./SensorDataChart";

const Dashboard = () => {
    return (
        <div className="container">
            <h2>Welcome to the Dashboard</h2>
        <SensorDataChart deviceId={1}></SensorDataChart>
        </div>
    );
};

export default Dashboard;
