// src/components/LoginPage.js
import React, {useState} from "react";
import {Link, useNavigate} from "react-router-dom";

const LoginPage = ({handleLogin}) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const loginResponse = await handleLogin({username, password});

        if (loginResponse.success) {
            // Redirect to dashboard after successful login
            navigate("/dashboard");
        } else {
            setMessage(loginResponse.message || "Login failed.");
        }

        setUsername("");
        setPassword("");
    };

    return (
        <div className="container">
            <h2>Login</h2>
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
                <button type="submit">Login</button>
            </form>
            {message && <p>{message}</p>}

            <p>
                Don't have an account? <Link to="/register">Register now</Link>
            </p>
        </div>
    );
};

export default LoginPage;
