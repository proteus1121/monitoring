import { createRoot } from "react-dom/client";
import "./index.css";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import AuthGuard from "./layouts/guards/AuthGuard";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import AuthLayout from "./layouts/AuthLayout";

const App = () => {
  return <RouterProvider router={router} />;
};

createRoot(document.getElementById("root")!).render(<App />);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route element={<MainLayout />}>
        <Route path="auth" element={<AuthLayout />}>
          <Route path="login" element={<SignInPage />} />
          <Route path="register" element={<SignUpPage />} />
        </Route>
        <Route path="/" element={<AuthGuard />}>
          {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
          {/* <Route path="/devices" element={<DevicePage />} /> */}
          {/* <Route path="/users" element={<UsersPage />} /> */}
          {/* <Route path="/" element={<Navigate to="/dashboard" />} /> */}
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </>,
  ),
);
