import { useMemo, useState } from "react";

const initialJobs = [
    {
        jobNo: "SM-26-4325-JUN",
        remarks: "",
        yarnRows: [
            { factory: "FABRICARES", req: 2680, issue: 2680, knittingGrey: 2684, yarnReturn: null },
            { factory: "SAKIB", req: 2538, issue: 2538, knittingGrey: 2529, yarnReturn: null },
            { factory: "G ARTE", req: 2538, issue: 2538, knittingGrey: 2538, yarnReturn: null },
            { factory: "BORAL", req: 567, issue: 567, knittingGrey: null, yarnReturn: 567 },
            { factory: "TAIPEI", req: 567, issue: 567, knittingGrey: 566, yarnReturn: null },
            { factory: "F R KNIT", req: 209, issue: 209, knittingGrey: 204, yarnReturn: null },
        ],
        dyeing1: { label: "DRESDEN DYEING", greyDelivery: 8550, greyRcvd: 8395, finishRcvd: 7765, processLoss: 0.075 },
        dyeing2: { label: "URMEE AOP", greyDelivery: 5000, greyRcvd: 4500, finishRcvd: 4420, processLoss: 0.0178 },
    },
    {
        jobNo: "SM-26-4402-JUN",
        remarks: "Rush order",
        yarnRows: [
            { factory: "FABRICARES", req: 1800, issue: 1800, knittingGrey: 1795, yarnReturn: null },
            { factory: "TAIPEI", req: 940, issue: 940, knittingGrey: 938, yarnReturn: null },
        ],
        dyeing1: { label: "DRESDEN DYEING", greyDelivery: 2733, greyRcvd: 2700, finishRcvd: 2510, processLoss: 0.0704 },
        dyeing2: { label: "COLORTEX AOP", greyDelivery: 1200, greyRcvd: 1180, finishRcvd: 1150, processLoss: 0.0254 },
    },
];

const yarnBalance = (row) => (row.issue || 0) - (row.knittingGrey || 0) - (row.yarnReturn || 0);
const dyeBalance = (d) => d.greyDelivery - d.greyRcvd;

const fmtNum = (n) => {
    if (n === null || n === undefined) return <span className="text-slate-300">—</span>;
    if (n === 0) return <span className="text-slate-300">0</span>;
    const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n < 0) return <span className="text-rose-600 font-medium">({abs})</span>;
    return abs;
};
const fmtPct = (n) => (n === null || n === undefined ? <span className="text-slate-300">—</span> : `${(n * 100).toFixed(2)}%`);
const rawNum = (n) => (n === null || n === undefined ? "" : String(n));

const COLUMNS = [
    { id: "jobNo", label: "Job No", width: 110, group: "yarn" },
    { id: "yarnFactory", label: "Factory Name", width: 130, group: "yarn" },
    { id: "yarnReq", label: "Yarn Req", width: 90, group: "yarn" },
    { id: "yarnIssue", label: "Yarn Issue", width: 90, group: "yarn" },
    { id: "knittingGrey", label: "Knitting Grey", width: 100, group: "yarn" },
    { id: "yarnReturn", label: "Yarn Return", width: 95, group: "yarn" },
    { id: "yarnBalance", label: "Balance", width: 85, group: "yarn" },
    { id: "d1Factory", label: "Grey Issue Factory", width: 130, group: "d1" },
    { id: "d1Delivery", label: "Grey Delivery", width: 90, group: "d1" },
    { id: "d1Rcvd", label: "Grey Rcvd", width: 85, group: "d1" },
    { id: "d1Balance", label: "Balance", width: 85, group: "d1" },
    { id: "d1Finish", label: "Finish Rcvd", width: 90, group: "d1" },
    { id: "d1Loss", label: "Process Loss", width: 85, group: "d1" },
    { id: "d2Factory", label: "Grey Issue Factory", width: 130, group: "d2" },
    { id: "d2Delivery", label: "Grey Delivery", width: 90, group: "d2" },
    { id: "d2Rcvd", label: "Grey Rcvd", width: 85, group: "d2" },
    { id: "d2Balance", label: "Balance", width: 85, group: "d2" },
    { id: "d2Finish", label: "Finish Rcvd", width: 90, group: "d2" },
    { id: "d2Loss", label: "Process Loss", width: 85, group: "d2" },
    { id: "remarks", label: "Remarks", width: 140, group: "remarks" },
];

const FROZEN_IDS = ["jobNo", "yarnFactory", "yarnReq", "yarnIssue", "knittingGrey", "yarnReturn", "yarnBalance"];

let acc = 0;
const COL_LEFT = {};
COLUMNS.forEach((c) => { COL_LEFT[c.id] = acc; acc += c.width; });
const TOTAL_WIDTH = acc;

const csvCell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const ExcelFilter = ({ colId, allJobs, excluded, setExcluded, openCol, setOpenCol, align = "left", valueGetter }) => {
    const isOpen = openCol === colId;
    const isActive = excluded.size > 0;

    const uniqueValues = useMemo(() => {
        const set = new Set();
        allJobs.forEach((j) => {
            const values = valueGetter ? valueGetter(j) : [];
            values.forEach((v) => { if (v !== "" && v != null) set.add(String(v)); });
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [allJobs, colId, valueGetter]);

    const toggleValue = (val) => {
        const next = new Set(excluded);
        next.has(val) ? next.delete(val) : next.add(val);
        setExcluded(colId, next);
    };
    const toggleAll = () => setExcluded(colId, excluded.size > 0 ? new Set() : new Set(uniqueValues));

    return (
        <span className="relative inline-block">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpenCol(isOpen ? null : colId); }}
                className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded shrink-0 ${
                    isActive ? "bg-amber-400 text-[#0f2544]" : "bg-slate-300 text-slate-700 hover:bg-slate-400"
                }`}
                title="Filter this column"
            >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                    <path d="M2 3.5A.5.5 0 012.5 3h15a.5.5 0 01.4.8l-5.9 7.4v4.3a.5.5 0 01-.7.46l-3-1.2a.5.5 0 01-.3-.46v-3.1L2.1 3.8A.5.5 0 012 3.5z" />
                </svg>
            </button>

            {isOpen && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute z-50 top-6 ${align === "right" ? "right-0" : "left-0"} w-48 bg-white border border-slate-300 rounded-md shadow-lg p-2 normal-case font-normal text-slate-700`}
                >
                    <label className="flex items-center gap-2 px-1 py-1 text-xs font-medium border-b border-slate-200 mb-1 cursor-pointer">
                        <input type="checkbox" checked={excluded.size === 0} onChange={toggleAll} />
                        Select All
                    </label>
                    <div className="max-h-44 overflow-auto">
                        {uniqueValues.map((val) => (
                            <label key={val} className="flex items-center gap-2 px-1 py-1 text-xs cursor-pointer hover:bg-slate-50 rounded">
                                <input type="checkbox" checked={!excluded.has(val)} onChange={() => toggleValue(val)} />
                                <span className="truncate">{val}</span>
                            </label>
                        ))}
                        {uniqueValues.length === 0 && <div className="px-1 py-1 text-xs text-slate-400">No values</div>}
                    </div>
                    <div className="flex justify-between mt-1.5 pt-1.5 border-t border-slate-200">
                        <button onClick={() => setExcluded(colId, new Set())} className="text-[11px] text-slate-500 hover:text-slate-800">
                            Clear
                        </button>
                        <button onClick={() => setOpenCol(null)} className="text-[11px] font-medium text-[#0f2544] hover:underline">
                            OK
                        </button>
                    </div>
                </div>
            )}
        </span>
    );
};

const BalanceSheet = () => {
    const [jobs, setJobs] = useState(initialJobs);
    const [search, setSearch] = useState("");
    const [colFilters, setColFilters] = useState({});
    const [openCol, setOpenCol] = useState(null);
    const [hasUnsavedRemarks, setHasUnsavedRemarks] = useState(false);
    const [wrapText, setWrapText] = useState(false);
    const [editingCell, setEditingCell] = useState(null);

    const setExcludedFor = (colId, set) => setColFilters((prev) => ({ ...prev, [colId]: set }));
    
    const updateRemarks = (jobIdx, text) => {
        setJobs((prev) => prev.map((j, i) => (i === jobIdx ? { ...j, remarks: text } : j)));
        setHasUnsavedRemarks(true);
    };

    const handleSaveRemarks = () => {
        setHasUnsavedRemarks(false);
        setEditingCell(null);
    };

    const handleDoubleClick = (jobIdx) => {
        setEditingCell(jobIdx);
    };

    const filteredJobs = useMemo(() => {
        return jobs.map((job, jobIdx) => {
            const matchesSearch = !search || 
                job.jobNo.toLowerCase().includes(search.toLowerCase()) ||
                job.yarnRows.some(r => r.factory.toLowerCase().includes(search.toLowerCase()));
            
            if (!matchesSearch) return null;

            const jobLevelColIds = ['d1Factory', 'd2Factory', 'remarks'];
            
            for (const colId of jobLevelColIds) {
                const excluded = colFilters[colId];
                if (excluded && excluded.size > 0) {
                    let values = [];
                    if (colId === 'd1Factory') values = [job.dyeing1.label];
                    else if (colId === 'd2Factory') values = [job.dyeing2.label];
                    else if (colId === 'remarks') values = [job.remarks].filter(Boolean);
                    
                    if (values.every(v => excluded.has(v))) {
                        return null;
                    }
                }
            }

            const filteredYarnRows = job.yarnRows.filter(row => {
                const yarnColIds = ['yarnFactory', 'yarnReq', 'yarnIssue', 'knittingGrey', 'yarnReturn', 'yarnBalance'];
                for (const colId of yarnColIds) {
                    const excluded = colFilters[colId];
                    if (excluded && excluded.size > 0) {
                        let val = "";
                        if (colId === 'yarnFactory') val = row.factory;
                        else if (colId === 'yarnReq') val = String(row.req ?? "");
                        else if (colId === 'yarnIssue') val = String(row.issue ?? "");
                        else if (colId === 'knittingGrey') val = String(row.knittingGrey ?? "");
                        else if (colId === 'yarnReturn') val = String(row.yarnReturn ?? "");
                        else if (colId === 'yarnBalance') val = String(yarnBalance(row) ?? "");
                        
                        if (excluded.has(val)) return false;
                    }
                }
                return true;
            });

            if (filteredYarnRows.length === 0) return null;
            return { job: { ...job, yarnRows: filteredYarnRows }, idx: jobIdx };
        }).filter(Boolean);
    }, [jobs, search, colFilters]);

    const totals = useMemo(() => {
        const t = {
            req: 0, issue: 0, knittingGrey: 0, yarnReturn: 0, yarnBal: 0,
            d1Delivery: 0, d1Rcvd: 0, d1Bal: 0, d1Finish: 0,
            d2Delivery: 0, d2Rcvd: 0, d2Bal: 0, d2Finish: 0,
        };
        filteredJobs.forEach(({ job }) => {
            job.yarnRows.forEach((row) => {
                t.req += row.req || 0;
                t.issue += row.issue || 0;
                t.knittingGrey += row.knittingGrey || 0;
                t.yarnReturn += row.yarnReturn || 0;
                t.yarnBal += yarnBalance(row);
            });
            t.d1Delivery += job.dyeing1.greyDelivery || 0;
            t.d1Rcvd += job.dyeing1.greyRcvd || 0;
            t.d1Bal += dyeBalance(job.dyeing1) || 0;
            t.d1Finish += job.dyeing1.finishRcvd || 0;
            t.d2Delivery += job.dyeing2.greyDelivery || 0;
            t.d2Rcvd += job.dyeing2.greyRcvd || 0;
            t.d2Bal += dyeBalance(job.dyeing2) || 0;
            t.d2Finish += job.dyeing2.finishRcvd || 0;
        });
        return t;
    }, [filteredJobs]);

    const avgLoss = (deliveryKey, rcvdKey) => {
        const delivery = totals[deliveryKey];
        const rcvd = totals[rcvdKey];
        if (!delivery) return null;
        return (delivery - rcvd) / delivery;
    };

    const hasFilters = search || Object.values(colFilters).some((s) => s && s.size > 0);
    const clearAll = () => { setSearch(""); setColFilters({}); setOpenCol(null); };

    const exportCsv = () => {
        const header = COLUMNS.map((c) => c.label);
        const lines = [header.map(csvCell).join(",")];

        filteredJobs.forEach(({ job }) => {
            job.yarnRows.forEach((row, i) => {
                const cells = [
                    i === 0 ? job.jobNo : "",
                    row.factory,
                    rawNum(row.req),
                    rawNum(row.issue),
                    rawNum(row.knittingGrey),
                    rawNum(row.yarnReturn),
                    rawNum(yarnBalance(row)),
                    i === 0 ? job.dyeing1.label : "",
                    i === 0 ? rawNum(job.dyeing1.greyDelivery) : "",
                    i === 0 ? rawNum(job.dyeing1.greyRcvd) : "",
                    i === 0 ? rawNum(dyeBalance(job.dyeing1)) : "",
                    i === 0 ? rawNum(job.dyeing1.finishRcvd) : "",
                    i === 0 ? rawNum(job.dyeing1.processLoss) : "",
                    i === 0 ? job.dyeing2.label : "",
                    i === 0 ? rawNum(job.dyeing2.greyDelivery) : "",
                    i === 0 ? rawNum(job.dyeing2.greyRcvd) : "",
                    i === 0 ? rawNum(dyeBalance(job.dyeing2)) : "",
                    i === 0 ? rawNum(job.dyeing2.finishRcvd) : "",
                    i === 0 ? rawNum(job.dyeing2.processLoss) : "",
                    i === 0 ? job.remarks : "",
                ];
                lines.push(cells.map(csvCell).join(","));
            });
        });

        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `balance-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const getColWidth = (id) => COLUMNS.find(c => c.id === id)?.width || 100;
    const getColLeft = (id) => COL_LEFT[id] || 0;
    const isFrozen = (id) => FROZEN_IDS.includes(id);

    const getColValueGetter = (colId) => {
        if (colId === 'yarnFactory') return (j) => j.yarnRows.map(r => r.factory);
        if (colId === 'yarnReq') return (j) => j.yarnRows.map(r => String(r.req));
        if (colId === 'yarnIssue') return (j) => j.yarnRows.map(r => String(r.issue));
        if (colId === 'knittingGrey') return (j) => j.yarnRows.map(r => String(r.knittingGrey));
        if (colId === 'yarnReturn') return (j) => j.yarnRows.map(r => String(r.yarnReturn));
        if (colId === 'yarnBalance') return (j) => j.yarnRows.map(r => String(yarnBalance(r)));
        if (colId === 'd1Factory') return (j) => [j.dyeing1.label];
        if (colId === 'd1Delivery') return (j) => [String(j.dyeing1.greyDelivery)];
        if (colId === 'd1Rcvd') return (j) => [String(j.dyeing1.greyRcvd)];
        if (colId === 'd1Balance') return (j) => [String(dyeBalance(j.dyeing1))];
        if (colId === 'd1Finish') return (j) => [String(j.dyeing1.finishRcvd)];
        if (colId === 'd1Loss') return (j) => [String(j.dyeing1.processLoss)];
        if (colId === 'd2Factory') return (j) => [j.dyeing2.label];
        if (colId === 'd2Delivery') return (j) => [String(j.dyeing2.greyDelivery)];
        if (colId === 'd2Rcvd') return (j) => [String(j.dyeing2.greyRcvd)];
        if (colId === 'd2Balance') return (j) => [String(dyeBalance(j.dyeing2))];
        if (colId === 'd2Finish') return (j) => [String(j.dyeing2.finishRcvd)];
        if (colId === 'd2Loss') return (j) => [String(j.dyeing2.processLoss)];
        if (colId === 'remarks') return (j) => [j.remarks].filter(Boolean);
        return () => [];
    };

    const cellStyle = (colId, extra = {}) => {
        const w = getColWidth(colId);
        if (isFrozen(colId)) {
            return { position: "sticky", left: getColLeft(colId), width: w, minWidth: w, maxWidth: w, zIndex: 10, ...extra };
        }
        return { width: w, minWidth: w, maxWidth: w, ...extra };
    };

    const headerCellStyle = (colId, extra = {}) => {
        const w = getColWidth(colId);
        if (isFrozen(colId)) {
            return { position: "sticky", left: getColLeft(colId), width: w, minWidth: w, maxWidth: w, zIndex: 30, ...extra };
        }
        return { width: w, minWidth: w, maxWidth: w, ...extra };
    };

    return (
        <div className="p-5 bg-slate-50 min-h-full" onClick={() => setOpenCol(null)}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">Yarn &amp; Dyeing Balance Sheet</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Figures in kg unless noted · {filteredJobs.length} of {jobs.length} jobs shown</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search job no. or factory"
                            className="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-md w-64 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 bg-white"
                        />
                    </div>

                    <button
                        onClick={() => setWrapText(!wrapText)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border ${
                            wrapText ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        Wrap Text
                    </button>

                    {hasFilters && (
                        <button onClick={(e) => { e.stopPropagation(); clearAll(); }} className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1.5">
                            Clear filters
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); exportCsv(); }}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded-md"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>

            {hasUnsavedRemarks && (
                <div className="mb-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-medium text-amber-800">You have unsaved changes in the remarks.</span>
                    </div>
                    <button 
                        onClick={handleSaveRemarks}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                    </button>
                </div>
            )}

            <div className="overflow-auto border border-slate-300 rounded-lg shadow-sm bg-white">
                <table className="border-collapse tabular-nums text-[11px]" style={{ width: TOTAL_WIDTH, minWidth: TOTAL_WIDTH }}>
                    <thead>
                        <tr className="bg-slate-200">
                            <th 
                                colSpan={7} 
                                style={{ position: 'sticky', left: 0, zIndex: 40, width: getColLeft('yarnBalance') + getColWidth('yarnBalance') }}
                                className="px-0 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 border border-slate-300"
                            >
                                YARN
                            </th>
                            <th colSpan={6} className="px-0 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 border border-slate-300">
                                DYEING
                            </th>
                            <th colSpan={6} className="px-0 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 border border-slate-300">
                                DYEING FACTORY — AOP
                            </th>
                            <th className="px-0 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 border border-slate-300 bg-slate-200" style={{ width: getColWidth('remarks') }}>
                                <div className="flex items-center justify-center gap-1">
                                    REMARKS
                                    <ExcelFilter 
                                        colId="remarks"
                                        allJobs={jobs} 
                                        excluded={colFilters.remarks || new Set()} 
                                        setExcluded={setExcludedFor} 
                                        openCol={openCol} 
                                        setOpenCol={setOpenCol} 
                                        align="right"
                                        valueGetter={getColValueGetter('remarks')}
                                    />
                                </div>
                            </th>
                        </tr>
                        <tr className="bg-slate-100">
                            {COLUMNS.map((col) => {
                                const isLastFrozen = col.id === 'yarnBalance';
                                return (
                                    <th
                                        key={col.id}
                                        style={headerCellStyle(col.id, { 
                                            borderRight: isLastFrozen ? '2px solid #94a3b8' : '1px solid #cbd5e1',
                                            borderBottom: '1px solid #cbd5e1'
                                        })}
                                        className={`px-1 py-2 text-[10px] font-semibold uppercase bg-slate-100 border border-slate-300 ${
                                            col.id === 'jobNo' || col.id === 'yarnFactory' || col.id === 'd1Factory' || col.id === 'd2Factory' ? 'text-left' : 'text-right'
                                        }`}
                                    >
                                        <div className={`flex items-center ${
                                            col.id === 'jobNo' || col.id === 'yarnFactory' || col.id === 'd1Factory' || col.id === 'd2Factory' ? "" : "justify-end"
                                        } gap-1`}>
                                            {col.label}
                                            <ExcelFilter 
                                                colId={col.id}
                                                allJobs={jobs} 
                                                excluded={colFilters[col.id] || new Set()} 
                                                setExcluded={setExcludedFor} 
                                                openCol={openCol} 
                                                setOpenCol={setOpenCol}
                                                valueGetter={getColValueGetter(col.id)}
                                            />
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {filteredJobs.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-sm text-slate-400">
                                    No jobs match the current filters.
                                </td>
                            </tr>
                        )}

                        {filteredJobs.map(({ job, idx: jobIdx }) => {
                            const rowCount = job.yarnRows.length;
                            return job.yarnRows.map((row, rowIdx) => (
                                <tr key={`${jobIdx}-${rowIdx}`} className="border-b border-slate-200 hover:bg-amber-50/30">
                                    {rowIdx === 0 && (
                                        <td 
                                            rowSpan={rowCount} 
                                            style={cellStyle("jobNo")} 
                                            className="px-1 py-1.5 border border-slate-300 align-middle text-center font-semibold text-slate-800 bg-slate-50"
                                        >
                                            {job.jobNo}
                                        </td>
                                    )}

                                    <td 
                                        style={cellStyle("yarnFactory")} 
                                        className={`px-1 py-1.5 border border-slate-300 text-slate-600 bg-white text-left ${wrapText ? 'whitespace-normal' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}
                                    >
                                        {row.factory}
                                    </td>
                                    <td style={cellStyle("yarnReq")} className="px-1 py-1.5 border border-slate-300 text-right bg-white">{fmtNum(row.req)}</td>
                                    <td style={cellStyle("yarnIssue")} className="px-1 py-1.5 border border-slate-300 text-right bg-white">{fmtNum(row.issue)}</td>
                                    <td style={cellStyle("knittingGrey")} className="px-1 py-1.5 border border-slate-300 text-right bg-white">{fmtNum(row.knittingGrey)}</td>
                                    <td style={cellStyle("yarnReturn")} className="px-1 py-1.5 border border-slate-300 text-right bg-white">{fmtNum(row.yarnReturn)}</td>
                                    <td style={cellStyle("yarnBalance")} className="px-1 py-1.5 border-r-2 border-r-slate-400 border-y border-slate-300 text-right bg-white">{fmtNum(yarnBalance(row))}</td>

                                    {rowIdx === 0 && (
                                        <>
                                            <td rowSpan={rowCount} style={cellStyle("d1Factory")} className={`px-1 py-1.5 border border-slate-300 align-middle text-center bg-teal-50/30 ${wrapText ? 'whitespace-normal' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}>{job.dyeing1.label}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d1Delivery")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-teal-50/30">{fmtNum(job.dyeing1.greyDelivery)}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d1Rcvd")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-teal-50/30">{fmtNum(job.dyeing1.greyRcvd)}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d1Balance")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-teal-50/30">{fmtNum(dyeBalance(job.dyeing1))}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d1Finish")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-teal-50/30">{fmtNum(job.dyeing1.finishRcvd)}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d1Loss")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-teal-50/30">{fmtPct(job.dyeing1.processLoss)}</td>

                                            <td rowSpan={rowCount} style={cellStyle("d2Factory")} className={`px-1 py-1.5 border border-slate-300 align-middle text-center bg-violet-50/30 ${wrapText ? 'whitespace-normal' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}>{job.dyeing2.label}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d2Delivery")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-violet-50/30">{fmtNum(job.dyeing2.greyDelivery)}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d2Rcvd")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-violet-50/30">{fmtNum(job.dyeing2.greyRcvd)}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d2Balance")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-violet-50/30">{fmtNum(dyeBalance(job.dyeing2))}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d2Finish")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-violet-50/30">{fmtNum(job.dyeing2.finishRcvd)}</td>
                                            <td rowSpan={rowCount} style={cellStyle("d2Loss")} className="px-1 py-1.5 border border-slate-300 align-middle text-right bg-violet-50/30">{fmtPct(job.dyeing2.processLoss)}</td>

                                            <td rowSpan={rowCount} style={cellStyle("remarks")} className="px-1 py-1.5 border border-slate-300 align-middle text-center">
                                                {editingCell === jobIdx ? (
                                                    <input
                                                        type="text"
                                                        value={job.remarks}
                                                        onChange={(e) => updateRemarks(jobIdx, e.target.value)}
                                                        onBlur={handleSaveRemarks}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRemarks()}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                        className="w-full px-1 py-0.5 text-xs text-slate-700 border border-slate-400 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 outline-none text-center"
                                                    />
                                                ) : (
                                                    <div 
                                                        onDoubleClick={() => handleDoubleClick(jobIdx)}
                                                        className={`cursor-pointer px-1 py-0.5 text-xs text-slate-700 ${wrapText ? 'whitespace-normal' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}
                                                        title="Double-click to edit"
                                                    >
                                                        {job.remarks || <span className="text-slate-400 italic text-[10px]">Double-click to edit</span>}
                                                    </div>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ));
                        })}
                    </tbody>

                    {filteredJobs.length > 0 && (
                        <tfoot>
                            <tr className="bg-slate-700 text-white font-bold text-[11px]">
                                <td style={cellStyle("jobNo")} className="px-1 py-2 border border-slate-300 bg-slate-700 text-center">Subtotal</td>
                                <td style={cellStyle("yarnFactory")} className="px-1 py-2 border border-slate-300 bg-slate-700"></td>
                                <td style={cellStyle("yarnReq")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.req.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("yarnIssue")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.issue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("knittingGrey")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.knittingGrey.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("yarnReturn")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.yarnReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("yarnBalance")} className="px-1 py-2 border-r-2 border-r-slate-400 border-y border-slate-300 text-right bg-slate-700">{totals.yarnBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>

                                <td style={cellStyle("d1Factory")} className="px-1 py-2 border border-slate-300 bg-slate-700"></td>
                                <td style={cellStyle("d1Delivery")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.d1Delivery.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("d1Rcvd")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.d1Rcvd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("d1Balance")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.d1Bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("d1Finish")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.d1Finish.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("d1Loss")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">
                                    {(() => { const l = avgLoss("d1Delivery", "d1Rcvd"); return l === null ? "—" : `${(l * 100).toFixed(2)}%`; })()}
                                </td>

                                <td style={cellStyle("d2Factory")} className="px-1 py-2 border border-slate-300 bg-slate-700"></td>
                                <td style={cellStyle("d2Delivery")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.d2Delivery.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("d2Rcvd")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.d2Rcvd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("d2Balance")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.d2Bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("d2Finish")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">{totals.d2Finish.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={cellStyle("d2Loss")} className="px-1 py-2 border border-slate-300 text-right bg-slate-700">
                                    {(() => { const l = avgLoss("d2Delivery", "d2Rcvd"); return l === null ? "—" : `${(l * 100).toFixed(2)}%`; })()}
                                </td>

                                <td style={cellStyle("remarks")} className="px-1 py-2 border border-slate-300 bg-slate-700"></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default BalanceSheet;