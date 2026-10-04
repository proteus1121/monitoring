import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import { ControllerWithRole, useUpdateFirmwareMutation } from '@src/redux/controllersApi';
import { errorMessage } from '@src/redux/helpers';

const RUNNING = ['REQUESTED', 'DOWNLOADING', 'DONE'];

export const isUpdating = (controller: ControllerWithRole) =>
  RUNNING.includes(controller.firmwareUpdate?.state ?? '');

/**
 * Firmware of a board: the update it can get from the site and the progress of a running one.
 */
export function BoardFirmware({ controller }: { controller: ControllerWithRole }) {
  const [update, { isLoading }] = useUpdateFirmwareMutation();
  const status = controller.firmwareUpdate;
  const canUpdate = !controller.role || controller.role === 'OWNER';

  const start = async () => {
    const res = await update({ id: controller.id! });
    if ('error' in res) {
      notification.error({ message: 'Could not start the update', description: errorMessage(res.error) });
    }
  };

  if (status && isUpdating(controller)) {
    const text =
      status.state === 'REQUESTED'
        ? 'waiting for the board'
        : status.state === 'DONE'
          ? 'installed, restarting'
          : `downloading ${status.progress}%`;
    return (
      <span className="flex items-center gap-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
        <Spinner />
        Firmware {status.version}: {text}
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
          Update to {status.version} failed{status.error ? `: ${status.error}` : ''}
        </span>
      )}
      {controller.availableFirmware && canUpdate && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isLoading || !controller.online}
          title={controller.online ? 'The board downloads it from the site and restarts' : 'The board is offline'}
          onClick={start}
        >
          {isLoading ? <Spinner /> : <Icon icon="lucide:download" />}
          Update to {controller.availableFirmware}
        </Button>
      )}
    </>
  );
}
