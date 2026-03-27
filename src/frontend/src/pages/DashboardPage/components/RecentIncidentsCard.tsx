import { useGetAllIncidentsQuery, useResolveIncidentMutation } from '@src/redux/generatedApi';
import { Card } from '@src/components/Card';
import { Loader } from '@src/components/Loader';
import { Incident } from '@src/redux/generatedApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const getSeverityColor = (
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): { border: string; bg: string; text: string; icon: string } => {
  switch (severity) {
    case 'CRITICAL':
      return {
        border: 'border-red-200',
        bg: 'bg-red-50',
        text: 'text-red-600',
        icon: '🔴',
      };
    case 'HIGH':
      return {
        border: 'border-orange-200',
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        icon: '🟠',
      };
    case 'MEDIUM':
      return {
        border: 'border-yellow-200',
        bg: 'bg-yellow-50',
        text: 'text-yellow-600',
        icon: '🟡',
      };
    case 'LOW':
      return {
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        icon: 'ℹ️',
      };
    default:
      return {
        border: 'border-gray-200',
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        icon: '⚪',
      };
  }
};

const getStatusIcon = (
  status?: 'UNRESOLVED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'RESOLVED_MANUALLY'
) => {
  switch (status) {
    case 'RESOLVED':
    case 'RESOLVED_MANUALLY':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-circle-check-big h-4 w-4 flex-shrink-0"
          aria-hidden="true"
        >
          <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
          <path d="m9 11 3 3L22 4"></path>
        </svg>
      );
    case 'ACKNOWLEDGED':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-info h-4 w-4 flex-shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      );
    case 'UNRESOLVED':
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-triangle-alert h-4 w-4 flex-shrink-0"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
          <path d="M12 9v4"></path>
          <path d="M12 17h.01"></path>
        </svg>
      );
  }
};

const IncidentItem = ({ incident }: { incident: Incident }) => {
  const [resolveIncident, { isLoading: isResolving }] = useResolveIncidentMutation();
  const colors = getSeverityColor(incident.severity);
  const deviceNames =
    incident.devices && incident.devices.length > 0
      ? incident.devices.map((d) => d.name).join(', ')
      : 'Unknown Device';

  const handleResolve = async () => {
    if (incident.id) {
      try {
        await resolveIncident({ id: incident.id }).unwrap();
      } catch (error) {
        console.error('Failed to resolve incident:', error);
      }
    }
  };

  const isResolved = incident.status === 'RESOLVED' || incident.status === 'RESOLVED_MANUALLY';

  return (
    <div
      className={`rounded-lg border ${colors.border} ${colors.bg} ${colors.text} p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-white p-2">{colors.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{incident.message}</p>
            <div className="flex items-center gap-2">
              {!isResolved && (
                <button
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="rounded px-2 py-1 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    color: 'inherit',
                  }}
                >
                  {isResolving ? 'Resolving...' : 'Resolve'}
                </button>
              )}
              {getStatusIcon(incident.status)}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="opacity-75">
              {incident.created
                ? dayjs(incident.created).fromNow()
                : 'Unknown time'}
            </span>
            <span className="opacity-50">•</span>
            <span className="opacity-75">{deviceNames}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RecentIncidentsCard = () => {
  const { data: incidents, isLoading } = useGetAllIncidentsQuery();

  // Filter incidents from the last 24 hours
  const last24HoursIncidents = incidents?.filter((incident) => {
    if (!incident.created) return false;
    const incidentTime = dayjs(incident.created);
    const oneDayAgo = dayjs().subtract(24, 'hours');
    return incidentTime.isAfter(oneDayAgo);
  }) ?? [];

  // Sort by creation date, newest first
  const sortedIncidents = [...last24HoursIncidents].sort((a, b) => {
    if (!a.created || !b.created) return 0;
    return dayjs(b.created).isBefore(dayjs(a.created)) ? -1 : 1;
  });

  return (
    <Card>
      <div className="flex items-center justify-between pb-6">
        <div>
          <h3 className="text-xl font-semibold">Recent alerts</h3>
          <span className="text-sm text-gray-500">Last 24 hours</span>
        </div>
      </div>
      <div className="max-h-96 space-y-3 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : sortedIncidents.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <p>No incidents in the last 24 hours</p>
          </div>
        ) : (
          sortedIncidents.map((incident) => (
            <IncidentItem key={incident.id} incident={incident} />
          ))
        )}
      </div>
    </Card>
  );
};
