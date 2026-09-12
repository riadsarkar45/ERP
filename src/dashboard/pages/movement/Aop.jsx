import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import { formatToErpDate } from '../../../helpers/date/formateDate';
import useAxiosPublic from '../../../hooks/Axios';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';
import { Loader, Search, Download, Save, Filter, X, Calendar, ChevronDown, Check } from 'lucide-react';

// --- Modern Design System & Styles ---
const theme = {
    colors: {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        success: '#10b981',
        successHover: '#059669',
        danger: '#ef4444',
        warning: '#fef08a',
        bgPage: '#ffffff',
        bgHeader: '#f5d8c9',
        bgFooter: '#f5d8c9',
        bgHover: '#f1f5f9',
        border: '#10b981',
        borderDark: '#cbd5e1',
        textMain: '#0f172a',
        textMuted: '#0f172a',
        white: '#ffffff',
    },
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    radius: '8px',
};

const cellStyle = {
    padding: "12px 16px",
    borderBottom: `2px solid ${theme.colors.border}`,
    borderRight: `2px solid ${theme.colors.border}`,
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
    position: "sticky",
    top: 0,
    zIndex: 30,
    background: theme.colors.bgHeader,
    fontWeight: 600,
    fontSize: "0.80rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: theme.colors.textMuted,
    borderBottom: `3px solid ${theme.colors.borderDark}`,
    boxShadow: theme.shadows.sm,
    whiteSpace: "normal",
    wordWrap: "break-word",
    wordBreak: "break-word",
    verticalAlign: "middle",
    textAlign: "center",
    backgroundClip: "padding-box",
};

const tfootCellStyle = {
    ...cellStyle,
    position: "sticky",
    bottom: 0,
    zIndex: 30,
    background: theme.colors.bgFooter,
    fontWeight: 700,
    borderTop: `2px solid ${theme.colors.borderDark}`,
    borderBottom: "none",
    color: theme.colors.textMain,
    textAlign: "center",
    backgroundClip: "padding-box",
};

const pageButtonStyle = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "36px",
    height: "36px",
    padding: "0 12px",
    margin: "0 2px",
    borderRadius: "6px",
    border: `1px solid ${active ? theme.colors.primary : theme.colors.border}`,
    background: active ? theme.colors.primary : theme.colors.white,
    color: active ? theme.colors.white : theme.colors.textMain,
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: active ? 600 : 400,
    transition: "all 0.2s ease",
    boxShadow: active ? theme.shadows.sm : "none",
});

// Column definitions
const tableHeader = [
    { header: "", width: "50px", key: "select", noFilter: true },
    { header: "Date", width: "110px", key: "challanDate" },
    { header: "Challan No", width: "120px", key: "challanNo" },
    { header: "Job No", width: "140px", key: "jobNo" },
    { header: "Composition", width: "320px", key: "composition" },
    { header: "Color", width: "260px", key: "color" },
    { header: "From Factory", width: "180px", key: "fromFactory" },
    { header: "To Factory", width: "190px", key: "toFactory" },
    { header: "Sent For Aop", width: "110px", key: "sentForAop" },
    { header: "Return From Aop", width: "120px", key: "returnFromAop" },
    { header: "Receive From Aop", width: "120px", key: "receiveFromAop" },
    { header: "Finish Receive", width: "120px", key: "finishReceiveFromAop" },
    { header: "Process Loss %", width: "110px", key: "processLoss" },
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

// Helper: extract YYYY-MM from any date value
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

const Aop = () => {
    const [movements, setMovements] = useState([]);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({});
    const [openFilterKey, setOpenFilterKey] = useState(null);
    const [draftSelected, setDraftSelected] = useState(new Set());
    const [filterSearch, setFilterSearch] = useState("");
    const [selectedRows, setSelectedRows] = useState(new Set());
    const dropdownRef = useRef(null);
    const monthDropdownRef = useRef(null);
    const [totalPages, setTotalPages] = useState(1);
    const [challanIds, setChallanIds] = useState([]);

    const [search, setSearch] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [isLoading, setIsLoading] = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const [editedData, setEditedData] = useState({});

    // Excel-like Month Filter States
    const [selectedMonths, setSelectedMonths] = useState(new Set());
    const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
    const [monthDraftSelected, setMonthDraftSelected] = useState(new Set());
    const [monthSearch, setMonthSearch] = useState("");

    const [hoveredRow, setHoveredRow] = useState(null);

    const { fetchData, loading } = useFetchData();
    const axiosPublic = useAxiosPublic();
    const axiosSecure = useAxiosPrivate();

    useEffect(() => {
        if (search) return;
        fetchData(`/api/challan-movement/aopOrder?page=${page}&limit=10`)
            .then(data => {
                if (data) {
                    const payload = Array.isArray(data) ? data : (data.data || []);
                    setMovements(payload);
                    setTotalPages(data.pagination?.totalPages || 1);
                }
            });
    }, [fetchData, page, refreshKey, search]);

    useEffect(() => {
        if (!openFilterKey) return;
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenFilterKey(null);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [openFilterKey]);

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

    const allRows = useMemo(() => {
        if (!movements || !Array.isArray(movements)) return [];
        const rowMap = new Map();
        const order = [];
        const extractJobNo = (item) => item?.workOrder?.jobNo || (typeof item?.workOrder === 'string' ? item.workOrder : null);
        const makeKey = (challanNo, jobNo, comp, color) => `${challanNo}|${jobNo}|${comp}|${color}`;

        const getOrCreateRow = (challanNo, jobNo, comp, color, source) => {
            const key = makeKey(challanNo, jobNo, comp, color);
            let row = rowMap.get(key);
            if (!row) {
                row = {
                    rowKey: key,
                    deliveryId: source?.id || null,
                    chId: source?.id || challanNo,
                    challanNo,
                    jobNo,
                    composition: comp || "-",
                    color: color || "-",
                    challanDate: source?.deliveryDate || source?.challanDate || "",
                    toFactory: source?.toFactory || "",
                    fromFactory: source?.fromFactory || "",
                    sentForAop: 0,
                    returnFromAop: 0,
                    receiveFromAop: 0,
                    finishReceiveFromAop: 0,
                    deliveryQty: 0,
                    unitePrice: Number(source?.unitePrice) || 0,
                    paidBillingAmount: Number(source?.paidBillingAmount) || 0,
                };
                rowMap.set(key, row);
                order.push(key);
            }
            return row;
        };

        const applyDelivery = (row, dv, source) => {
            const qty = Number(dv?.deliveryQty ?? dv?.totalQty) || 0;
            row.deliveryQty += qty;
            const type = String(dv?.deliveryType || "").toLowerCase().replace(/[\s_-]+/g, "");
            if (type.includes("sentforaop")) row.sentForAop += qty;
            else if (type.includes("aopfinishfabricrcvd") || type.includes("finishfabric") || type.includes("finishreceive") || type.includes("finishreceived") || type.includes("returnfromaop")) row.finishReceiveFromAop += qty;
            else if (type.includes("receivedfromaop") || type.includes("receivefromaop")) row.receiveFromAop += qty;

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
                    facets.push({ comp: c?.composition || item?.composition || "-", color: c?.color || item?.color || "-", qty: qtyNum });
                });
            } else if (typeof item?.color === "string" && item.color.includes(", ")) {
                item.color.split(", ").map((s) => s.trim()).filter(Boolean).forEach((colorPart) => {
                    facets.push({ comp: item?.composition || "-", color: colorPart, qty: null });
                });
            }
            if (facets.length === 0) facets.push({ comp: item?.composition || "-", color: item?.color || "-", qty: null });
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
                    const row = getOrCreateRow(challanNo, jobNo, comp, color, dv);
                    if (item.unitePrice && !row.unitePrice) row.unitePrice = Number(item.unitePrice);
                    applyDelivery(row, dv, item);
                });
            } else if (item.challanNo !== undefined && item.challanNo !== null) {
                const facets = getFacets(item);
                const hasFacetQty = facets.some((f) => f.qty !== null);
                facets.forEach((f) => {
                    const row = getOrCreateRow(item.challanNo, jobNo, f.comp, f.color, item);
                    if (hasFacetQty) {
                        if (f.qty !== null) applyDelivery(row, { ...item, deliveryQty: f.qty }, item);
                    } else if (facets.length === 1) {
                        applyDelivery(row, item, item);
                    }
                });
            }
        });

        return order.map((key) => {
            const row = rowMap.get(key);
            const processLoss = row.receiveFromAop > 0 ? ((row.receiveFromAop - row.finishReceiveFromAop) / row.receiveFromAop) * 100 : 0;
            return { ...row, billingAmount: row.receiveFromAop * row.unitePrice, processLoss };
        });
    }, [movements]);

    const processedRows = useMemo(() => {
        return allRows.map(row => {
            const edits = editedData[row.rowKey] || {};
            const getVal = (key) => edits[key] !== undefined ? edits[key] : row[key];
            const sentForAop = Number(getVal('sentForAop')) || 0;
            const returnFromAop = Number(getVal('returnFromAop')) || 0;
            const receiveFromAop = Number(getVal('receiveFromAop')) || 0;
            const finishReceiveFromAop = Number(getVal('finishReceiveFromAop')) || 0;
            const processLoss = receiveFromAop > 0 ? ((receiveFromAop - finishReceiveFromAop) / receiveFromAop) * 100 : 0;
            const billingAmount = receiveFromAop * row.unitePrice;
            return {
                ...row, deliveryId: row.deliveryId, challanNo: getVal('challanNo'),
                fromFactory: getVal('fromFactory'), toFactory: getVal('toFactory'),
                sentForAop, returnFromAop, receiveFromAop, finishReceiveFromAop, processLoss, billingAmount
            };
        });
    }, [allRows, editedData]);

    const monthOptions = useMemo(() => {
        const set = new Set();
        processedRows.forEach((row) => {
            const key = getMonthKey(row.challanDate);
            if (key) set.add(key);
        });
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [processedRows]);

    // Clean up selected months if they no longer exist in data
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

    const filterOptions = useMemo(() => {
        const opts = {};
        tableHeader.forEach((col) => {
            if (col.noFilter) return;
            const set = new Set();
            processedRows.forEach((row) => {
                if (col.key === 'challanDate') {
                    try {
                        const d = new Date(row.challanDate);
                        if (!isNaN(d.getTime())) set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                        else set.add(String(row.challanDate || ""));
                    } catch (e) { set.add(String(row.challanDate || "")); }
                } else set.add(String(row[col.key] ?? ""));
            });
            opts[col.key] = col.key === 'challanDate'
                ? Array.from(set).sort((a, b) => b.localeCompare(a))
                : Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        });
        return opts;
    }, [processedRows]);

    const filteredRows = useMemo(() => processedRows.filter((row) => {
        // Excel-like Month Filter Logic
        if (selectedMonths.size > 0) {
            const rowMonth = getMonthKey(row.challanDate);
            if (!rowMonth || !selectedMonths.has(rowMonth)) return false;
        }
        
        return tableHeader.every((col) => {
            if (col.noFilter) return true;
            const selected = filters[col.key];
            if (!selected) return true;
            if (col.key === 'challanDate') {
                let rowMonth = "";
                try {
                    const d = new Date(row.challanDate);
                    if (!isNaN(d.getTime())) rowMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    else rowMonth = String(row.challanDate || "");
                } catch (e) { rowMonth = String(row.challanDate || ""); }
                return selected.has(rowMonth);
            }
            return selected.has(String(row[col.key] ?? ""));
        });
    }), [processedRows, filters, selectedMonths]);

    const totals = useMemo(() => {
        const t = { sentForAop: 0, returnFromAop: 0, receiveFromAop: 0, finishReceiveFromAop: 0, billingAmount: 0 };
        filteredRows.forEach((row) => {
            t.sentForAop += Number(row.sentForAop) || 0;
            t.returnFromAop += Number(row.returnFromAop) || 0;
            t.receiveFromAop += Number(row.receiveFromAop) || 0;
            t.finishReceiveFromAop += Number(row.finishReceiveFromAop) || 0;
            t.billingAmount += Number(row.billingAmount) || 0;
        });
        t.processLoss = t.receiveFromAop > 0 ? ((t.receiveFromAop - t.finishReceiveFromAop) / t.receiveFromAop) * 100 : 0;
        return t;
    }, [filteredRows]);

    const goToPage = (p) => { if (p < 1 || p > totalPages) return; setPage(p); };
    const pageNumbers = useMemo(() => {
        const nums = [];
        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) nums.push(p);
            else if (nums[nums.length - 1] !== "...") nums.push("...");
        }
        return nums;
    }, [totalPages, page]);

    const openFilter = (key) => {
        if (openFilterKey === key) { setOpenFilterKey(null); return; }
        const options = filterOptions[key] || [];
        const current = filters[key];
        setDraftSelected(current ? new Set(current) : new Set(options));
        setFilterSearch("");
        setOpenFilterKey(key);
    };
    const toggleDraftValue = (val) => setDraftSelected((prev) => { const next = new Set(prev); if (next.has(val)) next.delete(val); else next.add(val); return next; });
    const toggleSelectAllDraft = (options) => setDraftSelected((prev) => (prev.size === options.length ? new Set() : new Set(options)));
    const applyFilter = (key, options) => {
        setFilters((prev) => {
            const next = { ...prev };
            if (draftSelected.size === options.length) delete next[key];
            else next[key] = new Set(draftSelected);
            return next;
        });
        setOpenFilterKey(null);
    };
    const clearFilter = (key) => { setFilters((prev) => { const next = { ...prev }; delete next[key]; return next; }); setOpenFilterKey(null); };

    // ===== MONTH FILTER EXCEL-LIKE BEHAVIOR =====
    const openMonthFilter = () => {
        if (monthDropdownOpen) {
            setMonthDropdownOpen(false);
            setMonthSearch("");
            return;
        }
        // Initialize draft with current selection, or all options if none selected
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

    const handleBillPreparation = (challanId) => {
        if (challanIds.includes(challanId)) setChallanIds((prev) => prev.filter(id => id !== challanId));
        else setChallanIds((prev) => [...prev, challanId]);
    };

    const handleGenerateBill = async () => {
        if (challanIds.length === 0) { alert("Please select at least one challan to generate the bill."); return; }
        try {
            const response = await axiosPublic.post("/api/generate-bill", { challanIds }, { responseType: "blob" });
            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `bill-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Bill generation failed:", error);
            alert("Failed to generate bill. Please try again.");
        }
    };

    const handleChallanSearch = async () => {
        if (!search.trim()) { alert("Please enter at least one challan number or job number."); return; }
        setSearchLoading(true); setSearchError(null); setPage(1);
        const searchArray = search.split(/[\s,]+/).filter(Boolean);
        try {
            const res = await axiosPublic.get("/api/aopOrder/challan/search", { params: { challans: searchArray.join(","), context: "aopOrder" } });
            let searchData = [];
            if (Array.isArray(res.data)) searchData = res.data;
            else if (Array.isArray(res.data?.data)) searchData = res.data.data;
            setMovements(searchData); setTotalPages(1);
        } catch (err) { setSearchError("Failed to search."); setMovements([]); }
        finally { setSearchLoading(false); }
    };

    const handleCellEdit = (rowKey, colKey, value) => {
        setEditedData(prev => ({ ...prev, [rowKey]: { ...(prev[rowKey] || {}), [colKey]: value } }));
    };

    const handleSaveChanges = async () => {
        setIsLoading(true);
        try {
            const payload = Object.entries(editedData).map(([rowKey, edits]) => {
                const originalRow = allRows.find(r => r.rowKey === rowKey);
                return { deliveryId: originalRow?.deliveryId || originalRow?.chId || rowKey, rowKey, ...edits };
            });
            console.log("Saving edited AOP data:", payload);
            const update = await axiosSecure.patch("/api/edit-challan", payload);
            if (update.status === 200) {
                alert("Changes saved successfully!");
                setEditedData({});
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error("Failed to save changes:", error);
            alert("Failed to save changes.");
        } finally { setIsLoading(false); }
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
        link.setAttribute("download", `AOP_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const editableFields = ['challanNo', 'fromFactory', 'toFactory', 'sentForAop', 'returnFromAop', 'receiveFromAop', 'finishReceiveFromAop'];
    const numericFields = ['sentForAop', 'returnFromAop', 'receiveFromAop', 'finishReceiveFromAop'];
    const hasUnsavedChanges = Object.keys(editedData).length > 0;

    // ===== CLEAR-ALL FILTERS =====
    const hasActiveFilters =
        Object.keys(filters || {}).length > 0 ||
        (selectedMonths && selectedMonths.size > 0) ||
        !!search;

    const handleClearAllFilters = () => {
        // Clear column filters
        setFilters({});
        setOpenFilterKey(null);
        setFilterSearch("");
        setDraftSelected(new Set());

        // Clear month filter
        setSelectedMonths(new Set());
        setMonthDraftSelected(new Set());
        setMonthDropdownOpen(false);
        setMonthSearch("");

        // Clear search
        if (search) {
            setSearch("");
            setSearchError(null);
            setPage(1);
            setRefreshKey(prev => prev + 1);
        }
    };
    // =============================

    const getCellBaseStyle = (row, idx) => {
        const isHovered = hoveredRow === row.rowKey;
        let bg = isHovered ? theme.colors.bgHover : (idx % 2 === 0 ? theme.colors.white : '#fafbfc');
        return {
            ...cellStyle,
            backgroundColor: bg,
        };
    };

    const getEditedCellStyle = (row, colKey) => {
        const isEdited = editedData[row.rowKey]?.[colKey] !== undefined;
        return isEdited ? { backgroundColor: theme.colors.warning } : {};
    };

    const renderCell = (row, colKey) => {
        const isEditing = editingCell?.rowKey === row.rowKey && editingCell?.colKey === colKey;
        const currentValue = editedData[row.rowKey]?.[colKey] !== undefined ? editedData[row.rowKey][colKey] : row[colKey];
        const isNumber = numericFields.includes(colKey);

        if (isEditing) {
            return (
                <input
                    type={isNumber ? "number" : "text"}
                    step={isNumber ? "0.01" : undefined}
                    value={currentValue || ""}
                    onChange={(e) => handleCellEdit(row.rowKey, colKey, isNumber ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell(null); }}
                    autoFocus
                    style={{
                        width: '100%', height: '100%', border: `2px solid ${theme.colors.primary}`,
                        borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem',
                        textAlign: 'center', boxSizing: 'border-box',
                        outline: 'none', backgroundColor: theme.colors.white, margin: '-4px -8px',
                        fontFamily: 'inherit', whiteSpace: 'normal', wordBreak: 'break-word'
                    }}
                />
            );
        }

        return (
            <div
                onClick={() => editableFields.includes(colKey) && setEditingCell({ rowKey: row.rowKey, colKey })}
                style={{
                    minHeight: '20px', textAlign: 'center',
                    fontVariantNumeric: isNumber ? 'tabular-nums' : 'normal',
                    opacity: currentValue ? 1 : 0.5,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                }}
                title={editableFields.includes(colKey) ? "Click to edit" : ""}
            >
                {isNumber
                    ? (Number(currentValue) > 0 ? Number(currentValue).toFixed(2) : "-")
                    : (currentValue || "-")
                }
            </div>
        );
    };

    if (loading && movements.length === 0 && !searchLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: theme.colors.textMuted, fontFamily: 'inherit' }}>
                <Loader size={24} className="animate-spin" style={{ marginRight: 10 }} /> Loading data...
            </div>
        );
    }

    const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(r.rowKey));

    return (
        <div style={{ width: "100%", padding: "24px", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: theme.colors.textMain }}>

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
                        onClick={() => { setSearch(""); setSearchError(null); setPage(1); setRefreshKey(prev => prev + 1); }}
                    >
                        <X size={16} /> Clear
                    </button>
                )}

                {/* ===== EXCEL-LIKE MONTH FILTER TAB ===== */}
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
                                {/* Filter Clear Tab appears when month filter is active */}
                                {selectedMonths.size > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearMonthFilter();
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: theme.colors.primary,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: 2,
                                            borderRadius: '50%',
                                            transition: 'background 0.15s'
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
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    left: 0,
                                    zIndex: 60,
                                    background: theme.colors.white,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radius,
                                    width: 260,
                                    maxHeight: 360,
                                    boxShadow: theme.shadows.lg,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    fontFamily: 'inherit',
                                    overflow: 'hidden'
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
                                            width: "100%",
                                            padding: "8px 10px",
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            fontFamily: 'inherit'
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
                {/* ===== END MONTH FILTER TAB ===== */}

                {/* ===== CLEAR ALL FILTERS BUTTON ===== */}
                {hasActiveFilters && (
                    <button
                        onClick={handleClearAllFilters}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#fef2f2',
                            color: '#b91c1c',
                            padding: "10px 16px",
                            borderRadius: theme.radius,
                            border: '1px solid #fecaca',
                            cursor: "pointer",
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            transition: 'all 0.15s ease',
                            boxShadow: theme.shadows.sm
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                        title="Clear all active filters"
                    >
                        <X size={16} /> Clear All Filters
                    </button>
                )}
                {/* ===== END CLEAR ALL FILTERS BUTTON ===== */}

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

                {hasUnsavedChanges && (
                    <button
                        onClick={handleSaveChanges}
                        disabled={isLoading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: isLoading ? theme.colors.textMuted : theme.colors.success,
                            color: theme.colors.white, padding: "10px 24px", borderRadius: theme.radius,
                            border: "none", cursor: isLoading ? "not-allowed" : "pointer",
                            fontSize: '0.875rem', fontWeight: 600, boxShadow: theme.shadows.sm, fontFamily: 'inherit'
                        }}
                    >
                        {isLoading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                        {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                )}
            </div>

            {searchError && (
                <div style={{
                    padding: "12px 16px", color: "#991b1b", background: "#fef2f2",
                    border: "1px solid #fecaca", borderRadius: theme.radius, marginBottom: "16px",
                    fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit'
                }}>
                    <X size={16} /> {searchError}
                </div>
            )}

            {challanIds.length > 0 && (
                <div style={{
                    marginBottom: "16px", padding: "12px 16px", background: "#eff6ff",
                    border: "1px solid #bfdbfe", borderRadius: theme.radius,
                    display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit'
                }}>
                    <span style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: 500 }}>
                        {challanIds.length} challan{challanIds.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={handleGenerateBill}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#1e40af', color: theme.colors.white,
                            padding: "8px 16px", borderRadius: '6px', border: "none",
                            cursor: "pointer", fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit'
                        }}
                    >
                        Generate Bill PDF
                    </button>
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
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedRows(new Set(filteredRows.map(r => r.rowKey)));
                                                        else setSelectedRows(new Set());
                                                    }}
                                                    style={{ accentColor: theme.colors.primary, cursor: 'pointer', width: 16, height: 16 }}
                                                />
                                            ) : th.header}
                                        </th>
                                    );
                                }
                                const options = filterOptions[th.key] || [];
                                const isActive = !!filters[th.key];
                                const isOpen = openFilterKey === th.key;
                                return (
                                    <th key={th.key} style={{ ...thStickyStyle, width: th.width, overflow: "visible", ...frozen }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                            <span style={{
                                                overflow: "visible",
                                                whiteSpace: "normal",
                                                wordBreak: "break-word",
                                                textAlign: "center",
                                                flex: 1
                                            }}>{th.header}</span>
                                            <button
                                                onClick={() => openFilter(th.key)}
                                                style={{
                                                    border: "none", background: isActive ? theme.colors.primary : "transparent",
                                                    color: isActive ? theme.colors.white : theme.colors.textMuted,
                                                    cursor: "pointer", padding: "2px 4px", borderRadius: '4px',
                                                    display: 'flex', alignItems: 'center', transition: 'all 0.15s', flexShrink: 0
                                                }}
                                            >
                                                <Filter size={12} />
                                            </button>
                                        </div>

                                        {isOpen && (
                                            <div ref={dropdownRef} style={{
                                                position: "absolute", top: "100%", left: 0, zIndex: 100,
                                                background: theme.colors.white, border: `1px solid ${theme.colors.border}`,
                                                borderRadius: theme.radius, width: 240, maxHeight: 320,
                                                boxShadow: theme.shadows.lg, display: "flex", flexDirection: "column",
                                                textAlign: "left", marginTop: 4, fontFamily: 'inherit'
                                            }}>
                                                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${theme.colors.border}` }}>
                                                    <input
                                                        type="text" value={filterSearch}
                                                        onChange={(e) => setFilterSearch(e.target.value)}
                                                        placeholder="Filter values..." autoFocus
                                                        style={{
                                                            width: "100%", padding: "8px 10px",
                                                            border: `1px solid ${theme.colors.border}`, borderRadius: '6px',
                                                            fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
                                                    <label style={{
                                                        display: "flex", alignItems: "center", gap: 8,
                                                        fontWeight: 600, marginBottom: 8, fontSize: '0.8rem',
                                                        color: theme.colors.textMuted, cursor: 'pointer'
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={draftSelected.size === options.length && options.length > 0}
                                                            onChange={() => toggleSelectAllDraft(options)}
                                                            style={{ accentColor: theme.colors.primary }}
                                                        />
                                                        Select All ({options.length})
                                                    </label>
                                                    <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: 6 }}>
                                                        {options.filter((val) => {
                                                            let displayVal = val;
                                                            if (th.key === 'challanDate' && /^\d{4}-\d{2}$/.test(val)) {
                                                                const [y, m] = val.split('-');
                                                                displayVal = new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                                                            }
                                                            return String(displayVal).toLowerCase().includes(filterSearch.toLowerCase());
                                                        }).map((val) => {
                                                            let displayVal = val;
                                                            if (th.key === 'challanDate' && /^\d{4}-\d{2}$/.test(val)) {
                                                                const [y, m] = val.split('-');
                                                                displayVal = new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                                                            }
                                                            return (
                                                                <label key={val} style={{
                                                                    display: "flex", alignItems: "center", gap: 8,
                                                                    fontSize: "0.8rem", padding: "4px 0", cursor: 'pointer',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    <input
                                                                        type="checkbox" checked={draftSelected.has(val)}
                                                                        onChange={() => toggleDraftValue(val)}
                                                                        style={{ accentColor: theme.colors.primary }}
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
                                                    padding: "10px 12px", borderTop: `1px solid ${theme.colors.border}`,
                                                    background: theme.colors.bgHeader, borderRadius: `0 0 ${theme.radius} ${theme.radius}`
                                                }}>
                                                    <button onClick={() => clearFilter(th.key)} style={{
                                                        ...pageButtonStyle(false), fontSize: "0.75rem", padding: '6px 14px', height: 'auto', fontFamily: 'inherit'
                                                    }}>Clear</button>
                                                    <button onClick={() => applyFilter(th.key, options)} style={{
                                                        ...pageButtonStyle(true), fontSize: "0.75rem", padding: '6px 14px', height: 'auto', fontFamily: 'inherit'
                                                    }}>Apply</button>
                                                </div>
                                            </div>
                                        )}
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
                                    const baseStyle = { ...getCellBaseStyle(row, idx), ...getEditedCellStyle(row, th.key), ...frozen };

                                    if (th.key === 'select') {
                                        return (
                                            <td key={th.key} style={baseStyle}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.has(row.rowKey)}
                                                    onChange={(e) => {
                                                        const next = new Set(selectedRows);
                                                        if (e.target.checked) next.add(row.rowKey); else next.delete(row.rowKey);
                                                        setSelectedRows(next);
                                                    }}
                                                    onClick={() => handleBillPreparation(row.chId)}
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
                                                        background: '#f1f5f9', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word'
                                                    }}>{row.color}</span>
                                                ) : "-"}
                                            </td>
                                        );
                                    }

                                    if (th.key === 'processLoss') {
                                        return (
                                            <td key={th.key} style={baseStyle}>
                                                {row.receiveFromAop > 0 ? (
                                                    <span style={{
                                                        color: Number(row.processLoss) > 5 ? '#dc2626' : theme.colors.textMain,
                                                        fontWeight: Number(row.processLoss) > 5 ? 600 : 400,
                                                        fontVariantNumeric: 'tabular-nums', whiteSpace: 'normal', wordBreak: 'break-word'
                                                    }}>
                                                        {Number(row.processLoss).toFixed(2)}%
                                                    </span>
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

                                    return (
                                        <td key={th.key} style={baseStyle}>
                                            {renderCell(row, th.key)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {filteredRows.length === 0 && (
                            <tr>
                                <td style={{ ...cellStyle, padding: 40, color: theme.colors.textMuted, whiteSpace: 'normal' }} colSpan={tableHeader.length}>
                                    {movements.length === 0
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
                                    if (['sentForAop', 'returnFromAop', 'receiveFromAop', 'finishReceiveFromAop', 'billingAmount'].includes(th.key)) {
                                        return (
                                            <td key={th.key} style={{ ...tfootCellStyle, fontVariantNumeric: 'tabular-nums', fontWeight: th.key === 'billingAmount' ? 800 : 700, ...frozen }}>
                                                {totals[th.key] > 0 ? totals[th.key].toFixed(2) : "-"}
                                            </td>
                                        );
                                    }
                                    if (th.key === 'processLoss') {
                                        return (
                                            <td key={th.key} style={{ ...tfootCellStyle, fontVariantNumeric: 'tabular-nums', ...frozen }}>
                                                {totals.receiveFromAop > 0 ? totals.processLoss.toFixed(2) + "%" : "-"}
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

            {!search && totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: 'center', marginTop: 20, gap: 4, fontFamily: 'inherit' }}>
                    <button
                        style={{ ...pageButtonStyle(false), opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        onClick={() => goToPage(page - 1)} disabled={page === 1}
                    >
                        Prev
                    </button>
                    {pageNumbers.map((p, i) =>
                        p === "..."
                            ? <span key={`e-${i}`} style={{ margin: "0 6px", color: theme.colors.textMuted, letterSpacing: 2 }}>...</span>
                            : <button key={p} style={pageButtonStyle(p === page)} onClick={() => goToPage(p)}>{p}</button>
                    )}
                    <button
                        style={{ ...pageButtonStyle(false), opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        onClick={() => goToPage(page + 1)} disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default Aop;