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
import { useApi } from '@src/lib/api/ApiProvider';

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
}

interface ChartData {
  labels: string[];
  datasets: DatasetConfig[];
}

const GeneralDataChart = () => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [daysCount, setDaysCount] = useState<number>(2);
  const api = useApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - daysCount);

        const deviceIds = [1, 2, 3, 4, 5];
        const colors = [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgb(255,0,0)',
          'rgb(71,255,0)',
        ];

        const devices = [
          'Temperature Sensor',
          'Humidity Sensor',
          'LPG',
          'CH4',
          'Smoke',
        ];

        const responses = await Promise.all(
          deviceIds.map(id => api.getMetricsByDevice(id, startDate, now))
        );

        const allTimestampsSet = new Set<string>();
        const deviceDataMaps: Record<string, number>[] = [];

        responses.forEach(res => {
          const dataMap: Record<string, number> = {};
          if (res.ok) {
            res.data.map(entry => {
              const ts = new Date(entry.timestamp).toISOString();
              allTimestampsSet.add(ts);
              dataMap[ts] = entry.value;
            });
            deviceDataMaps.push(dataMap);
          }
        });

        const allTimestamps = Array.from(allTimestampsSet).sort();

        const datasets: DatasetConfig[] = deviceDataMaps.map(
          (dataMap, index) => {
            const color = colors[index % colors.length];
            return {
              label: devices[index] || `Device ${index + 1}`,
              data: allTimestamps.map(timestamp =>
                dataMap[timestamp] !== undefined ? dataMap[timestamp] : null
              ),
              borderColor: color,
              backgroundColor: color.replace('1)', '0.2)'),
              tension: 0.3,
              spanGaps: true,
            };
          }
        );

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
  }, [daysCount]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Sensor Data for all devices</h2>

      <label>
        Days to load:
        <input
          type="datetime-local"
          value={daysCount}
          onChange={e => alert(e.target.value)}
        />
        <input
          type="datetime-local"
          value={daysCount}
          onChange={e => alert(e.target.value)}
        />
      </label>

      {chartData && <Line data={chartData} options={{ responsive: true }} />}
    </div>
  );
};

export default GeneralDataChart;
