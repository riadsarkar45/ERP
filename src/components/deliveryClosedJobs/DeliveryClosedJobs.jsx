import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useFetchData } from "../../hooks/fetch";

const DeliveryClosedJobs = () => {
    const [allData, setAllData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedMonth, setSelectedMonth] = useState(""); 
    const [selectedYear, setSelectedYear] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [availableYears, setAvailableYears] = useState([]);
    const itemsPerPage = 20;
    const { fetchData, loading } = useFetchData();

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        let cancelled = false;

        const params = new URLSearchParams();
        if (selectedMonth !== "") params.set("month", String(parseInt(selectedMonth, 10) + 1));
        if (selectedYear !== "") params.set("year", selectedYear);

        fetchData(`/api/delivery-closed-job/${"ATL26-5023-AUG"}`)
            .then((res) => {
                if (cancelled) return;
                
                const dataArray = Array.isArray(res.data) 
                    ? res.data 
                    : (res.data?.data || []);
                    
                setAllData(dataArray);

                setAvailableYears((prev) => {
                    const set = new Set(prev);
                    dataArray.forEach((job) => {
                        job.deliveryTypeSummary?.forEach((summary) => {
                            if (summary.lastDeliveryDate) {
                                const d = new Date(summary.lastDeliveryDate);
                                if (!isNaN(d.getTime())) set.add(d.getFullYear());
                            }
                        });
                    });
                    return Array.from(set).sort((a, b) => b - a);
                });
            })
            .catch((e) => console.error("Failed to fetch delivery data:", e));

        return () => {
            cancelled = true;
        };
    }, [selectedMonth, selectedYear, fetchData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedMonth, selectedYear, searchTerm]);

    const filteredData = useMemo(() => {
        let result = allData;

        if (selectedMonth !== "" || selectedYear !== "") {
            result = result.filter(job => {
                return job.deliveryTypeSummary?.some(summary => {
                    if (!summary.lastDeliveryDate) return false;
                    const d = new Date(summary.lastDeliveryDate);
                    if (isNaN(d.getTime())) return false;
                    const matchYear = selectedYear === "" || String(d.getFullYear()) === selectedYear;
                    const matchMonth = selectedMonth === "" || String(d.getMonth()) === selectedMonth;
                    return matchYear && matchMonth;
                });
            });
        }

        if (searchTerm.trim() !== "") {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(job => {
                const jobNoMatch = job.jobNo?.toLowerCase().includes(lowerSearch);
                const compMatch = job.rows?.some(r => r.composition?.toLowerCase().includes(lowerSearch));
                const styleMatch = job.styleNo?.toLowerCase().includes(lowerSearch);
                return jobNoMatch || compMatch || styleMatch;
            });
        }

        return result;
    }, [allData, searchTerm, selectedMonth, selectedYear]);

    // Process data exclusively per composition row mapped from deliveryTypeSummary
    const aggregatedJobs = useMemo(() => {
        return filteredData.map(job => {
            const rawRows = (job.rows && job.rows.length > 0) 
                ? job.rows 
                : [{ composition: job.styleNo || 'N/A', yarnRequiredQty: job.yarnRequiredQty || 0 }];

            const deliverySummaries = job.deliveryTypeSummary || [];

            const calculateSec = (deliveredQty, reqQty) => {
                const totalQty = Number(deliveredQty || 0);
                const hasData = totalQty > 0;
                
                const isOverDelivered = reqQty > 0 && totalQty > reqQty;
                const overDeliveryPercent = isOverDelivered ? ((totalQty - reqQty) / reqQty) * 100 : 0;
                const extraQty = isOverDelivered ? totalQty - reqQty : 0;

                return {
                    hasData,
                    qty: totalQty,
                    isOverDelivered,
                    overDeliveryPercent,
                    extraQty
                };
            };

            const compositions = rawRows.map((r, rowIndex) => {
                const compReqQty = Number(r.yarnRequiredQty || r.reqQty || r.yarnReqQty || r.qty || 0);
                const compName = r.composition?.trim() || 'N/A';

                // Look up quantity from deliveryTypeSummary matching this specific composition
                const getDeliveryQty = (typeKeywords) => {
                    const matchedSummaries = deliverySummaries.filter(s => {
                        const summaryType = (s.deliveryType || s.type || "").toLowerCase();
                        const summaryComp = (s.composition || s.compositionName || "").trim().toLowerCase();
                        
                        const isTypeMatch = typeKeywords.some(kw => summaryType.includes(kw.toLowerCase()));
                        
                        // Match either by composition string or fallback to index matching if composition property is missing in summary
                        const isCompMatch = summaryComp 
                            ? summaryComp === compName.toLowerCase()
                            : (s.rowIndex !== undefined ? s.rowIndex === rowIndex : true);

                        return isTypeMatch && isCompMatch;
                    });

                    return matchedSummaries.reduce((sum, s) => {
                        return sum + Number(s.totalQty || s.deliveredQty || s.qty || s.deliveryQty || 0);
                    }, 0);
                };

                // Extract delivery values for each category
                const yarnQty = r.yarnDeliveryQty ?? r.yarnQty ?? getDeliveryQty(['yarn']);
                const dyeingQty = r.greyDeliveryQty ?? r.greyQty ?? getDeliveryQty(['grey', 'fabric', 'dyeing']);
                const aopQty = r.aopDeliveryQty ?? r.aopQty ?? getDeliveryQty(['aop']);

                return {
                    compositionName: compName,
                    reqQty: compReqQty,
                    yarn: calculateSec(yarnQty, compReqQty),
                    dyeing: calculateSec(dyeingQty, compReqQty),
                    aop: calculateSec(aopQty, compReqQty)
                };
            });

            return {
                jobNo: job.jobNo,
                compositions
            };
        });
    }, [filteredData]);

    const sortedJobs = useMemo(() => {
        return [...aggregatedJobs].sort((a, b) => {
            const aHasYarn = a.compositions.some(c => c.yarn.qty > 0) ? 0 : 1;
            const bHasYarn = b.compositions.some(c => c.yarn.qty > 0) ? 0 : 1;
            if (aHasYarn !== bHasYarn) return aHasYarn - bHasYarn;
            return a.jobNo.localeCompare(b.jobNo);
        });
    }, [aggregatedJobs]);

    const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
    const paginatedJobs = sortedJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const formatNum = (num) => {
        if (num === undefined || num === null) return "0.00";
        return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const renderDeliveryCell = (sec) => {
        if (!sec.hasData) return <span className="text-gray-400">-</span>;

        return (
            <div className="flex flex-col items-end gap-0.5">
                <span className={sec.isOverDelivered ? "font-bold text-red-600" : "font-semibold text-gray-900"}>
                    {formatNum(sec.qty)}
                </span>
                {sec.isOverDelivered && (
                    <div className="flex flex-col items-end">
                        {sec.extraQty > 0 && (
                            <span className="text-[10px] font-bold text-red-600 leading-tight">
                                +{formatNum(sec.extraQty)} kg extra
                            </span>
                        )}
                        {sec.overDeliveryPercent > 0 && (
                            <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1 py-0.2 rounded border border-red-200 mt-0.5">
                                (+{sec.overDeliveryPercent.toFixed(1)}%)
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const handleExportExcel = () => {
        if (sortedJobs.length === 0) return;

        const headerRow = [
            "Job No", 
            "Composition", 
            "Require Qty (kg)",
            "Yarn Delivery (kg)", 
            "Grey Delivery (kg)", 
            "Sent For AOP (kg)",
            "Remarks"
        ];

        const bodyRows = [];
        sortedJobs.forEach(job => {
            job.compositions.forEach((comp, idx) => {
                bodyRows.push([
                    idx === 0 ? job.jobNo : '',
                    comp.compositionName,
                    Number(comp.reqQty || 0),
                    comp.yarn.hasData ? Number(comp.yarn.qty || 0) : '',
                    comp.dyeing.hasData ? Number(comp.dyeing.qty || 0) : '',
                    comp.aop.hasData ? Number(comp.aop.qty || 0) : '',
                    ''
                ]);
            });
        });

        const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);

        worksheet['!cols'] = [
            { wch: 14 }, { wch: 32 }, { wch: 20 },
            { wch: 20 }, { wch: 20 }, { wch: 20 },
            { wch: 20 }
        ];

        [2, 3, 4, 5].forEach(c => {
            for (let r = 1; r <= bodyRows.length; r++) {
                const ref = XLSX.utils.encode_cell({ r, c });
                if (worksheet[ref] && typeof worksheet[ref].v === 'number') worksheet[ref].z = '#,##0.00';
            }
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Delivery Report");

        const monthLabel = selectedMonth !== "" ? months[parseInt(selectedMonth, 10)] : "All-Months";
        const yearLabel = selectedYear !== "" ? selectedYear : "All-Years";
        XLSX.writeFile(workbook, `Delivery_Closed_Jobs_${monthLabel}_${yearLabel}.xlsx`);
    };

    return (
        <div className="p-4 font-sans text-xs bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 border-b pb-3 bg-white px-4 py-3 rounded-t shadow-sm gap-3">
                <div>
                    <h1 className="text-lg font-bold text-gray-800">Delivery Closed Jobs Report</h1>
                    <p className="text-[10px] text-gray-500 mt-0.5">Figures in kg unless noted - {sortedJobs.length} jobs found</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white hover:bg-gray-50 transition-colors"
                    >
                        <option value="">All Years</option>
                        {availableYears.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white hover:bg-gray-50 transition-colors"
                    >
                        <option value="">All Months</option>
                        {months.map((month, index) => (
                            <option key={index} value={index}>{month}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Search job no, style, or composition..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-64 hover:bg-gray-50 transition-colors"
                    />
                    <button
                        onClick={handleExportExcel}
                        disabled={loading || sortedJobs.length === 0}
                        className="bg-green-600 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <span className="text-sm">↓</span> Export Excel
                    </button>
                </div>
            </div>

            <div className="overflow-auto border border-gray-300 rounded-b shadow-sm bg-white" style={{ maxHeight: '75vh' }}>
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20 shadow-md">
                        <tr className="bg-[#2c3e50] text-white text-center text-xs font-semibold tracking-wide uppercase">
                            <th className="border border-gray-600 px-2 py-2.5 sticky left-0 bg-[#2c3e50] z-10 min-w-[110px]">Job No</th>
                            <th className="border border-gray-600 px-2 py-2.5 min-w-[220px]">Composition</th>
                            <th className="border border-gray-600 px-2 py-2.5 min-w-[130px]">Require Qty</th>
                            <th className="border border-gray-600 px-2 py-2.5 bg-[#1a5276] min-w-[150px]">Yarn Delivery</th>
                            <th className="border border-gray-600 px-2 py-2.5 bg-[#1e8449] min-w-[150px]">Grey Delivery</th>
                            <th className="border border-gray-600 px-2 py-2.5 bg-[#6c3483] min-w-[150px]">Sent For AOP</th>
                            <th className="border border-gray-600 px-2 py-2.5 min-w-[120px]">Remarks</th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="text-center p-8 text-gray-500 font-medium">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        Loading data...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedJobs.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center p-8 text-gray-500 font-medium">No data available for the selected filters.</td>
                            </tr>
                        ) : (
                            paginatedJobs.map((job) => {
                                const rowSpan = job.compositions.length;

                                return job.compositions.map((comp, compIdx) => (
                                    <tr key={`${job.jobNo}-${compIdx}`} className="hover:bg-blue-50/40 transition-colors group">
                                        {/* Row-spanned Job No */}
                                        {compIdx === 0 && (
                                            <td 
                                                rowSpan={rowSpan} 
                                                className="border border-gray-200 px-2 py-2 font-bold text-gray-800 align-middle bg-gray-50 text-center sticky left-0 z-10 min-w-[110px]"
                                            >
                                                {job.jobNo}
                                            </td>
                                        )}

                                        {/* Composition Name */}
                                        <td className="border border-gray-200 px-2 py-2 text-gray-800 font-medium align-middle bg-white min-w-[220px] break-words leading-tight">
                                            {comp.compositionName}
                                        </td>

                                        {/* Composition Required Qty */}
                                        <td className="border border-gray-200 px-2 py-2 text-right font-semibold text-gray-800 align-middle bg-white min-w-[130px]">
                                            {formatNum(comp.reqQty)}
                                        </td>

                                        {/* Per-Composition Deliveries */}
                                        <td className={`border border-gray-200 px-2 py-2 text-right align-middle ${comp.yarn.isOverDelivered ? 'bg-red-50/40' : ''}`}>
                                            {renderDeliveryCell(comp.yarn)}
                                        </td>

                                        <td className={`border border-gray-200 px-2 py-2 text-right align-middle ${comp.dyeing.isOverDelivered ? 'bg-red-50/40' : ''}`}>
                                            {renderDeliveryCell(comp.dyeing)}
                                        </td>

                                        <td className={`border border-gray-200 px-2 py-2 text-right align-middle ${comp.aop.isOverDelivered ? 'bg-red-50/40' : ''}`}>
                                            {renderDeliveryCell(comp.aop)}
                                        </td>

                                        {/* Row-spanned Remarks */}
                                        {compIdx === 0 && (
                                            <td 
                                                rowSpan={rowSpan} 
                                                className="border border-gray-200 px-2 py-2 text-gray-400 italic text-center align-middle"
                                            >
                                                -
                                            </td>
                                        )}
                                    </tr>
                                ));
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mt-3 text-xs text-gray-600 bg-white p-3 rounded shadow-sm border border-gray-200 gap-3">
                <span className="font-medium">
                    Showing {sortedJobs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedJobs.length)} of {sortedJobs.length} jobs
                </span>
                <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium transition-colors">« First</button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium transition-colors">‹ Prev</button>
                    <span className="px-3 py-1.5 border border-gray-300 rounded bg-gray-50 font-bold text-gray-800 min-w-[80px] text-center">Page {currentPage} <span className="text-gray-400 font-normal">of</span> {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium transition-colors">Next ›</button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium transition-colors">Last »</button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryClosedJobs;