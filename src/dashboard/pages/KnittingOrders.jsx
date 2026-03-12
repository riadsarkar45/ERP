import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useParams } from "react-router-dom";
import useAxiosPublic from "../../hooks/Axios";
import Input from "../../components/Input";
import { Search } from "lucide-react";

const KnittingOrders = () => {
    const { factoryName } = useParams();
    const axiosPublic = useAxiosPublic();
    const [editRowData, setEditRowData] = useState({
        bookingColor: "",
        yarnDyeingOrder: "",
        ydPricePerKg: 0,
        buyer: "",
        yarnDyedWorkOrderQty: 0,
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
    const [orderId, setOrderId] = useState(0)
    const [isEditing, setIsEditing] = useState(false)
    const [orders, setOrders] = useState([]);
    const [markRowId, setMarkRowId] = useState({});
    const [changedField, setChangedField] = useState({})

    useEffect(() => {
        const orders = async () => {
            try {
                const res = await axiosPublic.get(`/api/work-order/${"Knitting Order"}`, {
                    params: {
                        orderType: "AOP Order"
                    }
                });
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

    const handleEditRowData = useCallback((indexId, editingText, editingField, orderId) => {
        setEditRowData(prev => ({
            ...prev,
            editingField: editingField,
            editingIndex: indexId,
            [editingField]: editingText
        }));
        setOrderId(orderId)
    }, [])

    const handleEditOnChange = (e) => {
        const { name, value } = e.target;
        setEditRowData(prev => ({
            ...prev,
            [name]: value
        }))
        setIsEditing(true)
        setChangedField(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async () => {
        console.log(orderId);
        const update = await axiosPublic.patch(`/api/update-order/${orderId}`, changedField)
        console.log(update);
        if (update.status === 200) {
            const res = await axiosPublic.get("/api/work-order");
            setOrders(res.data);
            setChangedField({});
            setEditRowData(prev => ({ ...prev, editingIndex: null, editingField: null }));
            setIsEditing(false)
        }
    }
    console.log(changedField);
    useEffect(() => {
        console.log(editRowData.editingIndex, "index id");
    }, [editRowData.editingIndex]);


    return (
        <DashboardLayout title={`Factory Report - ${factoryName}`}>
            <div className={`${isEditing ? 'flex justify-between' : 'flex'} items-center mb-5 bg-white p-2 rounded-sm`}>
                <div className="bg-white mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label=""
                            name="buyer"
                            type="text"
                            placeholder="Search by Buyer"
                        />
                        <Input
                            label=""
                            name="jobNo"
                            type="text"
                            placeholder="Search by Job No"
                        />
                        <Input
                            label=""
                            name="style"
                            type="text"
                            placeholder="Search by Style"
                        />
                        <button
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600 mt-auto"
                        >
                            <Search size={18} />
                            Search
                        </button>
                    </div>
                </div>
                <div>
                    {
                        isEditing && <button onClick={() => handleSubmit()} className="border p-2 bg-green-500 border-bg-green-500 bg-opacity-30 text-green-600">Save Changes</button>
                    }
                </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

                <div className="table-container overflow-x-auto">

                    <table className="w-full border-collapse factory-table" style={{ minWidth: '1200px' }}>
                        {/* HEADER */}
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    "YARN DYED FACTORY NAME",
                                    "JOB NO.",
                                    "BUYER NAME",
                                    "BOOKING COLOR",
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
                                    return factory.factories.map((fact, index) => {
                                        const isMarked = markRowId[order.id];
                                        return (
                                            <tr
                                                onClick={() => handleRowMark(order.id)}
                                                key={`${factoryIndex}-${orderIndex}-${index}`}
                                                className={`${isMarked ? 'bg-yellow-500 bg-opacity-30' : 'transition-colors'} `}
                                            >
                                                {/* Factory name (rowspan) */}
                                                {orderIndex === 0 && (
                                                    <td
                                                        rowSpan={factory.workOrders.length}
                                                        className="px-3 py-2 align-middle font-semibold bg-primary-50 text-primary-700 text-sm border border-gray-300"
                                                    >
                                                        {fact.factoryName}
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

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, factory.buyer, "buyer", order.id)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        order.id === orderId && editRowData.editingField === "buyer" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="buyer" value={editRowData.buyer} type="text" /> : factory.buyer
                                                    }

                                                </td>
                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.bookingColor, "bookingColor", order.id)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        order.id === orderId && editRowData.editingField === "bookingColor" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="bookingColor" value={editRowData.bookingColor} type="text" /> : order.bookingColor
                                                    }

                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.ydPricePerKg, "ydPricePerKg", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "ydPricePerKg" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="ydPricePerKg" value={editRowData.ydPricePerKg} type="text" /> : order.ydPricePerKg
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDyedWorkOrderQty, "yarnDyedWorkOrderQty", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "yarnDyedWorkOrderQty" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="yarnDyedWorkOrderQty" value={editRowData.yarnDyedWorkOrderQty} type="text" /> : order.yarnDyedWorkOrderQty
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDeliveryForYD, "yarnDeliveryForYD", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "yarnDeliveryForYD" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="yarnDeliveryForYD" value={editRowData.yarnDeliveryForYD} type="text" /> : order.yarnDeliveryForYD
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.delShortExcess, "delShortExcess", order.id)} className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "delShortExcess" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="delShortExcess" value={editRowData.delShortExcess} type="text" /> : order.delShortExcess
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnReturnReceived, "yarnReturnReceived", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "yarnReturnReceived" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="yarnReturnReceived" value={editRowData.yarnReturnReceived} type="text" /> : order.yarnReturnReceived
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.greyReceivedFromYD, "greyReceivedFromYD", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "greyReceivedFromYD" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="greyReceivedFromYD" value={editRowData.greyReceivedFromYD} type="text" /> : order.greyReceivedFromYD
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.finishYarnReceived, "finishYarnReceived", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "finishYarnReceived" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="finishYarnReceived" value={editRowData.finishYarnReceived} type="text" /> : order.finishYarnReceived
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.processLossAfterYD, "processLossAfterYD", order.id)} className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "processLossAfterYD" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="ydPricePerKg" value={editRowData.processLossAfterYD} type="text" /> : order.processLossAfterYD
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.totalBillingAmount, "totalBillingAmount", order.id)} className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "totalBillingAmount" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="ydPricePerKg" value={editRowData.totalBillingAmount} type="text" /> : order.totalBillingAmount
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.paidBillingAmount, "paidBillingAmount", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "paidBillingAmount" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="paidBillingAmount" value={editRowData.paidBillingAmount} type="text" /> : order.paidBillingAmount
                                                    }
                                                </td>

                                                <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.pendingBillingAmount, "pendingBillingAmount", order.id)} className="px-3 py-2 text-right text-red-600 font-semibold text-sm border border-gray-300">
                                                    {
                                                        editRowData.editingIndex === orderIndex + 1 && editRowData.editingField === "pendingBillingAmount" ? <input onChange={handleEditOnChange} className="border border-red-600 outline-none p-1 rounded-md" name="ydPricePerKg" value={editRowData.pendingBillingAmount} type="text" /> : order.pendingBillingAmount
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    })
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout >
    );
};

export default KnittingOrders;