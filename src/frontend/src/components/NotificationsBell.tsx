import { Icon } from '@iconify/react';
import { Popover } from 'radix-ui';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { fromNow } from '@src/lib/readings';
import { AiExplanation } from './AiExplanation';
import {
  Incident,
  useGetOpenIncidentCountQuery,
  useGetRecentIncidentsQuery,
  useResolveAllIncidentsMutation,
  useResolveIncidentMutation,
} from '@src/redux/generatedApi';

const POLLING_INTERVAL_MS = 30000;

export const SEVERITY_STYLES: Record<string, { dot: string; label: string }> = {
  CRITICAL: { dot: 'bg-red-500', label: 'Critical' },
  HIGH: { dot: 'bg-orange-500', label: 'High' },
  MEDIUM: { dot: 'bg-yellow-400', label: 'Medium' },
  LOW: { dot: 'bg-blue-400', label: 'Low' },
};

export function NotificationsBell() {
  const navigate = useNavigate();
  const { data: count = 0 } = useGetOpenIncidentCountQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  const { data: incidents, isLoading } = useGetRecentIncidentsQuery(
    { openOnly: true, limit: 15 },
    { pollingInterval: POLLING_INTERVAL_MS }
  );
  const [resolveAll, { isLoading: isResolvingAll }] =
    useResolveAllIncidentsMutation();

  const onResolveAll = async () => {
    const res = await resolveAll();
    if ('data' in res) {
      notification.success({ message: `Resolved ${res.data} alerts` });
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Alerts"
          className="relative inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-gray-100"
        >
          <Icon icon="lucide:bell" className="size-5" />
          {count > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-semibold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(380px,calc(100vw-24px))] rounded-lg border border-black/10 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div>
              <div className="font-semibold">Alerts</div>
              <div className="text-xs text-slate-500">
                {count === 0 ? 'Nothing needs attention' : `${count} unresolved`}
              </div>
            </div>
            {count > 0 && (
              <button
                type="button"
                disabled={isResolvingAll}
                onClick={onResolveAll}
                className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                Resolve all
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Loading…
              </div>
            )}
            {!isLoading && !incidents?.length && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-sm text-slate-500">
                <Icon icon="lucide:circle-check" className="size-6 text-green-500" />
                All clear
              </div>
            )}
            {incidents?.map(incident => (
              <AlertRow key={incident.id} incident={incident} />
            ))}
          </div>

          <Popover.Close asChild>
            <button
              type="button"
              onClick={() => navigate('/dashboard/overview#alerts')}
              className="w-full border-t border-black/10 px-4 py-2.5 text-center text-sm text-slate-600 hover:bg-gray-50"
            >
              Show all alerts
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AlertRow({ incident }: { incident: Incident }) {
  const [resolve, { isLoading }] = useResolveIncidentMutation();
  const severity = SEVERITY_STYLES[incident.severity ?? ''] ?? SEVERITY_STYLES.LOW;

  return (
    <div className="flex gap-3 border-b border-black/5 px-4 py-3 last:border-b-0">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${severity.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{incident.message}</p>
        {incident.description && <AiExplanation text={incident.description} />}
        <p className="mt-1 text-xs text-slate-500">
          {incident.devices?.map(d => d.name).join(', ') || 'Unknown device'} ·{' '}
          {fromNow(incident.created)}
        </p>
      </div>
      <button
        type="button"
        title="Resolve"
        disabled={isLoading}
        onClick={() => incident.id && resolve({ id: incident.id })}
        className="h-fit rounded p-1 text-slate-400 hover:bg-gray-100 hover:text-green-600 disabled:opacity-50"
      >
        <Icon icon="lucide:check" className="size-4" />
      </button>
    </div>
  );
}
