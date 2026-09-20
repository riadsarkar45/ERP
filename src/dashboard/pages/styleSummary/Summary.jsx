import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
    PlusCircle, RefreshCcw, ChevronLeft, ChevronRight, Filter, X, Search,
    Save, Loader, Download, Pen, PencilOff, FileText
} from "lucide-react";
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
    "YARN DELIVERY FOR DYED", "YARN RECEIVED AFTER DYED",
    "PARTY STOCK (SHORT & EXCESS)", "TOTAL KNITTING (GREY)", "RETURN YARN RECEIVED",
    "BALANCE (+/-)", "GREY DELIVERY FOR DYEING", "GREY RETURN FROM DYEING",
    "GREY RECEIVED FROM DYEING",
    "FINISH RECEIVED FROM DYEING", "GREY BALANCE (+/-)",
    "FINISH DELIVERY FROM AOP", "FABRIC RETURN FROM AOP", "AFTER AOP FABRIC RCVD", "FINISH RECEIVED FROM AOP", "AOP FAB. BALANCE (+/-)",
    "AOP PROCESS LOSS (%)", "SENT FOR RE-PROCESS", "RETURN RCVD",
    "RECEIVED AFTER RE-PROCESS (GREY)", "RECEIVED AFTER RE-PROCESS (FINISH)",
    "RE-PROCESS FAB. BALANCE (+/-)", "RE-PROCESS PROCESS LOSS (%)",
];

// ── Filterable columns config ─────────────────────────────────────────────────
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

// ─ Frozen column widths ─────────────────────────────────────────────────────
const CHECKBOX_WIDTH = 50;
const FROZEN_WIDTHS = [120, 120, 180, 110, 120, 230, 290, 100];
const FROZEN_COUNT = FROZEN_WIDTHS.length;
const UNFROZEN_WIDTH = 110;

// Calculate frozen left positions WITH checkbox offset
const FROZEN_LEFTS = FROZEN_WIDTHS.reduce((acc, width, idx) => {
    acc.push(idx === 0 ? CHECKBOX_WIDTH : acc[idx - 1] + FROZEN_WIDTHS[idx - 1]);
    return acc;
}, []);

const PERCENT_COLUMN_INDEXES = new Set([10, 34, 40]);
const NO_TOTAL_COLUMN_INDEXES = new Set([20]);

// ── Helper functions ─────────────────────────────────────────────────────────
const getBreakdownValue = (item, key) => {
    if (!item) return 0;
    if (item.status) return 0;
    return Number(item[key]) || 0;
};

const formatNumber = (val, fallback = "_") => {
    if (val === undefined || val === null || val === "") return fallback;
    const num = Number(val);
    return Number.isFinite(num) ? num.toFixed(2) : val;
};

// ─ Filter Dropdown Component ────────────────────────────────────────────────
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
                border: "1px solid #0d9488",
                borderRadius: 6,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: 220,
                maxWidth: 280,
            }}
            className="filter-dropdown"
        >
            <div className="flex items-center justify-between px-3 py-2 subrow-cell border-b border-[#0d9488] bg-gray-50">
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
                        className="rounded text-teal-600"
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
                        <label key={val} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-teal-50 select-none">
                            <input
                                type="checkbox"
                                checked={selected.has(val)}
                                onChange={() => toggle(val)}
                                className="rounded text-teal-600"
                            />
                            <span className="text-xs text-gray-700 truncate" title={val}>{val || "(Blank)"}</span>
                        </label>
                    ))
                )}
            </div>

            <div className="flex gap-2 px-3 py-2 subrow-cell border-t border-gray-100 bg-gray-50">
                <button
                    onClick={() => { onApply(selected); onClose(); }}
                    disabled={isLoading}
                    className="flex-1 text-xs bg-teal-600 text-white rounded px-3 py-1.5 font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
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

// ─ Summary Page ────────────────────────────────────────────────────────────
export default function Summary() {
    const [rawData, setRawData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);

    const [editingJobData, setEditingJobData] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState(new Set());

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

    const [editingCells, setEditingCells] = useState({});
    const [isLoading, setIsLoading] = useState({ loadAfterUpdate: false, refreshLoading: false })
    const [glanceReport, setGlanceReport] = useState({ isGlanceLoading: false, showGlanceModal: false, reportData: [] })
    const { fetchData } = useFetchData();
    const axiosPrivate = useAxiosPrivate();

    const ITEMS_PER_PAGE = 20;
    const [currentPage, setCurrentPage] = useState(1);

    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const filterBtnRefs = useRef({});

    const isAnyModalOpen = showModal || glanceReport.showGlanceModal;

    const fetchFilteredData = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, refreshLoading: true }));
        try {
            const params = { page: 1, limit: 10000, reconciliation: false };
            if (Object.keys(activeFilters).length > 0) params.filters = JSON.stringify(activeFilters);
            const res = await axiosPrivate.get('/api/styles', { params });
            if (res.data && res.data.data) setRawData(res.data.data);
            console.log(res.data);
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

    const footerTotals = useMemo(() => {
        const totals = {};
        for (let idx = FROZEN_COUNT; idx < COLUMNS.length; idx++) {
            totals[idx] = 0;
        }

        filteredData.forEach(row => {
            const compBreakdown = row.compBreakdown || (row.rows || []).map(() => ({}));
            const numSubRows = (row.rows || []).length;

            for (let j = 0; j < numSubRows; j++) {
                const cell = row.rows[j] || {};
                const cb = compBreakdown[j] || {};

                totals[8] += Number(cell.orderQty) || 0;

                const firstBooking = (Number(cell.finishRequiredQty) * (1 + Number(row.processLoss) / 100) + Number(cell.additional)) || 0;
                totals[9] += firstBooking;
                totals[13] += firstBooking;

                totals[10] += Number(row.processLoss) || 0;

                const lossQty = Number(cell.additional) * (Number(row.processLoss) / 100);
                const netAdditional = Number(cell.additional) - lossQty;
                const finishReqAdj = Number(cell.finishRequiredQty) + netAdditional;
                totals[11] += Number.isFinite(finishReqAdj) ? finishReqAdj : 0;

                totals[12] += Number(cell.additional) || 0;

                if (cb?.status) continue;

                const workOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');
                totals[14] += workOrderQty;
                totals[15] += firstBooking - workOrderQty;

                const yarnDelivery = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                totals[16] += yarnDelivery;
                totals[17] += workOrderQty - yarnDelivery;

                totals[18] += getBreakdownValue(cb, 'yarnDyeingOrder_Yarn_Delivery_For_Yarn_Dye');
                totals[19] += getBreakdownValue(cb, 'yarnDyeingOrder_Yarn_Received_From_Yarn_Dye');

                const greyReceived = getBreakdownValue(cb, 'knittingOrder_Grey_Fabric_Received');
                totals[21] += greyReceived;

                const yarnReturn = getBreakdownValue(cb, 'knittingOrder_Yarn_Return');
                totals[22] += yarnReturn;
                totals[23] += (greyReceived + yarnReturn) - yarnDelivery;

                const greyDelivery = getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery');
                totals[24] += greyDelivery;
                totals[25] += getBreakdownValue(cb, 'dyeingOrder_Grey_Return');

                const greyReceivedDyeing = getBreakdownValue(cb, 'dyeingOrder_Grey_Received');
                totals[26] += greyReceivedDyeing;
                totals[27] += getBreakdownValue(cb, 'dyeingOrder_Finish_Received');

                const greyReturnRcvd = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received');
                const greyReceivedFromDyeing = getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing');
                const hasGreyData = greyReturnRcvd || greyReceivedFromDyeing || greyDelivery;
                if (hasGreyData) {
                    totals[28] += greyDelivery - greyReceivedDyeing - greyReturnRcvd;
                }

                const aopSent = getBreakdownValue(cb, 'aopOrder_Sent_For_Aop');
                totals[29] += aopSent;
                totals[30] += getBreakdownValue(cb, 'aopOrder_Fabric_Return');
                totals[31] += getBreakdownValue(cb, 'aopOrder_After_Aop_Fabric_Rcvd');

                const aopReceived = getBreakdownValue(cb, 'aopOrder_Received_From_Aop');
                totals[32] += aopReceived;
                totals[33] += aopReceived - aopSent;

                if (aopSent > 0) {
                    totals[34] += ((aopSent - aopReceived) / aopSent) * 100;
                }

                const rpSent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                totals[35] += rpSent;
                totals[36] += getBreakdownValue(cb, 'reProcessOrder_Return_Received');

                const rpGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                totals[37] += rpGrey;

                const rpFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                totals[38] += rpFinish;
                totals[39] += (rpGrey + rpFinish) - rpSent;

                if (rpSent > 0) {
                    totals[40] += ((rpSent - (rpGrey + rpFinish)) / rpSent) * 100;
                }
            }
        });

        return totals;
    }, [filteredData]);

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

    const HEADER_BG = "#f3ddc7";
    const BORDER_COLOR = "#14b8a6";
    const CELL_BG = "#ffffff";

    const renderBreakdownCell = (compBreakdown, key, colIndex) => (
        <td
            className="p-0 align-top"
            style={{
                backgroundColor: CELL_BG,
                borderRight: `1px solid ${BORDER_COLOR}`,
                borderBottom: `1px solid ${BORDER_COLOR}`,
                textAlign: 'center',
                width: `${UNFROZEN_WIDTH}px`,
                minWidth: `${UNFROZEN_WIDTH}px`,
                maxWidth: `${UNFROZEN_WIDTH}px`,
            }}
        >
            <div className="divide-y divide-[#14b8a6]">
                {compBreakdown.map((cb, j) => {
                    if (cb?.status) return <div key={j} className={`px-3 py-2 subrow-cell text-black italic`}>_</div>;
                    const value = cb?.[key];
                    return <div key={j} className={`px-3 py-2 subrow-cell`}>{formatNumber(value)}</div>;
                })}
            </div>
        </td>
    );

    const getColBg = (index) => CELL_BG;

    const getFrozenStyle = (index) => ({
        position: 'sticky',
        left: `${FROZEN_LEFTS[index]}px`,
        width: `${FROZEN_WIDTHS[index]}px`,
        minWidth: `${FROZEN_WIDTHS[index]}px`,
        maxWidth: `${FROZEN_WIDTHS[index]}px`,
        zIndex: 20,
        backgroundColor: CELL_BG,
        borderRight: `1px solid ${BORDER_COLOR}`,
        borderBottom: `1px solid ${BORDER_COLOR}`,
        boxShadow: index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.1)' : 'none',
        overflow: index === FROZEN_COUNT - 1 ? 'hidden' : 'visible',
        textAlign: 'center',
    });

    const getCellStyle = (index) => ({
        backgroundColor: getColBg(index),
        borderRight: `1px solid ${BORDER_COLOR}`,
        borderBottom: `1px solid ${BORDER_COLOR}`,
        textAlign: 'center',
        width: `${UNFROZEN_WIDTH}px`,
        minWidth: `${UNFROZEN_WIDTH}px`,
        maxWidth: `${UNFROZEN_WIDTH}px`,
    });

    const getFormulaCellStyle = () => ({
        backgroundColor: CELL_BG,
        borderRight: `1px solid ${BORDER_COLOR}`,
        borderBottom: `1px solid ${BORDER_COLOR}`,
        textAlign: 'center',
        width: `${UNFROZEN_WIDTH}px`,
        minWidth: `${UNFROZEN_WIDTH}px`,
        maxWidth: `${UNFROZEN_WIDTH}px`,
    });

    const getFooterCellStyle = (index) => {
        const isFrozen = index < FROZEN_COUNT;
        return {
            position: 'sticky',
            bottom: 0,
            left: isFrozen ? `${FROZEN_LEFTS[index]}px` : 'auto',
            width: isFrozen ? `${FROZEN_WIDTHS[index]}px` : `${UNFROZEN_WIDTH}px`,
            minWidth: isFrozen ? `${FROZEN_WIDTHS[index]}px` : `${UNFROZEN_WIDTH}px`,
            maxWidth: isFrozen ? `${FROZEN_WIDTHS[index]}px` : `${UNFROZEN_WIDTH}px`,
            zIndex: isFrozen ? 60 : 55,
            backgroundColor: HEADER_BG,
            color: '#1f2937',
            borderRight: `1px solid ${BORDER_COLOR}`,
            borderTop: `2px solid ${BORDER_COLOR}`,
            borderBottom: `1px solid ${BORDER_COLOR}`,
            borderBottomLeftRadius: index === 0 ? '14px' : 0,
            borderBottomRightRadius: index === COLUMNS.length - 1 ? '14px' : 0,
            boxShadow: isFrozen && index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.2)' : 'none',
            overflow: isFrozen && index === FROZEN_COUNT - 1 ? 'hidden' : 'visible',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            padding: '10px 8px',
        };
    };

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

    // ══════════════════════════════════════════════════════════════════════════
    //  OPEN EDIT MODAL — fetches the FULL previous data (colors, compositions,
    //  additional bookings, breakdown) so the modal is pre-filled with what was
    //  saved earlier. Falls back to the summary row if the fetch fails.
    // ══════════════════════════════════════════════════════════════════════════
    const openEditJobModal = async (row) => {
        setEditLoading(true);
        try {
            // Deep clone the summary row as a safety net
            let full = null;
            try {
                const res = await axiosPrivate.get(`/api/styles/${row.id}`);
                full = res.data?.data || res.data;
            } catch (e) {
                try {
                    const res = await axiosPrivate.get(`/api/styles/job/${row.jobNo}`);
                    full = res.data?.data || res.data;
                } catch (e2) {
                    console.warn("Full job fetch failed, using summary row:", e2);
                }
            }

            const merged = {
                ...JSON.parse(JSON.stringify(row)),
                ...(full || {}),
                rows: full?.rows?.length ? full.rows : (row.rows || []),
                compBreakdown: full?.compBreakdown?.length ? full.compBreakdown : (row.compBreakdown || []),
            };

            setEditingJobData(merged);
            setShowModal(true);
        } finally {
            setEditLoading(false);
        }
    };

    const handleExportExcel = () => {
        const wsData = [];
        wsData.push(COLUMNS);

        const merges = [];
        let currentRow = 1;

        filteredData.forEach(row => {
            const compBreakdown = row.compBreakdown || row.rows.map(() => ({}));
            const numSubRows = row.rows.length;

            for (let j = 0; j < numSubRows; j++) {
                const cell = row.rows[j];
                const cb = compBreakdown[j] || {};

                const finishQty = Number(cell.finishRequiredQty) || 0;
                const processLoss = Number(row.processLoss) || 0;
                const totalRequired = finishQty + finishQty * (processLoss / 100);
                const knittingWOQty = Number(getBreakdownValue(cb, 'knittingOrder_workOrderQty')) || 0;

                const shortExcess0 = cb?.status ? "_" : (totalRequired - knittingWOQty).toFixed(2);
                const yarnDelivery = Number(getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery')) || 0;
                const shortExcess1 = totalRequired === 0 ? "_" : (totalRequired - yarnDelivery).toFixed(2);

                const yarnReturn = Number(getBreakdownValue(cb, 'knittingOrder_Yarn_Return')) || 0;
                const greyReceived = Number(getBreakdownValue(cb, 'knittingOrder_Grey_Fabric_Received')) || 0;
                const balance = (greyReceived + yarnReturn) - (knittingWOQty - yarnDelivery);

                const greyReturnRcvd = Number(getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received')) || 0;
                const greyReceivedDyeing = Number(getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing')) || 0;
                const greyDelivery = Number(getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery')) || 0;
                const greyBalance = greyReturnRcvd + greyReceivedDyeing - greyDelivery;
                const hasGreyData = greyReturnRcvd || greyReceivedDyeing || greyDelivery;

                const aopSent = Number(getBreakdownValue(cb, 'aopOrder_Sent_for_AOP')) || 0;
                const aopReceived = Number(getBreakdownValue(cb, 'aopOrder_Received_From_Aop')) || 0;
                const aopBalance = aopReceived - aopSent;
                const aopLoss = aopSent > 0 ? (((aopSent - aopReceived) / aopSent) * 100).toFixed(2) + "%" : "_";

                const rpSent = Number(getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process')) || 0;
                const rpGrey = Number(getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey')) || 0;
                const rpFinish = Number(getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish')) || 0;
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
                    cell.additional || "additional",
                    totalRequired.toFixed(2),
                    cb?.status ? "_" : knittingWOQty.toFixed(2),
                    cb?.status ? "_" : shortExcess0,
                    cb?.status ? "_" : yarnDelivery.toFixed(2),
                    cb?.status ? "_" : shortExcess1,
                    cb?.status ? "_" : (Number(getBreakdownValue(cb, 'yarnDyeingOrder_Yarn_Delivery_For_Yarn_Dye')) || 0).toFixed(2),
                    cb?.status ? "_" : (Number(getBreakdownValue(cb, 'yarnDyeingOrder_Yarn_Received_From_Yarn_Dye')) || 0).toFixed(2),
                    "-",
                    cb?.status ? "_" : greyReceived.toFixed(2),
                    cb?.status ? "_" : yarnReturn.toFixed(2),
                    cb?.status ? "_" : balance.toFixed(2),
                    cb?.status ? "_" : greyDelivery.toFixed(2),
                    cb?.status ? "_" : greyReturnRcvd.toFixed(2),
                    cb?.status ? "_" : (Number(getBreakdownValue(cb, 'dyeingOrder_Grey_Received')) || 0).toFixed(2),
                    cb?.status ? "_" : (Number(getBreakdownValue(cb, 'dyeingOrder_Finish_Received')) || 0).toFixed(2),
                    cb?.status ? "_" : (!hasGreyData ? "_" : greyBalance.toFixed(2)),
                    `${processLoss}%`,
                    cb?.status ? "_" : aopSent.toFixed(2),
                    cb?.status ? "_" : (Number(getBreakdownValue(cb, 'aopOrder_Fabric_Return')) || 0).toFixed(2),
                    cb?.status ? "_" : (Number(getBreakdownValue(cb, 'aopOrder_After_Aop_Fabric_Rcvd')) || 0).toFixed(2),
                    cb?.status ? "_" : aopReceived.toFixed(2),
                    cb?.status ? "_" : (aopSent === 0 && aopReceived === 0 ? "_" : Math.abs(aopBalance).toFixed(2)),
                    cb?.status ? "_" : aopLoss,
                    cb?.status ? "_" : rpSent.toFixed(2),
                    cb?.status ? "_" : (Number(getBreakdownValue(cb, 'reProcessOrder_Return_Received')) || 0).toFixed(2),
                    cb?.status ? "_" : rpGrey.toFixed(2),
                    cb?.status ? "_" : rpFinish.toFixed(2),
                    cb?.status ? "_" : (rpSent === 0 && rpGrey === 0 && rpFinish === 0 ? "_" : Math.abs(rpBalance).toFixed(2)),
                    cb?.status ? "_" : rpLoss,
                ]);
            }

            if (numSubRows > 1) {
                for (let col = 0; col < 5; col++) {
                    merges.push({
                        s: { r: currentRow, c: col },
                        e: { r: currentRow + numSubRows - 1, c: col }
                    });
                }
            }
            currentRow += numSubRows;
        });

        const totalRow = new Array(COLUMNS.length).fill("");
        totalRow[0] = "TOTAL";
        for (let idx = FROZEN_COUNT; idx < COLUMNS.length; idx++) {
            if (NO_TOTAL_COLUMN_INDEXES.has(idx)) continue;
            const val = (footerTotals[idx] || 0).toFixed(2);
            totalRow[idx] = PERCENT_COLUMN_INDEXES.has(idx) ? `${val}%` : val;
        }
        wsData.push(totalRow);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = COLUMNS.map((_, i) => ({ wch: i < FROZEN_COUNT ? 20 : 18 }));
        ws['!merges'] = merges;

        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) continue;
                if (!ws[cellAddress].s) ws[cellAddress].s = {};
                ws[cellAddress].s.alignment = { horizontal: "center", vertical: "center" };
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Summary");
        XLSX.writeFile(wb, `Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // ══════════════════════════════════════════════════════════════════════════
    //  PDF — now includes an "Additional Booking" column (highlighted) so any
    //  additional qty added through the modal appears on the booking sheet.
    // ══════════════════════════════════════════════════════════════════════════
    const generatePDFBooking = (rowData) => {
        const printWindow = window.open('', '_blank');

        const processLoss = Number(rowData.processLoss) || 0;
        const rows = rowData.rows || [];

        let rowsHtml = '';
        let grandOrder = 0;
        let grandAdditional = 0;
        let grandTotal = 0;

        rows.forEach((row) => {
            const finishQty = Number(row.finishRequiredQty) || 0;
            const additional = Number(row.additional) || 0;
            const totalRequired = finishQty * (1 + processLoss / 100) + additional;

            grandOrder += finishQty;
            grandAdditional += additional;
            grandTotal += totalRequired;

            rowsHtml += `
                <tr>
                    <td>${rowData.styleNo || ''}</td>
                    <td>${rowData.poNo || ''}</td>
                    <td>${row.color || ''}</td>
                    <td>${row.composition || ''}</td>
                    <td>${rowData.hod || ''}</td>
                    <td>${finishQty.toFixed(2)}</td>
                    <td class="${additional > 0 ? 'add-cell' : ''}">${additional > 0 ? additional.toFixed(2) : '-'}</td>
                    <td>${totalRequired.toFixed(2)}</td>
                    <td>${row.finishDia || ''}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>${totalRequired.toFixed(2)}</td>
                    <td>${totalRequired.toFixed(2)}</td>
                    <td>BODY-Solid</td>
                </tr>
            `;
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fabric Booking Sheet - ${rowData.jobNo}</title>
                <style>
                    @media print {
                        @page { margin: 0.5in; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        font-size: 12px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .header h1 { margin: 5px 0; font-size: 18px; }
                    .header h2 { margin: 5px 0; font-size: 16px; }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    th, td {
                        border: 1px solid #000;
                        padding: 6px;
                        text-align: center;
                        font-size: 10px;
                    }
                    th { background-color: #f3ddc7; font-weight: bold; }
                    th.add-head { background-color: #fde68a; }
                    td.add-cell { background-color: #fef3c7; font-weight: bold; color: #92400e; }
                    tfoot td { background-color: #f3ddc7; font-weight: bold; }
                    .footer {
                        margin-top: 30px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature {
                        text-align: center;
                        margin-top: 40px;
                    }
                    button { margin: 10px 5px; padding: 8px 16px; cursor: pointer; }
                </style>
            </head>
            <body>
                <div style="text-align: right; margin-bottom: 10px;">
                    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
                    <button onclick="window.close()">Close</button>
                </div>

                <div class="header">
                    <h1>SM SOURCING</h1>
                    <h2>Fabric Booking Sheet</h2>
                </div>

                <div class="info-row">
                    <div>
                        <strong>Buyer:</strong> ${rowData.buyerName || ''}<br/>
                        <strong>Process loss below 8%.</strong>
                    </div>
                    <div style="text-align: center;">
                        <strong>HOD:</strong> ${rowData.hod || 'N/A'}
                    </div>
                    <div style="text-align: right;">
                        <strong>JOB NO:</strong> ${rowData.jobNo}<br/>
                        <strong>Date:</strong> ${new Date().toLocaleDateString()}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Style No</th>
                            <th>PO No</th>
                            <th>Color</th>
                            <th>Fabrication</th>
                            <th>HOD</th>
                            <th>Order Qty</th>
                            <th class="add-head">Additional Booking</th>
                            <th>Total Booking</th>
                            <th>Finished fab. Width</th>
                            <th>Consumption PCS</th>
                            <th>F. Fab</th>
                            <th>2x1 rib lycra</th>
                            <th>Total fabric</th>
                            <th>Yarn req.</th>
                            <th>Type Of work order</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5">TOTAL</td>
                            <td>${grandOrder.toFixed(2)}</td>
                            <td class="add-cell">${grandAdditional.toFixed(2)}</td>
                            <td>${grandTotal.toFixed(2)}</td>
                            <td colspan="7"></td>
                        </tr>
                    </tfoot>
                </table>

                <div class="footer">
                    <div>
                        <p>Thanks &amp; Best regards</p>
                    </div>
                    <div>
                        <p>CC To:</p>
                    </div>
                    <div class="signature">
                        <p>Approved by:</p>
                        <p style="margin-top: 40px;">_________________</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleToggleRow = (rowId) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(rowId)) {
            newSelected.delete(rowId);
        } else {
            newSelected.add(rowId);
        }
        setSelectedRows(newSelected);
    };

    const handleGenerateSelectedPDFs = () => {
        if (selectedRows.size === 0) {
            alert("Please select at least one row to generate PDF");
            return;
        }

        selectedRows.forEach(rowId => {
            const rowData = filteredData.find(r => r.id === rowId);
            if (rowData) {
                generatePDFBooking(rowData);
            }
        });
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
                    onClick={() => {
                        setEditingJobData(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <PlusCircle size={18} /> Add Job
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

                {selectedRows.size > 0 && (
                    <button
                        onClick={handleGenerateSelectedPDFs}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors border border-blue-600"
                    >
                        <FileText size={18} /> Generate PDF ({selectedRows.size})
                    </button>
                )}

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
                            <Filter size={14} className="text-teal-600" />
                            {Object.entries(activeFilters).map(([colKey, values]) => {
                                const colIndex = KEY_TO_INDEX[colKey];
                                return (
                                    <span
                                        key={colKey}
                                        className="flex items-center gap-1 px-2 py-1 bg-teal-50 border border-[#14b8a6] text-teal-700 text-xs rounded-full font-medium"
                                    >
                                        {colIndex !== undefined ? COLUMNS[colIndex] : colKey}
                                        <span className="bg-teal-200 text-teal-800 rounded-full px-1 text-xs">{values.length}</span>
                                        <button onClick={() => colIndex !== undefined && clearFilter(colIndex)} className="ml-0.5 text-teal-400 hover:text-teal-700">
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

            {showModal && (
                <StyleReqModal
                    setRawData={setRawData}
                    setShowModal={setShowModal}
                    editData={editingJobData}
                    onSaved={() => {
                        fetchFilteredData();
                        setShowModal(false);
                        setEditingJobData(null);
                    }}
                />
            )}

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
                .subrow-cell {
                    min-height: 42px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                }
            `}</style>


            <div
                ref={scrollContainerRef}
                className="relative overflow-auto shadow-xs"
                style={{ maxHeight: 'calc(100vh - 250px)', border: `1px solid ${BORDER_COLOR}`, borderRadius: '14px' }}
            >
                <table
                    className="w-full text-sm text-left rtl:text-right text-body"
                    style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                >
                    <thead className="sticky top-0 z-30 text-sm text-body">
                        <tr>
                            {/* Checkbox Column Header */}
                            <th
                                scope="col"
                                className="px-3 py-3 font-medium"
                                style={{
                                    backgroundColor: HEADER_BG,
                                    position: 'sticky',
                                    left: '0px',
                                    width: `${CHECKBOX_WIDTH}px`,
                                    minWidth: `${CHECKBOX_WIDTH}px`,
                                    maxWidth: `${CHECKBOX_WIDTH}px`,
                                    zIndex: 50,
                                    borderRight: `1px solid ${BORDER_COLOR}`,
                                    borderBottom: `2px solid ${BORDER_COLOR}`,
                                    borderTopLeftRadius: '14px',
                                    textAlign: 'center',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const allIds = new Set(paginatedData.map(r => r.id));
                                            setSelectedRows(allIds);
                                        } else {
                                            setSelectedRows(new Set());
                                        }
                                    }}
                                    checked={paginatedData.length > 0 && paginatedData.every(r => selectedRows.has(r.id))}
                                    className="rounded text-teal-600"
                                />
                            </th>
                            {COLUMNS.map((col, index) => {
                                const isFilterable = index in FILTERABLE_COLS;
                                const hasFilter = isFilterable && !!activeFilters[FILTERABLE_COLS[index].key];
                                const isFrozen = index < FROZEN_COUNT;

                                return (
                                    <th
                                        key={index}
                                        scope="col"
                                        className="px-3 py-3 font-medium whitespace-normal break-words"
                                        style={{
                                            backgroundColor: HEADER_BG,
                                            position: 'sticky',
                                            left: isFrozen ? `${FROZEN_LEFTS[index]}px` : 'auto',
                                            width: isFrozen ? `${FROZEN_WIDTHS[index]}px` : `${UNFROZEN_WIDTH}px`,
                                            minWidth: isFrozen ? `${FROZEN_WIDTHS[index]}px` : `${UNFROZEN_WIDTH}px`,
                                            maxWidth: isFrozen ? `${FROZEN_WIDTHS[index]}px` : `${UNFROZEN_WIDTH}px`,
                                            zIndex: isFrozen ? 45 : 35,
                                            borderRight: `1px solid ${BORDER_COLOR}`,
                                            borderBottom: `2px solid ${BORDER_COLOR}`,
                                            borderTopRightRadius: index === COLUMNS.length - 1 ? '14px' : 0,
                                            boxShadow: index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.15)' : 'none',
                                            overflow: index === FROZEN_COUNT - 1 ? 'hidden' : 'visible',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <div className="flex items-center gap-1 justify-center flex-wrap">
                                            <span className="flex-1 text-center break-words">{col}</span>
                                            {isFilterable && (
                                                <button
                                                    ref={el => filterBtnRefs.current[index] = el}
                                                    onClick={(e) => openFilterDropdown(index, e)}
                                                    title={hasFilter ? "Filter active" : "Filter"}
                                                    className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors ${hasFilter
                                                        ? 'bg-teal-600 text-white'
                                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
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
                                <td colSpan={COLUMNS.length + 1} className="px-4 py-20 text-center align-middle">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <RefreshCcw size={24} className="animate-spin text-teal-600" />
                                        <span className="text-sm font-medium text-gray-500">Loading summary data...</span>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!isLoading.refreshLoading && paginatedData.map((row, i) => {
                            const compBreakdown = row.compBreakdown || row.rows.map(() => ({}));
                            const isSelected = selectedRows.has(row.id);

                            return (
                                <tr key={row.id || i} className={`group ${isSelected ? 'bg-blue-50' : ''}`}>
                                    {/* Checkbox Column */}
                                    <td
                                        className="px-3 py-2 align-middle"
                                        style={{
                                            position: 'sticky',
                                            left: '0px',
                                            width: `${CHECKBOX_WIDTH}px`,
                                            minWidth: `${CHECKBOX_WIDTH}px`,
                                            maxWidth: `${CHECKBOX_WIDTH}px`,
                                            zIndex: 25,
                                            backgroundColor: isSelected ? '#eff6ff' : CELL_BG,
                                            borderRight: `1px solid ${BORDER_COLOR}`,
                                            borderBottom: `1px solid ${BORDER_COLOR}`,
                                            textAlign: 'center',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleRow(row.id)}
                                            className="rounded text-teal-600"
                                        />
                                    </td>

                                    {/* 1. SALES CONTACT */}
                                    <td onClick={() => handleEdit(row.id, "salesContact", row.salesContact)} className={`px-3 py-2 align-middle group-hover:bg-teal-50/40`} style={getFrozenStyle(0)}>
                                        {editingCells[`${row.id}-salesContact`] ? (
                                            <input
                                                value={editingCells[`${row.id}-salesContact`].value}
                                                onChange={(e) => handleOnChange(e, `${row.id}-salesContact`)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
                                                type="text"
                                            />
                                        ) : row.salesContact}
                                    </td>

                                    {/* 2. BUYER */}
                                    <td onClick={() => handleEdit(row.id, "buyerName", row.buyerName)} className={`px-3 py-2 align-middle group-hover:bg-teal-50/40`} style={getFrozenStyle(1)}>
                                        {editingCells[`${row.id}-buyerName`] ? (
                                            <input
                                                value={editingCells[`${row.id}-buyerName`].value}
                                                onChange={(e) => handleOnChange(e, `${row.id}-buyerName`)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
                                                type="text"
                                            />
                                        ) : row.buyerName}
                                    </td>

                                    {/* 3. JOB NO (With Edit Button) */}
                                    <td className={`px-3 py-2 align-middle group-hover:bg-teal-50/40`} style={getFrozenStyle(2)}>
                                        <div className="flex items-center justify-center gap-2">
                                            <span
                                                onDoubleClick={() => handleRedirect(row.jobNo)}
                                                onClick={() => handleEdit(row.id, "jobNo", row.jobNo)}
                                                className="cursor-pointer hover:text-teal-700 flex-1 text-center break-words"
                                            >
                                                {editingCells[`${row.id}-jobNo`] ? (
                                                    <input
                                                        value={editingCells[`${row.id}-jobNo`].value}
                                                        onChange={(e) => handleOnChange(e, `${row.id}-jobNo`)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
                                                        type="text"
                                                    />
                                                ) : row.jobNo}
                                            </span>
                                            <button
                                                disabled={editLoading}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditJobModal(row);
                                                }}
                                                className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-md transition-colors flex-shrink-0 disabled:opacity-50"
                                                title="Edit Job Details (Colors, Compositions, Additional Booking, etc.)"
                                            >
                                                {editLoading ? <Loader size={16} className="animate-spin" /> : <Pen size={16} />}
                                            </button>
                                        </div>
                                    </td>

                                    {/* 4. STYLE */}
                                    <td onClick={() => handleEdit(row.id, "styleNo", row.styleNo, "styleRequirement")} className={`px-3 py-2 align-middle group-hover:bg-teal-50/40`} style={getFrozenStyle(3)}>
                                        {editingCells[`${row.id}-styleNo`] ? (
                                            <input
                                                value={editingCells[`${row.id}-styleNo`].value}
                                                onChange={(e) => {
                                                    e.target.style.width = `${Math.max(e.target.value.length, 5)}ch`;
                                                    handleOnChange(e, `${row.id}-styleNo`);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="border border-indigo-600 bg-indigo-100 outline-none p-2 rounded-md text-indigo-900 text-center"
                                                type="text"
                                                style={{ width: `${Math.max(row.styleNo?.length || 1, 5)}ch` }}
                                            />
                                        ) : row.styleNo}
                                    </td>

                                    {/* 5. PO NO */}
                                    <td onClick={() => handleEdit(row.id, "poNo", row.poNo, "styleRequirement")} className={`px-3 py-2 align-middle group-hover:bg-teal-50/40`} style={getFrozenStyle(4)}>
                                        {editingCells[`${row.id}-poNo`] ? (
                                            <input
                                                value={editingCells[`${row.id}-poNo`].value}
                                                onChange={(e) => {
                                                    e.target.style.width = `${Math.max(e.target.value.length, 5)}ch`;
                                                    handleOnChange(e, `${row.id}-poNo`);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="border border-indigo-600 bg-indigo-100 outline-none p-2 rounded-md text-indigo-900 text-center"
                                                type="text"
                                                style={{ width: `${Math.max(row.poNo?.length || 1, 5)}ch` }}
                                            />
                                        ) : row.poNo}
                                    </td>

                                    {/* 6. COLOR */}
                                    <td className="p-0 align-top group-hover:bg-teal-50/40" style={getFrozenStyle(5)}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "color", cell.color, "styleRequirementRows")} key={j} className={`px-3 py-2 subrow-cell`}>
                                                    {editingCells[`${cell.id}-color`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-color`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-color`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
                                                            type="text"
                                                        />
                                                    ) : (
                                                        <span className="inline-block px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium border border-teal-200">
                                                            {cell.color}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 7. COMPOSITION */}
                                    <td className="p-0 align-top group-hover:bg-teal-50/40" style={getFrozenStyle(6)}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "composition", cell.composition, "styleRequirementRows")} key={j} className={`px-3 py-2 subrow-cell`} title={cell.composition}>
                                                    {editingCells[`${cell.id}-composition`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-composition`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-composition`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
                                                            type="text"
                                                        />
                                                    ) : (
                                                        <span className="block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                                            {cell.composition}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 8. FINISH DIA */}
                                    <td className="p-0 align-top" style={getFrozenStyle(7)}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "finishDia", cell.finishDia, "styleRequirementRows")} key={j} className={`px-3 py-2 subrow-cell`}>
                                                    {editingCells[`${cell.id}-finishDia`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-finishDia`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-finishDia`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
                                                            type="text"
                                                        />
                                                    ) : formatNumber(cell.finishDia, cell.finishDia)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 9. ORDER QTY - NO TOFIXED */}
                                    <td className="p-0 align-top" style={getCellStyle(8)}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "orderQty", cell.orderQty, "styleRequirementRows")} key={j} className={`px-3 py-2 subrow-cell`}>
                                                    {editingCells[`${cell.id}-orderQty`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-orderQty`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-orderQty`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
                                                            type="text"
                                                        />
                                                    ) : (cell.orderQty !== undefined && cell.orderQty !== null && cell.orderQty !== "" ? cell.orderQty : "_")}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 10. 1st BOOKING (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className={`px-3 py-2 subrow-cell`}>
                                                    {(Number(cell.finishRequiredQty) * (1 + Number(row.processLoss) / 100) + Number(cell.additional)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* PROCESS LOSS % */}
                                    <td className="p-0 align-top" style={getCellStyle(10)}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((_, j) => <div key={j} className={`px-3 py-2 subrow-cell`}>{Number(row.processLoss || 0).toFixed(2)}%</div>)}
                                        </div>
                                    </td>

                                    {/* 11. FINISH REQUIRED QTY */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => {
                                                const lossQty = Number(cell.additional) * (Number(row.processLoss) / 100);
                                                const netAdditional = Number(cell.additional) - lossQty;
                                                const inCreaseFinishQty = (Number(cell.finishRequiredQty) + netAdditional).toFixed(2);
                                                return (
                                                    <div
                                                        key={j}
                                                        onClick={() => handleEdit(cell.id, "finishRequiredQty", cell.finishRequiredQty, "styleRequirementRows")}
                                                        className={`px-3 py-2 subrow-cell`}
                                                    >
                                                        {editingCells[`${cell.id}-finishRequiredQty`] ? (
                                                            <input
                                                                value={editingCells[`${cell.id}-finishRequiredQty`].value}
                                                                onChange={(e) => handleOnChange(e, `${cell.id}-finishRequiredQty`)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
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

                                    {/* ADDITIONAL BOOKING */}
                                    <td className="p-0 align-top" style={getCellStyle(12)}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => (
                                                <div onClick={() => handleEdit(cell.id, "additional", cell.additional, "compositionAdd")} key={j} className={`px-3 py-2 subrow-cell`}>
                                                    {editingCells[`${cell.id}-additional`] ? (
                                                        <input
                                                            value={editingCells[`${cell.id}-additional`].value}
                                                            onChange={(e) => handleOnChange(e, `${cell.id}-additional`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="border border-indigo-600 bg-indigo-100 outline-none w-full p-2 rounded-md text-indigo-900 text-center"
                                                            type="text"
                                                        />
                                                    ) : (
                                                        formatNumber(cell.additional, cell.additional || "-")
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 12. REQUIRED YARN QTY (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className={`px-3 py-2 subrow-cell`}>
                                                    {(Number(cell.finishRequiredQty) * (1 + Number(row.processLoss) / 100) + Number(cell.additional)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 13. KNITTING WORK ORDER QTY */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_workOrderQty', 14)}

                                    {/* 14. SHORT & EXCESS (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => {
                                                const cb = compBreakdown[j] || {};
                                                if (cb.status) return <div key={j} className={`px-3 py-2 subrow-cell text-gray-400`}>_</div>;
                                                const finishRequiredQty = cell.finishRequiredQty || 0;
                                                const processLoss = row.processLoss || 0;
                                                const knittingWorkOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');
                                                const diff0 = (Number(finishRequiredQty) * (1 + Number(processLoss) / 100) + Number(cell.additional || 0)) - Number(knittingWorkOrderQty);
                                                const isExceeded0 = diff0 > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 subrow-cell ${isExceeded0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}`}>
                                                        {isExceeded0 ? `(${diff0.toFixed(2)})` : Math.abs(diff0).toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 15. YARN DELIVERY */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Yarn_Delivery', 16)}

                                    {/* 16. SHORT & EXCESS (+/-) (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((cell, j) => {
                                                const cb = compBreakdown[j] || {};
                                                if (cb.status) return <div key={j} className={`px-3 py-2 subrow-cell text-gray-400`}>_</div>;

                                                const delivered = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                                                const workOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');

                                                const diff1 = workOrderQty - delivered;
                                                const isExcess = diff1 > 0;

                                                return (
                                                    <div key={j} className={`px-3 py-2 subrow-cell ${isExcess ? "text-green-600 font-bold" : "text-red-600 font-bold"}`}>
                                                        {delivered === 0 && workOrderQty === 0 ? "_" : isExcess ? `(${diff1.toFixed(2)})` : Math.abs(diff1).toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 17. RAW YARN DELIVERY FOR DYED */}
                                    {renderBreakdownCell(compBreakdown, 'yarnDyeingOrder_Yarn_Delivery_For_Yarn_Dye', 18)}

                                    {/* 18. YARN RECEIVED AFTER DYED */}
                                    {renderBreakdownCell(compBreakdown, 'yarnDyeingOrder_Yarn_Received_From_Yarn_Dye', 19)}

                                    {/* 19. PARTY STOCK */}
                                    <td className="p-0 align-top" style={getCellStyle(20)}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {row.rows.map((_, j) => <div key={j} className={`px-3 py-2 subrow-cell`}>-</div>)}
                                        </div>
                                    </td>

                                    {/* 20. TOTAL KNITTING (GREY) */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Grey_Fabric_Received', 21)}

                                    {/* 21. RETURN YARN RECEIVED */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Yarn_Return', 22)}

                                    {/* 22. BALANCE (+/-) (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className={`px-3 py-2 subrow-cell text-gray-400`}>_</div>;
                                                const yarnDelivery = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                                                const yarnReturn = getBreakdownValue(cb, 'knittingOrder_Yarn_Return');
                                                const greyReceived = getBreakdownValue(cb, 'knittingOrder_Grey_Fabric_Received');
                                                const balance = (greyReceived + yarnReturn) - yarnDelivery;
                                                return (
                                                    <div key={j} className={`px-3 py-2 subrow-cell font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                        {balance === 0 ? "_" : balance.toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 23. GREY DELIVERY FOR DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Delivery', 24)}

                                    {/* 24. GREY RETURN FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Return', 25)}

                                    {/* 25. GREY RECEIVED FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Received', 26)}

                                    {/* 26. FINISH RECEIVED FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Finish_Received', 27)}

                                    {/* 27. GREY BALANCE (+/-) (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className={`px-3 py-2 subrow-cell text-gray-400`}>_</div>;
                                                const diff = getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery') - getBreakdownValue(cb, 'dyeingOrder_Grey_Received') -
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received');
                                                const isExceeded = diff > 0;
                                                const hasAnyData = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received') ||
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing') ||
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery');
                                                return (
                                                    <div key={j} className={`px-3 py-2 subrow-cell ${isExceeded ? "text-green-600 font-bold" : "font-bold text-red-600"}`}>
                                                        {!hasAnyData ? "_" : (isExceeded ? `(${diff.toFixed(2)})` : Math.abs(diff).toFixed(2))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 29. FINISH DELIVERY FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Sent_For_Aop', 29)}

                                    {/* 30. FABRIC RETURN FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Fabric_Return', 30)}

                                    {/* 31. AFTER AOP FABRIC RCVD */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_After_Aop_Fabric_Rcvd', 31)}

                                    {/* 32. FINISH RECEIVED FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Received_From_Aop', 32)}

                                    {/* 33. AOP FAB. BALANCE (+/-) (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className={`px-3 py-2 subrow-cell text-gray-400`}>_</div>;
                                                const sent = getBreakdownValue(cb, 'aopOrder_Sent_For_Aop');
                                                const received = getBreakdownValue(cb, 'aopOrder_Received_From_Aop');
                                                const diff = received - sent;
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 subrow-cell ${isExceeded ? "text-green-600 font-bold" : "font-bold text-red-600"}`}>
                                                        {sent === 0 && received === 0 ? "_" : (isExceeded ? `(${Math.abs(diff).toFixed(2)})` : Math.abs(diff).toFixed(2))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 34. AOP PROCESS LOSS (%) (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className={`px-3 py-2 subrow-cell text-gray-400`}>_</div>;
                                                const sent = getBreakdownValue(cb, 'aopOrder_Sent_For_Aop');
                                                const received = getBreakdownValue(cb, 'aopOrder_Received_From_Aop');
                                                const loss = sent > 0 ? (((sent - received) / sent) * 100).toFixed(2) : "_";
                                                return <div key={j} className={`px-3 py-2 subrow-cell`}>{loss === "_" ? "_" : `${loss}%`}</div>;
                                            })}
                                        </div>
                                    </td>

                                    {/* 35. SENT FOR RE-PROCESS */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Sent_for_Re_Process', 35)}

                                    {/* 36. RETURN RCVD */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Return_Received', 36)}

                                    {/* 37. RECEIVED AFTER RE-PROCESS (GREY) */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Received_After_Re_Process_Grey', 37)}

                                    {/* 38. RECEIVED AFTER RE-PROCESS (FINISH) */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Received_After_Re_Process_Finish', 38)}

                                    {/* 39. RE-PROCESS FAB. BALANCE (+/-) (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className={`px-3 py-2 subrow-cell text-gray-400`}>_</div>;
                                                const sent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                                                const receivedGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                                                const receivedFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                                                const diff = (receivedGrey + receivedFinish) - sent;
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 subrow-cell ${isExceeded ? "text-green-600 font-bold" : "font-bold text-red-600"}`}>
                                                        {sent === 0 && receivedGrey === 0 && receivedFinish === 0 ? "_" : (isExceeded ? `(${diff.toFixed(2)})` : Math.abs(diff).toFixed(2))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 40. RE-PROCESS PROCESS LOSS (%) (formula) */}
                                    <td className="p-0 align-top" style={getFormulaCellStyle()}>
                                        <div className="divide-y divide-[#14b8a6]">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className={`px-3 py-2 subrow-cell text-gray-400`}>_</div>;
                                                const sent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                                                const receivedGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                                                const receivedFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                                                const loss = sent > 0 ? (((sent - (receivedGrey + receivedFinish)) / sent) * 100).toFixed(2) : "_";
                                                return <div key={j} className={`px-3 py-2 subrow-cell`}>{loss === "_" ? "_" : `${loss}%`}</div>;
                                            })}
                                        </div>
                                    </td>

                                </tr>
                            );
                        })}

                        {!isLoading.refreshLoading && paginatedData.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNS.length + 1} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    No rows match the active filters.
                                </td>
                            </tr>
                        )}
                    </tbody>

                    {/* FOOTER TOTAL ROW */}
                    {!isLoading.refreshLoading && filteredData.length > 0 && !isAnyModalOpen && (
                        <tfoot>
                            <tr>
                                {/* Merged TOTAL cell spanning checkbox + all frozen columns (9 columns total) */}
                                <td
                                    colSpan={FROZEN_COUNT + 1}
                                    style={{
                                        position: 'sticky',
                                        bottom: 0,
                                        left: '0px',
                                        backgroundColor: HEADER_BG,
                                        color: '#1f2937',
                                        borderRight: `1px solid ${BORDER_COLOR}`,
                                        borderTop: `2px solid ${BORDER_COLOR}`,
                                        borderBottom: `1px solid ${BORDER_COLOR}`,
                                        borderBottomLeftRadius: '14px',
                                        zIndex: 65,
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        whiteSpace: 'nowrap',
                                        padding: '10px 8px',
                                    }}
                                >
                                    TOTAL
                                </td>
                                {/* Only render cells for non-frozen columns (index 8 onwards) */}
                                {COLUMNS.slice(FROZEN_COUNT).map((_, idx) => {
                                    const colIndex = idx + FROZEN_COUNT;
                                    let displayValue = "";

                                    if (!NO_TOTAL_COLUMN_INDEXES.has(colIndex)) {
                                        const sum = formatNumber(footerTotals[colIndex]);
                                        displayValue = (sum !== "_" && PERCENT_COLUMN_INDEXES.has(colIndex)) ? `${sum}%` : sum;
                                    }

                                    return (
                                        <td
                                            key={`footer-${colIndex}`}
                                            style={{
                                                position: 'sticky',
                                                bottom: 0,
                                                backgroundColor: HEADER_BG,
                                                color: '#1f2937',
                                                borderRight: `1px solid ${BORDER_COLOR}`,
                                                borderTop: `2px solid ${BORDER_COLOR}`,
                                                borderBottom: `1px solid ${BORDER_COLOR}`,
                                                borderBottomRightRadius: colIndex === COLUMNS.length - 1 ? '14px' : 0,
                                                zIndex: 55,
                                                textAlign: 'center',
                                                fontWeight: 700,
                                                fontSize: '0.8rem',
                                                whiteSpace: 'nowrap',
                                                padding: '10px 8px',
                                                width: `${UNFROZEN_WIDTH}px`,
                                                minWidth: `${UNFROZEN_WIDTH}px`,
                                                maxWidth: `${UNFROZEN_WIDTH}px`,
                                            }}
                                        >
                                            {displayValue}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border border-t-0 shadow-xs" style={{ borderColor: BORDER_COLOR, borderRadius: '0 0 14px 14px' }}>
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
                                            ? 'bg-teal-600 text-white z-10'
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