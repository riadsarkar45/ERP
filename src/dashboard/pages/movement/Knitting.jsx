import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import { formatToErpDate } from '../../../helpers/date/formateDate';

// Note: borderCollapse is "separate" (not "collapse") on the <table> so the
// sticky header keeps its border while scrolling — collapsed borders and
// position:sticky don't render reliably together across browsers. Each cell
// draws its own border instead.
const cellStyle = {
    border: "70px solid #000",
    padding: "60px 80px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "top",
};

const mergedCellStyle = {
    ...cellStyle,
    verticalAlign: "middle",
    textAlign: "center",
};

// Frozen/sticky header cell — stays pinned to the top of the scroll
// container while the body scrolls underneath it, Excel-style.
const thStickyStyle = {
    ...cellStyle,
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "red",
};

const PAGE_SIZE = 10;

const pageButtonStyle = (active) => ({
    border: "1px solid #000000",
    background: active ? "#333" : "#fff",
    color: active ? "#fff" : "#333",
    padding: "4px 10px",
    margin: "0 2px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.9rem",
});

// Maps the raw `deliveryType` string on each delivery entry (e.g.
// { deliveryType: "YarnDelivery", totalQty: 137 }) onto the flattened row
// field it should add into. Adjust the left-hand literal strings if the API
// ever sends different exact spellings/casing for deliveryType.
const DELIVERY_TYPE_MAP = {
    YarnDelivery: "yarnDelivery",
    YarnReturn: "yarnReturn",
    YarnReceived: "yarnReceived",
    GreyFabricReceived: "greyFabricReceived",
};

const tableHeader = [
    { header: "Date", width: "10%", key: "challanDate" },
    { header: "Challan No", width: "9%", key: "challanNo" },    
    { header: "Work Order", width: "9%", key: "workOrder" },
    { header: "Composition", width: "10%", key: "composition" },
    { header: "Color", width: "10%", key: "color" },
    { header: "To Factory", width: "9%", key: "toFactory" },
    { header: "From Factory", width: "9%", key: "fromFactory" },
    { header: "Yarn Delivery", width: "10%", key: "yarnDelivery" },
    { header: "Yarn Return", width: "10%", key: "yarnReturn" },
    { header: "Greige Received", width: "10%", key: "yarnReceived" },
    // { header: "Finish Fabric Received", width: "10%", key: "greyFabricReceived" },
    { header: "Price Per KG", width: "9%", key: "unitePrice" },
    { header: "Billing Amount", width: "9%", key: "billingAmount" },
    { header: "Paid Billing Amount", width: "8%", key: "paidBillingAmount" },
];

const Knitting = () => {
    const [movements, setMovements] = useState([]);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({});
    const [openFilterKey, setOpenFilterKey] = useState(null);
    const [draftSelected, setDraftSelected] = useState(new Set());
    const [filterSearch, setFilterSearch] = useState("");
    const [totalPages, setTotalPages] = useState({})
    const dropdownRef = useRef(null);

    const { fetchData, loading } = useFetchData();

    useEffect(() => {
        fetchData(`/api/challan-movement/knittingOrder?page=${page}&limit=10`)
            .then(data => {
                if (!data) return;
                console.log(data);
                setMovements(data.data);
                setTotalPages(data.pagination.totalPages);
            });
    }, [fetchData, page]);

    useEffect(() => {
        if (!openFilterKey) return;
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenFilterKey(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [openFilterKey]);



    // Flatten movements -> challans into ONE ROW PER CHALLAN. Each challan's
    // deliveries[] carry { deliveryType, totalQty } pairs (NOT fields named
    // after the type directly) and are summed by type into their own
    // columns, since one challan can have more than one delivery entry.
    const allRows = useMemo(() => {
        const flat = [];
        movements?.forEach((mv, mvIdx) => {
            const mvId = mv?.id ?? mvIdx;
            const challans = mv?.challans || [];
            challans.forEach((ch) => {
                const qtyByType = {
                    yarnDelivery: 0,
                    yarnReturn: 0,
                    greyFabricReceived: 0,
                };
                (ch?.deliveries || []).forEach((dv) => {
                    const field = DELIVERY_TYPE_MAP[dv?.deliveryType];
                    if (field) {
                        qtyByType[field] += Number(dv?.totalQty) || 0;
                    }
                });

                const uPrice = Number(mv.unitePrice) || 0;
                // Billing computed off finished quantity received back;
                // adjust if your business bills against a different qty.
                const billingAmount = qtyByType.greyFabricReceived * uPrice;

                flat.push({
                    rowKey: `${ch.id}`,
                    mvId,
                    chId: ch.id,
                    challanNo: ch.challanNo,
                    // challanDate: ch.challanDate ? new Date(ch.challanDate).toLocaleDateString() : "",
                    challanDate: formatToErpDate(ch.challanDate),
                    composition: mv.composition,
                    workOrder: mv.workOrder?.jobNo ?? "",
                    toFactory: ch.toFactory,
                    fromFactory: ch.fromFactory,
                    ...qtyByType,
                    unitePrice: uPrice,
                    billingAmount,
                    color: mv.color ?? "-",
                    paidBillingAmount: mv.paidBillingAmount ?? 0,
                });
            });
        });
        return flat;
    }, [movements]);

    const filterOptions = useMemo(() => {
        const opts = {};
        tableHeader.forEach((col) => {
            const set = new Set();
            allRows.forEach((row) => {
                let passes = true;
                for (const c of tableHeader) {
                    if (c.key === col.key) continue;
                    const selected = filters[c.key];
                    if (selected && !selected.has(String(row[c.key] ?? ""))) {
                        passes = false;
                        break;
                    }
                }
                if (passes) {
                    set.add(String(row[col.key] ?? ""));
                }
            });
            opts[col.key] = Array.from(set).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true })
            );
        });
        return opts;
    }, [allRows, filters]);

    const filteredRows = useMemo(() => {
        return allRows.filter((row) =>
            tableHeader.every((col) => {
                const selected = filters[col.key];
                if (!selected) return true;
                return selected.has(String(row[col.key] ?? ""));
            })
        );
    }, [allRows, filters]);





    // Re-derive rowSpan grouping (by movement only, since each row is
    // already one challan) from whatever survived filtering + paging.
    const rows = useMemo(() => {
        const result = [];

        for (let i = 0; i < filteredRows.length; i++) {
            const row = filteredRows[i];

            const isFirstOfMovement =
                i === 0 || filteredRows[i - 1].mvId !== row.mvId;

            let movementRowSpan = 1;

            if (isFirstOfMovement) {
                for (
                    let j = i + 1;
                    j < filteredRows.length &&
                    filteredRows[j].mvId === row.mvId;
                    j++
                ) {
                    movementRowSpan++;
                }
            }

            result.push({
                ...row,
                isFirstOfMovement,
                movementRowSpan,
            });
        }

        return result;
    }, [filteredRows]);

    const goToPage = (p) => {
        if (p < 1 || p > totalPages) return;
        setPage(p);
    };

    const pageNumbers = useMemo(() => {
        const nums = [];
        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                nums.push(p);
            } else if (nums[nums.length - 1] !== "...") {
                nums.push("...");
            }
        }
        return nums;
    }, [totalPages, page]);

    const openFilter = (key) => {
        if (openFilterKey === key) {
            setOpenFilterKey(null);
            return;
        }
        const options = filterOptions[key] || [];
        const current = filters[key];

        let initialSelected;
        if (current) {
            const validSelected = new Set([...current].filter(v => options.includes(v)));
            initialSelected = validSelected.size > 0 ? validSelected : new Set(options);
        } else {
            initialSelected = new Set(options);
        }

        setDraftSelected(initialSelected);
        setFilterSearch("");
        setOpenFilterKey(key);
    };

    const toggleDraftValue = (val) => {
        setDraftSelected((prev) => {
            const next = new Set(prev);
            if (next.has(val)) next.delete(val);
            else next.add(val);
            return next;
        });
    };

    const toggleSelectAllDraft = (options) => {
        setDraftSelected((prev) => (prev.size === options.length ? new Set() : new Set(options)));
    };

    const applyFilter = (key, options) => {
        setFilters((prev) => {
            const next = { ...prev };
            if (draftSelected.size === options.length || options.length === 0) {
                delete next[key];
            } else {
                next[key] = new Set(draftSelected);
            }
            return next;
        });
        setOpenFilterKey(null);
    };

    const clearFilter = (key) => {
        setFilters((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setOpenFilterKey(null);
    };

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div style={{ width: "100%" }}>
            <div style={{ width: "100%", maxHeight: "85vh", overflow: "auto", border: "1px solid #000000" }}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                        <tr>
                            {tableHeader.map((th) => {
                                const options = filterOptions[th.key] || [];
                                const isActive = !!filters[th.key];
                                const isOpen = openFilterKey === th.key;
                                return (
                                    <th
                                        key={th.key}
                                        style={{
                                            ...thStickyStyle,
                                            width: th.width,
                                            overflow: "visible",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {th.header}
                                            </span>
                                            <button
                                                onClick={() => openFilter(th.key)}
                                                title="Filter"
                                                style={{
                                                    border: "none",
                                                    background: "none",
                                                    cursor: "pointer",
                                                    color: isActive ? "#2563eb" : "#666",
                                                    fontSize: "0.8rem",
                                                    padding: 2,
                                                }}
                                            >
                                                ▾
                                            </button>
                                        </div>

                                        {isOpen && (
                                            <div
                                                ref={dropdownRef}
                                                style={{
                                                    position: "absolute",
                                                    top: "100%",
                                                    left: 0,
                                                    zIndex: 20,
                                                    background: "#fff",
                                                    border: "1px solid #000000",
                                                    borderRadius: 4,
                                                    width: 200,
                                                    maxHeight: 280,
                                                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                                    textAlign: "left",
                                                    fontWeight: "normal",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                }}
                                            >
                                                <div style={{ padding: 8, borderBottom: "1px solid #000000", flexShrink: 0 }}>
                                                    <input
                                                        type="text"
                                                        value={filterSearch}
                                                        onChange={(e) => setFilterSearch(e.target.value)}
                                                        placeholder="Search..."
                                                        autoFocus
                                                        style={{
                                                            width: "100%",
                                                            boxSizing: "border-box",
                                                            padding: "4px 6px",
                                                            border: "1px solid #ccc",
                                                            borderRadius: 4,
                                                            fontSize: "0.85rem",
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 8px" }}>
                                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "bold", marginBottom: 6, cursor: "pointer" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={draftSelected.size === options.length && options.length > 0}
                                                            onChange={() => toggleSelectAllDraft(options)}
                                                        />
                                                        Select All
                                                    </label>
                                                    {options
                                                        .filter((val) => val.toLowerCase().includes(filterSearch.toLowerCase()))
                                                        .map((val) => (
                                                            <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", padding: "2px 0", cursor: "pointer" }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={draftSelected.has(val)}
                                                                    onChange={() => toggleDraftValue(val)}
                                                                />
                                                                {val === "" ? "(blank)" : val}
                                                            </label>
                                                        ))}
                                                </div>

                                                <div style={{ display: "flex", justifyContent: "space-between", padding: 8, borderTop: "1px solid #ddd", flexShrink: 0 }}>
                                                    <button onClick={() => clearFilter(th.key)} style={{ ...pageButtonStyle(false), fontSize: "0.75rem" }}>
                                                        Clear
                                                    </button>
                                                    <button onClick={() => applyFilter(th.key, options)} style={{ ...pageButtonStyle(true), fontSize: "0.75rem" }}>
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.rowKey}>
                                {/* Challan No, Date, To/From Factory: one per challan (no rowspan needed now) */}
                                <td style={cellStyle}>{row.challanDate}</td>
                                <td style={cellStyle}>{row.challanNo}</td>                               

                                {/* Work Order, Composition, Color: merged across all challans of the same movement */}
                                {row.isFirstOfMovement && (
                                    <td style={mergedCellStyle} rowSpan={row.movementRowSpan}>{row.workOrder}</td>
                                )}
                                {row.isFirstOfMovement && (
                                    <td style={mergedCellStyle} rowSpan={row.movementRowSpan}>{row.composition}</td>
                                )}
                                {row.isFirstOfMovement && (
                                    <td style={mergedCellStyle} rowSpan={row.movementRowSpan}>{row.color}</td>
                                )}

                                <td style={cellStyle}>{row.toFactory}</td>
                                <td style={cellStyle}>{row.fromFactory}</td>

                                <td style={cellStyle}>{row.yarnDelivery}</td>
                                <td style={cellStyle}>{row.yarnReturn}</td>
                                {/* <td style={cellStyle}>{row.yarnReceived}</td> */}
                                <td style={cellStyle}>{row.greyFabricReceived}</td>

                                <td style={cellStyle}>{row.unitePrice}</td>
                                <td style={cellStyle}>{row.billingAmount}</td>
                                <td style={cellStyle}>{row.paidBillingAmount}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td style={{ ...cellStyle, textAlign: "center" }} colSpan={tableHeader.length}>
                                    No rows match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                    <button style={pageButtonStyle(false)} onClick={() => goToPage(page - 1)} disabled={page === 1}>
                        Prev
                    </button>
                    {pageNumbers.map((p, i) =>
                        p === "..." ? (
                            <span key={`ellipsis-${i}`} style={{ margin: "0 4px" }}>...</span>
                        ) : (
                            <button key={p} style={pageButtonStyle(p === page)} onClick={() => goToPage(p)}>
                                {p}
                            </button>
                        )
                    )}
                    <button style={pageButtonStyle(false)} onClick={() => goToPage(page + 1)} disabled={page === totalPages}>
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default Knitting;