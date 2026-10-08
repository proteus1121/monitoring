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

// every line gets its own hue, so a forecast is told apart by colour, not by the dash
const COLORS = [
  '#2563eb', // blue
  '#ea580c', // orange
  '#16a34a', // green
  '#db2777', // pink
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#ca8a04', // amber
  '#dc2626', // red
  '#4b5563', // grey
  '#65a30d', // lime
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

// the dash only says "forecast", the same for every model
const FORECAST_DASH = [6, 4];

// forecasts of a device always come in the same order, so a model keeps its colour between reloads
const MODEL_ORDER = ['', 'XGBOOST', 'ARIMA', 'KALMAN', 'TRANSFORMER'];

interface DatasetConfig {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  tension: number;
  spanGaps: boolean;
  pointRadius: number;
  pointHoverRadius: number;
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
  return Object.entries(groups)
    .sort(([a], [b]) => MODEL_ORDER.indexOf(a) - MODEL_ORDER.indexOf(b))
    .map(([model, points]) => ({ model, points: toMap(points) }));
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
        const nextColor = () => COLORS[datasets.length % COLORS.length];
        responses.forEach(r => {
          const color = nextColor();
          const name =
            devicesRef.current?.find(d => d.id === r.id)?.name ?? `${t.device} ${r.id}`;
          datasets.push({
            label: name,
            data: sorted.map(ts => r.actual[ts] ?? null),
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2.5,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 2,
            pointHoverRadius: 5,
          });
          r.predicted.forEach(series => {
            const forecastColor = nextColor();
            const model = MODEL_LABELS[series.model as ForecastModel];
            datasets.push({
              label: model ? `${name} (${t.forecast} ${model})` : `${name} (${t.forecast})`,
              data: sorted.map(ts => series.points[ts] ?? null),
              borderColor: forecastColor,
              backgroundColor: forecastColor,
              borderWidth: 2,
              tension: 0.3,
              spanGaps: true,
              pointRadius: 0,
              pointHoverRadius: 4,
              borderDash: FORECAST_DASH,
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
            plugins: {
              // line samples in the legend and tooltip show solid readings and dashed forecasts
              legend: {
                position: 'bottom',
                labels: { usePointStyle: true, pointStyle: 'line', pointStyleWidth: 28, padding: 16 },
              },
              tooltip: { usePointStyle: true },
            },
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
