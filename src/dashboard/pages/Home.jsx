import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
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
import useAxiosPrivate from "../../hooks/UseAxiosPrivate";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const TYPE_COLORS = [
    { bg: "#378ADD", border: "#185FA5" },
    { bg: "#1D9E75", border: "#0F6E56" },
    { bg: "#D85A30", border: "#993C1D" },
    { bg: "#7F77DD", border: "#534AB7" },
    { bg: "#BA7517", border: "#854F0B" },
];

const AVATAR_STYLES = [
    "bg-blue-50 text-blue-700",
    "bg-emerald-50 text-emerald-700",
    "bg-orange-50 text-orange-700",
    "bg-violet-50 text-violet-700",
    "bg-amber-50 text-amber-700",
];

/* ─────────────── delivery metadata ─────────────── */
const DELIVERY_TYPES = {
    knittingOrder: ["Yarn Delivery", "Yarn Return", "Grey Fabric Received"],
    dyeingOrder: [
        "Grey Received", "Grey Delivery", "Grey Return",
        "Sent For Compacting", "Received From Compacting",
        "Sent For Reprocess", "Received From Reprocess",
    ],
    aopOrder: ["Sent For Aop", "Return From Aop", "Received From Aop"],
    yarnDyeingOrder: [
        "Yarn Delivery For Yarn Dye", "Yarn Return From Yarn Dye",
        "Yarn Received From Yarn Dye", "Finish Received", "Finish Return",
    ],
};

const ORDER_LABELS = {
    knittingOrder: "Knitting",
    dyeingOrder: "Dyeing",
    aopOrder: "AOP",
    yarnDyeingOrder: "Yarn Dyeing",
};

// sent = blue, received = green, return = orange
const CATEGORY_STYLES = {
    sent: { rgb: "55, 138, 221", dot: "#378ADD", label: "Delivery / Sent", text: "text-blue-700" },
    received: { rgb: "29, 158, 117", dot: "#1D9E75", label: "Received", text: "text-emerald-700" },
    return: { rgb: "216, 90, 48", dot: "#D85A30", label: "Return", text: "text-orange-700" },
};

const CATEGORY_OF = {
    "Yarn Delivery": "sent", "Yarn Return": "return", "Grey Fabric Received": "received",
    "Grey Received": "received", "Grey Delivery": "sent", "Grey Return": "return",
    "Sent For Compacting": "sent", "Received From Compacting": "received",
    "Sent For Reprocess": "sent", "Received From Reprocess": "received",
    "Sent For Aop": "sent", "Return From Aop": "return", "Received From Aop": "received",
    "Yarn Delivery For Yarn Dye": "sent", "Yarn Return From Yarn Dye": "return",
    "Yarn Received From Yarn Dye": "received", "Finish Received": "received", "Finish Return": "return",
};

const guessCategory = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("return")) return "return";
    if (n.includes("receiv")) return "received";
    return "sent";
};

/* ───────────────────────── helpers ───────────────────────── */
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BDT_OFFSET = 6;
const hourOf = (iso) => (new Date(iso).getUTCHours() + BDT_OFFSET) % 24;
const fmtHour = (h) => {
    const period = h < 12 ? "AM" : "PM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr} ${period}`;
};
const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
const initials = (name = "") =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
const heatColor = (value, max) => {
    if (!value) return "#F1F5F9";
    const t = Math.sqrt(value / max);
    return `rgba(55, 138, 221, ${0.15 + 0.85 * t})`;
};
const formatTick = (label) => {
    if (/^\d{4}-\d{2}$/.test(label))
        return new Date(label).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    if (/^\d{4}-\d{2}-\d{2}/.test(label))
        return new Date(label).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    return label;
};

/* ─────────── Hourly Challan board (light / ERP style) ─────────── */
const HourlyChallanBoard = ({ payload, loading }) => {
    const rows = payload?.data ?? [];

    const { users, grandTotal, peakHour, maxCell } = useMemo(() => {
        const map = new Map();
        const hourTotals = Array(24).fill(0);
        rows.forEach((r) => {
            const h = hourOf(r.hour);
            const u = map.get(r.userId) ?? {
                userId: r.userId, userName: r.userName,
                hours: Array(24).fill(0), total: 0, peakHour: null, peakCount: 0,
            };
            u.hours[h] += r.challanCount;
            u.total += r.challanCount;
            hourTotals[h] += r.challanCount;
            if (r.challanCount > u.peakCount) { u.peakCount = r.challanCount; u.peakHour = h; }
            map.set(r.userId, u);
        });
        const users = [...map.values()].sort((a, b) => b.total - a.total);
        return {
            users,
            grandTotal: users.reduce((s, u) => s + u.total, 0),
            peakHour: hourTotals.indexOf(Math.max(...hourTotals)),
            maxCell: Math.max(1, ...users.flatMap((u) => u.hours)),
        };
    }, [rows]);

    if (loading) return <div className="mt-6 h-44 rounded-xl bg-slate-100 animate-pulse" />;

    if (!rows.length)
        return (
            <div className=" bg-white border border-slate-100 rounded-xl p-5">
                <p className="text-sm font-medium text-slate-700 mb-4">Hourly challan activity</p>
                <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
            </div>
        );

    return (
        <div className="mt-6 bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <p className="text-sm font-medium text-slate-700">Hourly challan activity</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {fmtDate(payload.date)} · granularity: {payload.granularity} · BST (UTC+6)
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                        Total: <b className="text-slate-800 tabular-nums">{grandTotal.toLocaleString()}</b>
                    </span>
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                        Peak hour: <b className="text-blue-700 tabular-nums">{fmtHour(peakHour)}</b>
                    </span>
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                        Users: <b className="text-slate-800 tabular-nums">{users.length}</b>
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                {users.map((u, idx) => (
                    <div key={u.userId} className="flex items-center gap-4">
                        <div className="flex w-44 shrink-0 items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${AVATAR_STYLES[idx % AVATAR_STYLES.length]}`}>
                                {initials(u.userName)}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-700">{u.userName}</p>
                                <p className="text-[11px] text-slate-400">peak {u.peakHour != null ? fmtHour(u.peakHour) : "—"}</p>
                            </div>
                        </div>

                        <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                            {u.hours.map((v, h) => (
                                <div
                                    key={h}
                                    title={`${u.userName} · ${fmtHour(h)} → ${v.toLocaleString()} challans`}
                                    className="h-8 rounded-md cursor-default transition-shadow hover:ring-2 hover:ring-blue-300"
                                    style={{ background: heatColor(v, maxCell) }}
                                />
                            ))}
                        </div>

                        <div className="w-28 shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-slate-800">{u.total.toLocaleString()}</p>
                            <p className="text-[11px] text-slate-400 -mt-0.5">challans</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-2 flex items-center gap-4">
                <div className="w-44 shrink-0" />
                <div className="grid flex-1 text-[10px] text-slate-400" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                    {HOURS.map((h) => (
                        <span key={h} className={[0, 6, 12, 18, 23].includes(h) ? "whitespace-nowrap" : "opacity-0"}>
                            {fmtHour(h)}
                        </span>
                    ))}
                </div>
                <div className="w-28 shrink-0" />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-[11px] text-slate-400">Hover a cell for the exact count</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    Less
                    <span className="h-2 w-24 rounded-full bg-gradient-to-r from-slate-200 to-[#378ADD]" />
                    More
                </div>
            </div>
        </div>
    );
};

/* ─────────── Daily Delivery board (light / ERP style) ─────────── */
/* ─────────── Daily Delivery board (light / ERP style) ─────────── */
const DailyDeliveryBoard = ({ payload, loading }) => {
    const raw = payload?.data;
    const rows = useMemo(() => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === "object")
            return Object.entries(raw).flatMap(([orderType, types]) =>
                Object.entries(types || {}).map(([deliveryType, quantity]) => ({ orderType, deliveryType, quantity }))
            );
        return [];
    }, [raw]);

    const { orderRows, grandTotal, totalEntries, sentTotal, receivedTotal, returnTotal, maxCell } = useMemo(() => {
        const byOrder = new Map();
        rows.forEach((r) => {
            if (!r?.orderType || !r?.deliveryType) return;
            if (!byOrder.has(r.orderType)) byOrder.set(r.orderType, new Map());
            const m = byOrder.get(r.orderType);
            const existing = m.get(r.deliveryType) || { quantity: 0, entries: 0 };
            m.set(r.deliveryType, {
                quantity: existing.quantity + (Number(r.quantity) || 0),
                entries: existing.entries + (Number(r.entries) || 0),
            });
        });

        const catTotals = { sent: 0, received: 0, return: 0 };
        let grandTotal = 0, totalEntries = 0, maxCell = 1;
        const orderRows = [];

        // ✅ fix: always show ALL order types, even if empty today
        const orderKeys = [
            ...Object.keys(DELIVERY_TYPES),                                    // all 4 canonical types
            ...[...byOrder.keys()].filter((k) => !DELIVERY_TYPES[k]),          // + any unknown ones
        ];

        orderKeys.forEach((orderType) => {
            // ✅ fix: empty Map if this order type had no data today
            const qtyMap = byOrder.get(orderType) || new Map();
            const known = DELIVERY_TYPES[orderType] || [];
            const types = [...known, ...[...qtyMap.keys()].filter((t) => !known.includes(t))];

            const cells = types.map((type) => {
                const data = qtyMap.get(type) || { quantity: 0, entries: 0 };
                const { quantity, entries } = data;
                const category = CATEGORY_OF[type] || guessCategory(type);
                catTotals[category] += quantity;
                grandTotal += quantity;
                totalEntries += entries;
                if (quantity > maxCell) maxCell = quantity;
                return { type, quantity, entries, category };
            });

            orderRows.push({
                orderType,
                cells,
                total: cells.reduce((s, c) => s + c.quantity, 0),
                entries: cells.reduce((s, c) => s + c.entries, 0),
            });
        });

        return {
            orderRows, grandTotal, totalEntries, maxCell,
            sentTotal: catTotals.sent,
            receivedTotal: catTotals.received,
            returnTotal: catTotals.return,
        };
    }, [rows]);

    if (loading) return <div className="mt-6 h-44 rounded-xl bg-slate-100 animate-pulse" />;

    // ✅ still show board even with 0 data — so users see the empty grid
    // only hide if we genuinely have nothing to render

    return (
        <div className="mt-6 bg-white border border-slate-100 rounded-xl p-5">
            {/* header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <p className="text-sm font-medium text-slate-700">Daily delivery summary</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {payload?.date ? fmtDate(payload.date) : ""} · quantity by movement type
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                        Total qty: <b className="text-slate-800 tabular-nums">{grandTotal.toLocaleString()}</b>
                    </span>
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                        Deliveries: <b className="text-slate-800 tabular-nums">{totalEntries.toLocaleString()}</b>
                    </span>
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                        Sent: <b className="text-blue-700 tabular-nums">{sentTotal.toLocaleString()}</b>
                    </span>
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                        Received: <b className="text-emerald-700 tabular-nums">{receivedTotal.toLocaleString()}</b>
                    </span>
                    <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                        Returned: <b className="text-orange-700 tabular-nums">{returnTotal.toLocaleString()}</b>
                    </span>
                </div>
            </div>

            {/* per order-type rows */}
            <div className="space-y-3">
                {orderRows.map(({ orderType, cells, total, entries }) => (
                    <div key={orderType} className="flex items-center gap-4">
                        <div className="w-44 shrink-0">
                            <p className="text-sm font-medium text-slate-700">
                                {ORDER_LABELS[orderType] || orderType}
                            </p>
                            <p className="text-[11px] text-slate-400">{cells.length} movement types</p>
                        </div>

                        <div
                            className="grid flex-1 gap-1.5"
                            style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
                        >
                            {cells.map((c) => {
                                const cat = CATEGORY_STYLES[c.category];
                                const t = maxCell > 1 ? Math.sqrt(c.quantity / maxCell) : 0;
                                const strong = t > 0.55;
                                return (
                                    <div
                                        key={c.type}
                                        title={`${c.type} → ${c.quantity.toLocaleString()} qty · ${c.entries} deliveries`}
                                        className="flex h-12 cursor-default flex-col items-center justify-center rounded-md px-2 transition-shadow hover:ring-2 hover:ring-slate-300"
                                        style={{
                                            background: c.quantity
                                                ? `rgba(${cat.rgb}, ${0.12 + 0.88 * t})`
                                                : "#F1F5F9",
                                        }}
                                    >
                                        <span className={`text-sm font-semibold tabular-nums ${strong ? "text-white" : "text-slate-800"}`}>
                                            {c.quantity.toLocaleString()}
                                        </span>
                                        <span className={`w-full truncate text-center text-[10px] ${strong ? "text-white/80" : "text-slate-500"}`}>
                                            {c.type}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="w-28 shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-slate-800">{total.toLocaleString()}</p>
                            <p className="text-[11px] text-slate-400 -mt-0.5">{entries} deliveries</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* footer / legend */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-[11px] text-slate-400">Hover a cell for details</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    {Object.entries(CATEGORY_STYLES).map(([key, c]) => (
                        <span key={key} className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.dot }} />
                            {c.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ───────────────────────── Home ───────────────────────── */
const Home = () => {
    const axiosPrivate = useAxiosPrivate();
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [challan, setChallan] = useState(null);
    const [challanLoading, setChallanLoading] = useState(true);
    const [delivery, setDelivery] = useState(null);
    const [deliveryLoading, setDeliveryLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axiosPrivate.get("api/dashboard-detail");
                setData(res.data);
            } finally {
                setLoading(false);
            }
        };
        const fetchChallanData = async () => {
            try {
                const res = await axiosPrivate.get("/api/reports/hourly-challan");
                setChallan(res.data);
            } finally {
                setChallanLoading(false);
            }
        };
        const fetchDeliveryData = async () => {
            try {
                const res = await axiosPrivate.get("/api/reports/daily-delivery");
                setDelivery(res.data);
            } finally {
                setDeliveryLoading(false);
            }
        };
        fetchData();
        fetchChallanData();
        fetchDeliveryData();
    }, [axiosPrivate]);


  



    return (
        <DashboardLayout title="Dashboard">
            <div className="p-6">
                <HourlyChallanBoard payload={challan} loading={challanLoading} />
                <DailyDeliveryBoard payload={delivery} loading={deliveryLoading} />
            </div>
        </DashboardLayout>
    );
};

export default Home;