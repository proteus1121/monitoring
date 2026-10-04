import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import { Loader } from '@src/components/Loader';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { fromNow } from '@src/lib/readings';
import { useGetControllersQuery } from '@src/redux/generatedApi';
import { useGetFirmwareManifestQuery } from '@src/redux/controllersApi';
import { BoardFirmware, isUpdating } from './DevicesPage/BoardFirmware';
import { useTexts } from '@src/lib/lang';

const library = (text: string) => (
  <Link to="/settings/library" className="underline">
    {text}
  </Link>
);

const TEXTS = {
  uk: {
    title: 'Оновлення прошивки',
    description: (
      <>
        Одна прошивка для всіх підтримуваних плат. Встановіть її один раз через USB (файли на сторінці{' '}
        {library('Бібліотека')}), подальші оновлення приходять із сайту.
      </>
    ),
    noFirmware: 'Прошивку ще не опубліковано.',
    version: (version: string) => `Версія ${version}`,
    released: (when: string) => `Випущена ${when}`,
    build: 'збірка',
    yourBoards: 'Ваші плати',
    noBoards: 'Плат ще немає.',
    online: 'ОНЛАЙН',
    offline: 'ОФЛАЙН',
    upToDate: 'актуальна',
    note: 'Плата завантажує оновлення з цього сайту через HTTPS, перевіряє його й перезапускається; її налаштування й пристрої зберігаються. Плати з прошивкою, старішою за 2.4.0, потрібно один раз оновити через USB.',
  },
  en: {
    title: 'Firmware updates',
    description: (
      <>
        One firmware for every supported board. Install it once over USB (files on the {library('Library')} page),
        later updates come from the site.
      </>
    ),
    noFirmware: 'No firmware is published yet.',
    version: (version: string) => `Version ${version}`,
    released: (when: string) => `Released ${when}`,
    build: 'build',
    yourBoards: 'Your boards',
    noBoards: 'No boards linked yet.',
    online: 'ONLINE',
    offline: 'OFFLINE',
    upToDate: 'up to date',
    note: 'A board downloads the update from this site over HTTPS, checks it and restarts; its settings and devices stay. Boards on firmware older than 2.4.0 have to be updated over USB once.',
  },
};

/**
 * Firmware updates: what the latest version is and updating linked boards over the internet. Files for the
 * first install over USB are in the Library.
 */
export function FirmwarePage() {
  const { data: manifest, isLoading, error } = useGetFirmwareManifestQuery();
  const [polling, setPolling] = useState(false);
  const { data: controllers } = useGetControllersQuery(undefined, {
    pollingInterval: polling ? 3000 : 30000,
  });
  const boards = (controllers ?? []);
  const t = useTexts(TEXTS);

  useEffect(() => {
    setPolling(boards.some(isUpdating));
  }, [controllers]);

  if (isLoading) return <Loader />;

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>{t.title}</PageHeaderTitle>
          <PageHeaderDescription>{t.description}</PageHeaderDescription>
        </div>
      </PageHeader>

      {error || !manifest ? (
        <Card className="text-sm text-slate-500">{t.noFirmware}</Card>
      ) : (
        <Card className="flex flex-wrap items-start gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
            <Icon icon="lucide:cpu" className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-semibold">
              {t.version(manifest.version)}
            </div>
            <div className="text-sm text-slate-500">
              {t.released(fromNow(manifest.date))}
              {manifest.commit && <> · {t.build} {manifest.commit}</>}
            </div>
            {manifest.notes && (
              <p className="mt-2 text-sm text-slate-700">{manifest.notes}</p>
            )}
          </div>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">{t.yourBoards}</h2>
        {boards.length === 0 ? (
          <Card className="text-sm text-slate-500">{t.noBoards}</Card>
        ) : (
          <Card className="divide-y divide-black/5 p-0">
            {boards.map(board => (
              <div
                key={board.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <Icon icon="lucide:cpu" className="size-4 text-slate-500" />
                <span className="font-medium">{board.name}</span>
                <span className="font-mono text-xs text-slate-500">
                  {board.board ?? board.platform} · fw{' '}
                  {board.firmwareVersion ?? '?'}
                </span>
                <span
                  className={`rounded-full px-2 text-xs text-white ${board.online ? 'bg-green-500' : 'bg-gray-500'}`}
                >
                  {board.online ? t.online : t.offline}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {!board.availableFirmware && !board.firmwareUpdate && (
                    <span className="text-xs text-slate-500">{t.upToDate}</span>
                  )}
                  <BoardFirmware controller={board} />
                </div>
              </div>
            ))}
          </Card>
        )}
        <p className="text-xs text-slate-500">{t.note}</p>
      </section>
    </PageLayout>
  );
}
