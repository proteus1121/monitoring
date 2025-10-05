// src/App.js
import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthCheck from "./components/AuthCheck";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CreateUserPage from "./pages/CreateUserPage";
import DevicePage from "./pages/device/DevicePage";
import UsersPage from "./pages/UsersPage";

const App = () => {

    const handleLogin = async ({ username, password }) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/users/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
                credentials: "include", // Store session in cookies
            });

            if (response.ok) {
                return { success: true };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message };
            }
        } catch (error) {
            return { success: false, message: "An error occurred. Please try again." };
        }
    };
    
    return (
        <Router>
            <div>
                <Routes>
                    <Route path="/login" element={<LoginPage handleLogin={handleLogin} />} />
                    <Route path="/register" element={<CreateUserPage handleLogin={handleLogin} />} />
                    <Route
                        path="/dashboard"
                        element={
                            <AuthCheck>
                                <DashboardPage />
                            </AuthCheck>
                        }
                    />
                    <Route path="/devices" element={<DevicePage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
