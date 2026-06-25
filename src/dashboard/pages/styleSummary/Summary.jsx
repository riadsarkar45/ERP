import { useEffect, useState, useRef, useCallback } from "react";
import { PlusCircle, RefreshCcw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Filter, X, Search, ChevronDown as DropIcon } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import StyleReqModal from "../../../components/StyleReqModal";
import useAxiosPublic from "../../../hooks/Axios";
import { useNavigate } from "react-router-dom";

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
    "SALES CONTACT NO", "BUYER", "JOB NO", "STYLE", "PO NO", "COLOR", "COMPOSITION",
    "FINISH DIA", "ORDER QTY", "1st BOOKING", "ADDITIONAL BOOKING",
    "REQUIRED YARN QTY", "KNITTING WORK ORDER QTY",
    "SHORT & EXCESS", "YARN DELIVERY", "SHORT & EXCESS (+/-)",
    "RAW YARN DELIVERY FOR DYED", "YARN RECEIVED AFTER DYED",
    "PARTY STOCK (SHORT & EXCESS)", "TOTAL KNITTING (GREY)", "RETURN YARN RECEIVED",
    "BALANCE (+/-)", "GREY DELIVERY FOR DYEING", "GREY RETURN FROM DYEING",
    "GREY RECEIVED FROM DYEING",
    "FINISH RECEIVED FROM DYEING", "GREY BALANCE (+/-)", "PROCESS LOSS %",
    "FINISH DELIVERY FROM AOP", "FINISH RECEIVED FROM AOP", "AOP FAB. BALANCE (+/-)",
    "AOP PROCESS LOSS (%)", "SENT FOR RE-PROCESS", "RETURN RCVD",
    "RECEIVED AFTER RE-PROCESS (GREY)", "RECEIVED AFTER RE-PROCESS (FINISH)",
    "RE-PROCESS FAB. BALANCE (+/-)", "RE-PROCESS PROCESS LOSS (%)",
];

// ── Filterable columns config ─────────────────────────────────────────────────
// type "row"    → value lives directly on the row object
// type "subrow" → value lives in row.rows[] sub-array; row matches if ANY sub-row matches
const FILTERABLE_COLS = {
    0: { key: "salesContact",  type: "row" },
    1: { key: "buyerName",     type: "row" },
    2: { key: "jobNo",         type: "row" },
    3: { key: "styleNo",       type: "row" },
    4: { key: "poNo",          type: "row" },
    5: { key: "color",         type: "subrow" },
    6: { key: "composition",   type: "subrow" },
};

// ── Frozen column widths ─────────────────────────────────────────────────────
const FROZEN_WIDTHS = [150, 120, 180, 100, 120, 250, 280];
const FROZEN_COUNT = FROZEN_WIDTHS.length;

const FROZEN_LEFTS = FROZEN_WIDTHS.reduce((acc, width, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + FROZEN_WIDTHS[idx - 1]);
    return acc;
}, []);

// ── Helper ───────────────────────────────────────────────────────────────────
const getBreakdownValue = (item, key) => {
    if (!item) return 0;
    if (item.status) return 0;
    return Number(item[key]) || 0;
};

// ── Filter Dropdown Component ─────────────────────────────────────────────────
function FilterDropdown({ colIndex, colLabel, allValues, activeValues, onApply, onClear, onClose, anchorRef }) {
    const [search, setSearch] = useState("");
    // activeValues=null means no filter saved → start all checked
    const [selected, setSelected] = useState(
        activeValues !== null ? new Set(activeValues) : new Set(allValues)
    );
    const dropRef = useRef(null);

    // Close on outside click
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
                border: "1px solid #d1d5db",
                borderRadius: 6,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: 220,
                maxWidth: 280,
            }}
            className="filter-dropdown"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide truncate">{colLabel}</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
                    <X size={13} />
                </button>
            </div>

            {/* Search */}
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

            {/* Select All */}
            <div className="px-3 py-1.5 border-b border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        className="rounded text-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-600">Select All</span>
                    <span className="ml-auto text-xs text-gray-400">{selected.size}/{allValues.length}</span>
                </label>
            </div>

            {/* Values list */}
            <div style={{ maxHeight: 200, overflowY: "auto" }} className="py-1">
                {filtered.length === 0 ? (
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

            {/* Actions */}
            <div className="flex gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50">
                <button
                    onClick={() => { onApply(selected); onClose(); }}
                    className="flex-1 text-xs bg-blue-500 text-white rounded px-3 py-1.5 font-medium hover:bg-blue-600 transition-colors"
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
    const axiosPublic = useAxiosPublic();
    const [rawData, setRawData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);

    // Filter state: { colIndex: Set<string> }
    const [activeFilters, setActiveFilters] = useState({});
    // Which dropdown is open: colIndex or null
    const [openFilter, setOpenFilter] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    // Position of open dropdown
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const filterBtnRefs = useRef({});

    useEffect(() => {
        axiosPublic.get("/api/styles").then((res) => {
            setRawData(res.data.data);
        }).catch(e => console.error(e));
    }, [axiosPublic]);

    const handleRedirect = (jobNumber) => navigate(`/dashboard/new-order/${jobNumber}`);

    const scrollHorizontal = (direction) => {
        scrollContainerRef.current?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    };
    const scrollVertical = (direction) => {
        scrollContainerRef.current?.scrollBy({ top: direction === 'up' ? -150 : 150, behavior: 'smooth' });
    };

    // ── Get unique values for a column filtered by all OTHER active filters ───
    // Mirrors Excel: the dropdown for column X only shows values that exist in
    // the data remaining after every other active filter has been applied.
    const getColValues = useCallback((colIndex) => {
        const col = FILTERABLE_COLS[colIndex];
        if (!col) return [];

        // Filter rawData by every active filter except colIndex's own
        const otherFiltered = rawData.filter(row =>
            Object.entries(activeFilters).every(([ci, selectedSet]) => {
                if (Number(ci) === colIndex) return true;
                if (!selectedSet || selectedSet.size === 0) return true;
                const c = FILTERABLE_COLS[Number(ci)];
                if (!c) return true;
                if (c.type === "row") return selectedSet.has(String(row[c.key] ?? ""));
                return (row.rows || []).some(sr => selectedSet.has(String(sr[c.key] ?? "")));
            })
        );

        if (col.type === "row") {
            const set = new Set(otherFiltered.map(row => String(row[col.key] ?? "")));
            return Array.from(set).sort();
        }
        const set = new Set();
        otherFiltered.forEach(row => (row.rows || []).forEach(sr => set.add(String(sr[col.key] ?? ""))));
        return Array.from(set).sort();
    }, [rawData, activeFilters]);

    // ── Filtered data ─────────────────────────────────────────────────────────
    const filteredData = rawData.filter(row => {
        return Object.entries(activeFilters).every(([colIndex, selectedSet]) => {
            if (!selectedSet || selectedSet.size === 0) return true;
            const col = FILTERABLE_COLS[Number(colIndex)];
            if (!col) return true;
            if (col.type === "row") {
                return selectedSet.has(String(row[col.key] ?? ""));
            }
            // subrow: row passes if at least one sub-row value is in selectedSet
            return (row.rows || []).some(sr => selectedSet.has(String(sr[col.key] ?? "")));
        });
    });

    const openFilterDropdown = (colIndex, e) => {
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
    };

    const applyFilter = (colIndex, selectedSet) => {
        setActiveFilters(prev => {
            const next = { ...prev };
        if (selectedSet.size === 0) {
                delete next[colIndex];
            } else {
                next[colIndex] = selectedSet;
            }
            return next;
        });
    };

    const clearFilter = (colIndex) => {
        setActiveFilters(prev => {
            const next = { ...prev };
            delete next[colIndex];
            return next;
        });
    };

    const clearAllFilters = () => setActiveFilters({});
    const hasActiveFilters = Object.keys(activeFilters).length > 0;

    // ── Cell renderers ────────────────────────────────────────────────────────
    const renderBreakdownCell = (compBreakdown, key, colIndex) => (
        <td
            className="p-0 align-top"
            style={{
                backgroundColor: colIndex >= 6 ? '#e0e7ff' : '#ffffff',
                borderRight: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb',
            }}
        >
            <div className="divide-y divide-gray-200">
                {compBreakdown.map((cb, j) => {
                    if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400 italic">_</div>;
                    const value = cb?.[key];
                    return <div key={j} className="px-3 py-2 whitespace-nowrap">{value !== undefined && value !== null ? value : "_"}</div>;
                })}
            </div>
        </td>
    );

    const getColBg = (index) => index >= 6 ? '#e0e7ff' : '#ffffff';
    const getFrozenStyle = (index) => ({
        position: 'sticky',
        left: `${FROZEN_LEFTS[index]}px`,
        width: `${FROZEN_WIDTHS[index]}px`,
        minWidth: `${FROZEN_WIDTHS[index]}px`,
        maxWidth: `${FROZEN_WIDTHS[index]}px`,
        zIndex: 20,
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.1)' : 'none',
        overflow: index === FROZEN_COUNT - 1 ? 'hidden' : 'visible',
    });
    const getCellStyle = (index) => ({
        backgroundColor: getColBg(index),
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
    });

    return (
        <DashboardLayout>
            {/* ── Action Bar ─────────────────────────────────────────────────── */}
            <div className="flex gap-2 mb-4 items-center flex-wrap">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <PlusCircle size={18} />
                </button>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600">
                    <RefreshCcw size={18} />
                </button>

                <div className="h-8 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                {/* Scroll controls */}
                <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 mr-1 hidden sm:inline">Scroll:</span>
                    <button onClick={() => scrollHorizontal('left')} className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm" title="Scroll Left"><ChevronLeft size={18} className="text-gray-600" /></button>
                    <button onClick={() => scrollHorizontal('right')} className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm" title="Scroll Right"><ChevronRight size={18} className="text-gray-600" /></button>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => scrollVertical('up')} className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm" title="Scroll Up"><ChevronUp size={18} className="text-gray-600" /></button>
                    <button onClick={() => scrollVertical('down')} className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm" title="Scroll Down"><ChevronDown size={18} className="text-gray-600" /></button>
                </div>

                {/* Active filter pills */}
                {hasActiveFilters && (
                    <>
                        <div className="h-8 w-px bg-gray-300 mx-2 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Filter size={14} className="text-blue-500" />
                            {Object.entries(activeFilters).map(([colIndex, valSet]) => (
                                <span
                                    key={colIndex}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full font-medium"
                                >
                                    {COLUMNS[Number(colIndex)]}
                                    <span className="bg-blue-200 text-blue-800 rounded-full px-1 text-xs">{valSet.size}</span>
                                    <button onClick={() => clearFilter(Number(colIndex))} className="ml-0.5 text-blue-400 hover:text-blue-700">
                                        <X size={11} />
                                    </button>
                                </span>
                            ))}
                            <button
                                onClick={clearAllFilters}
                                className="text-xs text-gray-500 hover:text-red-500 underline ml-1"
                            >
                                Clear all
                            </button>
                        </div>
                    </>
                )}

                {/* Row count */}
                <span className="ml-auto text-xs text-gray-400">
                    {filteredData.length} / {rawData.length} rows
                </span>
            </div>

            {showModal && <StyleReqModal setRawData={setRawData} setShowModal={setShowModal} />}

            {/* ── Filter Dropdown (portal-style via fixed position) ─────────── */}
            {openFilter !== null && (
                <FilterDropdown
                    colIndex={openFilter}
                    colLabel={COLUMNS[openFilter]}
                    allValues={getColValues(openFilter)}
                    activeValues={activeFilters[openFilter] ? Array.from(activeFilters[openFilter]) : null}
                    onApply={(set) => applyFilter(openFilter, set)}
                    onClear={() => clearFilter(openFilter)}
                    onClose={() => setOpenFilter(null)}
                    anchorRef={{ current: filterBtnRefs.current[openFilter] }}
                    style={{ top: dropdownPos.top, left: dropdownPos.left, position: "fixed" }}
                />
            )}

            {/* position the dropdown */}
            <style>{`
                .filter-dropdown {
                    top: ${dropdownPos.top}px !important;
                    left: ${dropdownPos.left}px !important;
                }
            `}</style>

            {/* ── Scrollable Table ──────────────────────────────────────────── */}
            <div
                ref={scrollContainerRef}
                className="relative overflow-auto shadow-xs rounded-base border border-default"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
                <table
                    className="w-full text-sm text-left rtl:text-right text-body"
                    style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                >
                    {/* ── Sticky Header ───────────────────────────────────── */}
                    <thead className="sticky top-0 z-30 text-sm text-body">
                        <tr>
                            {COLUMNS.map((col, index) => {
                                const isFilterable = index in FILTERABLE_COLS;
                                const hasFilter = !!activeFilters[index];

                                return (
                                    <th
                                        key={index}
                                        scope="col"
                                        className="px-3 py-3 font-medium whitespace-nowrap"
                                        style={{
                                            backgroundColor: index >= 6 ? '#c7d2fe' : '#e5e7eb',
                                            position: index < FROZEN_COUNT ? 'sticky' : 'relative',
                                            left: index < FROZEN_COUNT ? `${FROZEN_LEFTS[index]}px` : 'auto',
                                            width: index < FROZEN_COUNT ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                            minWidth: index < FROZEN_COUNT ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                            maxWidth: index < FROZEN_COUNT ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                            zIndex: index < FROZEN_COUNT ? 40 : 30,
                                            borderRight: '1px solid #d1d5db',
                                            borderBottom: '2px solid #d1d5db',
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
                                                    className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors ${
                                                        hasFilter
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
                        {filteredData.map((row, i) => {
                            const compBreakdown = row.compBreakdown || row.rows.map(() => ({}));

                            return (
                                <tr key={i} className="group">

                                    {/* 1. SALES CONTACT */}
                                    <td className="px-3 py-2 whitespace-nowrap align-middle group-hover:bg-gray-50" style={getFrozenStyle(0)}>{row.salesContact}</td>

                                    {/* 2. BUYER */}
                                    <td className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50" style={getFrozenStyle(1)}>{row.buyerName}</td>

                                    {/* 3. JOB NO */}
                                    <td onDoubleClick={() => handleRedirect(row.jobNo)} className="px-3 py-2 whitespace-nowrap align-middle text-center cursor-pointer hover:text-blue-600 group-hover:bg-gray-50" style={getFrozenStyle(2)}>{row.jobNo}</td>

                                    {/* 4. STYLE */}
                                    <td className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50" style={getFrozenStyle(3)}>{row.styleNo}</td>

                                    {/* 5. PO NO */}
                                    <td className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50" style={getFrozenStyle(4)}>{row.poNo}</td>

                                    {/* 6. COLOR */}
                                    <td className="p-0 align-top group-hover:bg-gray-50" style={getFrozenStyle(5)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.color}</div>)}
                                        </div>
                                    </td>

                                    {/* 7. COMPOSITION */}
                                    <td className="p-0 align-top group-hover:bg-gray-50" style={getFrozenStyle(6)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis" title={cell.composition}>{cell.composition}</div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 8. FINISH DIA */}
                                    <td className="p-0 align-top" style={getCellStyle(7)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.finishDia}</div>)}
                                        </div>
                                    </td>

                                    {/* 9. ORDER QTY */}
                                    <td className="p-0 align-top" style={getCellStyle(8)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.orderQty}</div>)}
                                        </div>
                                    </td>

                                    {/* 10. 1st BOOKING */}
                                    <td className="p-0 align-top" style={getCellStyle(9)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {(Number(cell.finishRequiredQty) + Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 11. ADDITIONAL BOOKING */}
                                    <td className="p-0 align-top" style={getCellStyle(10)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((_, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">additional</div>)}
                                        </div>
                                    </td>

                                    {/* 12. REQUIRED YARN QTY */}
                                    <td className="p-0 align-top" style={getCellStyle(11)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {(Number(cell.finishRequiredQty) + Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 13. KNITTING WORK ORDER QTY */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_workOrderQty', 12)}

                                    {/* 14. SHORT & EXCESS */}
                                    <td className="p-0 align-top" style={getCellStyle(13)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => {
                                                const cb = compBreakdown[j] || {};
                                                if (cb.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const finishRequiredQty = cell.finishRequiredQty || 0;
                                                const processLoss = row.processLoss || 0;
                                                const knittingWorkOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');
                                                const diff0 = (Number(finishRequiredQty) + Number(finishRequiredQty) * Number(processLoss) / 100) - Number(knittingWorkOrderQty);
                                                const isExceeded0 = diff0 > 0;
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
                                        <div className="divide-y divide-gray-200">
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
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((_, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">party stock</div>)}
                                        </div>
                                    </td>

                                    {/* 20. TOTAL KNITTING (GREY) */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Yarn_Received', 19)}

                                    {/* 21. RETURN YARN RECEIVED */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Yarn_Return', 20)}

                                    {/* 22. BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(21)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const yarnDelivery = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                                                const yarnReturn = getBreakdownValue(cb, 'knittingOrder_Yarn_Return');
                                                const greyReceived = getBreakdownValue(cb, 'knittingOrder_Yarn_Received');
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
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Return_Received', 23)}

                                    {/* 25. GREY RECEIVED FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Received', 24)}

                                    {/* 26. FINISH RECEIVED FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Finish_Received', 25)}

                                    {/* 27. GREY BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(26)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const diff = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received') +
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing') -
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

                                    {/* 28. PROCESS LOSS % */}
                                    <td className="p-0 align-top" style={getCellStyle(27)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((_, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{row.processLoss || 0}%</div>)}
                                        </div>
                                    </td>

                                    {/* 29. FINISH DELIVERY FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Sent_for_AOP', 28)}

                                    {/* 30. FINISH RECEIVED FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Received_from_AOP', 29)}

                                    {/* 31. AOP FAB. BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(30)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'aopOrder_Sent_for_AOP');
                                                const received = getBreakdownValue(cb, 'aopOrder_Received_from_AOP');
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
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'aopOrder_Sent_for_AOP');
                                                const received = getBreakdownValue(cb, 'aopOrder_Received_from_AOP');
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
                                        <div className="divide-y divide-gray-200">
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
                                        <div className="divide-y divide-gray-200">
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

                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    No rows match the active filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}