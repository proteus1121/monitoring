import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '@iconify/react';
import { notification } from 'antd';
import { Card } from '@src/components/Card';
import { AiExplanation } from '@src/components/AiExplanation';
import { SEVERITY_STYLES } from '@src/components/NotificationsBell';
import { fromNow, serverTime } from '@src/lib/readings';
import {
  Incident,
  useGetOpenIncidentCountQuery,
  useGetRecentIncidentsQuery,
  useResolveAllIncidentsMutation,
  useResolveIncidentMutation,
} from '@src/redux/generatedApi';

const POLLING_INTERVAL_MS = 30000;

export function AlertsCard() {
  const [openOnly, setOpenOnly] = useState(true);
  const { data: incidents, isLoading } = useGetRecentIncidentsQuery(
    { openOnly, limit: 100 },
    { pollingInterval: POLLING_INTERVAL_MS }
  );
  const { data: openCount = 0 } = useGetOpenIncidentCountQuery();
  const [resolveAll, { isLoading: isResolvingAll }] =
    useResolveAllIncidentsMutation();

  const onResolveAll = async () => {
    const res = await resolveAll();
    if ('data' in res) {
      notification.success({ message: `Resolved ${res.data} alerts` });
    }
  };

  return (
    <Card className="flex max-h-[640px] scroll-mt-24 flex-col">
      <div id="alerts" className="scroll-mt-24" />
      <div className="flex items-center justify-between gap-2 pb-3">
        <h3 className="font-semibold">Alerts</h3>
        {openCount > 0 && (
          <button
            type="button"
            onClick={onResolveAll}
            disabled={isResolvingAll}
            className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
          >
            Resolve all ({openCount})
          </button>
        )}
      </div>

      <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {[
          { value: true, label: 'Open' },
          { value: false, label: 'All' },
        ].map(tab => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setOpenOnly(tab.value)}
            className={clsx(
              'flex-1 rounded-md py-1 font-medium',
              openOnly === tab.value
                ? 'bg-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="-mx-4 min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
        )}
        {!isLoading && !incidents?.length && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-slate-500">
            <Icon icon="lucide:circle-check" className="size-6 text-green-500" />
            {openOnly ? 'No open alerts' : 'No alerts yet'}
          </div>
        )}
        {incidents?.map(incident => (
          <AlertItem key={incident.id} incident={incident} />
        ))}
      </div>
    </Card>
  );
}

function AlertItem({ incident }: { incident: Incident }) {
  const [resolve, { isLoading }] = useResolveIncidentMutation();
  const severity =
    SEVERITY_STYLES[incident.severity ?? ''] ?? SEVERITY_STYLES.LOW;
  const resolved =
    incident.status === 'RESOLVED' || incident.status === 'RESOLVED_MANUALLY';

  return (
    <div
      className={clsx(
        'flex gap-3 border-t border-black/5 px-4 py-3',
        resolved && 'opacity-55'
      )}
    >
      <span
        className={clsx('mt-1.5 size-2 shrink-0 rounded-full', severity.dot)}
        title={severity.label}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{incident.message}</p>
        {incident.description && <AiExplanation text={incident.description} />}
        <p
          className="mt-1 text-xs text-slate-500"
          title={serverTime(incident.created)?.format('YYYY-MM-DD HH:mm')}
        >
          {incident.devices?.map(d => d.name).join(', ') || 'Unknown device'} ·{' '}
          {fromNow(incident.created)}
          {resolved && ' · resolved'}
        </p>
      </div>
      {!resolved && (
        <button
          type="button"
          title="Resolve"
          disabled={isLoading}
          onClick={() => incident.id && resolve({ id: incident.id })}
          className="h-fit rounded p-1 text-slate-400 hover:bg-gray-100 hover:text-green-600 disabled:opacity-50"
        >
          <Icon icon="lucide:check" className="size-4" />
        </button>
      )}
    </div>
  );
}
