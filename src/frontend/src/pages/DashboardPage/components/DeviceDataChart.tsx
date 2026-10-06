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
import { useTexts } from '@src/lib/lang';
import {
  Device,
  ForecastModel,
  PredictedSensorData,
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

const TEXTS = {
  uk: {
    device: 'Пристрій',
    forecast: 'прогноз',
    locale: 'uk-UA',
    failed: 'Не вдалося завантажити дані',
    loading: 'Завантаження…',
    noData: 'За цей період даних немає',
    selectDevices: 'Виберіть пристрої, щоб побачити їхню історію',
  },
  en: {
    device: 'Device',
    forecast: 'forecast',
    locale: 'en-GB',
    failed: 'Failed to load data',
    loading: 'Loading…',
    noData: 'No data for this period',
    selectDevices: 'Select devices to show their history',
  },
};

const MODEL_LABELS: Record<ForecastModel, string> = {
  ARIMA: 'ARIMA',
  KALMAN: 'Kalman',
  XGBOOST: 'XGBoost',
  TRANSFORMER: 'Transformer',
};

// every model of a device keeps the device colour and gets its own dash pattern
const MODEL_DASHES: Record<string, number[]> = {
  ARIMA: [6, 6],
  KALMAN: [2, 4],
  XGBOOST: [10, 4, 2, 4],
  TRANSFORMER: [14, 6],
  '': [6, 6],
};

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

// forecasts made before devices could have several models carry no model, keyed by ''
function byModel(entries: PredictedSensorData[]) {
  const groups: Record<string, PredictedSensorData[]> = {};
  entries.forEach(entry => {
    (groups[entry.model ?? ''] ??= []).push(entry);
  });
  return Object.entries(groups).map(([model, points]) => ({ model, points: toMap(points) }));
}

function toMap(entries?: (SensorData | PredictedSensorData)[]) {
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
  const t = useTexts(TEXTS);
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
                .catch(() => [] as PredictedSensorData[]),
            ]);
            return { id, actual: toMap(actual), predicted: byModel(predicted) };
          })
        );
        if (cancelled) return;

        const timestamps = new Set<string>();
        responses.forEach(r => {
          Object.keys(r.actual).forEach(ts => timestamps.add(ts));
          r.predicted.forEach(series => Object.keys(series.points).forEach(ts => timestamps.add(ts)));
        });
        const sorted = [...timestamps].sort();

        const datasets: DatasetConfig[] = [];
        responses.forEach((r, index) => {
          const color = COLORS[index % COLORS.length];
          const name =
            devicesRef.current?.find(d => d.id === r.id)?.name ?? `${t.device} ${r.id}`;
          datasets.push({
            label: name,
            data: sorted.map(ts => r.actual[ts] ?? null),
            borderColor: color,
            backgroundColor: color,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 2,
          });
          r.predicted.forEach(series => {
            const model = MODEL_LABELS[series.model as ForecastModel];
            datasets.push({
              label: model ? `${name} (${t.forecast} ${model})` : `${name} (${t.forecast})`,
              data: sorted.map(ts => series.points[ts] ?? null),
              borderColor: color,
              backgroundColor: color,
              tension: 0.3,
              spanGaps: true,
              pointRadius: 0,
              borderDash: MODEL_DASHES[series.model] ?? MODEL_DASHES[''],
            });
          });
        });

        setChartData({
          labels: sorted.map(ts =>
            new Date(ts).toLocaleString(t.locale, {
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
        if (!cancelled) setError(t.failed);
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
          {t.loading}
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
            {choosenDevicesIds.length ? t.noData : t.selectDevices}
          </p>
        )
      )}
    </div>
  );
};

export default DeviceDataChart;
