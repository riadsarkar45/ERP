import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { PlusCircle, RefreshCcw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Filter, X, Search, ChevronDown as DropIcon, Save, Loader, Download, View, ViewIcon, Pen, PencilOff } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import StyleReqModal from "../../../components/StyleReqModal";
import { Link, useNavigate } from "react-router-dom";
import { useFetchData } from "../../../hooks/fetch";
import * as XLSX from "xlsx";
import GlanceModal from "../../../components/GlanceModal";
import useAxiosPrivate from "../../../hooks/UseAxiosPrivate";

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
    "SALES CONTACT NO", "BUYER", "JOB NO", "STYLE", "PO NO", "COLOR", "COMPOSITION",
    "FINISH DIA", "ORDER QTY", "1st BOOKING", "PROCESS LOSS %", "FINISH REQUIRED QTY", "ADDITIONAL BOOKING",
    "REQUIRED YARN QTY", "KNITTING WORK ORDER QTY",
    "SHORT & EXCESS", "YARN DELIVERY", "SHORT & EXCESS (+/-)",
    "RAW YARN DELIVERY FOR DYED", "YARN RECEIVED AFTER DYED",
    "PARTY STOCK (SHORT & EXCESS)", "TOTAL KNITTING (GREY)", "RETURN YARN RECEIVED",
    "BALANCE (+/-)", "GREY DELIVERY FOR DYEING", "GREY RETURN FROM DYEING",
    "GREY RECEIVED FROM DYEING",
    "FINISH RECEIVED FROM DYEING", "GREY BALANCE (+/-)",
    "FINISH DELIVERY FROM AOP", "FINISH RECEIVED FROM AOP", "AOP FAB. BALANCE (+/-)",
    "AOP PROCESS LOSS (%)", "SENT FOR RE-PROCESS", "RETURN RCVD",
    "RECEIVED AFTER RE-PROCESS (GREY)", "RECEIVED AFTER RE-PROCESS (FINISH)",
    "RE-PROCESS FAB. BALANCE (+/-)", "RE-PROCESS PROCESS LOSS (%)",
];

// ── Filterable columns config (colIndex -> { key, type }) ────────────────────
const FILTERABLE_COLS = {
    0: { key: "salesContact", type: "row" },
    1: { key: "buyerName", type: "row" },
    2: { key: "jobNo", type: "row" },
    3: { key: "styleNo", type: "row" },
    4: { key: "poNo", type: "row" },
    5: { key: "color", type: "subrow" },
    6: { key: "composition", type: "subrow" },
};

const KEY_TO_INDEX = Object.entries(FILTERABLE_COLS).reduce((acc, [idx, col]) => {
    acc[col.key] = Number(idx);
    return acc;
}, {});

// ── Frozen column widths ─────────────────────────────────────────────────────
const FROZEN_WIDTHS = [150, 120, 180, 100, 120, 250, 280];
const FROZEN_COUNT = FROZEN_WIDTHS.length;

const FROZEN_LEFTS = FROZEN_WIDTHS.reduce((acc, width, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + FROZEN_WIDTHS[idx - 1]);
    return acc;
}, []);

// ── Totals Mapping (Column Index -> Backend Key) ─────────────────────────────
const TOTALS_MAPPING = {
    16: "YarnDelivery",
    18: "YarnDeliveryForYarnDye",
    21: "GreyFabricReceived",
    22: "YarnReturn",
    24: "GreyDelivery",
    25: "GreyReturn",
    26: "GreyReceived",
    27: "FinishReceived",
    29: "SentForAop",
    30: "ReceivedFromAop",
    33: "SentForReprocess",
    34: "ReturnFromAop",
    35: "ReceivedFromReprocess",
};

// ── Helper ───────────────────────────────────────────────────────────────────
const getBreakdownValue = (item, key) => {
    if (!item) return 0;
    if (item.status) return 0;
    return Number(item[key]) || 0;
};

// ── Filter Dropdown Component ─────────────────────────────────────────────────
function FilterDropdown({ colIndex, colLabel, allValues, activeValues, isLoading, onApply, onClear, onClose, anchorRef }) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(
        activeValues !== null ? new Set(activeValues) : new Set(allValues)
    );
    const dropRef = useRef(null);

    useEffect(() => {
        setSelected(activeValues !== null ? new Set(activeValues) : new Set(allValues));
    }, [allValues]);

    useEffect(() => {
        const handler = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target) &&
                anchorRef.current && !anchorRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose, anchorRef]);

    const filtered = allValues.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    const allChecked = filtered.length > 0 && filtered.every(v => selected.has(v));

    const toggleAll = () => {
        const next = new Set(selected);
        if (allChecked) {
            filtered.forEach(v => next.delete(v));
        } else {
            filtered.forEach(v => next.add(v));
        }
        setSelected(next);
    };

    const toggle = (val) => {
        const next = new Set(selected);
        next.has(val) ? next.delete(val) : next.add(val);
        setSelected(next);
    };

    return (
        <div
            ref={dropRef}
            style={{
                position: "fixed",
                zIndex: 9999,
                background: "#fff",
                border: "1px solid #000000",
                borderRadius: 6,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: 220,
                maxWidth: 280,
            }}
            className="filter-dropdown"
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-black bg-gray-50">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide truncate">{colLabel}</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
                    <X size={13} />
                </button>
            </div>

            <div className="px-2 py-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5 bg-gray-100 rounded px-2 py-1">
                    <Search size={12} className="text-gray-400 flex-shrink-0" />
                    <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="bg-transparent text-xs outline-none w-full text-gray-700 placeholder-gray-400"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                            <X size={11} />
                        </button>
                    )}
                </div>
            </div>

            <div className="px-3 py-1.5 border-b border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        disabled={isLoading}
                        className="rounded text-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-600">Select All</span>
                    <span className="ml-auto text-xs text-gray-400">{selected.size}/{allValues.length}</span>
                </label>
            </div>

            <div style={{ maxHeight: 200, overflowY: "auto" }} className="py-1">
                {isLoading ? (
                    <div className="px-3 py-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                        <RefreshCcw size={12} className="animate-spin" /> Loading options...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-gray-400 text-center">No matches</div>
                ) : (
                    filtered.map(val => (
                        <label key={val} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-blue-50 select-none">
                            <input
                                type="checkbox"
                                checked={selected.has(val)}
                                onChange={() => toggle(val)}
                                className="rounded text-blue-500"
                            />
                            <span className="text-xs text-gray-700 truncate" title={val}>{val || "(Blank)"}</span>
                        </label>
                    ))
                )}
            </div>

            <div className="flex gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50">
                <button
                    onClick={() => { onApply(selected); onClose(); }}
                    disabled={isLoading}
                    className="flex-1 text-xs bg-blue-500 text-white rounded px-3 py-1.5 font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                    Apply
                </button>
                <button
                    onClick={() => { onClear(); onClose(); }}
                    className="flex-1 text-xs bg-white border border-gray-300 text-gray-600 rounded px-3 py-1.5 font-medium hover:bg-gray-50 transition-colors"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}

// ── Summary Page ─────────────────────────────────────────────────────────────
export default function Summary() {
    const [rawData, setRawData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);

    const FILTER_STORAGE_KEY = "summary_active_filters";

    const [activeFilters, setActiveFilters] = useState(() => {
        try {
            const saved = sessionStorage.getItem(FILTER_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const [openFilter, setOpenFilter] = useState(null);
    const [filterOptions, setFilterOptions] = useState([]);
    const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

    // --- Multi-Cell Editing State ---
    const [editingCells, setEditingCells] = useState({});
    const [isLoading, setIsLoading] = useState({ loadAfterUpdate: false, refreshLoading: false })
    const [glanceReport, setGlanceReport] = useState({ isGlanceLoading: false, showGlanceModal: false, reportData: [] })
    const { fetchData } = useFetchData();
    const axiosPrivate = useAxiosPrivate();

    const ITEMS_PER_PAGE = 20;
    const [currentPage, setCurrentPage] = useState(1);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const filterBtnRefs = useRef({});

    const fetchFilteredData = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, refreshLoading: true }));
        try {
            const params = { page: 1, limit: 10000 };
            if (Object.keys(activeFilters).length > 0) params.filters = JSON.stringify(activeFilters);
            const res = await axiosPrivate.get('/api/styles', { params });
            if (res.data && res.data.data) setRawData(res.data.data);
        } catch (err) {
            console.error("Failed to fetch filtered data:", err);
        } finally {
            setIsLoading(prev => ({ ...prev, refreshLoading: false }));
        }
    }, [activeFilters, axiosPrivate]);
    
    useEffect(() => {
        fetchFilteredData();
    }, [fetchFilteredData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilters]);

    const handleRedirect = (jobNumber) => navigate(`/dashboard/new-order/${jobNumber}`);

    useEffect(() => {
        try {
            sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(activeFilters));
        } catch (e) {
            console.log(e);
        }
    }, [activeFilters]);

    const filteredData = rawData;

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    const openFilterDropdown = async (colIndex, e) => {
        e.stopPropagation();
        if (openFilter === colIndex) { setOpenFilter(null); return; }

        const btn = filterBtnRefs.current[colIndex];
        if (btn) {
            const rect = btn.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 4,
                left: Math.min(rect.left, window.innerWidth - 290),
            });
        }
        setOpenFilter(colIndex);
        setFilterOptions([]);

        const col = FILTERABLE_COLS[colIndex];
        if (!col) return;

        setFilterOptionsLoading(true);
        try {
            const otherFilters = { ...activeFilters };
            delete otherFilters[col.key];
            const params = Object.keys(otherFilters).length > 0 ? { filters: JSON.stringify(otherFilters) } : {};
            const res = await axiosPrivate.get(`/api/glance/filter-options/${col.key}`, { params });
            setFilterOptions(res.data?.data || []);
        } catch (err) {
            console.error("Failed to fetch filter options:", err);
            setFilterOptions([]);
        } finally {
            setFilterOptionsLoading(false);
        }
    };

    const applyFilter = (colIndex, selectedSet) => {
        const col = FILTERABLE_COLS[colIndex];
        if (!col) return;
        const selectedArray = Array.from(selectedSet);
        const allOptionsSelected = selectedArray.length === filterOptions.length && filterOptions.length > 0;

        setActiveFilters(prev => {
            const next = { ...prev };
            if (selectedArray.length === 0 || allOptionsSelected) delete next[col.key];
            else next[col.key] = selectedArray;
            return next;
        });
    };

    const clearFilter = (colIndex) => {
        const col = FILTERABLE_COLS[colIndex];
        if (!col) return;
        setActiveFilters(prev => {
            const next = { ...prev };
            delete next[col.key];
            return next;
        });
    };

    const clearAllFilters = () => setActiveFilters({});
    const hasActiveFilters = Object.keys(activeFilters).length > 0;

    const renderBreakdownCell = (compBreakdown, key, colIndex) => (
        <td
            className="p-0 align-top"
            style={{
                backgroundColor: colIndex >= 6 ? '#fbf8f8' : '#f9f3f3',
                borderRight: '1px solid #000000',
                borderBottom: '1px solid #000000',
            }}
        >
            <div className="divide-y divide-black">
                {compBreakdown.map((cb, j) => {
                    if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-black italic">_</div>;
                    const value = cb?.[key];
                    return <div key={j} className="px-3 py-2 whitespace-nowrap">{value !== undefined && value !== null ? value : "_"}</div>;
                })}
            </div>
        </td>
    );

    const getColBg = (index) => index >= 6 ? '#fefeff' : '#ffffff';
    
    const getFrozenStyle = (index) => ({
        position: 'sticky',
        left: `${FROZEN_LEFTS[index]}px`,
        width: `${FROZEN_WIDTHS[index]}px`,
        minWidth: `${FROZEN_WIDTHS[index]}px`,
        maxWidth: `${FROZEN_WIDTHS[index]}px`,
        zIndex: 20,
        backgroundColor: '#ffffff',
        borderRight: '1px solid #000000',
        borderBottom: '1px solid #000000',
        boxShadow: index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.1)' : 'none',
        overflow: index === FROZEN_COUNT - 1 ? 'hidden' : 'visible',
    });

    const getTotalStyle = (index) => {
        const isFrozen = index < FROZEN_COUNT;
        return {
            position: 'sticky',
            top: 0,
            left: isFrozen ? `${FROZEN_LEFTS[index]}px` : 'auto',
            width: isFrozen ? `${FROZEN_WIDTHS[index]}px` : 'auto',
            minWidth: isFrozen ? `${FROZEN_WIDTHS[index]}px` : 'auto',
            maxWidth: isFrozen ? `${FROZEN_WIDTHS[index]}px` : 'auto',
            zIndex: isFrozen ? 50 : 40,
            backgroundColor: isFrozen ? '#dbeafe' : '#eff6ff',
            borderRight: '1px solid #000000',
            borderBottom: '1px solid #000000',
            boxShadow: isFrozen && index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.15)' : 'none',
            overflow: isFrozen && index === FROZEN_COUNT - 1 ? 'hidden' : 'visible',
        };
    };

    const getCellStyle = (index) => ({
        backgroundColor: getColBg(index),
        borderRight: '1px solid #000000',
        borderBottom: '1px solid #000000',
    });

    // --- Handlers for Multiple Inline Editing ---
    const handleEdit = (rowId, editingField, currentValue, changedTable) => {
        const cellKey = `${rowId}-${editingField}`;
        setEditingCells(prev => {
            if (prev[cellKey]) return prev;
            return {
                ...prev,
                [cellKey]: {
                    rowId,
                    fieldName: editingField,
                    value: currentValue !== undefined && currentValue !== null ? String(currentValue) : "",
                    changedTable: changedTable || "",
                    isDirty: false
                }
            };
        });
    };

    const handleOnChange = (e, cellKey) => {
        const { value } = e.target;
        setEditingCells(prev => ({
            ...prev,
            [cellKey]: {
                ...prev[cellKey],
                value,
                isDirty: true
            }
        }));
    };

    const handleSubmit = async () => {
        setIsLoading(prev => ({ ...prev, loadAfterUpdate: true }));

        const cellsToSave = Object.values(editingCells).filter(c => c.isDirty);

        if (cellsToSave.length === 0) {
            setIsLoading(prev => ({ ...prev, loadAfterUpdate: false }));
            setEditingCells({});
            return;
        }

        try {
            const promises = cellsToSave.map(async (cell) => {
                const updatedData = {
                    [cell.fieldName]: cell.value,
                    changedTable: cell.changedTable,
                    rowId: cell.rowId
                };
                return axiosPrivate.patch(`/api/update-style-req/${cell.rowId}`, updatedData);
            });

            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.data?.type === "success");

            if (allSuccess) {
                await fetchFilteredData();
                setEditingCells({});
            }
        } catch (err) {
            console.error("Failed to save updates:", err);
        } finally {
            setIsLoading(prev => ({ ...prev, loadAfterUpdate: false }));
        }
    };

    const handleRefresh = () => {
        fetchFilteredData();
    }

    const handleExportExcel = () => {
        const wsData = [];
        wsData.push(COLUMNS);

        filteredData.forEach(row => {
            const compBreakdown = row.compBreakdown || row.rows.map(() => ({}));
            const numSubRows = row.rows.length;

            for (let j = 0; j < numSubRows; j++) {
                const cell = row.rows[j];
                const cb = compBreakdown[j] || {};

                const finishQty = Number(cell.finishRequiredQty) || 0;
                const processLoss = Number(row.processLoss) || 0;
                const totalRequired = finishQty + finishQty * (processLoss / 100);
                const knittingWOQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');

                const shortExcess0 = cb?.status ? "_" : (totalRequired - knittingWOQty).toFixed(2);
                const yarnDelivery = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                const shortExcess1 = totalRequired === 0 ? "_" : (totalRequired - yarnDelivery).toFixed(2);

                const yarnReturn = getBreakdownValue(cb, 'knittingOrder_Yarn_Return');
                const greyReceived = getBreakdownValue(cb, 'knittingOrder_Grey_Fabric_Received');
                const balance = (greyReceived + yarnReturn) - (knittingWOQty - yarnDelivery);

                const greyReturnRcvd = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received');
                const greyReceivedDyeing = getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing');
                const greyDelivery = getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery');
                const greyBalance = greyReturnRcvd + greyReceivedDyeing - greyDelivery;
                const hasGreyData = greyReturnRcvd || greyReceivedDyeing || greyDelivery;

                const aopSent = getBreakdownValue(cb, 'aopOrder_Sent_for_AOP');
                const aopReceived = getBreakdownValue(cb, 'aopOrder_Received_From_Aop');
                const aopBalance = aopReceived - aopSent;
                const aopLoss = aopSent > 0 ? (((aopSent - aopReceived) / aopSent) * 100).toFixed(2) + "%" : "_";

                const rpSent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                const rpGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                const rpFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                const rpBalance = (rpGrey + rpFinish) - rpSent;
                const rpLoss = rpSent > 0 ? (((rpSent - (rpGrey + rpFinish)) / rpSent) * 100).toFixed(2) + "%" : "_";

                wsData.push([
                    j === 0 ? row.salesContact : "",
                    j === 0 ? row.buyerName : "",
                    j === 0 ? row.jobNo : "",
                    j === 0 ? row.styleNo : "",
                    j === 0 ? row.poNo : "",
                    cell.color,
                    cell.composition,
                    cell.finishDia,
                    cell.orderQty,
                    totalRequired.toFixed(2),
                    "additional",
                    totalRequired.toFixed(2),
                    cb?.status ? "_" : knittingWOQty,
                    cb?.status ? "_" : shortExcess0,
                    cb?.status ? "_" : yarnDelivery,
                    cb?.status ? "_" : shortExcess1,
                    cb?.status ? "_" : getBreakdownValue(cb, 'yarnDyeingOrder_Yarn_Delivery_For_Yarn_Dye'),
                    cb?.status ? "_" : getBreakdownValue(cb, 'yarnDyeingOrder_Yarn_Received_From_Yarn_Dye'),
                    "party stock",
                    cb?.status ? "_" : greyReceived,
                    cb?.status ? "_" : yarnReturn,
                    cb?.status ? "_" : balance.toFixed(2),
                    cb?.status ? "_" : greyDelivery,
                    cb?.status ? "_" : greyReturnRcvd,
                    cb?.status ? "_" : getBreakdownValue(cb, 'dyeingOrder_Grey_Received'),
                    cb?.status ? "_" : getBreakdownValue(cb, 'dyeingOrder_Finish_Received'),
                    cb?.status ? "_" : (!hasGreyData ? "_" : greyBalance),
                    `${processLoss}%`,
                    cb?.status ? "_" : aopSent,
                    cb?.status ? "_" : aopReceived,
                    cb?.status ? "_" : (aopSent === 0 && aopReceived === 0 ? "_" : Math.abs(aopBalance)),
                    cb?.status ? "_" : aopLoss,
                    cb?.status ? "_" : rpSent,
                    cb?.status ? "_" : getBreakdownValue(cb, 'reProcessOrder_Return_Received'),
                    cb?.status ? "_" : rpGrey,
                    cb?.status ? "_" : rpFinish,
                    cb?.status ? "_" : (rpSent === 0 && rpGrey === 0 && rpFinish === 0 ? "_" : Math.abs(rpBalance)),
                    cb?.status ? "_" : rpLoss,
                ]);
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = COLUMNS.map((_, i) => ({ wch: i < FROZEN_COUNT ? 20 : 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Summary");
        XLSX.writeFile(wb, `Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleGlanceReport = () => {
        setGlanceReport({ isGlanceLoading: true });
        fetchData(`/api/styles`).then(data => {
            if (data) setGlanceReport({ showGlanceModal: true, isGlanceLoading: false, reportData: data.data });
        });
    }

    return (
        <DashboardLayout>
            <div className="flex gap-2 mb-4 items-center flex-wrap">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <PlusCircle size={18} />
                </button>
                {
                    isLoading.refreshLoading ?
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600">
                            <span className="animate-spin"><RefreshCcw size={18} /></span>
                        </button> :
                        <button onClick={() => handleRefresh()} className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600">
                            <RefreshCcw size={18} />
                        </button>
                }

                {
                    Object.values(editingCells).some(c => c.isDirty) && (
                        isLoading.loadAfterUpdate ?
                            <button className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600">
                                <Loader size={18} />
                            </button> :
                            <button onClick={() => handleSubmit()} className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600">
                                <Save size={18} />
                            </button>
                    )
                }

                {
                    Object.keys(editingCells).length > 0 && !isLoading.loadAfterUpdate && (
                        <button onClick={() => setEditingCells({})} className="flex items-center gap-2 px-6 py-2.5 bg-red-200 text-red-700 font-medium rounded-md hover:bg-red-300 transition-colors border border-red-300">
                            <PencilOff size={18} /> Cancel
                        </button>
                    )
                }

                {
                    glanceReport.showGlanceModal && (
                        <GlanceModal
                            glanceReport={glanceReport}
                            setGlanceReport={setGlanceReport}
                            handleGlanceReport={handleGlanceReport}
                        />
                    )
                }

                <div className="h-8 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                <div className="flex items-center gap-1">
                    <button onClick={() => handleExportExcel()} className="flex items-center justify-center h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm p-2" title="Export">
                        <Download size={18} className="text-gray-600" />
                        Export
                    </button>
                    {
                        glanceReport.isGlanceLoading ?
                            <button className="flex items-center justify-center h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm p-2" title="See MAKE YOUR RECONCIALATION">
                                <span className="animate-spin"><RefreshCcw size={18} className="text-gray-600" /></span>
                            </button> :
                            <Link to={"/dashboard/style/reconciliation"}>
                                <button className="flex font-semibold items-center justify-center h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm p-2" title="RECONCIALATION">
                                    <Pen size={20} className="text-gray-600" />
                                    MAKE YOUR RECONCIALATION
                                </button>
                            </Link>
                    }
                </div>

                {hasActiveFilters && (
                    <>
                        <div className="h-8 w-px bg-gray-300 mx-2 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Filter size={14} className="text-blue-500" />
                            {Object.entries(activeFilters).map(([colKey, values]) => {
                                const colIndex = KEY_TO_INDEX[colKey];
                                return (
                                    <span
                                        key={colKey}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-black text-blue-700 text-xs rounded-full font-medium"
                                    >
                                        {colIndex !== undefined ? COLUMNS[colIndex] : colKey}
                                        <span className="bg-blue-200 text-blue-800 rounded-full px-1 text-xs">{values.length}</span>
                                        <button onClick={() => colIndex !== undefined && clearFilter(colIndex)} className="ml-0.5 text-blue-400 hover:text-blue-700">
                                            <X size={11} />
                                        </button>
                                    </span>
                                );
                            })}
                            <button
                                onClick={clearAllFilters}
                                className="text-xs text-gray-500 hover:text-red-500 underline ml-1"
                            >
                                Clear all
                            </button>
                        </div>
                    </>
                )}

                <span className="ml-auto text-xs text-gray-400">
                    {filteredData.length} rows
                </span>
            </div>

            {showModal && <StyleReqModal setRawData={setRawData} setShowModal={setShowModal} />}

            {openFilter !== null && (
                <FilterDropdown
                    colIndex={openFilter}
                    colLabel={COLUMNS[openFilter]}
                    allValues={filterOptions}
                    isLoading={filterOptionsLoading}
                    activeValues={activeFilters[FILTERABLE_COLS[openFilter]?.key] ? Array.from(activeFilters[FILTERABLE_COLS[openFilter]?.key]) : null}
                    onApply={(set) => applyFilter(openFilter, set)}
                    onClear={() => clearFilter(openFilter)}
                    onClose={() => setOpenFilter(null)}
                    anchorRef={{ current: filterBtnRefs.current[openFilter] }}
                    style={{ top: dropdownPos.top, left: dropdownPos.left, position: "fixed" }}
                />
            )}

            <style>{`
                .filter-dropdown {
                    top: ${dropdownPos.top}px !important;
                    left: ${dropdownPos.left}px !important;
                }
            `}</style>

            <div
                ref={scrollContainerRef}
                className="relative overflow-auto shadow-xs rounded-t-base border border-default"
                style={{ maxHeight: 'calc(100vh - 250px)' }}
            >
                <table
                    className="w-full text-sm text-left rtl:text-right text-body"
                    style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                >
                    <thead className="sticky top-0 z-30 text-sm text-body">
                        
                       

                        {/* ── Main Header Row ── */}
                        <tr>
                            {COLUMNS.map((col, index) => {
                                const isFilterable = index in FILTERABLE_COLS;
                                const hasFilter = isFilterable && !!activeFilters[FILTERABLE_COLS[index].key];
                                const isFrozen = index < FROZEN_COUNT;

                                return (
                                    <th
                                        key={index}
                                        scope="col"
                                        className="px-3 py-3 font-medium whitespace-nowrap"
                                        style={{
                                            backgroundColor: index >= 6 ? '#c7d2fe' : '#e5e7eb',
                                            position: 'sticky',
                                            top: '44px',
                                            left: isFrozen ? `${FROZEN_LEFTS[index]}px` : 'auto',
                                            width: isFrozen ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                            minWidth: isFrozen ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                            maxWidth: isFrozen ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                            zIndex: isFrozen ? 45 : 35,
                                            borderRight: '1px solid #000000',
                                            borderBottom: '2px solid #000000',
                                            boxShadow: index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.15)' : 'none',
                                            overflow: index === FROZEN_COUNT - 1 ? 'hidden' : 'visible',
                                        }}
                                    >
                                        <div className="flex items-center gap-1 justify-between">
                                            <span className="flex-1">{col}</span>
                                            {isFilterable && (
                                                <button
                                                    ref={el => filterBtnRefs.current[index] = el}
                                                    onClick={(e) => openFilterDropdown(index, e)}
                                                    title={hasFilter ? "Filter active" : "Filter"}
                                                    className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors ${hasFilter
                                                        ? 'bg-blue-500 text-white'
                                                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <Filter size={11} />
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {isLoading.refreshLoading && paginatedData.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNS.length} className="px-4 py-20 text-center align-middle">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <RefreshCcw size={24} className="animate-spin text-blue-500" />
                                        <span className="text-sm font-medium text-gray-500">Loading summary data...</span>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!isLoading.refreshLoading && paginatedData.map((row, i) => {
                            const compBreakdown = row.compBreakdown || row.rows.map(() => ({}));

                            return (
                                <tr key={row.id || i} className="group">

                                    {/* 1. SALES CONTACT */}
                                    <td onClick={() => handleEdit(row.id, "salesContact", row.salesContact)} className="px-3 py-2 whitespace-nowrap align-middle group-hover:bg-gray-50" style={getFrozenStyle(0)}>
                                        {editingCells[`${row.id}-salesContact`] ? (
                                            <input
                                                value={editingCells[`${row.id}-salesContact`].value}
                                                onChange={(e) => handleOnChange(e, `${row.id}-salesContact`)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-yellow-300 bg-opacity-25 outline-none w-full p-2 rounded-md"
                                                type="text"
                                            />
                                        ) : row.salesContact}
                                    </td>

                                    {/* 2. BUYER */}
                                    <td onClick={() => handleEdit(row.id, "buyerName", row.buyerName)} className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50" style={getFrozenStyle(1)}>
                                        {editingCells[`${row.id}-buyerName`] ? (
                                            <input
                                                value={editingCells[`${row.id}-buyerName`].value}
                                                onChange={(e) => handleOnChange(e, `${row.id}-buyerName`)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="border outline-none w-full p-2 rounded-md bg-yellow-300 bg-opacity-25"
                                                type="text"
                                            />
                                        ) : row.buyerName}
                                    </td>

                                    {/* 3. JOB NO */}
                                    <td onDoubleClick={() => handleRedirect(row.jobNo)} className="px-3 py-2 whitespace-nowrap align-middle text-center cursor-pointer hover:text-blue-600 group-hover:bg-gray-50" style={getFrozenStyle(2)}>
                                        <span onClick={() => handleEdit(row.id, "jobNo", row.jobNo)}>
                                            {editingCells[`${row.id}-jobNo`] ? (
                                                <input
                                                    value={editingCells[`${row.id}-jobNo`].value}
                                                    onChange={(e) => handleOnChange(e, `${row.id}-jobNo`)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="bg-yellow-300 bg-opacity-25 border outline-none w-full p-2 rounded-md"
                                                    type="text"
                                                />
                                            ) : row.jobNo}
                                        </span>
                                    </td>

                                    {/* 4. STYLE */}
                                    <td onClick={() => handleEdit(row.id, "styleNo", row.styleNo, "styleRequirement")} className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50" style={getFrozenStyle(3)}>
                                        {editingCells[`${row.id}-styleNo`] ? (
                                            <input
                                                value={editingCells[`${row.id}-styleNo`].value}
                                                onChange={(e) => {
                                                    e.target.style.width = `${Math.max(e.target.value.length, 5)}ch`;
                                                    handleOnChange(e, `${row.id}-styleNo`);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="border outline-none p-2 rounded-md bg-yellow-300 bg-opacity-25"
                                                type="text"
                                                style={{ width: `${Math.max(row.styleNo?.length || 1, 5)}ch` }}
                                            />
                                        ) : row.styleNo}
                                    </td>

                                    {/* 5. PO NO */}
                                    <td onClick={() => handleEdit(row.id, "poNo", row.poNo, "styleRequirement")} className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50" style={getFrozenStyle(4)}>
                                        {editingCells[`${row.id}-poNo`] ? (
                                            <input
                                                value={editingCells[`${row.id}-poNo`].value}
                                                onChange={(e) => {
                                                    e.target.style.width = `${Math.max(e.target.value.length, 5)}ch`;
                                                    handleOnChange(e, `${row.id}-poNo`);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="border outline-none p-2 rounded-md bg-yellow-300 bg-opacity-25"
                                                type="text"
                                                style={{ width: `${Math.max(row.poNo?.length || 1, 5)}ch` }}
                                            />
                                        ) : row.poNo}
                                    </td>

                                    {/* 6. COLOR */}
                                    <td className="p-0 align-top group-hover:bg-gray-50" style={getFrozenStyle(5)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "color", cell.color, "styleRequirementRows")} key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {editingCells[`${cell.id}-color`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-color`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-color`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border bg-yellow-300 bg-opacity-25 outline-none w-full p-2 rounded-md"
                                                            type="text"
                                                        />
                                                    ) : cell.color}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 7. COMPOSITION */}
                                    <td className="p-0 align-top group-hover:bg-gray-50" style={getFrozenStyle(6)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "composition", cell.composition, "styleRequirementRows")} key={j} className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis" title={cell.composition}>
                                                    {editingCells[`${cell.id}-composition`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-composition`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-composition`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border bg-yellow-300 bg-opacity-25 outline-none w-full p-2 rounded-md"
                                                            type="text"
                                                        />
                                                    ) : cell.composition}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 8. FINISH DIA */}
                                    <td className="p-0 align-top" style={getCellStyle(7)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "finishDia", cell.finishDia, "styleRequirementRows")} key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {editingCells[`${cell.id}-finishDia`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-finishDia`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-finishDia`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border bg-yellow-300 bg-opacity-25 outline-none w-full p-2 rounded-md"
                                                            type="text"
                                                        />
                                                    ) : cell.finishDia}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 9. ORDER QTY */}
                                    <td className="p-0 align-top" style={getCellStyle(8)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "orderQty", cell.orderQty, "styleRequirementRows")} key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {editingCells[`${cell.id}-orderQty`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-orderQty`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-orderQty`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border bg-yellow-300 bg-opacity-25 outline-none w-full p-2 rounded-md"
                                                            type="text"
                                                        />
                                                    ) : cell.orderQty}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 10. 1st BOOKING */}
                                    <td className="p-0 align-top" style={getCellStyle(9)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {(Number(cell.finishRequiredQty) * (1 + Number(row.processLoss) / 100) + Number(cell.additional)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 28. PROCESS LOSS % */}
                                    <td className="p-0 align-top" style={getCellStyle(27)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((_, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{row.processLoss || 0}%</div>)}
                                        </div>
                                    </td>

                                    {/* 11. FINISH REQUIRED QTY */}
                                    <td className="p-0 align-top" style={getCellStyle(10)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => {
                                                const lossQty = Number(cell.additional) * (Number(row.processLoss) / 100);
                                                const netAdditional = Number(cell.additional) - lossQty;
                                                const inCreaseFinishQty = (Number(cell.finishRequiredQty) + netAdditional).toFixed(2);
                                                return (
                                                    <div
                                                        key={j}
                                                        onClick={() => handleEdit(cell.id, "finishRequiredQty", cell.finishRequiredQty, "styleRequirementRows")}
                                                        className="px-3 py-2 whitespace-nowrap"
                                                    >
                                                        {editingCells[`${cell.id}-finishRequiredQty`] ? (
                                                            <input
                                                                value={editingCells[`${cell.id}-finishRequiredQty`].value}
                                                                onChange={(e) => handleOnChange(e, `${cell.id}-finishRequiredQty`)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="border bg-yellow-300 bg-opacity-25 outline-none w-full p-2 rounded-md"
                                                                type="text"
                                                            />
                                                        ) : (
                                                            inCreaseFinishQty
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 11. ADDITIONAL BOOKING */}
                                    <td className="p-0 align-top" style={getCellStyle(10)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "additional", cell.additional, "compositionAdd")} key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {editingCells[`${cell.id}-additional`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-additional`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-additional`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border bg-yellow-300 bg-opacity-25 outline-none w-full p-2 rounded-md"
                                                            type="text"
                                                        />
                                                    ) : (
                                                        cell.additional || "-"
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 12. REQUIRED YARN QTY */}
                                    <td className="p-0 align-top" style={getCellStyle(11)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {(Number(cell.finishRequiredQty) * (1 + Number(row.processLoss) / 100) + Number(cell.additional)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 13. KNITTING WORK ORDER QTY */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_workOrderQty', 12)}

                                    {/* 14. SHORT & EXCESS */}
                                    <td className="p-0 align-top" style={getCellStyle(13)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => {
                                                const cb = compBreakdown[j] || {};
                                                if (cb.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const finishRequiredQty = cell.finishRequiredQty || 0;
                                                const processLoss = row.processLoss || 0;
                                                const knittingWorkOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');
                                                const diff0 = (Number(finishRequiredQty) * (1 + Number(processLoss) / 100) + Number(cell.additional || 0)) - Number(knittingWorkOrderQty); const isExceeded0 = diff0 > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}`}>
                                                        {isExceeded0 ? `(${diff0.toFixed(2)})` : Math.abs(diff0).toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 15. YARN DELIVERY */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Yarn_Delivery', 14)}

                                    {/* 16. SHORT & EXCESS (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(15)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((cell, j) => {
                                                const cb = compBreakdown[j] || {};
                                                if (cb.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const finishQty = Number(cell.finishRequiredQty) || 0;
                                                const processLoss = Number(row.processLoss) || 0;
                                                const delivered = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                                                const totalRequired = finishQty + finishQty * (processLoss / 100);
                                                const diff1 = totalRequired - delivered;
                                                const isExceed1 = diff1 > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceed1 ? "text-green-500 font-bold" : "text-red-500 font-bold"}`}>
                                                        {totalRequired === 0 ? "_" : isExceed1 ? `(${diff1.toFixed(2)})` : Math.abs(diff1).toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 17. RAW YARN DELIVERY FOR DYED */}
                                    {renderBreakdownCell(compBreakdown, 'yarnDyeingOrder_Yarn_Delivery_For_Yarn_Dye', 16)}

                                    {/* 18. YARN RECEIVED AFTER DYED */}
                                    {renderBreakdownCell(compBreakdown, 'yarnDyeingOrder_Yarn_Received_From_Yarn_Dye', 17)}

                                    {/* 19. PARTY STOCK */}
                                    <td className="p-0 align-top" style={getCellStyle(18)}>
                                        <div className="divide-y divide-black">
                                            {row.rows.map((_, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">party stock</div>)}
                                        </div>
                                    </td>

                                    {/* 20. TOTAL KNITTING (GREY) */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Grey_Fabric_Received', 19)}

                                    {/* 21. RETURN YARN RECEIVED */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Yarn_Return', 20)}

                                    {/* 22. BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(21)}>
                                        <div className="divide-y divide-black">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const yarnDelivery = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                                                const yarnReturn = getBreakdownValue(cb, 'knittingOrder_Yarn_Return');
                                                const greyReceived = getBreakdownValue(cb, 'knittingOrder_Grey_Fabric_Received');
                                                const workOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');
                                                const balance = (greyReceived + yarnReturn) - (workOrderQty - yarnDelivery);
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap font-bold ${balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {balance === 0 ? "_" : balance.toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 23. GREY DELIVERY FOR DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Delivery', 22)}

                                    {/* 24. GREY RETURN FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Return', 23)}

                                    {/* 25. GREY RECEIVED FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Received', 24)}

                                    {/* 26. FINISH RECEIVED FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Finish_Received', 25)}

                                    {/* 27. GREY BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(26)}>
                                        <div className="divide-y divide-black">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const diff = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received') +
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Received') -
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery');
                                                const isExceeded = diff > 0;
                                                const hasAnyData = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received') ||
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing') ||
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery');
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {!hasAnyData ? "_" : (isExceeded ? `(${diff})` : Math.abs(diff))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 29. FINISH DELIVERY FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Sent_For_Aop', 28)}
                                    {/* 30. FINISH RECEIVED FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Received_From_Aop', 29)}

                                    {/* 31. AOP FAB. BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(30)}>
                                        <div className="divide-y divide-black">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'aopOrder_Sent_For_Aop');
                                                const received = getBreakdownValue(cb, 'aopOrder_Received_From_Aop');
                                                const diff = received - sent;
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {sent === 0 && received === 0 ? "_" : (isExceeded ? `(${Math.abs(diff)})` : Math.abs(diff))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 32. AOP PROCESS LOSS (%) */}
                                    <td className="p-0 align-top" style={getCellStyle(31)}>
                                        <div className="divide-y divide-black">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'aopOrder_Sent_For_Aop');
                                                const received = getBreakdownValue(cb, 'aopOrder_Received_From_Aop');
                                                const loss = sent > 0 ? (((sent - received) / sent) * 100).toFixed(2) : "_";
                                                return <div key={j} className="px-3 py-2 whitespace-nowrap">{loss === "_" ? "_" : `${loss}%`}</div>;
                                            })}
                                        </div>
                                    </td>

                                    {/* 33. SENT FOR RE-PROCESS */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Sent_for_Re_Process', 32)}

                                    {/* 34. RETURN RCVD */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Return_Received', 33)}

                                    {/* 35. RECEIVED AFTER RE-PROCESS (GREY) */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Received_After_Re_Process_Grey', 34)}

                                    {/* 36. RECEIVED AFTER RE-PROCESS (FINISH) */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Received_After_Re_Process_Finish', 35)}

                                    {/* 37. RE-PROCESS FAB. BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(36)}>
                                        <div className="divide-y divide-black">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                                                const receivedGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                                                const receivedFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                                                const diff = (receivedGrey + receivedFinish) - sent;
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {sent === 0 && receivedGrey === 0 && receivedFinish === 0 ? "_" : (isExceeded ? `(${diff})` : Math.abs(diff))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 38. RE-PROCESS PROCESS LOSS (%) */}
                                    <td className="p-0 align-top" style={getCellStyle(37)}>
                                        <div className="divide-y divide-black">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                                                const receivedGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                                                const receivedFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                                                const loss = sent > 0 ? (((sent - (receivedGrey + receivedFinish)) / sent) * 100).toFixed(2) : "_";
                                                return <div key={j} className="px-3 py-2 whitespace-nowrap">{loss === "_" ? "_" : `${loss}%`}</div>;
                                            })}
                                        </div>
                                    </td>

                                </tr>
                            );
                        })}

                        {!isLoading.refreshLoading && paginatedData.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    No rows match the active filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border border-t-0 border-black rounded-b-base shadow-xs">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{endIndex}</span> of <span className="font-medium">{filteredData.length}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={16} className="mr-1" /> Prev
                                </button>

                                {getPageNumbers().map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${currentPage === page
                                            ? 'bg-blue-600 text-white z-10'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next <ChevronRight size={16} className="ml-1" />
                                </button>
                            </nav>
                        </div>
                    </div>

                    <div className="flex justify-between sm:hidden w-full">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700 self-center">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}