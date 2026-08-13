import React, { useEffect, useMemo, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import useAxiosPublic from '../../../hooks/Axios';
import { formatToErpDate } from '../../../helpers/date/formateDate';
import { fmtNumber } from './FormatNumber';
import { tableScrollWrapStyle } from './TableStyle';
import { useTableFilters } from './UseFilter';
import FilterableTh from './FilterBleth';

const cellStyle = { border: "1px solid #999", padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle", textAlign: "center" };
const thStickyStyle = { ...cellStyle, position: "sticky", top: 0, zIndex: 10, background: "#f3f4f6" };

const tableHeader = [
    { header: "", width: "40px", key: "select", noFilter: true },
    { header: "Date", width: "8%", key: "challanDate" },
    { header: "Challan No", width: "8%", key: "challanNo" },
    { header: "Job No", width: "10%", key: "jobNo" },
    { header: "Composition", width: "12%", key: "composition" },
    { header: "Color", width: "9%", key: "color" },
    { header: "From Factory", width: "8%", key: "fromFactory" },
    { header: "To Factory", width: "8%", key: "toFactory" },
    { header: "Yarn Del", width: "8%", key: "yarnDelivery" },
    { header: "Yarn Ret", width: "8%", key: "yarnReturn" },
    { header: "Greige Rec", width: "8%", key: "greyFabricReceived" },
    { header: "Price/KG", width: "7%", key: "unitePrice" },
    { header: "Billing", width: "7%", key: "billingAmount" },
];


const Knitting = () => {
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

    const { fetchData, loading } = useFetchData();
    const axiosPublic = useAxiosPublic();

    // ── Build rows — ONE ROW PER SOURCE RECORD (delivery, or item/color-facet) ──
    // IMPORTANT: rows are NEVER looked up/reused by a shared key and merged.
    // Every delivery / facet produces its own independent row with its own
    // qty, even if it shares the same challan + job + composition + color
    // as another row. That "same key -> merge qty" behavior was the bug.
    const allRows = useMemo(() => {
        if (!movements || !Array.isArray(movements)) return [];
        const rows = [];
        let rowCounter = 0;
        const extractJobNo = (item) => item?.workOrder?.jobNo || (typeof item?.workOrder === 'string' ? item.workOrder : null);

        const makeRow = (challanNo, jobNo, comp, color, source, mvId) => {
            rowCounter += 1;
            return {
                // rowCounter guarantees uniqueness even when challan/job/comp/color repeat
                rowKey: `${challanNo}|${jobNo}|${comp}|${color}|${rowCounter}`,
                mvId: mvId ?? challanNo,
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
                // ── Deliveries branch: one row PER delivery, never merged with another delivery ──
                item.deliveries.forEach((dv) => {
                    const challanNo = dv?.challanNo;
                    if (challanNo === undefined || challanNo === null) return;

                    const comp = dv?.composition || item?.composition || "-";
                    const color = dv?.color || item?.color || "-";
                    const row = makeRow(challanNo, jobNo, comp, color, dv, item.id);
                    if (item.unitePrice && !row.unitePrice) row.unitePrice = Number(item.unitePrice);
                    applyDelivery(row, dv, item);
                    rows.push(row);
                });
            } else if (item.challanNo !== undefined && item.challanNo !== null) {
                // ── Flat branch: expand each color facet into its own row, never merged across items ──
                const facets = getFacets(item);
                const hasFacetQty = facets.some((f) => f.qty !== null);

                facets.forEach((f) => {
                    const row = makeRow(item.challanNo, jobNo, f.comp, f.color, item, item.challanNo);

                    if (hasFacetQty) {
                        // per-color quantities exist → apply only this color's qty
                        if (f.qty !== null) applyDelivery(row, { ...item, deliveryQty: f.qty }, item);
                    } else if (facets.length === 1) {
                        // single color → behave exactly like before
                        applyDelivery(row, item, item);
                    }
                    // (multiple colors without per-color qty → qty stays 0/"-" to avoid guessing a split)
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
        filterOptions, filteredRows, setFilterSearch, openFilter,
        toggleDraftValue, toggleSelectAllDraft, applyFilter, clearFilter,
    } = useTableFilters(allRows, tableHeader);

    const filtersString = JSON.stringify(filters || {});

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

    const handleOpenFilter = (key) => {
        if (!fetchAll) { if (!pendingFilterKey) setPendingFilterKey(key); setFetchAll(true); return; }
        openFilter(key);
    };

    const handleChallanSearch = async () => {
        if (!search.trim()) { alert("Please enter at least one challan number."); return; }
        setSearchLoading(true); setSearchError(null);
        const challanArray = search.split(/[\s,]+/).filter(Boolean);
        try {
            const res = await axiosPublic.get("/api/knittingOrder/challan/search", { params: { challans: challanArray.join(","), context: "knittingOrder" } });
            let searchData = [];
            if (Array.isArray(res.data)) searchData = res.data;
            else if (Array.isArray(res.data?.data)) searchData = res.data.data;
            setMovements(searchData);
        } catch (err) { setSearchError("Failed to search challans."); setMovements([]); }
        finally { setSearchLoading(false); }
    };

    if (loading && movements.length === 0 && !searchLoading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;
    if (fetchError && !search) return <div style={{ padding: 20, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>{fetchError}</div>;

    const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(r.rowKey));

    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
                <input style={{ border: "1px solid #93c5fd", padding: "8px 12px", borderRadius: "6px", minWidth: "250px", outline: "none" }} placeholder="Search by Challan Nos" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleChallanSearch(); }} />
                <button style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }} onClick={handleChallanSearch} disabled={searchLoading}>{searchLoading ? "Searching..." : "Search"}</button>
                {search && <button style={{ background: "#e5e7eb", color: "#374151", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }} onClick={() => { setSearch(""); setSearchError(null); setRefreshKey(prev => prev + 1); }}>Clear Search</button>}
            </div>
            {searchError && <div style={{ padding: "10px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "12px" }}>{searchError}</div>}

            {isFetchingAll && pendingFilterKey && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255, 255, 255, 0.70)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                    <div style={{ background: "#ffffff", border: "1px solid #93c5fd", borderRadius: 8, padding: "16px 24px", color: "#1d4ed8", fontWeight: 700, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" }}>Loading all challans for filtering...</div>
                </div>
            )}

            <div style={tableScrollWrapStyle}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                        <tr>
                            {tableHeader.map((th) => {
                                if (th.noFilter) return <th key={th.key} style={{ ...thStickyStyle, width: th.width }}><input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} /></th>;
                                return (
                                    <FilterableTh
                                        key={th.key} column={th} options={filterOptions[th.key] || []}
                                        isActive={!!filters[th.key]} isOpen={openFilterKey === th.key}
                                        draftSelected={draftSelected} filterSearch={filterSearch}
                                        onOpenFilter={handleOpenFilter} onSearchChange={setFilterSearch}
                                        onToggleValue={toggleDraftValue} onToggleSelectAll={toggleSelectAllDraft}
                                        onApply={applyFilter} onClear={clearFilter} dropdownRef={dropdownRef}
                                    />
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row) => (
                            <tr key={row.rowKey}>
                                <td style={cellStyle}><input type="checkbox" checked={selectedRows.has(row.rowKey)} onChange={() => toggleRow(row.rowKey)} /></td>
                                <td style={cellStyle}>{row.challanDate && row.challanDate !== "-" ? formatToErpDate(row.challanDate) : "-"}</td>
                                <td style={cellStyle}>{row.challanNo}</td>
                                <td style={cellStyle}>{row.jobNo}</td>
                                <td style={cellStyle}>{row.composition}</td>
                                <td style={cellStyle}>{row.color || "-"}</td>
                                <td style={cellStyle}>{row.fromFactory || "-"}</td>
                                <td style={cellStyle}>{row.toFactory || "-"}</td>
                                <td style={cellStyle}>{row.yarnDelivery > 0 ? fmtNumber(row.yarnDelivery) : "-"}</td>
                                <td style={cellStyle}>{row.yarnReturn > 0 ? fmtNumber(row.yarnReturn) : "-"}</td>
                                <td style={cellStyle}>{row.greyFabricReceived > 0 ? fmtNumber(row.greyFabricReceived) : "-"}</td>
                                <td style={cellStyle}>{row.unitePrice > 0 ? fmtNumber(row.unitePrice) : "-"}</td>
                                <td style={cellStyle}>{row.billingAmount > 0 ? fmtNumber(row.billingAmount) : "-"}</td>
                            </tr>
                        ))}
                        {filteredRows.length === 0 && <tr><td style={cellStyle} colSpan={tableHeader.length}>{movements.length === 0 && !loading && !searchLoading ? "No records found." : "No rows match the current filters."}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default Knitting;