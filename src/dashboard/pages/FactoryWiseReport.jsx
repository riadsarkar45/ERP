import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useParams } from "react-router-dom";
import useAxiosPublic from "../../hooks/Axios";

const FactoryWiseReport = () => {
    const { factoryName } = useParams();
    const axiosPublic = useAxiosPublic();
    const [orders, setOrders] = useState([]);
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
                                factory.workOrders.map((order, orderIndex) => (
                                    <tr
                                        key={`${factoryIndex}-${orderIndex}`}
                                        className="hover:bg-gray-50 transition-colors"
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

                                        <td className="px-3 py-2 text-gray-700 text-sm border border-gray-300">
                                            {order.yarnDyeingColor}
                                        </td>

                                        <td className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                            {order.ydPricePerKg}
                                        </td>

                                        <td className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                            {order.yarnDyedWorkOrderQty}
                                        </td>

                                        <td className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                            {order.yarnDeliveryForYD ?? "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">
                                            {order.delShortExcess ?? "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                            {order.yarnReturnReceived ?? "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                            {order.greyReceivedFromYD ?? "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                            {order.finishYarnReceived ?? "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right text-red-600 text-sm font-medium border border-gray-300">
                                            {order.processLossAfterYD ?? "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border border-gray-300">
                                            {order.totalBillingAmount ?? "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right text-gray-700 text-sm border border-gray-300">
                                            {order.paidBillingAmount ?? "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right text-red-600 font-semibold text-sm border border-gray-300">
                                            {order.pendingBillingAmount ?? "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout >
    );
};

export default FactoryWiseReport;