import { useEffect, useState } from "react";
import { PlusCircle, RefreshCcw } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import StyleReqModal from "../../../components/StyleReqModal";
import useAxiosPublic from "../../../hooks/Axios";
import { useNavigate } from "react-router-dom";

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
    "SALES CONTACT NO", "BUYER", "JOB NO", "STYLE", "PO NO", "COLOR", "COMPOSITION",
    "FINISH DIA", "ORDER QTY", "1st BOOKING", "ADDITIONAL BOOKING",
    "REQUIRED YARN QTY", "KNITTING WORK ORDER QTY",
    "SHORT & EXCESS", "YARN DELIVERY", "SHORT & EXCESS (+/-)",
    "RAW YARN DELIVERY FOR DYED", "YARN RECEIVED AFTER DYED",
    "PARTY STOCK (SHORT & EXCESS)", "TOTAL KNITTING (GREY)", "RETURN YARN RECEIVED",
    "BALANCE (+/-)", "GREY DELIVERY FOR DYEING", "GREY RETURN FROM DYEING",
    "GREY RECEIVED FROM DYEING",
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
        axiosPublic.get("/api/styles").then((res) => {
            const data = res.data.data;

            // Enhance data with composition-specific summaries
            const enhancedData = data.map((style) => {
                const rows = style.rows || [];
                const workOrders = style.workOrders || [];

                // Initialize an array of objects to hold sums for each composition row
                const compSummary = rows.map(() => ({}));

                workOrders.forEach((wo) => {
                    const type = wo.orderType || "Unknown";
                    const compositions = wo.compositions || [];

                    compositions.forEach((comp, idx) => {
                        if (idx >= compSummary.length) return; // Safety check

                        // 1. Sum Work Order Qty
                        if (typeof comp.workOrderQty === "number") {
                            const key = `${type}_workOrderQty`;
                            compSummary[idx][key] = (compSummary[idx][key] || 0) + comp.workOrderQty;
                        }

                        // 2. Sum Deliveries
                        const deliveries = comp.deliveries || [];
                        deliveries.forEach((d) => {
                            const deliveryKey = `${type}_${d.deliveryType.replace(/\s+/g, "_")}`;
                            compSummary[idx][deliveryKey] = (compSummary[idx][deliveryKey] || 0) + (d.deliveryQty || 0);
                        });
                    });
                });

                return { ...style, compSummary };
            });

            setRawData(enhancedData);
        }).catch(e => console.error(e));
    }, [axiosPublic]);

    const handleRedirect = (jobNumber) => {
        navigate(`/dashboard/new-order/${jobNumber}`)
    }

    // Helper function to keep the JSX clean for standard multi-row summary cells
    const renderCompCell = (compSummary, key) => (
        <td className="border p-0 align-top">
            <div className="divide-y divide-gray-200">
                {compSummary.map((cs, j) => (
                    <div key={j} className="px-3 py-2 whitespace-nowrap">
                        {cs[key] || "_"}
                    </div>
                ))}
            </div>
        </td>
    );

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

            <div className="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                <table className="w-full text-sm text-left rtl:text-right text-body border-collapse">
                    <thead className="text-sm text-body bg-neutral-secondary-soft border-b border-default">
                        <tr>
                            {COLUMNS.map((col, index) => (
                                <th key={index} scope="col" className="px-3 py-3 font-medium whitespace-nowrap border">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rawData?.map((row, i) => {
                            const compSummary = row.compSummary || [];

                            return (
                                <tr key={i} className="border-b hover:bg-gray-50">

                                    {/* 1. SALES CONTACT */}
                                    <td className="border px-3 py-2 whitespace-nowrap align-middle">{row.salesContact}</td>

                                    {/* 2, 3, 4, 5. BUYER, JOB NO, STYLE, PO NO */}
                                    <td className="border px-3 py-2 whitespace-nowrap align-middle text-center">{row.buyerName}</td>
                                    <td onDoubleClick={() => handleRedirect(row.jobNo)} className="border px-3 py-2 whitespace-nowrap align-middle text-center cursor-pointer hover:text-blue-600">{row.jobNo}</td>
                                    <td className="border px-3 py-2 whitespace-nowrap align-middle text-center">{row.styleNo}</td>
                                    <td className="border px-3 py-2 whitespace-nowrap align-middle text-center">{row.poNo}</td>

                                    {/* 6-9: Multi-row cells from row.rows */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.color}</div>)}
                                        </div>
                                    </td>
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.composition}</div>)}
                                        </div>
                                    </td>
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.finishDia}</div>)}
                                        </div>
                                    </td>
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.orderQty}</div>)}
                                        </div>
                                    </td>

                                    {/* 10. 1st BOOKING (Required Yarn Qty) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {(Number(cell.finishRequiredQty) + Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 11. ADDITIONAL BOOKING */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">additional</div>)}
                                        </div>
                                    </td>

                                    {/* 12. REQUIRED YARN QTY (Total) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {(Number(cell.finishRequiredQty) + Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 13. KNITTING WORK ORDER QTY (Composition-wise) */}
                                    {renderCompCell(compSummary, 'knittingOrder_workOrderQty')}

                                    {/* 14. SHORT & EXCESS (Composition-wise) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => {
                                                const finishRequiredQty = cell.finishRequiredQty || 0;
                                                const processLoss = row.processLoss || 0;
                                                const knittingWorkOrderQty = compSummary[j]?.knittingOrder_workOrderQty || 0;
                                                const diff0 = (Number(finishRequiredQty) + Number(finishRequiredQty) * Number(processLoss) / 100) - Number(knittingWorkOrderQty);
                                                const isExceeded0 = diff0 > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}`}>
                                                        {isExceeded0 ? `(${diff0.toFixed(2)})` : Math.abs(diff0).toFixed(2)}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>

                                    {/* 15. YARN DELIVERY (Composition-wise) */}
                                    {renderCompCell(compSummary, 'knittingOrder_Yarn_Delivery')}

                                    {/* 16. SHORT & EXCESS (+/-) (Composition-wise) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => {
                                                const finishQty = Number(cell.finishRequiredQty) || 0;
                                                const processLoss = Number(row.processLoss) || 0;
                                                const delivered = Number(compSummary[j]?.knittingOrder_Yarn_Delivery) || 0;

                                                const totalRequired = finishQty + finishQty * (processLoss / 100);
                                                const diff1 = totalRequired - delivered;
                                                const isExceed1 = diff1 > 0;

                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceed1 ? "text-green-500 font-bold" : "text-red-500 font-bold"}`}>
                                                        {totalRequired === 0 ? "_" : isExceed1 ? `(${diff1.toFixed(2)})` : Math.abs(diff1).toFixed(2)}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>

                                    {/* 17. RAW YARN DELIVERY FOR DYED */}
                                    {renderCompCell(compSummary, 'yarnDyeingOrder_Yarn_Delivery_For_Yarn_Dye')}

                                    {/* 18. YARN RECEIVED AFTER DYED */}
                                    {renderCompCell(compSummary, 'yarnDyeingOrder_Yarn_Received_From_Yarn_Dye')}

                                    {/* 19. PARTY STOCK */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((_, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">party stock</div>)}
                                        </div>
                                    </td>

                                    {/* 20. TOTAL KNITTING (GREY) */}
                                    {renderCompCell(compSummary, 'knittingOrder_Grey_Received')}

                                    {/* 21. RETURN YARN RECEIVED */}
                                    {renderCompCell(compSummary, 'knittingOrder_Yarn_Return')}

                                    {/* 22. BALANCE (+/-) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((_, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">balance</div>)}
                                        </div>
                                    </td>

                                    {/* 23. GREY DELIVERY FOR DYEING */}
                                    {renderCompCell(compSummary, 'dyeingOrder_Grey_Delivery')}

                                    {/* 24. GREY RETURN FROM DYEING */}
                                    {renderCompCell(compSummary, 'dyeingOrder_Grey_Return_Received')}

                                    {/* 25. GREY RECEIVED FROM DYEING */}
                                    {renderCompCell(compSummary, 'dyeingOrder_Grey_Received_From_Dyeing')}

                                    {/* 26. FINISH RECEIVED FROM DYEING */}
                                    {renderCompCell(compSummary, 'dyeingOrder_Finish_Fabric_Received')}

                                    {/* 27. GREY BALANCE (+/-) (Composition-wise) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {compSummary.map((cs, j) => {
                                                const diff = (cs.dyeingOrder_Grey_Return_Received || 0) +
                                                    (cs.dyeingOrder_Grey_Received_From_Dyeing || 0) -
                                                    (cs.dyeingOrder_Grey_Delivery || 0);
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {isExceeded ? `(${diff})` : Math.abs(diff) || "_"}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 28. PROCESS LOSS % */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((_, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {row.processLoss || 0}%
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 29. FINISH DELIVERY FROM AOP */}
                                    {renderCompCell(compSummary, 'aopOrder_Sent_for_AOP')}

                                    {/* 30. FINISH RECEIVED FROM AOP */}
                                    {renderCompCell(compSummary, 'aopOrder_Received_from_AOP')}

                                    {/* 31. AOP FAB. BALANCE (+/-) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {compSummary.map((cs, j) => {
                                                const sent = cs.aopOrder_Sent_for_AOP || 0;
                                                const received = cs.aopOrder_Received_from_AOP || 0;
                                                const diff = received - sent;
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {sent === 0 && received === 0 ? "_" : (isExceeded ? `(${diff})` : Math.abs(diff))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 32. AOP PROCESS LOSS (%) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {compSummary.map((cs, j) => {
                                                const sent = cs.aopOrder_Sent_for_AOP || 0;
                                                const received = cs.aopOrder_Received_from_AOP || 0;
                                                const loss = sent > 0 ? (((sent - received) / sent) * 100).toFixed(2) : "_";
                                                return (
                                                    <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                        {loss === "_" ? "_" : `${loss}%`}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 33. SENT FOR RE-PROCESS */}
                                    {renderCompCell(compSummary, 'reProcessOrder_Sent_for_Re_Process')}

                                    {/* 34. RETURN RCVD */}
                                    {renderCompCell(compSummary, 'reProcessOrder_Return_Received')}

                                    {/* 35. RECEIVED AFTER RE-PROCESS (GREY) */}
                                    {renderCompCell(compSummary, 'reProcessOrder_Received_After_Re_Process_Grey')}

                                    {/* 36. RECEIVED AFTER RE-PROCESS (FINISH) */}
                                    {renderCompCell(compSummary, 'reProcessOrder_Received_After_Re_Process_Finish')}

                                    {/* 37. RE-PROCESS FAB. BALANCE (+/-) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {compSummary.map((cs, j) => {
                                                const sent = cs.reProcessOrder_Sent_for_Re_Process || 0;
                                                const receivedGrey = cs.reProcessOrder_Received_After_Re_Process_Grey || 0;
                                                const receivedFinish = cs.reProcessOrder_Received_After_Re_Process_Finish || 0;
                                                const diff = (receivedGrey + receivedFinish) - sent;
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {sent === 0 && receivedGrey === 0 && receivedFinish === 0 ? "_" : (isExceeded ? `(${diff})` : Math.abs(diff))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 38. RE-PROCESS PROCESS LOSS (%) */}
                                    <td className="border p-0 align-top">
                                        <div className="divide-y divide-gray-200">
                                            {compSummary.map((cs, j) => {
                                                const sent = cs.reProcessOrder_Sent_for_Re_Process || 0;
                                                const receivedGrey = cs.reProcessOrder_Received_After_Re_Process_Grey || 0;
                                                const receivedFinish = cs.reProcessOrder_Received_After_Re_Process_Finish || 0;
                                                const loss = sent > 0 ? (((sent - (receivedGrey + receivedFinish)) / sent) * 100).toFixed(2) : "_";
                                                return (
                                                    <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                        {loss === "_" ? "_" : `${loss}%`}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}