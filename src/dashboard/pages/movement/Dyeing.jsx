import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import { formatToErpDate } from '../../../helpers/date/formateDate';
import useAxiosPublic from '../../../hooks/Axios';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';
import { Loader } from 'lucide-react';
import { tableScrollWrapStyle } from './TableStyle';
import { useTableFilters } from './UseFilter';
import FilterableTh from './FilterBleth';

const cellStyle = { border: "1px solid #999", padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle", textAlign: "center" };
const thStickyStyle = { ...cellStyle, position: "sticky", top: 0, zIndex: 10, background: "#f3f4f6" };
const tfootCellStyle = { ...cellStyle, position: "sticky", bottom: 0, zIndex: 10, background: "#f3f4f6", fontWeight: 700 };
const pageButtonStyle = (active) => ({ border: "1px solid #999", background: active ? "#333" : "#fff", color: active ? "#fff" : "#333", padding: "4px 10px", margin: "0 2px", borderRadius: 4, cursor: "pointer", fontSize: "0.9rem" });

const tableHeader = [
    { header: "", width: "40px", key: "select", noFilter: true },
    { header: "Date", width: "7%", key: "challanDate" },
    { header: "ID", width: "5%", key: "deliveryId", noFilter: true },
    { header: "Challan No", width: "7%", key: "challanNo" },
    { header: "Job No", width: "9%", key: "jobNo" },
    { header: "Composition", width: "10%", key: "composition" },
    { header: "Color", width: "8%", key: "color" },
    { header: "From Factory", width: "7%", key: "fromFactory" },
    { header: "To Factory", width: "7%", key: "toFactory" },
    { header: "Grey Del", width: "6%", key: "greyDelivery" },
    { header: "Grey Ret", width: "6%", key: "greyReturn" },
    { header: "Grey Rec", width: "6%", key: "greyReceive" },
    { header: "Finish Rec", width: "6%", key: "finishReceive" },
    { header: "Process Loss %", width: "6%", key: "processLoss" },
    { header: "Price/KG", width: "6%", key: "unitePrice" },
    { header: "Billing", width: "6%", key: "billingAmount" },
];

const Dyeing = () => {
    const [movements, setMovements] = useState([]);
    const [page, setPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    
    const [isLoading, setIsLoading] = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const [editedData, setEditedData] = useState({});
    
    const dropdownRef = useRef(null);
    const { fetchData, loading } = useFetchData();
    const axiosPublic = useAxiosPublic();
    const axiosSecure = useAxiosPrivate();

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

    const allRows = useMemo(() => {
        if (!movements || !Array.isArray(movements)) return [];
        const rows = [];
        let rowCounter = 0;
        const extractJobNo = (item) => item?.workOrder?.jobNo || (typeof item?.workOrder === 'string' ? item.workOrder : null);

        const makeRow = (challanNo, jobNo, comp, color, source, mvId, deliveryId) => {
            rowCounter += 1;
            return {
                rowKey: `${challanNo}|${jobNo}|${comp}|${color}|${rowCounter}`,
                deliveryId: deliveryId ?? source?.id ?? null,
                chId: source?.id || challanNo,
                challanNo,
                jobNo,
                composition: comp || "-",
                color: color || "-",
                challanDate: source?.deliveryDate || source?.challanDate || "",
                toFactory: source?.toFactory || "",
                fromFactory: source?.fromFactory || "",
                greyDelivery: 0,
                greyReturn: 0,
                greyReceive: 0,
                finishReceive: 0,
                deliveryQty: 0,
                unitePrice: Number(source?.unitePrice) || 0,
            };
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
            billingAmount: row.greyReceive * row.unitePrice,
            processLoss: row.greyReceive > 0 ? ((row.greyReceive - row.finishReceive) / row.greyReceive) * 100 : 0,
        }));
    }, [movements]);

    const processedRows = useMemo(() => {
        return allRows.map(row => {
            const edits = editedData[row.rowKey] || {};
            const getVal = (key) => edits[key] !== undefined ? edits[key] : row[key];

            const greyDelivery = Number(getVal('greyDelivery')) || 0;
            const greyReturn = Number(getVal('greyReturn')) || 0;
            const greyReceive = Number(getVal('greyReceive')) || 0;
            const finishReceive = Number(getVal('finishReceive')) || 0;
            const unitePrice = Number(getVal('unitePrice')) || 0;

            const processLoss = greyReceive > 0 ? ((greyReceive - finishReceive) / greyReceive) * 100 : 0;
            const billingAmount = greyReceive * unitePrice;

            return {
                ...row,
                deliveryId: row.deliveryId,
                challanNo: getVal('challanNo'),
                fromFactory: getVal('fromFactory'),
                toFactory: getVal('toFactory'),
                greyDelivery,
                greyReturn,
                greyReceive,
                finishReceive,
                unitePrice,
                processLoss,
                billingAmount
            };
        });
    }, [allRows, editedData]);

    const {
        filters, openFilterKey, draftSelected, filterSearch, 
        filterOptions, filteredRows, setFilterSearch, openFilter,
        toggleDraftValue, toggleSelectAllDraft, applyFilter, clearFilter,
    } = useTableFilters(processedRows, tableHeader);

    const totals = useMemo(() => {
        const t = {
            greyDelivery: 0,
            greyReturn: 0,
            greyReceive: 0,
            finishReceive: 0,
            billingAmount: 0,
        };
        filteredRows.forEach((row) => {
            t.greyDelivery += Number(row.greyDelivery) || 0;
            t.greyReturn += Number(row.greyReturn) || 0;
            t.greyReceive += Number(row.greyReceive) || 0;
            t.finishReceive += Number(row.finishReceive) || 0;
            t.billingAmount += Number(row.billingAmount) || 0;
        });
        t.processLoss = t.greyReceive > 0
            ? ((t.greyReceive - t.finishReceive) / t.greyReceive) * 100
            : 0;
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

    const handleChallanSearch = async () => {
        if (!search.trim()) { alert("Please enter at least one challan number."); return; }
        setSearchLoading(true); setSearchError(null); setPage(1);
        const searchArray = search.split(/[\s,]+/).filter(Boolean);
        try {
            const res = await axiosPublic.get("/api/dyeingOrder/challan/search", { params: { challans: searchArray.join(","), context: "dyeingOrder" } });
            let searchData = [];
            if (Array.isArray(res.data)) searchData = res.data;
            else if (Array.isArray(res.data?.data)) searchData = res.data.data;
            setMovements(searchData); setTotalPages(1);
        } catch (err) { setSearchError("Failed to search challans."); setMovements([]); }
        finally { setSearchLoading(false); }
    };

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

    const editableFields = ['challanNo', 'fromFactory', 'toFactory', 'greyDelivery', 'greyReturn', 'greyReceive', 'finishReceive', 'unitePrice'];
    const numericFields = ['greyDelivery', 'greyReturn', 'greyReceive', 'finishReceive', 'unitePrice'];
    const hasUnsavedChanges = Object.keys(editedData).length > 0;

    const getCellStyle = (row, colKey) => {
        const isEdited = editedData[row.rowKey]?.[colKey] !== undefined;
        return {
            ...cellStyle,
            backgroundColor: isEdited ? '#fef08a' : undefined,
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
        setIsLoading(true);
        try {
            const payload = Object.entries(editedData).map(([rowKey, edits]) => {
                const originalRow = allRows.find(r => r.rowKey === rowKey);
                return {
                    deliveryId: originalRow?.deliveryId || originalRow?.chId || rowKey,
                    rowKey,
                    ...edits
                };
            });
            
            console.log("Saving edited Dyeing data:", payload);
            const update = await axiosSecure.patch("/api/edit-challan", payload);
            
            if (update.status === 200) {
                alert("Changes saved successfully!");
                setEditedData({});
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error("Failed to save changes:", error);
            alert("Failed to save changes.");
        } finally {
            setIsLoading(false);
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
                        backgroundColor: 'transparent'
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

    const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(r.rowKey));
    if (loading && movements.length === 0 && !searchLoading) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div style={{ width: "100%", padding: "20px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <input style={{ border: "1px solid #93c5fd", padding: "8px 12px", borderRadius: "6px", minWidth: "250px", outline: "none" }} placeholder="Search by Challan Nos" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleChallanSearch(); }} />
                <button style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }} onClick={handleChallanSearch} disabled={searchLoading}>{searchLoading ? "Searching..." : "Search"}</button>
                {search && <button style={{ background: "#e5e7eb", color: "#374151", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }} onClick={() => { setSearch(""); setSearchError(null); setPage(1); setRefreshKey(prev => prev + 1); }}>Clear Search</button>}
                
                {hasUnsavedChanges && (
                    <button
                        onClick={handleSaveChanges}
                        disabled={isLoading}
                        style={{ 
                            background: isLoading ? "#9ca3af" : "#10b981", 
                            color: "white", 
                            padding: "8px 16px", 
                            borderRadius: "6px", 
                            border: "none", 
                            cursor: isLoading ? "not-allowed" : "pointer", 
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                    >
                        {isLoading && <span className="animate-spin"><Loader size={16} /></span>}
                        {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                )}
            </div>
            
            {searchError && <div style={{ padding: "10px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "12px" }}>{searchError}</div>}

            <div style={tableScrollWrapStyle}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                        <tr>
                            {tableHeader.map((th) => {
                                if (th.noFilter) return <th key={th.key} style={{ ...thStickyStyle, width: th.width }}><input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} /></th>;
                                return (
                                    <FilterableTh
                                        key={th.key}
                                        column={th}
                                        options={filterOptions[th.key] || []}
                                        isActive={!!filters[th.key]}
                                        isOpen={openFilterKey === th.key}
                                        draftSelected={draftSelected}
                                        filterSearch={filterSearch}
                                        onOpenFilter={openFilter}
                                        onSearchChange={setFilterSearch}
                                        onToggleValue={toggleDraftValue}
                                        onToggleSelectAll={toggleSelectAllDraft}
                                        onApply={applyFilter}
                                        onClear={clearFilter}
                                        dropdownRef={dropdownRef}
                                    />
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row) => (
                            <tr key={row.rowKey}><td style={cellStyle}><input type="checkbox" checked={selectedRows.has(row.rowKey)} onChange={() => toggleRow(row.rowKey)} /></td><td style={cellStyle}>{row.challanDate && row.challanDate !== "-" ? formatToErpDate(row.challanDate) : "-"}</td><td style={cellStyle}>{row.deliveryId || "-"}</td><td style={getCellStyle(row, 'challanNo')}>{renderCell(row, 'challanNo')}</td><td style={cellStyle}>{row.jobNo}</td><td style={cellStyle}>{row.composition}</td><td style={cellStyle}>{row.color || "-"}</td><td style={getCellStyle(row, 'fromFactory')}>{renderCell(row, 'fromFactory')}</td><td style={getCellStyle(row, 'toFactory')}>{renderCell(row, 'toFactory')}</td><td style={getCellStyle(row, 'greyDelivery')}>{renderCell(row, 'greyDelivery')}</td><td style={getCellStyle(row, 'greyReturn')}>{renderCell(row, 'greyReturn')}</td><td style={getCellStyle(row, 'greyReceive')}>{renderCell(row, 'greyReceive')}</td><td style={getCellStyle(row, 'finishReceive')}>{renderCell(row, 'finishReceive')}</td><td style={cellStyle}>{row.greyReceive > 0 ? Number(row.processLoss).toFixed(2) + "%" : "-"}</td><td style={getCellStyle(row, 'unitePrice')}>{renderCell(row, 'unitePrice')}</td><td style={cellStyle}>{row.billingAmount > 0 ? Number(row.billingAmount).toFixed(2) : "-"}</td></tr>
                        ))}
                        {filteredRows.length === 0 && <tr><td style={cellStyle} colSpan={tableHeader.length}>{movements.length === 0 ? "No records found." : "No rows match filters."}</td></tr>}
                    </tbody>
                    {filteredRows.length > 0 && (
                        <tfoot>
                            <tr><td style={tfootCellStyle}></td><td style={tfootCellStyle}></td><td style={tfootCellStyle}></td><td style={tfootCellStyle}></td><td style={tfootCellStyle}></td><td style={tfootCellStyle}></td><td style={tfootCellStyle}>Total</td><td style={tfootCellStyle}></td><td style={tfootCellStyle}></td><td style={tfootCellStyle}>{totals.greyDelivery > 0 ? totals.greyDelivery.toFixed(2) : "-"}</td><td style={tfootCellStyle}>{totals.greyReturn > 0 ? totals.greyReturn.toFixed(2) : "-"}</td><td style={tfootCellStyle}>{totals.greyReceive > 0 ? totals.greyReceive.toFixed(2) : "-"}</td><td style={tfootCellStyle}>{totals.finishReceive > 0 ? totals.finishReceive.toFixed(2) : "-"}</td><td style={tfootCellStyle}>{totals.greyReceive > 0 ? totals.processLoss.toFixed(2) + "%" : "-"}</td><td style={tfootCellStyle}></td><td style={tfootCellStyle}>{totals.billingAmount > 0 ? totals.billingAmount.toFixed(2) : "-"}</td></tr>
                        </tfoot>
                    )}
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