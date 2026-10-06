import { useMemo, useRef, useState, Fragment } from "react";
import * as XLSX from "xlsx";
import useAxiosPrivate from "../../../hooks/UseAxiosPrivate";

const COMPARE_URL = "/api/upload-for-balance-comparison";

const BUCKETS = [
    { key: "yarnDelivery", label: "Yarn Delivery" },
    { key: "yarnReturn", label: "Yarn Return" },
    { key: "greyReceived", label: "Grey Fabric Received" },
];

const STATUS_UI = {
    MISSING_IN_SYSTEM: {
        label: "Missing in System",
        row: "bg-red-100",
        badge: "bg-red-600 text-white",
        card: "border-red-400",
    },
    QTY_MISMATCH: {
        label: "Qty Mismatch",
        row: "bg-yellow-50",
        badge: "bg-yellow-200 text-yellow-900",
        card: "border-yellow-400",
    },
    MATCHED: {
        label: "Matched",
        row: "bg-green-50",
        badge: "bg-green-100 text-green-800",
        card: "border-green-300",
    },
};

const FILTERS = ["ALL", "MISSING_IN_SYSTEM", "QTY_MISMATCH", "MATCHED"];

const normalizeChallan = (v) =>
    String(v ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/^0+(?=\d)/, "");

const fmtQty = (n) =>
    n === null || n === undefined ? "-" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

const fmtDiff = (n) => {
    if (n === null || n === undefined) return "-";
    const v = Number(n);
    if (v === 0) return "0";
    return `${v > 0 ? "+" : ""}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const FactoryComparison = () => {
    const axiosPrivate = useAxiosPrivate();
    const fileRef = useRef(null);

    const [file, setFile] = useState(null);
    const [results, setResults] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("ALL");
    const [factoryFilter, setFactoryFilter] = useState("ALL");
    const [search, setSearch] = useState("");

    const handleCompare = async () => {
        if (!file) { setError("Please choose an Excel file first."); return; }
        setLoading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await axiosPrivate.post(COMPARE_URL, formData);
            
            setResults(Array.isArray(res.data?.results) ? res.data.results : []);
            setSummary(res.data?.summary ?? null);
            setFilter("ALL");
            setFactoryFilter("ALL");
            setSearch("");
        } catch (err) {
            setResults([]);
            setSummary(null);
            setError(err?.response?.data?.message || "Something went wrong while comparing the file.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResults([]);
        setSummary(null);
        setError("");
        setFilter("ALL");
        setFactoryFilter("ALL");
        setSearch("");
        if (fileRef.current) fileRef.current.value = "";
    };

    const factories = useMemo(() => {
        const set = new Set();
        results.forEach((r) => r.factoryName && set.add(r.factoryName));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [results]);

    const counts = useMemo(() => {
        const base = results.filter((r) => factoryFilter === "ALL" || r.factoryName === factoryFilter);
        return {
            ALL: base.length,
            MISSING_IN_SYSTEM: base.filter((r) => r.status === "MISSING_IN_SYSTEM").length,
            QTY_MISMATCH: base.filter((r) => r.status === "QTY_MISMATCH").length,
            MATCHED: base.filter((r) => r.status === "MATCHED").length,
        };
    }, [results, factoryFilter]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const qChallan = normalizeChallan(search);
        return results.filter((r) => {
            if (filter !== "ALL" && r.status !== filter) return false;
            if (factoryFilter !== "ALL" && r.factoryName !== factoryFilter) return false;
            if (!q) return true;
            return (
                normalizeChallan(r.challanNo).includes(qChallan) ||
                String(r.factoryName || "").toLowerCase().includes(q)
            );
        });
    }, [results, filter, factoryFilter, search]);

    const handleExport = () => {
        const data = visible.map((r) => {
            const row = {
                "Challan No": r.challanNo,
                "Target Factory": r.factoryName,
                "DB From Factory": r.fromFactory,
                "DB To Factory": r.toFactory,
                "Month": r.month,
                "Status": r.factoryMismatch ? "Factory Mismatch (Exists for different factory)" : (STATUS_UI[r.status]?.label ?? r.status),
            };
            BUCKETS.forEach((b) => {
                row[`${b.label} (Excel)`] = r.excelQty?.[b.key] ?? "";
                row[`${b.label} (System)`] = r.systemQty ? r.systemQty[b.key] : "";
                row[`${b.label} (Diff)`] = r.diff ? r.diff[b.key] : "";
            });
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Comparison");
        XLSX.writeFile(wb, "factory-stock-comparison.xlsx");
    };

    const hasResult = results.length > 0;

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-gray-800">Factory Stock Comparison</h1>
                <p className="text-sm text-gray-500">
                    Upload Excel file. System will compare data ONLY for the factory in the "KNITTING FACTORY" column.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4">
                <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm hover:file:bg-gray-200"
                />
                <button
                    onClick={handleCompare}
                    disabled={loading || !file}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? "Comparing..." : "Compare"}
                </button>
                {(file || hasResult) && (
                    <button onClick={handleReset} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Reset</button>
                )}
            </div>

            {error && (
                <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {hasResult && (
                <>
                    {summary && (
                        <div className="space-y-1">
                            <p className="text-xs text-gray-500">
                                {summary.excelRowsRead} Excel rows read, grouped into {summary.totalChallans} challans.
                            </p>
                            {summary.factories && (
                                <p className="text-xs font-semibold text-blue-600">
                                    Target Factory: {summary.factories}
                                </p>
                            )}
                            {summary.factoryMismatch > 0 && (
                                <p className="text-xs font-semibold text-orange-600">
                                    ⚠ {summary.factoryMismatch} challan(s) exist in the system under a DIFFERENT factory.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg border-2 border-gray-300 bg-white p-3">
                            <div className="text-2xl font-bold text-gray-800">{counts.ALL}</div>
                            <div className="text-xs text-gray-600">Total Challans</div>
                        </div>
                        {["MISSING_IN_SYSTEM", "QTY_MISMATCH", "MATCHED"].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilter(filter === s ? "ALL" : s)}
                                className={`rounded-lg border-2 bg-white p-3 text-left transition hover:shadow ${STATUS_UI[s].card} ${filter === s ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                            >
                                <div className="text-2xl font-bold text-gray-800">{counts[s]}</div>
                                <div className="text-xs text-gray-600">{STATUS_UI[s].label}</div>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {FILTERS.map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "bg-gray-800 text-white" : "bg-white hover:bg-gray-50"}`}
                            >
                                {f === "ALL" ? "All" : STATUS_UI[f].label} ({counts[f]})
                            </button>
                        ))}
                        <select 
                            value={factoryFilter} 
                            onChange={(e) => setFactoryFilter(e.target.value)} 
                            className="ml-auto rounded border px-2 py-1.5 text-sm"
                        >
                            <option value="ALL">All factories</option>
                            {factories.map((f) => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                        <input 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            placeholder="Search challan or factory..." 
                            className="rounded border px-3 py-1.5 text-sm" 
                        />
                        <button onClick={handleExport} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
                            Export Excel
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border bg-white">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th rowSpan={2} className="border px-3 py-2 text-left">#</th>
                                    <th rowSpan={2} className="border px-3 py-2 text-left">Challan No</th>
                                    <th rowSpan={2} className="border px-3 py-2 text-left">Target Factory (Excel)</th>
                                    <th rowSpan={2} className="border px-3 py-2 text-left">DB From Factory</th>
                                    <th rowSpan={2} className="border px-3 py-2 text-left">DB To Factory</th>
                                    <th rowSpan={2} className="border px-3 py-2 text-left">Month</th>
                                    <th rowSpan={2} className="border px-3 py-2 text-left">Status</th>
                                    {BUCKETS.map((b) => (
                                        <th key={b.key} colSpan={3} className="border px-3 py-2 text-center">{b.label}</th>
                                    ))}
                                </tr>
                                <tr>
                                    {BUCKETS.map((b) => (
                                        <Fragment key={b.key}>
                                            <th className="border px-2 py-1 text-right text-xs">Excel</th>
                                            <th className="border px-2 py-1 text-right text-xs">System</th>
                                            <th className="border px-2 py-1 text-right text-xs">Diff</th>
                                        </Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.length === 0 ? (
                                    <tr>
                                        <td colSpan={7 + BUCKETS.length * 3} className="p-6 text-center text-gray-500">
                                            No records found.
                                        </td>
                                    </tr>
                                ) : (
                                    visible.map((r, i) => {
                                        const ui = STATUS_UI[r.status] ?? STATUS_UI.MATCHED;
                                        const isMissing = r.status === "MISSING_IN_SYSTEM";
                                        return (
                                            <tr key={`${r.challanNo}-${r.factoryName}-${i}`} className={ui.row}>
                                                <td className="border px-3 py-2">{i + 1}</td>
                                                <td className="border px-3 py-2 font-medium">
                                                    {r.challanNo}
                                                    {r.repeatedCount > 1 && (
                                                        <div className="text-xs font-normal text-gray-500">
                                                            {r.repeatedCount} rows added
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="border px-3 py-2 font-semibold text-blue-700">
                                                    {r.factoryName || "-"}
                                                </td>
                                                <td className="border px-3 py-2 text-xs">{r.fromFactory || "-"}</td>
                                                <td className="border px-3 py-2 text-xs">{r.toFactory || "-"}</td>
                                                <td className="border px-3 py-2">{r.month || "-"}</td>
                                                <td className="border px-3 py-2">
                                                    {r.factoryMismatch ? (
                                                        <span className="whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium bg-orange-500 text-white">
                                                            ⚠ Factory Mismatch
                                                        </span>
                                                    ) : (
                                                        <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${ui.badge}`}>
                                                            {ui.label}
                                                        </span>
                                                    )}
                                                </td>
                                                {BUCKETS.map((b) => {
                                                    const bad = r.mismatchFields?.includes(b.key);
                                                    const cellBg = bad ? "bg-yellow-300 font-semibold" : "";
                                                    return (
                                                        <Fragment key={b.key}>
                                                            <td className={`border px-2 py-2 text-right ${cellBg}`}>
                                                                {fmtQty(r.excelQty?.[b.key])}
                                                            </td>
                                                            <td className={`border px-2 py-2 text-right ${cellBg}`}>
                                                                {isMissing ? (
                                                                    <span className="font-semibold text-red-600">Missing</span>
                                                                ) : (
                                                                    fmtQty(r.systemQty?.[b.key])
                                                                )}
                                                            </td>
                                                            <td className={`border px-2 py-2 text-right ${cellBg}`}>
                                                                {fmtDiff(r.diff?.[b.key])}
                                                            </td>
                                                        </Fragment>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default FactoryComparison;