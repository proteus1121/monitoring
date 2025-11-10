import { createRoot } from 'react-dom/client';
import './index.css';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
} from 'react-router-dom';
import '@ant-design/v5-patch-for-react-19';
import { MainLayout } from './layouts/MainLayout';
import AuthGuard from './layouts/guards/AuthGuard';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import AuthLayout from './layouts/AuthLayout';
import DevicesPage from './pages/DevicesPage/DevicesPage';
import { SelectProvider } from './components/Select';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import { ApiProvider } from './lib/api/ApiProvider';
import NotificationsPage from "@src/pages/notification/NotificationsPage";

const App = () => {
  console.log('Backend URL:', process.env.BASE_URL);
  return (
    <SelectProvider>
      <RouterProvider router={router} />
    </SelectProvider>
  );
};

createRoot(document.getElementById('root')!).render(<App />);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route
        // INFO: because we are using useNavigate() inside this provider
        element={
          <ApiProvider>
            <Outlet />
          </ApiProvider>
        }
      >
        <Route path="auth" element={<AuthLayout />}>
          <Route path="login" element={<SignInPage />} />
          <Route path="register" element={<SignUpPage />} />
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/" element={<AuthGuard />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            {/* <Route path="/users" element={<UsersPage />} /> */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      </Route>
    </>
  )
);
