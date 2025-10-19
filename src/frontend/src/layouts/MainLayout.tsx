import Logo from "@src/components/logo/Logo";
import clsx from "clsx";
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

export const MainLayout = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  return (
    <main className="flex min-h-[100dvh] w-full flex-col overflow-hidden">
      <header className="h-20 flex-shrink-0 text-xl bg-blue-500 text-white flex items-center font-bold pl-4 gap-4">
        <div onClick={() => setIsVisible((prev) => !prev)}>Burger</div>
        <Logo />
        Smart Sensor Network
      </header>

      <nav
        className={clsx(
          { "-translate-x-full": !isVisible },
          "w-[220px] transition-all absolute top-20 bg-white",
        )}
      >
        <Link to="/dashboard">Dashboard</Link>
      </nav>

      <div className="flex flex-1 overflow-auto">
        <Outlet />
      </div>
    </main>
  );
};
