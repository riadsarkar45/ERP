import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import { formatToErpDate } from '../../../helpers/date/formateDate';
import useAxiosPublic from '../../../hooks/Axios';

const cellStyle = {
    border: "1px solid #999",
    padding: "6px 8px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "top",
};

const thStickyStyle = {
    ...cellStyle,
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "#f3f4f6",
};

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

const tableHeader = [
    { header: "", width: "40px", key: "select", noFilter: true },
    { header: "Date", width: "10%", key: "challanDate" },
    { header: "Challan No", width: "9%", key: "challanNo" },
    { header: "WO Qty", width: "9%", key: "workOrderQty" },
    { header: "Composition", width: "10%", key: "composition" },
    { header: "Color", width: "10%", key: "color" },
    { header: "To Factory", width: "9%", key: "toFactory" },
    { header: "From Factory", width: "9%", key: "fromFactory" },
    { header: "Sent For Aop", width: "10%", key: "sentForAop" },
    { header: "Receive From Aop", width: "10%", key: "receiveFromAop" },
    { header: "Finish Receive From Aop", width: "10%", key: "finishReceiveFromAop" },
    // { header: "Delivery Qty", width: "8%", key: "deliveryQty" },
    { header: "Price Per KG", width: "9%", key: "unitePrice" },
    { header: "Billing Amount", width: "9%", key: "billingAmount" },
    { header: "Paid Billing Amount", width: "8%", key: "paidBillingAmount" },
];

const Aop = () => {
    const [movements, setMovements] = useState([]);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({});
    const [openFilterKey, setOpenFilterKey] = useState(null);
    const [draftSelected, setDraftSelected] = useState(new Set());
    const [filterSearch, setFilterSearch] = useState("");
    const [selectedRows, setSelectedRows] = useState(new Set());
    const dropdownRef = useRef(null);
    const [totalPages, setTotalPages] = useState(1);
    const [challanIds, setChallanIds] = useState([]);

    // Search States
    const [search, setSearch] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const { fetchData, loading } = useFetchData();
    const axiosPublic = useAxiosPublic();

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
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenFilterKey(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [openFilterKey]);

    // FIX: Handles BOTH nested (movement -> deliveries[]) AND flat delivery records
    const allRows = useMemo(() => {
        if (!movements || !Array.isArray(movements)) return [];

        const grouped = {};

        const ensureRow = (challanNo, source) => {
            if (!grouped[challanNo]) {
                grouped[challanNo] = {
                    rowKey: String(challanNo),
                    chId: source?.id || challanNo,
                    challanNo: challanNo,
                    challanDate: source?.deliveryDate || source?.challanDate || "",
                    toFactory: source?.toFactory || "",
                    fromFactory: source?.fromFactory || "",
                    sentForAop: 0,
                    receiveFromAop: 0,
                    finishReceiveFromAop: 0,
                    deliveryQty: 0,
                    unitePrice: Number(source?.unitePrice) || 0,
                    paidBillingAmount: Number(source?.paidBillingAmount) || 0,
                    compositionsSet: new Set(),
                    colorsSet: new Set(),
                    workOrderQtySet: new Set(),
                };
            }
            return grouped[challanNo];
        };

        const applyDelivery = (row, dv, source) => {
            const qty = Number(dv?.deliveryQty ?? dv?.totalQty) || 0;
            row.deliveryQty += qty;

            const type = String(dv?.deliveryType || "").toLowerCase().replace(/[\s_-]+/g, "");
            // NOTE: finish branch MUST be checked before "receivedfromaop",
            // because "finishreceivedfromaop" contains "receivedfromaop" as a substring.
            if (type.includes("sentforaop")) row.sentForAop += qty;
            else if (
                type.includes("aopfinishfabricrcvd") ||
                type.includes("finishfabric") ||
                type.includes("finishreceive") ||
                type.includes("finishreceived")
            ) row.finishReceiveFromAop += qty;
            else if (type.includes("receivedfromaop") || type.includes("receivefromaop")) row.receiveFromAop += qty;

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

                    const row = ensureRow(challanNo, dv);

                    // movement-level fields
                    if (item.unitePrice && !row.unitePrice) row.unitePrice = Number(item.unitePrice);
                    if (item.workOrderQty !== undefined && item.workOrderQty !== null) row.workOrderQtySet.add(item.workOrderQty);
                    if (item.composition) row.compositionsSet.add(item.composition);

                    applyDelivery(row, dv, item);
                });
            } else if (item.challanNo !== undefined && item.challanNo !== null) {
                // FLAT shape: the item itself is a delivery record
                const row = ensureRow(item.challanNo, item);
                applyDelivery(row, item, item);
            }
            // movements with empty deliveries[] are skipped (no challan to show)
        });

        return Object.values(grouped).map(row => ({
            ...row,
            composition: Array.from(row.compositionsSet).join(", ") || "-",
            color: Array.from(row.colorsSet).join(", ") || "-",
            workOrderQty: Array.from(row.workOrderQtySet).join(", ") || "-",
            billingAmount: row.deliveryQty * row.unitePrice,
        }));
    }, [movements]);

    const filterOptions = useMemo(() => {
        const opts = {};
        tableHeader.forEach((col) => {
            if (col.noFilter) return;
            const set = new Set();
            allRows.forEach((row) => set.add(String(row[col.key] ?? "")));
            opts[col.key] = Array.from(set).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true })
            );
        });
        return opts;
    }, [allRows]);

    const filteredRows = useMemo(() => {
        return allRows.filter((row) =>
            tableHeader.every((col) => {
                if (col.noFilter) return true;
                const selected = filters[col.key];
                if (!selected) return true;
                return selected.has(String(row[col.key] ?? ""));
            })
        );
    }, [allRows, filters]);

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
        setDraftSelected(current ? new Set(current) : new Set(options));
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
            if (draftSelected.size === options.length) {
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

    const handleBillPreparation = (challanId) => {
        if (challanIds.includes(challanId)) {
            setChallanIds((prev) => prev.filter(id => id !== challanId));
        } else {
            setChallanIds((prev) => [...prev, challanId])
        }
    }

    const handleGenerateBill = async () => {
        if (challanIds.length === 0) {
            alert("Please select at least one challan to generate the bill.");
            return;
        }

        try {
            const response = await axiosPublic.post(
                "/api/generate-bill",
                { challanIds },
                { responseType: "blob" }
            );

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
        if (!search.trim()) {
            alert("Please enter at least one challan number.");
            return;
        }

        setSearchLoading(true);
        setSearchError(null);
        setPage(1);

        const challanArray = search
            .trim()
            .split(/[\s,]+/)
            .filter(Boolean);

        try {
            const res = await axiosPublic.get("/api/challan/search", {
                params: {
                    challans: challanArray.join(","),
                    context: "aop",
                },
            });

            let searchData = [];
            if (Array.isArray(res.data)) searchData = res.data;
            else if (Array.isArray(res.data?.data)) searchData = res.data.data;
            else if (Array.isArray(res.data?.data?.data)) searchData = res.data.data.data;

            setMovements(searchData);
            setTotalPages(1);
        } catch (err) {
            console.error(err);
            setSearchError("Failed to search challans.");
            setMovements([]);
        } finally {
            setSearchLoading(false);
        }
    };

    if (loading && movements.length === 0 && !searchLoading) return <div style={{ padding: 20 }}>Loading...</div>;

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
                        onClick={() => {
                            setSearch("");
                            setSearchError(null);
                            setPage(1);
                            setRefreshKey(prev => prev + 1);
                        }}
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

            {
                challanIds.length > 0 && <div style={{ marginBottom: "16px" }}>
                    <button onClick={handleGenerateBill} className="bg-blue-800 bg-opacity-25 text-blue-500 p-2 rounded-md border border-blue-500">Generate Bill ({challanIds.length})</button>
                </div>
            }

            <div style={{ width: "100%", maxHeight: "85vh", overflow: "auto", border: "1px solid #999" }}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                        <tr>
                            {tableHeader.map((th) => {
                                if (th.noFilter) {
                                    return (
                                        <th
                                            key={th.key}
                                            style={{
                                                ...thStickyStyle,
                                                width: th.width,
                                                textAlign: "center",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedRows(new Set(filteredRows.map(r => r.rowKey)));
                                                    } else {
                                                        setSelectedRows(new Set());
                                                    }
                                                }}
                                            />
                                        </th>
                                    );
                                }

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
                        {filteredRows.map((row) => {
                            return (
                                <tr key={row.rowKey}>
                                    <td style={{ ...cellStyle, textAlign: "center" }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(row.rowKey)}
                                            onChange={(e) => {
                                                setSelectedRows((prev) => {
                                                    const next = new Set(prev);
                                                    if (e.target.checked) {
                                                        next.add(row.rowKey);
                                                    } else {
                                                        next.delete(row.rowKey);
                                                    }
                                                    return next;
                                                });
                                            }}
                                            onClick={() => handleBillPreparation(row.chId)}
                                        />
                                    </td>
                                    <td style={cellStyle}>{row.challanDate && row.challanDate !== "-" ? formatToErpDate(row.challanDate) : "-"}</td>
                                    <td style={cellStyle}>{row.challanNo}</td>
                                    <td style={cellStyle}>{row.workOrderQty}</td>
                                    <td style={cellStyle}>{row.composition}</td>
                                    <td style={cellStyle}>{row.color}</td>
                                    <td style={cellStyle}>{row.toFactory || "-"}</td>
                                    <td style={cellStyle}>{row.fromFactory || "-"}</td>
                                    <td style={cellStyle}>{row.sentForAop > 0 ? row.sentForAop : "-"}</td>
                                    <td style={cellStyle}>{row.receiveFromAop > 0 ? row.receiveFromAop : "-"}</td>
                                    <td style={cellStyle}>{row.finishReceiveFromAop > 0 ? row.finishReceiveFromAop : "-"}</td>
                                    {/* <td style={cellStyle}>{row.deliveryQty}</td> */}
                                    <td style={cellStyle}>{row.unitePrice > 0 ? row.unitePrice : "-"}</td>
                                    <td style={cellStyle}>{row.billingAmount > 0 ? row.billingAmount : "-"}</td>
                                    <td style={cellStyle}>{row.paidBillingAmount > 0 ? row.paidBillingAmount : "-"}</td>
                                </tr>
                            )
                        })}
                        {filteredRows.length === 0 && (
                            <tr>
                                <td style={{ ...cellStyle, textAlign: "center" }} colSpan={tableHeader.length}>
                                    {movements.length === 0 && !loading && !searchLoading ? "No records found." : "No rows match the current filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && !search && (
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

export default Aop;