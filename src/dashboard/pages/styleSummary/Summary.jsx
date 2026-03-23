import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import useAxiosPublic from "../../../hooks/Axios";

const Summary = () => {
    const axiosPublic = useAxiosPublic();
    const [objectKeys, setObjectKeys] = useState([])
    const [data, setData] = useState([])
    useEffect(() => {
        const styleSummary = async () => {
            const res = await axiosPublic.get("/api/style-requirement")
            const keys = Object.keys(res.data[0])
            setData(res.data)
            setObjectKeys(keys);
        }
        styleSummary();
    }, [axiosPublic])
    return (
        <DashboardLayout>
            <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="table-container overflow-x-autotable-container overflow-x-auto">
                    <table className="w-full border-collapse factory-table" style={{ minWidth: '1200px' }}>
                        {/* HEADER */}
                        <thead className="bg-gray-50">
                            <tr>
                                {objectKeys.map((header, i) => (
                                    <th
                                        key={i}
                                        className="px-3 uppercase py-2 text-left font-semibold text-gray-700 text-sm border-b border-gray-200 whitespace-nowrap"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>

                            {
                                data?.map((rep) => {
                                    let totalDelivery = 0;
                                    let totalReturn = 0
                                    let totalOrderQty = 0
                                    let totalYarnDyed = 0
                                    let totalGreyReceived = 0
                                    let totalFinishYarn = 0
                                    let totalBillingAmount = 0
                                    let totalPayableAmount = 0
                                    let totalPaidBillingAmount = 0
                                    let totalPendingBillingAmount = 0
                                    if (rep.totalPendingBillingAmount||rep.totalPendingBillingAmount||rep.totalPaidBillingAmount||rep.totalPayableAmount||rep.totalBillingAmount || rep.totalDelivery || rep.totalReturn || rep.totalOrderQty || rep.totalYarnDyed || rep.totalGreyReceived || rep.totalFinishYarn) {
                                        totalDelivery = rep.totalDelivery.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalReturn = rep.totalReturn.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalOrderQty = rep.totalOrderQty.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalYarnDyed = rep.totalYarnDyed.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalGreyReceived = rep.totalGreyReceived.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalFinishYarn = rep.totalFinishYarn.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalBillingAmount = rep.totalBillingAmount.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalPayableAmount = rep.totalPayableAmount.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalPaidBillingAmount = rep.totalPaidBillingAmount.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                        totalPendingBillingAmount = rep.totalPendingBillingAmount.split("+").reduce((sum, n) => sum + Number(n.trim()), 0);
                                    }
                                    return (
                                        <tr

                                            key={rep.styleId}
                                            className={` `}
                                        >


                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {rep.style}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {rep.styleId}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalOrderQty} */}
                                                {totalOrderQty}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalYarnDyed} */}
                                                {totalYarnDyed}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalDelivery} */}
                                                {totalDelivery}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalReturn} */}
                                                {totalReturn}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalGreyReceived} */}
                                                {totalGreyReceived}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalFinishYarn} */}
                                                {totalFinishYarn}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalBillingAmount} */}
                                                {totalBillingAmount}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalPayableAmount} */}
                                                {totalPayableAmount}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {/* {rep.totalPaidBillingAmount} */}
                                                {totalPaidBillingAmount}
                                            </td>
                                            <td
                                                className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300"
                                            >
                                                {totalPendingBillingAmount}
                                            </td>

                                        </tr>
                                    )
                                })
                            }






                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Summary;