// src/components/AuthCheck.js
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const getCookie = (name) => {
    const cookies = document.cookie.split("; ");
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    console.log(cookie);
    return cookie ? cookie.split("=")[1] : null;
};

const AuthCheck = ({ children }) => {
    const navigate = useNavigate();

    useEffect(() => {
        const sessionCookie = getCookie("SESSION");

        if (!sessionCookie) {
            navigate("/login");
        }
    }, [navigate]);

    return children;
};

export default AuthCheck;
