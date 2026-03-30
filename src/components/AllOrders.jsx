import { useCallback, useEffect, useState, useMemo } from "react";
import { Printer } from "lucide-react";
import useAxiosPublic from "../hooks/Axios";
import Input from "./Input";
import Modal from "./Modal";

const COLUMNS = [
    { header: "YARN DYED FACTORY NAME", width: "18mm" },
    { header: "JOB NO.", width: "10mm" },
    { header: "BUYER NAME", width: "14mm" },
    { header: "PO NO", width: "12mm" },
    { header: "COMPOSITION", width: "12mm" },
    { header: "STYLE", width: "12mm" },
    { header: "MONTH", width: "10mm" },
    { header: "BOOKING COLOR", width: "14mm" },
    { header: "ORDER QTY", width: "10mm" },
    { header: "Y/D PRICE PER KG", width: "11mm" },
    { header: "YARN DYED WORK ORDER QTY", width: "13mm" },
    { header: "YARN DELIVERY FOR Y/D", width: "13mm" },
    { header: "DEL. SHORT & EXCESS", width: "12mm" },
    { header: "YARN RETURN RECEIVED", width: "13mm" },
    { header: "GREY RECEIVED FROM Y/D", width: "13mm" },
    { header: "FINISH YARN RECEIVED", width: "12mm" },
    { header: "YARN RCVD SHORT & EXCESS", width: "13mm" },
    { header: "PROCESS LOSS AFTER Y/D", width: "13mm" },
    { header: "PAYABLE AMOUNT", width: "12mm" },
    { header: "PAID BILLING AMOUNT", width: "12mm" },
    { header: "PENDING BILLING AMOUNT", width: "12mm" },
    { header: "FROM FACTORY", width: "10mm" },
    { header: "TO FACTORY", width: "10mm" },
];

const AllOrders = ({ orderType }) => {
    const axiosPublic = useAxiosPublic();
    const [editRowData, setEditRowData] = useState({
        bookingColor: "",
        yarnDyeingOrder: "",
        ydPricePerKg: 0,
        buyer: "",
        poNo: "",
        style: "",
        month: "",
        orderQty: "",
        date: "",
        yarnDyedWorkOrderQty: 0,
        yarnCount: "",
        yarnDeliveryForYD: "",
        lotNo: "",
        delShortExcess: "",
        yarnReturnReceived: "",
        greyReceivedFromYD: "",
        finishYarnReceived: "",
        processLossAfterYD: "",
        totalBillingAmount: "",
        paidBillingAmount: "",
        pendingBillingAmount: "",
        editingIndex: null,
        editingField: "",
        challanNo: 0,
    });
    const [orderId, setOrderId] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [changedField, setChangedField] = useState({});
    const [styleNo, setStyleNo] = useState("");
    const [search, setSearch] = useState({
        buyerName: "",
        jobNo: "",
        styleName: "",
        poNo: "",
    });

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await axiosPublic.get(`/api/work-order/${orderType}`);
                setOrders(res.data);
            } catch (err) {
                console.log(err);
            }
        };
        fetchOrders();
    }, [axiosPublic, orderType]);

    const filteredOrders = useMemo(() => {
        const { buyerName, jobNo, styleName, poNo } = search;
        const hasQuery = buyerName || jobNo || styleName || poNo;
        if (!hasQuery) return orders;

        return orders
            .map(factory => {
                const matchingJobs = (factory.jobs || []).filter(job => {
                    const buyerMatch = (job.buyer || "").toLowerCase().includes(buyerName.toLowerCase());
                    const jobMatch = (job.jobNo || "").toLowerCase().includes(jobNo.toLowerCase());
                    const styleMatch = (job.style || "").toLowerCase().includes(styleName.toLowerCase());
                    const poMatch = (job.poNo || "").toLowerCase().includes(poNo.toLowerCase());
                    return buyerMatch && jobMatch && styleMatch && poMatch;
                });

                if (matchingJobs.length === 0) return null;

                const matchingWorkOrders = (factory.workOrders || []).filter(order =>
                    matchingJobs.some(j => j.jobNo === order.workOrderNo)
                );

                return { ...factory, jobs: matchingJobs, workOrders: matchingWorkOrders };
            })
            .filter(Boolean);
    }, [search, orders]);

    const handleEditRowData = useCallback((indexId, editingText, editingField, orderId, styleNo) => {
        setEditRowData(prev => ({
            ...prev,
            editingField,
            editingIndex: indexId,
            [editingField]: editingText,
        }));
        setStyleNo(styleNo);
        setOrderId(orderId);
        setIsEditing(true);
    }, []);

    const handleEditOnChange = (e) => {
        const { name, value } = e.target;
        setEditRowData(prev => ({ ...prev, [name]: value }));
        setIsEditing(true);
        setChangedField(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        const update = await axiosPublic.patch(
            `/api/update-order/${orderId}/${styleNo}`,
            changedField
        );
        if (update.status === 200) {
            const res = await axiosPublic.get(`/api/work-order/${orderType}`);
            setOrders(res.data);
            setChangedField({});
            setEditRowData(prev => ({ ...prev, editingIndex: null, editingField: null }));
            setIsEditing(false);
        }
    };

    const handleSearch = (e) => {
        const { name, value } = e.target;
        setSearch(prev => ({ ...prev, [name]: value }));
    };

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 8mm;
                    }

                    body * { visibility: hidden; }

                    .printable-table-area,
                    .printable-table-area * { visibility: visible; }

                    .printable-table-area {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        overflow: visible !important;
                    }

                    /* ✅ Remove screen min-width, use explicit col widths instead of fixed layout */
                    .factory-table {
                        width: 100% !important;
                        min-width: unset !important;
                        table-layout: auto !important;
                        border-collapse: collapse;
                    }

                    /* ✅ Apply explicit widths from <col> elements */
                    .factory-table col {
                        width: auto;
                    }

                    .factory-table th {
                        font-size: 6px !important;
                        padding: 2px 2px !important;
                        white-space: normal !important;
                        word-break: break-word !important;
                        text-align: center !important;
                        vertical-align: bottom !important;
                        border: 0.5px solid #999 !important;
                        background-color: #f3f4f6 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        line-height: 1.1 !important;
                    }

                    .factory-table td {
                        font-size: 6.5px !important;
                        padding: 2px 2px !important;
                        white-space: normal !important;
                        word-break: break-word !important;
                        border: 0.5px solid #999 !important;
                        line-height: 1.2 !important;
                    }

                    /* ✅ Repeat header on every page */
                    .factory-table thead {
                        display: table-header-group;
                    }

                    .factory-table tbody {
                        display: table-row-group;
                    }
                }
            `}</style>

            <div>
                <div className="mb-5 bg-white p-2 rounded-sm">
                    {(!orders || orders.length < 1) && (
                        <div>No order found</div>
                    )}
                    <div className="flex items-end gap-4 flex-wrap">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                            <Input
                                label=""
                                name="buyerName"
                                type="text"
                                value={search.buyerName}
                                onChange={handleSearch}
                                placeholder="Search by Buyer"
                            />
                            <Input
                                label=""
                                name="jobNo"
                                type="text"
                                value={search.jobNo}
                                onChange={handleSearch}
                                placeholder="Search by Job No"
                            />
                            <Input
                                label=""
                                name="styleName"
                                type="text"
                                value={search.styleName}
                                onChange={handleSearch}
                                placeholder="Search by Style"
                            />
                            <Input
                                label=""
                                name="poNo"
                                type="text"
                                value={search.poNo}
                                onChange={handleSearch}
                                placeholder="Search by PO No"
                            />
                        </div>

                        <button
                            onClick={() => window.print()}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-700 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-200 shrink-0"
                        >
                            <Printer size={18} />
                            Print
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="table-container printable-table-area overflow-x-auto">
                        {isEditing && (
                            <Modal
                                setIsEditing={setIsEditing}
                                handleSubmit={handleSubmit}
                                handleEditOnChange={handleEditOnChange}
                                setEditRowData={setEditRowData}
                                editRowData={editRowData}
                                orderId={orderId}
                                orders={orders}
                            />
                        )}
                        <table className="w-full border-collapse factory-table" style={{ minWidth: '1200px' }}>

                            <colgroup>
                                {COLUMNS.map((col, i) => (
                                    <col key={i} style={{ width: col.width }} />
                                ))}
                            </colgroup>

                            <thead className="bg-gray-50">
                                <tr>
                                    {COLUMNS.map((col, i) => (
                                        <th
                                            key={i}
                                            className="px-3 py-2 text-left font-semibold text-gray-700 text-sm border-b border-gray-200 whitespace-nowrap"
                                        >
                                            {col.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {filteredOrders?.map((factory, factoryIndex) => {
                                    return factory.workOrders.map((order, orderIndex) => {
                                        let sum = 0;
                                        if (order.finishYarnReceived) {
                                            sum = order.finishYarnReceived
                                                .split("+")
                                                .reduce((acc, n) => acc + Number(n.trim()), 0);
                                        }
                                        const job = factory.jobs.find(j => j.jobNo === order.workOrderNo);
                                        return (
                                            <tr className={`${job.status === "cancel" && "bg-red-500 bg-opacity-30 "}`} key={`${factoryIndex}-${order.workOrderNo}`}>
                                                {orderIndex === 0 && (
                                                    <td
                                                        rowSpan={factory.workOrders.length}
                                                        className="px-3 py-2 align-middle font-semibold bg-primary-50 text-primary-700 text-sm border border-gray-300"
                                                    >
                                                        {factory.factoryName}
                                                    </td>
                                                )}
                                                <td className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300">{order.workOrderNo}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, job.buyer, "buyer", job.id, job.style)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">{job.buyer}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, job.poNo, "poNo", job.id, job.style)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">{job.poNo}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.composition, "composition", order.id, job.style)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">{order.composition}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, job.style, "style", job.id, job.style)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">{job.style}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, job.month, "month", job.id, job.style)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">{job.month}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.bookingColor, "bookingColor", order.id, job.style)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">{order.bookingColor}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.orderQty, "orderQty", order.id, job.style)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">{order.orderQty}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.ydPricePerKg, "ydPricePerKg", order.id, job.style)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">{order.ydPricePerKg}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDyedWorkOrderQty, "yarnDyedWorkOrderQty", order.id, job.style)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">{order.yarnDyedWorkOrderQty}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDeliveryForYD, "yarnDeliveryForYD", order.id, job.style)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">{order.yarnDeliveryForYD}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.delShortExcess, "delShortExcess", order.id, job.style)} className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">{order.delShortExcess}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnReturnReceived, "yarnReturnReceived", order.id, job.style)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">{order.yarnReturnReceived}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.greyReceivedFromYD, "greyReceivedFromYD", order.id, job.style)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">{order.greyReceivedFromYD}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.finishYarnReceived, "finishYarnReceived", order.id, job.style)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">{sum}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.totalBillingAmount, "totalBillingAmount", order.id, job.style)} className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border border-gray-300">{order.totalBillingAmount}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.processLossAfterYD, "processLossAfterYD", order.id, job.style)} className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">{order.processLossAfterYD}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.payableAmount, "payableAmount", order.id, job.style)} className="px-3 py-2 text-right text-red-600 font-semibold text-sm border border-gray-300">{order.payableAmount}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.paidBillingAmount, "paidBillingAmount", order.id, job.style)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">{order.paidBillingAmount}</td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.pendingBillingAmount, "pendingBillingAmount", order.id, job.style)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">{order.pendingBillingAmount}</td>
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AllOrders;