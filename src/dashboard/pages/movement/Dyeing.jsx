import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';

const cellStyle = {
    border: "1px solid #999",
    padding: "6px 8px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "top",
};

// Used for cells that span multiple rows (challan no, date, composition,
// to/from factory) so their content sits centered within the merged block
// instead of pinned to the top.
const mergedCellStyle = {
    ...cellStyle,
    verticalAlign: "middle",
    textAlign: "center",
};

const PAGE_SIZE = 10;

const pageButtonStyle = (active) => ({
    border: "1px solid #999",
    background: active ? "#333" : "#fff",
    color: active ? "#fff" : "#333",
    padding: "4px 10px",
    margin: "0 2px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.9rem",
});

// Column definitions, hoisted so identity is stable across renders (keeps
// useMemo deps meaningful). `key` maps to the field name on a flattened row.
const tableHeader = [
    { header: "Challan No", width: "9%", key: "challanNo" },
    { header: "Date", width: "10%", key: "challanDate" },
    { header: "Work Order", width: "9%", key: "workOrder" },
    { header: "Composition", width: "10%", key: "composition" },
    { header: "To Factory", width: "9%", key: "toFactory" },
    { header: "From Factory", width: "9%", key: "fromFactory" },
    { header: "Delivery Type", width: "10%", key: "deliveryType" },
    { header: "Delivery Qty", width: "8%", key: "deliveryQty" },
    { header: "Price Per KG", width: "9%", key: "unitePrice" },
    { header: "Billing Amount", width: "9%", key: "billingAmount" },
    { header: "Paid Billing Amount", width: "8%", key: "paidBillingAmount" },
]

const Dyeing = () => {
    const [movements, setMovements] = useState([])
    const [page, setPage] = useState(1)
    // filters[key] = Set of allowed string values for that column. A column
    // with no entry here means "no filter active, show everything".
    const [filters, setFilters] = useState({})
    const [openFilterKey, setOpenFilterKey] = useState(null)
    const [draftSelected, setDraftSelected] = useState(new Set())
    const [filterSearch, setFilterSearch] = useState("")
    const dropdownRef = useRef(null)

    const { fetchData, loading } = useFetchData();
    useEffect(() => {
        fetchData(`/api/challan-movement/${"dyeingOrder"}`)
            .then(data => {
                if (data) setMovements(data);
                console.log(data);
            }
            )
    }, [fetchData])

    // Close an open filter dropdown when clicking outside it.
    useEffect(() => {
        if (!openFilterKey) return
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenFilterKey(null)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [openFilterKey])

    // Reset to page 1 whenever the underlying data or active filters change.
    useEffect(() => {
        setPage(1)
    }, [movements, filters])

    // Flatten movements -> challans -> deliveries into one row per delivery,
    // keeping stable mvId/chId so we can re-group after filtering.
    const allRows = useMemo(() => {
        const flat = []
        movements?.forEach((mv, mvIdx) => {
            const mvId = mv?.id ?? mvIdx
            const challans = mv?.challans || []
            challans.forEach((ch) => {
                const chId = ch.id
                const deliveries = ch?.deliveries?.length ? ch.deliveries : [null]
                deliveries.forEach((dv) => {
                    flat.push({
                        rowKey: `${chId}-${dv?.id ?? "no-delivery"}`,
                        mvId,
                        chId,
                        challanNo: ch.challanNo,
                        challanDate: ch.challanDate,
                        composition: mv.composition,
                        workOrder: mv.workOrder?.jobNo ?? "",
                        toFactory: ch.toFactory,
                        fromFactory: ch.fromFactory,
                        deliveryType: dv?.deliveryType ?? "",
                        deliveryQty: dv?.deliveryQty ?? "",
                        unitePrice: mv.unitePrice,
                        billingAmount: mv.unitePrice,
                        paidBillingAmount: mv.unitePrice,
                    })
                })
            })
        })
        return flat
    }, [movements])

    // Unique values per column, for the filter dropdowns.
    const filterOptions = useMemo(() => {
        const opts = {}
        tableHeader.forEach((col) => {
            const set = new Set()
            allRows.forEach((row) => set.add(String(row[col.key] ?? "")))
            opts[col.key] = Array.from(set).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true })
            )
        })
        return opts
    }, [allRows])

    // Rows that pass every active column filter.
    const filteredRows = useMemo(() => {
        return allRows.filter((row) =>
            tableHeader.every((col) => {
                const selected = filters[col.key]
                if (!selected) return true
                return selected.has(String(row[col.key] ?? ""))
            })
        )
    }, [allRows, filters])

    // Paginate by movement (not by flattened row) so a page break never cuts
    // a merged challan/composition block in half. Movements fully filtered
    // out simply don't appear here.
    const uniqueMvIds = useMemo(() => {
        const seen = new Set()
        const ids = []
        filteredRows.forEach((r) => {
            if (!seen.has(r.mvId)) {
                seen.add(r.mvId)
                ids.push(r.mvId)
            }
        })
        return ids
    }, [filteredRows])

    const totalPages = Math.max(1, Math.ceil(uniqueMvIds.length / PAGE_SIZE))

    const pagedFilteredRows = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE
        const pageIds = new Set(uniqueMvIds.slice(start, start + PAGE_SIZE))
        return filteredRows.filter((r) => pageIds.has(r.mvId))
    }, [filteredRows, uniqueMvIds, page])

    // Re-derive rowSpan grouping from whatever survived filtering + paging.
    const rows = useMemo(() => {
        const result = []
        for (let i = 0; i < pagedFilteredRows.length; i++) {
            const row = pagedFilteredRows[i]
            const isFirstOfChallan = i === 0 || pagedFilteredRows[i - 1].chId !== row.chId
            const isFirstOfMovement = i === 0 || pagedFilteredRows[i - 1].mvId !== row.mvId

            let challanRowSpan = 1
            if (isFirstOfChallan) {
                for (let j = i + 1; j < pagedFilteredRows.length && pagedFilteredRows[j].chId === row.chId; j++) {
                    challanRowSpan++
                }
            }
            let movementRowSpan = 1
            if (isFirstOfMovement) {
                for (let j = i + 1; j < pagedFilteredRows.length && pagedFilteredRows[j].mvId === row.mvId; j++) {
                    movementRowSpan++
                }
            }
            result.push({ ...row, isFirstOfChallan, isFirstOfMovement, challanRowSpan, movementRowSpan })
        }
        return result
    }, [pagedFilteredRows])

    const goToPage = (p) => {
        if (p < 1 || p > totalPages) return
        setPage(p)
    }

    const pageNumbers = useMemo(() => {
        const nums = []
        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                nums.push(p)
            } else if (nums[nums.length - 1] !== "...") {
                nums.push("...")
            }
        }
        return nums
    }, [totalPages, page])

    // --- filter dropdown handlers ---
    const openFilter = (key) => {
        if (openFilterKey === key) {
            setOpenFilterKey(null)
            return
        }
        const options = filterOptions[key] || []
        const current = filters[key]
        setDraftSelected(current ? new Set(current) : new Set(options))
        setFilterSearch("")
        setOpenFilterKey(key)
    }

    const toggleDraftValue = (val) => {
        setDraftSelected((prev) => {
            const next = new Set(prev)
            if (next.has(val)) next.delete(val)
            else next.add(val)
            return next
        })
    }

    const toggleSelectAllDraft = (options) => {
        setDraftSelected((prev) => (prev.size === options.length ? new Set() : new Set(options)))
    }

    const applyFilter = (key, options) => {
        setFilters((prev) => {
            const next = { ...prev }
            if (draftSelected.size === options.length) {
                // everything selected == no filter needed
                delete next[key]
            } else {
                next[key] = new Set(draftSelected)
            }
            return next
        })
        setOpenFilterKey(null)
    }

    const clearFilter = (key) => {
        setFilters((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
        })
        setOpenFilterKey(null)
    }

    return (
        <div style={{ width: "100%" }}>
            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #999" }}>
                <thead>
                    <tr>
                        {tableHeader.map((th) => {
                            const options = filterOptions[th.key] || []
                            const isActive = !!filters[th.key]
                            const isOpen = openFilterKey === th.key
                            return (
                                <th
                                    key={th.key}
                                    style={{
                                        ...cellStyle,
                                        width: th.width,
                                        position: "relative",
                                        overflow: "visible", // don't clip the absolutely-positioned filter dropdown below
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
                                                border: "1px solid #999",
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
                                            {/* fixed: search box */}
                                            <div style={{ padding: 8, borderBottom: "1px solid #ddd", flexShrink: 0 }}>
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

                                            {/* scrollable: select all + option checkboxes */}
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

                                            {/* fixed: Clear / Apply */}
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
                            )
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.rowKey}>
                            {row.isFirstOfChallan && (
                                <td style={mergedCellStyle} rowSpan={row.challanRowSpan}>{row.challanNo}</td>
                            )}
                            {row.isFirstOfChallan && (
                                <td style={mergedCellStyle} rowSpan={row.challanRowSpan}>{row.challanDate}</td>
                            )}
                            {row.isFirstOfMovement && (
                                <td style={mergedCellStyle} rowSpan={row.movementRowSpan}>{row.workOrder}</td>
                            )}
                            {row.isFirstOfMovement && (
                                <td style={mergedCellStyle} rowSpan={row.movementRowSpan}>{row.composition}</td>
                            )}
                            {row.isFirstOfChallan && (
                                <td style={mergedCellStyle} rowSpan={row.challanRowSpan}>{row.toFactory}</td>
                            )}
                            {row.isFirstOfChallan && (
                                <td style={mergedCellStyle} rowSpan={row.challanRowSpan}>{row.fromFactory}</td>
                            )}
                            <td style={cellStyle}>{row.deliveryType}</td>
                            <td style={cellStyle}>{row.deliveryQty}</td>
                            <td style={cellStyle}>{row.unitePrice}</td>
                            <td style={cellStyle}>{row.deliveryQty * row.unitePrice}</td>
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

export default Dyeing;