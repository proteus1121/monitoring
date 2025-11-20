import { Icon } from '@iconify/react';
import Logo from '@src/components/logo/Logo';
import { removeCookie } from '@src/lib/cookieUtils';
import { useOutsideClickDetector } from '@src/lib/useOutsideClickDetector';
import { useUi } from '@src/redux/ui/ui.hook';
import clsx from 'clsx';
import { Accordion, Collapsible } from 'radix-ui';
import { ReactNode, useRef, useState } from 'react';
import { NavLink, Outlet, To, useNavigate } from 'react-router-dom';

export const MainLayout = () => {
  const { state, setState } = useUi();

  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState<boolean>(true);

  const [isDashboardCollapsed, setIsDashboardCollapsed] =
    useState<boolean>(true);

  return (
    <main className="min-h-screen bg-gray-50">
      <div
        className={clsx(
          'absolute z-20 h-full w-full bg-black/10 transition lg:pointer-events-none lg:opacity-0',
          [
            state.isSidebarCollapsed
              ? 'pointer-events-none opacity-0'
              : 'opacity-100',
          ]
        )}
        onClick={() =>
          setState({ ...state, isSidebarCollapsed: !state.isSidebarCollapsed })
        }
      />

      <aside
        className={clsx(
          'lg:translate-x-0 lg:opacity-100',
          [state.isSidebarCollapsed ? '-translate-x-full' : 'bg-red-500'],
          'fixed top-0 left-0 z-50 h-full w-64 transform border-r border-black/10 bg-white transition-transform duration-300'
        )}
      >
        <div className="h-header flex items-center justify-between border-b border-black/10 p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <Logo className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Smart Sensor Network</h2>
            </div>
          </div>
        </div>
        <nav className="space-y-2 p-4">
          <Collapsible.Root open={isDashboardCollapsed} className="group">
            <Collapsible.Trigger className="contents">
              <NavLink
                to={'/dashboard'}
                onClick={e => {
                  e.preventDefault();
                  setIsDashboardCollapsed(prev => !prev);
                }}
                className={({ isActive }) =>
                  clsx(
                    [
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100',
                    ],
                    'flex w-full items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors'
                  )
                }
              >
                <Icon icon={'lucide:home'} className="size-5" />
                Dashboard
                <Icon
                  icon={'lucide:chevron-down'}
                  className="group-radix-state-open:rotate-180 ml-auto size-5 transition"
                />
              </NavLink>
            </Collapsible.Trigger>
            <Collapsible.Content className="radix-state-open:animate-collapsible-slide-down radix-state-closed:animate-collapsible-slide-up mt-2 ml-4 space-y-2 overflow-hidden">
              <Link to={'/dashboard/overview'}>
                <Icon icon={'lucide:home'} className="size-5" />
                Overview
              </Link>
              <Link to={'/dashboard/map'}>
                <Icon icon={'lucide:map'} className="size-5" />
                Map
              </Link>
            </Collapsible.Content>
          </Collapsible.Root>
          <Collapsible.Root open={isSettingsCollapsed} className="group">
            <Collapsible.Trigger className="contents">
              <NavLink
                to={'/settings'}
                onClick={e => {
                  e.preventDefault();
                  setIsSettingsCollapsed(prev => !prev);
                }}
                className={({ isActive }) =>
                  clsx(
                    [
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100',
                    ],
                    'flex w-full items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors'
                  )
                }
              >
                <Icon icon={'lucide:settings'} className="size-5" />
                Settings
                <Icon
                  icon={'lucide:chevron-down'}
                  className="group-radix-state-open:rotate-180 ml-auto size-5 transition"
                />
              </NavLink>
            </Collapsible.Trigger>
            <Collapsible.Content className="radix-state-open:animate-collapsible-slide-down radix-state-closed:animate-collapsible-slide-up mt-2 ml-4 space-y-2 overflow-hidden">
              <Link to={'/settings/devices'}>
                <Icon icon={'lucide:microchip'} className="size-5" />
                Devices
              </Link>
              <Link to={'/settings/configurations'}>
                <Icon icon={'lucide:wrench'} className="size-5" />
                Configurations
              </Link>
              <Link to={'/settings/users'}>
                <Icon icon={'lucide:users'} className="size-5" />
                Users
              </Link>
              <Link to={'/settings/alerts'}>
                <Icon icon={'lucide:bell'} className="size-5" />
                Alerts
              </Link>
            </Collapsible.Content>
          </Collapsible.Root>
        </nav>

        <div className="absolute right-0 bottom-0 left-0 border-t border-black/10 bg-gray-50 p-4">
          <div className="text-xs text-gray-500">
            <p className="mb-1 font-medium">System Status</p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>All
              systems operational
            </p>
          </div>
        </div>
      </aside>

      {/*<aside
        className={clsx(
          // { '-translate-x-full opacity-0': !isVisible },
          'fixed top-0 left-0 z-50 h-full w-64 border-r bg-white transition-transform duration-300'
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
          Sensors
        </Link>
        <Link
          to="/notifications"
          className="flex w-full items-center gap-1.5 rounded-lg p-2 font-bold text-blue-500 transition-all hover:bg-blue-500/10 hover:text-blue-700"
        >
          <Icon
            icon="material-symbols:notification-add-outline"
            className="size-8"
          />
          Alerts
        </Link>
      </aside>*/}

      <div className="lg:pl-64">
        <Outlet />
      </div>
    </main>
  );
};

function Link(props: { children: ReactNode; to: To }) {
  return (
    <NavLink
      className={({ isActive }) =>
        clsx(
          [
            isActive
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100',
          ],
          'flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-normal transition-colors'
        )
      }
      to={props.to}
    >
      {props.children}
    </NavLink>
  );
}
