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
import {
  ControllerWithRole,
  useGetFirmwareManifestQuery,
} from '@src/redux/controllersApi';
import { BoardFirmware, isUpdating } from './DevicesPage/BoardFirmware';

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
  const boards = (controllers ?? []) as ControllerWithRole[];

  useEffect(() => {
    setPolling(boards.some(isUpdating));
  }, [controllers]);

  if (isLoading) return <Loader />;

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>Firmware updates</PageHeaderTitle>
          <PageHeaderDescription>
            One firmware for every supported board. Install it once over USB
            (files on the{' '}
            <Link to="/settings/library" className="underline">
              Library
            </Link>{' '}
            page), later updates come from the site.
          </PageHeaderDescription>
        </div>
      </PageHeader>

      {error || !manifest ? (
        <Card className="text-sm text-slate-500">
          No firmware is published yet.
        </Card>
      ) : (
        <Card className="flex flex-wrap items-start gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
            <Icon icon="lucide:cpu" className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-semibold">
              Version {manifest.version}
            </div>
            <div className="text-sm text-slate-500">
              Released {fromNow(manifest.date)}
              {manifest.commit && <> · build {manifest.commit}</>}
            </div>
            {manifest.notes && (
              <p className="mt-2 text-sm text-slate-700">{manifest.notes}</p>
            )}
          </div>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Your boards</h2>
        {boards.length === 0 ? (
          <Card className="text-sm text-slate-500">No boards linked yet.</Card>
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
                  {board.online ? 'ONLINE' : 'OFFLINE'}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {!board.availableFirmware && !board.firmwareUpdate && (
                    <span className="text-xs text-slate-500">up to date</span>
                  )}
                  <BoardFirmware controller={board} />
                </div>
              </div>
            ))}
          </Card>
        )}
        <p className="text-xs text-slate-500">
          A board downloads the update from this site over HTTPS, checks it and
          restarts; its settings and devices stay. Boards on firmware older than
          2.4.0 have to be updated over USB once.
        </p>
      </section>
    </PageLayout>
  );
}
