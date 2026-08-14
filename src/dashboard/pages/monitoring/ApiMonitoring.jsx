import React, { useEffect, useState, useMemo } from 'react';
import { useSocket } from '../../../hooks/socket.io/socketContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const ApiMonitoring = () => {
    const socket = useSocket();
    const [apiData, setApiData] = useState([]);
    const [counts, setCounts] = useState({ allowed: 0, blocked: 0 });

    // ── NEW: delivery write-performance feed ──
    const [deliveryEvents, setDeliveryEvents] = useState([]);

    // ── NEW: all-API response-time feed ──
    const [responseTimes, setResponseTimes] = useState([]);
    const [methodFilter, setMethodFilter] = useState('ALL');

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

    // ── NEW: separate effect for delivery timing events ──
    useEffect(() => {
        if (!socket) return;

        const handleDeliveryCreated = (data) => {
            setDeliveryEvents(prev => [
                { ...data, receivedAt: Date.now() },
                ...prev,
            ].slice(0, 30));
        };

        socket.on('delivery:created', handleDeliveryCreated);
        return () => socket.off('delivery:created', handleDeliveryCreated);
    }, [socket]);

    // ── NEW: separate effect for all-API response-time events ──
    useEffect(() => {
        if (!socket) return;

        const handleResponseTime = (data) => {
            setResponseTimes(prev => [
                { ...data, receivedAt: Date.now() },
                ...prev,
            ].slice(0, 60));
        };

        socket.on('api-response-time', handleResponseTime);
        return () => socket.off('api-response-time', handleResponseTime);
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

    // ── NEW: helper to color-code write latency ──
    const latencyColor = (ms) => {
        if (ms == null) return 'text-gray-500';
        if (ms < 100) return 'text-green-700';
        if (ms < 400) return 'text-amber-700';
        return 'text-red-700';
    };

    const latencyBg = (ms) => {
        if (ms == null) return 'bg-gray-500/10 border-gray-400';
        if (ms < 100) return 'bg-green-500/10 border-green-500';
        if (ms < 400) return 'bg-amber-500/10 border-amber-500';
        return 'bg-red-500/10 border-red-500';
    };

    // ── NEW: helpers for status code + method styling ──
    const statusColor = (code) => {
        if (code == null) return 'text-gray-500';
        if (code < 300) return 'text-green-700';
        if (code < 400) return 'text-blue-700';
        if (code < 500) return 'text-amber-700';
        return 'text-red-700';
    };

    const methodBadge = (method) => {
        const map = {
            GET: 'bg-blue-100 text-blue-700 border-blue-300',
            POST: 'bg-emerald-100 text-emerald-700 border-emerald-300',
            PATCH: 'bg-amber-100 text-amber-700 border-amber-300',
            PUT: 'bg-amber-100 text-amber-700 border-amber-300',
            DELETE: 'bg-red-100 text-red-700 border-red-300',
        };
        return map[method] || 'bg-gray-100 text-gray-700 border-gray-300';
    };

    // ── NEW: derived stats for the response-time panel ──
    const filteredResponseTimes = useMemo(() => {
        if (methodFilter === 'ALL') return responseTimes;
        return responseTimes.filter(r => r.method === methodFilter);
    }, [responseTimes, methodFilter]);

    const availableMethods = useMemo(() => {
        const set = new Set(responseTimes.map(r => r.method).filter(Boolean));
        return ['ALL', ...Array.from(set)];
    }, [responseTimes]);

    const avgResponseMs = useMemo(() => {
        if (filteredResponseTimes.length === 0) return 0;
        return Math.round(
            filteredResponseTimes.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / filteredResponseTimes.length
        );
    }, [filteredResponseTimes]);

    const slowestResponse = useMemo(() => {
        if (filteredResponseTimes.length === 0) return null;
        return filteredResponseTimes.reduce((max, r) => (r.durationMs > (max?.durationMs ?? 0) ? r : max), null);
    }, [filteredResponseTimes]);

    const errorCount = useMemo(
        () => filteredResponseTimes.filter(r => r.statusCode >= 400).length,
        [filteredResponseTimes]
    );

    return (
        <div className="space-y-4">
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

            {/* ── NEW: Delivery write performance panel ── */}
            <div className="bg-white border border-blue-500 rounded-md p-2">
                <div className="bg-blue-200 p-1 rounded-md mb-2 flex items-center justify-between px-2">
                    <h2 className="font-bold">Delivery Write Performance</h2>
                    <span className="text-xs text-blue-900/60 font-medium">
                        {deliveryEvents.length} recent {deliveryEvents.length === 1 ? 'write' : 'writes'}
                    </span>
                </div>

                {deliveryEvents.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Waiting for delivery events...</p>
                ) : (
                    <>
                        {/* Summary badges */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="text-center bg-blue-500/10 border border-blue-400 rounded-md p-2">
                                <p className="text-xs text-blue-700 font-semibold uppercase">Avg DB Write</p>
                                <p className="text-xl font-bold text-blue-800">
                                    {Math.round(
                                        deliveryEvents.reduce((sum, e) => sum + (e.dbWriteMs ?? 0), 0) / deliveryEvents.length
                                    )} ms
                                </p>
                            </div>
                            <div className="text-center bg-indigo-500/10 border border-indigo-400 rounded-md p-2">
                                <p className="text-xs text-indigo-700 font-semibold uppercase">Total Rows Created</p>
                                <p className="text-xl font-bold text-indigo-800">
                                    {deliveryEvents.reduce((sum, e) => sum + (e.count ?? 0), 0)}
                                </p>
                            </div>
                            <div className="text-center bg-slate-500/10 border border-slate-400 rounded-md p-2">
                                <p className="text-xs text-slate-700 font-semibold uppercase">Last Write</p>
                                <p className="text-xl font-bold text-slate-800">
                                    {deliveryEvents[0]?.dbWriteMs != null ? `${deliveryEvents[0].dbWriteMs} ms` : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Event list */}
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                            {deliveryEvents.map((event, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center justify-between gap-3 border p-2 rounded-md ${latencyBg(event.dbWriteMs)}`}
                                >
                                    <div className="flex flex-col text-sm">
                                        <span className="font-semibold text-gray-800">
                                            Challan #{event.challanId} · Work Order {event.workOrderId}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Yarn ID {event.yarnId} · {event.count} row{event.count === 1 ? '' : 's'} created
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-sm ${latencyColor(event.dbWriteMs)}`}>
                                            {event.dbWriteMs != null ? `${event.dbWriteMs} ms` : 'N/A'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 uppercase">DB write</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* ── NEW: All API response-time panel ── */}
            <div className="bg-white border border-blue-500 rounded-md p-2">
                <div className="bg-blue-200 p-1 rounded-md mb-2 flex items-center justify-between px-2">
                    <h2 className="font-bold">API Response Times</h2>
                    <span className="text-xs text-blue-900/60 font-medium">
                        {filteredResponseTimes.length} recent {filteredResponseTimes.length === 1 ? 'request' : 'requests'}
                    </span>
                </div>

                {responseTimes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Waiting for API traffic...</p>
                ) : (
                    <>
                        {/* Summary badges */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="text-center bg-cyan-500/10 border border-cyan-400 rounded-md p-2">
                                <p className="text-xs text-cyan-700 font-semibold uppercase">Avg Response</p>
                                <p className="text-xl font-bold text-cyan-800">{avgResponseMs} ms</p>
                            </div>
                            <div className="text-center bg-orange-500/10 border border-orange-400 rounded-md p-2">
                                <p className="text-xs text-orange-700 font-semibold uppercase">Slowest</p>
                                <p className="text-xl font-bold text-orange-800">
                                    {slowestResponse?.durationMs != null ? `${slowestResponse.durationMs} ms` : '—'}
                                </p>
                                {slowestResponse?.route && (
                                    <p className="text-[10px] text-orange-600/70 truncate">{slowestResponse.route}</p>
                                )}
                            </div>
                            <div className="text-center bg-red-500/10 border border-red-400 rounded-md p-2">
                                <p className="text-xs text-red-700 font-semibold uppercase">Errors (4xx/5xx)</p>
                                <p className="text-xl font-bold text-red-800">{errorCount}</p>
                            </div>
                        </div>

                        {/* Method filter */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {availableMethods.map((method) => (
                                <button
                                    key={method}
                                    onClick={() => setMethodFilter(method)}
                                    className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition ${
                                        methodFilter === method
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                    }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>

                        {/* Request list */}
                        <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                            {filteredResponseTimes.length === 0 ? (
                                <p className="text-gray-400 text-center py-4 text-sm">No requests match this filter</p>
                            ) : (
                                filteredResponseTimes.map((event, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-3 border p-2 rounded-md ${latencyBg(event.durationMs)}`}
                                    >
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${methodBadge(event.method)}`}>
                                            {event.method}
                                        </span>

                                        <span className="flex-1 text-sm text-gray-800 truncate font-medium">
                                            {event.route}
                                        </span>

                                        <span className={`text-xs font-bold shrink-0 ${statusColor(event.statusCode)}`}>
                                            {event.statusCode}
                                        </span>

                                        <span className={`text-sm font-bold shrink-0 w-16 text-right ${latencyColor(event.durationMs)}`}>
                                            {event.durationMs != null ? `${event.durationMs} ms` : 'N/A'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ApiMonitoring;