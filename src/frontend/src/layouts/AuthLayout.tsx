import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col overflow-hidden">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
