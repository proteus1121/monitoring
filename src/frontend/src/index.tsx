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
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { ModalsProvider } from './redux/modals/ModalsProvider';

const App = () => {
  console.log('Backend URL:', process.env.BASE_URL);
  return (
    <Provider store={store}>
      <SelectProvider>
        <RouterProvider router={router} />
      </SelectProvider>
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
          <Route path="dashboard">
            <Route index element={<Navigate to="/dashboard/overview" />} />

            <Route path="overview" element={<DashboardPage />} />
            <Route element={<>dashboard index page</>} />
          </Route>
          <Route path="settings">
            <Route index element={<Navigate to="/settings/devices" />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="configurations" element={<>configurations</>} />
            <Route path="users" element={<>users</>} />
            <Route path="alerts" element={<>alerts</>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      </Route>
    </Route>
  )
);
