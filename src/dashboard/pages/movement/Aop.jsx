import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/fetch';
import useAxiosPublic from '../../../hooks/Axios';
import { formatToErpDate } from '../../../helpers/date/formateDate';

// Note: borderCollapse is "separate" (not "collapse") on the <table> so the
// sticky header keeps its border while scrolling — collapsed borders and
// position:sticky don't render reliably together across browsers. Each cell
// draws its own border instead.
const cellStyle = {
    border: "1px solid #999",
    padding: "6px 8px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "top",
};

// Frozen/sticky header cell — stays pinned to the top of the scroll
// container while the body scrolls underneath it, Excel-style.
const thStickyStyle = {
    ...cellStyle,
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "#f3f4f6",
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

const tableHeader = [
    { header: "", width: "40px", key: "select", noFilter: true }, // Checkbox column
    { header: "Date", width: "10%", key: "challanDate" },
    { header: "Challan No", width: "9%", key: "challanNo" },
    { header: "Work Order", width: "9%", key: "workOrder" },
    { header: "Composition", width: "10%", key: "composition" },
    { header: "Color", width: "10%", key: "color" },
    { header: "To Factory", width: "9%", key: "toFactory" },
    { header: "From Factory", width: "9%", key: "fromFactory" },
    { header: "Sent For Aop", width: "10%", key: "sentForAop" },
    { header: "Receive From Aop", width: "10%", key: "receiveFromAop" },
    { header: "Finish Receive From Aop", width: "10%", key: "finishReceiveFromAop" },
    { header: "Delivery Qty", width: "8%", key: "deliveryQty" },
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
    const [selectedRows, setSelectedRows] = useState(new Set()); // Track selected checkboxes
    const dropdownRef = useRef(null);
    const [totalPages, setTotalPages] = useState(1);
    const [challanIds, setChallanIds] = useState([]); // Track selected challan IDs

    const { fetchData, loading } = useFetchData();
    const axiosPublic = useAxiosPublic();
    useEffect(() => {
        fetchData(`/api/challan-movement/aopOrder?page=${page}&limit=10`)
            .then(data => {
                if (data) setMovements(data.data);
                console.log(data);
                setTotalPages(data.pagination?.totalPages || 1);
            });
    }, [fetchData, page]); // Added 'page' to dependency array

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

    // Flatten and PIVOT the data: 1 row per challan, with delivery types as columns
    const allRows = useMemo(() => {
        const flat = [];
        movements?.forEach((mv, mvIdx) => {
            const mvId = mv?.id ?? mvIdx;
            const challans = mv?.challans || [];

            challans.forEach((ch) => {
                const chId = ch.id;

                let sentForAop = 0;
                let receiveFromAop = 0;
                let finishReceiveFromAop = 0;
                let totalDeliveryQty = 0;

                ch?.deliveries?.forEach((dv) => {
                    if (!dv) return;
                    const qty = Number(dv.totalQty) || 0;
                    totalDeliveryQty += qty;

                    if (dv.deliveryType === "SentForAop") {
                        sentForAop += qty;
                    } else if (dv.deliveryType === "ReceivedFromAop") {
                        receiveFromAop += qty;
                    } else if (dv.deliveryType === "AOPFinishFabricRcvd") {
                        finishReceiveFromAop += qty;
                    }
                });

                const price = Number(mv.unitePrice) || 0;

                flat.push({
                    rowKey: `${chId}`,
                    mvId,
                    chId,
                    challanNo: ch.challanNo,
                    // challanDate: formatToErpDate(ch.challanDate),
                    challanDate: formatToErpDate(ch.challanDate),
                    composition: mv.composition,
                    workOrder: mv.workOrder?.jobNo ?? "",
                    toFactory: ch.toFactory,
                    fromFactory: ch.fromFactory,
                    sentForAop,
                    receiveFromAop,
                    finishReceiveFromAop,
                    deliveryQty: totalDeliveryQty,
                    unitePrice: price,
                    billingAmount: totalDeliveryQty * price,
                    paidBillingAmount: price, // Kept consistent with original logic
                    color: mv.color ?? "-",
                });
            });
        });
        return flat;
    }, [movements]);


    // Example usage:

    const filterOptions = useMemo(() => {
        const opts = {};
        tableHeader.forEach((col) => {
            if (col.noFilter) return; // Skip checkbox column
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
                { responseType: "blob" }   // tell axios to expect binary (PDF) data
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
    console.log(challanIds);

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div style={{ width: "100%" }}>
            {
                challanIds.length > 0 && <div>
                    <button onClick={() => handleGenerateBill()} className="bg-blue-800 bg-opacity-25 text-blue-500 p-2 rounded-md mb-5 border border-blue-500">Generate Bill</button>
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
                                                checked={filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(r.rowKey))}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedRows(new Set(filteredRows.map(r => r.rowKey)));
                                                    } else {
                                                        setSelectedRows(new Set());
                                                    }
                                                }}
                                            // onClick={() => handleBillPreparation(th.id)}
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
                            // console.log(row, "rows to identify");
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
                                    <td style={cellStyle}>{formatToErpDate(row.challanDate)}</td>
                                    <td style={cellStyle}>{row.challanNo} {"=>"} {row.chId}</td>
                                    <td style={cellStyle}>{row.workOrder}</td>
                                    <td style={cellStyle}>{row.composition}</td>
                                    <td style={cellStyle}>{row.color}</td>
                                    <td style={cellStyle}>{row.toFactory}</td>
                                    <td style={cellStyle}>{row.fromFactory}</td>
                                    <td style={cellStyle}>{row.sentForAop > 0 ? row.sentForAop : "-"}</td>
                                    <td style={cellStyle}>{row.receiveFromAop > 0 ? row.receiveFromAop : "-"}</td>
                                    <td style={cellStyle}>{row.finishReceiveFromAop > 0 ? row.finishReceiveFromAop : "-"}</td>
                                    <td style={cellStyle}>{row.deliveryQty}</td>
                                    <td style={cellStyle}>{row.unitePrice}</td>
                                    <td style={cellStyle}>{row.billingAmount}</td>
                                    <td style={cellStyle}>{row.paidBillingAmount}</td>
                                </tr>
                            )
                        })}
                        {filteredRows.length === 0 && (
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

export default Aop;