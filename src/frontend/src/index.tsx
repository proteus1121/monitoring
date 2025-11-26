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
import { ApiProvider } from './lib/api/ApiProvider';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { ModalsProvider } from './redux/modals/ModalsProvider';
import NotificationsPage from './pages/NotificationsPage/AlertsPage';
import { DashboardPage } from './pages/DashboardPage/DashboardPage';

const App = () => {
  console.log('Backend URL:', process.env.BASE_URL);
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
};

createRoot(document.getElementById('root')!).render(<App />);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      // INFO: because we are using useNavigate() inside this provider
      element={
        <ApiProvider>
          <Outlet />
          <ModalsProvider />
        </ApiProvider>
      }
    >
      <Route path="auth" element={<AuthLayout />}>
        <Route path="login" element={<SignInPage />} />
        <Route path="register" element={<SignUpPage />} />
      </Route>

      <Route path="/" element={<AuthGuard />}>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard/overview" />} />
          <Route path="dashboard/overview" element={<DashboardPage />} />
          <Route path="dashboard/map" element={<>map</>} />
          <Route path="settings/devices" element={<DevicesPage />} />
          <Route path="settings/configurations" element={<>configurations</>} />
          <Route path="settings/users" element={<>Users</>} />
          <Route path="settings/alerts" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/dashboard/overview" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard/overview" />} />
    </Route>
  )
);
