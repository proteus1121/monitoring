import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import { Controller, useUpdateFirmwareMutation } from '@src/redux/generatedApi';
import { errorMessage } from '@src/redux/helpers';
import { useTexts } from '@src/lib/lang';

const TEXTS = {
  uk: {
    startFailed: 'Не вдалося почати оновлення',
    waiting: 'очікує плату',
    installed: 'встановлено, перезапуск',
    downloading: (progress: number) => `завантаження ${progress}%`,
    firmware: 'Прошивка',
    failed: (version: string) => `Оновлення до ${version} не вдалося`,
    hintOnline: 'Плата завантажить її із сайту й перезапуститься',
    hintOffline: 'Плата офлайн',
    updateTo: (version: string) => `Оновити до ${version}`,
  },
  en: {
    startFailed: 'Could not start the update',
    waiting: 'waiting for the board',
    installed: 'installed, restarting',
    downloading: (progress: number) => `downloading ${progress}%`,
    firmware: 'Firmware',
    failed: (version: string) => `Update to ${version} failed`,
    hintOnline: 'The board downloads it from the site and restarts',
    hintOffline: 'The board is offline',
    updateTo: (version: string) => `Update to ${version}`,
  },
};

const RUNNING = ['REQUESTED', 'DOWNLOADING', 'DONE'];

export const isUpdating = (controller: Controller) =>
  RUNNING.includes(controller.firmwareUpdate?.state ?? '');

/**
 * Firmware of a board: the update it can get from the site and the progress of a running one.
 */
export function BoardFirmware({ controller }: { controller: Controller }) {
  const [update, { isLoading }] = useUpdateFirmwareMutation();
  const status = controller.firmwareUpdate;
  const canUpdate = !controller.role || controller.role === 'OWNER';
  const t = useTexts(TEXTS);

  const start = async () => {
    const res = await update({ id: controller.id! });
    if ('error' in res) {
      notification.error({ message: t.startFailed, description: errorMessage(res.error) });
    }
  };

  if (status && isUpdating(controller)) {
    const text =
      status.state === 'REQUESTED'
        ? t.waiting
        : status.state === 'DONE'
          ? t.installed
          : t.downloading(status.progress);
    return (
      <span className="flex items-center gap-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
        <Spinner />
        {t.firmware} {status.version}: {text}
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-blue-100">
          <span className="block h-full bg-blue-500" style={{ width: `${status.progress}%` }} />
        </span>
      </span>
    );
  }

  return (
    <>
      {status && (status.state === 'FAILED' || status.state === 'TIMEOUT') && (
        <span
          className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800"
          title={status.error ?? undefined}
        >
          {t.failed(status.version ?? '')}
          {status.error ? `: ${status.error}` : ''}
        </span>
      )}
      {controller.availableFirmware && canUpdate && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isLoading || !controller.online}
          title={controller.online ? t.hintOnline : t.hintOffline}
          onClick={start}
        >
          {isLoading ? <Spinner /> : <Icon icon="lucide:download" />}
          {t.updateTo(controller.availableFirmware)}
        </Button>
      )}
    </>
  );
}
