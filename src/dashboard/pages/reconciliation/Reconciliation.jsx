import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { RefreshCcw, AlignJustify, ListFilter, X, Edit3, Save, XCircle, CloudCog } from 'lucide-react';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';
import { Link } from 'react-router-dom';

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

const STICKY_COL_WIDTHS = [50, 170, 250, 300, 100, 150];
const STICKY_LEFT_OFFSETS = STICKY_COL_WIDTHS.reduce((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + STICKY_COL_WIDTHS[i - 1]);
    return acc;
}, []);
const LAST_STICKY_INDEX = STICKY_COL_WIDTHS.length - 1;

const FIXED_COLUMN_COUNT = 25;

const Reconciliation = () => {
    const axiosPrivate = useAxiosPrivate();

    const [activeFilters, setActiveFilters] = useState({});
    const [reportData, setReportData] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(false);

    const [openFilterCol, setOpenFilterCol] = useState(null);
    const [dropdownOptions, setDropdownOptions] = useState([]);
    const [tempSelected, setTempSelected] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    const [editingJobNo, setEditingJobNo] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [savingJob, setSavingJob] = useState(false);

    const [selectedJobs, setSelectedJobs] = useState(new Set());
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [notes, setNotes] = useState("");
    const [pendingSaveJobs, setPendingSaveJobs] = useState([]);

    const [selectedCell, setSelectedCell] = useState(null);
    const wrapperRef = useRef(null);
    const cellRefs = useRef(new Map());

    const WRAPPED_COL_WIDTH = 120;
    const wrapClass = "whitespace-normal break-words";
    const cellClass = `px-3 py-2.5 text-sm text-slate-800 border-b border-black text-center align-middle ${wrapClass}`;
    
    const cellStyle = {
        borderRight: "1px solid #000000",
        width: WRAPPED_COL_WIDTH,
        maxWidth: WRAPPED_COL_WIDTH,
        wordBreak: "break-word",
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
        "", "JOB NO", "COLOR", "COMPOSITION", "ORDER QTY", "MANUFACTURING UNIT",
        "FINISH REQUIRE QTY", "YARN REQUIRE QTY", "YARN DELIVERY",
        "SHORT & EXCESS",
        "YARN RETURN", "GREY RECEIVED",
        "SHORT & EXCESS", "GREY DELIVERY FOR DYEING", "GREY RET. RCVD FROM DYEING", "GREY RECEIVED FROM DYEING",
        "FINISH RECEIVED FROM DYEING", "PROCESS LOSS %", "SHORT & EXCESS", "SENT FOR AOP", "RETURN RECEIVED FROM AOP",
        "GREY WEIGHT RECEIVED FROM AOP", "FINISH RECEIVED FROM AOP", "PROCESS LOSS", "SHORT & EXCESS",
        "FABRIC ISSUE CUTTING", "FABRIC ISSUED SHORT/EX", "CAD CONSUMPTION", "PLANNED CUTTING", "ACTUAL CUTTING",
        "CUTTING SHORT/EXCESS", "SHORT/EXCESS %", "SENT FOR EMBELLISHMENT", "RECEIVED FROM EMBELLISHMENT",
        "RECEIVED SHORT & EXCESS", "CUTTING TO SEWING", "NOT POSSIBLE TO INPUT", "REJECTED CUT PANEL FOUND",
        "SEWING INPUT", "INPUT SHORT/EXCESS", "SEWING OUTPUT", "OUTPUT SHORT/EXCESS", "FINISH INPUT",
        "FINISH OUTPUT", "SHORT/EXCESS", "PACKING INPUT", "PACKING OUTPUT", "SHIPPED QTY", "SHIPMENT EXCESS/SHORT",
        "PLANNED LEFTOVER", "PHYSICAL FOUND LEFTOVER", "% PHYSICAL FOUND", "LEFT OVER SHORT/EX"
    ];

    const FILTERABLE_COLS = {
        1: { key: "jobNo", label: "JOB NO" },
        2: { key: "color", label: "COLOR" },
        3: { key: "composition", label: "COMPOSITION" },
        5: { key: "manufacturingUnite", label: "MANUFACTURING UNIT" },
    };

    const TRAILING_FIELDS = useMemo(() => [
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
    ], []);

    const TOTAL_COLS = FIXED_COLUMN_COUNT + TRAILING_FIELDS.length;
    const FORMULA_KEYS_TO_PERSIST = ["cadConsumption", "plannedCuttingQty", "plannedLeftOverQty"];
    const STICKY_EDITABLE_FIELDS = [{ key: "manufacturingUnite", label: "MANUFACTURING UNIT" }];

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

    // ---------- CLIENT-SIDE FILTERING FALLBACK ----------
    const processedReportData = useMemo(() => {
        const filterKeys = Object.keys(activeFilters);
        if (filterKeys.length === 0) return reportData;

        return reportData.reduce((acc, job) => {
            const comps = job?.rows || [];
            const compBreakDown = job?.compBreakdown || [];
            
            const filteredComps = [];
            const filteredCompBreakDown = [];
            
            comps.forEach((com, idx) => {
                let matchesAllFilters = true;
                
                for (const key of filterKeys) {
                    const values = activeFilters[key];
                    if (!values || values.length === 0) continue;
                    
                    let val = "";
                    if (key === "jobNo") val = String(job.jobNo ?? "");
                    else if (key === "color") val = String(com?.color ?? "");
                    else if (key === "composition") val = String(com?.composition ?? "");
                    else if (key === "manufacturingUnite") val = String(com?.reconciliation?.manufacturingUnite ?? "");
                    
                    const normalizedVal = val.trim().toLowerCase();
                    const hasMatch = values.some(v => String(v).trim().toLowerCase() === normalizedVal);
                    
                    if (!hasMatch) {
                        matchesAllFilters = false;
                        break;
                    }
                }
                
                if (matchesAllFilters) {
                    filteredComps.push(com);
                    if (compBreakDown[idx]) {
                        filteredCompBreakDown.push(compBreakDown[idx]);
                    }
                }
            });
            
            if (filteredComps.length > 0) {
                acc.push({ ...job, rows: filteredComps, compBreakdown: filteredCompBreakDown });
            }
            return acc;
        }, []);
    }, [reportData, activeFilters]);

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

    const { flatRows, rowIndexMap } = useMemo(() => {
        const rows = [];
        const map = new Map();
        processedReportData.forEach((job) => {
            const subRowCount = getSubRowCount(job);
            for (let i = 0; i < subRowCount; i++) {
                map.set(`${job.jobNo}-${i}`, rows.length);
                rows.push({ jobNo: job.jobNo, subRowIndex: i, isFirstRow: i === 0 });
            }
        });
        return { flatRows: rows, rowIndexMap: map };
    }, [processedReportData]);

    useEffect(() => {
        if (!selectedCell) return;
        if (selectedCell.rowIndex > flatRows.length - 1) {
            setSelectedCell(flatRows.length > 0 ? { rowIndex: flatRows.length - 1, colIndex: selectedCell.colIndex } : null);
        }
    }, [flatRows, selectedCell]);

    useEffect(() => {
        if (!selectedCell) return;
        const key = selectedCell.colIndex <= 1
            ? `col${selectedCell.colIndex}-job${flatRows[selectedCell.rowIndex]?.jobNo}`
            : `row${selectedCell.rowIndex}-col${selectedCell.colIndex}`;
        const el = cellRefs.current.get(key);
        if (el && el.scrollIntoView) {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [selectedCell, flatRows]);

    const cellRefKey = (rowIndex, colIndex) =>
        colIndex <= 1 ? `col${colIndex}-job${flatRows[rowIndex]?.jobNo}` : `row${rowIndex}-col${colIndex}`;

    const registerCellRef = (rowIndex, colIndex) => (el) => {
        const key = cellRefKey(rowIndex, colIndex);
        if (el) cellRefs.current.set(key, el);
        else cellRefs.current.delete(key);
    };

    const isCellSelected = (rowIndex, colIndex) => {
        if (!selectedCell) return false;
        if (colIndex <= 1) {
            return selectedCell.colIndex === colIndex && flatRows[selectedCell.rowIndex]?.jobNo === flatRows[rowIndex]?.jobNo;
        }
        return selectedCell.rowIndex === rowIndex && selectedCell.colIndex === colIndex;
    };

    const selectedCellClass = (rowIndex, colIndex) =>
        isCellSelected(rowIndex, colIndex) ? "outline outline-2 outline-offset-[-2px] outline-blue-500 bg-blue-50/60" : "";

    const handleCellClick = (e, rowIndex, colIndex) => {
        setSelectedCell({ rowIndex, colIndex });
        const tag = e.target.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
            wrapperRef.current?.focus();
        }
    };

    const cellProps = (rowIndex, colIndex) => ({
        ref: registerCellRef(rowIndex, colIndex),
        onClick: (e) => handleCellClick(e, rowIndex, colIndex),
    });

    const handleTableKeyDown = (e) => {
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
        if (!selectedCell) return;

        const target = e.target;
        const tag = target.tagName;
        const isTextInput = tag === "INPUT" && target.type === "text";
        const isNumberInput = tag === "INPUT" && target.type === "number";
        const isTextarea = tag === "TEXTAREA";

        if (isNumberInput) return;

        if (isTextInput || isTextarea) {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") return;
            const atStart = target.selectionStart === 0 && target.selectionEnd === 0;
            const atEnd = target.selectionStart === target.value.length && target.selectionEnd === target.value.length;
            if (e.key === "ArrowLeft" && !atStart) return;
            if (e.key === "ArrowRight" && !atEnd) return;
        }

        if (flatRows.length === 0) return;
        e.preventDefault();

        setSelectedCell((prev) => {
            if (!prev) return prev;
            let { rowIndex, colIndex } = prev;
            if (e.key === "ArrowUp") rowIndex = Math.max(0, rowIndex - 1);
            else if (e.key === "ArrowDown") rowIndex = Math.min(flatRows.length - 1, rowIndex + 1);
            else if (e.key === "ArrowLeft") colIndex = Math.max(0, colIndex - 1);
            else if (e.key === "ArrowRight") colIndex = Math.min(TOTAL_COLS - 1, colIndex + 1);
            return { rowIndex, colIndex };
        });
    };

    const handleInputChange = (jobNo, subRowIdx, fieldKey, value) => {
        setEditValues(prev => ({ ...prev, [`${jobNo}-${subRowIdx}-${fieldKey}`]: value }));
    };

    const handleStartEdit = (jobNo, job) => {
        if (editingJobNo !== null) return;
        const comps = job?.rows || [];
        const subRowCount = getSubRowCount(job);
        const initialValues = {};

        for (let i = 0; i < subRowCount; i++) {
            const reconciliation = comps[i]?.reconciliation || {};
            TRAILING_FIELDS.forEach(field => {
                if (field.type !== "FORMULA") {
                    initialValues[`${jobNo}-${i}-${field.key}`] = reconciliation[field.key] != null ? String(reconciliation[field.key]) : "";
                }
            });
            STICKY_EDITABLE_FIELDS.forEach(field => {
                const savedVal = reconciliation[field.key];
                initialValues[`${jobNo}-${i}-${field.key}`] = savedVal != null && savedVal !== "NULL" ? String(savedVal) : "";
            });
        }
        setEditValues(prev => ({ ...prev, ...initialValues }));
        setEditingJobNo(jobNo);
    };

    const handleCancelEdit = (jobNo) => {
        setEditValues(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { if (k.startsWith(`${jobNo}-`)) delete next[k]; });
            return next;
        });
        setEditingJobNo(null);
    };

    const calculateFormula = useCallback((jobNo, i, fieldKey, currentJob) => {
        const get = (key) => {
            const valStr = editValues[`${jobNo}-${i}-${key}`];
            if (valStr !== undefined && valStr !== "") {
                const num = Number(valStr);
                return isNaN(num) ? 0 : num;
            }
            const row = currentJob?.rows?.[i];
            const saved = row?.reconciliation?.[key];
            if (saved != null) return Number(saved);
            return row?.[key] != null ? Number(row[key]) : 0;
        };

        switch (fieldKey) {
            case "fabricIssuedShortExcess": return get("fabricIssueCuttingDept") - get("finishRequiredQty");
            case "cadConsumption": return get("orderQty") ? get("finishRequiredQty") / get("orderQty") : 0;
            case "plannedCuttingQty": {
                const cadConsumption = get("orderQty") ? get("finishRequiredQty") / get("orderQty") : 0;
                return cadConsumption > 0 && get("fabricIssueCuttingDept") ? get("fabricIssueCuttingDept") / cadConsumption : 0;
            }
            case "cuttingShortExcess": return get("actualCuttingQty") - get("orderQty");
            case "shortExcessPercentCutting": {
                const order = get("orderQty");
                const shortEx = get("actualCuttingQty") - order;
                return order > 0 ? (shortEx / order) * 100 : 0;
            }
            case "notPossibleToInput": return get("cuttingToSewingInput") - get("actualCuttingQty");
            case "inputShortExcess": return get("sewingInputQty") - get("orderQty");
            case "outputShortExcess": return get("sewingOutputQty") - get("sewingInputQty");
            case "shortExcessFinish": return get("finishOutputQty") - get("finishInputQty");
            case "excessShort": return get("shippedQty") - get("orderQty");
            case "plannedLeftOverQty": return get("sewingInputQty") - get("shippedQty");
            case "percentPhysicalFoundLeftover": {
                const planned = get("sewingInputQty") - get("shippedQty");
                const physical = get("physicalFoundLeftOver");
                return planned > 0 ? (physical / planned) * 100 : 0;
            }
            case "leftOverShortExcess": {
                const planned = get("sewingInputQty") - get("shippedQty");
                return get("physicalFoundLeftOver") - planned;
            }
            case "receivedShortExcess": {
                const sentForEmbellishment = get("sentForEmbellishment") || 0;
                const receivedFromEmbellishment = get("receivedFromEmbellishment") || 0;
                return receivedFromEmbellishment - sentForEmbellishment;
            }
            default: return 0;
        }
    }, [editValues]);

    const buildJobPayload = (jobNo, job) => {
        const comps = job?.rows || [];
        const rows = [];
        for (let i = 0; i < comps.length; i++) {
            const com = comps[i];
            if (!com || !com.id) continue;
            const rowPayload = { styleRequirementRowId: com.id };

            TRAILING_FIELDS.forEach(field => {
                if (field.type !== "FORMULA") {
                    const raw = editValues[`${jobNo}-${i}-${field.key}`];
                    let num;
                    if (raw === undefined) {
                        const saved = com.reconciliation?.[field.key];
                        num = saved != null ? Math.round(Number(saved)) : 0;
                    } else {
                        num = raw === "" ? 0 : Math.round(Number(raw));
                    }
                    rowPayload[field.key] = isNaN(num) ? 0 : num;
                } else if (FORMULA_KEYS_TO_PERSIST.includes(field.key)) {
                    const calculated = calculateFormula(jobNo, i, field.key, job);
                    rowPayload[field.key] = Number.isFinite(calculated) ? Math.round(calculated) : 0;
                }
            });

            STICKY_EDITABLE_FIELDS.forEach(field => {
                const raw = editValues[`${jobNo}-${i}-${field.key}`];
                if (raw !== undefined) {
                    rowPayload[field.key] = raw !== "" ? String(raw) : "";
                } else {
                    const saved = com?.reconciliation?.[field.key];
                    rowPayload[field.key] = saved != null && saved !== "NULL" ? String(saved) : "";
                }
            });

            rows.push(rowPayload);
        }
        return { jobNo: job.jobNo, rows };
    };

    const toggleJobSelection = (jobNo) => {
        setSelectedJobs(prev => {
            const next = new Set(prev);
            if (next.has(jobNo)) next.delete(jobNo);
            else next.add(jobNo);
            return next;
        });
    };

    const allSelected = processedReportData.length > 0 && processedReportData.every(job => selectedJobs.has(job.jobNo));
    
    const toggleAllSelection = () => {
        if (allSelected) {
            setSelectedJobs(new Set());
        } else {
            setSelectedJobs(new Set(processedReportData.map(job => job.jobNo)));
        }
    };

    const handleGlobalSubmit = () => {
        const jobsToSave = processedReportData.filter(job => selectedJobs.has(job.jobNo)).map(job => ({ jobNo: job.jobNo, job }));
        setPendingSaveJobs(jobsToSave);
        setNotes("");
        setShowNotesModal(true);
    };

    const handleIndividualSave = async (jobNo, job) => {
        setSavingJob(true);
        try {
            const payload = buildJobPayload(jobNo, job);
            if (!payload || payload.rows.length === 0) {
                alert("No valid rows to save.");
                return;
            }
            payload.notes = "";

            await axiosPrivate.patch(`/api/styles/${encodeURIComponent(jobNo)}/reconciliation`, payload);

            setEditingJobNo(null);
            await fetchFilteredData();
        } catch (err) {
            console.error("Failed to save job data:", err);
            alert("Failed to save. Please try again.");
        } finally {
            setSavingJob(false);
        }
    };

    const confirmSaveWithNotes = async () => {
        setSavingJob(true);
        try {
            for (const { jobNo, job } of pendingSaveJobs) {
                const payload = buildJobPayload(jobNo, job);
                if (!payload || payload.rows.length === 0) continue;
                payload.notes = notes;
                await axiosPrivate.patch(`/api/styles/${encodeURIComponent(jobNo)}/reconciliation`, payload);
            }

            setSelectedJobs(new Set());
            setEditingJobNo(null);
            setShowNotesModal(false);
            setPendingSaveJobs([]);
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
        setPendingSaveJobs([]);
        setNotes("");
    };

    const isLoading = isDataLoading;
    const activeFilterEntries = Object.entries(activeFilters);

    const footerTotals = useMemo(() => {
        const totals = {
            orderQty: 0, finishRequiredQty: 0, yarnRequiredQty: 0, knitYarnDelivery: 0,
            yarnShortExcessReq: 0, yarnShortExcessReturn: 0, knitYarnReturn: 0, knitGreyReceived: 0,
            knitShortExcess: 0, dyeGreyDelivery: 0, dyeGreyReturn: 0, dyeGreyReceived: 0,
            dyeFinishReceived: 0, dyeShortExcess: 0, aopSent: 0, aopReceived: 0,
            aopGreyReceived: 0, aopFinishReceived: 0, aopShortExcess: 0,
        };
        TRAILING_FIELDS.forEach(f => { totals[f.key] = 0; });

        processedReportData.forEach((job) => {
            const jobNo = job.jobNo;
            const comps = job?.rows || [];
            const compBreakDown = job.compBreakdown || [];
            const subRowCount = getSubRowCount(job);

            for (let i = 0; i < subRowCount; i++) {
                const com = comps[i];
                const comp = compBreakDown[i];
                if (!com && !comp) continue;

                const finishQty = Number(com?.finishRequiredQty) || 0;
                const processLoss = Number(job.processLoss) || 0;
                const yarnRequiredQty = finishQty * (1 + processLoss / 100);
                const knitYarnDelivery = Number(comp?.knittingOrder_Yarn_Delivery) || 0;
                const knitGreyReceived = Number(comp?.knittingOrder_Grey_Fabric_Received) || 0;
                const knitYarnReturn = Number(comp?.knittingOrder_Yarn_Return) || 0;
                const knitShortExcess = knitGreyReceived + knitYarnReturn - knitYarnDelivery;
                const yarnShortExcessReq = knitYarnDelivery - yarnRequiredQty;
                const yarnShortExcessReturn = knitYarnReturn + knitGreyReceived - knitYarnDelivery;
                const dyeFinishReceived = Number(comp?.dyeingOrder_Finish_Received) || 0;
                const dyeGreyReceived = Number(comp?.dyeingOrder_Grey_Received) || 0;
                const dyeGreyDelivery = Number(comp?.dyeingOrder_Grey_Delivery) || 0;
                const dyeGreyReturn = Number(comp?.dyeingOrder_Grey_Return) || 0;
                const dyeShortExcess = dyeGreyReceived - dyeGreyDelivery;
                const aopFinishReceived = Number(comp?.aopOrder_AOP_Finish_Fabric_Rcvd) || 0;
                const aopGreyReceived = Number(comp?.aopOrder_Received_From_Aop) || 0;
                const aopSent = Number(comp?.aopOrder_Sent_for_AOP) || 0;
                const aopReceived = Number(comp?.aopOrder_Return_From_Aop) || 0;
                const aopShortExcess = aopReceived - aopSent;

                totals.orderQty += Number(com?.orderQty) || 0;
                totals.finishRequiredQty += finishQty;
                totals.yarnRequiredQty += yarnRequiredQty;
                totals.knitYarnDelivery += knitYarnDelivery;
                totals.yarnShortExcessReq += yarnShortExcessReq;
                totals.yarnShortExcessReturn += yarnShortExcessReturn;
                totals.knitYarnReturn += knitYarnReturn;
                totals.knitGreyReceived += knitGreyReceived;
                totals.knitShortExcess += knitShortExcess;
                totals.dyeGreyDelivery += dyeGreyDelivery;
                totals.dyeGreyReturn += dyeGreyReturn;
                totals.dyeGreyReceived += dyeGreyReceived;
                totals.dyeFinishReceived += dyeFinishReceived;
                totals.dyeShortExcess += dyeShortExcess;
                totals.aopSent += aopSent;
                totals.aopReceived += aopReceived;
                totals.aopGreyReceived += aopGreyReceived;
                totals.aopFinishReceived += aopFinishReceived;
                totals.aopShortExcess += aopShortExcess;

                TRAILING_FIELDS.forEach(field => {
                    if (field.type === "FORMULA") {
                        totals[field.key] += calculateFormula(jobNo, i, field.key, job);
                    } else {
                        const raw = editValues[`${jobNo}-${i}-${field.key}`];
                        const num = raw !== undefined ? Number(raw) : Number(com?.reconciliation?.[field.key]);
                        totals[field.key] += isNaN(num) ? 0 : num;
                    }
                });
            }
        });

        return totals;
    }, [processedReportData, editValues, TRAILING_FIELDS, calculateFormula]);

    return (
        <div className="min-h-screen w-full p-1 md:p-4 font-sans">
            <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={fetchFilteredData} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white border border-black rounded-lg shadow-sm text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                    <Link to={"/dashboard/balance-sheet"}>
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white border border-black rounded-lg shadow-sm text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                            Balance Sheet
                        </button>
                    </Link>

                    {selectedJobs.size > 0 && (
                        <button onClick={handleGlobalSubmit} disabled={savingJob} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white border border-black rounded-lg shadow-sm text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <CloudCog size={16} />
                            Submit Reconciliation ({selectedJobs.size})
                        </button>
                    )}
                </div>
            </div>

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

            <div className="w-full bg-white rounded-lg border border-black shadow-sm overflow-hidden">
                <div
                    className="w-full overflow-x-auto max-h-[calc(100vh-190px)] focus:outline-none"
                    ref={wrapperRef}
                    tabIndex={0}
                    onKeyDown={handleTableKeyDown}
                >
                    <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
                        <thead className="sticky top-0 z-20">
                            <tr>
                                {YARN_TABLE_HEADERS.map((header, I) => {
                                    const isFilterable = FILTERABLE_COLS[I];
                                    const hasActiveFilter = activeFilters[FILTERABLE_COLS[I]?.key]?.length > 0;
                                    const isSticky = I <= LAST_STICKY_INDEX;
                                    const isLastSticky = I === LAST_STICKY_INDEX;
                                    const hasRightBorder = I === 1 || isLastSticky;
                                    const showFilterIcon = I !== 0;

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
                                                {I === 0 ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={toggleAllSelection}
                                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                ) : (
                                                    <span>{header}</span>
                                                )}

                                                {isFilterable && (
                                                    <button type="button" onClick={() => openFilterDropdown(I)} className={`p-1 rounded transition-colors ${openFilterCol === I ? "bg-indigo-100 text-indigo-700" : hasActiveFilter ? "text-indigo-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"}`}>
                                                        <ListFilter size={12} />
                                                    </button>
                                                )}

                                                {!isFilterable && showFilterIcon && (
                                                    <ListFilter size={12} className="text-slate-300" />
                                                )}

                                                {openFilterCol === I && isFilterable && (
                                                    <div className={`absolute top-full mt-2 w-64 bg-white rounded-lg shadow-xl ring-1 ring-black/20 z-50 overflow-hidden text-left normal-case font-normal ${I === 1 ? "left-0" : I >= YARN_TABLE_HEADERS.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"}`} onClick={(e) => e.stopPropagation()}>
                                                        <div className="p-3 border-b border-black">
                                                            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full text-sm border border-black rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
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
                                <tr><td colSpan={YARN_TABLE_HEADERS.length} className="px-4 py-20 text-center align-middle border-b border-black">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <RefreshCcw size={24} className="animate-spin text-indigo-500" />
                                        <span className="text-sm font-medium text-slate-500">Loading reconciliation data...</span>
                                    </div>
                                </td></tr>
                            )}

                            {!isLoading && processedReportData.length === 0 && (
                                <tr><td colSpan={YARN_TABLE_HEADERS.length} className="px-4 py-20 text-center align-middle text-sm text-slate-500 border-b border-black">No records match your current filters.</td></tr>
                            )}

                            {!isLoading && processedReportData.map((job) => {
                                const jobNo = job.jobNo;
                                const comps = job?.rows || [];
                                const compBreakDown = job.compBreakdown || [];
                                const subRowCount = getSubRowCount(job);
                                const isEditingThisJob = editingJobNo === jobNo;
                                const stickyBg = isEditingThisJob ? "#eef2ff" : "#ffffff";

                                return Array.from({ length: subRowCount }).map((_, i) => {
                                    const com = comps[i];
                                    const comp = compBreakDown[i];
                                    const isFirstRow = i === 0;
                                    const rowFlatIndex = rowIndexMap.get(`${jobNo}-${i}`);

                                    const finishQty = Number(com?.finishRequiredQty).toFixed(2) || 0;
                                    const processLoss = Number(job.processLoss) || 0;
                                    const yarnRequiredQty = finishQty * (1 + processLoss / 100);
                                    const knitYarnDelivery = comp?.knittingOrder_Yarn_Delivery || 0;
                                    const knitGreyReceived = Number(comp?.knittingOrder_Grey_Fabric_Received) || 0;
                                    const knitYarnReturn = comp?.knittingOrder_Yarn_Return || 0;
                                    const yarnShortExcessReq = knitYarnDelivery - yarnRequiredQty;
                                    const knitShortExcess = knitYarnReturn + knitGreyReceived - knitYarnDelivery || 0;
                                    const convertKnitShortExcessToNumber = knitShortExcess.toFixed(2);
                                    const dyeFinishReceived = Number(comp?.dyeingOrder_Finish_Received).toFixed(2) || 0;
                                    const dyeGreyReceived = Number(comp?.dyeingOrder_Grey_Received).toFixed(2) || 0;
                                    const dyeProcessLoss = dyeGreyReceived > 0 ? ((dyeGreyReceived - dyeFinishReceived) / dyeGreyReceived) * 100 : 0;
                                    const dyeGreyDelivery = Number(comp?.dyeingOrder_Grey_Delivery).toFixed(2) || 0;
                                    const dyeShortExcess = dyeGreyReceived - dyeGreyDelivery;
                                    const aopFinishReceived = Number(comp?.aopOrder_AOP_Finish_Fabric_Rcvd).toFixed(2) || 0;
                                    const aopGreyReceived = Number(comp?.aopOrder_Received_From_Aop).toFixed(2) || 0;
                                    const aopProcessLoss = aopGreyReceived > 0 ? ((aopGreyReceived - aopFinishReceived) / aopGreyReceived) * 100 : 0;
                                    const aopSent = Number(comp?.aopOrder_Sent_for_AOP).toFixed(2) || 0;
                                    const aopReceived = Number(comp?.aopOrder_Return_From_Aop).toFixed(2) || 0;
                                    const aopShortExcess = aopSent - aopReceived;

                                    const stickyBodyClass = (colIdx) => [
                                        "sticky z-10 px-3 py-2.5 text-sm text-slate-800 border-b border-black text-center align-middle",
                                        colIdx === LAST_STICKY_INDEX ? "shadow-r-md" : "",
                                    ].join(" ");

                                    return (
                                        <tr key={`${jobNo}-${i}`}>
                                            {isFirstRow && (
                                                <td
                                                    rowSpan={subRowCount}
                                                    className={`sticky left-0 z-10 px-3 py-3 border-b border-black text-center align-middle ${selectedCellClass(rowFlatIndex, 0)}`}
                                                    style={stickyCellStyle(0, stickyBg, false)}
                                                    {...cellProps(rowFlatIndex, 0)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedJobs.has(jobNo)}
                                                        onChange={() => toggleJobSelection(jobNo)}
                                                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                            )}

                                            {isFirstRow && (
                                                <td
                                                    rowSpan={subRowCount}
                                                    className={`sticky z-10 px-3 py-3 border-b border-black text-center align-middle ${isEditingThisJob ? "border-l-4 border-l-indigo-600" : ""} ${selectedCellClass(rowFlatIndex, 1)}`}
                                                    style={stickyCellStyle(1, stickyBg, true)}
                                                    {...cellProps(rowFlatIndex, 1)}
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-3 h-full">
                                                        <span className="text-sm font-bold text-slate-900">{jobNo || "-"}</span>
                                                        {isEditingThisJob ? (
                                                            <div className="flex flex-col gap-2 w-full">
                                                                <button type="button" onClick={() => handleIndividualSave(jobNo, job)} disabled={savingJob} className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 border border-black rounded-md hover:bg-indigo-700 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1">
                                                                    {savingJob ? <RefreshCcw size={12} className="animate-spin" /> : <><Save size={12} /> Save</>}
                                                                </button>
                                                                <button type="button" onClick={() => handleCancelEdit(jobNo)} disabled={savingJob} className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-black rounded-md hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center gap-1">
                                                                    <XCircle size={12} /> Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button type="button" onClick={() => handleStartEdit(jobNo, job)} disabled={editingJobNo !== null} className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-black rounded-md hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                                                                <Edit3 size={12} /> Edit
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            <td className={`${stickyBodyClass(2)} ${selectedCellClass(rowFlatIndex, 2)}`} style={stickyCellStyle(2, stickyBg)} {...cellProps(rowFlatIndex, 2)}>
                                                <div className="flex items-center justify-center h-full">{com?.color || "-"}</div>
                                            </td>
                                            <td className={`${stickyBodyClass(3)} ${selectedCellClass(rowFlatIndex, 3)}`} style={stickyCellStyle(3, stickyBg)} {...cellProps(rowFlatIndex, 3)}>
                                                <div className="flex items-center justify-center h-full">{com?.composition || "-"}</div>
                                            </td>
                                            <td className={`${stickyBodyClass(4)} ${selectedCellClass(rowFlatIndex, 4)}`} style={stickyCellStyle(4, stickyBg)} {...cellProps(rowFlatIndex, 4)}>
                                                <div className="flex items-center justify-center h-full">{com?.orderQty ?? "-"}</div>
                                            </td>

                                            <td className={`${stickyBodyClass(5)} ${selectedCellClass(rowFlatIndex, 5)}`} style={stickyCellStyle(5, stickyBg, true)} {...cellProps(rowFlatIndex, 5)}>
                                                <div className="flex items-center justify-center h-full">
                                                    {isEditingThisJob ? (
                                                        <input
                                                            className="w-full px-2 py-1.5 text-sm text-center font-semibold text-slate-900 bg-amber-100 border-2 border-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                            type="text"
                                                            placeholder="Unit"
                                                            disabled={savingJob}
                                                            value={editValues[`${jobNo}-${i}-manufacturingUnite`] ?? ""}
                                                            onChange={(e) => handleInputChange(jobNo, i, "manufacturingUnite", e.target.value)}
                                                        />
                                                    ) : (
                                                        com?.reconciliation?.manufacturingUnite && com.reconciliation.manufacturingUnite !== "NULL"
                                                            ? com.reconciliation.manufacturingUnite
                                                            : "-"
                                                    )}
                                                </div>
                                            </td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 6)}`} style={cellStyle} {...cellProps(rowFlatIndex, 6)}>{com?.finishRequiredQty != null ? Number(com.finishRequiredQty).toFixed(2) : "-"}</td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 7)}`} style={cellStyle} {...cellProps(rowFlatIndex, 7)}>{com ? yarnRequiredQty.toFixed(2) : "-"}</td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 8)}`} style={cellStyle} {...cellProps(rowFlatIndex, 8)}>
                                                {comp?.knittingOrder_Yarn_Delivery && !isNaN(Number(comp.knittingOrder_Yarn_Delivery))
                                                    ? Number(comp.knittingOrder_Yarn_Delivery).toFixed(2) : "-"}
                                            </td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 9)}`} style={cellStyle} {...cellProps(rowFlatIndex, 9)}>{comp ? <ShortExcess value={yarnShortExcessReq} /> : "-"}</td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 10)}`} style={cellStyle} {...cellProps(rowFlatIndex, 10)}>
                                                {comp?.knittingOrder_Yarn_Return && !isNaN(Number(comp.knittingOrder_Yarn_Return))
                                                    ? Number(comp.knittingOrder_Yarn_Return).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 11)}`} style={cellStyle} {...cellProps(rowFlatIndex, 11)}>
                                                {comp?.knittingOrder_Grey_Fabric_Received && !isNaN(Number(comp.knittingOrder_Grey_Fabric_Received))
                                                    ? Number(comp.knittingOrder_Grey_Fabric_Received).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 12)}`} style={cellStyle} {...cellProps(rowFlatIndex, 12)}>{comp ? <ShortExcess value={convertKnitShortExcessToNumber} /> : "-"}</td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 13)}`} style={cellStyle} {...cellProps(rowFlatIndex, 13)}>
                                                {comp?.dyeingOrder_Grey_Delivery && !isNaN(Number(comp.dyeingOrder_Grey_Delivery))
                                                    ? Number(comp.dyeingOrder_Grey_Delivery).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 14)}`} style={cellStyle} {...cellProps(rowFlatIndex, 14)}>
                                                {comp?.dyeingOrder_Grey_Return && !isNaN(Number(comp.dyeingOrder_Grey_Return))
                                                    ? Number(comp.dyeingOrder_Grey_Return).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 15)}`} style={cellStyle} {...cellProps(rowFlatIndex, 15)}>
                                                {comp?.dyeingOrder_Grey_Received && !isNaN(Number(comp.dyeingOrder_Grey_Received))
                                                    ? Number(comp.dyeingOrder_Grey_Received).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 16)}`} style={cellStyle} {...cellProps(rowFlatIndex, 16)}>
                                                {comp?.dyeingOrder_Finish_Received && !isNaN(Number(comp.dyeingOrder_Finish_Received))
                                                    ? Number(comp.dyeingOrder_Finish_Received).toFixed(2) : "-"}
                                            </td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 17)}`} style={cellStyle} {...cellProps(rowFlatIndex, 17)}>{comp ? `${dyeProcessLoss.toFixed(1)}%` : "-"}</td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 18)}`} style={cellStyle} {...cellProps(rowFlatIndex, 18)}>{comp ? <ShortExcess value={dyeShortExcess} /> : "-"}</td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 19)}`} style={cellStyle} {...cellProps(rowFlatIndex, 19)}>
                                                {comp?.aopOrder_Sent_for_AOP && !isNaN(Number(comp.aopOrder_Sent_for_AOP))
                                                    ? Number(comp.aopOrder_Sent_for_AOP).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 20)}`} style={cellStyle} {...cellProps(rowFlatIndex, 20)}>
                                                {comp?.aopOrder_Return_From_Aop && !isNaN(Number(comp.aopOrder_Return_From_Aop))
                                                    ? Number(comp.aopOrder_Return_From_Aop).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 21)}`} style={cellStyle} {...cellProps(rowFlatIndex, 21)}>
                                                {comp?.aopOrder_Received_From_Aop && !isNaN(Number(comp.aopOrder_Received_From_Aop))
                                                    ? Number(comp.aopOrder_Received_From_Aop).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 22)}`} style={cellStyle} {...cellProps(rowFlatIndex, 22)}>
                                                {comp?.aopOrder_AOP_Finish_Fabric_Rcvd && !isNaN(Number(comp.aopOrder_AOP_Finish_Fabric_Rcvd))
                                                    ? Number(comp.aopOrder_AOP_Finish_Fabric_Rcvd).toFixed(2) : "-"}
                                            </td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 23)}`} style={cellStyle} {...cellProps(rowFlatIndex, 23)}>{comp ? `${aopProcessLoss.toFixed(1)}%` : "-"}</td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 24)}`} style={cellStyle} {...cellProps(rowFlatIndex, 24)}>{comp ? <ShortExcess value={aopShortExcess} /> : "-"}</td>

                                            {TRAILING_FIELDS.map((field, idx) => {
                                                const colIndex = FIXED_COLUMN_COUNT + idx;
                                                const isFormula = field.type === "FORMULA";
                                                const savedValue = com?.reconciliation?.[field.key];

                                                if (isFormula) {
                                                    const calculatedValue = calculateFormula(jobNo, i, field.key, job);
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
                                                        <td key={`trail-${idx}`} className={`${cellClass} bg-slate-50 ${selectedCellClass(rowFlatIndex, colIndex)}`} style={cellStyle} {...cellProps(rowFlatIndex, colIndex)}>
                                                            <div className="flex items-center justify-center h-full">
                                                                {content}
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                if (isEditingThisJob) {
                                                    return (
                                                        <td key={`trail-${idx}`} className={`${cellClass} ${selectedCellClass(rowFlatIndex, colIndex)}`} style={cellStyle} {...cellProps(rowFlatIndex, colIndex)}>
                                                            <input
                                                                className="w-full px-2 py-1.5 text-sm text-center font-semibold text-slate-900 bg-amber-100 border-2 border-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                type="number"
                                                                step="1"
                                                                placeholder="0"
                                                                disabled={savingJob}
                                                                value={editValues[`${jobNo}-${i}-${field.key}`] ?? ""}
                                                                onChange={(e) => handleInputChange(jobNo, i, field.key, e.target.value)}
                                                            />
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td key={`trail-${idx}`} className={`${cellClass} font-mono text-slate-700 ${selectedCellClass(rowFlatIndex, colIndex)}`} style={cellStyle} {...cellProps(rowFlatIndex, colIndex)}>
                                                        {savedValue != null && savedValue !== 0 ? savedValue : (savedValue === 0 ? "0" : "-")}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>

                        {!isLoading && processedReportData.length > 0 && (
                            <tfoot className="sticky bottom-0 z-20 bg-white">
                                <tr>
                                    <td className="sticky bottom-0 left-0 z-30 px-3 py-3 border-t-2 border-black text-center align-middle" style={stickyCellStyle(0, "#e2e8f0", false)} />
                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-black text-center align-middle text-xs font-extrabold uppercase tracking-wider text-slate-700" style={stickyCellStyle(1, "#e2e8f0", true)}>
                                        Sub-Total
                                    </td>
                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-black" style={stickyCellStyle(2, "#e2e8f0")} />
                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-black" style={stickyCellStyle(3, "#e2e8f0")} />

                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...stickyCellStyle(4, "#e2e8f0", false), borderTop: "2px solid #000000" }}>
                                        {footerTotals.orderQty.toFixed(2)}
                                    </td>

                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-black" style={stickyCellStyle(5, "#e2e8f0", true)} />

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.finishRequiredQty.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.yarnRequiredQty.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.knitYarnDelivery.toFixed(2)}
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        <div className="flex items-center justify-center h-full"><ShortExcess value={footerTotals.yarnShortExcessReq} /></div>
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.knitYarnReturn.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.knitGreyReceived.toFixed(2)}
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        <div className="flex items-center justify-center h-full"><ShortExcess value={footerTotals.knitShortExcess} /></div>
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.dyeGreyDelivery.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.dyeGreyReturn.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.dyeGreyReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.dyeFinishReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }} />

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        <div className="flex items-center justify-center h-full"><ShortExcess value={footerTotals.dyeShortExcess} /></div>
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.aopSent.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.aopReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.aopGreyReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        {footerTotals.aopFinishReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }} />

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                        <div className="flex items-center justify-center h-full"><ShortExcess value={footerTotals.aopShortExcess} /></div>
                                    </td>

                                    {TRAILING_FIELDS.map((field) => {
                                        const isPercent = field.key.toLowerCase().includes("percent");
                                        const isShortExcess = field.key.toLowerCase().includes("short") || field.key.toLowerCase().includes("excess");
                                        const val = footerTotals[field.key];

                                        if (isShortExcess) {
                                            return (
                                                <td key={`foot-${field.key}`} className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                                    <div className="flex items-center justify-center h-full"><ShortExcess value={val} /></div>
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={`foot-${field.key}`} className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-black text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f8fafc", borderTop: "2px solid #000000" }}>
                                                {isPercent ? `${val.toFixed(1)}%` : val.toFixed(2)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {showNotesModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-xl border-2 border-black shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-black bg-slate-50">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                Reconciliation Notes — <span className="text-indigo-600">{pendingSaveJobs.length} Job(s)</span>
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