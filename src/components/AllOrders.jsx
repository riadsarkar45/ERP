import { useEffect, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import useAxiosPublic from "../hooks/Axios";
import Modal from "./Modal";
import { useFetchData } from "../hooks/fetch";
import YarnDyeOrders from "./YarnDyeOrders";
import KnittingOrder from "./KnittingOrder";
import DyeingOrder from "./DyeingOrder";
import AopOrder from "./AopOrder";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";
import FilterDropdown from "../helpers/filtering/FilterDropdown";

export const FROZEN_COUNT = 7;

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

// 🔥 1. EXTRACTED: Pure function to apply deep filters. 
// We move this OUTSIDE the component so it's clean and reusable.
const applyDeepFilters = (data, activeFilters) => {
    if (!data || Object.keys(activeFilters).length === 0) return data;

    return data.reduce((acc, job) => {
        let jobValid = true;
        for (const key of Object.keys(activeFilters)) {
            if (job[key] !== undefined && !activeFilters[key].includes(String(job[key]))) {
                jobValid = false; break;
            }
        }
        if (!jobValid) return acc;

        const clonedJob = { ...job };
        if (!clonedJob.workOrders) { acc.push(clonedJob); return acc; }
        clonedJob.workOrders = [];

        for (const wo of job.workOrders) {
            let woValid = true;
            for (const key of Object.keys(activeFilters)) {
                if (job[key] !== undefined) continue;
                if (wo.styleRequirement && wo.styleRequirement[key] !== undefined) {
                    if (!activeFilters[key].includes(String(wo.styleRequirement[key]))) { woValid = false; break; }
                } else if (wo[key] !== undefined) {
                    if (!activeFilters[key].includes(String(wo[key]))) { woValid = false; break; }
                }
            }
            if (!woValid) continue;

            let clonedWo = { ...wo };
            if (clonedWo.compositions) {
                const hasCompFilters = Object.keys(activeFilters).some(key => {
                    if (job[key] !== undefined) return false;
                    if (wo.styleRequirement && wo.styleRequirement[key] !== undefined) return false;
                    if (wo[key] !== undefined) return false;
                    return clonedWo.compositions.some(comp => comp[key] !== undefined);
                });

                if (hasCompFilters) {
                    clonedWo.compositions = clonedWo.compositions.filter(comp => {
                        for (const key of Object.keys(activeFilters)) {
                            if (comp[key] !== undefined && !activeFilters[key].includes(String(comp[key]))) return false;
                        }
                        return true;
                    });
                }
                if (clonedWo.compositions.length === 0) continue;
            }
            clonedJob.workOrders.push(clonedWo);
        }
        if (clonedJob.workOrders.length > 0) acc.push(clonedJob);
        return acc;
    }, []);
};

const AllOrders = ({ orderType }) => {
    const axiosPublic = useAxiosPublic();
    const [jobId, setJobId] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [changedField, setChangedField] = useState({});
    const [styleNo, setStyleNo] = useState("");
    const [deliveries, setDeliveries] = useState({});
    const [workOrderId, setWorkOrderId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);
    const [filters, setFilters] = useState({});
    const [duplicateChallan, setDuplicateChallan] = useState([])
    const { handleRefresh, isUpdated } = InlineEdit();
    const { fetchData, error, loading } = useFetchData();

    const COLUMNS = useMemo(() => {
        const cols = [];
        const defaultWidths = [160, 100, 120, 180, 180, 100, 260];

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
                { header: "ORDER QTY", width: 110, inputName: "orderQty" },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "WORK ORDER QTY", width: 140, inputName: "workOrderQty" },
                { header: "YARN DELIVERY", width: 140, inputName: "totalYarnDelivery" },
                { header: "DEL. SHORT & EXCESS", width: 150 },
                { header: "YARN RETURN RECEIVED", width: 160 },
                { header: "YARN RECEIVED", width: 140 },
                { header: "RCVD SHORT & EXCESS", width: 150 },
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
                { header: "ORDER QTY", width: 110, inputName: "orderQty" },
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
                { header: "ORDER QTY", width: 110, inputName: "orderQty" },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "WORK ORDER QTY", width: 140, inputName: "workOrderQty" },
                { header: "SENT FOR AOP", width: 140, inputName: "totalYarnDelivery" },
                { header: "DEL. SHORT & EXCESS", width: 150 },
                { header: "RECEIVED FROM AOP", width: 160 },
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
    }, [COLUMNS]);

    const currentFrozenWidths = columnWidths.slice(0, FROZEN_COUNT);
    const currentFrozenLefts = currentFrozenWidths.reduce((acc, w, i) => {
        if (i === 0) return [0];
        return [...acc, acc[i - 1] + currentFrozenWidths[i - 1]];
    }, []);

    useEffect(() => {
        fetchData(`/api/work-order/${orderType}`).then(data => { if (data) setOrders(data); });
        if (isUpdated === "success") { fetchData(`/api/work-order/${orderType}`).then(data => { if (data) setOrders(data); }); }
    }, [orderType, isUpdated]);

    // 🔥 2. Use the extracted function to get the final visible rows
    const filteredOrders = useMemo(() => applyDeepFilters(orders, filters), [orders, filters]);

    // 🔥 3. EXCEL-LIKE CASCADING DROPDOWNS: 
    // Get options for a specific column by applying all OTHER filters, but ignoring its own filter.
    const getDropdownOptions = (targetColName) => {
        const tempFilters = { ...filters };
        delete tempFilters[targetColName]; // Ignore this column's active filter

        const tempFilteredData = applyDeepFilters(orders, tempFilters);
        return getUniqueValues(tempFilteredData, targetColName);
    };

    // 🔥 EARLY RETURNS MUST BE HERE (After all hooks)
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded">Something went wrong</div>;
    if (loading) return <div className="p-4 text-gray-500"><Loader2 className="animate-spin" size={40} /></div>;

    const getUniqueValues = (data, key) => {
        const values = new Set();
        if (!data) return [];
        data.forEach(job => {
            if (job[key] !== undefined && job[key] !== null && job[key] !== "") values.add(String(job[key]));
            if (job.workOrders) {
                job.workOrders.forEach(wo => {
                    if (wo[key] !== undefined && wo[key] !== null && wo[key] !== "") values.add(String(wo[key]));
                    if (wo.styleRequirement && wo.styleRequirement[key] !== undefined) values.add(String(wo.styleRequirement[key]));
                    if (wo.compositions) wo.compositions.forEach(comp => { if (comp[key] !== undefined) values.add(String(comp[key])); });
                });
            }
        });
        return Array.from(values).sort((a, b) => {
            const numA = Number(a); const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
    };

    const handleFilterApply = (columnName, selectedValues) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            const uniqueVals = getDropdownOptions(columnName); // Use cascading options to check if "Select All" was clicked
            if (!selectedValues || selectedValues.length === 0 || selectedValues.length === uniqueVals.length) delete newFilters[columnName];
            else newFilters[columnName] = selectedValues;
            return newFilters;
        });
    };

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

    const handleEditRowData = async (workOrderIds) => {
        setLoadingDeliveries(true); setIsEditing(true);
        setJobId(workOrderIds)
        const res = await axiosPublic.get(`/api/deliveries/${orderType}`, {
            params: { workOrderIds: workOrderIds.join(',') }
        });
        if (res.data) setLoadingDeliveries(false);
        console.log(res.data);
        setDeliveries(res.data); setWorkOrderId(workOrderIds); setStyleNo(styleNo);
    };

    const handleEditOnChange = (e) => {
        const { name, value } = e.target;
        setIsEditing(true);

        setChangedField(prev => {
            const updated = { ...prev, [name]: value };

            const deliveries = [
                { deliveryType: updated.deliveryType, qty: updated.deliveryQty },  // ✅ Fixed!
                ...(updated.finishReceivedQty ? [{ deliveryType: "Finish Received", qty: updated.finishReceivedQty }] : []),
            ];

            return { ...updated, deliveries };
        });
    };

    const handleSubmit = async (yarnId, workOrderId) => {
        setIsLoading(true);
        console.log(workOrderId);
        try {
            const update = await axiosPublic.patch(
                `/api/update-order`,
                changedField,
                { params: { yarnId, workOrderId } } // ✅ Correct way to pass query parameters
            ); setDuplicateChallan(update.data.deliveries);
            console.log(update.data.deliveries, "devs.................>>>>>>>>>>");
            if (update.status === 200) {
                const res = await axiosPublic.get(`/api/work-order/${orderType}`);
                const devs = await axiosPublic.get(`/api/deliveries/${orderType}`, {
                    params: { workOrderIds: jobId.join(',') }
                });
                setDeliveries(devs.data); setOrders(res.data); setIsLoading(false); setChangedField({});
            }
        } catch (e) {
            console.log(e.message);
            setIsLoading(false)
        }
    };
    return (
        <div>
            <button onClick={handleRefresh}>Refresh</button>
            <div className="mb-5 p-2 rounded-sm">{(!orders || orders.length < 1) && <div>No order found</div>}</div>

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
                                {COLUMNS.map((col, i) => (
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
                                            {col.inputName && (
                                                <FilterDropdown
                                                    columnName={col.inputName}
                                                    uniqueValues={getDropdownOptions(col.inputName)} // 🔥 CHANGED: Pass cascading options!
                                                    selectedValues={filters[col.inputName]}
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
                                ))}
                            </tr>
                        </thead>

                        {orderType === "yarnDyeingOrder" && <YarnDyeOrders orders={filteredOrders} handleEditRowData={handleEditRowData} FROZEN_COUNT={FROZEN_COUNT} currentFrozenWidths={currentFrozenWidths} currentFrozenLefts={currentFrozenLefts} />}
                        {orderType === "knittingOrder" && <KnittingOrder
                            orders={filteredOrders}
                            setJobId={setJobId}
                            handleEditRowData={handleEditRowData}
                            FROZEN_COUNT={FROZEN_COUNT}
                            currentFrozenWidths={currentFrozenWidths}
                            currentFrozenLefts={currentFrozenLefts} />}
                        {orderType === "dyeingOrder" && <DyeingOrder orders={filteredOrders} handleEditRowData={handleEditRowData} FROZEN_COUNT={FROZEN_COUNT} currentFrozenWidths={currentFrozenWidths} currentFrozenLefts={currentFrozenLefts} />}
                        {orderType === "aopOrder" &&
                            <AopOrder orders={filteredOrders}
                                handleEditRowData={handleEditRowData}
                                setJobId={setJobId}
                                FROZEN_COUNT={FROZEN_COUNT}
                                currentFrozenWidths={currentFrozenWidths}
                                currentFrozenLefts={currentFrozenLefts} />}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllOrders;