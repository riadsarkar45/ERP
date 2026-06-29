import { useEffect, useState } from "react";
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

// ── Frozen column config ──────────────────────────────────────────────────────
export const FROZEN_COUNT = 7;
export const FROZEN_WIDTHS = [160, 100, 120, 180, 180, 100, 260];
export const FROZEN_LEFTS = FROZEN_WIDTHS.reduce((acc, w, i) => {
    if (i === 0) return [0];
    return [...acc, acc[i - 1] + FROZEN_WIDTHS[i - 1]];
}, []);
// ─────────────────────────────────────────────────────────────────────────────

const AllOrders = ({ orderType }) => {
    const axiosPublic = useAxiosPublic();

    const [jobId, setOrderId] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [changedField, setChangedField] = useState({});
    const [styleNo, setStyleNo] = useState("");
    const [deliveries, setDeliveries] = useState({});
    const [workOrderId, setWorkOrderId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);
    
    // Filter State
    const [filters, setFilters] = useState({});

    const { handleRefresh, isUpdated } = InlineEdit();
    const { fetchData, error, loading } = useFetchData();

    useEffect(() => {
        fetchData(`/api/work-order/${orderType}`).then(data => {
            if (data) setOrders(data);
        });
        if (isUpdated === "success") {
            fetchData(`/api/work-order/${orderType}`).then(data => {
                if (data) setOrders(data);
            });
        }
    }, [orderType, isUpdated]);

    if (error) return (
        <div className="p-4 bg-red-100 text-red-700 rounded">
            Something went wrong please try again later
        </div>
    );

    if (loading) return (
        <div className="p-4 text-gray-500">
            <Loader2 className="animate-spin" size={40} />
        </div>
    );

    // ── Filter Logic ─────────────────────────────────────────────────────────
    const getUniqueValues = (data, key) => {
        const values = new Set();
        if (!data) return [];
        data.forEach(job => {
            if (job[key] !== undefined && job[key] !== null && job[key] !== "") values.add(String(job[key]));
            if (job.workOrders) {
                job.workOrders.forEach(wo => {
                    if (wo[key] !== undefined && wo[key] !== null && wo[key] !== "") values.add(String(wo[key]));
                    if (wo.styleRequirement && wo.styleRequirement[key] !== undefined && wo.styleRequirement[key] !== null) {
                        values.add(String(wo.styleRequirement[key]));
                    }
                    if (wo.compositions) {
                        wo.compositions.forEach(comp => {
                            if (comp[key] !== undefined && comp[key] !== null && comp[key] !== "") {
                                values.add(String(comp[key]));
                            }
                        });
                    }
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
            const uniqueVals = getUniqueValues(orders, columnName);
            if (!selectedValues || selectedValues.length === 0 || selectedValues.length === uniqueVals.length) {
                delete newFilters[columnName];
            } else {
                newFilters[columnName] = selectedValues;
            }
            return newFilters;
        });
    };

    const filteredOrders = orders.filter(job => {
        return Object.keys(filters).every(key => {
            const selectedValues = filters[key];
            if (!selectedValues || selectedValues.length === 0) return true;
            
            if (job[key] !== undefined && selectedValues.includes(String(job[key]))) return true;
            
            if (job.workOrders) {
                const hasMatch = job.workOrders.some(wo => {
                    if (wo[key] !== undefined && selectedValues.includes(String(wo[key]))) return true;
                    if (wo.styleRequirement && wo.styleRequirement[key] !== undefined && selectedValues.includes(String(wo.styleRequirement[key]))) return true;
                    if (wo.compositions) {
                        return wo.compositions.some(comp => 
                            comp[key] !== undefined && selectedValues.includes(String(comp[key]))
                        );
                    }
                    return false;
                });
                if (hasMatch) return true;
            }
            return false;
        });
    });
    // ─────────────────────────────────────────────────────────────────────────

    const COLUMNS = [];

    if (orderType === "knittingOrder") {
        COLUMNS.push(
            { header: "FACTORY NAME", width: FROZEN_WIDTHS[0], inputName: "factoryName" },
            { header: "JOB NO.", width: FROZEN_WIDTHS[1], inputName: "jobNo" }, // FIXED: was workOrderNo
            { header: "WORK ORDER NO", width: FROZEN_WIDTHS[2], inputName: "workOrderNo" },
            { header: "BUYER NAME", width: FROZEN_WIDTHS[3], inputName: "buyerName" },
            { header: "STYLE", width: FROZEN_WIDTHS[4], inputName: "styleNo" },
            { header: "MONTH", width: FROZEN_WIDTHS[5], inputName: "month" },
            { header: "COMPOSITION", width: FROZEN_WIDTHS[6], inputName: "composition" },
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
    }

    if (orderType === "dyeingOrder") {
        COLUMNS.push(
            { header: "FACTORY NAME", width: FROZEN_WIDTHS[0], inputName: "factoryName" },
            { header: "JOB NO.", width: FROZEN_WIDTHS[1], inputName: "jobNo" }, // FIXED: was workOrderNo
            { header: "WORK ORDER NO", width: FROZEN_WIDTHS[2], inputName: "workOrderNo" },
            { header: "BUYER NAME", width: FROZEN_WIDTHS[3], inputName: "buyerName" },
            { header: "STYLE", width: FROZEN_WIDTHS[4], inputName: "styleNo" },
            { header: "MONTH", width: FROZEN_WIDTHS[5], inputName: "month" },
            { header: "COMPOSITION", width: FROZEN_WIDTHS[6], inputName: "composition" },
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
    }

    if (orderType === "yarnDyeingOrder") {
        COLUMNS.push(
            { header: "FACTORY NAME", width: FROZEN_WIDTHS[0], inputName: "factoryName" },
            { header: "JOB NO.", width: FROZEN_WIDTHS[1], inputName: "jobNo" },
            { header: "WORK ORDER NO", width: FROZEN_WIDTHS[2], inputName: "workOrderNo" },
            { header: "BUYER NAME", width: FROZEN_WIDTHS[3], inputName: "buyerName" },
            { header: "STYLE", width: FROZEN_WIDTHS[4], inputName: "styleNo" },
            { header: "MONTH", width: FROZEN_WIDTHS[5], inputName: "month" },
            { header: "COMPOSITION", width: FROZEN_WIDTHS[6], inputName: "composition" },
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
    }

    if (orderType === "aopOrder") {
        COLUMNS.push(
            { header: "FACTORY NAME", width: FROZEN_WIDTHS[0], inputName: "factoryName" },
            { header: "JOB NO.", width: FROZEN_WIDTHS[1], inputName: "jobNo" }, // FIXED: was workOrderNo
            { header: "WORK ORDER NO", width: FROZEN_WIDTHS[2], inputName: "workOrderNo" },
            { header: "BUYER NAME", width: FROZEN_WIDTHS[3], inputName: "buyerName" },
            { header: "STYLE", width: FROZEN_WIDTHS[4], inputName: "styleNo" },
            { header: "MONTH", width: FROZEN_WIDTHS[5], inputName: "month" },
            { header: "COMPOSITION", width: FROZEN_WIDTHS[6], inputName: "composition" },
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

    const handleEditRowData = async (jobNumber) => {
        setLoadingDeliveries(true);
        setIsEditing(true);
        const res = await axiosPublic.get(`/api/deliveries/${jobNumber}/${orderType}`);
        if (res.data) setLoadingDeliveries(false);
        setDeliveries(res.data);
        setWorkOrderId(2);
        setStyleNo(styleNo);
    };

    const handleEditOnChange = (e) => {
        const { name, value } = e.target;
        setIsEditing(true);
        setChangedField(prev => {
            const updated = { ...prev, [name]: value };
            const deliveries = [
                { deliveryType: updated.deliveryType, qty: updated.greyReceivedQty },
                ...(updated.finishReceivedQty
                    ? [{ deliveryType: "Finish Received", qty: updated.finishReceivedQty }]
                    : []),
            ];
            return { ...updated, deliveries };
        });
    };

    const handleSubmit = async (yarnId) => {
        setIsLoading(true);
        const update = await axiosPublic.patch(`/api/update-order/${yarnId}`, changedField);
        if (update.status === 200) {
            const res = await axiosPublic.get(`/api/work-order/${orderType}`);
            const devs = await axiosPublic.get(`/api/deliveries/${jobId}/${orderType}`);
            setDeliveries(devs.data);
            setOrders(res.data);
            setIsLoading(false);
            setChangedField({});
        }
    };

    return (
        <div>
            <button onClick={handleRefresh}>Refresh</button>

            <div className="mb-5 p-2 rounded-sm">
                {(!orders || orders.length < 1) && <div>No order found</div>}
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div style={{ position: "relative", overflowX: "auto", overflowY: "auto" }}>
                    {isEditing && (
                        <Modal
                            workOrderId={workOrderId}
                            isLoading={isLoading}
                            deliveriesLoading={loadingDeliveries}
                            deliveries={deliveries}
                            setIsEditing={setIsEditing}
                            handleSubmit={handleSubmit}
                            handleEditOnChange={handleEditOnChange}
                            orderId={jobId}
                            orders={orders}
                            orderType={orderType}
                            changedField={changedField}
                        />
                    )}

                    <table style={{ width: "max-content", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                        <colgroup>
                            {COLUMNS.map((col, i) => (
                                <col key={i} style={{ width: `${col.width}px` }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {COLUMNS.map((col, i) => (
                                    <th
                                        key={i}
                                        style={{
                                            position: "sticky",
                                            top: 0,
                                            left: i < FROZEN_COUNT ? `${FROZEN_LEFTS[i]}px` : "auto",
                                            zIndex: i < FROZEN_COUNT ? 20 : 10,
                                            backgroundColor: "#f3f4f6",
                                            width: `${col.width}px`,
                                            minWidth: `${col.width}px`,
                                            borderRight: "1px solid #d1d5db",
                                            borderBottom: "2px solid #9ca3af",
                                            padding: "8px 12px",
                                            textAlign: "left",
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                            whiteSpace: "nowrap",
                                            boxShadow: i === FROZEN_COUNT - 1 ? "2px 0 5px -1px rgba(0,0,0,0.18)" : "none",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{col.header}</span>
                                            
                                            {col.inputName && (
                                                <FilterDropdown 
                                                    columnName={col.inputName}
                                                    uniqueValues={getUniqueValues(orders, col.inputName)} 
                                                    selectedValues={filters[col.inputName]}
                                                    onApply={handleFilterApply}
                                                />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {orderType === "yarnDyeingOrder" && (
                            <YarnDyeOrders orders={filteredOrders} handleEditRowData={handleEditRowData} />
                        )}
                        {orderType === "knittingOrder" && (
                            <KnittingOrder
                                orders={filteredOrders}
                                handleEditRowData={handleEditRowData}
                                FROZEN_COUNT={FROZEN_COUNT}
                                FROZEN_WIDTHS={FROZEN_WIDTHS}
                            />
                        )}
                        {orderType === "dyeingOrder" && (
                            <DyeingOrder
                                orders={filteredOrders}
                                handleEditRowData={handleEditRowData}
                                FROZEN_COUNT={FROZEN_COUNT}
                                FROZEN_WIDTHS={FROZEN_WIDTHS}
                            />
                        )}
                        {orderType === "aopOrder" && (
                            <AopOrder
                                orders={filteredOrders}
                                handleEditRowData={handleEditRowData}
                                FROZEN_COUNT={FROZEN_COUNT}
                                FROZEN_WIDTHS={FROZEN_WIDTHS}
                            />
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllOrders;