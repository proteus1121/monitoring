import { getCookie } from '@src/lib/cookieUtils';
import { consumeReturnTo, saveReturnTo } from '@src/lib/returnTo';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

const AuthGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasSessionCookie] = useState<boolean>(() => {
    return !!getCookie('SESSION');
  });
  // after signing in (password or SSO) go back to the page that asked for it
  const [returnTo, setReturnTo] = useState(() => (hasSessionCookie ? consumeReturnTo() : null));

  // only once: a saved page that redirects itself (/ -> /dashboard/overview) would otherwise bounce forever
  useEffect(() => {
    if (!returnTo) return;
    if (returnTo !== location.pathname + location.search) {
      navigate(returnTo, { replace: true });
    }
    setReturnTo(null);
  }, []);

  if (!hasSessionCookie) {
    saveReturnTo(location.pathname + location.search);
    return <Navigate to="/auth/login" replace />;
  }
  if (returnTo) {
    return null;
  }
  return <Outlet />;
};

export default AuthGuard;
