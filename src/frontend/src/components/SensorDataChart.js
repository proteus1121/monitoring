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

const SensorDataChart = ({ deviceId }) => {
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const now = new Date();
                const twoWeeksAgo = new Date();
                twoWeeksAgo.setDate(now.getDate() - 90);

                // Fetch data from backend API
                const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/metrics`, {
                    params: {
                        deviceId: deviceId,
                        start: twoWeeksAgo.toISOString(),
                        end: now.toISOString(),
                    },
                    withCredentials: true
                });

                // Transform data for the chart
                const timestamps = response.data.map((entry) => entry.timestamp);
                const values = response.data.map((entry) => entry.value);

                setChartData({
                    labels: timestamps,
                    datasets: [
                        {
                            label: "Sensor Values",
                            data: values,
                            borderColor: "rgba(75,192,192,1)",
                            backgroundColor: "rgba(75,192,192,0.2)",
                            tension: 0.1,
                        },
                    ],
                });
            } catch (err) {
                // TODO: invalidate session in case of 401 and redirect to login
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
            <h2>Sensor Data for Last Two Weeks</h2>
            {chartData && <Line data={chartData} options={{ responsive: true }} />}
        </div>
    );
};

export default SensorDataChart;
