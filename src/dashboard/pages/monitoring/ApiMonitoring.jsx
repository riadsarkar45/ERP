import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../../../hooks/socket.io/socketContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const ApiMonitoring = () => {
    const socket = useSocket();
    const [apiData, setApiData] = useState([]);
    const [counts, setCounts] = useState({ allowed: 0, blocked: 0 });

    useEffect(() => {
        if (!socket) return;

        const handleApiUpdate = (data) => {
            setApiData(prev => [data, ...prev].slice(0, 50));
            setCounts(prev => ({
                ...prev,
                [data.type === 'blocked' ? 'blocked' : 'allowed']: prev[data.type === 'blocked' ? 'blocked' : 'allowed'] + 1,
            }));
        };

        socket.on('rate-limit-event', handleApiUpdate);
        return () => socket.off('rate-limit-event', handleApiUpdate);
    }, [socket]);

    const total = counts.allowed + counts.blocked;

    const chartData = {
        labels: ['Allowed', 'Blocked'],
        datasets: [{
            data: [counts.allowed, counts.blocked],
            backgroundColor: ['#16a34a33', '#dc262633'],
            borderColor: ['#16a34a', '#dc2626'],
            borderWidth: 1.5,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${ctx.label}: ${ctx.parsed} (${total ? Math.round((ctx.parsed / total) * 100) : 0}%)`,
                },
            },
        },
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Left — live feed */}
            <div className="bg-white border border-blue-500 rounded-md p-2">
                <div className="bg-blue-200 p-1 rounded-md mb-2">
                    <h2 className="font-bold text-center">API Monitoring</h2>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                    {apiData.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Waiting for events...</p>
                    ) : (
                        apiData.map((data, index) => (
                            <div
                                key={index}
                                className={`flex gap-3 border p-2 rounded-md ${
                                    data.type === 'blocked'
                                        ? 'bg-red-500/40 text-red-800 border-red-500'
                                        : 'bg-green-500/20 text-green-800 border-green-500'
                                }`}
                            >
                                <span className="font-bold">{`>> >>`}</span>
                                <div className="grid grid-cols-3 gap-4 uppercase text-sm">
                                    <p><span className="font-semibold">Route:</span> {data.route}</p>
                                    <p><span className="font-semibold">IP:</span> {data.ip}</p>
                                    <p><span className="font-semibold">Status:</span> {data.type}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right — live pie chart */}
            <div className="bg-white border border-blue-500 rounded-md p-2">
                <div className="bg-blue-200 p-1 rounded-md mb-2">
                    <h2 className="font-bold text-center">Request breakdown</h2>
                </div>

                {total === 0 ? (
                    <p className="text-gray-500 text-center py-4">No data yet</p>
                ) : (
                    <div className="flex flex-col items-center gap-4 pt-2">

                        {/* Stat badges */}
                        <div className="flex gap-4 w-full justify-center">
                            <div className="flex-1 text-center bg-green-500/10 border border-green-500 rounded-md p-2">
                                <p className="text-xs text-green-700 font-semibold uppercase">Allowed</p>
                                <p className="text-2xl font-bold text-green-700">{counts.allowed}</p>
                                <p className="text-xs text-green-600">{total ? Math.round((counts.allowed / total) * 100) : 0}%</p>
                            </div>
                            <div className="flex-1 text-center bg-red-500/10 border border-red-500 rounded-md p-2">
                                <p className="text-xs text-red-700 font-semibold uppercase">Blocked</p>
                                <p className="text-2xl font-bold text-red-700">{counts.blocked}</p>
                                <p className="text-xs text-red-600">{total ? Math.round((counts.blocked / total) * 100) : 0}%</p>
                            </div>
                        </div>

                        {/* Pie chart */}
                        <div style={{ height: 220, width: '100%', position: 'relative' }}>
                            <Pie data={chartData} options={chartOptions} />
                        </div>

                        {/* Custom legend */}
                        <div className="flex gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-600" />
                                Allowed
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-600" />
                                Blocked
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApiMonitoring;