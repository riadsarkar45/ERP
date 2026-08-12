import { useEffect, useState, useCallback, useMemo } from "react";
import { FunnelX, Loader, Loader2, Save } from "lucide-react";
import useAxiosPublic from "../hooks/Axios";
import Modal from "./Modal";
import { useFetchData } from "../hooks/fetch";
import YarnDyeOrders from "./YarnDyeOrders";
import KnittingOrder from "./KnittingOrder";
import DyeingOrder from "./DyeingOrder";
import AopOrder from "./AopOrder";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";
import FilterDropdown from "../helpers/filtering/FilterDropdown";
import useAxiosPrivate from "../hooks/UseAxiosPrivate";
import Toast from "./Toast";

export const FROZEN_COUNT = 7;

// Must mirror the backend FIELD_MAP keys in workOrderFilters.ts — only raw DB
// columns can be filtered server-side. Computed/aggregate columns (delivery
// sums, balances, etc.) aren't real fields until calculateYarnCompStat runs,
// so they're excluded here rather than sending a filter the backend rejects.
const FILTERABLE_COLUMNS = new Set([
    "jobNo",
    "factoryName",
    "workOrderNo",
    "styleNo",
    "month",
    "buyerName",
    "composition",
    "color",
    "orderQty",
    "workOrderQty",
    "unitePrice",
    "bookingColor",
]);

const getSavedWidths = (type, defaultWidths) => {
    try {
        const saved = localStorage.getItem(`tableColumnWidths_${type}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length === defaultWidths.length) return parsed;
        }
    } catch (e) { console.error("Error loading column widths:", e); }
    return defaultWidths;
};

const AllOrders = ({ orderType }) => {
    const axiosPublic = useAxiosPublic();
    const axiosPrivate = useAxiosPrivate();
    const [jobId, setJobId] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [orders, setOrders] = useState([]);
    // True once the very first successful orders fetch completes — used to
    // distinguish "first load" (full-page loader is fine) from "refetching
    // because filters/page changed" (should NOT blank the existing table).
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    // Keyed by yarnId -> { [yarnId]: { deliveryQty, challanNo, deliveryType, date, ... } }
    const [changedField, setChangedField] = useState({});
    const [styleNo, setStyleNo] = useState("");
    const [deliveries, setDeliveries] = useState({});
    const [workOrderId, setWorkOrderId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);

    // Active filters: { [columnName]: string[] of selected values }
    const [filters, setFilters] = useState({});
    // Cached dropdown options per column, fetched from /filter-options as dropdowns open.
    const [filterOptions, setFilterOptions] = useState({});
    const [filterOptionsLoading, setFilterOptionsLoading] = useState({});

    const [duplicateChallan, setDuplicateChallan] = useState([]);
    const [challanIssue, setChallanIssue] = useState([]);
    const [deliveryIssue, setDeliveryIssue] = useState([]);
    // Pagination state, driven by getAllOrders' { pagination: { page, limit, total, totalPages } }
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    const { handleInlineEdit, changedField: updatedFields, toastType, toastMessage, setShowToast, showToast, isInlineEditingLoading, handleOnChange, isEdit, isUpdated, handleEditedSubmit } = InlineEdit();
    const { fetchData, error, loading } = useFetchData();
    // Separate instance for filter-options requests — its own `loading` state
    // is intentionally NOT wired into the top-level full-page loader below,
    // so opening a filter dropdown no longer blanks the whole table.
    const { fetchData: fetchFilterOptions } = useFetchData();

    const COLUMNS = useMemo(() => {
        const cols = [];
        const defaultWidths = [160, 80, 120, 180, 180, 100, 260];

        if (orderType === "knittingOrder") {
            cols.push(
                { header: "FACTORY NAME", width: defaultWidths[0], inputName: "factoryName" },
                { header: "JOB NO.", width: defaultWidths[1], inputName: "jobNo" },
                { header: "WORK ORDER NO", width: defaultWidths[2], inputName: "workOrderNo" },
                { header: "BUYER NAME", width: defaultWidths[3], inputName: "buyerName" },
                { header: "STYLE", width: defaultWidths[4], inputName: "styleNo" },
                { header: "MONTH", width: defaultWidths[5], inputName: "month" },
                { header: "COMPOSITION", width: defaultWidths[6], inputName: "composition" },
                { header: "COLOR", width: 200, inputName: "color" },
                // { header: "ORDER QTY", width: 110, inputName: "orderQty" },               
                { header: "WORK ORDER QTY", width: 140, inputName: "workOrderQty" },
                { header: "YARN DELIVERY", width: 140, inputName: "totalYarnDelivery" },
                { header: "DEL. SHORT & EXCESS", width: 150 },
                { header: "YARN RETURN RECEIVED", width: 160 },
                { header: "GREY RECEIVED", width: 140 },
                { header: "RCVD SHORT & EXCESS", width: 150 },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: 140 },
                { header: "PAID BILLING AMOUNT", width: 150 },
                { header: "PENDING BILLING AMOUNT", width: 160 },
            );
        } else if (orderType === "dyeingOrder") {
            cols.push(
                { header: "FACTORY NAME", width: defaultWidths[0], inputName: "factoryName" },
                { header: "JOB NO.", width: defaultWidths[1], inputName: "jobNo" },
                { header: "WORK ORDER NO", width: defaultWidths[2], inputName: "workOrderNo" },
                { header: "BUYER NAME", width: defaultWidths[3], inputName: "buyerName" },
                { header: "STYLE", width: defaultWidths[4], inputName: "styleNo" },
                { header: "MONTH", width: defaultWidths[5], inputName: "month" },
                { header: "COMPOSITION", width: defaultWidths[6], inputName: "composition" },
                { header: "COLOR", width: 200, inputName: "bookingColor" },
                // { header: "ORDER QTY", width: 110, inputName: "orderQty" },
                { header: "DYEING WORK ORDER QTY", width: 180, inputName: "workOrderQty" },
                { header: "GREY DELIVERY", width: 140, inputName: "greyReceived" },
                { header: "DELIVERY SHORT & EXCESS", width: 180, inputName: "greyReceived" },
                { header: "GREY RETURN RECEIVE", width: 160, inputName: "greyReturn" },
                { header: "GREY RECEIVED FROM DYEING", width: 190, inputName: "greyReturn" },
                { header: "FINISH FABRIC RECEIVED", width: 170, inputName: "greyReturn" },
                { header: "BALANCE", width: 110, inputName: "greyReturn" },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "TOTAL SENT FOR COMPACTING", width: 190, inputName: "sentForCompacting" },
                { header: "TOTAL RECEIVED FROM COMPACTING", width: 210, inputName: "receivedFromCompacting" },
                { header: "TOTAL BILLING AMOUNT", width: 170, inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: 140, inputName: "unitePrice" },
                { header: "PENDING BILLING AMOUNT", width: 170, inputName: "unitePrice" },
            );
        } else if (orderType === "yarnDyeingOrder") {
            cols.push(
                { header: "FACTORY NAME", width: defaultWidths[0], inputName: "factoryName" },
                { header: "JOB NO.", width: defaultWidths[1], inputName: "jobNo" },
                { header: "WORK ORDER NO", width: defaultWidths[2], inputName: "workOrderNo" },
                { header: "BUYER NAME", width: defaultWidths[3], inputName: "buyerName" },
                { header: "STYLE", width: defaultWidths[4], inputName: "styleNo" },
                { header: "MONTH", width: defaultWidths[5], inputName: "month" },
                { header: "COMPOSITION", width: defaultWidths[6], inputName: "composition" },
                { header: "BOOKING COLOR", width: 200, inputName: "bookingColor" },
                { header: "ORDER QTY", width: 110, inputName: "orderQty" },
                { header: "COLOR WISE ORDER QTY", width: 180, inputName: "orderColor" },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "YARN DELIVERY FOR Y/D", width: 170, inputName: "yarnDeliveryForYd" },
                { header: "DEL.SHORT & EXCESS", width: 160 },
                { header: "YARN RETURN RECEIVED", width: 170, inputName: "yarnReturnReceived" },
                { header: "YARN RECEIVED FROM Y/D", width: 180, inputName: "greyReceivedFromYd" },
                { header: "FINISH YARN RECEIVED", width: 170, inputName: "finishReceived" },
                { header: "FINISH RETURN", width: 140, inputName: "finishReturn" },
                { header: "YARN STOCK", width: 130 },
            );
        } else if (orderType === "aopOrder") {
            cols.push(
                { header: "FACTORY NAME", width: defaultWidths[0], inputName: "factoryName" },
                { header: "JOB NO.", width: defaultWidths[1], inputName: "jobNo" },
                { header: "WORK ORDER NO", width: defaultWidths[2], inputName: "workOrderNo" },
                { header: "BUYER NAME", width: defaultWidths[3], inputName: "buyerName" },
                { header: "STYLE", width: defaultWidths[4], inputName: "styleNo" },
                { header: "MONTH", width: defaultWidths[5], inputName: "month" },
                { header: "COMPOSITION", width: defaultWidths[6], inputName: "composition" },
                { header: "COLOR", width: 200, inputName: "color" },
                // { header: "ORDER QTY", width: 110, inputName: "orderQty" },                
                { header: "WORK ORDER QTY", width: 140, inputName: "workOrderQty" },
                { header: "SENT FOR AOP", width: 140, inputName: "totalYarnDelivery" },
                { header: "DEL. SHORT & EXCESS", width: 150 },
                { header: "RETURN FROM AOP", width: 150 },
                { header: "RECEIVED FROM AOP", width: 150 },
                { header: "FINISH AFTER AOP", width: 150 },
                { header: "PARTY BALANCE", width: 170 },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: 140 },
                { header: "PAID BILLING AMOUNT", width: 150 },
                { header: "PENDING BILLING AMOUNT", width: 160 },
            );
        }
        return cols;
    }, [orderType]);

    const [columnWidths, setColumnWidths] = useState(() => {
        const defaultWidths = COLUMNS.map(c => c.width);
        return getSavedWidths(orderType, defaultWidths);
    });

    useEffect(() => {
        try { localStorage.setItem(`tableColumnWidths_${orderType}`, JSON.stringify(columnWidths)); }
        catch (e) { console.error("Error saving column widths:", e); }
    }, [columnWidths, orderType]);

    useEffect(() => {
        const defaultWidths = COLUMNS.map(c => c.width);
        setColumnWidths(getSavedWidths(orderType, defaultWidths));
        setFilters({});
        setFilterOptions({});
    }, [COLUMNS]);

    const currentFrozenWidths = columnWidths.slice(0, FROZEN_COUNT);
    const currentFrozenLefts = currentFrozenWidths.reduce((acc, w, i) => {
        if (i === 0) return [0];
        return [...acc, acc[i - 1] + currentFrozenWidths[i - 1]];
    }, []);

    // Reset to page 1 whenever orderType changes (switching tabs shouldn't keep an old page number).
    // Also reset hasLoadedOnce so switching tabs shows the full-page loader again
    // (a fresh order type is effectively a fresh view, unlike filtering/paging
    // within the same view).
    useEffect(() => {
        setPage(1);
        setHasLoadedOnce(false);
    }, [orderType]);

    // Reset to page 1 whenever filters change, so you don't get stranded on a
    // page number that no longer exists for the new (smaller) filtered set.
    useEffect(() => {
        setPage(1);
    }, [filters]);

    const filtersParam = useMemo(
        () => (Object.keys(filters).length ? JSON.stringify(filters) : undefined),
        [filters]
    );

    // NOTE: getAllOrders now responds with { type, data, pagination }, not a raw array.
    // Filtering now happens server-side — `filters` is passed straight through
    // as a query param instead of being applied client-side afterward.
    useEffect(() => {
        fetchData(`/api/work-order/${orderType}`, {
            params: { page, limit, filters: filtersParam }
        })
            .then(res => {
                if (res) {
                    setOrders(res.data ?? []);
                    console.log(res.data, "orders data");
                    if (res.pagination) setPagination(res.pagination);
                    console.log(res.pagination);
                }
            })
            .finally(() => {
                setHasLoadedOnce(true);
            });
    }, [orderType, isUpdated, page, limit, filtersParam]);

    // Lazily fetches (and caches) dropdown options for a single column, scoped
    // by every OTHER currently-active filter (cross-filtering, same behavior
    // as the old client-side getDropdownOptions).
    const loadFilterOptions = useCallback((columnName) => {
        if (!FILTERABLE_COLUMNS.has(columnName)) return;

        const otherFilters = { ...filters };
        delete otherFilters[columnName];
        const otherFiltersParam = Object.keys(otherFilters).length ? JSON.stringify(otherFilters) : undefined;

        setFilterOptionsLoading(prev => ({ ...prev, [columnName]: true }));

        fetchFilterOptions(`/api/work-order/${orderType}/filter-options/${columnName}`, {
            params: { filters: otherFiltersParam }
        })
            .then(res => {
                if (res) setFilterOptions(prev => ({ ...prev, [columnName]: res.data ?? [] }));
            })
            .finally(() => {
                setFilterOptionsLoading(prev => ({ ...prev, [columnName]: false }));
            });
    }, [orderType, filters, fetchFilterOptions]);

    // Re-fetch options for any column whose dropdown is already open/cached
    // whenever a *different* filter changes, so cross-filtering stays correct
    // (e.g. narrowing by factoryName should shrink the color dropdown too).
    useEffect(() => {
        Object.keys(filterOptions).forEach(columnName => {
            if (FILTERABLE_COLUMNS.has(columnName)) loadFilterOptions(columnName);
        });
        // Only re-run when the actual filter values change, not when
        // loadFilterOptions itself is recreated from filters changing —
        // that would loop. filtersParam is a stable string snapshot of filters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersParam, orderType]);

    const handleFilterApply = (columnName, selectedValues) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            const allOptions = filterOptions[columnName] || [];
            if (!selectedValues || selectedValues.length === 0 || selectedValues.length === allOptions.length) {
                delete newFilters[columnName];
            } else {
                newFilters[columnName] = selectedValues;
            }
            return newFilters;
        });
    };

    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded">Something went wrong</div>;
    // Only show the full-page loader on the very first load. After that,
    // `loading` still flips true on every filter/page change, but the table
    // should stay visible — an in-place indicator (added near the table below)
    // covers that case instead of unmounting the whole view.
    if (loading && !hasLoadedOnce) {
        return (
            <div className="flex items-center justify-center h-full py-10">
                <Loader2 className="h-14 w-14 animate-spin text-gray-500" />
            </div>
        );
    }
    const isRefetching = loading && hasLoadedOnce;

    const startColumnResize = (e, colIndex) => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.pageX; const startWidth = columnWidths[colIndex];
        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(80, startWidth + (moveEvent.pageX - startX));
            setColumnWidths(prev => {
                if (prev[colIndex] === newWidth) return prev;
                const newWidths = [...prev]; newWidths[colIndex] = newWidth; return newWidths;
            });
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = ''; document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    };

    // handle deliveries
    const handleEditRowData = async (workOrderIds) => {
        setLoadingDeliveries(true);
        setIsEditing(true);
        setJobId(workOrderIds);
        setChangedField({});
        setDuplicateChallan([]);
        setChallanIssue([]);

        fetchData(`/api/deliveries/${orderType}`, {
            params: { workOrderIds: workOrderIds }
        })
            .then(data => {
                if (data) {
                    console.log(data, "deliveries data");
                    setDeliveries(data);
                    setWorkOrderId(workOrderIds);
                    // Removed the old `setStyleNo(styleNo)` no-op (set state to itself).
                    // If styleNo should come from the fetched data, wire it up here instead.
                }
            })
            .catch(error => {
                console.error("Fetch error:", error);
            })
            .finally(() => {
                setLoadingDeliveries(false);
            });
    };

    const handleEditOnChange = (yarnId, e) => {
        const { name, value } = e.target;
        setIsEditing(true);

        setChangedField(prev => {
            const rowPrev = prev[yarnId] || {};
            const updatedRow = {
                ...rowPrev,
                [name]: value,
            };

            // Only backfill a default date when the field being edited ISN'T
            // "date" itself. Previously this ran unconditionally AFTER
            // `[name]: value`, so when name === "date" it re-set date back to
            // rowPrev.date (or today), overwriting the value the user just
            // picked. That's what made the date field look "stuck".
            if (name !== "date" && updatedRow.date === undefined) {
                updatedRow.date = new Date().toISOString().split("T")[0];
            }

            // The delivery type flip changes which side ("to"/"from") should be
            // this work order's own factory. Any previously typed toFactory/
            // fromFactory values were for the OLD direction and are now stale —
            // drop them so the submit-time fallback recomputes the correct side.
            if (name === "deliveryType") {
                delete updatedRow.toFactory;
                delete updatedRow.fromFactory;
            }

            const isAopGreyReceived = updatedRow.deliveryType === "Received From Aop";

            const deliveries = [
                { deliveryType: updatedRow.deliveryType, qty: updatedRow.deliveryQty },
                ...(updatedRow.finishReceivedQty ? [{
                    deliveryType: isAopGreyReceived ? "AOP Finish Fabric Rcvd" : "Finish Received",
                    qty: updatedRow.finishReceivedQty
                }] : []),
            ];

            return { ...prev, [yarnId]: { ...updatedRow, deliveries } };
        });
    };

    // Inside AllOrders.jsx
    const handleSubmit = async (yarnId, workOrderId, overridePayload = null) => {
        setIsLoading(true);
        setChallanIssue([]);
        setDeliveryIssue([]);
        // Use overridePayload if provided (from Deliveries.jsx), otherwise fall back to changedField
        const payload = overridePayload || changedField[yarnId] || {};

        try {
            const update = await axiosPublic.patch(
                `/api/update-order`,
                payload,
                { params: { yarnId, workOrderId } }
            );

            if (update.status === 200) {
                setChallanIssue([{ message: "Delivery Added", type: "success" }]);

                fetchData(`/api/work-order/${orderType}`, { params: { page, limit, filters: filtersParam } })
                    .then((res) => {
                        if (res) {
                            setOrders(res.data ?? []);
                            if (res.pagination) setPagination(res.pagination);
                            setIsEditing(false);
                        }
                    });

                // FIX: jobId might be a number or an array. Safely handle both to prevent .join() crashes.
                fetchData(`/api/deliveries/${orderType}`, {
                    params: { workOrderIds: Array.isArray(jobId) ? jobId.join(',') : jobId }
                })
                    .then((dev) => {
                        setDeliveries(dev);
                    });

                setChangedField(prev => {
                    const next = { ...prev };
                    delete next[yarnId];
                    return next;
                });
            }
        } catch (e) {
            // ... your existing error handling
            console.log(e.response.data);
            setDeliveryIssue(e.response.data)
        } finally {
            setIsLoading(false);
        }
    };
    const handleClearFilters = () => {
        setFilters({});
        setFilterOptions({});
    };
    return (
        <div>
            {
                showToast && (
                    <Toast
                        message={toastMessage}
                        type={toastType}
                        onClose={() => setShowToast(false)}
                        duration={3000}
                    />
                )
            }
            <div className="flex gap-2">
                {
                    isEdit.isEditing && <button onClick={() => handleEditedSubmit()} title="Save Changes" className="bg-blue-700 text-white rounded-md p-2 text-lg"><Save /></button>
                }
                {
                    isInlineEditingLoading && <button title="Clear Filter" className="bg-blue-700 text-white rounded-md p-2 text-lg"><Loader /></button>
                }
                {
                    Object.keys(filters).length > 0 && <button onClick={() => handleClearFilters()} title="Clear Filter" className="bg-blue-700 text-white rounded-md p-2 text-lg"><FunnelX /></button>
                }
            </div>
            <div className="mb-5 p-2 rounded-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(!orders || orders.length < 1) && !isRefetching && <div>No order found</div>}
                {isRefetching && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 13 }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating...</span>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div style={{ position: "relative", overflowX: "auto", overflowY: "auto", maxHeight: "80vh" }}>
                    {isEditing && (
                        <Modal
                            workOrderId={workOrderId}
                            isLoading={isLoading}
                            deliveriesLoading={loadingDeliveries}
                            deliveries={deliveries}
                            duplicateChallan={duplicateChallan}
                            setIsEditing={setIsEditing}
                            handleSubmit={handleSubmit}
                            handleEditOnChange={handleEditOnChange}
                            orderId={jobId}
                            orders={orders}
                            setJobId={setJobId}
                            orderType={orderType}
                            changedField={changedField}
                            challanIssue={challanIssue}
                            deliveryIssue={deliveryIssue}
                        />
                    )}

                    <table style={{ width: "max-content", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                        <colgroup>
                            {COLUMNS.map((col, i) => (
                                <col key={i} style={{ width: `${columnWidths[i]}px` }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {COLUMNS.map((col, i) => {
                                    const isFilterable = col.inputName && FILTERABLE_COLUMNS.has(col.inputName);
                                    return (
                                        <th
                                            key={i}
                                            style={{
                                                position: "sticky", top: 0,
                                                left: i < FROZEN_COUNT ? `${currentFrozenLefts[i]}px` : "auto",
                                                zIndex: i < FROZEN_COUNT ? 20 : 10,
                                                backgroundColor: "#f3f4f6",
                                                width: `${columnWidths[i]}px`, minWidth: `${columnWidths[i]}px`,
                                                borderRight: "1px solid #d1d5db", borderBottom: "2px solid #9ca3af",
                                                padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 13, color: "#374151",
                                                whiteSpace: "nowrap", boxShadow: i === FROZEN_COUNT - 1 ? "2px 0 5px -1px rgba(0,0,0,0.18)" : "none",
                                                overflow: "visible", boxSizing: "border-box",
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{col.header}</span>
                                                {isFilterable && (
                                                    <FilterDropdown
                                                        columnName={col.inputName}
                                                        uniqueValues={filterOptions[col.inputName] || []}
                                                        isLoading={!!filterOptionsLoading[col.inputName]}
                                                        selectedValues={filters[col.inputName]}
                                                        onOpen={() => {
                                                            if (!filterOptions[col.inputName]) loadFilterOptions(col.inputName);
                                                        }}
                                                        onApply={handleFilterApply}
                                                    />
                                                )}
                                            </div>

                                            <div
                                                onMouseDown={(e) => startColumnResize(e, i)}
                                                style={{
                                                    position: 'absolute', top: 0, right: '-4px', width: '8px', height: '100%',
                                                    cursor: 'col-resize', zIndex: 100, backgroundColor: 'transparent', transition: 'background-color 0.2s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.8)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            />
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {orderType === "yarnDyeingOrder" && <YarnDyeOrders orders={orders} handleEditRowData={handleEditRowData} FROZEN_COUNT={FROZEN_COUNT} currentFrozenWidths={currentFrozenWidths} currentFrozenLefts={currentFrozenLefts} />}
                        {orderType === "knittingOrder" && <KnittingOrder
                            orders={orders}
                            setJobId={setJobId}
                            handleEditRowData={handleEditRowData}
                            FROZEN_COUNT={FROZEN_COUNT}
                            currentFrozenWidths={currentFrozenWidths}
                            isEdit={isEdit}
                            updatedFields={updatedFields}
                            handleOnChange={handleOnChange}
                            handleInlineEdit={handleInlineEdit}
                            currentFrozenLefts={currentFrozenLefts} />}
                        {orderType === "dyeingOrder" && <DyeingOrder
                            orders={orders}
                            handleEditRowData={handleEditRowData}
                            updatedFields={updatedFields}
                            isEdit={isEdit}
                            handleOnChange={handleOnChange}
                            handleInlineEdit={handleInlineEdit}
                            FROZEN_COUNT={FROZEN_COUNT}
                            currentFrozenWidths={currentFrozenWidths}
                            currentFrozenLefts={currentFrozenLefts} />}
                        {orderType === "aopOrder" &&
                            <AopOrder orders={orders}
                                handleEditRowData={handleEditRowData}
                                setJobId={setJobId}
                                FROZEN_COUNT={FROZEN_COUNT}
                                currentFrozenWidths={currentFrozenWidths}
                                updatedFields={updatedFields}
                                handleOnChange={handleOnChange}
                                isEdit={isEdit}
                                handleInlineEdit={handleInlineEdit}
                                currentFrozenLefts={currentFrozenLefts} />}
                    </table>
                </div>
            </div>


        </div>
    );
};

export default AllOrders;