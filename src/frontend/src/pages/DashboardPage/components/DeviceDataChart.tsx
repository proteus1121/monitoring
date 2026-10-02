import { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Dayjs } from 'dayjs';
import { serverTime } from '@src/lib/readings';
import {
  Device,
  SensorData,
  useLazyGetMetricsPredictedQuery,
  useLazyGetMetricsQuery,
} from '@src/redux/generatedApi';

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

const COLORS = [
  'rgb(37, 99, 235)',
  'rgb(234, 88, 12)',
  'rgb(22, 163, 74)',
  'rgb(219, 39, 119)',
  'rgb(124, 58, 237)',
  'rgb(8, 145, 178)',
  'rgb(202, 138, 4)',
];

interface DatasetConfig {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  spanGaps: boolean;
  pointRadius: number;
  borderDash?: number[];
}

interface ChartData {
  labels: string[];
  datasets: DatasetConfig[];
}

function toMap(entries?: SensorData[]) {
  const map: Record<string, number> = {};
  entries?.forEach(entry => {
    if (entry.timestamp && entry.value !== undefined && entry.value !== null) {
      map[serverTime(entry.timestamp)!.toISOString()] = entry.value;
    }
  });
  return map;
}

const DeviceDataChart = ({
  devices,
  choosenDevicesIds,
  startDate,
  endDate,
}: {
  devices?: Device[];
  choosenDevicesIds: number[];
  startDate: Dayjs;
  endDate: Dayjs;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [getMetricsByDevice] = useLazyGetMetricsQuery();
  const [getPredictedMetricsByDevice] = useLazyGetMetricsPredictedQuery();

  // the device list is polled, keep names in a ref so a refresh does not reload the chart
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  const idsKey = choosenDevicesIds.join(',');
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  useEffect(() => {
    let cancelled = false;
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    if (ids.length === 0) {
      setChartData(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const responses = await Promise.all(
          ids.map(async id => {
            const [actual, predicted] = await Promise.all([
              getMetricsByDevice({ deviceId: id, start, end, period: 'ONE_HOUR' }, true).unwrap(),
              // the forecast is optional, the chart still works without it
              getPredictedMetricsByDevice({ deviceId: id, start, end }, true)
                .unwrap()
                .catch(() => [] as SensorData[]),
            ]);
            return { id, actual: toMap(actual), predicted: toMap(predicted) };
          })
        );
        if (cancelled) return;

        const timestamps = new Set<string>();
        responses.forEach(r => {
          Object.keys(r.actual).forEach(ts => timestamps.add(ts));
          Object.keys(r.predicted).forEach(ts => timestamps.add(ts));
        });
        const sorted = [...timestamps].sort();

        const datasets: DatasetConfig[] = [];
        responses.forEach((r, index) => {
          const color = COLORS[index % COLORS.length];
          const name =
            devicesRef.current?.find(d => d.id === r.id)?.name ?? `Device ${r.id}`;
          datasets.push({
            label: name,
            data: sorted.map(ts => r.actual[ts] ?? null),
            borderColor: color,
            backgroundColor: color,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 2,
          });
          if (Object.keys(r.predicted).length > 0) {
            datasets.push({
              label: `${name} (forecast)`,
              data: sorted.map(ts => r.predicted[ts] ?? null),
              borderColor: color,
              backgroundColor: color,
              tension: 0.3,
              spanGaps: true,
              pointRadius: 0,
              borderDash: [6, 6],
            });
          }
        });

        setChartData({
          labels: sorted.map(ts =>
            new Date(ts).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          ),
          datasets,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Failed to load data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [idsKey, start, end, getMetricsByDevice, getPredictedMetricsByDevice]);

  const hasPoints = chartData?.labels.length;

  return (
    <div className="relative h-[360px]">
      {isLoading && (
        <span className="absolute top-0 right-0 z-10 text-xs text-slate-400">
          Loading…
        </span>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!error && hasPoints ? (
        <Line
          data={chartData!}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'bottom' } },
            scales: { x: { ticks: { maxTicksLimit: 12 } } },
          }}
        />
      ) : (
        !isLoading &&
        !error && (
          <p className="pt-10 text-center text-sm text-slate-500">
            {choosenDevicesIds.length
              ? 'No data for this period'
              : 'Select devices to show their history'}
          </p>
        )
      )}
    </div>
  );
};

export default DeviceDataChart;
