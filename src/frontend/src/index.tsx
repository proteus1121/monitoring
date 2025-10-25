import { createRoot } from 'react-dom/client';
import './index.css';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import AuthGuard from './layouts/guards/AuthGuard';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import AuthLayout from './layouts/AuthLayout';
import { ToastProvider } from './components/Toast';
import DashboardPage from './pages/DashboardPage';
import DevicePage from './pages/DevicePage';
import { SelectProvider } from './components/Select';

const App = () => {
  console.log('Backend URL:', process.env.BASE_URL);
  return (
    <ToastProvider>
      <SelectProvider>
        <RouterProvider router={router} />
      </SelectProvider>
    </ToastProvider>
  );
};

createRoot(document.getElementById('root')!).render(<App />);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="auth" element={<AuthLayout />}>
        <Route path="login" element={<SignInPage />} />
        <Route path="register" element={<SignUpPage />} />
      </Route>
      <Route element={<MainLayout />}>
        <Route path="/" element={<AuthGuard />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicePage />} />
          {/* <Route path="/users" element={<UsersPage />} /> */}
          {/* <Route path="/" element={<Navigate to="/dashboard" />} /> */}
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Route>
    </>
  )
);
