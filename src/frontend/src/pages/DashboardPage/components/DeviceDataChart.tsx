import { useEffect, useState } from 'react';
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
import {Device, useLazyGetMetricsPredictedQuery, useLazyGetMetricsQuery} from '@src/redux/generatedApi';

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

interface DatasetConfig {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  spanGaps: boolean;
  borderDash?: number[];
}

interface ChartData {
  labels: string[];
  datasets: DatasetConfig[];
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [getMetricsByDevice] = useLazyGetMetricsQuery();
  const [getPredictedMetricsByDevice] = useLazyGetMetricsPredictedQuery();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setChartData(null);

        if (!devices) {
          return;
        }

        const colors = [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgb(255,0,0)',
          'rgb(71,255,0)',
        ];

        // Fetch both actual and predicted metrics for each device
        const responses = await Promise.all(
          choosenDevicesIds.map(async (id) => {
            const [actual, predicted] = await Promise.all([
              getMetricsByDevice({
                deviceId: id,
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                period: 'ONE_HOUR'
              }).unwrap(),
              getPredictedMetricsByDevice({
                deviceId: id,
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              }).unwrap()
            ]);
            return { actual, predicted };
          })
        );

        // Collect all unique timestamps from both actual and predicted data
        const allTimestampsSet = new Set<string>();
        const deviceDataMaps: { actual: Record<string, number>, predicted: Record<string, number> }[] = [];

        responses.forEach(res => {
          const actualMap: Record<string, number> = {};
          const predictedMap: Record<string, number> = {};
          if (res.actual) {
            res.actual.forEach((entry: any) => {
              if (entry.timestamp) {
                const ts = new Date(entry.timestamp).toISOString();
                allTimestampsSet.add(ts);
                if (entry.value !== undefined && entry.value !== null) actualMap[ts] = entry.value;
              }
            });
          }
          if (res.predicted) {
            res.predicted.forEach((entry: any) => {
              if (entry.timestamp) {
                const ts = new Date(entry.timestamp).toISOString();
                allTimestampsSet.add(ts);
                if (entry.value !== undefined && entry.value !== null) predictedMap[ts] = entry.value;
              }
            });
          }
          deviceDataMaps.push({ actual: actualMap, predicted: predictedMap });
        });

        const allTimestamps = Array.from(allTimestampsSet).sort();
        const choosenDevices = devices.filter(device => {
          if (!device.id) return;
          return choosenDevicesIds.includes(device.id);
        });

        // Build datasets: for each device, one for actual, one for predicted
        const datasets: DatasetConfig[] = [];
        deviceDataMaps.forEach((dataMap, index) => {
          const color = colors[index % colors.length];
          // Actual
          datasets.push({
            label: (choosenDevices[index]?.name || `Device ${index + 1}`) + ' (Actual)',
            data: allTimestamps.map(timestamp =>
              dataMap.actual[timestamp] !== undefined ? dataMap.actual[timestamp] : null
            ),
            borderColor: color,
            backgroundColor: color.replace('1)', '0.2)'),
            tension: 0.3,
            spanGaps: true,
          });
          // Predicted
          datasets.push({
            label: (choosenDevices[index]?.name || `Device ${index + 1}`) + ' (Predicted)',
            data: allTimestamps.map(timestamp =>
              dataMap.predicted[timestamp] !== undefined ? dataMap.predicted[timestamp] : null
            ),
            borderColor: color,
            backgroundColor: color.replace('1)', '0.1)'),
            tension: 0.3,
            spanGaps: true,
            borderDash: [6, 6],
          });
        });

        const formattedLabels = allTimestamps.map(timestamp =>
          new Date(timestamp).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        );

        setChartData({ labels: formattedLabels, datasets });
      } catch (err) {
        console.error(err);
        setError('Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [devices, choosenDevicesIds, startDate, endDate, getMetricsByDevice, getPredictedMetricsByDevice]);

  if (isLoading) {
    return <>Loading...</>;
  }

  if (error) {
    return <>{error}</>;
  }

  return (
    <>
      {chartData && choosenDevicesIds.length > 0 ? (
        <Line data={chartData} options={{ responsive: true }} />
      ) : (
        <>No data available</>
      )}
    </>
  );
};

export default DeviceDataChart;
