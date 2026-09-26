import React, { useEffect, useState } from "react";
import useAxiosPrivate from "../../../hooks/UseAxiosPrivate";

// ---- helpers ---------------------------------------------------------

const fmt = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const fmtPct = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    return `${n > 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
};

// Fixed work-order type columns
const WORK_ORDER_TYPES = [
    { key: "knittingOrder", label: "Knitting" },
    { key: "dyeingOrder", label: "Dyeing" },
    { key: "aopOrder", label: "AOP" },
];

// Fixed delivery type columns
const DELIVERY_TYPES = [
    { key: "YarnDelivery", label: "Yarn Delivery" },
    { key: "YarnReturn", label: "Yarn Return" },
    { key: "GreyDelivery", label: "Grey Delivery" },
    { key: "GreyReceived", label: "Grey Rcvd" },
    { key: "GreyFabricReceived", label: "Grey Fabric Rcvd" },
    { key: "GreyReturn", label: "Grey Return" },
    { key: "FinishReceived", label: "Finish Rcvd" },
    { key: "SentForAop", label: "Sent For AOP" },
    { key: "ReceivedFromAop", label: "Rcvd From AOP" },
    { key: "AOPFinishFabricRcvd", label: "AOP Finish Rcvd" },
];

// Fixed columns to freeze (Excel-like) with exact widths and left offsets
const FIXED_COLS = [
    { key: "jobNo", label: "Job No", width: 120, left: 0 },
    { key: "styleNo", label: "Style No", width: 120, left: 120 },
    { key: "buyerName", label: "Buyer", width: 140, left: 240 },
    { key: "poNo", label: "PO No", width: 120, left: 380 },
    { key: "targetProcessLoss", label: "Target Loss %", width: 110, left: 500, isRight: true },
    { key: "yarnRequiredQty", label: "Yarn Req Qty", width: 120, left: 610, isRight: true },
    { key: "totalFinishRequiredQty", label: "Finish Req Qty", width: 130, left: 730, isRight: true },
];

const TOTAL_COLS = 7 + WORK_ORDER_TYPES.length * 3 + DELIVERY_TYPES.length;
const PAGE_SIZE_OPTIONS = [25, 50, 70, 90];

// ---- component ---------------------------------------------------------

const HighLossJob = () => {
    const axiosSecure = useAxiosPrivate();

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    useEffect(() => {
        const fetchHighLossJobs = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axiosSecure.get("/api/high-loss-job");
                setJobs(res.data?.data ?? []);
            } catch (err) {
                console.error(err);
                setError("Failed to load high loss job data.");
            } finally {
                setLoading(false);
            }
        };
        fetchHighLossJobs();
    }, [axiosSecure]);

    const filteredJobs = jobs.filter((j) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            j.jobNo?.toLowerCase().includes(q) ||
            j.styleNo?.toLowerCase().includes(q) ||
            j.buyerName?.toLowerCase().includes(q) ||
            j.poNo?.toLowerCase().includes(q)
        );
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [search, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const paginatedJobs = filteredJobs.slice(startIdx, startIdx + pageSize);

    const goToPage = (p) => {
        setCurrentPage(Math.min(Math.max(1, p), totalPages));
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        High Process-Loss Jobs
                    </h2>
                    <p className="text-sm text-slate-500">
                        {filteredJobs.length} of {jobs.length} flagged jobs
                        {search.trim() && " (filtered)"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="border border-black rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                                {size} / page
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search job no, style, buyer, PO..."
                        className="border border-black rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
            </div>

            {/* CRITICAL: max-h-[70vh] and overflow-auto enable the Excel-like frozen pane scrolling */}
            <div className="overflow-auto border border-black rounded-lg shadow-sm bg-white max-h-[70vh]">
                {/* border-separate and border-spacing-0 are REQUIRED for sticky table cells to work with borders */}
                <table className="text-sm border-separate border-spacing-0 min-w-max">
                    <thead className="text-white">
                        {/* Group header row (z-50 ensures it stays on top of everything) */}
                        <tr>
                            <th
                                colSpan={7}
                                className="sticky top-0 z-50 px-3 py-2 text-left font-semibold bg-slate-800 border border-black"
                                style={{ width: "860px", minWidth: "860px" }}
                            >
                                JOB INFO
                            </th>
                            {WORK_ORDER_TYPES.map((t) => (
                                <th
                                    key={t.key}
                                    colSpan={3}
                                    className="sticky top-0 z-50 px-3 py-2 text-center font-semibold bg-slate-800 border border-black"
                                >
                                    {t.label.toUpperCase()}
                                </th>
                            ))}
                            <th
                                colSpan={DELIVERY_TYPES.length}
                                className="sticky top-0 z-50 px-3 py-2 text-center font-semibold bg-slate-800 border border-black"
                            >
                                DELIVERIES / RECEIPTS
                            </th>
                        </tr>
                        {/* Sub header row (z-40 for fixed cols, z-30 for scrollable cols) */}
                        <tr className="bg-slate-700">
                            {FIXED_COLS.map((col) => (
                                <th
                                    key={col.key}
                                    className={`sticky top-[38px] z-40 px-3 py-2 font-medium whitespace-nowrap bg-slate-700 border border-black ${
                                        col.isRight ? "text-right" : "text-left"
                                    }`}
                                    style={{
                                        left: `${col.left}px`,
                                        width: `${col.width}px`,
                                        minWidth: `${col.width}px`,
                                    }}
                                >
                                    {col.label}
                                </th>
                            ))}

                            {WORK_ORDER_TYPES.map((t) => (
                                <React.Fragment key={t.key}>
                                    <th className="sticky top-[38px] z-30 px-3 py-2 text-right font-medium whitespace-nowrap bg-slate-700 border border-black">
                                        Qty
                                    </th>
                                    <th className="sticky top-[38px] z-30 px-3 py-2 text-right font-medium whitespace-nowrap bg-slate-700 border border-black">
                                        Excess %
                                    </th>
                                    <th className="sticky top-[38px] z-30 px-3 py-2 text-center font-medium whitespace-nowrap bg-slate-700 border border-black">
                                        Flag
                                    </th>
                                </React.Fragment>
                            ))}

                            {DELIVERY_TYPES.map((d) => (
                                <th
                                    key={d.key}
                                    className="sticky top-[38px] z-30 px-3 py-2 text-right font-medium whitespace-nowrap bg-slate-700 border border-black"
                                >
                                    {d.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading && (
                            <tr>
                                <td
                                    colSpan={TOTAL_COLS}
                                    className="px-3 py-6 text-center text-slate-400 border border-black bg-white"
                                >
                                    Loading...
                                </td>
                            </tr>
                        )}

                        {!loading && error && (
                            <tr>
                                <td
                                    colSpan={TOTAL_COLS}
                                    className="px-3 py-6 text-center text-red-500 border border-black bg-white"
                                >
                                    {error}
                                </td>
                            </tr>
                        )}

                        {!loading && !error && filteredJobs.length === 0 && (
                            <tr>
                                <td
                                    colSpan={TOTAL_COLS}
                                    className="px-3 py-6 text-center text-slate-400 border border-black bg-white"
                                >
                                    No jobs found.
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            !error &&
                            paginatedJobs.map((job, idx) => (
                                <tr
                                    key={job.jobNo}
                                    className={`group border-t border-black ${
                                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                    } hover:bg-slate-100 transition-colors`}
                                >
                                    {/* Fixed body columns (z-20 ensures they slide under the header but over normal cells) */}
                                    {FIXED_COLS.map((col) => {
                                        const isJobNo = col.key === "jobNo";
                                        let content = job[col.key];
                                        
                                        if (col.key === "targetProcessLoss") {
                                            content = `${fmt(job.targetProcessLoss)}%`;
                                        } else if (
                                            col.key === "yarnRequiredQty" ||
                                            col.key === "totalFinishRequiredQty"
                                        ) {
                                            content = fmt(job[col.key]);
                                        }

                                        return (
                                            <td
                                                key={col.key}
                                                className={`sticky top-0 z-20 border border-black px-3 py-2 whitespace-nowrap ${
                                                    col.isRight ? "text-right" : "text-left"
                                                } ${isJobNo ? "font-medium text-slate-800" : ""} ${
                                                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                                } group-hover:bg-slate-100 transition-colors`}
                                                style={{
                                                    left: `${col.left}px`,
                                                    width: `${col.width}px`,
                                                    minWidth: `${col.width}px`,
                                                }}
                                            >
                                                {content !== undefined && content !== null ? content : "—"}
                                            </td>
                                        );
                                    })}

                                    {/* Scrollable body columns */}
                                    {WORK_ORDER_TYPES.map((t) => {
                                        const wo = job.workOrderTotalsByType?.[t.key];
                                        return (
                                            <React.Fragment key={t.key}>
                                                <td
                                                    className={`px-3 py-2 text-right border border-black transition-colors ${
                                                        wo?.isFlagged
                                                            ? "bg-red-50 text-red-700 font-medium group-hover:bg-red-100"
                                                            : "group-hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {wo ? fmt(wo.totalWorkOrderQty) : "—"}
                                                </td>
                                                <td
                                                    className={`px-3 py-2 text-right border border-black transition-colors ${
                                                        wo?.isFlagged
                                                            ? "bg-red-50 text-red-700 font-medium group-hover:bg-red-100"
                                                            : wo
                                                            ? "text-slate-500 group-hover:bg-slate-100"
                                                            : "group-hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {wo ? fmtPct(wo.excessPct) : "—"}
                                                </td>
                                                <td
                                                    className={`px-3 py-2 text-center border border-black transition-colors ${
                                                        wo?.isFlagged
                                                            ? "bg-red-50 group-hover:bg-red-100"
                                                            : "group-hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {wo ? (
                                                        wo.isFlagged ? (
                                                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                Flagged
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                OK
                                                            </span>
                                                        )
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}

                                    {DELIVERY_TYPES.map((d) => {
                                        const val = job.deliveryTotalsByType?.[d.key];
                                        return (
                                            <td
                                                key={d.key}
                                                className="px-3 py-2 text-right border border-black group-hover:bg-slate-100 transition-colors"
                                            >
                                                {val !== undefined ? fmt(val) : "—"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {!loading && !error && filteredJobs.length > 0 && (
                <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                    <p className="text-sm text-slate-500">
                        Showing {startIdx + 1}–{Math.min(startIdx + pageSize, filteredJobs.length)} of{" "}
                        {filteredJobs.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => goToPage(1)}
                            disabled={safePage === 1}
                            className="px-2 py-1.5 text-sm rounded-md border border-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 bg-white"
                        >
                            «
                        </button>
                        <button
                            type="button"
                            onClick={() => goToPage(safePage - 1)}
                            disabled={safePage === 1}
                            className="px-2 py-1.5 text-sm rounded-md border border-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 bg-white"
                        >
                            ‹
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(
                                (p) =>
                                    p === 1 ||
                                    p === totalPages ||
                                    Math.abs(p - safePage) <= 1
                            )
                            .reduce((acc, p, i, arr) => {
                                if (i > 0 && p - arr[i - 1] > 1) acc.push("ellipsis-" + p);
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p) =>
                                typeof p === "string" ? (
                                    <span key={p} className="px-2 text-sm text-slate-400">
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => goToPage(p)}
                                        className={`px-3 py-1.5 text-sm rounded-md border ${
                                            p === safePage
                                                ? "bg-slate-800 text-white border-black"
                                                : "border-black hover:bg-slate-50 bg-white"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}

                        <button
                            type="button"
                            onClick={() => goToPage(safePage + 1)}
                            disabled={safePage === totalPages}
                            className="px-2 py-1.5 text-sm rounded-md border border-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 bg-white"
                        >
                            ›
                        </button>
                        <button
                            type="button"
                            onClick={() => goToPage(totalPages)}
                            disabled={safePage === totalPages}
                            className="px-2 py-1.5 text-sm rounded-md border border-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 bg-white"
                        >
                            »
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HighLossJob;