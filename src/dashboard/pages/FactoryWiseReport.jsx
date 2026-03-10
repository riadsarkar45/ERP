import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useParams } from "react-router-dom";
import useAxiosPublic from "../../hooks/Axios";

const FactoryWiseReport = () => {
    const { factoryName } = useParams();
    const axiosPublic = useAxiosPublic();
    const [editRowData, setEditRowData] = useState({
        yarnDyeingColor: "",
        yarnDyeingOrder: "",
        ydPricePerKg: "",
        yarnDyedWorkOrderQty: "",
        yarnDeliveryForYD: "",
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
    });
    const [orders, setOrders] = useState([]);
    const [markRowId, setMarkRowId] = useState({});

    useEffect(() => {
        const orders = async () => {
            try {
                const res = await axiosPublic.get("/api/work-order");
                console.log(res.data);
                setOrders(res.data);
            } catch (err) {
                console.log(err);
            }
        }
        orders();
    }, [axiosPublic])

    const handleRowMark = (id) => {
        setMarkRowId((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleEditRowData = useCallback((indexId, editingText, editingField) => {
        setEditRowData(prev => ({
            ...prev,
            editingField: editingField,
            yarnDyeingColor: editingText,
            ydPricePerKg:editingText,
            yarnDyedWorkOrderQty: editingText,
            yarnDeliveryForYD: editingText,
            delShortExcess: editingText,
            yarnReturnReceived: editingText,
            greyReceivedFromYD: editingText,
            finishYarnReceived: editingText,
            processLossAfterYD: editingText,
            totalBillingAmount: editingText,
            paidBillingAmount: editingText,
            pendingBillingAmount: editingText,
            editingIndex: indexId
        }));
    }, [])

    const handleEditOnChange = (e, editingText) => {
        const { name, value } = e.target;
        console.log(name, value);
        console.log(editingText, "editing text");
        setEditRowData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    console.log(editRowData, "edit row data");

    useEffect(() => {
        console.log(editRowData.editingIndex, "index id");
    }, [editRowData.editingIndex]);


    return (
        <DashboardLayout title={`Factory Report - ${factoryName}`}>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="table-container overflow-x-auto">
                    <table className="w-full border-collapse factory-table" style={{ minWidth: '1200px' }}>
                        {/* HEADER */}
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    "YARN DYED FACTORY NAME",
                                    "JOB NO.",
                                    "YARN DYEING COLOR",
                                    "Y/D PRICE PER KG",
                                    "YARN DYED WORK ORDER (QTY)",
                                    "YARN DELIVERY FOR Y/D",
                                    "DEL. SHORT & EXCESS",
                                    "YARN RETURN RECEIVED",
                                    "GREY RECEIVED FROM Y/D",
                                    "FINISH YARN RECEIVED",
                                    "YARN RCVD SHORT & EXCESS",
                                    "PROCESS LOSS AFTER Y/D",
                                    "PAYABLE AMOUNT",
                                    "PAID BILLING AMOUNT",
                                    "PENDING BILLING AMOUNT",
                                ].map((header, i) => (
                                    <th
                                        key={i}
                                        className="px-3 py-2 text-left font-semibold text-gray-700 text-sm border-b border-gray-200 whitespace-nowrap"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {orders.map((factory, factoryIndex) =>
                                factory.workOrders.map((order, orderIndex) => {
                                    const isMarked = markRowId[order.id];
                                    return (
                                        <tr
                                            onClick={() => handleRowMark(order.id)}
                                            key={`${factoryIndex}-${orderIndex}`}
                                            className={`${isMarked ? 'bg-yellow-500 bg-opacity-30' : 'transition-colors'} `}
                                        >
                                            {/* Factory name (rowspan) */}
                                            {orderIndex === 0 && (
                                                <td
                                                    rowSpan={factory.workOrders.length}
                                                    className="px-3 py-2 align-middle font-semibold bg-primary-50 text-primary-700 text-sm border border-gray-300"
                                                >
                                                    {factory.factoryName}
                                                </td>
                                            )}

                                            {/* Job No (rowspan) */}
                                            {orderIndex === 0 && (
                                                <td
                                                    rowSpan={factory.workOrders.length}
                                                    className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                                >
                                                    {order.workOrderNo}
                                                </td>
                                            )}

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDyeingColor, "yarnDyeingColor")} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "yarnDyeingColor" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="yarnDyeingColor" value={editRowData.yarnDyeingColor} type="text" /> : order.yarnDyeingColor
                                                }


                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.ydPricePerKg, "ydPricePerKg")} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "ydPricePerKg" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="ydPricePerKg" value={editRowData.ydPricePerKg} type="text" /> : order.ydPricePerKg
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDyedWorkOrderQty, "yarnDyedWorkOrderQty")} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "yarnDyedWorkOrderQty" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="yarnDyedWorkOrderQty" value={editRowData.yarnDyedWorkOrderQty} type="text" /> : order.yarnDyedWorkOrderQty
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDeliveryForYD, "yarnDeliveryForYD")} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "yarnDeliveryForYD" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="yarnDeliveryForYD" value={editRowData.yarnDeliveryForYD} type="text" /> : order.yarnDeliveryForYD
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.delShortExcess, "delShortExcess")} className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "delShortExcess" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="delShortExcess" value={editRowData.delShortExcess} type="text" /> : order.delShortExcess
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnReturnReceived, "yarnReturnReceived")} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "yarnReturnReceived" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="yarnReturnReceived" value={editRowData.yarnReturnReceived} type="text" /> : order.yarnReturnReceived
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.greyReceivedFromYD, "greyReceivedFromYD")} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "greyReceivedFromYD" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="greyReceivedFromYD" value={editRowData.greyReceivedFromYD} type="text" /> : order.greyReceivedFromYD
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.finishYarnReceived, "finishYarnReceived")} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "finishYarnReceived" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="finishYarnReceived" value={editRowData.finishYarnReceived} type="text" /> : order.finishYarnReceived
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.processLossAfterYD, "processLossAfterYD")} className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "processLossAfterYD" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="ydPricePerKg" value={editRowData.processLossAfterYD} type="text" /> : order.processLossAfterYD
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.totalBillingAmount, "totalBillingAmount")} className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1  && editRowData.editingField === "totalBillingAmount" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="ydPricePerKg" value={editRowData.totalBillingAmount} type="text" /> : order.totalBillingAmount
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.paidBillingAmount, "paidBillingAmount")} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "paidBillingAmount" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="paidBillingAmount" value={editRowData.paidBillingAmount} type="text" /> : order.paidBillingAmount
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.pendingBillingAmount, "pendingBillingAmount")} className="px-3 py-2 text-right text-red-600 font-semibold text-sm border border-gray-300">
                                                {
                                                    editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "pendingBillingAmount" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="ydPricePerKg" value={editRowData.pendingBillingAmount} type="text" /> : order.pendingBillingAmount
                                                }
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout >
    );
};

export default FactoryWiseReport;