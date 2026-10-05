import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Header } from '@src/components/Header';
import Logo from '@src/components/logo/Logo';
import { removeCookie } from '@src/lib/cookieUtils';
import { useUi } from '@src/redux/ui/ui.hook';
import clsx from 'clsx';
import { ReactNode } from 'react';
import { NavLink, Outlet, To, useNavigate } from 'react-router-dom';
import { LANGS, setLang, useLang } from '@src/lib/lang';
import { useGetUserQuery } from '@src/redux/generatedApi';

const TEXTS = {
  uk: {
    overview: 'Огляд',
    cameras: 'Камери',
    alerts: 'Сповіщення',
    hardware: 'Обладнання',
    devices: 'Мої пристрої',
    updates: 'Оновлення',
    library: 'Бібліотека',
    access: 'Доступ',
    users: 'Користувачі',
    logout: 'Вийти',
  },
  en: {
    overview: 'Overview',
    cameras: 'Cameras',
    alerts: 'Alerts',
    hardware: 'Hardware',
    devices: 'My devices',
    updates: 'Updates',
    library: 'Library',
    access: 'Access',
    users: 'Users',
    logout: 'Log out',
  },
};

type TextKey = keyof (typeof TEXTS)['en'];

// what is watched day to day first, then the hardware, then who else sees it
const NAV: { title?: TextKey; items: { to: string; icon: string; label: TextKey }[] }[] = [
  {
    items: [
      { to: '/dashboard/overview', icon: 'lucide:layout-dashboard', label: 'overview' },
      { to: '/dashboard/cameras', icon: 'lucide:cctv', label: 'cameras' },
      { to: '/settings/alerts', icon: 'lucide:bell', label: 'alerts' },
    ],
  },
  {
    title: 'hardware',
    items: [
      { to: '/settings/devices', icon: 'lucide:microchip', label: 'devices' },
      { to: '/settings/firmware', icon: 'lucide:refresh-cw', label: 'updates' },
      { to: '/settings/library', icon: 'lucide:library', label: 'library' },
    ],
  },
  {
    title: 'access',
    items: [{ to: '/settings/users', icon: 'lucide:users', label: 'users' }],
  },
];

export const MainLayout = () => {
  const { state, setState } = useUi();

  const navigate = useNavigate();
  const lang = useLang();
  const t = TEXTS[lang];
  const { data: me } = useGetUserQuery();
  const name = me?.name;
  // on a phone the menu covers the page: close it once a page is picked
  const closeOnPhone = () => setState({ ...state, isSidebarCollapsed: true });

  return (
    <main className="min-h-dvh bg-gray-50">
      <div
        className={clsx(
          'fixed z-20 h-full w-full bg-black/10 transition lg:pointer-events-none lg:opacity-0',
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

      <div className="h-full min-h-full lg:pl-64">
        <Header />
        {/* pages build labels in helpers too: render them again in the new language */}
        <Outlet key={lang} />
      </div>

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
        <nav className="h-screen-minus-header flex flex-col gap-4 overflow-y-auto p-4">
          {NAV.map((group, i) => (
            <div key={i} className="space-y-1">
              {group.title && (
                <div className="px-4 pb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">
                  {t[group.title]}
                </div>
              )}
              {group.items.map(item => (
                <Link key={item.to} to={item.to} onNavigate={closeOnPhone}>
                  <Icon icon={item.icon} className="size-5" />
                  {t[item.label]}
                </Link>
              ))}
            </div>
          ))}

          <div className="mt-auto space-y-3 border-t border-black/10 pt-4">
            <div className="flex items-center gap-3 px-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                {name ? name.slice(0, 2).toUpperCase() : <Icon icon="lucide:user" className="size-4" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={name}>
                {name ?? '…'}
              </span>
              <div className="flex rounded-md border border-black/10 text-xs">
                {LANGS.map(option => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setLang(option.code)}
                    className={clsx(
                      'px-2 py-1 first:rounded-l-md last:rounded-r-md',
                      lang === option.code ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                removeCookie('SESSION');
                navigate('/auth/login');
              }}
            >
              <Icon icon="lucide:log-out" className="size-4" />
              {t.logout}
            </Button>
          </div>
        </nav>
      </aside>
    </main>
  );
};

function Link(props: { children: ReactNode; to: To; onNavigate?: () => void }) {
  return (
    <NavLink
      onClick={props.onNavigate}
      className={({ isActive }) =>
        clsx(
          [
            isActive
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100',
          ],
          'flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors'
        )
      }
      to={props.to}
    >
      {props.children}
    </NavLink>
  );
}
