import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const getCookie = (name: string) => {
  const cookies = document.cookie.split('; ');
  const cookie = cookies.find(c => c.startsWith(`${name}=`));
  return cookie ? cookie.split('=')[1] : null;
};

const AuthGuard = () => {
  //TODO: ADD /ME req
  const [hasSessionCookie] = useState<boolean>(() => {
    console.log(getCookie('SESSION'));
    return !!getCookie('SESSION');
  });

  return <Outlet />;
  // return hasSessionCookie ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default AuthGuard;
