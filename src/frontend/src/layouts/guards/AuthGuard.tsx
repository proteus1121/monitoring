import { getCookie } from '@src/lib/cookieUtils';
import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AuthGuard = () => {
  const [hasSessionCookie] = useState<boolean>(() => {
    return !!getCookie('SESSION');
  });

  return hasSessionCookie ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default AuthGuard;
