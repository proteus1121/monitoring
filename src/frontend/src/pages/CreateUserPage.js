// src/components/CreateUserPage.js
import React, { useState } from "react";
import {Link, useNavigate} from "react-router-dom";

const CreateUserPage = ({ handleLogin }) => {
    const navigate = useNavigate();
    
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/users/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
                credentials: "include",
            });

            if (response.ok) {
                setMessage("User registered successfully!");

                const loginResponse = await handleLogin({ username, password });

                if (loginResponse.success) {
                    // Redirect to dashboard after successful login
                    navigate("/dashboard");
                } else {
                    setMessage(loginResponse.message || "Login failed.");
                }
                
                setUsername("");
                setPassword("");
            } else {
                const errorData = await response.json();
                setMessage(errorData.message || "Registration failed.");
            }
        } catch (error) {
            setMessage("An error occurred. Please try again.");
        }
    };

    return (
        <div className="container">
            <h2>Create User</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Username:
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                    />
                </label>
                <label>
                    Password:
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                    />
                </label>
                <button type="submit">Create</button>
            </form>
            {message && <p>{message}</p>}

            <p>
                Already have an account? <Link to="/login">Login now</Link>
            </p>
        </div>
    );
};

export default CreateUserPage;
