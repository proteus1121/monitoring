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
import AlertsPage from './pages/AlertsPage';
import { DashboardPage } from './pages/DashboardPage/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { ConnectPage } from './pages/ConnectPage';
import { LibraryPage } from './pages/LibraryPage';
import { FirmwarePage } from './pages/FirmwarePage';
import { CamerasPage } from './pages/CamerasPage';
import { ConfigProvider } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/uk';
import { useLang } from './lib/lang';
import z from 'zod';

const App = () => {
  console.log('Backend URL:', process.env.BASE_URL);
  const lang = useLang();
  // date pickers and other antd parts in the interface language
  dayjs.locale(lang);
  // default form validation messages
  z.config(lang === 'uk' ? z.locales.uk() : z.locales.en());
  return (
    <ConfigProvider locale={lang === 'uk' ? ukUA : enUS}>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </ConfigProvider>
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
        {/* <Route path="/" element={<Outlet />}> */}
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard/overview" />} />
          <Route path="dashboard/overview" element={<DashboardPage />} />
          <Route path="dashboard/cameras" element={<CamerasPage />} />
          {/* Map and Configurations were merged into Devices */}
          <Route path="dashboard/map" element={<Navigate to="/settings/devices" replace />} />
          <Route path="settings/devices" element={<DevicesPage />} />
          {/* "Sign in" on the board's page links here */}
          <Route path="connect" element={<ConnectPage />} />
          {/* boards used to show a code for this page */}
          <Route path="pair" element={<Navigate to="/settings/devices" replace />} />
          <Route path="settings/configurations" element={<Navigate to="/settings/devices" replace />} />
          <Route path="settings/library" element={<LibraryPage />} />
          {/* Modules became the Library: firmware for the first install, then the modules */}
          <Route path="settings/modules" element={<Navigate to="/settings/library" replace />} />
          <Route path="settings/hardware" element={<Navigate to="/settings/library" replace />} />
          <Route path="settings/firmware" element={<FirmwarePage />} />
          <Route path="settings/users" element={<UsersPage />} />
          <Route path="settings/alerts" element={<AlertsPage />} />
          <Route path="*" element={<Navigate to="/dashboard/overview" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard/overview" />} />
    </Route>
  )
);
