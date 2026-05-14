import { useEffect, useState } from "react";
import { PlusCircle, RefreshCcw } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import StyleReqModal from "../../../components/StyleReqModal";
import useAxiosPublic from "../../../hooks/Axios";
import { useNavigate } from "react-router-dom";
import Deliveries from "../../../components/Deliveries";

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
    "SALES CONTACT NO", "BUYER", "JOB NO", "STYLE", "PO NO", "COLOR", "COMPOSITION",
    "FINISH DIA", "ORDER QTY", "1st BOOKING", "ADDITIONAL BOOKING",
    "REQUIRED YARN QTY", "KNITTING WORK ORDER QTY",
    "SHORT & EXCESS", "YARN DELIVERY", "SHORT & EXCESS (+/-)",
    "RAW YARN DELIVERY FOR DYED", "YARN RECEIVED AFTER DYED",
    "PARTY STOCK (SHORT & EXCESS)", "TOTAL KNITTING (GREY)", "RETURN YARN RECEIVED",
    "BALANCE (+/-)", "GREY DELIVERY FOR DYEING", "GREY RETURN FROM DYEING",
    "GREY RECEIVED FROM DYEING", "FINISH RECEIVED FROM DYEING",
    "FINISH RECEIVED FROM DYEING", "GREY BALANCE (+/-)", "PROCESS LOSS %",
    "FINISH DELIVERY FROM AOP", "FINISH RECEIVED FROM AOP", "AOP FAB. BALANCE (+/-)",
    "AOP PROCESS LOSS (%)", "SENT FOR RE-PROCESS", "RETURN RCVD",
    "RECEIVED AFTER RE-PROCESS (GREY)", "RECEIVED AFTER RE-PROCESS (FINISH)",
    "RE-PROCESS FAB. BALANCE (+/-)", "RE-PROCESS PROCESS LOSS (%)",
];



// ── Summary Page ──────────────────────────────────────────────────────────────
export default function Summary() {
    const axiosPublic = useAxiosPublic();
    const [rawData, setRawData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        axiosPublic.get("/api/styles").then((res) => { setRawData(res.data.data), console.log(res.data.data) });

    }, [axiosPublic]);


    const handleRedirect = (jobNumber) => {
        navigate(`/dashboard/new-order/${jobNumber}`)
    }


    return (
        <DashboardLayout>
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <PlusCircle size={18} />
                </button>
                <button
                    // onClick={clearAll}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <RefreshCcw size={18} />
                </button>
            </div>

            {showModal && <StyleReqModal setRawData={setRawData} setShowModal={setShowModal} />}


            <div>
                <Deliveries />
            </div>


            <div className="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                <table className="w-full text-sm text-left rtl:text-right text-body">
                    <thead className="text-sm text-body bg-neutral-secondary-soft border-b rounded-base border-default">
                        <tr>
                            {
                                COLUMNS.map((col, index) => {
                                    return (
                                        <th key={index} scope="col" className="px-6 py-3 font-medium whitespace-nowrap">
                                            {col}
                                        </th>
                                    )
                                })
                            }
                        </tr>
                    </thead>
                    <tbody>
                        {rawData?.map((row, i) => (
                            <tr key={i} className="border">

                                <td className="border" >{row.salesContact}</td>
                                <td className="border" >{row.buyerName}</td>
                                <td onDoubleClick={() => handleRedirect(row.jobNo)} className="border" >{row.jobNo}</td>
                                <td className="border" >{row.styleNo}</td>
                                <td className="border" >{row.poNo}</td>

                                <td>
                                    <div className="space-y-1">
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className="py-1">
                                                {cell.color}
                                            </div>
                                        ))}
                                    </div>
                                </td>

                                <td>
                                    <div className="space-y-1">
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className=" py-1">
                                                {cell.composition}
                                            </div>
                                        ))}
                                    </div>
                                </td>

                                <td>
                                    <div className="space-y-1">
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className=" py-1">
                                                {cell.finishDia}
                                            </div>
                                        ))}
                                    </div>
                                </td>

                                <td>
                                    <div className="space-y-1">
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className=" py-1">
                                                {cell.orderQty}
                                            </div>
                                        ))}
                                    </div>
                                </td>

                                <td>
                                    <div className="space-y-1">
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className=" py-1">
                                                {(
                                                    Number(cell.finishRequiredQty) +
                                                    Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100)
                                                ).toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className=" py-1">
                                                additional
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        {/* // TOTAL REQUIRED QTY  */}
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className=" py-1">
                                                {(
                                                    Number(cell.finishRequiredQty) +
                                                    Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100)
                                                ).toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {row.summary.knittingOrder_workOrderQty}
                                        </div>

                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className=" py-1">
                                                {(
                                                    Number(cell.finishRequiredQty) +
                                                    Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100) - Number(row.summary.knittingOrder_workOrderQty)
                                                ).toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {row.summary.knittingOrder_Yarn_Delivery}
                                        </div>

                                    </div>
                                </td>

                                <td>
                                    <div className="space-y-1">
                                        {/* // TOTAL REQUIRED QTY  */}
                                        {row.rows.map((cell, j) => (
                                            <div key={j} className=" py-1">
                                                {(
                                                    Number(cell.finishRequiredQty) +
                                                    Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100) - Number(row.summary.knittingOrder_Yarn_Delivery)
                                                ).toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {/* {row.summary.knittingOrder_Yarn_Delivery} */}
                                            raw yarn delivery for dyed
                                        </div>

                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {/* {row.summary.knittingOrder_Yarn_Delivery} */}
                                            raw yarn received after dyed
                                        </div>

                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {/* {row.summary.knittingOrder_Yarn_Delivery} */}
                                            party stock (short & excess)
                                        </div>

                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {/* {row.summary.knittingOrder_Yarn_Delivery} */}
                                            total knitting (grey)
                                        </div>

                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {row.summary.knittingOrder_Yarn_Return}
                                        </div>

                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {/* {row.summary.knittingOrder_Yarn_Delivery} */}
                                            balance (+/-)
                                        </div>

                                    </div>
                                </td>
                                <td>
                                    <div className="space-y-1">
                                        <div className=" py-1">
                                            {row.summary.knittingOrder_Yarn_Delivery}
                                        </div>

                                    </div>
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </DashboardLayout>
    );
}