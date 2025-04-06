// src/pages/DashboardPage.js
import React from "react";
import Dashboard from "../components/Dashboard";
import Menu from "../components/menu/Menu";

const DashboardPage = () => {
    return (
        <div>
            <Menu />
            <h1>Dashboard Page</h1>
            <Dashboard />
        </div>
    );
};

export default DashboardPage;
