import { getCookie } from '@src/lib/cookieUtils';
import { consumeReturnTo, saveReturnTo } from '@src/lib/returnTo';
import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const AuthGuard = () => {
  const location = useLocation();
  const [hasSessionCookie] = useState<boolean>(() => {
    return !!getCookie('SESSION');
  });
  // after signing in (password or SSO) go back to the page that asked for it
  const [returnTo] = useState(() => (hasSessionCookie ? consumeReturnTo() : null));

  if (!hasSessionCookie) {
    saveReturnTo(location.pathname + location.search);
    return <Navigate to="/auth/login" replace />;
  }
  if (returnTo && returnTo !== location.pathname + location.search) {
    return <Navigate to={returnTo} replace />;
  }
  return <Outlet />;
};

export default AuthGuard;
