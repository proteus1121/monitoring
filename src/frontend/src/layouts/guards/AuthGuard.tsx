import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const getCookie = (name: string) => {
  const cookies = document.cookie.split("; ");
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));
  return cookie ? cookie.split("=")[1] : null;
};

const AuthGuard = () => {
  const [hasSessionCookie] = useState<boolean>(() => {
    return !!getCookie("SESSION");
  });

  return hasSessionCookie ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default AuthGuard;
