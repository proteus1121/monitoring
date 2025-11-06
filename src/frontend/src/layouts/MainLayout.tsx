import { Icon } from '@iconify/react';
import Logo from '@src/components/logo/Logo';
import { removeCookie } from '@src/lib/cookieUtils';
import { useOutsideClickDetector } from '@src/lib/useOutsideClickDetector';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

export const MainLayout = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const navigate = useNavigate();
  const navRef = useRef(null);
  useOutsideClickDetector(navRef, () => {
    setIsVisible(false);
  });
  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden">
      {/* Фиксированная шапка */}
      <header className="h-header flex flex-shrink-0 items-center gap-4 bg-blue-500 pl-4 text-xl font-bold text-white">
        <div onClick={() => setIsVisible(prev => !prev)}>
          <Icon
            icon="material-symbols:menu-rounded"
            className="size-8 cursor-pointer"
          />
        </div>
        <Logo />
        Smart Sensor Network
      </header>

      <div className="relative flex-1 overflow-y-auto">
        <Outlet />
      </div>

      <div
        className={clsx(
          { '-translate-x-full opacity-0': !isVisible },
          'pointer-events-none fixed top-20 h-[calc(100%-80px)] w-[100vw] transition-all'
        )}
      >
        <nav
          ref={navRef}
          className={clsx(
            'pointer-events-auto flex h-full w-[220px] flex-col items-center gap-1 bg-white p-2 shadow-xl transition-all'
          )}
        >
          <Link
            to="/dashboard"
            className="flex w-full items-center gap-1.5 rounded-lg p-2 font-bold text-blue-500 transition-all hover:bg-blue-500/10 hover:text-blue-700"
          >
            <Icon icon="mdi:home" className="size-8" />
            Dashboard
          </Link>
          <Link
            to="/devices"
            className="flex w-full items-center gap-1.5 rounded-lg p-2 font-bold text-blue-500 transition-all hover:bg-blue-500/10 hover:text-blue-700"
          >
            <Icon
              icon="material-symbols:settings-outline-rounded"
              className="size-8"
            />
            Devices
          </Link>
          <button
            className="mt-auto flex w-full items-center gap-1.5 rounded-lg p-2 font-bold text-red-500 transition-all hover:bg-red-500/10 hover:text-red-700"
            onClick={() => {
              removeCookie('SESSION');
              navigate('/auth/login');
            }}
          >
            <Icon icon="material-symbols:logout-rounded" className="size-8" />
            Logout
          </button>
        </nav>
      </div>
    </main>
  );
};
