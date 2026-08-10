import React, { useEffect, useMemo, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import useAxiosPublic from '../../../hooks/Axios';
import { formatToErpDate } from '../../../helpers/date/formateDate';
import { fmtNumber } from './FormatNumber';
import { cellStyle, tableScrollWrapStyle } from './TableStyle';
import { useTableFilters } from './UseFilter';
import FilterableTh from './FilterBleth';

const mergedCellStyle = { ...cellStyle, background: "#f9fafb", fontWeight: "bold", verticalAlign: "middle" };

const thStickyStyle = {
    ...cellStyle,
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "#f3f4f6",
};

const tableHeader = [
    { header: "", width: "40px", key: "select", noFilter: true },
    { header: "Date", width: "10%", key: "challanDate" },
    { header: "Challan No", width: "9%", key: "challanNo" },
    { header: "Work Order Qty", width: "9%", key: "workOrderQty" },
    { header: "Composition", width: "10%", key: "composition" },
    { header: "Color", width: "10%", key: "color" },
    { header: "To Factory", width: "9%", key: "toFactory" },
    { header: "From Factory", width: "9%", key: "fromFactory" },
    { header: "Yarn Delivery", width: "10%", key: "yarnDelivery" },
    { header: "Yarn Return", width: "10%", key: "yarnReturn" },
    { header: "Greige Received", width: "10%", key: "greyFabricReceived" },
    { header: "Price Per KG", width: "9%", key: "unitePrice" },
    { header: "Billing Amount", width: "9%", key: "billingAmount" },
    { header: "Paid Billing Amount", width: "8%", key: "paidBillingAmount" },
];

const safeDate = (val) => {
    if (!val) return "-";
    try { return formatToErpDate(val); } catch (e) { return "-"; }
};

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

    // Handles BOTH nested (movement -> deliveries[]) AND flat delivery records.
    // Groups by challanNo, keeps insertion order so rowSpan blocks stay intact.
    const allRows = useMemo(() => {
        console.log("Knitting raw movements:", movements);
        if (!movements || !Array.isArray(movements)) return [];

        const grouped = {};
        const order = [];

        const ensureRow = (challanNo, source, mvId) => {
            if (!grouped[challanNo]) {
                grouped[challanNo] = {
                    rowKey: String(challanNo),
                    mvId: mvId ?? challanNo,
                    chId: source?.id || challanNo,
                    challanNo: challanNo,
                    challanDate: source?.deliveryDate || source?.challanDate || "",
                    toFactory: source?.toFactory || "",
                    fromFactory: source?.fromFactory || "",
                    yarnDelivery: 0,
                    yarnReturn: 0,
                    greyFabricReceived: 0,
                    deliveryQty: 0,
                    unitePrice: Number(source?.unitePrice) || 0,
                    paidBillingAmount: Number(source?.paidBillingAmount) || 0,
                    compositionsSet: new Set(),
                    colorsSet: new Set(),
                    workOrderQtySet: new Set(),
                };
                order.push(challanNo);
            }
            return grouped[challanNo];
        };

        const applyDelivery = (row, dv, source) => {
            const qty = Number(dv?.deliveryQty ?? dv?.totalQty) || 0;
            row.deliveryQty += qty;

            const type = String(dv?.deliveryType || "").toLowerCase().replace(/[\s_-]+/g, "");
            if (type.includes("yarndelivery")) row.yarnDelivery += qty;
            else if (type.includes("yarnreturn")) row.yarnReturn += qty;
            else if (
                type.includes("greyfabric") ||
                type.includes("greigereceived") ||
                type.includes("yarnreceived") ||
                type.includes("greyreceived")
            ) row.greyFabricReceived += qty;

            const comps = Array.isArray(dv?.compositions)
                ? dv.compositions
                : (Array.isArray(source?.compositions) ? source.compositions : []);

            comps.forEach((comp) => {
                if (comp?.composition) row.compositionsSet.add(comp.composition);
                if (comp?.color) row.colorsSet.add(comp.color);
                if (comp?.workOrderQty !== undefined && comp?.workOrderQty !== null) row.workOrderQtySet.add(comp.workOrderQty);
            });

            const price = Number(dv?.unitePrice || source?.unitePrice) || 0;
            if (price && !row.unitePrice) row.unitePrice = price;
            if (!row.toFactory && dv?.toFactory) row.toFactory = dv.toFactory;
            if (!row.fromFactory && dv?.fromFactory) row.fromFactory = dv.fromFactory;
            if (dv?.deliveryDate && !row.challanDate) row.challanDate = dv.deliveryDate;
        };

        movements.forEach((item) => {
            if (!item) return;

            if (Array.isArray(item.deliveries) && item.deliveries.length > 0) {
                // NESTED shape: movement -> deliveries[]
                item.deliveries.forEach((dv) => {
                    const challanNo = dv?.challanNo;
                    if (challanNo === undefined || challanNo === null) return;

                    const row = ensureRow(challanNo, dv, item.id);

                    // movement-level fields
                    if (item.unitePrice && !row.unitePrice) row.unitePrice = Number(item.unitePrice);
                    if (item.workOrderQty !== undefined && item.workOrderQty !== null) row.workOrderQtySet.add(item.workOrderQty);
                    if (item.composition) row.compositionsSet.add(item.composition);

                    applyDelivery(row, dv, item);
                });
            } else if (item.challanNo !== undefined && item.challanNo !== null) {
                // FLAT shape: the item itself is a delivery record
                const row = ensureRow(item.challanNo, item, item.challanNo);
                applyDelivery(row, item, item);
            }
        });

        const rows = order.map((cn) => {
            const row = grouped[cn];
            return {
                ...row,
                composition: Array.from(row.compositionsSet).join(", ") || "-",
                color: Array.from(row.colorsSet).join(", ") || "-",
                workOrderQty: Array.from(row.workOrderQtySet).join(", ") || "-",
                billingAmount: row.greyFabricReceived * row.unitePrice,
            };
        });

        console.log("Knitting parsed rows:", rows);
        return rows;
    }, [movements]);

    const {
        filters, openFilterKey, draftSelected, filterSearch, dropdownRef,
        filterOptions, filteredRows, setFilterSearch, openFilter,
        toggleDraftValue, toggleSelectAllDraft, applyFilter, clearFilter,
    } = useTableFilters(allRows, tableHeader);

    const filtersString = JSON.stringify(filters || {});

    // rowSpan grouping (Work Order Qty / Composition / Color merged per movement)
    const rows = useMemo(() => {
        const result = [];
        for (let i = 0; i < filteredRows.length; i++) {
            const row = filteredRows[i];
            const isFirstOfMovement = i === 0 || filteredRows[i - 1].mvId !== row.mvId;
            let movementRowSpan = 1;
            if (isFirstOfMovement) {
                for (let j = i + 1; j < filteredRows.length && filteredRows[j].mvId === row.mvId; j++) {
                    movementRowSpan++;
                }
            }
            result.push({ ...row, isFirstOfMovement, movementRowSpan });
        }
        return result;
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

        if (fetchAll) {
            queryParams.append('fetchAll', 'true');
            setIsFetchingAll(true);
        }

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value && Array.isArray(value) && value.length > 0) {
                    queryParams.append(key, value.join(','));
                } else if (value && typeof value === 'string' && value.length > 0) {
                    queryParams.append(key, value);
                }
            });
        }

        const queryString = queryParams.toString();
        const url = `/api/challan-movement/knittingOrder${queryString ? '?' + queryString : ''}`;

        fetchData(url)
            .then((res) => {
                if (!res) {
                    setFetchError("No response from server.");
                    return;
                }

                let payload = [];
                if (Array.isArray(res)) payload = res;
                else if (Array.isArray(res?.data)) payload = res.data;
                else if (Array.isArray(res?.data?.data)) payload = res.data.data;

                setMovements(payload);
            })
            .catch((err) => {
                console.error("Failed to load Knitting deliveries:", err);
                setFetchError("Failed to load data.");
                setPendingFilterKey(null);
            })
            .finally(() => {
                if (fetchAll) setIsFetchingAll(false);
            });

    }, [fetchData, filtersString, fetchAll, refreshKey, search]);

    useEffect(() => {
        if (fetchError && pendingFilterKey) {
            setPendingFilterKey(null);
            return;
        }
        if (pendingFilterKey && fetchAll && !isFetchingAll && !fetchError) {
            openFilter(pendingFilterKey);
            setPendingFilterKey(null);
        }
    }, [pendingFilterKey, fetchAll, isFetchingAll, fetchError, openFilter]);

    const handleOpenFilter = (key) => {
        if (!fetchAll) {
            if (!pendingFilterKey) setPendingFilterKey(key);
            setFetchAll(true);
            return;
        }
        openFilter(key);
    };

    const handleChallanSearch = async () => {
        if (!search.trim()) {
            alert("Please enter at least one challan number.");
            return;
        }

        setSearchLoading(true);
        setSearchError(null);

        const challanArray = search.split(/[\s,]+/).filter(Boolean);

        try {
            const res = await axiosPublic.get("/api/knittingOrder/challan/search", {
                params: {
                    challans: challanArray.join(","),
                    context: "knittingOrder",
                },
            });

            let searchData = [];
            if (Array.isArray(res.data)) searchData = res.data;
            else if (Array.isArray(res.data?.data)) searchData = res.data.data;
            else if (Array.isArray(res.data?.data?.data)) searchData = res.data.data.data;

            setMovements(searchData);
        } catch (err) {
            console.error(err);
            setSearchError("Failed to search challans.");
            setMovements([]);
        } finally {
            setSearchLoading(false);
        }
    };

    if (loading && movements.length === 0 && !searchLoading) {
        return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;
    }

    if (fetchError && !search) {
        return (
            <div style={{ padding: 20, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                {fetchError}
            </div>
        );
    }

    const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(r.rowKey));

    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
                <input
                    style={{ border: "1px solid #93c5fd", padding: "8px 12px", borderRadius: "6px", minWidth: "250px", outline: "none" }}
                    placeholder="Search by Challan Nos (e.g. 101, 102)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleChallanSearch(); }}
                />
                <button
                    style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: searchLoading ? "not-allowed" : "pointer", fontWeight: 600, opacity: searchLoading ? 0.7 : 1 }}
                    onClick={handleChallanSearch}
                    disabled={searchLoading}
                >
                    {searchLoading ? "Searching..." : "Search"}
                </button>
                {search && (
                    <button
                        style={{ background: "#e5e7eb", color: "#374151", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}
                        onClick={() => { setSearch(""); setSearchError(null); setRefreshKey(prev => prev + 1); }}
                    >
                        Clear Search
                    </button>
                )}
            </div>

            {searchError && (
                <div style={{ padding: "10px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "12px" }}>
                    {searchError}
                </div>
            )}

            {isFetchingAll && pendingFilterKey && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255, 255, 255, 0.70)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                    <div style={{ background: "#ffffff", border: "1px solid #93c5fd", borderRadius: 8, padding: "16px 24px", color: "#1d4ed8", fontWeight: 700, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" }}>
                        Loading all challans for filtering...
                    </div>
                </div>
            )}

            <div style={tableScrollWrapStyle}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                        <tr>
                            {tableHeader.map((th) => {
                                if (th.noFilter) {
                                    return (
                                        <th key={th.key} style={{ ...thStickyStyle, width: th.width, textAlign: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                                            />
                                        </th>
                                    );
                                }
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
                        {rows.map((row) => (
                            <tr key={row.rowKey}>
                                <td style={{ ...cellStyle, textAlign: "center" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.has(row.rowKey)}
                                        onChange={() => toggleRow(row.rowKey)}
                                    />
                                </td>
                                <td style={cellStyle}>{row.challanDate && row.challanDate !== "-" ? formatToErpDate(row.challanDate) : "-"}</td>
                                <td style={cellStyle}>{row.challanNo}</td>

                                {row.isFirstOfMovement && (
                                    <td style={mergedCellStyle} rowSpan={row.movementRowSpan}>{row.workOrderQty}</td>
                                )}
                                {row.isFirstOfMovement && (
                                    <td style={mergedCellStyle} rowSpan={row.movementRowSpan}>{row.composition}</td>
                                )}
                                {row.isFirstOfMovement && (
                                    <td style={mergedCellStyle} rowSpan={row.movementRowSpan}>{row.color}</td>
                                )}

                                <td style={cellStyle}>{row.toFactory || "-"}</td>
                                <td style={cellStyle}>{row.fromFactory || "-"}</td>

                                <td style={cellStyle}>{row.yarnDelivery > 0 ? fmtNumber(row.yarnDelivery) : "-"}</td>
                                <td style={cellStyle}>{row.yarnReturn > 0 ? fmtNumber(row.yarnReturn) : "-"}</td>
                                <td style={cellStyle}>{row.greyFabricReceived > 0 ? fmtNumber(row.greyFabricReceived) : "-"}</td>

                                <td style={cellStyle}>{row.unitePrice > 0 ? fmtNumber(row.unitePrice) : "-"}</td>
                                <td style={cellStyle}>{row.billingAmount > 0 ? fmtNumber(row.billingAmount) : "-"}</td>
                                <td style={cellStyle}>{row.paidBillingAmount > 0 ? fmtNumber(row.paidBillingAmount) : "-"}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td style={{ ...cellStyle, textAlign: "center", color: "#6b7280" }} colSpan={tableHeader.length}>
                                    {movements.length === 0 && !loading && !searchLoading ? "No records found." : "No rows match the current filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Knitting;