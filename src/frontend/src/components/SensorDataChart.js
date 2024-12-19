import React, {useEffect, useState} from "react";
import {Line} from "react-chartjs-2";
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

const SensorDataChart = ({deviceId, criticalValue}) => {
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const criticalValuePlugin = {
        id: "criticalValueLine",
        beforeDraw: (chart) => {
            if (criticalValue === null || !chart || !chart.scales) return;

            const {ctx, scales} = chart;
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const now = new Date();
                const twoWeeksAgo = new Date();
                twoWeeksAgo.setDate(now.getDate() - 90);

                // Fetch data from backend API
                if (deviceId) {
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
                }
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
            <h2>{criticalValue}</h2>
            {chartData && <Line data={chartData} options={{responsive: true}} plugins={[criticalValuePlugin]}/>}
        </div>
    );
};

export default SensorDataChart;
