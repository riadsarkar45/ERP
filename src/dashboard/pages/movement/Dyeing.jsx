import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import { formatToErpDate } from '../../../helpers/date/formateDate';
import useAxiosPublic from '../../../hooks/Axios';

const cellStyle = { border: "1px solid #999", padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle", textAlign: "center" };
const thStickyStyle = { ...cellStyle, position: "sticky", top: 0, zIndex: 10, background: "#f3f4f6" };
const pageButtonStyle = (active) => ({ border: "1px solid #999", background: active ? "#333" : "#fff", color: active ? "#fff" : "#333", padding: "4px 10px", margin: "0 2px", borderRadius: 4, cursor: "pointer", fontSize: "0.9rem" });

const tableHeader = [
    { header: "", width: "40px", key: "select", noFilter: true },
    { header: "Date", width: "7%", key: "challanDate" },
    { header: "Challan No", width: "7%", key: "challanNo" },
    { header: "Job No", width: "10%", key: "jobNo" },
    { header: "Composition", width: "12%", key: "composition" },
    { header: "Color", width: "9%", key: "color" },
    { header: "From Factory", width: "8%", key: "fromFactory" },
    { header: "To Factory", width: "8%", key: "toFactory" },
    { header: "Grey Del", width: "7%", key: "greyDelivery" },
    { header: "Grey Rec", width: "7%", key: "greyReceive" },
    { header: "Grey Ret", width: "6%", key: "greyReturn" },
    { header: "Finish Rec", width: "7%", key: "finishReceive" },
    { header: "Price/KG", width: "6%", key: "unitePrice" },
    { header: "Billing", width: "6%", key: "billingAmount" },
];

const Dyeing = () => {
    const [movements, setMovements] = useState([]);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({});
    const [openFilterKey, setOpenFilterKey] = useState(null);
    const [draftSelected, setDraftSelected] = useState(new Set());
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [totalPages, setTotalPages] = useState(1);
    const [filterSearch, setFilterSearch] = useState("");
    const [search, setSearch] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const dropdownRef = useRef(null);
    const { fetchData, loading } = useFetchData();
    const axiosPublic = useAxiosPublic();

    useEffect(() => {
        if (search) return;
        fetchData(`/api/challan-movement/dyeingOrder?page=${page}&limit=10`).then(data => {
            if (data) {
                const payload = Array.isArray(data) ? data : (data.data || []);
                setMovements(payload);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        });
    }, [fetchData, page, refreshKey, search]);

    useEffect(() => {
        if (!openFilterKey) return;
        const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenFilterKey(null); };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [openFilterKey]);

    // ── Group movements into rows — ONE ROW PER (challan + job + composition + COLOR) ──
    const allRows = useMemo(() => {
        if (!movements || !Array.isArray(movements)) return [];
        const grouped = {};
        const order = [];
        const extractJobNo = (item) => item?.workOrder?.jobNo || (typeof item?.workOrder === 'string' ? item.workOrder : null);

        const ensureRow = (key, challanNo, source) => {
            if (!grouped[key]) {
                grouped[key] = {
                    rowKey: key,
                    chId: source?.id || challanNo,
                    challanNo: challanNo,
                    challanDate: source?.deliveryDate || source?.challanDate || "",
                    toFactory: source?.toFactory || "",
                    fromFactory: source?.fromFactory || "",
                    greyDelivery: 0, greyReceive: 0, greyReturn: 0, finishReceive: 0, deliveryQty: 0,
                    unitePrice: Number(source?.unitePrice) || 0,
                    compositionsSet: new Set(), colorsSet: new Set(), jobNoSet: new Set(),
                };
                order.push(key);
            }
            return grouped[key];
        };

        const applyDelivery = (row, dv, source) => {
            const qty = Number(dv?.deliveryQty ?? dv?.totalQty) || 0;
            row.deliveryQty += qty;
            const type = String(dv?.deliveryType || "").toLowerCase().replace(/[\s_-]+/g, "");
            if (type.includes("greydelivery")) row.greyDelivery += qty;
            else if (type.includes("greyreceived") || type.includes("greyreceive") || type.includes("greyfabricreceived")) row.greyReceive += qty;
            else if (type.includes("greyreturn")) row.greyReturn += qty;
            else if (type.includes("finishreceived") || type.includes("finishreceive")) row.finishReceive += qty;

            const price = Number(dv?.unitePrice || source?.unitePrice) || 0;
            if (price && !row.unitePrice) row.unitePrice = price;
            if (!row.toFactory && dv?.toFactory) row.toFactory = dv.toFactory;
            if (!row.fromFactory && dv?.fromFactory) row.fromFactory = dv.fromFactory;
            if (dv?.deliveryDate && !row.challanDate) row.challanDate = dv.deliveryDate;
        };

        // Build per-color "facets" so each color becomes its own row
        const getFacets = (item) => {
            const facets = [];

            // 1) Backend provides a compositions array (composition + color pairs, optional qty)
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
            }
            // 2) Backend provides a merged color string ("color A, color B") — split it
            else if (typeof item?.color === "string" && item.color.includes(", ")) {
                item.color.split(", ").map((s) => s.trim()).filter(Boolean).forEach((colorPart) => {
                    facets.push({ comp: item?.composition || "-", color: colorPart, qty: null });
                });
            }

            // 3) Fallback: single color row
            if (facets.length === 0) {
                facets.push({ comp: item?.composition || "-", color: item?.color || "-", qty: null });
            }
            return facets;
        };

        movements.forEach((item) => {
            if (!item) return;
            const jobNo = extractJobNo(item) || "-";

            if (Array.isArray(item.deliveries) && item.deliveries.length > 0) {
                // ── Deliveries branch: color/comp taken from delivery first, then item ──
                item.deliveries.forEach((dv) => {
                    const challanNo = dv?.challanNo;
                    if (challanNo === undefined || challanNo === null) return;

                    const comp = dv?.composition || item?.composition || "-";
                    const color = dv?.color || item?.color || "-";
                    const key = `${challanNo}|${jobNo}|${comp}|${color}`; // ← COLOR now part of the key
                    const row = ensureRow(key, challanNo, dv);
                    if (item.unitePrice && !row.unitePrice) row.unitePrice = Number(item.unitePrice);
                    row.compositionsSet.add(comp);
                    row.colorsSet.add(color);
                    row.jobNoSet.add(jobNo);
                    applyDelivery(row, dv, item);
                });
            } else if (item.challanNo !== undefined && item.challanNo !== null) {
                // ── Flat branch: expand each color facet into its own row ──
                const facets = getFacets(item);
                const hasFacetQty = facets.some((f) => f.qty !== null);

                facets.forEach((f) => {
                    const key = `${item.challanNo}|${jobNo}|${f.comp}|${f.color}`; // ← COLOR now part of the key
                    const row = ensureRow(key, item.challanNo, item);
                    row.compositionsSet.add(f.comp);
                    row.colorsSet.add(f.color);
                    row.jobNoSet.add(jobNo);

                    if (hasFacetQty) {
                        // per-color quantities exist → apply only this color's qty
                        if (f.qty !== null) applyDelivery(row, { ...item, deliveryQty: f.qty }, item);
                    } else if (facets.length === 1) {
                        // single color → behave exactly like before
                        applyDelivery(row, item, item);
                    }
                    // (multiple colors without per-color qty → qty stays "-" to avoid duplicating totals)
                });
            }
        });

        return order.map((k) => {
            const row = grouped[k];
            return {
                ...row,
                composition: Array.from(row.compositionsSet).join(", ") || "-",
                color: Array.from(row.colorsSet).join(", ") || "-",
                jobNo: Array.from(row.jobNoSet).join(", ") || "-",
                billingAmount: row.finishReceive * row.unitePrice,
            };
        });
    }, [movements]);

    const filterOptions = useMemo(() => {
        const opts = {};
        tableHeader.forEach((col) => {
            if (col.noFilter) return;
            const set = new Set();
            allRows.forEach((row) => set.add(String(row[col.key] ?? "")));
            opts[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        });
        return opts;
    }, [allRows]);

    const filteredRows = useMemo(() => allRows.filter((row) => tableHeader.every((col) => {
        if (col.noFilter) return true;
        const selected = filters[col.key];
        if (!selected) return true;
        return selected.has(String(row[col.key] ?? ""));
    })), [allRows, filters]);

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

    const handleChallanSearch = async () => {
        if (!search.trim()) { alert("Please enter at least one challan number."); return; }
        setSearchLoading(true); setSearchError(null); setPage(1);
        const challanArray = search.split(/[\s,]+/).filter(Boolean);
        try {
            const res = await axiosPublic.get("/api/dyeingOrder/challan/search", { params: { challans: challanArray.join(","), context: "dyeingOrder" } });
            let searchData = [];
            if (Array.isArray(res.data)) searchData = res.data;
            else if (Array.isArray(res.data?.data)) searchData = res.data.data;
            setMovements(searchData); setTotalPages(1);
        } catch (err) { setSearchError("Failed to search challans."); setMovements([]); }
        finally { setSearchLoading(false); }
    };

    const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(r.rowKey));
    if (loading && movements.length === 0 && !searchLoading) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
                <input style={{ border: "1px solid #93c5fd", padding: "8px 12px", borderRadius: "6px", minWidth: "250px", outline: "none" }} placeholder="Search by Challan Nos" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleChallanSearch(); }} />
                <button style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }} onClick={handleChallanSearch} disabled={searchLoading}>{searchLoading ? "Searching..." : "Search"}</button>
                {search && <button style={{ background: "#e5e7eb", color: "#374151", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }} onClick={() => { setSearch(""); setSearchError(null); setPage(1); setRefreshKey(prev => prev + 1); }}>Clear Search</button>}
            </div>
            {searchError && <div style={{ padding: "10px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "12px" }}>{searchError}</div>}

            <div style={{ width: "100%", maxHeight: "85vh", overflow: "auto", border: "1px solid #999" }}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                        <tr>
                            {tableHeader.map((th) => {
                                if (th.noFilter) return <th key={th.key} style={{ ...thStickyStyle, width: th.width }}><input type="checkbox" checked={allVisibleSelected} onChange={(e) => { if (e.target.checked) setSelectedRows(new Set(filteredRows.map(r => r.rowKey))); else setSelectedRows(new Set()); }} /></th>;
                                const options = filterOptions[th.key] || [];
                                const isActive = !!filters[th.key];
                                const isOpen = openFilterKey === th.key;
                                return (
                                    <th key={th.key} style={{ ...thStickyStyle, width: th.width, overflow: "visible" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.header}</span>
                                            <button onClick={() => openFilter(th.key)} style={{ border: "none", background: "none", cursor: "pointer", color: isActive ? "#2563eb" : "#666", fontSize: "0.8rem", padding: 2 }}>▾</button>
                                        </div>
                                        {isOpen && (
                                            <div ref={dropdownRef} style={{ position: "absolute", top: "100%", left: 0, zIndex: 20, background: "#fff", border: "1px solid #999", borderRadius: 4, width: 200, maxHeight: 280, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", textAlign: "left" }}>
                                                <div style={{ padding: 8, borderBottom: "1px solid #ddd" }}><input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Search..." autoFocus style={{ width: "100%", padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4 }} /></div>
                                                <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
                                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "bold", marginBottom: 6 }}><input type="checkbox" checked={draftSelected.size === options.length && options.length > 0} onChange={() => toggleSelectAllDraft(options)} />Select All</label>
                                                    {options.filter((val) => val.toLowerCase().includes(filterSearch.toLowerCase())).map((val) => (
                                                        <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", padding: "2px 0" }}><input type="checkbox" checked={draftSelected.has(val)} onChange={() => toggleDraftValue(val)} />{val === "" ? "(blank)" : val}</label>
                                                    ))}
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: 8, borderTop: "1px solid #ddd" }}>
                                                    <button onClick={() => clearFilter(th.key)} style={{ ...pageButtonStyle(false), fontSize: "0.75rem" }}>Clear</button>
                                                    <button onClick={() => applyFilter(th.key, options)} style={{ ...pageButtonStyle(true), fontSize: "0.75rem" }}>Apply</button>
                                                </div>
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row) => (
                            <tr key={row.rowKey}>
                                <td style={cellStyle}><input type="checkbox" checked={selectedRows.has(row.rowKey)} onChange={(e) => { const next = new Set(selectedRows); if (e.target.checked) next.add(row.rowKey); else next.delete(row.rowKey); setSelectedRows(next); }} /></td>
                                <td style={cellStyle}>{row.challanDate && row.challanDate !== "-" ? formatToErpDate(row.challanDate) : "-"}</td>
                                <td style={cellStyle}>{row.challanNo}</td>
                                <td style={cellStyle}>{row.jobNo}</td>
                                <td style={cellStyle}>{row.composition}</td>
                                <td style={cellStyle}>{row.color || "-"}</td>
                                <td style={cellStyle}>{row.fromFactory || "-"}</td>
                                <td style={cellStyle}>{row.toFactory || "-"}</td>
                                <td style={cellStyle}>{row.greyDelivery > 0 ? row.greyDelivery : "-"}</td>
                                <td style={cellStyle}>{row.greyReceive > 0 ? row.greyReceive : "-"}</td>
                                <td style={cellStyle}>{row.greyReturn > 0 ? row.greyReturn : "-"}</td>
                                <td style={cellStyle}>{row.finishReceive > 0 ? row.finishReceive : "-"}</td>
                                <td style={cellStyle}>{row.unitePrice > 0 ? row.unitePrice : "-"}</td>
                                <td style={cellStyle}>{row.billingAmount > 0 ? row.billingAmount : "-"}</td>
                            </tr>
                        ))}
                        {filteredRows.length === 0 && <tr><td style={cellStyle} colSpan={tableHeader.length}>{movements.length === 0 ? "No records found." : "No rows match filters."}</td></tr>}
                    </tbody>
                </table>
            </div>
            {!search && totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                    <button style={pageButtonStyle(false)} onClick={() => goToPage(page - 1)} disabled={page === 1}>Prev</button>
                    {pageNumbers.map((p, i) => p === "..." ? <span key={`e-${i}`} style={{ margin: "0 4px" }}>...</span> : <button key={p} style={pageButtonStyle(p === page)} onClick={() => goToPage(p)}>{p}</button>)}
                    <button style={pageButtonStyle(false)} onClick={() => goToPage(page + 1)} disabled={page === totalPages}>Next</button>
                </div>
            )}
        </div>
    );
};
export default Dyeing;