import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import useAxiosPublic from "../hooks/Axios";
import Input from "./Input";
import Modal from "./Modal";

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
        challanNo: 0,
    });
    const [orderId, setOrderId] = useState(0)
    const [isEditing, setIsEditing] = useState(false)
    const [orders, setOrders] = useState([]);
    const [changedField, setChangedField] = useState({})

    useEffect(() => {
        const orders = async () => {
            try {
                const res = await axiosPublic.get(`/api/work-order/${orderType}`);
                console.log(res.data);
                setOrders(res.data);
            } catch (err) {
                console.log(err);
            }
        }
        orders();
    }, [axiosPublic, orderType])


    const handleEditRowData = useCallback((indexId, editingText, editingField, orderId) => {
        setEditRowData(prev => ({
            ...prev,
            editingField: editingField,
            editingIndex: indexId,
            [editingField]: editingText
        }));
        setOrderId(orderId)
        setIsEditing(true)
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
            const res = await axiosPublic.get(`/api/work-order/${orderType}`);
            setOrders(res.data);
            setChangedField({});
            setEditRowData(prev => ({ ...prev, editingIndex: null, editingField: null }));
            setIsEditing(false)
        }
    }
    console.log(changedField);
    useEffect(() => {
        console.log(editRowData.editingIndex, "index id");
        console.log(changedField, "changed field");
        console.log(editRowData.editingField, "edit row data");
    }, [editRowData.editingIndex, changedField, editRowData]);


    return (
        <div>
            <div className={`${isEditing ? 'flex justify-between' : 'flex'} items-center mb-5 bg-white p-2 rounded-sm`}>
                <div className="bg-white mb-6">
                    {(!orders || orders.length < 1) && (
                        <div className="rotate-45">No order found</div>
                    )}
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

            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

                <div className="table-container overflow-x-auto">
                    {isEditing && <Modal
                        setIsEditing={setIsEditing}
                        handleSubmit={handleSubmit}
                        handleEditOnChange={handleEditOnChange}
                        setEditRowData={setEditRowData}
                        editRowData={editRowData}
                        orderId={orderId}
                        orders={orders}
                    />}
                    <table className="w-full border-collapse factory-table" style={{ minWidth: '1200px' }}>
                        {/* HEADER */}
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    "YARN DYED FACTORY NAME",
                                    "JOB NO.",
                                    "BUYER NAME",
                                    "PO NO",
                                    "STYLE",
                                    "MONTH",
                                    "BOOKING COLOR",
                                    "ORDER QTY",
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
                                    "FROM FACTORY",
                                    "TO FACTORY",
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
                            {orders?.map((factory, factoryIndex) => {
                                return factory.workOrders.map((order, orderIndex) => {
                                    let sum = 0;
                                    if (order.finishYarnReceived) {
                                        sum = order.finishYarnReceived.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                    }
                                    const job = factory.jobs.find(j => j.jobNo === order.workOrderNo);
                                    return (
                                        <tr
                                            //onClick={() => handleRowMark(order.id)}
                                            key={`${factoryIndex} ${order.workOrderNo}`}
                                        // className={`${isMarked ? 'bg-yellow-500 bg-opacity-30' : 'transition-colors'} `}
                                        >
                                            {orderIndex === 0 && (
                                                <td
                                                    rowSpan={factory.workOrders.length}
                                                    className="px-3 py-2 align-middle font-semibold bg-primary-50 text-primary-700 text-sm border border-gray-300"
                                                >
                                                    {factory.factoryName}
                                                </td>
                                            )}

                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {order.workOrderNo}
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, job.buyer, "buyer", job.id)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                {
                                                    job.buyer
                                                }

                                            </td>
                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, job.poNo, "poNo", job.id)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                {
                                                    job.poNo
                                                }

                                            </td>
                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, job.style, "style", job.id)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                {
                                                    job.style
                                                }

                                            </td>
                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, job.month, "month", job.id)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                {
                                                    job.month
                                                }

                                            </td>
                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.bookingColor, "bookingColor", order.id)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                {
                                                    order.bookingColor
                                                }

                                            </td>
                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.orderQty, "orderQty", order.id)} className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                                {
                                                    order.orderQty
                                                }

                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.ydPricePerKg, "ydPricePerKg", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    order.ydPricePerKg
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDyedWorkOrderQty, "yarnDyedWorkOrderQty", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    order.yarnDyedWorkOrderQty
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnDeliveryForYD, "yarnDeliveryForYD", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    order.yarnDeliveryForYD
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.delShortExcess, "delShortExcess", order.id)} className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">
                                                {
                                                    order.delShortExcess
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.yarnReturnReceived, "yarnReturnReceived", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    order.yarnReturnReceived
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.greyReceivedFromYD, "greyReceivedFromYD", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    order.greyReceivedFromYD
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.finishYarnReceived, "finishYarnReceived", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    sum  // order.finishYarnReceived 
                                                }
                                            </td>



                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.totalBillingAmount, "totalBillingAmount", order.id)} className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border border-gray-300">
                                                {
                                                    order.totalBillingAmount
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.processLossAfterYD, "processLossAfterYD", order.id)} className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">
                                                {
                                                    order.processLossAfterYD
                                                }
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.payableAmount, "payableAmount", order.id)} className="px-3 py-2 text-right text-red-600 font-semibold text-sm border border-gray-300">
                                                {
                                                    order.payableAmount
                                                }
                                                d
                                            </td>

                                            <td onDoubleClick={() => handleEditRowData(orderIndex + 1, order.paidBillingAmount, "paidBillingAmount", order.id)} className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                                {
                                                    order.paidBillingAmount
                                                }
                                            </td>


                                        </tr>
                                    )
                                })

                            }

                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllOrders;