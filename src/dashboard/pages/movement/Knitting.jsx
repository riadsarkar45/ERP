import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFetchData } from '../../../hooks/fetch';
import useAxiosPublic from '../../../hooks/Axios';
import { formatToErpDate } from '../../../helpers/date/formateDate';
import { fmtNumber } from './FormatNumber';
import { tableScrollWrapStyle } from './TableStyle';
import { useTableFilters } from './UseFilter';
import { Loader, Search, Download, Filter, X, Calendar, ChevronDown } from 'lucide-react';
import ChallanEditModal from './challanEditModal/ChallanEdit';

// --- Modern Design System & Styles ---
const theme = {
    colors: {
        primary: '#3b82f6', primaryHover: '#2563eb', success: '#10b981', successHover: '#059669',
        danger: '#ef4444', warning: '#fef08a', bgPage: '#ffffff', bgHeader: '#f5d8c9',
        bgFooter: '#f5d8c9', bgHover: '#f1f5f9', border: '#10b981', borderDark: '#cbd5e1',
        textMain: '#0f172a', textMuted: '#0f172a', white: '#ffffff',
    },
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.18), 0 8px 10px -6px rgb(0 0 0 / 0.12)',
    },
    radius: '8px',
};

const FONT_STACK = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const cellStyle = {
    padding: "12px 16px",
    borderBottom: `1px solid ${theme.colors.border}`,
    borderRight: `1px solid ${theme.colors.border}`,
    fontSize: "0.875rem",
    color: theme.colors.textMain,
    verticalAlign: "middle",
    textAlign: "center",
    transition: "background-color 0.15s ease",
    whiteSpace: "normal",
    wordWrap: "break-word",
    wordBreak: "break-word",
    lineHeight: "1.2",
    backgroundClip: "padding-box",
};

const thStickyStyle = {
    ...cellStyle,
    position: "sticky", top: 0, zIndex: 30,
    background: "#657582",
    fontWeight: 600, fontSize: "0.80rem",
    textTransform: "uppercase", letterSpacing: "0.05em",
    color: "white",
    borderBottom: `3px solid ${theme.colors.borderDark}`,
    boxShadow: theme.shadows.sm,
    whiteSpace: "normal", wordWrap: "break-word", wordBreak: "break-word",
    verticalAlign: "middle", textAlign: "center",
    backgroundClip: "padding-box",
};

const tfootCellStyle = {
    ...cellStyle,
    position: "sticky", bottom: 0, zIndex: 30,
    background: "#657582", fontWeight: 700,
    borderTop: `2px solid ${theme.colors.borderDark}`, borderBottom: "none",
    color: "white", textAlign: "center",
    backgroundClip: "padding-box",
};


const tableHeader = [
    { header: "", width: "50px", key: "select", noFilter: true },
    { header: "Date", width: "110px", key: "challanDate" },
    { header: "Challan No", width: "120px", key: "challanNo" },
    { header: "Job No", width: "140px", key: "jobNo" },
    { header: "Composition", width: "270px", key: "composition" },
    { header: "Color", width: "200px", key: "color" },
    { header: "From Factory", width: "160px", key: "fromFactory" },
    { header: "To Factory", width: "160px", key: "toFactory" },
    { header: "Yarn Del", width: "110px", key: "yarnDelivery" },
    { header: "Yarn Ret", width: "110px", key: "yarnReturn" },
    { header: "Greige Rec", width: "120px", key: "greyFabricReceived" },
    { header: "Price/KG", width: "100px", key: "unitePrice" },
    { header: "Billing", width: "120px", key: "billingAmount" },
];

// ===== FROZEN COLUMNS =====
const FROZEN_COLUMN_KEYS = ['select', 'challanDate', 'challanNo', 'jobNo', 'composition'];
const FROZEN_LAST_KEY = FROZEN_COLUMN_KEYS[FROZEN_COLUMN_KEYS.length - 1];

const FROZEN_LEFT_OFFSETS = (() => {
    const offsets = {};
    let cumulative = 0;
    tableHeader.forEach((th) => {
        if (FROZEN_COLUMN_KEYS.includes(th.key)) {
            offsets[th.key] = cumulative;
            cumulative += parseInt(th.width, 10) || 0;
        }
    });
    return offsets;
})();

const getFrozenStyle = (key, area = 'body') => {
    if (!FROZEN_COLUMN_KEYS.includes(key)) return {};
    const left = FROZEN_LEFT_OFFSETS[key] ?? 0;
    const isLast = key === FROZEN_LAST_KEY;
    const zIndex = (area === 'header' || area === 'footer') ? 40 : 5;
    const style = {
        position: 'sticky',
        left: `${left}px`,
        zIndex,
        backgroundClip: 'padding-box',
    };
    if (isLast) {
        style.borderRight = `3px solid ${theme.colors.borderDark}`;
        style.boxShadow = '6px 0 8px -4px rgba(15, 23, 42, 0.18)';
    }
    return style;
};
// ===== END FROZEN COLUMNS =====

const getMonthKey = (dateVal) => {
    if (!dateVal) return "";
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return "";
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch (e) {
        return "";
    }
};

const formatMonthLabel = (key) => {
    if (!key || !/^\d{4}-\d{2}$/.test(key)) return key;
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
};

const formatMonthLong = (key) => {
    if (!key || !/^\d{4}-\d{2}$/.test(key)) return key;
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

const FILTER_DROPDOWN_WIDTH = 270;

const Knitting = () => {
    // --- ALL STATE AT TOP LEVEL ---
    const [movements, setMovements] = useState([]);
    const [fetchError, setFetchError] = useState(null);
    const [selectedRows, setSelectedRows] = useState(new Set());

    const [fetchAll, setFetchAll] = useState(false);
    const [search, setSearch] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [isFetchingAll, setIsFetchingAll] = useState(false);
    const [pendingFilterKey, setPendingFilterKey] = useState(null);

    const [selectedMonths, setSelectedMonths] = useState(new Set());
    const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
    const [monthDraftSelected, setMonthDraftSelected] = useState(new Set());
    const [monthSearch, setMonthSearch] = useState("");
    const monthDropdownRef = useRef(null);

    const [hoveredRow, setHoveredRow] = useState(null);

    // Portal refs & state for the column filter dropdown
    const filterButtonRefs = useRef({});
    const [dropdownPos, setDropdownPos] = useState(null); 

    const [isBillGenerating, setIsBillGenerating] = useState(false);
    const [isChallanEditing, setIsChallanEditing] = useState(false);
    const [challanToEditData, setChallanToEditData] = useState({});
    const [isChallanDataLoading, setIsChallanDataLoading] = useState(null)


    const { fetchData, loading } = useFetchData();
    const axiosPublic = useAxiosPublic();

    const allRows = useMemo(() => {
        if (!movements || !Array.isArray(movements)) return [];
        const rows = [];
        const extractJobNo = (item) => item?.workOrder?.jobNo || (typeof item?.workOrder === 'string' ? item.workOrder : null);

        const makeRow = (challanNo, jobNo, comp, color, source, mvId, deliveryId) => {
            const stableId = deliveryId ?? mvId ?? source?.id ?? null;
            const rowKey = `${challanNo}|${jobNo}|${comp}|${color}|${stableId ?? ''}`;
            return {
                rowKey,
                mvId: mvId ?? challanNo,
                deliveryId: deliveryId ?? source?.id ?? null,
                chId: source?.id || challanNo,
                challanNo,
                jobNo,
                composition: comp || "-",
                color: color || "-",
                challanDate: source?.deliveryDate || source?.challanDate || "",
                toFactory: source?.toFactory || "",
                fromFactory: source?.fromFactory || "",
                yarnDelivery: 0, yarnReturn: 0, greyFabricReceived: 0, deliveryQty: 0,
                unitePrice: Number(source?.unitePrice) || 0,
                paidBillingAmount: Number(source?.paidBillingAmount) || 0,
            };
        };

        const applyDelivery = (row, dv, source) => {
            const qty = Number(dv?.deliveryQty ?? dv?.totalQty) || 0;
            row.deliveryQty += qty;
            const type = String(dv?.deliveryType || "").toLowerCase().replace(/[\s_-]+/g, "");
            if (type.includes("yarndelivery")) row.yarnDelivery += qty;
            else if (type.includes("yarnreturn")) row.yarnReturn += qty;
            else if (type.includes("greyfabric") || type.includes("greigereceived") || type.includes("yarnreceived") || type.includes("greyreceived")) row.greyFabricReceived += qty;

            const price = Number(dv?.unitePrice || source?.unitePrice) || 0;
            if (price && !row.unitePrice) row.unitePrice = price;
            if (!row.toFactory && dv?.toFactory) row.toFactory = dv.toFactory;
            if (!row.fromFactory && dv?.fromFactory) row.fromFactory = dv.fromFactory;
            if (dv?.deliveryDate && !row.challanDate) row.challanDate = dv.deliveryDate;
        };

        const getFacets = (item) => {
            const facets = [];
            if (Array.isArray(item?.compositions) && item.compositions.length > 0) {
                item.compositions.forEach((c) => {
                    if (!c) return;
                    const qtyRaw = c?.qty ?? c?.quantity ?? c?.deliveryQty ?? c?.totalQty ?? c?.weight ?? c?.kg ?? null;
                    const qtyNum = (qtyRaw !== null && qtyRaw !== "" && !isNaN(Number(qtyRaw))) ? Number(qtyRaw) : null;
                    facets.push({
                        comp: c?.composition || item?.composition || "-",
                        color: c?.color || item?.color || "-",
                        qty: qtyNum,
                    });
                });
            } else if (typeof item?.color === "string" && item.color.includes(", ")) {
                item.color.split(", ").map((s) => s.trim()).filter(Boolean).forEach((colorPart) => {
                    facets.push({ comp: item?.composition || "-", color: colorPart, qty: null });
                });
            }
            if (facets.length === 0) {
                facets.push({ comp: item?.composition || "-", color: item?.color || "-", qty: null });
            }
            return facets;
        };

        movements.forEach((item) => {
            if (!item) return;
            const jobNo = extractJobNo(item) || "-";

            if (Array.isArray(item.deliveries) && item.deliveries.length > 0) {
                item.deliveries.forEach((dv) => {
                    const challanNo = dv?.challanNo;
                    if (challanNo === undefined || challanNo === null) return;
                    const comp = dv?.composition || item?.composition || "-";
                    const color = dv?.color || item?.color || "-";
                    const row = makeRow(challanNo, jobNo, comp, color, dv, item.id, dv.id);
                    if (item.unitePrice && !row.unitePrice) row.unitePrice = Number(item.unitePrice);
                    applyDelivery(row, dv, item);
                    rows.push(row);
                });
            } else if (item.challanNo !== undefined && item.challanNo !== null) {
                const facets = getFacets(item);
                const hasFacetQty = facets.some((f) => f.qty !== null);

                facets.forEach((f) => {
                    const row = makeRow(item.challanNo, jobNo, f.comp, f.color, item, item.id, item.id);
                    if (hasFacetQty) {
                        if (f.qty !== null) applyDelivery(row, { ...item, deliveryQty: f.qty }, item);
                    } else if (facets.length === 1) {
                        applyDelivery(row, item, item);
                    }
                    rows.push(row);
                });
            }
        });

        return rows.map((row) => ({
            ...row,
            billingAmount: row.greyFabricReceived * row.unitePrice,
        }));
    }, [movements]);

    const {
        filters, openFilterKey, draftSelected, filterSearch, dropdownRef,
        filterOptions, filteredRows: hookFilteredRows, setFilterSearch, openFilter,
        toggleDraftValue, toggleSelectAllDraft, applyFilter, clearFilter,
    } = useTableFilters(allRows, tableHeader);

    // ===== Column filter dropdown portal positioning =====
    const updateDropdownPosition = useCallback(() => {
        if (!openFilterKey) return;
        const btn = filterButtonRefs.current[openFilterKey];
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const width = FILTER_DROPDOWN_WIDTH;

        let left = rect.right - width;
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

        const estimatedHeight = 360;
        let top = rect.bottom + 8;
        if (top + estimatedHeight > window.innerHeight - 8) {
            const aboveTop = rect.top - estimatedHeight - 8;
            top = aboveTop > 8 ? aboveTop : Math.max(8, window.innerHeight - estimatedHeight - 8);
        }
        setDropdownPos({ top, left, width });
    }, [openFilterKey]);

    useLayoutEffect(() => {
        if (!openFilterKey) { setDropdownPos(null); return; }
        updateDropdownPosition();
        const handler = () => updateDropdownPosition();
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [openFilterKey, updateDropdownPosition]);
    // ===== END portal positioning =====

    // ── Month options ──
    const monthOptions = useMemo(() => {
        const set = new Set();
        allRows.forEach((row) => {
            const key = getMonthKey(row.challanDate);
            if (key) set.add(key);
        });
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [allRows]);

    useEffect(() => {
        if (selectedMonths.size > 0) {
            const validMonths = new Set(monthOptions);
            const filtered = new Set([...selectedMonths].filter(m => validMonths.has(m)));
            if (filtered.size !== selectedMonths.size) {
                setSelectedMonths(filtered);
            }
        }
    }, [monthOptions, selectedMonths]);

    const filteredMonthOptions = useMemo(() => {
        if (!monthSearch.trim()) return monthOptions;
        const q = monthSearch.toLowerCase();
        return monthOptions.filter((m) => {
            const label = formatMonthLabel(m).toLowerCase();
            return label.includes(q) || m.includes(q);
        });
    }, [monthOptions, monthSearch]);

    const filteredRows = useMemo(() => {
        let rows = hookFilteredRows;

        if (selectedMonths.size > 0) {
            rows = rows.filter((row) => {
                const rowMonth = getMonthKey(row.challanDate);
                return rowMonth && selectedMonths.has(rowMonth);
            });
        }
        return rows;
    }, [hookFilteredRows, selectedMonths]);

    const filtersString = JSON.stringify(filters || {});

    const totals = useMemo(() => {
        const t = { yarnDelivery: 0, yarnReturn: 0, greyFabricReceived: 0, billingAmount: 0 };
        filteredRows.forEach((row) => {
            t.yarnDelivery += Number(row.yarnDelivery) || 0;
            t.yarnReturn += Number(row.yarnReturn) || 0;
            t.greyFabricReceived += Number(row.greyFabricReceived) || 0;
            t.billingAmount += Number(row.billingAmount) || 0;
        });
        return t;
    }, [filteredRows]);

    const toggleRow = (rowKey) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            if (next.has(rowKey)) next.delete(rowKey);
            else next.add(rowKey);
            return next;
        });
    };

    const toggleSelectAllVisible = (checked) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            filteredRows.forEach((r) => {
                if (checked) next.add(r.rowKey);
                else next.delete(r.rowKey);
            });
            return next;
        });
    };

    useEffect(() => {
        if (search) return;
        setFetchError(null);
        const queryParams = new URLSearchParams();
        if (fetchAll) { queryParams.append('fetchAll', 'true'); setIsFetchingAll(true); }
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value && Array.isArray(value) && value.length > 0) queryParams.append(key, value.join(','));
                else if (value && typeof value === 'string' && value.length > 0) queryParams.append(key, value);
            });
        }
        const queryString = queryParams.toString();
        const url = `/api/challan-movement/knittingOrder${queryString ? '?' + queryString : ''}`;
        fetchData(url).then((res) => {
            if (!res) { setFetchError("No response from server."); return; }
            let payload = [];
            if (Array.isArray(res)) payload = res;
            else if (Array.isArray(res?.data)) payload = res.data;
            else if (Array.isArray(res?.data?.data)) payload = res.data.data;
            setMovements(payload);
        }).catch((err) => {
            console.error("Failed to load Knitting deliveries:", err);
            setFetchError("Failed to load data.");
            setPendingFilterKey(null);
        }).finally(() => { if (fetchAll) setIsFetchingAll(false); });
    }, [fetchData, filtersString, fetchAll, refreshKey, search]);

    useEffect(() => {
        if (fetchError && pendingFilterKey) { setPendingFilterKey(null); return; }
        if (pendingFilterKey && fetchAll && !isFetchingAll && !fetchError) { openFilter(pendingFilterKey); setPendingFilterKey(null); }
    }, [pendingFilterKey, fetchAll, isFetchingAll, fetchError, openFilter]);

    // Close month dropdown on outside click
    useEffect(() => {
        if (!monthDropdownOpen) return;
        const handleClick = (e) => {
            if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target)) {
                setMonthDropdownOpen(false);
                setMonthSearch("");
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [monthDropdownOpen]);

    const handleOpenFilter = (key) => {
        if (!fetchAll) { if (!pendingFilterKey) setPendingFilterKey(key); setFetchAll(true); return; }
        openFilter(key);
    };

    // ===== MONTH FILTER =====
    const openMonthFilter = () => {
        if (monthDropdownOpen) {
            setMonthDropdownOpen(false);
            setMonthSearch("");
            return;
        }
        if (selectedMonths.size > 0) {
            setMonthDraftSelected(new Set(selectedMonths));
        } else {
            setMonthDraftSelected(new Set(monthOptions));
        }
        setMonthSearch("");
        setMonthDropdownOpen(true);
    };

    const toggleMonthDraftValue = (val) => {
        setMonthDraftSelected(prev => {
            const next = new Set(prev);
            if (next.has(val)) next.delete(val);
            else next.add(val);
            return next;
        });
    };

    const toggleSelectAllMonths = () => {
        setMonthDraftSelected(prev => (prev.size === monthOptions.length ? new Set() : new Set(monthOptions)));
    };

    const applyMonthFilter = () => {
        setSelectedMonths(new Set(monthDraftSelected));
        setMonthDropdownOpen(false);
        setMonthSearch("");
    };

    const clearMonthFilter = () => {
        setSelectedMonths(new Set());
        setMonthDropdownOpen(false);
        setMonthSearch("");
    };
    // ==============================================

    const handleChallanSearch = async () => {
        if (!search.trim()) { alert("Please enter at least one challan number."); return; }
        setSearchLoading(true); setSearchError(null);
        const searchArray = search.split(/[\s,]+/).filter(Boolean);

        try {
            const res = await axiosPublic.get("/api/knittingOrder/challan/search", { params: { challans: searchArray.join(","), context: "knittingOrder" } });
            let searchData = [];
            if (Array.isArray(res.data)) searchData = res.data;
            else if (Array.isArray(res.data?.data)) searchData = res.data.data;
            setMovements(searchData);
        } catch (err) { setSearchError("Failed to search challans."); setMovements([]); }
        finally { setSearchLoading(false); }
    };

    // ===== CLEAR-ALL FILTERS =====
    const hasActiveFilters =
        Object.keys(filters || {}).length > 0 ||
        (selectedMonths && selectedMonths.size > 0) ||
        !!search;

    const handleClearAllFilters = () => {
        Object.keys(filters || {}).forEach((key) => clearFilter(key));
        setFilterSearch("");
        if (typeof setDraftSelected === 'function') setDraftSelected(new Set());

        setSelectedMonths(new Set());
        setMonthDraftSelected(new Set());
        setMonthDropdownOpen(false);
        setMonthSearch("");

        if (search) {
            setSearch("");
            setSearchError(null);
            setRefreshKey(prev => prev + 1);
        }
    };
    // =============================

    const getCellBaseStyle = (row, idx) => {
        const isHovered = hoveredRow === row.rowKey;
        let bg = isHovered ? theme.colors.bgHover : (idx % 2 === 0 ? theme.colors.white : '#fafbfc');
        return { ...cellStyle, backgroundColor: bg };
    };

    const handleExport = () => {
        if (filteredRows.length === 0) { alert("No data to export."); return; }
        const headers = tableHeader.filter(h => h.key !== 'select').map(h => h.header);
        const rows = filteredRows.map(row => {
            return tableHeader.filter(h => h.key !== 'select').map(h => {
                let val = row[h.key];
                if (h.key === 'challanDate' && val) {
                    try { const d = new Date(val); if (!isNaN(d.getTime())) val = d.toISOString().split('T')[0]; } catch (e) { }
                }
                if (val === null || val === undefined) return "";
                let str = String(val);
                if (str.includes('"')) str = '"' + str.replace(/"/g, '""') + '"';
                else if (str.includes(',') || str.includes('\n')) str = '"' + str + '"';
                return str;
            });
        });
        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Knitting_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // ===== PORTALED COLUMN FILTER DROPDOWN =====
    const renderColumnFilterDropdown = () => {
        if (!openFilterKey || !dropdownPos) return null;
        const th = tableHeader.find(h => h.key === openFilterKey);
        if (!th) return null;

        const options = filterOptions[openFilterKey] || [];
        const visibleOptions = options.filter((val) => {
            let displayVal = val;
            if (openFilterKey === 'challanDate' && /^\d{4}-\d{2}$/.test(val)) {
                displayVal = formatMonthLong(val);
            }
            return String(displayVal).toLowerCase().includes(filterSearch.toLowerCase());
        });

        const allSelected = draftSelected.size === options.length && options.length > 0;
        const availableHeight = Math.max(220, Math.min(380, window.innerHeight - dropdownPos.top - 16));

        return createPortal(
            <div
                ref={dropdownRef}
                style={{
                    position: 'fixed',
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 99999,
                    background: theme.colors.white,
                    border: `1px solid ${theme.colors.borderDark}`,
                    borderRadius: theme.radius,
                    boxShadow: theme.shadows.xl,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: availableHeight,
                    overflow: 'hidden',
                    fontFamily: FONT_STACK,
                    textAlign: 'left',
                    textTransform: 'none',
                    letterSpacing: 'normal',
                    fontWeight: 400,
                    fontSize: '0.875rem',
                    color: theme.colors.textMain,
                }}
            >
                <div style={{
                    padding: '10px 12px',
                    borderBottom: `1px solid #e2e8f0`,
                    background: theme.colors.bgHeader,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.05em', color: theme.colors.textMain,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        Filter: {th.header}
                    </span>
                    <button
                        onClick={() => openFilter(openFilterKey)}
                        title="Close"
                        style={{
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 2, borderRadius: '50%', color: theme.colors.textMain, flexShrink: 0,
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>

                <div style={{ padding: "10px 12px", borderBottom: `1px solid #e2e8f0` }}>
                    <input
                        type="text"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        placeholder="Filter values..."
                        autoFocus
                        style={{
                            width: "100%", padding: "8px 10px",
                            border: `1px solid ${theme.colors.borderDark}`, borderRadius: '6px',
                            fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box',
                            fontFamily: FONT_STACK, color: theme.colors.textMain,
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", minHeight: 0 }}>
                    <label style={{
                        display: "flex", alignItems: "center", gap: 8,
                        fontWeight: 600, marginBottom: 8, fontSize: '0.8rem',
                        color: theme.colors.textMain, cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleSelectAllDraft(options)}
                            style={{ accentColor: theme.colors.primary, width: 15, height: 15 }}
                        />
                        Select All ({options.length})
                    </label>
                    <div style={{ borderTop: `1px solid #e2e8f0`, paddingTop: 6 }}>
                        {visibleOptions.length === 0 && (
                            <div style={{ padding: '12px 0', fontSize: '0.8rem', color: theme.colors.textMain, textAlign: 'center', opacity: 0.6 }}>
                                No values found
                            </div>
                        )}
                        {visibleOptions.map((val) => {
                            let displayVal = val;
                            if (openFilterKey === 'challanDate' && /^\d{4}-\d{2}$/.test(val)) {
                                displayVal = formatMonthLong(val);
                            }
                            const isChecked = draftSelected.has(val);
                            return (
                                <label key={val} style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    fontSize: "0.8rem", padding: "5px 0", cursor: 'pointer',
                                    borderRadius: '4px'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleDraftValue(val)}
                                        style={{ accentColor: theme.colors.primary, width: 15, height: 15, flexShrink: 0 }}
                                    />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {displayVal === "" ? "(blank)" : displayVal}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div style={{
                    display: "flex", justifyContent: "space-between", gap: 8,
                    padding: "10px 12px", borderTop: `1px solid #e2e8f0`,
                    background: theme.colors.bgHeader,
                }}>
                    <button
                        onClick={() => clearFilter(openFilterKey)}
                        style={{
                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            background: theme.colors.white, color: theme.colors.textMain,
                            border: `1px solid ${theme.colors.borderDark}`, borderRadius: '6px',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                            padding: '7px 0', fontFamily: FONT_STACK,
                        }}
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => applyFilter(openFilterKey, options)}
                        style={{
                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            background: theme.colors.primary, color: theme.colors.white,
                            border: 'none', borderRadius: '6px',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                            padding: '7px 0', fontFamily: FONT_STACK,
                        }}
                    >
                        Apply
                    </button>
                </div>
            </div>,
            document.body
        );
    };
    // ===== END PORTALED FILTER DROPDOWN =====

    if (loading && movements.length === 0 && !searchLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: theme.colors.textMuted, fontFamily: FONT_STACK }}>
                <Loader size={24} className="animate-spin" style={{ marginRight: 10 }} /> Loading data...
            </div>
        );
    }

    if (fetchError && !search) {
        return (
            <div style={{ padding: "12px 16px", color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: theme.radius, margin: 20, fontFamily: FONT_STACK }}>
                {fetchError}
            </div>
        );
    }

    const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(r.rowKey));



    const handlePrepareChallanEdit = async (challanNo) => {
        if (!challanNo) return;
        console.log(challanNo, "challan no from diff edit");
        setIsChallanDataLoading(true)
        setIsChallanEditing(true);
        try {
            const res = await axiosPublic.get(`/api/detail-challan-view/knittingOrder/${challanNo}`)
            console.log(res.data, "challan data");
            setChallanToEditData(res.data);
            setIsChallanDataLoading(false)
        } catch (error) {
            console.error("Error preparing challan edit:", error);
        }
    }


    return (
        <div style={{ width: "100%", padding: "24px", fontFamily: FONT_STACK, color: theme.colors.textMain }}>
            {
                isChallanEditing && (
                    <ChallanEditModal
                        setIsChallanEditing={setIsChallanEditing}
                        challanToEditData={challanToEditData}
                        isChallanDataLoading={isChallanDataLoading}
                    />
                )
            }
            {/* Toolbar */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: 'relative', flex: '0 1 320px' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.colors.textMuted }} />
                    <input
                        style={{
                            width: '100%', border: `1px solid ${theme.colors.border}`, padding: "10px 12px 10px 36px",
                            borderRadius: theme.radius, outline: "none", fontSize: '0.875rem', transition: 'border-color 0.2s',
                            boxSizing: 'border-box', fontFamily: 'inherit'
                        }}
                        placeholder="Search Challan or Job No..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleChallanSearch(); }}
                        onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
                        onBlur={(e) => e.target.style.borderColor = theme.colors.border}
                    />
                </div>

                <button
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: theme.colors.primary, color: theme.colors.white,
                        padding: "10px 20px", borderRadius: theme.radius, border: "none",
                        cursor: searchLoading ? "not-allowed" : "pointer", fontSize: '0.875rem', fontWeight: 500,
                        opacity: searchLoading ? 0.7 : 1, transition: 'background 0.2s', fontFamily: 'inherit'
                    }}
                    onClick={handleChallanSearch} disabled={searchLoading}
                >
                    {searchLoading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                    {searchLoading ? "Searching..." : "Search"}
                </button>

                {search && (
                    <button
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: theme.colors.white, color: theme.colors.textMuted,
                            padding: "10px 20px", borderRadius: theme.radius,
                            border: `1px solid ${theme.colors.border}`, cursor: "pointer", fontSize: '0.875rem', fontFamily: 'inherit'
                        }}
                        onClick={() => { setSearch(""); setSearchError(null); setRefreshKey(prev => prev + 1); }}
                    >
                        <X size={16} /> Clear
                    </button>
                )}

                {monthOptions.length > 0 && (
                    <div ref={monthDropdownRef} style={{ position: 'relative' }}>
                        <button
                            onClick={openMonthFilter}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: theme.colors.white,
                                color: selectedMonths.size > 0 ? theme.colors.primary : theme.colors.textMain,
                                padding: "10px 16px",
                                borderRadius: theme.radius,
                                border: `1px solid ${selectedMonths.size > 0 ? theme.colors.primary : theme.colors.border}`,
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                fontFamily: 'inherit',
                                minWidth: 200,
                                justifyContent: 'space-between',
                                transition: 'all 0.15s ease'
                            }}
                            title="Filter by month"
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Calendar size={16} />
                                {selectedMonths.size === 0 ? "All Months" :
                                    selectedMonths.size === 1 ? formatMonthLabel([...selectedMonths][0]) :
                                        `${selectedMonths.size} Months Selected`}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {selectedMonths.size > 0 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); clearMonthFilter(); }}
                                        style={{
                                            background: 'transparent', border: 'none',
                                            color: theme.colors.primary, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', padding: 2,
                                            borderRadius: '50%', transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        title="Clear month filter"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <ChevronDown
                                    size={16}
                                    style={{
                                        transition: 'transform 0.2s ease',
                                        transform: monthDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}
                                />
                            </div>
                        </button>

                        {monthDropdownOpen && (
                            <div
                                style={{
                                    position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                                    zIndex: 60, background: theme.colors.white,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radius, width: 260, maxHeight: 360,
                                    boxShadow: theme.shadows.lg, display: 'flex',
                                    flexDirection: 'column', fontFamily: 'inherit', overflow: 'hidden'
                                }}
                            >
                                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${theme.colors.border}` }}>
                                    <input
                                        type="text"
                                        value={monthSearch}
                                        onChange={(e) => setMonthSearch(e.target.value)}
                                        placeholder="Search months..."
                                        autoFocus
                                        style={{
                                            width: "100%", padding: "8px 10px",
                                            border: `1px solid ${theme.colors.border}`, borderRadius: '6px',
                                            fontSize: '0.8rem', outline: 'none',
                                            boxSizing: 'border-box', fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                                    <label style={{
                                        display: "flex", alignItems: "center", gap: 8,
                                        fontWeight: 600, marginBottom: 8, fontSize: '0.8rem',
                                        color: theme.colors.textMuted, cursor: 'pointer'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={monthDraftSelected.size === monthOptions.length && monthOptions.length > 0}
                                            onChange={toggleSelectAllMonths}
                                            style={{ accentColor: theme.colors.primary, width: 16, height: 16 }}
                                        />
                                        Select All ({monthOptions.length})
                                    </label>
                                    <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: 6 }}>
                                        {filteredMonthOptions.length === 0 && (
                                            <div style={{ padding: '12px 0', fontSize: '0.8rem', color: theme.colors.textMuted, textAlign: 'center' }}>
                                                No months found
                                            </div>
                                        )}
                                        {filteredMonthOptions.map((m) => {
                                            const isChecked = monthDraftSelected.has(m);
                                            return (
                                                <label key={m} style={{
                                                    display: "flex", alignItems: "center", gap: 8,
                                                    fontSize: "0.85rem", padding: "6px 0", cursor: 'pointer',
                                                    borderRadius: '4px'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleMonthDraftValue(m)}
                                                        style={{ accentColor: theme.colors.primary, width: 16, height: 16 }}
                                                    />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {formatMonthLabel(m)}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div style={{
                                    display: "flex", justifyContent: "space-between", gap: 8,
                                    padding: "10px 12px", borderTop: `1px solid ${theme.colors.border}`,
                                    background: theme.colors.bgHeader
                                }}>
                                    <button
                                        onClick={clearMonthFilter}
                                        style={{
                                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                            background: theme.colors.white, color: theme.colors.textMain,
                                            border: `1px solid ${theme.colors.border}`, borderRadius: '6px',
                                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, padding: '6px 0', fontFamily: 'inherit'
                                        }}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={applyMonthFilter}
                                        style={{
                                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                            background: theme.colors.primary, color: theme.colors.white,
                                            border: 'none', borderRadius: '6px',
                                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 0', fontFamily: 'inherit'
                                        }}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {hasActiveFilters && (
                    <button
                        onClick={handleClearAllFilters}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#fef2f2', color: '#b91c1c',
                            padding: "10px 16px", borderRadius: theme.radius,
                            border: '1px solid #fecaca', cursor: "pointer",
                            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit',
                            transition: 'all 0.15s ease', boxShadow: theme.shadows.sm
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                        title="Clear all active filters"
                    >
                        <X size={16} /> Clear All Filters
                    </button>
                )}

                <div style={{ flex: 1 }} />

                <button
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: theme.colors.white, color: theme.colors.textMain,
                        padding: "10px 20px", borderRadius: theme.radius,
                        border: `1px solid ${theme.colors.border}`, cursor: "pointer", fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit'
                    }}
                    onClick={handleExport}
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            {/* Error Banner */}
            {searchError && (
                <div style={{
                    padding: "12px 16px", color: "#991b1b", background: "#fef2f2",
                    border: "1px solid #fecaca", borderRadius: theme.radius, marginBottom: "16px",
                    fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit'
                }}>
                    <X size={16} /> {searchError}
                </div>
            )}

            {/* Fetch-all loading overlay */}
            {isFetchingAll && pendingFilterKey && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(255, 255, 255, 0.70)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
                }}>
                    <div style={{
                        background: theme.colors.white,
                        border: `1px solid ${theme.colors.primary}`,
                        borderRadius: theme.radius,
                        padding: "16px 24px",
                        color: theme.colors.primary,
                        fontWeight: 700,
                        boxShadow: theme.shadows.lg,
                        fontFamily: 'inherit'
                    }}>
                        Loading all challans for filtering...
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div style={{
                width: "100%", maxHeight: "calc(100vh - 220px)", overflow: "auto",
                border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius,
                boxShadow: theme.shadows.md, background: theme.colors.white,
                position: 'relative',
            }}>
                <table style={{ width: "100%", minWidth: "1600px", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
                    <thead>
                        <tr>
                            {tableHeader.map((th) => {
                                const frozen = getFrozenStyle(th.key, 'header');
                                if (th.noFilter) {
                                    return (
                                        <th key={th.key} style={{ ...thStickyStyle, width: th.width, ...frozen }}>
                                            {th.key === 'select' ? (
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                                                    style={{ accentColor: theme.colors.primary, cursor: 'pointer', width: 16, height: 16 }}
                                                />
                                            ) : th.header}
                                        </th>
                                    );
                                }
                                const isActive = !!filters[th.key];
                                const isOpen = openFilterKey === th.key;
                                return (
                                    <th key={th.key} style={{ ...thStickyStyle, width: th.width, ...frozen }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                            <span style={{
                                                whiteSpace: "normal", wordBreak: "break-word",
                                                textAlign: "center", flex: 1
                                            }}>{th.header}</span>
                                            <button
                                                ref={(el) => { filterButtonRefs.current[th.key] = el; }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={() => handleOpenFilter(th.key)}
                                                style={{
                                                    border: "none",
                                                    background: (isActive || isOpen) ? theme.colors.primary : "transparent",
                                                    color: theme.colors.white,
                                                    cursor: "pointer", padding: "2px 4px", borderRadius: '4px',
                                                    display: 'flex', alignItems: 'center', transition: 'all 0.15s', flexShrink: 0
                                                }}
                                            >
                                                <Filter size={12} />
                                            </button>
                                        </div>
                                        {/* Dropdown is portaled to document.body below */}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row, idx) => (
                            <tr
                                key={row.rowKey}
                                onMouseEnter={() => setHoveredRow(row.rowKey)}
                                onMouseLeave={() => setHoveredRow(null)}
                            >
                                {tableHeader.map((th) => {
                                    const frozen = getFrozenStyle(th.key, 'body');
                                    const baseStyle = { ...getCellBaseStyle(row, idx), ...frozen };

                                    if (th.key === 'select') {
                                        return (
                                            <td key={th.key} style={baseStyle}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.has(row.rowKey)}
                                                    onChange={() => toggleRow(row.rowKey)}
                                                    style={{ accentColor: theme.colors.primary, cursor: 'pointer', width: 16, height: 16 }}
                                                />
                                            </td>
                                        );
                                    }

                                    if (th.key === 'challanDate') {
                                        return (
                                            <td key={th.key} style={baseStyle}>
                                                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                    {row.challanDate && row.challanDate !== "-" ? formatToErpDate(row.challanDate) : "-"}
                                                </span>
                                            </td>
                                        );
                                    }

                                    if (th.key === 'color') {
                                        return (
                                            <td key={th.key} style={baseStyle}>
                                                {row.color && row.color !== "-" ? (
                                                    <span style={{
                                                        display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                                                        background: '#f1f5f9', fontSize: '0.8rem', fontWeight: 500,
                                                        whiteSpace: 'normal', wordBreak: 'break-word'
                                                    }}>{row.color}</span>
                                                ) : "-"}
                                            </td>
                                        );
                                    }

                                    if (th.key === 'unitePrice' || th.key === 'billingAmount') {
                                        return (
                                            <td key={th.key} style={{ ...baseStyle, fontVariantNumeric: 'tabular-nums', fontWeight: th.key === 'billingAmount' ? 600 : 400 }}>
                                                {row[th.key] > 0 ? Number(row[th.key]).toFixed(2) : "-"}
                                            </td>
                                        );
                                    }

                                    if (th.key === 'jobNo' || th.key === 'composition') {
                                        return (
                                            <td key={th.key} style={baseStyle}>
                                                <span style={{ fontWeight: th.key === 'jobNo' ? 500 : 400, whiteSpace: 'normal', wordBreak: 'break-word' }}>{row[th.key]}</span>
                                            </td>
                                        );
                                    }

                                    const isNumber = ['yarnDelivery', 'yarnReturn', 'greyFabricReceived'].includes(th.key);
                                    const currentValue = row[th.key];

                                    return (
                                        <td key={th.key} style={{ ...baseStyle, fontVariantNumeric: isNumber ? 'tabular-nums' : 'normal' }}>
                                            <div
                                                onClick={th.key === 'challanNo' ? () => handlePrepareChallanEdit(row.challanNo) : undefined} style={{
                                                    minHeight: '20px', textAlign: 'center',
                                                    opacity: currentValue ? 1 : 0.5,
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'break-word',
                                                }}>
                                                {isNumber
                                                    ? (Number(currentValue) > 0 ? Number(currentValue).toFixed(2) : "-")
                                                    : (currentValue || "-")
                                                }


                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {filteredRows.length === 0 && (
                            <tr>
                                <td style={{ ...cellStyle, padding: 40, color: theme.colors.textMuted, whiteSpace: 'normal' }} colSpan={tableHeader.length}>
                                    {movements.length === 0 && !loading && !searchLoading
                                        ? "No records found."
                                        : "No rows match the current filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {filteredRows.length > 0 && (
                        <tfoot>
                            <tr>
                                {tableHeader.map((th) => {
                                    const frozen = getFrozenStyle(th.key, 'footer');
                                    if (th.key === 'composition') {
                                        return <td key={th.key} style={{ ...tfootCellStyle, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', ...frozen }}>Total</td>;
                                    }
                                    if (['yarnDelivery', 'yarnReturn', 'greyFabricReceived', 'billingAmount'].includes(th.key)) {
                                        return (
                                            <td key={th.key} style={{ ...tfootCellStyle, fontVariantNumeric: 'tabular-nums', fontWeight: th.key === 'billingAmount' ? 800 : 700, ...frozen }}>
                                                {totals[th.key] > 0 ? totals[th.key].toFixed(2) : "-"}
                                            </td>
                                        );
                                    }
                                    return <td key={th.key} style={{ ...tfootCellStyle, ...frozen }}></td>;
                                })}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* PORTALED COLUMN FILTER DROPDOWN */}
            {renderColumnFilterDropdown()}
        </div>
    );
};

export default Knitting;