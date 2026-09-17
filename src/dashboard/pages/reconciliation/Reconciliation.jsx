import React, { useCallback, useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCcw, AlignJustify, ListFilter, X, Edit3, Save, XCircle, CloudCog, Download, ChevronDown, Search, Filter } from 'lucide-react';
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

const STICKY_COL_WIDTHS = [50, 140, 120, 150, 220, 300, 100, 150];
const STICKY_LEFT_OFFSETS = STICKY_COL_WIDTHS.reduce((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + STICKY_COL_WIDTHS[i - 1]);
    return acc;
}, []);
const LAST_STICKY_INDEX = STICKY_COL_WIDTHS.length - 1;

const FIXED_COLUMN_COUNT = 27;

const normalizeFilterVal = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).trim();
    if (s.toUpperCase() === "NULL") return "";
    return s.toLowerCase();
};

const formatDateDisplay = (value) => {
    if (!value || value === "NULL") return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const toDateInputValue = (value) => {
    if (!value || value === "NULL") return "";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const monthKeyFromDate = (value) => {
    if (!value || value === "NULL") return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (key) => {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

const getRowKey = (com, fallbackIndex) => {
    if (com && com.id !== undefined && com.id !== null && com.id !== "") return String(com.id);
    return `idx-${fallbackIndex}`;
};

const LS_KEYS = {
    remarks: (jobNo, rowKey) => `reconciliation_remarks_${jobNo}_${rowKey}`,
    date: (jobNo) => `reconciliation_date_${jobNo}`,
    manuUnit: (jobNo, rowKey) => `reconciliation_manuUnit_${jobNo}_${rowKey}`,
};

const lsGet = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
};
const lsSet = (key, value) => {
    try {
        if (value === null || value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, String(value));
    } catch { /* ignore */ }
};

const EXCELJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
let excelJsPromise = null;
const loadExcelJS = () => {
    if (typeof window !== "undefined" && window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (excelJsPromise) return excelJsPromise;
    excelJsPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = EXCELJS_CDN;
        s.async = true;
        s.onload = () => {
            if (window.ExcelJS) resolve(window.ExcelJS);
            else reject(new Error("ExcelJS failed to attach to window"));
        };
        s.onerror = () => reject(new Error("Failed to load ExcelJS from CDN"));
        document.head.appendChild(s);
    });
    return excelJsPromise;
};

const XL_BORDER = {
    top: { style: "thin", color: { argb: "FF312817" } },
    left: { style: "thin", color: { argb: "FF312817" } },
    bottom: { style: "thin", color: { argb: "FF312817" } },
    right: { style: "thin", color: { argb: "FF312817" } },
};
const XL_BORDER_HEADER = {
    top: { style: "thin", color: { argb: "FF312817" } },
    left: { style: "thin", color: { argb: "FF312817" } },
    bottom: { style: "medium", color: { argb: "FF312817" } },
    right: { style: "thin", color: { argb: "FF312817" } },
};
const XL_BORDER_SUBTOTAL = {
    top: { style: "medium", color: { argb: "FF312817" } },
    left: { style: "thin", color: { argb: "FF312817" } },
    bottom: { style: "medium", color: { argb: "FF312817" } },
    right: { style: "thin", color: { argb: "FF312817" } },
};

const NUMFMT_NUMBER = '0.00';
const NUMFMT_SHORT_EXCESS = '[Green]+0.00;[Red]-0.00;0.00';
const NUMFMT_PCT_1 = '0.0"%"';
const NUMFMT_PCT_2 = '0.00"%"';

const SHORT_EXCESS_FIXED_COLS = new Set([11, 14, 20, 26]);
const PERCENT_FIXED_COLS_1DP = new Set([19, 25]);

// Filter dropdown width (original was w-72 = 18rem = 288px)
const FILTER_DROPDOWN_WIDTH = 288;

const Reconciliation = () => {
    const axiosPrivate = useAxiosPrivate();

    const [activeFilters, setActiveFilters] = useState({});
    const [reportData, setReportData] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [openFilterCol, setOpenFilterCol] = useState(null);
    const [dropdownOptions, setDropdownOptions] = useState([]);
    const [tempSelected, setTempSelected] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    // Portal dropdown refs & state
    const filterButtonRefs = useRef({});
    const filterDropdownRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState(null);

    const [monthFilter, setMonthFilter] = useState("ALL");
    const [monthFilterOpen, setMonthFilterOpen] = useState(false);

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
    const cellClass = `px-3 py-2.5 text-sm text-slate-800 border-b border-[#f7d494] text-center align-middle ${wrapClass}`;

    const cellStyle = {
        borderRight: "1px solid #f7d494",
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
        borderRight: hasRightBorder ? "2px solid #f7d494" : "1px solid #f7d494",
        zIndex: 30,
    });

    const YARN_TABLE_HEADERS = [
        "", "DATE OF RECONCILIATION", "BUYER NAME", "JOB NO", "COLOR", "COMPOSITION", "ORDER QTY", "MANUFACTURING UNIT",
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
        "PLANNED LEFTOVER", "PHYSICAL FOUND LEFTOVER", "% PHYSICAL FOUND", "LEFT OVER SHORT/EX", "REMARKS"
    ];

    const FILTERABLE_COLS = {
        1: { key: "dateOfReconciliation", label: "DATE OF RECONCILIATION" },
        3: { key: "jobNo", label: "JOB NO" },
        4: { key: "color", label: "COLOR" },
        5: { key: "composition", label: "COMPOSITION" },
        7: { key: "manufacturingUnite", label: "MANUFACTURING UNIT" },
    };

    const JOB_LEVEL_FILTER_KEYS = new Set(["dateOfReconciliation"]);

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
        { key: "remarks", type: "input" },
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

    const getJobReconciliationDate = (job) =>
        job?.dateOfReconciliation ?? job?.rows?.[0]?.reconciliation?.dateOfReconciliation ?? null;

    const getEffectiveDateRaw = useCallback((jobNo, job) => {
        const localDate = lsGet(LS_KEYS.date(jobNo));
        if (localDate !== null) return localDate;
        return getJobReconciliationDate(job);
    }, []);

    const getEffectiveManuUnit = useCallback((jobNo, com, fallbackIndex) => {
        const rowKey = getRowKey(com, fallbackIndex);
        const localUnit = lsGet(LS_KEYS.manuUnit(jobNo, rowKey));
        if (localUnit !== null) return localUnit;
        const saved = com?.reconciliation?.manufacturingUnite;
        return saved != null && saved !== "NULL" ? String(saved) : "";
    }, []);

    const getEffectiveRemarks = useCallback((jobNo, com, fallbackIndex) => {
        const rowKey = getRowKey(com, fallbackIndex);
        const localRemarks = lsGet(LS_KEYS.remarks(jobNo, rowKey));
        if (localRemarks !== null) return localRemarks;
        const saved = com?.reconciliation?.remarks;
        return saved != null && saved !== "NULL" ? String(saved) : "";
    }, []);

    const getDateValueForFilter = useCallback((job) => {
        const raw = getEffectiveDateRaw(job.jobNo, job);
        const formatted = formatDateDisplay(raw);
        return formatted === "-" ? "" : formatted;
    }, [getEffectiveDateRaw]);

    const availableMonths = useMemo(() => {
        const set = new Set();
        reportData.forEach((job) => {
            const key = monthKeyFromDate(getEffectiveDateRaw(job.jobNo, job));
            if (key) set.add(key);
        });
        return Array.from(set).sort().reverse();
    }, [reportData, getEffectiveDateRaw]);

    const processedReportData = useMemo(() => {
        const filterKeys = Object.keys(activeFilters);
        const hasColumnFilters = filterKeys.length > 0;
        const hasMonthFilter = monthFilter !== "ALL";

        if (!hasColumnFilters && !hasMonthFilter) return reportData;

        return reportData.reduce((acc, job) => {
            if (hasMonthFilter) {
                const key = monthKeyFromDate(getEffectiveDateRaw(job.jobNo, job));
                if (key !== monthFilter) return acc;
            }

            let jobLevelMatch = true;
            for (const key of filterKeys) {
                if (!JOB_LEVEL_FILTER_KEYS.has(key)) continue;
                const values = activeFilters[key];
                if (!values || values.length === 0) continue;

                let rawVal = "";
                if (key === "dateOfReconciliation") rawVal = getDateValueForFilter(job);

                const normalizedVal = normalizeFilterVal(rawVal);
                const hasMatch = values.some(v => normalizeFilterVal(v) === normalizedVal);
                if (!hasMatch) { jobLevelMatch = false; break; }
            }
            if (!jobLevelMatch) return acc;

            const rowLevelKeys = filterKeys.filter(k => !JOB_LEVEL_FILTER_KEYS.has(k));
            if (rowLevelKeys.length === 0) {
                acc.push(job);
                return acc;
            }

            const comps = job?.rows || [];
            const compBreakDown = job?.compBreakdown || [];

            const filteredComps = [];
            const filteredCompBreakDown = [];

            comps.forEach((com, idx) => {
                let matchesAllFilters = true;

                for (const key of rowLevelKeys) {
                    const values = activeFilters[key];
                    if (!values || values.length === 0) continue;

                    let val = "";
                    if (key === "jobNo") val = String(job.jobNo ?? "");
                    else if (key === "color") val = String(com?.color ?? "");
                    else if (key === "composition") val = String(com?.composition ?? "");
                    else if (key === "manufacturingUnite") val = getEffectiveManuUnit(job.jobNo, com, idx);

                    const normalizedVal = normalizeFilterVal(val);
                    const hasMatch = values.some(v => normalizeFilterVal(v) === normalizedVal);

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
    }, [reportData, activeFilters, monthFilter, getEffectiveDateRaw, getEffectiveManuUnit, getDateValueForFilter]);

    const openFilterDropdown = async (colIndex) => {
        if (openFilterCol === colIndex) { setOpenFilterCol(null); return; }
        setOpenFilterCol(colIndex);
        setSearchTerm("");
        const colKey = FILTERABLE_COLS[colIndex]?.key;
        if (!colKey) return;

        if (colKey === "dateOfReconciliation") {
            const set = new Set();
            reportData.forEach(job => {
                set.add(getDateValueForFilter(job));
            });
            const options = Array.from(set).sort((a, b) => {
                if (a === "" && b !== "") return 1;
                if (b === "" && a !== "") return -1;
                return String(a).localeCompare(String(b));
            });
            setDropdownOptions(options);
            const currentActive = activeFilters[colKey] || [];
            setTempSelected(new Set(currentActive.length > 0 ? currentActive : options));
            return;
        }

        if (colKey === "manufacturingUnite") {
            const set = new Set();
            reportData.forEach(job => {
                const comps = job?.rows || [];
                const subRowCount = getSubRowCount(job);
                for (let i = 0; i < subRowCount; i++) {
                    set.add(getEffectiveManuUnit(job.jobNo, comps[i], i));
                }
            });
            const options = Array.from(set).sort((a, b) => {
                if (a === "" && b !== "") return 1;
                if (b === "" && a !== "") return -1;
                return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
            });
            setDropdownOptions(options);
            const currentActive = activeFilters[colKey] || [];
            setTempSelected(new Set(currentActive.length > 0 ? currentActive : options));
            return;
        }

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

    // ===== PORTAL DROPDOWN POSITIONING =====
    const updateFilterDropdownPos = useCallback(() => {
        if (openFilterCol === null) return;
        const btn = filterButtonRefs.current[openFilterCol];
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const width = FILTER_DROPDOWN_WIDTH;

        let left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

        const estimatedHeight = 420;
        let top = rect.bottom + 8;
        if (top + estimatedHeight > window.innerHeight - 8) {
            const aboveTop = rect.top - estimatedHeight - 8;
            top = aboveTop > 8 ? aboveTop : Math.max(8, window.innerHeight - estimatedHeight - 8);
        }
        setDropdownPos({ top, left, width });
    }, [openFilterCol]);

    useLayoutEffect(() => {
        if (openFilterCol === null) { setDropdownPos(null); return; }
        updateFilterDropdownPos();
        const handler = () => updateFilterDropdownPos();
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [openFilterCol, updateFilterDropdownPos]);

    useEffect(() => {
        if (openFilterCol === null) return;
        const handleClick = (e) => {
            if (filterDropdownRef.current && filterDropdownRef.current.contains(e.target)) return;
            const btn = filterButtonRefs.current[openFilterCol];
            if (btn && btn.contains(e.target)) return;
            setOpenFilterCol(null);
        };
        const handleKey = (e) => { if (e.key === 'Escape') setOpenFilterCol(null); };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [openFilterCol]);
    // ===== END PORTAL DROPDOWN POSITIONING =====

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
        const key = selectedCell.colIndex <= 3
            ? `col${selectedCell.colIndex}-job${flatRows[selectedCell.rowIndex]?.jobNo}`
            : `row${selectedCell.rowIndex}-col${selectedCell.colIndex}`;
        const el = cellRefs.current.get(key);
        if (el && el.scrollIntoView) {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [selectedCell, flatRows]);

    const cellRefKey = (rowIndex, colIndex) =>
        colIndex <= 3 ? `col${colIndex}-job${flatRows[rowIndex]?.jobNo}` : `row${rowIndex}-col${colIndex}`;

    const registerCellRef = (rowIndex, colIndex) => (el) => {
        const key = cellRefKey(rowIndex, colIndex);
        if (el) cellRefs.current.set(key, el);
        else cellRefs.current.delete(key);
    };

    const isCellSelected = (rowIndex, colIndex) => {
        if (!selectedCell) return false;
        if (colIndex <= 3) {
            return selectedCell.colIndex === colIndex && flatRows[selectedCell.rowIndex]?.jobNo === flatRows[rowIndex]?.jobNo;
        }
        return selectedCell.rowIndex === rowIndex && selectedCell.colIndex === colIndex;
    };

    const selectedCellClass = (rowIndex, colIndex) =>
        isCellSelected(rowIndex, colIndex) ? "outline outline-2 outline-offset-[-2px] outline-[#f7d494]" : "";

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
        const isDateInput = tag === "INPUT" && target.type === "date";
        const isTextarea = tag === "TEXTAREA";

        if (isNumberInput || isDateInput) return;

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

    const handleInputChange = (jobNo, subRowIdx, fieldKey, value, rowKey) => {
        setEditValues(prev => ({ ...prev, [`${jobNo}-${subRowIdx}-${fieldKey}`]: value }));
        if (fieldKey === "remarks") {
            lsSet(LS_KEYS.remarks(jobNo, rowKey), value);
        } else if (fieldKey === "manufacturingUnite") {
            lsSet(LS_KEYS.manuUnit(jobNo, rowKey), value);
        }
    };

    const handleJobFieldChange = (jobNo, fieldKey, value) => {
        setEditValues(prev => ({ ...prev, [`${jobNo}-${fieldKey}`]: value }));
        if (fieldKey === "dateOfReconciliation") {
            lsSet(LS_KEYS.date(jobNo), value);
        }
    };

    const handleStartEdit = (jobNo, job) => {
        if (editingJobNo !== null) return;
        const comps = job?.rows || [];
        const subRowCount = getSubRowCount(job);
        const initialValues = {};

        const localDate = lsGet(LS_KEYS.date(jobNo));
        const existingDate = (localDate !== null)
            ? localDate
            : getJobReconciliationDate(job);
        initialValues[`${jobNo}-dateOfReconciliation`] = toDateInputValue(existingDate);

        for (let i = 0; i < subRowCount; i++) {
            const com = comps[i];
            const reconciliation = com?.reconciliation || {};
            const rowKey = getRowKey(com, i);

            TRAILING_FIELDS.forEach(field => {
                if (field.type !== "FORMULA") {
                    if (field.key === "remarks") {
                        const localRemarks = lsGet(LS_KEYS.remarks(jobNo, rowKey));
                        const serverRemarks = reconciliation[field.key];
                        if (localRemarks !== null) {
                            initialValues[`${jobNo}-${i}-${field.key}`] = localRemarks;
                        } else {
                            initialValues[`${jobNo}-${i}-${field.key}`] =
                                serverRemarks != null && serverRemarks !== "NULL" ? String(serverRemarks) : "";
                        }
                    } else {
                        const savedVal = reconciliation[field.key];
                        initialValues[`${jobNo}-${i}-${field.key}`] =
                            savedVal != null && savedVal !== "NULL" ? String(savedVal) : "";
                    }
                }
            });
            STICKY_EDITABLE_FIELDS.forEach(field => {
                const localUnit = lsGet(LS_KEYS.manuUnit(jobNo, rowKey));
                const savedVal = reconciliation[field.key];
                if (localUnit !== null) {
                    initialValues[`${jobNo}-${i}-${field.key}`] = localUnit;
                } else {
                    initialValues[`${jobNo}-${i}-${field.key}`] =
                        savedVal != null && savedVal !== "NULL" ? String(savedVal) : "";
                }
            });
        }
        setEditValues(prev => ({ ...prev, ...initialValues }));
        setEditingJobNo(jobNo);
    };

    const handleCancelEdit = (jobNo, job) => {
        try {
            lsSet(LS_KEYS.date(jobNo), null);
            const comps = job?.rows || [];
            const subRowCount = getSubRowCount(job);
            for (let i = 0; i < subRowCount; i++) {
                const rowKey = getRowKey(comps[i], i);
                lsSet(LS_KEYS.remarks(jobNo, rowKey), null);
                lsSet(LS_KEYS.manuUnit(jobNo, rowKey), null);
            }
        } catch { /* ignore */ }
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
            const rowKey = getRowKey(com, i);

            TRAILING_FIELDS.forEach(field => {
                if (field.type !== "FORMULA") {
                    if (field.key === "remarks") {
                        const raw = editValues[`${jobNo}-${i}-${field.key}`];
                        let finalValue = "";
                        if (raw !== undefined && raw !== null) {
                            finalValue = String(raw);
                        } else {
                            const localRemarks = lsGet(LS_KEYS.remarks(jobNo, rowKey));
                            if (localRemarks !== null) {
                                finalValue = localRemarks;
                            } else {
                                const existing = com.reconciliation?.[field.key];
                                if (existing != null && existing !== "NULL") finalValue = String(existing);
                            }
                        }
                        rowPayload[field.key] = finalValue;
                    } else {
                        const raw = editValues[`${jobNo}-${i}-${field.key}`];
                        let num;
                        if (raw === undefined) {
                            const saved = com.reconciliation?.[field.key];
                            num = saved != null ? Math.round(Number(saved)) : 0;
                        } else {
                            num = raw === "" ? 0 : Math.round(Number(raw));
                        }
                        rowPayload[field.key] = isNaN(num) ? 0 : num;
                    }
                } else if (FORMULA_KEYS_TO_PERSIST.includes(field.key)) {
                    const calculated = calculateFormula(jobNo, i, field.key, job);
                    rowPayload[field.key] = Number.isFinite(calculated) ? Math.round(calculated) : 0;
                }
            });

            STICKY_EDITABLE_FIELDS.forEach(field => {
                const raw = editValues[`${jobNo}-${i}-${field.key}`];
                if (raw !== undefined && raw !== null) {
                    rowPayload[field.key] = String(raw).trim() === "" ? "" : String(raw);
                } else {
                    const localUnit = lsGet(LS_KEYS.manuUnit(jobNo, rowKey));
                    if (localUnit !== null) {
                        rowPayload[field.key] = localUnit;
                    } else {
                        const saved = com?.reconciliation?.[field.key];
                        rowPayload[field.key] = saved != null && saved !== "NULL" ? String(saved) : "";
                    }
                }
            });

            rows.push(rowPayload);
        }

        const rawDate = editValues[`${jobNo}-dateOfReconciliation`];
        let dateOfReconciliation;
        if (rawDate !== undefined && rawDate !== null) {
            dateOfReconciliation = rawDate;
        } else {
            const localDate = lsGet(LS_KEYS.date(jobNo));
            if (localDate !== null) {
                dateOfReconciliation = localDate;
            } else {
                dateOfReconciliation = getJobReconciliationDate(job) || "";
            }
        }

        return { jobNo: job?.jobNo ?? jobNo, dateOfReconciliation, rows };
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
            setEditValues(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => { if (k.startsWith(`${jobNo}-`)) delete next[k]; });
                return next;
            });
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
            setEditValues({});
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
    const hasAnyFilters = activeFilterEntries.length > 0 || monthFilter !== "ALL";

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
                    if (field.key === "remarks") return;
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

    const exportExcel = async () => {
        if (isExporting) return;
        if (processedReportData.length === 0) {
            alert("No data to export.");
            return;
        }
        setIsExporting(true);
        try {
            const ExcelJS = await loadExcelJS();

            const wb = new ExcelJS.Workbook();
            wb.creator = "Reconciliation Report";
            wb.created = new Date();

            const ws = wb.addWorksheet("Reconciliation", {
                views: [{ state: "frozen", xSplit: 4, ySplit: 1, activeCell: "E2" }],
                pageSetup: {
                    orientation: "landscape",
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0,
                    paperSize: 9,
                    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
                }
            });

            const COL_WIDTHS = [5, 16, 16, 18, 14, 20, 12, 16];
            for (let i = 8; i < TOTAL_COLS; i++) COL_WIDTHS.push(13);
            for (let i = 0; i < TOTAL_COLS; i++) {
                ws.getColumn(i + 1).width = COL_WIDTHS[i];
            }

            const headerRow = ws.getRow(1);
            headerRow.height = 48;
            for (let c = 0; c < TOTAL_COLS; c++) {
                const cell = headerRow.getCell(c + 1);
                cell.value = c === 0 ? "SL" : (YARN_TABLE_HEADERS[c] ?? "");
                cell.font = { bold: true, size: 9, color: { argb: "FF0F172A" } };
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
                cell.border = XL_BORDER_HEADER;
            }
            headerRow.commit();

            processedReportData.forEach((job) => {
                const jobNo = job.jobNo;
                const comps = job?.rows || [];
                const compBreakDown = job.compBreakdown || [];
                const subRowCount = getSubRowCount(job);
                const isEditingThisJob = editingJobNo === jobNo;
                const jobStartRow = ws.rowCount + 1;

                for (let i = 0; i < subRowCount; i++) {
                    const com = comps[i];
                    const comp = compBreakDown[i];
                    const isFirstRow = i === 0;

                    const finishQty = Number(com?.finishRequiredQty) || 0;
                    const processLoss = Number(job.processLoss) || 0;
                    const yarnRequiredQty = finishQty * (1 + processLoss / 100);
                    const knitYarnDelivery = Number(comp?.knittingOrder_Yarn_Delivery) || 0;
                    const knitGreyReceived = Number(comp?.knittingOrder_Grey_Fabric_Received) || 0;
                    const knitYarnReturn = Number(comp?.knittingOrder_Yarn_Return) || 0;
                    const yarnShortExcessReq = knitYarnDelivery - yarnRequiredQty;
                    const knitShortExcess = knitYarnReturn + knitGreyReceived - knitYarnDelivery;
                    const dyeFinishReceived = Number(comp?.dyeingOrder_Finish_Received) || 0;
                    const dyeGreyReceived = Number(comp?.dyeingOrder_Grey_Received) || 0;
                    const dyeProcessLoss = dyeGreyReceived > 0 ? ((dyeGreyReceived - dyeFinishReceived) / dyeGreyReceived) * 100 : 0;
                    const dyeGreyDelivery = Number(comp?.dyeingOrder_Grey_Delivery) || 0;
                    const dyeShortExcess = dyeGreyReceived - dyeGreyDelivery;
                    const aopFinishReceived = Number(comp?.aopOrder_AOP_Finish_Fabric_Rcvd) || 0;
                    const aopGreyReceived = Number(comp?.aopOrder_Received_From_Aop) || 0;
                    const aopProcessLoss = aopGreyReceived > 0 ? ((aopGreyReceived - aopFinishReceived) / aopGreyReceived) * 100 : 0;
                    const aopSent = Number(comp?.aopOrder_Sent_for_AOP) || 0;
                    const aopReceived = Number(comp?.aopOrder_Return_From_Aop) || 0;
                    const aopShortExcess = aopSent - aopReceived;

                    const manuUnitDisplay = getEffectiveManuUnit(jobNo, com, i);

                    const rowValues = new Array(TOTAL_COLS).fill("");

                    rowValues[0] = "";
                    rowValues[1] = isFirstRow ? formatDateDisplay(getEffectiveDateRaw(jobNo, job)) : "";
                    rowValues[2] = isFirstRow ? (com?.buyerName || job?.buyerName || "") : "";
                    rowValues[3] = isFirstRow ? (jobNo ?? "") : "";
                    rowValues[4] = com?.color ?? "";
                    rowValues[5] = com?.composition ?? "";
                    rowValues[6] = com?.orderQty != null ? Number(com.orderQty) : "";
                    rowValues[7] = manuUnitDisplay;
                    rowValues[8] = com?.finishRequiredQty != null ? Number(com.finishRequiredQty) : "";
                    rowValues[9] = com ? yarnRequiredQty : "";
                    rowValues[10] = comp?.knittingOrder_Yarn_Delivery != null && !isNaN(Number(comp.knittingOrder_Yarn_Delivery)) ? Number(comp.knittingOrder_Yarn_Delivery) : "";
                    rowValues[11] = comp ? yarnShortExcessReq : "";
                    rowValues[12] = comp?.knittingOrder_Yarn_Return != null && !isNaN(Number(comp.knittingOrder_Yarn_Return)) ? Number(comp.knittingOrder_Yarn_Return) : "";
                    rowValues[13] = comp?.knittingOrder_Grey_Fabric_Received != null && !isNaN(Number(comp.knittingOrder_Grey_Fabric_Received)) ? Number(comp.knittingOrder_Grey_Fabric_Received) : "";
                    rowValues[14] = comp ? knitShortExcess : "";
                    rowValues[15] = comp?.dyeingOrder_Grey_Delivery != null && !isNaN(Number(comp.dyeingOrder_Grey_Delivery)) ? Number(comp.dyeingOrder_Grey_Delivery) : "";
                    rowValues[16] = comp?.dyeingOrder_Grey_Return != null && !isNaN(Number(comp.dyeingOrder_Grey_Return)) ? Number(comp.dyeingOrder_Grey_Return) : "";
                    rowValues[17] = comp?.dyeingOrder_Grey_Received != null && !isNaN(Number(comp.dyeingOrder_Grey_Received)) ? Number(comp.dyeingOrder_Grey_Received) : "";
                    rowValues[18] = comp?.dyeingOrder_Finish_Received != null && !isNaN(Number(comp.dyeingOrder_Finish_Received)) ? Number(comp.dyeingOrder_Finish_Received) : "";
                    rowValues[19] = comp ? dyeProcessLoss : "";
                    rowValues[20] = comp ? dyeShortExcess : "";
                    rowValues[21] = comp?.aopOrder_Sent_for_AOP != null && !isNaN(Number(comp.aopOrder_Sent_for_AOP)) ? Number(comp.aopOrder_Sent_for_AOP) : "";
                    rowValues[22] = comp?.aopOrder_Return_From_Aop != null && !isNaN(Number(comp.aopOrder_Return_From_Aop)) ? Number(comp.aopOrder_Return_From_Aop) : "";
                    rowValues[23] = comp?.aopOrder_Received_From_Aop != null && !isNaN(Number(comp.aopOrder_Received_From_Aop)) ? Number(comp.aopOrder_Received_From_Aop) : "";
                    rowValues[24] = comp?.aopOrder_AOP_Finish_Fabric_Rcvd != null && !isNaN(Number(comp.aopOrder_AOP_Finish_Fabric_Rcvd)) ? Number(comp.aopOrder_AOP_Finish_Fabric_Rcvd) : "";
                    rowValues[25] = comp ? aopProcessLoss : "";
                    rowValues[26] = comp ? aopShortExcess : "";

                    const rowKey = getRowKey(com, i);

                    TRAILING_FIELDS.forEach((field, idx) => {
                        const colIdx = FIXED_COLUMN_COUNT + idx;
                        const isFormula = field.type === "FORMULA";

                        if (field.key === "remarks") {
                            let valStr = null;
                            if (isEditingThisJob) {
                                const ev = editValues[`${jobNo}-${i}-${field.key}`];
                                if (ev !== undefined && ev !== null) valStr = ev;
                            }
                            if (valStr === null || valStr === undefined) {
                                const localRemarks = lsGet(LS_KEYS.remarks(jobNo, rowKey));
                                if (localRemarks !== null) {
                                    valStr = localRemarks;
                                } else {
                                    const saved = com?.reconciliation?.[field.key];
                                    if (saved != null && saved !== "NULL" && saved !== "") valStr = saved;
                                }
                            }
                            rowValues[colIdx] = valStr || "";
                        } else if (isFormula) {
                            const val = calculateFormula(jobNo, i, field.key, job);
                            rowValues[colIdx] = Number.isFinite(val) ? val : 0;
                        } else {
                            let valStr = null;
                            if (isEditingThisJob) {
                                const ev = editValues[`${jobNo}-${i}-${field.key}`];
                                if (ev !== undefined && ev !== null) valStr = ev;
                            }
                            if (valStr === null || valStr === undefined) {
                                const saved = com?.reconciliation?.[field.key];
                                if (saved != null && saved !== "NULL" && saved !== "") valStr = saved;
                            }
                            if (valStr === null || valStr === undefined || valStr === "") {
                                rowValues[colIdx] = "";
                            } else {
                                const n = Number(valStr);
                                rowValues[colIdx] = isNaN(n) ? "" : n;
                            }
                        }
                    });

                    const row = ws.getRow(ws.rowCount + 1);
                    row.height = 22;
                    for (let c = 0; c < TOTAL_COLS; c++) {
                        const cell = row.getCell(c + 1);
                        cell.value = rowValues[c];
                        cell.border = XL_BORDER;
                        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
                        cell.font = { size: 10, color: { argb: "FF1E293B" } };

                        if (isEditingThisJob) {
                            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
                        }

                        if (PERCENT_FIXED_COLS_1DP.has(c)) {
                            cell.numFmt = NUMFMT_PCT_1;
                        } else if (SHORT_EXCESS_FIXED_COLS.has(c)) {
                            cell.numFmt = NUMFMT_SHORT_EXCESS;
                        } else if (typeof rowValues[c] === "number") {
                            cell.numFmt = NUMFMT_NUMBER;
                        }
                    }

                    TRAILING_FIELDS.forEach((field, idx) => {
                        const colIdx = FIXED_COLUMN_COUNT + idx;
                        if (field.key === "remarks") {
                            const cell = row.getCell(colIdx + 1);
                            cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
                            return;
                        }
                        const cell = row.getCell(colIdx + 1);
                        const fk = field.key.toLowerCase();
                        const isPercent = fk.includes("percent");
                        const isShortExcess = fk.includes("short") || fk.includes("excess");

                        if (isPercent) {
                            cell.numFmt = NUMFMT_PCT_2;
                        } else if (isShortExcess && field.type === "FORMULA") {
                            cell.numFmt = NUMFMT_SHORT_EXCESS;
                        } else if (typeof rowValues[colIdx] === "number") {
                            cell.numFmt = NUMFMT_NUMBER;
                        }
                    });
                    row.commit();
                }

                const jobEndRow = ws.rowCount;

                if (jobEndRow > jobStartRow) {
                    ws.mergeCells(jobStartRow, 2, jobEndRow, 2);
                    ws.mergeCells(jobStartRow, 4, jobEndRow, 4);
                }

                const dateCell = ws.getCell(jobStartRow, 2);
                dateCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                dateCell.font = { size: 10, color: { argb: "FF1E293B" } };

                const jobCell = ws.getCell(jobStartRow, 4);
                jobCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                jobCell.font = { bold: true, size: 11, color: { argb: "FF0F172A" } };
            });

            const subtotalValues = new Array(TOTAL_COLS).fill("");
            subtotalValues[3] = "SUB-TOTAL";
            subtotalValues[6] = footerTotals.orderQty;
            subtotalValues[8] = footerTotals.finishRequiredQty;
            subtotalValues[9] = footerTotals.yarnRequiredQty;
            subtotalValues[10] = footerTotals.knitYarnDelivery;
            subtotalValues[11] = footerTotals.yarnShortExcessReq;
            subtotalValues[12] = footerTotals.knitYarnReturn;
            subtotalValues[13] = footerTotals.knitGreyReceived;
            subtotalValues[14] = footerTotals.knitShortExcess;
            subtotalValues[15] = footerTotals.dyeGreyDelivery;
            subtotalValues[16] = footerTotals.dyeGreyReturn;
            subtotalValues[17] = footerTotals.dyeGreyReceived;
            subtotalValues[18] = footerTotals.dyeFinishReceived;
            subtotalValues[19] = "";
            subtotalValues[20] = footerTotals.dyeShortExcess;
            subtotalValues[21] = footerTotals.aopSent;
            subtotalValues[22] = footerTotals.aopReceived;
            subtotalValues[23] = footerTotals.aopGreyReceived;
            subtotalValues[24] = footerTotals.aopFinishReceived;
            subtotalValues[25] = "";
            subtotalValues[26] = footerTotals.aopShortExcess;

            TRAILING_FIELDS.forEach((field, idx) => {
                const colIdx = FIXED_COLUMN_COUNT + idx;
                if (field.key === "remarks") {
                    subtotalValues[colIdx] = "";
                } else {
                    subtotalValues[colIdx] = footerTotals[field.key] ?? "";
                }
            });

            const subtotalRow = ws.getRow(ws.rowCount + 1);
            subtotalRow.height = 26;
            for (let c = 0; c < TOTAL_COLS; c++) {
                const cell = subtotalRow.getCell(c + 1);
                cell.value = subtotalValues[c];
                cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
                cell.border = XL_BORDER_SUBTOTAL;
                cell.alignment = { horizontal: "center", vertical: "middle" };

                if (PERCENT_FIXED_COLS_1DP.has(c)) {
                    cell.numFmt = NUMFMT_PCT_1;
                } else if (SHORT_EXCESS_FIXED_COLS.has(c)) {
                    cell.numFmt = NUMFMT_SHORT_EXCESS;
                } else if (typeof subtotalValues[c] === "number") {
                    cell.numFmt = NUMFMT_NUMBER;
                }
            }
            TRAILING_FIELDS.forEach((field, idx) => {
                const colIdx = FIXED_COLUMN_COUNT + idx;
                if (field.key === "remarks") {
                    const cell = subtotalRow.getCell(colIdx + 1);
                    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
                    return;
                }
                const cell = subtotalRow.getCell(colIdx + 1);
                const fk = field.key.toLowerCase();
                const isPercent = fk.includes("percent");
                const isShortExcess = fk.includes("short") || fk.includes("excess");
                if (isPercent) {
                    cell.numFmt = NUMFMT_PCT_2;
                } else if (isShortExcess && field.type === "FORMULA") {
                    cell.numFmt = NUMFMT_SHORT_EXCESS;
                } else if (typeof subtotalValues[colIdx] === "number") {
                    cell.numFmt = NUMFMT_NUMBER;
                }
            });
            subtotalRow.commit();

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `reconciliation-${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Excel export failed:", err);
            alert("Excel export failed. Please check your internet connection (ExcelJS loads from CDN on first export) and try again.");
        } finally {
            setIsExporting(false);
        }
    };

    // ===== PORTALED FILTER DROPDOWN =====
    const renderFilterDropdown = () => {
        if (openFilterCol === null || !dropdownPos) return null;
        const colMeta = FILTERABLE_COLS[openFilterCol];
        if (!colMeta) return null;

        const availableHeight = Math.max(260, Math.min(430, window.innerHeight - dropdownPos.top - 16));

        return createPortal(
            <div
                ref={filterDropdownRef}
                className="bg-white rounded-md border-2 border-[#f7d494] shadow-2xl overflow-hidden text-left normal-case font-sans text-sm flex flex-col"
                style={{
                    position: 'fixed',
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 99999,
                    maxHeight: availableHeight,
                }}
            >
                <div className="p-2 border-b border-[#f7d494]">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full text-sm border border-[#f7d494] rounded pl-8 pr-3 py-1.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="px-3 py-2 border-b border-[#f7d494] bg-gray-50">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded border-[#f7d494] text-blue-600 focus:ring-blue-600 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 font-medium">(Select All)</span>
                    </label>
                </div>
                <div className="max-h-64 overflow-y-auto py-1 flex-1">
                    {visibleOptions.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-gray-500 text-center italic">No items match your search</div>
                    ) : (
                        visibleOptions.map((val, idx) => (
                            <label key={`${val}-${idx}`} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-blue-50 select-none">
                                <input
                                    type="checkbox"
                                    checked={tempSelected.has(val)}
                                    onChange={() => toggleValue(val)}
                                    className="h-4 w-4 rounded border-[#f7d494] text-blue-600 focus:ring-blue-600 cursor-pointer"
                                />
                                <span className="text-sm text-gray-800 truncate">
                                    {normalizeFilterVal(val) === "" ? "(Blanks)" : val}
                                </span>
                            </label>
                        ))
                    )}
                </div>
                <div className="flex items-center justify-end gap-2 p-2 border-t border-[#f7d494] bg-gray-50">
                    <button
                        type="button"
                        onClick={() => setOpenFilterCol(null)}
                        className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-[#f7d494] rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 transition-colors"
                    >
                       Clear
                    </button>
                    <button
                        type="button"
                        onClick={applyFilter}
                        className="px-4 py-1.5 text-sm font-bold text-white bg-blue-700 border border-[#f7d494] rounded hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 transition-colors"
                    >
                        Apply
                    </button>
                </div>
            </div>,
            document.body
        );
    };
    // ===== END PORTALED FILTER DROPDOWN =====

    return (
        <div className="min-h-screen w-full p-1 md:p-4 font-sans bg-stone-50">
            <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={fetchFilteredData} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white border border-[#f7d494] rounded-lg shadow-sm text-sm font-medium hover:bg-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                    <Link to={"/dashboard/balance-sheet"}>
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white border border-[#f7d494] rounded-lg shadow-sm text-sm font-medium hover:bg-blue-950 transition-colors disabled:opacity-50">
                            Balance Sheet
                        </button>
                    </Link>

                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); exportExcel(); }}
                        disabled={isExporting || processedReportData.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white border border-[#f7d494] rounded-lg shadow-sm text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? (
                            <>
                                <RefreshCcw size={16} className="animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download size={12} />
                                Export Excel
                            </>
                        )}
                    </button>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setMonthFilterOpen(o => !o)}
                            className={`inline-flex items-center gap-2 px-4 py-2 border border-[#f7d494] rounded-lg shadow-sm text-sm font-medium transition-colors ${monthFilter !== "ALL" ? "bg-blue-50 text-blue-900" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                        >
                            <ListFilter size={16} />
                            {monthFilter === "ALL" ? "All Months" : formatMonthLabel(monthFilter)}
                        </button>
                        {monthFilterOpen && (
                            <div className="absolute top-full mt-2 left-0 w-56 bg-white rounded-lg shadow-xl ring-1 ring-black/20 z-[100] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                <div className="max-h-64 overflow-y-auto py-1">
                                    <button
                                        type="button"
                                        onClick={() => { setMonthFilter("ALL"); setMonthFilterOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${monthFilter === "ALL" ? "bg-blue-50 text-blue-900 font-semibold" : "text-slate-700"}`}
                                    >
                                        All Months
                                    </button>
                                    {availableMonths.length === 0 && (
                                        <div className="px-4 py-3 text-xs text-slate-400 text-center">No reconciliation dates yet</div>
                                    )}
                                    {availableMonths.map(key => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => { setMonthFilter(key); setMonthFilterOpen(false); }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${monthFilter === key ? "bg-blue-50 text-blue-900 font-semibold" : "text-slate-700"}`}
                                        >
                                            {formatMonthLabel(key)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedJobs.size > 0 && (
                        <button onClick={handleGlobalSubmit} disabled={savingJob} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white border border-[#f7d494] rounded-lg shadow-sm text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <CloudCog size={16} />
                            Submit Reconciliation ({selectedJobs.size})
                        </button>
                    )}
                </div>
            </div>

            {hasAnyFilters && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider mr-2">Active Filters:</span>
                    {monthFilter !== "ALL" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-medium border border-[#f7d494]">
                            MONTH: <span className="font-bold">{formatMonthLabel(monthFilter)}</span>
                            <button onClick={() => setMonthFilter("ALL")} className="ml-1 hover:text-blue-950 transition-colors">
                                <X size={14} />
                            </button>
                        </span>
                    )}
                    {activeFilterEntries.map(([key, values]) => {
                        const colDef = Object.values(FILTERABLE_COLS).find(c => c.key === key);
                        return (
                            <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-medium border border-[#f7d494]">
                                {colDef?.label}: <span className="font-bold">{values.length}</span>
                                <button onClick={() => setActiveFilters(prev => { const next = { ...prev }; delete next[key]; return next; })} className="ml-1 hover:text-blue-950 transition-colors">
                                    <X size={14} />
                                </button>
                            </span>
                        );
                    })}
                    <button onClick={() => { setActiveFilters({}); setMonthFilter("ALL"); }} className="text-xs text-slate-500 hover:text-rose-600 underline ml-2 transition-colors">
                        Clear all
                    </button>
                </div>
            )}

            <div className="w-full bg-white rounded-xl border-2 border-[#f7d494] shadow-sm overflow-hidden">
                <div
                    className="w-full overflow-auto max-h-[calc(100vh-190px)] focus:outline-none"
                    ref={wrapperRef}
                    tabIndex={0}
                    onKeyDown={handleTableKeyDown}
                >
                    <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
                        {/* FIX: thead z-index raised from z-20 to z-50 so sticky header cells sit above the z-30 sticky body cells */}
                        <thead className="sticky top-0 z-50">
                            <tr>
                                {YARN_TABLE_HEADERS.map((header, I) => {
                                    const isFilterable = FILTERABLE_COLS[I];
                                    const hasActiveFilter = activeFilters[FILTERABLE_COLS[I]?.key]?.length > 0;
                                    const isSticky = I <= LAST_STICKY_INDEX;
                                    const isLastSticky = I === LAST_STICKY_INDEX;
                                    const hasRightBorder = I === 3 || isLastSticky;
                                    const showFilterIcon = I !== 0;

                                    return (
                                        <th
                                            key={I}
                                            className={[
                                                "px-3 py-3 text-center align-middle text-xs font-bold uppercase tracking-wider text-slate-800 border-b-2 border-[#f7d494] bg-[#f5df98]",
                                                isSticky ? "sticky z-30 whitespace-normal" : wrapClass,
                                                isLastSticky ? "shadow-sm" : "",
                                            ].join(" ")}
                                            style={isSticky ? stickyCellStyle(I, "#f5df98", hasRightBorder) : { ...cellStyle, backgroundColor: "#f5df98" }}
                                        >
                                            <div className="relative flex items-center justify-center gap-1">
                                                {I === 0 ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={toggleAllSelection}
                                                        className="h-4 w-4 rounded border-[#f7d494] text-blue-900 focus:ring-blue-600"
                                                    />
                                                ) : (
                                                    <span>{header}</span>
                                                )}

                                                {isFilterable && (
                                                    <button
                                                        ref={(el) => { filterButtonRefs.current[I] = el; }}
                                                        type="button"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => openFilterDropdown(I)}
                                                        className={`p-1 rounded transition-colors hover:bg-blue-200/50 ${openFilterCol === I ? "text-blue-950" : hasActiveFilter ? "text-blue-950" : "text-blue-900"}`}
                                                    >
                                                        <Filter size={14} strokeWidth={2.5} />
                                                    </button>
                                                )}

                                                {!isFilterable && showFilterIcon && (
                                                    <Filter size={14} strokeWidth={2.5} className="text-blue-400/50" />
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr><td colSpan={YARN_TABLE_HEADERS.length} className="px-4 py-20 text-center align-middle border-b border-[#f7d494]">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <RefreshCcw size={24} className="animate-spin text-blue-600" />
                                        <span className="text-sm font-medium text-slate-500">Loading reconciliation data...</span>
                                    </div>
                                </td></tr>
                            )}

                            {!isLoading && processedReportData.length === 0 && (
                                <tr><td colSpan={YARN_TABLE_HEADERS.length} className="px-4 py-20 text-center align-middle text-sm text-slate-500 border-b border-[#f7d494]">No records match your current filters.</td></tr>
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
                                    const rowKey = getRowKey(com, i);

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
                                        "sticky z-10 px-3 py-2.5 text-sm text-slate-800 border-b border-[#f7d494] text-center align-middle",
                                        colIdx === LAST_STICKY_INDEX ? "shadow-r-md" : "",
                                    ].join(" ");

                                    const manuUnitDisplay = getEffectiveManuUnit(jobNo, com, i);
                                    const remarksDisplay = getEffectiveRemarks(jobNo, com, i);

                                    return (
                                        <tr key={`${jobNo}-${i}`} className="hover:bg-blue-50/50 transition-colors">
                                            {isFirstRow && (
                                                <td
                                                    rowSpan={subRowCount}
                                                    className={`sticky left-0 z-10 px-3 py-3 border-b border-[#f7d494] text-center align-middle ${selectedCellClass(rowFlatIndex, 0)}`}
                                                    style={stickyCellStyle(0, stickyBg, false)}
                                                    {...cellProps(rowFlatIndex, 0)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedJobs.has(jobNo)}
                                                        onChange={() => toggleJobSelection(jobNo)}
                                                        className="h-4 w-4 rounded border-[#f7d494] text-blue-600 focus:ring-blue-600 cursor-pointer"
                                                    />
                                                </td>
                                            )}

                                            {isFirstRow && (
                                                <td
                                                    rowSpan={subRowCount}
                                                    className={`sticky z-10 px-3 py-3 border-b border-[#f7d494] text-center align-middle ${selectedCellClass(rowFlatIndex, 1)}`}
                                                    style={stickyCellStyle(1, stickyBg, false)}
                                                    {...cellProps(rowFlatIndex, 1)}
                                                >
                                                    <div className="flex items-center justify-center h-full">
                                                        {isEditingThisJob ? (
                                                            <input
                                                                type="date"
                                                                className="w-full px-2 py-1.5 text-sm text-center font-semibold text-slate-900 bg-amber-100 border-2 border-[#f7d494] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                                disabled={savingJob}
                                                                value={editValues[`${jobNo}-dateOfReconciliation`] ?? ""}
                                                                onChange={(e) => handleJobFieldChange(jobNo, "dateOfReconciliation", e.target.value)}
                                                            />
                                                        ) : (
                                                            <span className="text-sm font-medium text-slate-700">
                                                                {formatDateDisplay(getEffectiveDateRaw(jobNo, job))}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            {isFirstRow && (
                                                <td
                                                    rowSpan={subRowCount}
                                                    className={`sticky z-10 px-3 py-3 border-b border-[#f7d494] text-center align-middle ${selectedCellClass(rowFlatIndex, 2)}`}
                                                    style={stickyCellStyle(2, stickyBg, false)}
                                                    {...cellProps(rowFlatIndex, 2)}
                                                >
                                                    <div className="flex items-center justify-center h-full">
                                                        <span className="text-sm font-medium text-slate-700">
                                                            {com?.buyerName || job?.buyerName || "-"}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {isFirstRow && (
                                                <td
                                                    rowSpan={subRowCount}
                                                    className={`sticky z-10 px-3 py-3 border-b border-[#f7d494] text-center align-middle ${isEditingThisJob ? "border-l-4 border-l-blue-900" : ""} ${selectedCellClass(rowFlatIndex, 3)}`}
                                                    style={stickyCellStyle(3, stickyBg, true)}
                                                    {...cellProps(rowFlatIndex, 3)}
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-3 h-full">
                                                        <span className="text-sm font-bold text-slate-900">{jobNo || "-"}</span>
                                                        {isEditingThisJob ? (
                                                            <div className="flex flex-col gap-2 w-full">
                                                                <button type="button" onClick={() => handleIndividualSave(jobNo, job)} disabled={savingJob} className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 border border-[#f7d494] rounded-md hover:bg-blue-950 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1">
                                                                    {savingJob ? <RefreshCcw size={12} className="animate-spin" /> : <><Save size={12} /> Save</>}
                                                                </button>
                                                                <button type="button" onClick={() => handleCancelEdit(jobNo, job)} disabled={savingJob} className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-[#f7d494] rounded-md hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center gap-1">
                                                                    <XCircle size={12} /> Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button type="button" onClick={() => handleStartEdit(jobNo, job)} disabled={editingJobNo !== null} className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 border border-[#f7d494] rounded-md hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                                                                <Edit3 size={12} /> Edit
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            <td className={`${stickyBodyClass(4)} ${selectedCellClass(rowFlatIndex, 4)}`} style={stickyCellStyle(4, stickyBg)} {...cellProps(rowFlatIndex, 4)}>
                                                <div className="flex items-center justify-center h-full">
                                                    <span className="px-2 py-1 text-xs font-medium text-blue-900 bg-blue-100 rounded-full">
                                                        {com?.color || "-"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`${stickyBodyClass(5)} ${selectedCellClass(rowFlatIndex, 5)}`} style={stickyCellStyle(5, stickyBg)} {...cellProps(rowFlatIndex, 5)}>
                                                <div className="flex items-center justify-center h-full">{com?.composition || "-"}</div>
                                            </td>
                                            <td className={`${stickyBodyClass(6)} ${selectedCellClass(rowFlatIndex, 6)}`} style={stickyCellStyle(6, stickyBg)} {...cellProps(rowFlatIndex, 6)}>
                                                <div className="flex items-center justify-center h-full font-mono text-sm">{com?.orderQty ?? "-"}</div>
                                            </td>

                                            <td className={`${stickyBodyClass(7)} ${selectedCellClass(rowFlatIndex, 7)}`} style={stickyCellStyle(7, stickyBg, true)} {...cellProps(rowFlatIndex, 7)}>
                                                <div className="flex items-center justify-center h-full">
                                                    {isEditingThisJob ? (
                                                        <input
                                                            className="w-full px-2 py-1.5 text-sm text-center font-semibold text-slate-900 bg-amber-100 border-2 border-[#f7d494] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                            type="text"
                                                            placeholder="Unit"
                                                            disabled={savingJob}
                                                            value={editValues[`${jobNo}-${i}-manufacturingUnite`] ?? ""}
                                                            onChange={(e) => handleInputChange(jobNo, i, "manufacturingUnite", e.target.value, rowKey)}
                                                        />
                                                    ) : (
                                                        manuUnitDisplay && manuUnitDisplay !== "" ? manuUnitDisplay : "-"
                                                    )}
                                                </div>
                                            </td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 8)}`} style={cellStyle} {...cellProps(rowFlatIndex, 8)}>{com?.finishRequiredQty != null ? Number(com.finishRequiredQty).toFixed(2) : "-"}</td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 9)}`} style={cellStyle} {...cellProps(rowFlatIndex, 9)}>{com ? yarnRequiredQty.toFixed(2) : "-"}</td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 10)}`} style={cellStyle} {...cellProps(rowFlatIndex, 10)}>
                                                {comp?.knittingOrder_Yarn_Delivery && !isNaN(Number(comp.knittingOrder_Yarn_Delivery))
                                                    ? Number(comp.knittingOrder_Yarn_Delivery).toFixed(2) : "-"}
                                            </td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 11)}`} style={cellStyle} {...cellProps(rowFlatIndex, 11)}>{comp ? <ShortExcess value={yarnShortExcessReq} /> : "-"}</td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 12)}`} style={cellStyle} {...cellProps(rowFlatIndex, 12)}>
                                                {comp?.knittingOrder_Yarn_Return && !isNaN(Number(comp.knittingOrder_Yarn_Return))
                                                    ? Number(comp.knittingOrder_Yarn_Return).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 13)}`} style={cellStyle} {...cellProps(rowFlatIndex, 13)}>
                                                {comp?.knittingOrder_Grey_Fabric_Received && !isNaN(Number(comp.knittingOrder_Grey_Fabric_Received))
                                                    ? Number(comp.knittingOrder_Grey_Fabric_Received).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 14)}`} style={cellStyle} {...cellProps(rowFlatIndex, 14)}>{comp ? <ShortExcess value={convertKnitShortExcessToNumber} /> : "-"}</td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 15)}`} style={cellStyle} {...cellProps(rowFlatIndex, 15)}>
                                                {comp?.dyeingOrder_Grey_Delivery && !isNaN(Number(comp.dyeingOrder_Grey_Delivery))
                                                    ? Number(comp.dyeingOrder_Grey_Delivery).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 16)}`} style={cellStyle} {...cellProps(rowFlatIndex, 16)}>
                                                {comp?.dyeingOrder_Grey_Return && !isNaN(Number(comp.dyeingOrder_Grey_Return))
                                                    ? Number(comp.dyeingOrder_Grey_Return).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 17)}`} style={cellStyle} {...cellProps(rowFlatIndex, 17)}>
                                                {comp?.dyeingOrder_Grey_Received && !isNaN(Number(comp.dyeingOrder_Grey_Received))
                                                    ? Number(comp.dyeingOrder_Grey_Received).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 18)}`} style={cellStyle} {...cellProps(rowFlatIndex, 18)}>
                                                {comp?.dyeingOrder_Finish_Received && !isNaN(Number(comp.dyeingOrder_Finish_Received))
                                                    ? Number(comp.dyeingOrder_Finish_Received).toFixed(2) : "-"}
                                            </td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 19)}`} style={cellStyle} {...cellProps(rowFlatIndex, 19)}>{comp ? `${dyeProcessLoss.toFixed(1)}%` : "-"}</td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 20)}`} style={cellStyle} {...cellProps(rowFlatIndex, 20)}>{comp ? <ShortExcess value={dyeShortExcess} /> : "-"}</td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 21)}`} style={cellStyle} {...cellProps(rowFlatIndex, 21)}>
                                                {comp?.aopOrder_Sent_for_AOP && !isNaN(Number(comp.aopOrder_Sent_for_AOP))
                                                    ? Number(comp.aopOrder_Sent_for_AOP).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 22)}`} style={cellStyle} {...cellProps(rowFlatIndex, 22)}>
                                                {comp?.aopOrder_Return_From_Aop && !isNaN(Number(comp.aopOrder_Return_From_Aop))
                                                    ? Number(comp.aopOrder_Return_From_Aop).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 23)}`} style={cellStyle} {...cellProps(rowFlatIndex, 23)}>
                                                {comp?.aopOrder_Received_From_Aop && !isNaN(Number(comp.aopOrder_Received_From_Aop))
                                                    ? Number(comp.aopOrder_Received_From_Aop).toFixed(2) : "-"}
                                            </td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 24)}`} style={cellStyle} {...cellProps(rowFlatIndex, 24)}>
                                                {comp?.aopOrder_AOP_Finish_Fabric_Rcvd && !isNaN(Number(comp.aopOrder_AOP_Finish_Fabric_Rcvd))
                                                    ? Number(comp.aopOrder_AOP_Finish_Fabric_Rcvd).toFixed(2) : "-"}
                                            </td>

                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 25)}`} style={cellStyle} {...cellProps(rowFlatIndex, 25)}>{comp ? `${aopProcessLoss.toFixed(1)}%` : "-"}</td>
                                            <td className={`${cellClass} ${selectedCellClass(rowFlatIndex, 26)}`} style={cellStyle} {...cellProps(rowFlatIndex, 26)}>{comp ? <ShortExcess value={aopShortExcess} /> : "-"}</td>

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
                                                        <td key={`trail-${idx}`} className={`${cellClass} bg-blue-50/30 ${selectedCellClass(rowFlatIndex, colIndex)}`} style={cellStyle} {...cellProps(rowFlatIndex, colIndex)}>
                                                            <div className="flex items-center justify-center h-full">
                                                                {content}
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                if (isEditingThisJob) {
                                                    if (field.key === "remarks") {
                                                        return (
                                                            <td key={`trail-${idx}`} className={`${cellClass} ${selectedCellClass(rowFlatIndex, colIndex)}`} style={cellStyle} {...cellProps(rowFlatIndex, colIndex)}>
                                                                <input
                                                                    className="w-full px-2 py-1.5 text-sm text-slate-900 bg-amber-100 border-2 border-[#f7d494] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-left"
                                                                    type="text"
                                                                    placeholder="Enter remarks"
                                                                    disabled={savingJob}
                                                                    value={editValues[`${jobNo}-${i}-${field.key}`] ?? ""}
                                                                    onChange={(e) => handleInputChange(jobNo, i, field.key, e.target.value, rowKey)}
                                                                />
                                                            </td>
                                                        );
                                                    }
                                                    return (
                                                        <td key={`trail-${idx}`} className={`${cellClass} ${selectedCellClass(rowFlatIndex, colIndex)}`} style={cellStyle} {...cellProps(rowFlatIndex, colIndex)}>
                                                            <input
                                                                className="w-full px-2 py-1.5 text-sm text-center font-semibold text-slate-900 bg-amber-100 border-2 border-[#f7d494] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                type="number"
                                                                step="1"
                                                                placeholder="0"
                                                                disabled={savingJob}
                                                                value={editValues[`${jobNo}-${i}-${field.key}`] ?? ""}
                                                                onChange={(e) => handleInputChange(jobNo, i, field.key, e.target.value, rowKey)}
                                                            />
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td key={`trail-${idx}`} className={`${cellClass} ${field.key === "remarks" ? "text-left pl-4" : "font-mono text-center"} text-slate-700 ${selectedCellClass(rowFlatIndex, colIndex)}`} style={cellStyle} {...cellProps(rowFlatIndex, colIndex)}>
                                                        {field.key === "remarks"
                                                            ? (remarksDisplay === "" ? "-" : remarksDisplay)
                                                            : (savedValue != null && savedValue !== 0 ? savedValue : (savedValue === 0 ? "0" : "-"))
                                                        }
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>

                        {!isLoading && processedReportData.length > 0 && (
                            /* FIX: tfoot z-index raised from z-20 to z-50 for the same reason as thead */
                            <tfoot className="sticky bottom-0 z-50 bg-[#f5df98]">
                                <tr>
                                    <td className="sticky bottom-0 left-0 z-30 px-3 py-3 border-t-2 border-[#f7d494] text-center align-middle" style={stickyCellStyle(0, "#f5df98", false)} />
                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-[#f7d494] text-center align-middle" style={stickyCellStyle(1, "#f5df98", false)} />
                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-[#f7d494] text-center align-middle" style={stickyCellStyle(2, "#f5df98", false)} />
                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-[#f7d494] text-center align-middle text-xs font-extrabold uppercase tracking-wider text-slate-800" style={stickyCellStyle(3, "#f5df98", true)}>
                                        Total
                                    </td>
                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-[#f7d494]" style={stickyCellStyle(4, "#f5df98")} />
                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-[#f7d494]" style={stickyCellStyle(5, "#f5df98")} />

                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...stickyCellStyle(6, "#f5df98", false), borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.orderQty.toFixed(2)}
                                    </td>

                                    <td className="sticky bottom-0 z-30 px-3 py-3 border-t-2 border-[#f7d494]" style={stickyCellStyle(7, "#f5df98", true)} />

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.finishRequiredQty.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.yarnRequiredQty.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.knitYarnDelivery.toFixed(2)}
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        <div className="flex items-center justify-center h-full"><ShortExcess value={footerTotals.yarnShortExcessReq} /></div>
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.knitYarnReturn.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.knitGreyReceived.toFixed(2)}
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        <div className="flex items-center justify-center h-full"><ShortExcess value={footerTotals.knitShortExcess} /></div>
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.dyeGreyDelivery.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.dyeGreyReturn.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.dyeGreyReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.dyeFinishReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }} />

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        <div className="flex items-center justify-center h-full"><ShortExcess value={footerTotals.dyeShortExcess} /></div>
                                    </td>

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.aopSent.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.aopReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.aopGreyReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        {footerTotals.aopFinishReceived.toFixed(2)}
                                    </td>
                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }} />

                                    <td className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                        <div className="flex items-center justify-center h-full"><ShortExcess value={footerTotals.aopShortExcess} /></div>
                                    </td>

                                    {TRAILING_FIELDS.map((field) => {
                                        if (field.key === "remarks") {
                                            return (
                                                <td key={`foot-${field.key}`} className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-left pl-4 align-middle font-medium text-slate-700" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                                    -
                                                </td>
                                            );
                                        }
                                        const isPercent = field.key.toLowerCase().includes("percent");
                                        const isShortExcess = field.key.toLowerCase().includes("short") || field.key.toLowerCase().includes("excess");
                                        const val = footerTotals[field.key];

                                        if (isShortExcess) {
                                            return (
                                                <td key={`foot-${field.key}`} className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
                                                    <div className="flex items-center justify-center h-full"><ShortExcess value={val} /></div>
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={`foot-${field.key}`} className="sticky bottom-0 z-20 px-3 py-2.5 text-sm border-t-2 border-[#f7d494] text-center align-middle font-mono font-bold text-slate-900" style={{ ...cellStyle, backgroundColor: "#f5df98", borderTop: "2px solid #f7d494" }}>
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

            {/* PORTALED FILTER DROPDOWN — rendered on top of everything */}
            {renderFilterDropdown()}

            {showNotesModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-xl border-2 border-[#f7d494] shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[#f7d494] bg-[#f5df98]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                Reconciliation Notes — <span className="text-blue-950">{pendingSaveJobs.length} Job(s)</span>
                            </h3>
                            <button
                                type="button"
                                onClick={cancelNotesModal}
                                disabled={savingJob}
                                className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-700 hover:text-slate-900 disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                                Add notes for this reconciliation (optional)
                            </label>
                            <textarea
                                className="w-full h-40 px-3 py-2.5 text-sm text-slate-900 bg-white border-2 border-[#f7d494] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none disabled:bg-slate-100 disabled:text-slate-400"
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
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t-2 border-[#f7d494] bg-[#f5df98]">
                            <button
                                type="button"
                                onClick={cancelNotesModal}
                                disabled={savingJob}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border-2 border-[#f7d494] rounded-md hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmSaveWithNotes}
                                disabled={savingJob}
                                className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 border-2 border-[#f7d494] rounded-md hover:bg-blue-950 shadow-sm disabled:opacity-50 transition-colors inline-flex items-center gap-2"
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