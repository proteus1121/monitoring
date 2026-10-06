import { Navigate } from 'react-router-dom';
import AuthLayout from '@src/layouts/AuthLayout';
import { getCookie } from '@src/lib/cookieUtils';
import SignInPage from './SignInPage';

/**
 * What a guest sees at the site's address: the project's page with the sign-in form, without a redirect,
 * so search engines index it as the home page. src/prerender.tsx renders this at build time.
 */
export const Landing = () => (
  <AuthLayout>
    <SignInPage />
  </AuthLayout>
);

// signed-in users go on to their dashboard (index.html does it before the page is shown, this is the fallback)
export const HomePage = () =>
  getCookie('SESSION') ? <Navigate to="/dashboard/overview" replace /> : <Landing />;
