import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useAxiosPrivate from "../../../hooks/UseAxiosPrivate";
import { Loader, RefreshCw } from "lucide-react";

const DEDUCTION_RATE = 0.03; // 3% deduction
const TIFFIN_BILL = 4500;    // static tiffin bill in Taka

// rate = Taka per dozen, by process type.
// The summary API does not send a rate, so set the real contract rates here.
// (If the API starts sending `rate` on each record, that value is used instead.)
const RATE_BY_PROCESS = {
    "Body Hem": 0,
    "Neck Joint": 0,
    "Shoulder to Shoulder": 0,
    "Sleeve Hem": 0,
    "Sleeve Join": 0,
    "Cuff Join": 0,
    "Side Seam": 0,
};

const getCompositionName = (comp) => {
    if (!comp) return "";
    if (typeof comp === "string") return comp;
    return comp.name || comp.title || comp.label || "";
};

// ---------- Date helpers ----------
const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toYM = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

// "2026-10" -> { from: "2026-10-01", to: "2026-10-31" }
const monthToRange = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { from: `${ym}-01`, to: `${ym}-${pad(lastDay)}` };
};

// ---------- "Last updated" helpers ----------
const formatDateTime = (d) =>
    d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const formatDateOnly = (d) =>
    d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

const timeAgo = (from, now) => {
    const secs = Math.max(0, Math.floor((now - from) / 1000));
    if (secs < 45) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${Math.max(1, mins)} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
};

const EMPTY_FILTERS = {
    search: "",
    process: "",
    month: "",
    fromDate: "",
    toDate: "",
};

const ContractBilling = () => {
    const axiosPrivate = useAxiosPrivate();

    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [lastFetchedAt, setLastFetchedAt] = useState(null);
    const [now, setNow] = useState(() => new Date());

    // Keep the "x min ago" text fresh
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // ---------- Load real data ----------
    const fetchSummary = useCallback(
        async (isManualRefresh = false) => {
            if (isManualRefresh) setIsRefreshing(true);
            else setIsLoading(true);
            setError("");
            try {
                const { data } = await axiosPrivate.get("/api/get-contractual-job-summary");
                setRecords(Array.isArray(data) ? data : data ? [data] : []);
                setLastFetchedAt(new Date());
            } catch (e) {
                console.error("Failed to load billing data:", e);
                setError("Could not load billing data. Please try again.");
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [axiosPrivate]
    );

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // Most recent change in the data (all records, ignoring filters).
    // Uses updatedAt / createdAt if the API sends them, otherwise the entry date.
    const lastUpdate = useMemo(() => {
        let best = null;
        let hasTime = false;

        records.forEach((r) => {
            const stamp = r.updatedAt || r.createdAt;
            const raw = stamp || r.date;
            if (!raw) return;
            const d = new Date(raw);
            if (isNaN(d)) return;
            if (!best || d > best) {
                best = d;
                hasTime = Boolean(stamp);
            }
        });

        return best ? { date: best, hasTime } : null;
    }, [records]);

    // ---------- Filter handlers ----------
    const handleSearchChange = (e) =>
        setFilters((prev) => ({ ...prev, search: e.target.value }));

    const handleProcessChange = (e) =>
        setFilters((prev) => ({ ...prev, process: e.target.value }));

    // Picking a month sets the from/to range for that month
    const handleMonthChange = (e) => {
        const ym = e.target.value;
        if (!ym) {
            setFilters((prev) => ({ ...prev, month: "", fromDate: "", toDate: "" }));
            return;
        }
        const { from, to } = monthToRange(ym);
        setFilters((prev) => ({ ...prev, month: ym, fromDate: from, toDate: to }));
    };

    // Changing the dates manually clears the month picker
    const handleFromChange = (e) =>
        setFilters((prev) => ({ ...prev, month: "", fromDate: e.target.value }));

    const handleToChange = (e) =>
        setFilters((prev) => ({ ...prev, month: "", toDate: e.target.value }));

    const applyMonthPreset = (offset) => {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const ym = toYM(target);
        const { from, to } = monthToRange(ym);
        setFilters((prev) => ({ ...prev, month: ym, fromDate: from, toDate: to }));
    };

    const applyLastDays = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));
        setFilters((prev) => ({
            ...prev,
            month: "",
            fromDate: toYMD(start),
            toDate: toYMD(end),
        }));
    };

    const clearFilters = () => setFilters(EMPTY_FILTERS);

    const hasActiveFilters =
        filters.search || filters.process || filters.fromDate || filters.toDate;

    // Process types for the dropdown (known list + anything found in the data)
    const processOptions = useMemo(() => {
        const set = new Set(Object.keys(RATE_BY_PROCESS));
        records.forEach((r) => r.processType && set.add(r.processType));
        return Array.from(set).sort();
    }, [records]);

    // ---------- Apply filters ----------
    const filteredRecords = useMemo(() => {
        const term = filters.search.trim().toLowerCase();

        return records.filter((r) => {
            if (term && !(r.jobs?.jobNo || "").toLowerCase().includes(term)) return false;
            if (filters.process && r.processType !== filters.process) return false;

            const day = r.date ? String(r.date).slice(0, 10) : "";
            if (filters.fromDate && (!day || day < filters.fromDate)) return false;
            if (filters.toDate && (!day || day > filters.toDate)) return false;

            return true;
        });
    }, [records, filters]);

    // ---------- Build job -> order qty (composition) -> process rows ----------
    // - a job shows once
    // - each order qty (composition) shows once, with its own process rows
    // - a process shows once inside the same order qty
    const jobGroups = useMemo(() => {
        const jobs = new Map(); // jobNo -> Map(compKey -> comp)

        filteredRecords.forEach((r) => {
            const jobNo = r.jobs?.jobNo || "—";
            const process = r.processType || "—";
            const qty = Number(r.output) || 0; // billed pieces = output
            const orderQty = Number(r.styleReqRows?.orderQty) || 0;
            const compKey =
                r.styleReqRows?.id ?? r.styleReqRowsId ?? `qty-${orderQty}`;

            if (!jobs.has(jobNo)) jobs.set(jobNo, new Map());
            const comps = jobs.get(jobNo);

            if (!comps.has(compKey)) {
                comps.set(compKey, {
                    key: compKey,
                    orderQty,
                    label: getCompositionName(r.styleReqRows?.composition),
                    rowsByProcess: new Map(),
                });
            }
            const comp = comps.get(compKey);

            if (comp.rowsByProcess.has(process)) {
                comp.rowsByProcess.get(process).pcQty += qty;
            } else {
                comp.rowsByProcess.set(process, {
                    jobNo,
                    process,
                    pcQty: qty,
                    rate: Number(r.rate ?? RATE_BY_PROCESS[process] ?? 0) || 0,
                });
            }
        });

        // Continuous serial number across all rows
        let sl = 0;
        return Array.from(jobs.entries()).map(([jobNo, comps]) => {
            const compList = Array.from(comps.values()).map((comp) => ({
                key: comp.key,
                orderQty: comp.orderQty,
                label: comp.label,
                rows: Array.from(comp.rowsByProcess.values()).map((row) => ({
                    ...row,
                    sl: ++sl,
                })),
            }));
            return {
                jobNo,
                comps: compList,
                rowCount: compList.reduce((sum, c) => sum + c.rows.length, 0),
            };
        });
    }, [filteredRecords]);

    // Flat list of unique rows (used for totals)
    const uniqueRows = useMemo(
        () => jobGroups.flatMap((g) => g.comps.flatMap((c) => c.rows)),
        [jobGroups]
    );

    // Order qty total: each order qty counted once
    const totalOrderQty = useMemo(
        () =>
            jobGroups.reduce(
                (sum, g) => sum + g.comps.reduce((s, c) => s + c.orderQty, 0),
                0
            ),
        [jobGroups]
    );

    // ---------- Calculations ----------
    const {
        totalBillingPcs,
        totalBillAmount,
        deductionAmount,
        netBillAmountTk,
    } = useMemo(() => {
        const totalPcs = uniqueRows.reduce((sum, r) => sum + (r.pcQty || 0), 0);

        const billTotal = uniqueRows.reduce((sum, r) => {
            if (!(r.pcQty > 0)) return sum;
            const dozen = r.pcQty / 12;
            return sum + Math.round(dozen * (r.rate || 0));
        }, 0);

        const deduction = Math.round(billTotal * DEDUCTION_RATE);
        const net = billTotal - deduction + (uniqueRows.length > 0 ? TIFFIN_BILL : 0);

        return {
            totalBillingPcs: totalPcs,
            totalBillAmount: billTotal,
            deductionAmount: deduction,
            netBillAmountTk: net,
        };
    }, [uniqueRows]);

    const presetBtn =
        "px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors cursor-pointer";

    const inputCls =
        "w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

    return (
        <div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 md:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-emerald-600 text-white rounded-md text-xs font-bold">৳</span>
                            <h2 className="text-base font-bold text-slate-900">
                                Sewing Contract Billing Statement
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Job-wise and process-wise piece quantity, dozen conversions, contract rates, and gross billing in Taka (Tk).
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
                            <span>
                                Last updated:{" "}
                                <strong className="text-slate-700">
                                    {lastUpdate
                                        ? lastUpdate.hasTime
                                            ? formatDateTime(lastUpdate.date)
                                            : formatDateOnly(lastUpdate.date)
                                        : "—"}
                                </strong>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span>
                                Refreshed:{" "}
                                <strong className="text-slate-700">
                                    {lastFetchedAt ? timeAgo(lastFetchedAt, now) : "—"}
                                </strong>
                            </span>
                            <button
                                type="button"
                                onClick={() => fetchSummary(true)}
                                disabled={isRefreshing || isLoading}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Reload data from the server"
                            >
                                <span className={isRefreshing ? "animate-spin inline-block" : "inline-block"}>
                                    <RefreshCw size={12} />
                                </span>
                                Refresh
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700">
                            Total Pcs: <strong className="text-slate-900">{totalBillingPcs.toLocaleString()}</strong>
                        </span>
                        <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-md font-semibold text-emerald-700">
                            Net Payable: ৳ {netBillAmountTk.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* ---------- Filters ---------- */}
                <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50/60 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Job No</label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={handleSearchChange}
                                placeholder="Search job no"
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Process Type</label>
                            <select
                                value={filters.process}
                                onChange={handleProcessChange}
                                className={inputCls}
                            >
                                <option value="">All Process Types</option>
                                {processOptions.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
                            <input
                                type="month"
                                value={filters.month}
                                onChange={handleMonthChange}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
                            <input
                                type="date"
                                value={filters.fromDate}
                                max={filters.toDate || undefined}
                                onChange={handleFromChange}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
                            <input
                                type="date"
                                value={filters.toDate}
                                min={filters.fromDate || undefined}
                                onChange={handleToChange}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Quick
                            </span>
                            <button type="button" className={presetBtn} onClick={() => applyLastDays(7)}>
                                Last 7 days
                            </button>
                            <button type="button" className={presetBtn} onClick={() => applyLastDays(30)}>
                                Last 30 days
                            </button>
                            <button type="button" className={presetBtn} onClick={() => applyMonthPreset(0)}>
                                This month
                            </button>
                            <button type="button" className={presetBtn} onClick={() => applyMonthPreset(-1)}>
                                Last month
                            </button>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>
                                Showing{" "}
                                <strong className="text-slate-800">{filteredRecords.length}</strong> of{" "}
                                <strong className="text-slate-800">{records.length}</strong> entries
                            </span>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-3 text-center w-12 border-r border-slate-200">SL No</th>
                                <th className="py-3 px-4 border-r border-slate-200">Job No</th>
                                <th className="py-3 px-4 border-r border-slate-200">Process</th>
                                <th className="py-3 px-4 text-right border-r border-slate-200">Order Qty</th>
                                <th className="py-3 px-4 text-right border-r border-slate-200 font-bold">Pc Qty</th>
                                <th className="py-3 px-4 text-right border-r border-slate-200 text-slate-400">
                                    Pc Qty <span className="font-normal text-[10px]">(3% deduction)</span>
                                </th>
                                <th className="py-3 px-4 text-right border-r border-slate-200">Drzn Qnty</th>
                                <th className="py-3 px-4 text-right border-r border-slate-200">Rate (৳)</th>
                                <th className="py-3 px-4 text-right font-bold text-slate-900">Total Taka (৳)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="9" className="py-12 text-center text-slate-400">
                                        <span className="animate-spin inline-block">
                                            <Loader size={20} />
                                        </span>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="9" className="py-12 text-center text-rose-600 font-medium">
                                        {error}
                                    </td>
                                </tr>
                            ) : jobGroups.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="py-12 text-center text-slate-400">
                                        {hasActiveFilters
                                            ? "No billing data matches the selected filters."
                                            : "No billing data found."}
                                    </td>
                                </tr>
                            ) : (
                                jobGroups.flatMap((group, gIdx) =>
                                    group.comps.flatMap((comp, cIdx) =>
                                        comp.rows.map((item, rIdx) => {
                                            const isFirstOfJob = cIdx === 0 && rIdx === 0;
                                            const isFirstOfComp = rIdx === 0;
                                            const hasQty = item.pcQty > 0;
                                            const deduction3 = hasQty ? item.pcQty * DEDUCTION_RATE : 0;
                                            const dozenQty = hasQty ? item.pcQty / 12 : 0;
                                            const lineTotal = dozenQty * (item.rate || 0);

                                            return (
                                                <tr
                                                    key={`${group.jobNo}-${comp.key}-${item.process}`}
                                                    className={`hover:bg-indigo-50/30 transition-colors ${gIdx % 2 === 1 ? "bg-slate-50/40" : "bg-white"} ${isFirstOfJob && gIdx > 0 ? "border-t-2 border-slate-300" : ""}`}
                                                >
                                                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 border-r border-slate-200">
                                                        {item.sl}
                                                    </td>

                                                    {/* Job No is shown once per job */}
                                                    {isFirstOfJob && (
                                                        <td
                                                            rowSpan={group.rowCount}
                                                            className="py-2.5 px-4 font-bold text-indigo-700 align-middle border-r border-slate-200 bg-indigo-50/30"
                                                        >
                                                            {group.jobNo}
                                                        </td>
                                                    )}

                                                    <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                                                        {item.process}
                                                    </td>

                                                    {/* Order Qty is shown once per order qty (composition) */}
                                                    {isFirstOfComp && (
                                                        <td
                                                            rowSpan={comp.rows.length}
                                                            className="py-2.5 px-4 text-right font-bold text-slate-800 align-middle border-r border-slate-200 bg-slate-50/60"
                                                        >
                                                            {comp.orderQty > 0 ? comp.orderQty.toLocaleString() : "—"}
                                                            {comp.label && (
                                                                <span className="block text-[10px] font-normal text-slate-400">
                                                                    {comp.label}
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}

                                                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 border-r border-slate-200">
                                                        {hasQty ? item.pcQty.toLocaleString() : "—"}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right text-slate-400 border-r border-slate-200">
                                                        {hasQty ? Math.round(deduction3).toLocaleString() : "—"}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right text-slate-700 font-mono text-[11px] border-r border-slate-200">
                                                        {hasQty ? dozenQty.toFixed(2) : "0.00"}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right text-slate-700 font-mono text-[11px] border-r border-slate-200">
                                                        {Number(item.rate).toFixed(2)}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono text-[11px]">
                                                        {hasQty ? Math.round(lineTotal).toLocaleString() : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )
                                )
                            )}
                        </tbody>

                        {/* Billing Table Footer Calculations matching the exact sheet */}
                        <tfoot>
                            {/* Total Bill / Total Bill Amount */}
                            <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                                <td colSpan="3" className="py-2.5 px-4 text-center uppercase tracking-wide border-r border-slate-200">
                                    Total
                                </td>
                                <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">
                                    {totalOrderQty > 0 ? totalOrderQty.toLocaleString() : "—"}
                                </td>
                                <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">
                                    {totalBillingPcs.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-4 text-center font-bold text-slate-800 border-r border-slate-200">
                                    Total Bill
                                </td>
                                <td colSpan="2" className="py-2.5 px-4 text-right uppercase tracking-wide font-extrabold text-slate-900 border-r border-slate-200">
                                    TOTAL BILL AMOUNT
                                </td>
                                <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 font-mono text-sm">
                                    {totalBillAmount.toLocaleString()}
                                </td>
                            </tr>

                            {/* Less: 3% deduction */}
                            <tr className="border-t border-slate-200 bg-white text-slate-700">
                                <td colSpan="6" className="border-r border-slate-200"></td>
                                <td colSpan="2" className="py-2 px-4 text-right italic text-slate-600 border-r border-slate-200">
                                    Less: 3% deduction
                                </td>
                                <td className="py-2 px-4 text-right font-medium text-rose-600 font-mono">
                                    - {deductionAmount.toLocaleString()}
                                </td>
                            </tr>

                            {/* Add: Tiffin Bill */}
                            <tr className="border-t border-slate-200 bg-white text-slate-700">
                                <td colSpan="6" className="border-r border-slate-200"></td>
                                <td colSpan="2" className="py-2 px-4 text-right italic text-slate-600 border-r border-slate-200">
                                    Add: Tiffin Bill
                                </td>
                                <td className="py-2 px-4 text-right font-medium text-slate-600 font-mono">
                                    + {(uniqueRows.length > 0 ? TIFFIN_BILL : 0).toLocaleString()}
                                </td>
                            </tr>

                            {/* TOTAL BILL AMOUNT TK. */}
                            <tr className="border-t-2 border-slate-400 bg-emerald-50/70 text-slate-900 font-extrabold">
                                <td colSpan="6" className="border-r border-slate-200"></td>
                                <td colSpan="2" className="py-3 px-4 text-right text-xs uppercase tracking-wider text-emerald-950 border-r border-slate-200">
                                    TOTAL BILL AMOUNT TK.
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-700 font-mono text-base font-extrabold">
                                    ৳ {netBillAmountTk.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ContractBilling;