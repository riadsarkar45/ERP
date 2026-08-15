import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, WrapText, AlignJustify, ListFilter, X, Edit3, Save, XCircle, CloudCog } from 'lucide-react';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';

const ShortExcess = ({ value }) => {
    const val = Number(value) || 0;
    const isZero = val === 0;
    const isPositive = val > 0;

    if (isZero) return <span className="text-slate-400 text-xs font-mono">0.00</span>;

    const displayText = isPositive ? `+${val.toFixed(2)}` : val.toFixed(2);
    const colorClass = isPositive
        ? "text-emerald-700 bg-emerald-50 border border-emerald-300"
        : "text-rose-700 bg-rose-50 border border-rose-300";

    return (
        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold font-mono ${colorClass}`}>
            {displayText}
        </span>
    );
};

// ── Frozen (sticky) column configuration ─────────────────────────────
const STICKY_COL_WIDTHS = [170, 250, 300, 100, 150];
const STICKY_LEFT_OFFSETS = STICKY_COL_WIDTHS.reduce((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + STICKY_COL_WIDTHS[i - 1]);
    return acc;
}, []);
const LAST_STICKY_INDEX = STICKY_COL_WIDTHS.length - 1;

const Reconciliation = () => {
    const axiosPrivate = useAxiosPrivate();

    const [isWrapped, setIsWrapped] = useState(false);
    const [activeFilters, setActiveFilters] = useState({});
    const [reportData, setReportData] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(false);

    const [openFilterCol, setOpenFilterCol] = useState(null);
    const [dropdownOptions, setDropdownOptions] = useState([]);
    const [tempSelected, setTempSelected] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    const [editingJobIndex, setEditingJobIndex] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [savingJob, setSavingJob] = useState(false);

    // ── Notes modal state ──
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [notes, setNotes] = useState("");
    const [pendingSaveJobIndex, setPendingSaveJobIndex] = useState(null);
    const [pendingSaveJob, setPendingSaveJob] = useState(null);

    const WRAPPED_COL_WIDTH = 120;
    const wrapClass = isWrapped ? "whitespace-normal break-words" : "whitespace-nowrap";

    // FIX: right border now comes from inline cellStyle so it applies to ALL scrolling columns
    const cellClass = `px-3 py-2.5 text-sm text-slate-800 border-b border-black text-center align-middle ${wrapClass}`;
    const cellStyle = {
        borderRight: "1px solid #000000",
        ...(isWrapped ? { width: WRAPPED_COL_WIDTH, maxWidth: WRAPPED_COL_WIDTH, wordBreak: "break-word" } : {}),
    };

    const stickyCellStyle = (colIdx, bg, hasRightBorder = false) => ({
        left: STICKY_LEFT_OFFSETS[colIdx],
        width: STICKY_COL_WIDTHS[colIdx],
        minWidth: STICKY_COL_WIDTHS[colIdx],
        maxWidth: STICKY_COL_WIDTHS[colIdx],
        backgroundColor: bg,
        borderRight: hasRightBorder ? "2px solid #000000" : "1px solid #000000",
    });

    const YARN_TABLE_HEADERS = [
        "JOB NO",
        "COLOR",
        "COMPOSITION",
        "ORDER QTY",
        "MANUFACTURING UNITE",
        "FINISH REQUIRE QTY",
        "YARN REQUIRE QTY",
        "YARN DELIVERY",
        "YARN RETURN",
        "GREY RECEIVED",
        "SHORT & EXCESS",
        "GREY DELIVERY FOR DYEING",
        "GREY RET. RCVD FROM DYEING",
        "GREY RECEIVED FROM DYEING",
        "FINISH RECEIVED FROM DYEING",
        "PROCESS LOSS %",
        "SHORT & EXCESS",
        "SENT FOR AOP",
        "RETURN RECEIVED FROM AOP",
        "GREY WEIGHT RECEIVED FROM AOP",
        "FINISH RECEIVED FROM AOP",
        "PROCESS LOSS", "SHORT & EXCESS",
        "FABRIC ISSUE CUTTING",
        "FABRIC ISSUED SHORT/EX",
        "CAD CONSUMPTION",
        "PLANNED CUTTING",
        "ACTUAL CUTTING",
        "CUTTING SHORT/EXCESS",
        "SHORT/EXCESS %",
        "SENT FOR EMBELLISHMENT",
        "RECEIVED FROM EMBELLISHMENT",
        "RECEIVED SHORT & EXCESS",
        "CUTTING TO SEWING",
        "NOT POSSIBLE TO INPUT",
        "REJECTED CUT PANEL FOUND",
        "SEWING INPUT",
        "INPUT SHORT/EXCESS",
        "SEWING OUTPUT",
        "OUTPUT SHORT/EXCESS",
        "FINISH INPUT",
        "FINISH OUTPUT", "SHORT/EXCESS",
        "PACKING INPUT", "PACKING OUTPUT", "SHIPPED QTY", "SHIPMENT EXCESS/SHORT",
        "PLANNED LEFTOVER", "PHYSICAL FOUND LEFTOVER", "% PHYSICAL FOUND", "LEFT OVER SHORT/EX"
    ];

    const FILTERABLE_COLS = {
        0: { key: "jobNo", label: "JOB NO" },
        1: { key: "color", label: "COLOR" },
        2: { key: "composition", label: "COMPOSITION" },
    };

    const TRAILING_FIELDS = [
        { key: "fabricIssueCuttingDept", type: "input" }, { key: "fabricIssuedShortExcess", type: "FORMULA" },
        { key: "cadConsumption", type: "FORMULA" }, { key: "plannedCuttingQty", type: "FORMULA" },
        { key: "actualCuttingQty", type: "input" }, { key: "cuttingShortExcess", type: "FORMULA" },
        { key: "shortExcessPercentCutting", type: "FORMULA" }, { key: "sentForEmbellishment", type: "input" },
        { key: "receivedFromEmbellishment", type: "input" }, { key: "receivedShortExcess", type: "FORMULA" },
        { key: "cuttingToSewingInput", type: "input" }, { key: "notPossibleToInput", type: "FORMULA" },
        { key: "physicalFound", type: "input" }, { key: "sewingInputQty", type: "input" },
        { key: "inputShortExcess", type: "FORMULA" }, { key: "sewingOutputQty", type: "input" },
        { key: "outputShortExcess", type: "FORMULA" }, { key: "finishInputQty", type: "input" },
        { key: "finishOutputQty", type: "input" }, { key: "shortExcessFinish", type: "FORMULA" },
        { key: "packingInputQty", type: "input" }, { key: "packingOutputQty", type: "input" },
        { key: "shippedQty", type: "input" }, { key: "excessShort", type: "FORMULA" },
        { key: "plannedLeftOverQty", type: "FORMULA" }, { key: "physicalFoundLeftOver", type: "input" },
        { key: "percentPhysicalFoundLeftover", type: "FORMULA" }, { key: "leftOverShortExcess", type: "FORMULA" },
    ];

    const STICKY_EDITABLE_FIELDS = [
        { key: "manufacturingUnite", label: "MANUFACTURING UNITE" }
    ];

    const fetchFilteredData = useCallback(async () => {
        setIsDataLoading(true);
        try {
            const params = { page: 1, limit: 10000 };
            if (Object.keys(activeFilters).length > 0) params.filters = JSON.stringify(activeFilters);
            const res = await axiosPrivate.get('/api/styles', { params });
            if (res.data && res.data.data) setReportData(res.data.data);
        } catch (err) {
            console.error("Failed to fetch filtered data:", err);
        } finally {
            setIsDataLoading(false);
        }
    }, [activeFilters, axiosPrivate]);

    useEffect(() => { fetchFilteredData(); }, [fetchFilteredData]);

    const openFilterDropdown = async (colIndex) => {
        if (openFilterCol === colIndex) { setOpenFilterCol(null); return; }
        setOpenFilterCol(colIndex);
        setSearchTerm("");
        const colKey = FILTERABLE_COLS[colIndex]?.key;
        if (!colKey) return;

        try {
            const otherFilters = { ...activeFilters };
            delete otherFilters[colKey];
            const params = Object.keys(otherFilters).length > 0 ? { filters: JSON.stringify(otherFilters) } : {};

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

    const visibleOptions = dropdownOptions.filter(v => String(v).toLowerCase().includes(String(searchTerm).toLowerCase()));
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

    const getSubRowCount = (job) => Math.max((job?.rows || []).length, (job?.compBreakdown || []).length, 1);

    const handleInputChange = (jobIdx, subRowIdx, fieldKey, value) => {
        setEditValues(prev => ({ ...prev, [`${jobIdx}-${subRowIdx}-${fieldKey}`]: value }));
    };

    const handleStartEdit = (jobIndex) => {
        if (editingJobIndex !== null) return;
        const job = reportData[jobIndex];
        const comps = job?.rows || [];
        const subRowCount = getSubRowCount(job);
        const initialValues = {};

        for (let i = 0; i < subRowCount; i++) {
            const reconciliation = comps[i]?.reconciliation || {};
            TRAILING_FIELDS.forEach(field => {
                if (field.type !== "FORMULA") {
                    initialValues[`${jobIndex}-${i}-${field.key}`] = reconciliation[field.key] != null ? String(reconciliation[field.key]) : "";
                }
            });
            // Add sticky editable fields
            STICKY_EDITABLE_FIELDS.forEach(field => {
                initialValues[`${jobIndex}-${i}-${field.key}`] = comps[i]?.[field.key] != null ? String(comps[i][field.key]) : "";
            });
        }
        setEditValues(prev => ({ ...prev, ...initialValues }));
        setEditingJobIndex(jobIndex);
    };

    const handleCancelEdit = (jobIndex) => {
        setEditValues(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { if (k.startsWith(`${jobIndex}-`)) delete next[k]; });
            return next;
        });
        setEditingJobIndex(null);
    };

    const buildJobPayload = (jobIndex, job) => {
        const comps = job?.rows || [];
        const rows = [];
        for (let i = 0; i < comps.length; i++) {
            const com = comps[i];
            if (!com || !com.id) continue;
            const rowPayload = { styleRequirementRowId: com.id };
            TRAILING_FIELDS.forEach(field => {
                if (field.type !== "FORMULA") {
                    const raw = editValues[`${jobIndex}-${i}-${field.key}`];
                    const num = raw === "" || raw == null ? 0 : Math.round(Number(raw));
                    rowPayload[field.key] = isNaN(num) ? 0 : num;
                }
            });
            // Add sticky editable fields
            STICKY_EDITABLE_FIELDS.forEach(field => {
                const raw = editValues[`${jobIndex}-${i}-${field.key}`];
                rowPayload[field.key] = raw != null && raw !== "" ? String(raw) : "";
            });
            rows.push(rowPayload);
        }
        return { jobNo: job.jobNo, rows };
    };

    // Opens the reconciliation notes modal instead of saving directly
    const handleSaveJob = (jobIndex, job) => {
        setPendingSaveJobIndex(jobIndex);
        setPendingSaveJob(job);
        setNotes("");
        setShowNotesModal(true);
    };

    // Actually saves the reconciliation data with notes after modal confirmation
    const confirmSaveWithNotes = async () => {
        setSavingJob(true);
        try {
            const payload = buildJobPayload(pendingSaveJobIndex, pendingSaveJob);
            if (!payload || payload.rows.length === 0) {
                alert("No valid rows to save.");
                setShowNotesModal(false);
                return;
            }
            payload.notes = notes;
            console.log(payload)
            // await axiosPrivate.patch(`/api/styles/${encodeURIComponent(pendingSaveJob.jobNo)}/reconciliation`, payload);
            setEditingJobIndex(null);
            setShowNotesModal(false);
            setPendingSaveJobIndex(null);
            setPendingSaveJob(null);
            setNotes("");
            await fetchFilteredData();
        } catch (err) {
            console.error("Failed to save job data:", err);
            alert("Failed to save. Please try again.");
        } finally {
            setSavingJob(false);
        }
    };

    const cancelNotesModal = () => {
        setShowNotesModal(false);
        setPendingSaveJobIndex(null);
        setPendingSaveJob(null);
        setNotes("");
    };

    // ✨ AUTO FORMULA CALCULATOR (EXACTLY AS NOTED IN THE IMAGE) ✨
    const calculateFormula = (jobIndex, i, fieldKey) => {
        const get = (key) => {
            const valStr = editValues[`${jobIndex}-${i}-${key}`];
            if (valStr !== undefined && valStr !== "") {
                const num = Number(valStr);
                return isNaN(num) ? 0 : num;
            }
            const row = reportData[jobIndex]?.rows?.[i];
            const saved = row?.reconciliation?.[key];
            if (saved != null) return Number(saved);
            // Fallback to base row data (e.g. finishRequiredQty, orderQty)
            return row?.[key] != null ? Number(row[key]) : 0;
        };

        switch (fieldKey) {
            // Fabric Issued Short/Ex = Fabric Issue Cutting - Finish Require Qty
            case "fabricIssuedShortExcess":
                return get("fabricIssueCuttingDept") - get("finishRequiredQty");

            // CAD Consumption (not noted -> show saved value)
            case "cadConsumption":
                return get("orderQty") ? get("finishRequiredQty") / get("orderQty") : 0;

            // Planned Cutting (not noted -> show saved value)
            case "plannedCuttingQty":
                // return get("plannedCuttingQty");
                const cadConsumption = get("orderQty") ? get("finishRequiredQty") / get("orderQty") : 0;
                return get("fabricIssueCuttingDept") ? get("fabricIssueCuttingDept") / cadConsumption : 0;

            // * Cut. Short & Excess will calculate with ORDER Qty (Actual Cutting - Order Qty)
            case "cuttingShortExcess":
                return get("actualCuttingQty") - get("orderQty");

            // * Short & Excess % will calculate with ORDER Qty VS Actual Cut
            case "shortExcessPercentCutting": {
                const order = get("orderQty");
                const shortEx = get("actualCuttingQty") - order;
                return order > 0 ? (shortEx / order) * 100 : 0;
            }

            // * NOT Possible to Input -> Calculate with Cut to Input - Actual Cutting
            case "notPossibleToInput":
                return get("cuttingToSewingInput") - get("actualCuttingQty");

            // * Input Short & Excess will calculate with ORDER Qty - Input Qty
            case "inputShortExcess":
                return get("sewingInputQty") - get("orderQty");

            // * Out Put Short Excess will calculate From Sewing Input
            case "outputShortExcess":
                return get("sewingOutputQty") - get("sewingInputQty");

            // * Short & Excess will calculate with Finish Input - Finish Output
            case "shortExcessFinish":
                return get("finishOutputQty") - get("finishInputQty");

            // * Shipment Excess/Short will calculate with ORDER Qty (Shipped Qty - Order Qty)
            case "excessShort":
                return get("shippedQty") - get("orderQty");

            // * Planned Leftover calculate with Sewing Input (Sewing Input - Sewing Output)
            case "plannedLeftOverQty":
                return get("sewingInputQty") - get("shippedQty");

            // * Physical Leftover % calculate with Physical Leftover found
            case "percentPhysicalFoundLeftover": {
                const planned = get("sewingInputQty") - get("shippedQty");
                const physical = get("physicalFoundLeftOver");
                return planned > 0 ? (physical / planned) * 100 : 0;
            }

            // Left Over Short/Ex = Physical Found Leftover - Planned Leftover
            case "leftOverShortExcess": {
                const planned = get("sewingInputQty") - get("shippedQty");
                return get("physicalFoundLeftOver") - planned;
            }
            // Received Short/Ex 
            case "receivedShortExcess": {
                const sentForEmbellishment = get("sentForEmbellishment") || 0;
                const receivedFromEmbellishment = get("receivedFromEmbellishment") || 0;
                const total  = receivedFromEmbellishment - sentForEmbellishment;
                return total && total;
            }

            default:
                return 0;
        }
    };

    const isLoading = isDataLoading;
    const activeFilterEntries = Object.entries(activeFilters);

    return (
        <div className="min-h-screen w-full p-1 md:p-4 font-sans">
            {/* Page Header */}
            <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsWrapped(!isWrapped)} className="inline-flex items-center gap-2 px-4 py-2 bg-white border-1 border-black rounded-lg shadow-sm text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors">
                        {isWrapped ? <AlignJustify size={16} /> : <WrapText size={16} />}
                        {isWrapped ? "Unwrap Text" : "Wrap Text"}
                    </button>
                    <button onClick={fetchFilteredData} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white border-1 border-black rounded-lg shadow-sm text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Active Filters Bar */}
            {activeFilterEntries.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider mr-2">Active Filters:</span>
                    {activeFilterEntries.map(([key, values]) => {
                        const colDef = Object.values(FILTERABLE_COLS).find(c => c.key === key);
                        return (
                            <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-300">
                                {colDef?.label}: <span className="font-bold">{values.length}</span>
                                <button onClick={() => setActiveFilters(prev => { const next = { ...prev }; delete next[key]; return next; })} className="ml-1 hover:text-indigo-900 transition-colors">
                                    <X size={14} />
                                </button>
                            </span>
                        );
                    })}
                    <button onClick={() => setActiveFilters({})} className="text-xs text-slate-500 hover:text-rose-600 underline ml-2 transition-colors">
                        Clear all
                    </button>
                </div>
            )}

            {/* FULL-WIDTH Table Card with deep black frame */}
            <div className="w-full bg-white rounded-lg border-1 border-black shadow-sm overflow-hidden">
                <div className="w-full overflow-x-auto max-h-[calc(100vh-190px)]">
                    <table
                        className="w-full"
                        style={{
                            borderCollapse: "separate",
                            borderSpacing: 0,
                            tableLayout: isWrapped ? "fixed" : "auto",
                        }}
                    >
                        <thead className="sticky top-0 z-20">
                            <tr>
                                {YARN_TABLE_HEADERS.map((header, I) => {
                                    const isFilterable = FILTERABLE_COLS[I];
                                    const hasActiveFilter = activeFilters[FILTERABLE_COLS[I]?.key]?.length > 0;
                                    const isSticky = I <= LAST_STICKY_INDEX;
                                    const isLastSticky = I === LAST_STICKY_INDEX;
                                    const hasRightBorder = I === 0 || isLastSticky;

                                    return (
                                        <th
                                            key={I}
                                            className={[
                                                "px-3 py-3 text-center align-middle text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-black bg-gray-100",
                                                isSticky ? "sticky z-30 whitespace-normal" : wrapClass,
                                                isLastSticky ? "shadow-sm" : "",
                                            ].join(" ")}
                                            style={isSticky ? stickyCellStyle(I, "#f3f4f6", hasRightBorder) : cellStyle}
                                        >
                                            <div className="relative flex items-center justify-center gap-1.5">
                                                <span>{header}</span>
                                                {isFilterable && (
                                                    <button type="button" onClick={() => openFilterDropdown(I)} className={`p-1 rounded transition-colors ${openFilterCol === I ? "bg-indigo-100 text-indigo-700" : hasActiveFilter ? "text-indigo-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"}`}>
                                                        <ListFilter size={12} />
                                                    </button>
                                                )}

                                                {openFilterCol === I && isFilterable && (
                                                    <div className={`absolute top-full mt-2 w-64 bg-white rounded-lg shadow-xl ring-1 ring-black/20 z-50 overflow-hidden text-left normal-case font-normal ${I === 0 ? "left-0" : I >= YARN_TABLE_HEADERS.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"}`} onClick={(e) => e.stopPropagation()}>
                                                        <div className="p-3 border-b border-black">
                                                            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full text-sm border-1 border-black rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                                                        </div>
                                                        <div className="px-4 py-2 border-b border-black bg-slate-50">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Select All</span>
                                                            </label>
                                                        </div>
                                                        <div className="max-h-52 overflow-y-auto py-1">
                                                            {visibleOptions.length === 0 ? (
                                                                <div className="px-4 py-6 text-xs text-slate-400 text-center">No matches found</div>
                                                            ) : (
                                                                visibleOptions.map(val => (
                                                                    <label key={val} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-indigo-50 transition-colors">
                                                                        <input type="checkbox" checked={tempSelected.has(val)} onChange={() => toggleValue(val)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                                        <span className="text-sm text-slate-700 truncate">{val || "(Blank)"}</span>
                                                                    </label>
                                                                ))
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-2 p-3 border-t border-black bg-slate-50">
                                                            <button type="button" onClick={() => setOpenFilterCol(null)} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                                                            <button type="button" onClick={applyFilter} className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm">Apply</button>
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
                                <tr><td colSpan={47} className="px-4 py-20 text-center align-middle border-b border-black">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <RefreshCcw size={24} className="animate-spin text-indigo-500" />
                                        <span className="text-sm font-medium text-slate-500">Loading reconciliation data...</span>
                                    </div>
                                </td></tr>
                            )}

                            {!isLoading && reportData.length === 0 && (
                                <tr><td colSpan={47} className="px-4 py-20 text-center align-middle text-sm text-slate-500 border-b border-black">No records match your current filters.</td></tr>
                            )}

                            {!isLoading && reportData.map((job, jobIndex) => {
                                const comps = job?.rows || [];
                                const compBreakDown = job.compBreakdown || [];
                                const subRowCount = getSubRowCount(job);
                                const isEditingThisJob = editingJobIndex === jobIndex;
                                const stickyBg = isEditingThisJob ? "#eef2ff" : "#ffffff";

                                return Array.from({ length: subRowCount }).map((_, i) => {
                                    const com = comps[i];
                                    const comp = compBreakDown[i];
                                    const isFirstRow = i === 0;

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

                                    const stickyBodyClass = (colIdx) => [
                                        "sticky z-10 px-3 py-2.5 text-sm text-slate-800 border-b border-black text-center align-middle",
                                        colIdx === LAST_STICKY_INDEX ? "shadow-r-md" : "",
                                    ].join(" ");

                                    return (
                                        <tr key={`${jobIndex}-${i}`}>
                                            {/* ── STICKY COL 0: JOB NO ── */}
                                            {isFirstRow && (
                                                <td
                                                    rowSpan={subRowCount}
                                                    className={`sticky left-0 z-10 px-3 py-3 border-b border-black text-center align-middle ${isEditingThisJob ? "border-l-4 border-l-indigo-600" : ""}`}
                                                    style={stickyCellStyle(0, stickyBg, true)}
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-3 h-full">
                                                        <span className="text-sm font-bold text-slate-900">{job.jobNo || "-"}</span>
                                                        {isEditingThisJob ? (
                                                            <div className="flex flex-col gap-2 w-full">
                                                                <button type="button" onClick={() => handleSaveJob(jobIndex, job)} disabled={savingJob} className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 border border-black rounded-md hover:bg-indigo-700 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1">
                                                                    {savingJob ? <RefreshCcw size={12} className="animate-spin" /> : <><Save size={12} /> Save</>}
                                                                </button>
                                                                <button type="button" onClick={() => handleCancelEdit(jobIndex)} disabled={savingJob} className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-black rounded-md hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center gap-1">
                                                                    <XCircle size={12} /> Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button type="button" onClick={() => handleStartEdit(jobIndex)} disabled={editingJobIndex !== null} className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-black rounded-md hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                                                                <Edit3 size={12} /> Edit
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            {/* ── STICKY COL 1: COLOR ── */}
                                            <td className={stickyBodyClass(1)} style={stickyCellStyle(1, stickyBg)}>
                                                <div className="flex items-center justify-center h-full">{com?.color || "-"}</div>
                                            </td>
                                            {/* ── STICKY COL 2: COMPOSITION ── */}
                                            <td className={stickyBodyClass(2)} style={stickyCellStyle(2, stickyBg)}>
                                                <div className="flex items-center justify-center h-full">{com?.composition || "-"}</div>
                                            </td>
                                            {/* ── STICKY COL 3: ORDER QTY ── */}
                                            <td className={stickyBodyClass(3)} style={stickyCellStyle(3, stickyBg)}>
                                                <div className="flex items-center justify-center h-full">{com?.orderQty ?? "-"}</div>
                                            </td>
                                            {/* ── STICKY COL 4: MANUFACTURING UNITE (NOW EDITABLE) ── */}
                                            <td className={stickyBodyClass(4)} style={stickyCellStyle(4, stickyBg, true)}>
                                                <div className="flex items-center justify-center h-full">
                                                    {isEditingThisJob ? (
                                                        <input
                                                            className="w-full px-2 py-1.5 text-sm text-center font-semibold text-slate-900 bg-amber-100 border-2 border-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                            type="text"
                                                            placeholder="MU"
                                                            disabled={savingJob}
                                                            value={editValues[`${jobIndex}-${i}-manufacturingUnite`] ?? ""}
                                                            onChange={(e) => handleInputChange(jobIndex, i, "manufacturingUnite", e.target.value)}
                                                        />
                                                    ) : (
                                                        com?.manufacturingUnite || (com ? "MU" : "-")
                                                    )}
                                                </div>
                                            </td>

                                            {/* ── Scrolling columns (right border via inline cellStyle) ── */}
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

                                            {TRAILING_FIELDS.map((field, idx) => {
                                                const isFormula = field.type === "FORMULA";
                                                const savedValue = com?.reconciliation?.[field.key];

                                                if (isFormula) {
                                                    const calculatedValue = calculateFormula(jobIndex, i, field.key);
                                                    const isPercent = field.key.toLowerCase().includes("percent");
                                                    const isShortExcess = field.key.toLowerCase().includes("short") || field.key.toLowerCase().includes("excess");

                                                    let content;
                                                    if (isPercent) {
                                                        content = <span className="font-mono text-slate-700 font-semibold">{calculatedValue.toFixed(2)}%</span>;
                                                    } else if (isShortExcess) {
                                                        content = <ShortExcess value={calculatedValue} />;
                                                    } else {
                                                        content = <span className="font-mono text-slate-700">{calculatedValue.toFixed(2)}</span>;
                                                    }

                                                    return (
                                                        <td key={`trail-${idx}`} className={`${cellClass} bg-slate-50`} style={cellStyle}>
                                                            <div className="flex items-center justify-center h-full">
                                                                {content}
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                if (isEditingThisJob) {
                                                    return (
                                                        <td key={`trail-${idx}`} className={cellClass} style={cellStyle}>
                                                            <input
                                                                className="w-full px-2 py-1.5 text-sm text-center font-semibold text-slate-900 bg-amber-100 border-2 border-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                type="number"
                                                                step="1"
                                                                placeholder="0"
                                                                disabled={savingJob}
                                                                value={editValues[`${jobIndex}-${i}-${field.key}`] ?? ""}
                                                                onChange={(e) => handleInputChange(jobIndex, i, field.key, e.target.value)}
                                                            />
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td key={`trail-${idx}`} className={`${cellClass} font-mono text-slate-700`} style={cellStyle}>
                                                        {savedValue != null && savedValue !== 0 ? savedValue : (savedValue === 0 ? "0" : "-")}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Reconciliation Notes Modal ── */}
            {showNotesModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-xl border-2 border-black shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-black bg-slate-50">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                Reconciliation Notes — <span className="text-indigo-600">{pendingSaveJob?.jobNo || "-"}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={cancelNotesModal}
                                disabled={savingJob}
                                className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-900 disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                                Add notes for this reconciliation (optional)
                            </label>
                            <textarea
                                className="w-full h-40 px-3 py-2.5 text-sm text-slate-900 bg-white border-2 border-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-slate-100 disabled:text-slate-400"
                                placeholder="e.g. Adjustments made due to..., Reconciled with supervisor..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={savingJob}
                                autoFocus
                            />
                            <p className="mt-2 text-xs text-slate-500">
                                {notes.length} characters
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black bg-slate-50">
                            <button
                                type="button"
                                onClick={cancelNotesModal}
                                disabled={savingJob}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-black rounded-md hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmSaveWithNotes}
                                disabled={savingJob}
                                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 border border-black rounded-md hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                            >
                                {savingJob ? (
                                    <><RefreshCcw size={14} className="animate-spin" /> Saving...</>
                                ) : (
                                    <><Save size={14} /> Save Reconciliation</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reconciliation;