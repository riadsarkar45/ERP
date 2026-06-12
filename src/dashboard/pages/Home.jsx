import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import useAxiosPublic from "../../hooks/Axios";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const TYPE_COLORS = [
    { bg: "#378ADD", border: "#185FA5" },
    { bg: "#1D9E75", border: "#0F6E56" },
    { bg: "#D85A30", border: "#993C1D" },
    { bg: "#7F77DD", border: "#534AB7" },
    { bg: "#BA7517", border: "#854F0B" },
];

const Home = () => {
    const axiosPublic = useAxiosPublic();
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axiosPublic.get("api/dashboard-detail");
                setData(res.data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [axiosPublic]);

    // ── Bar chart (jobsType) ──────────────────────────────────────────
    const types = Object.keys(data.jobsType || {});
    const allMonths = [
        ...new Set(types.flatMap((t) => Object.keys((data.jobsType || {})[t]))),
    ].sort();

    const barData = {
        labels: allMonths,
        datasets: types.map((type, i) => ({
            label: type,
            data: allMonths.map((m) => (data.jobsType[type][m] ?? 0)),
            backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length].bg + "CC",
            borderColor: TYPE_COLORS[i % TYPE_COLORS.length].border,
            borderWidth: 1.5,
            borderRadius: 4,
        })),
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} jobs`,
                },
            },
        },
        scales: {
            x: {
                ticks: { autoSkip: false, color: "#888780" },
                grid: { color: "rgba(136,135,128,0.12)" },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                    color: "#888780",
                    callback: (v) => (Number.isInteger(v) ? v : null),
                },
                grid: { color: "rgba(136,135,128,0.12)" },
            },
        },
    };

    // ── Pie chart (jobsDate) ──────────────────────────────────────────
    const dateLabels = Object.keys(data.jobsDate || {});
    const dateValues = Object.values(data.jobsDate || {});

    const pieData = {
        labels: dateLabels,
        datasets: [
            {
                data: dateValues,
                backgroundColor: TYPE_COLORS.map((c) => c.bg + "CC"),
                borderColor: TYPE_COLORS.map((c) => c.border),
                borderWidth: 1.5,
            },
        ],
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "right",
                labels: { color: "#888780", font: { size: 12 } },
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toLocaleString()} qty`,
                },
            },
        },
    };

    return (
        <DashboardLayout title="Dashboard">
            <div className="p-6">
                <div className="grid grid-cols-2 gap-6">

                    {/* ── Bar chart card ── */}
                    <div className="bg-white border border-slate-100 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-slate-700">Jobs by type</p>
                            <div className="flex flex-wrap gap-3">
                                {types.map((type, i) => (
                                    <span
                                        key={type}
                                        className="flex items-center gap-1.5 text-xs text-slate-500"
                                    >
                                        <span
                                            className="inline-block w-2.5 h-2.5 rounded-sm"
                                            style={{ background: TYPE_COLORS[i % TYPE_COLORS.length].bg }}
                                        />
                                        {type}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                                Loading…
                            </div>
                        ) : allMonths.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                                No data yet
                            </div>
                        ) : (
                            <div style={{ height: 280 }}>
                                <Bar data={barData} options={barOptions} />
                            </div>
                        )}
                    </div>

                    {/* ── Pie chart card ── */}
                    <div className="bg-white border border-slate-100 rounded-xl p-5">
                        <p className="text-sm font-medium text-slate-700 mb-4">
                            Quantity by date
                        </p>

                        {loading ? (
                            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                                Loading…
                            </div>
                        ) : dateLabels.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                                No data yet
                            </div>
                        ) : (
                            <div style={{ height: 280 }}>
                                <Pie data={pieData} options={pieOptions} />
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

export default Home;