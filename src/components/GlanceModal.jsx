import { useState, useEffect } from 'react';
import { RefreshCcw, X, WrapText, AlignJustify, ListFilter } from 'lucide-react';
import useAxiosPrivate from '../hooks/UseAxiosPrivate';

const ShortExcess = ({ value }) => {
    const val = Number(value) || 0;
    const isZero = val === 0;
    const displayText = isZero ? "(0.00)" : val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
    return (
        <div className={`${isZero ? "text-green-500 font-bold" : "text-red-500 font-bold"}`}>
            {displayText}
        </div>
    );
};

const GlanceModal = ({ glanceReport, setGlanceReport, handleGlanceReport }) => {
    const axiosPrivate = useAxiosPrivate();
    
    const [isWrapped, setIsWrapped] = useState(false);
    
    // Backend Filter States
    const [activeFilters, setActiveFilters] = useState({}); 
    const [reportData, setReportData] = useState(glanceReport?.reportData || []);
    const [isDataLoading, setIsDataLoading] = useState(false);
    
    // Dropdown UI States
    const [openFilterCol, setOpenFilterCol] = useState(null);
    const [dropdownOptions, setDropdownOptions] = useState([]);
    const [tempSelected, setTempSelected] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    const WRAPPED_COL_WIDTH = 110;
    const wrapClass = isWrapped ? "whitespace-normal break-words" : "whitespace-nowrap";
    const cellClass = `px-4 py-3 text-sm text-center text-gray-700 border border-gray-400 align-top ${wrapClass}`;
    const cellStyle = isWrapped ? { width: WRAPPED_COL_WIDTH, maxWidth: WRAPPED_COL_WIDTH, wordBreak: "break-word" } : undefined;

    const YARN_TABLE_HEADERS = [
        "JOB NO", "COLOR", "COMPOSITION", "ORDER QTY", "MANUFACTURING UNITE", "FINISH REQUIRE QTY",
        "YARN REQUIRE QTY", "YARN DELIVERY", "YARN RETURN", "GREY RECEIVED", "SHORT & EXCESS",
        "GREY DELIVERY FOR DYEING", "GREY RET. RCVD FROM DYEING", "GREY RECEIVED FROM DYEING",
        "FINISH RECEIVED FROM DYEING", "PROCESS LOSS %", "SHORT & EXCESS", "SENT FOR AOP",
        "RETURN RECEIVED FROM AOP", "GREY WEIGHT RECEIVED FROM AOP", "FINISH RECEIVED FROM AOP",
        "PROCESS LOSS", "SHORT & EXCESS", "FABRIC ISSUE CUTTING DEPT.", "FABRIC ISSUED SHORT EXCESS",
         "CAD CONSUMPTION", "PLANNED CUTTING QTY", "ACTUAL CUTTING QTY", "SHORT & EXCESS CUTTING",
        "SHORT/EXCESS %",  "CUTTING TO SEWING INPUT BALANCE", "PHYSICAL FOUND", "EXCESS QTY",
        "SWING INPUT QTY", "INPUT SHORT/EXCESS",  "OUTPUT QTY", "OUTPUT SHORT/EXCESS",
         "FINISH INPUT QTY", "FINISH OUTPUT QTY", "SHORT EXCESS", 
        "PACKING INPUT QTY", "PACKING OUTPUT QTY", "SHIPPED QTY", "EXCESS SHORT", "PLANNED LEFTOVER",
        "PHYSICAL FOUND LEFTOVER", "%PHYSICAL FOUND LEFTOVER", "LEFT OVER SHORT EXCESS", 
    ];

    const FILTERABLE_COLS = {
        0: { key: "jobNo", label: "JOB NO" },
        1: { key: "color", label: "COLOR" },
        2: { key: "composition", label: "COMPOSITION" },
    };

    const TRAILING_CELL_TYPES = [
        "input", "input", "input", "input", "input", "input", "input", "FORMULA", "FORMULA",
        "input", "input", "input", "FORMULA", "input", "FORMULA", "input", "input", "input",
        "FORMULA", "input", "input", "FORMULA", "input", "input", "input"
    ];

    // ── 1. Fetch Data from Backend when filters change ───────────────────────
    useEffect(() => {
        const fetchFilteredData = async () => {
            setIsDataLoading(true);
            try {
                const params = { page: 1, limit: 10000 }; 
                if (Object.keys(activeFilters).length > 0) {
                    params.filters = JSON.stringify(activeFilters);
                }
                
                // ✅ FIX: Changed from '/api/glance' to '/api/styles' 
                // because styleRequirements is already mounted at /api/styles in your routes!
                const res = await axiosPrivate.get('/api/styles', { params });
                
                if (res.data && res.data.data) {
                    setReportData(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch filtered data:", err);
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchFilteredData();
    }, [activeFilters, axiosPrivate]);

    // ── 2. Fetch Filter Options from Backend when dropdown opens ─────────────
    const openFilterDropdown = async (colIndex) => {
        if (openFilterCol === colIndex) {
            setOpenFilterCol(null);
            return;
        }
        
        setOpenFilterCol(colIndex);
        setSearchTerm("");
        
        const colKey = FILTERABLE_COLS[colIndex]?.key;
        if (!colKey) return;

        try {
            const otherFilters = { ...activeFilters };
            delete otherFilters[colKey];
            
            const params = {};
            if (Object.keys(otherFilters).length > 0) {
                params.filters = JSON.stringify(otherFilters);
            }

            // This endpoint works because you have it in your routes
            const res = await axiosPrivate.get(`/api/glance/filter-options/${colKey}`, { params });
            const options = res.data?.data || [];
            setDropdownOptions(options);
            
            const currentActive = activeFilters[colKey] || [];
            setTempSelected(new Set(currentActive.length > 0 ? currentActive : options));
        } catch (err) {
            console.error("Failed to fetch filter options:", err);
            setDropdownOptions([]);
        }
    };

    // ── Dropdown UI Logic ────────────────────────────────────────────────────
    const visibleOptions = dropdownOptions.filter(v => 
        String(v).toLowerCase().includes(String(searchTerm).toLowerCase())
    );
    const allChecked = visibleOptions.length > 0 && visibleOptions.every(v => tempSelected.has(v));

    const toggleAll = () => {
        const next = new Set(tempSelected);
        if (allChecked) visibleOptions.forEach(v => next.delete(v));
        else visibleOptions.forEach(v => next.add(v));
        setTempSelected(next);
    };

    const toggleValue = (val) => {
        const next = new Set(tempSelected);
        next.has(val) ? next.delete(val) : next.add(val);
        setTempSelected(next);
    };

    const applyFilter = () => {
        const colKey = FILTERABLE_COLS[openFilterCol]?.key;
        if (!colKey) return;

        const selectedArray = Array.from(tempSelected);
        const allOptionsSelected = selectedArray.length === dropdownOptions.length && dropdownOptions.length > 0;

        setActiveFilters(prev => {
            const next = { ...prev };
            if (selectedArray.length === 0 || allOptionsSelected) delete next[colKey]; 
            else next[colKey] = selectedArray;
            return next;
        });
        
        setOpenFilterCol(null);
    };

    const closeModal = () => setGlanceReport(prev => ({ ...prev, showGlanceModal: false }));
    const isLoading = isDataLoading || glanceReport?.isGlanceLoading;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in" />
            <div className="fixed inset-0 z-50 flex justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-md border border-gray-300 w-full max-w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-in shadow-xl" onClick={(e) => e.stopPropagation()}>
                    
                    <div className="flex items-center justify-between p-6 border-b-2 border-gray-300 bg-gray-50">
                        <h2 className="text-xl font-semibold uppercase text-gray-800">RECONCILIATION</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsWrapped((prev) => !prev)} className="flex items-center justify-center gap-1.5 h-9 px-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm text-xs font-medium text-gray-700">
                                {isWrapped ? <AlignJustify size={16} /> : <WrapText size={16} />} {isWrapped ? "Unwrap" : "Wrap"}
                            </button>
                            <button onClick={handleGlanceReport} className="flex items-center justify-center h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm p-2" disabled={isLoading}>
                                <RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} />
                            </button>
                            <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="p-2 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <div className="overflow-x-auto border-2 border-gray-400 rounded-md">
                            <table className={`${isWrapped ? "w-full" : "min-w-[2600px] w-full"} border-collapse border border-gray-400`} style={{ tableLayout: isWrapped ? "fixed" : "auto" }}>
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-gray-100 border-b-2 border-gray-400">
                                        {YARN_TABLE_HEADERS.map((header, I) => {
                                            const isFilterable = FILTERABLE_COLS[I];
                                            const hasActiveFilter = activeFilters[FILTERABLE_COLS[I]?.key]?.length > 0;

                                            return (
                                                <th key={I} className={`px-2 py-3 text-center text-xs font-semibold text-gray-700 border border-gray-400 bg-gray-100 ${wrapClass}`} style={cellStyle}>
                                                    <div className="relative flex items-center justify-center gap-1.5">
                                                        <span className={wrapClass}>{header}</span>
                                                        {isFilterable && (
                                                            <button type="button" onClick={() => openFilterDropdown(I)} className={`flex-shrink-0 p-0.5 rounded hover:bg-gray-300 transition-colors ${openFilterCol === I ? "bg-gray-300 text-gray-900" : hasActiveFilter ? "text-indigo-600 font-bold" : "text-gray-500 hover:text-gray-800"}`}>
                                                                <ListFilter size={12} />
                                                            </button>
                                                        )}

                                                        {openFilterCol === I && isFilterable && (
                                                            <div className={`absolute top-full mt-1 w-60 bg-white border border-gray-300 rounded-md shadow-lg z-30 text-left normal-case font-normal ${I <= 1 ? "left-0" : I >= YARN_TABLE_HEADERS.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"}`} onClick={(e) => e.stopPropagation()}>
                                                                <div className="p-2 border-b border-gray-200">
                                                                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-indigo-400" autoFocus />
                                                                </div>
                                                                
                                                                <div className="px-3 py-1.5 border-b border-gray-100">
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-indigo-500" />
                                                                        <span className="text-xs font-medium text-gray-600">Select All</span>
                                                                    </label>
                                                                </div>

                                                                <div className="max-h-40 overflow-y-auto py-1">
                                                                    {visibleOptions.length === 0 ? (
                                                                        <div className="px-3 py-4 text-xs text-gray-400 text-center">No matches</div>
                                                                    ) : (
                                                                        visibleOptions.map(val => (
                                                                            <label key={val} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-blue-50">
                                                                                <input type="checkbox" checked={tempSelected.has(val)} onChange={() => toggleValue(val)} className="accent-indigo-500" />
                                                                                <span className="text-xs text-gray-700 truncate" title={val}>{val || "(Blank)"}</span>
                                                                            </label>
                                                                        ))
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center justify-end gap-2 p-2 border-t border-gray-200">
                                                                    <button type="button" onClick={() => setOpenFilterCol(null)} className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">Cancel</button>
                                                                    <button type="button" onClick={applyFilter} className="text-xs px-3 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600">OK</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading && (
                                        <tr><td colSpan={54} className="px-4 py-10 text-center text-sm text-gray-500">Loading filtered data...</td></tr>
                                    )}
                                    
                                    {!isLoading && reportData.length === 0 && (
                                        <tr><td colSpan={54} className="px-4 py-10 text-center text-sm text-gray-500">No rows match the active filters.</td></tr>
                                    )}

                                    {!isLoading && reportData.map((job, jobIndex) => {
                                        const comps = job?.rows || [];
                                        const compBreakDown = job.compBreakdown || [];
                                        const subRowCount = Math.max(comps.length, compBreakDown.length, 1);

                                        return Array.from({ length: subRowCount }).map((_, i) => {
                                            const com = comps[i];
                                            const comp = compBreakDown[i];

                                            const finishQty = Number(com?.finishRequiredQty) || 0;
                                            const processLoss = Number(job.processLoss) || 0;
                                            const yarnRequiredQty = finishQty * (1 + processLoss / 100);

                                            const knitYarnDelivery = Number(comp?.knittingOrder_Yarn_Delivery) || 0;
                                            const knitGreyReceived = Number(comp?.knittingOrder_Grey_Fabric_Received) || 0;
                                            const knitYarnReturn = Number(comp?.knittingOrder_Yarn_Return) || 0;
                                            const knitShortExcess = knitGreyReceived + knitYarnReturn - knitYarnDelivery;

                                            const dyeFinishReceived = Number(comp?.dyeingOrder_Finish_Received) || 0;
                                            const dyeGreyReceived = Number(comp?.dyeingOrder_Grey_Received) || 0;
                                            const dyeProcessLoss = dyeGreyReceived > 0 ? ((dyeGreyReceived - dyeFinishReceived) / dyeGreyReceived) * 100 : 0;
                                            const dyeGreyDelivery = Number(comp?.dyeingOrder_Grey_Delivery) || 0;
                                            const dyeShortExcess = dyeGreyDelivery - dyeGreyReceived;

                                            const aopFinishReceived = Number(comp?.aopOrder_AOP_Finish_Fabric_Rcvd) || 0;
                                            const aopGreyReceived = Number(comp?.aopOrder_Received_From_Aop) || 0;
                                            const aopProcessLoss = aopGreyReceived > 0 ? ((aopGreyReceived - aopFinishReceived) / aopGreyReceived) * 100 : 0;
                                            const aopSent = Number(comp?.aopOrder_Sent_for_AOP) || 0;
                                            const aopReceived = Number(comp?.aopOrder_Return_From_Aop) || 0;
                                            const aopShortExcess = aopSent - aopReceived;

                                            const isLastSubRow = i === subRowCount - 1;

                                            return (
                                                <tr key={`${jobIndex}-${i}`} className={`hover:bg-gray-50 ${isLastSubRow ? 'border-b border-gray-300' : ''}`}>
                                                    {i === 0 && (
                                                        <td rowSpan={subRowCount} className={`px-4 py-3 text-sm font-semibold text-gray-900 border border-gray-400 bg-white align-top left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${wrapClass}`} style={cellStyle}>
                                                            {job.jobNo || "-"}
                                                        </td>
                                                    )}
                                                    <td className={cellClass} style={cellStyle}>{com?.color || "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com?.composition || "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com?.orderQty || "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com ? "MU" : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com?.finishRequiredQty != null ? Number(com.finishRequiredQty).toFixed(2) : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com ? yarnRequiredQty.toFixed(2) : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.knittingOrder_Yarn_Delivery ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.knittingOrder_Yarn_Return ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.knittingOrder_Grey_Fabric_Received ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? <ShortExcess value={knitShortExcess} /> : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.dyeingOrder_Grey_Delivery ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.dyeingOrder_Grey_Return ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.dyeingOrder_Grey_Received ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.dyeingOrder_Finish_Received ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? `${dyeProcessLoss.toFixed(1)}%` : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? <ShortExcess value={dyeShortExcess} /> : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.aopOrder_Sent_for_AOP ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.aopOrder_Return_From_Aop ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.aopOrder_Received_From_Aop ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.aopOrder_AOP_Finish_Fabric_Rcvd ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? `${aopProcessLoss.toFixed(1)}%` : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? <ShortExcess value={aopShortExcess} /> : "-"}</td>
                                                    
                                                    {TRAILING_CELL_TYPES.map((cellType, idx) => (
                                                        <td key={`trail-${idx}`} className={cellClass} style={cellStyle}>
                                                            {cellType === "FORMULA" ? "FORMULA" : <input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" />}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        });
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GlanceModal;