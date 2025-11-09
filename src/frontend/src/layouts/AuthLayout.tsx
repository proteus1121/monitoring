import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden p-8">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
