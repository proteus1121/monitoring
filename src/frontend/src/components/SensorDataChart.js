import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Title,
} from "chart.js";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

const SensorDataChart = ({ deviceId, criticalValue }) => {
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const criticalValuePlugin = {
        id: "criticalValueLine",
        beforeDraw: (chart) => {
            if (criticalValue === null || !chart || !chart.scales) return;

            const { ctx, scales } = chart;
            const yAxis = scales.y;
            const xAxis = scales.x;

            const yPosition = yAxis.getPixelForValue(criticalValue);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xAxis.left, yPosition);
            ctx.lineTo(xAxis.right, yPosition);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "red";
            ctx.stroke();
            ctx.restore();
        },
    };

    const aggregateToHourly = (data) => {
        const hourlyData = {};

        data.forEach((entry) => {
            const date = new Date(entry.timestamp);
            const hourKey = date.toISOString().substring(0, 13); // Format as 'YYYY-MM-DDTHH'

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = { sum: entry.value, count: 1 };
            } else {
                hourlyData[hourKey].sum += entry.value;
                hourlyData[hourKey].count += 1;
            }
        });

        return Object.keys(hourlyData).map((hourKey) => ({
            timestamp: hourKey + ":00:00.000Z", // Append full ISO format for the hour
            value: hourlyData[hourKey].sum / hourlyData[hourKey].count, // Average the values
        }));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                const now = new Date();
                const end = new Date(now);
                end.setDate(end.getDate() + 1); // One day ahead
                // DEMO: const ninetyDaysAgo = new Date(2025, 0, 20);
                const ninetyDaysAgo = new Date(now.getDate() - 7);

                if (deviceId) {
                    // Fetch actual data
                    const actualResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/metrics`, {
                        params: {
                            deviceId: deviceId,
                            start: ninetyDaysAgo.toISOString(),
                            end: now.toISOString(),
                        },
                        withCredentials: true,
                    });

                    const actualData = actualResponse.data;

                    // Fetch predicted data
                    const predictedResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/metrics/predicted`, {
                        params: {
                            deviceId: deviceId,
                            start: ninetyDaysAgo.toISOString(),
                            end: end.toISOString(),
                        },
                        withCredentials: true,
                    });

                    const predictedData = aggregateToHourly(predictedResponse.data);

                    // Combine and sort timestamps
                    const allTimestamps = [
                        ...new Set([...actualData.map((d) => d.timestamp), ...predictedData.map((d) => d.timestamp)]),
                    ].sort();

                    // Align the values based on timestamps
                    const actualDataMap = actualData.reduce((map, entry) => {
                        map[entry.timestamp] = entry.value;
                        return map;
                    }, {});
                    const predictedDataMap = predictedData.reduce((map, entry) => {
                        map[entry.timestamp] = entry.value;
                        return map;
                    }, {});

                    const actualDataAligned = allTimestamps.map((timestamp) =>
                        actualDataMap[timestamp] !== undefined ? actualDataMap[timestamp] : null
                    );
                    const predictedDataAligned = allTimestamps.map((timestamp) =>
                        predictedDataMap[timestamp] !== undefined ? predictedDataMap[timestamp] : null
                    );

                    // Set the chart data
                    setChartData({
                        labels: allTimestamps.map((timestamp) =>
                            new Date(timestamp).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                            })
                        ),
                        datasets: [
                            {
                                label: "Sensor Values",
                                data: actualDataAligned,
                                borderColor: "rgba(75,192,192,1)",
                                backgroundColor: "rgba(75,192,192,0.2)",
                                tension: 0.1,
                            },
                            {
                                label: "Predicted Values",
                                data: predictedDataAligned,
                                borderColor: "rgba(255,99,132,1)",
                                backgroundColor: "rgba(255,99,132,0.2)",
                                tension: 0.1,
                                borderDash: [5, 5],
                            },
                        ],
                    });
                }
            } catch (err) {
                setError("Failed to fetch data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [deviceId]);

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div>
            <h2>Sensor Data for the Last 90 Days (Hourly)</h2>
            {chartData && <Line data={chartData} options={{ responsive: true }} plugins={[criticalValuePlugin]} />}
        </div>
    );
};

export default SensorDataChart;
