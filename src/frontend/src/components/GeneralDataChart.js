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

const GeneralDataChart = () => {
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [daysCount, setDaysCount] = useState(2);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                const now = new Date();
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(now.getDate() - daysCount);

                const deviceIds = [1, 2, 3, 4, 5];
                const colors = [
                    "rgba(255, 99, 132, 1)",
                    "rgba(54, 162, 235, 1)",
                    "rgba(255, 206, 86, 1)",
                    "rgba(75, 192, 192, 1)",
                    "rgba(153, 102, 255, 1)",
                    "rgb(255,0,0)",
                    "rgb(71,255,0)"
                ];

                const devices = [
                    "Temperature Sensor",
                    "Humidity Sensor",
                    "LPG",
                    "CH4",
                    "Smoke",
                    // "Flame Sensor",
                    // "Light Sensor"
                ];

                // Fetch data for all devices in parallel
                const responses = await Promise.all(
                    deviceIds.map((id) =>
                        axios.get(`${process.env.REACT_APP_BACKEND_URL}/metrics`, {
                            params: {
                                deviceId: id,
                                start: ninetyDaysAgo.toISOString(),
                                end: now.toISOString(),
                            },
                            withCredentials: true,
                        })
                    )
                );

                // Collect all unique timestamps
                const allTimestampsSet = new Set();
                const deviceDataMaps = [];

                responses.forEach((res) => {
                    const data = res.data;
                    const dataMap = {};
                    data.forEach((entry) => {
                        const ts = new Date(entry.timestamp).toISOString();
                        allTimestampsSet.add(ts);
                        dataMap[ts] = entry.value;
                    });
                    deviceDataMaps.push(dataMap);
                });

                const allTimestamps = Array.from(allTimestampsSet).sort();

                // Build datasets for each device
                const datasets = deviceDataMaps.map((dataMap, index) => ({
                    label: `${devices[index]}`,
                    data: allTimestamps.map((timestamp) =>
                        dataMap[timestamp] !== undefined ? dataMap[timestamp] : null
                    ),
                    borderColor: colors[index],
                    backgroundColor: colors[index]?.replace("1)", "0.2)"),
                    tension: 0.3,
                    spanGaps: true,
                }));

                // Set chart data
                setChartData({
                    labels: allTimestamps.map((timestamp) =>
                        new Date(timestamp).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                    ),
                    datasets,
                });
            } catch (err) {
                console.error(err);
                setError("Failed to fetch data");
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
                    type="number"
                    min="1"
                    value={daysCount}
                    onChange={(e) => setDaysCount(Number(e.target.value))}
                    style={{marginLeft: '10px', width: '60px'}}
                />
            </label>

            {chartData && <Line data={chartData} options={{responsive: true}}/>}
        </div>
    );
};

export default GeneralDataChart;
