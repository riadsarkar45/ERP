import React, { useEffect, useMemo, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import useAxiosPublic from '../../../hooks/Axios';
import { formatToErpDate } from '../../../helpers/date/formateDate';
import { fmtNumber } from './FormatNumber';
import { tableScrollWrapStyle } from './TableStyle';
import { useTableFilters } from './UseFilter';
import FilterableTh from './FilterBleth';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';
import { Loader, Loader2 } from 'lucide-react';

const cellStyle = { border: "1px solid #999", padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle", textAlign: "center" };
const thStickyStyle = { ...cellStyle, position: "sticky", top: 0, zIndex: 10, background: "#f3f4f6" };
const tfootCellStyle = { ...cellStyle, position: "sticky", bottom: 0, zIndex: 10, background: "#f3f4f6", fontWeight: 700 };

// Added "ID" column to keep table alignment correct
const tableHeader = [
    { header: "", width: "40px", key: "select", noFilter: true },
    { header: "Date", width: "7%", key: "challanDate" },
    { header: "ID", width: "5%", key: "deliveryId", noFilter: true },
    { header: "Challan No", width: "8%", key: "challanNo" },
    { header: "Job No", width: "9%", key: "jobNo" },
    { header: "Composition", width: "11%", key: "composition" },
    { header: "Color", width: "8%", key: "color" },
    { header: "From Factory", width: "8%", key: "fromFactory" },
    { header: "To Factory", width: "8%", key: "toFactory" },
    { header: "Yarn Del", width: "7%", key: "yarnDelivery" },
    { header: "Yarn Ret", width: "7%", key: "yarnReturn" },
    { header: "Greige Rec", width: "7%", key: "greyFabricReceived" },
    { header: "Price/KG", width: "7%", key: "unitePrice" },
    { header: "Billing", width: "6%", key: "billingAmount" },
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

    // Editing states
    const [isLoading, setIsLoading] = useState(false)
    const [editingCell, setEditingCell] = useState(null); // { rowKey, colKey }
    const [editedData, setEditedData] = useState({}); // { [rowKey]: { [colKey]: value } }

    const { fetchData, loading } = useFetchData();
    const axiosPublic = useAxiosPublic();
    const axiosSecure = useAxiosPrivate();

    // ── Build rows ──
    const allRows = useMemo(() => {
        if (!movements || !Array.isArray(movements)) return [];
        const rows = [];
        let rowCounter = 0;
        const extractJobNo = (item) => item?.workOrder?.jobNo || (typeof item?.workOrder === 'string' ? item.workOrder : null);

        // Updated to accept and set deliveryId explicitly
        const makeRow = (challanNo, jobNo, comp, color, source, mvId, deliveryId) => {
            rowCounter += 1;
            return {
                rowKey: `${challanNo}|${jobNo}|${comp}|${color}|${rowCounter}`,
                mvId: mvId ?? challanNo,
                deliveryId: deliveryId ?? source?.id ?? null, // <-- Explicitly set here
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
                    // Pass dv.id as the deliveryId
                    const row = makeRow(challanNo, jobNo, comp, color, dv, item.id, dv.id);
                    if (item.unitePrice && !row.unitePrice) row.unitePrice = Number(item.unitePrice);
                    applyDelivery(row, dv, item);
                    rows.push(row);
                });
            } else if (item.challanNo !== undefined && item.challanNo !== null) {
                const facets = getFacets(item);
                const hasFacetQty = facets.some((f) => f.qty !== null);

                facets.forEach((f) => {
                    // Pass item.id as the deliveryId for flat items
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

    // Merge base rows with any unsaved edits and recalculate derived fields
    const processedRows = useMemo(() => {
        return allRows.map(row => {
            const edits = editedData[row.rowKey] || {};
            const getVal = (key) => edits[key] !== undefined ? edits[key] : row[key];

            const yarnDelivery = Number(getVal('yarnDelivery')) || 0;
            const yarnReturn = Number(getVal('yarnReturn')) || 0;
            const greyFabricReceived = Number(getVal('greyFabricReceived')) || 0;
            const unitePrice = Number(getVal('unitePrice')) || 0;

            const billingAmount = greyFabricReceived * unitePrice;

            return {
                ...row,
                deliveryId: row.deliveryId, // <-- Ensure it's carried over to processed rows
                challanNo: getVal('challanNo'),
                fromFactory: getVal('fromFactory'),
                toFactory: getVal('toFactory'),
                yarnDelivery,
                yarnReturn,
                greyFabricReceived,
                unitePrice,
                billingAmount
            };
        });
    }, [allRows, editedData]);

    const {
        filters, openFilterKey, draftSelected, filterSearch, dropdownRef,
        filterOptions, filteredRows, setFilterSearch, openFilter,
        toggleDraftValue, toggleSelectAllDraft, applyFilter, clearFilter,
    } = useTableFilters(processedRows, tableHeader);

    const filtersString = JSON.stringify(filters || {});

    const totals = useMemo(() => {
        const t = {
            yarnDelivery: 0,
            yarnReturn: 0,
            greyFabricReceived: 0,
            billingAmount: 0,
        };
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

    const handleOpenFilter = (key) => {
        if (!fetchAll) { if (!pendingFilterKey) setPendingFilterKey(key); setFetchAll(true); return; }
        openFilter(key);
    };

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

    // ── Editing Helpers ──
    const editableFields = ['challanNo', 'fromFactory', 'toFactory', 'yarnDelivery', 'yarnReturn', 'greyFabricReceived', 'unitePrice'];
    const numericFields = ['yarnDelivery', 'yarnReturn', 'greyFabricReceived', 'unitePrice'];
    const hasUnsavedChanges = Object.keys(editedData).length > 0;

    const getCellStyle = (row, colKey) => {
        const isEdited = editedData[row.rowKey]?.[colKey] !== undefined;
        return {
            ...cellStyle,
            backgroundColor: isEdited ? '#fef08a' : undefined, // Yellow highlight for edited fields
        };
    };

    const handleCellEdit = (rowKey, colKey, value) => {
        setEditedData(prev => ({
            ...prev,
            [rowKey]: {
                ...(prev[rowKey] || {}),
                [colKey]: value
            }
        }));
    };

    const handleSaveChanges = async () => {
        setIsLoading(false)
        const queryParams = new URLSearchParams();

        const queryString = queryParams.toString();

        const url = `/api/challan-movement/knittingOrder${queryString ? '?' + queryString : ''}`;

        try {
            const payload = Object.entries(editedData).map(([rowKey, edits]) => {
                // Find the original row to safely grab the deliveryId
                const originalRow = allRows.find(r => r.rowKey === rowKey);
                return {
                    deliveryId: originalRow?.deliveryId || originalRow?.mvId || rowKey, // <-- Guaranteed to be in payload
                    rowKey,
                    ...edits
                };
            });
            console.log("Saving edited Knitting data:", payload);
            const update = await axiosSecure.patch("/api/edit-challan", payload)
            if (update.status === 200) {
                alert("Changes saved successfully!");
                fetchData(url).then((res) => {
                    if (!res) { setFetchError("No response from server."); return; }
                    let payload = [];
                    if (Array.isArray(res)) payload = res;
                    else if (Array.isArray(res?.data)) payload = res.data;
                    else if (Array.isArray(res?.data?.data)) payload = res.data.data;
                    setMovements(payload);
                    setIsLoading(false)
                }).catch((err) => {
                    console.error("Failed to load Knitting deliveries:", err);
                    setFetchError("Failed to load data.");
                    setPendingFilterKey(null);
                }).finally(() => { if (fetchAll) setIsFetchingAll(false); });
            }
            setEditedData({});
        } catch (error) {
            console.error("Failed to save changes:", error);
            alert("Failed to save changes.");
        }
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
                        width: '100%',
                        border: '1px solid #3b82f6',
                        padding: '2px',
                        textAlign: isNumber ? 'right' : 'left',
                        boxSizing: 'border-box',
                        outline: 'none',
                        backgroundColor: 'transparent' // Allows yellow bg to show through while editing
                    }}
                />
            );
        }

        return (
            <div
                onClick={() => editableFields.includes(colKey) && setEditingCell({ rowKey: row.rowKey, colKey })}
                style={{
                    cursor: editableFields.includes(colKey) ? 'pointer' : 'default',
                    minHeight: '20px',
                    textAlign: isNumber ? 'right' : 'center'
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

    if (loading && movements.length === 0 && !searchLoading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;
    if (fetchError && !search) return <div style={{ padding: 20, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>{fetchError}</div>;

    const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(r.rowKey));

    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <input style={{ border: "1px solid #93c5fd", padding: "8px 12px", borderRadius: "6px", minWidth: "250px", outline: "none" }} placeholder="Search by Challan Nos" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleChallanSearch(); }} />
                <button style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }} onClick={handleChallanSearch} disabled={searchLoading}>{searchLoading ? "Searching..." : "Search"}</button>
                {search && <button style={{ background: "#e5e7eb", color: "#374151", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }} onClick={() => { setSearch(""); setSearchError(null); setRefreshKey(prev => prev + 1); }}>Clear Search</button>}

                {
                    isLoading && <button
                        className='bg-blue-400 text-white'
                    >
                        <span className='animate-spin'><Loader /></span>
                    </button>

                }
                {hasUnsavedChanges && (
                    <button
                        onClick={handleSaveChanges}
                        className='bg-blue-400 text-white'
                    >
                        Save Changes
                    </button>
                )}
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

                                {/* ID Column is now properly populated */}
                                <td style={cellStyle}>{row.deliveryId || "-"}</td>

                                {/* Editable Fields with Yellow Highlight */}
                                <td style={getCellStyle(row, 'challanNo')}>{renderCell(row, 'challanNo')}</td>
                                <td style={cellStyle}>{row.jobNo}</td>
                                <td style={cellStyle}>{row.composition}</td>
                                <td style={cellStyle}>{row.color || "-"}</td>
                                <td style={getCellStyle(row, 'fromFactory')}>{renderCell(row, 'fromFactory')}</td>
                                <td style={getCellStyle(row, 'toFactory')}>{renderCell(row, 'toFactory')}</td>

                                <td style={getCellStyle(row, 'yarnDelivery')}>{renderCell(row, 'yarnDelivery')}</td>
                                <td style={getCellStyle(row, 'yarnReturn')}>{renderCell(row, 'yarnReturn')}</td>
                                <td style={getCellStyle(row, 'greyFabricReceived')}>{renderCell(row, 'greyFabricReceived')}</td>

                                <td style={getCellStyle(row, 'unitePrice')}>{renderCell(row, 'unitePrice')}</td>
                                <td style={cellStyle}>{row.billingAmount > 0 ? Number(row.billingAmount).toFixed(2) : "-"}</td>
                            </tr>
                        ))}
                        {filteredRows.length === 0 && <tr><td style={cellStyle} colSpan={tableHeader.length}>{movements.length === 0 && !loading && !searchLoading ? "No records found." : "No rows match the current filters."}</td></tr>}
                    </tbody>
                    {filteredRows.length > 0 && (
                        <tfoot>
                            <tr>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}>Total</td>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}>{totals.yarnDelivery > 0 ? totals.yarnDelivery.toFixed(2) : "-"}</td>
                                <td style={tfootCellStyle}>{totals.yarnReturn > 0 ? totals.yarnReturn.toFixed(2) : "-"}</td>
                                <td style={tfootCellStyle}>{totals.greyFabricReceived > 0 ? totals.greyFabricReceived.toFixed(2) : "-"}</td>
                                <td style={tfootCellStyle}></td>
                                <td style={tfootCellStyle}>{totals.billingAmount > 0 ? totals.billingAmount.toFixed(2) : "-"}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default Knitting;