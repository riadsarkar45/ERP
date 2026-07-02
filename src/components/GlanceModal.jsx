import { RefreshCcw, X } from 'lucide-react';

const GlanceModal = ({ glanceReport, setGlanceReport, handleGlanceReport }) => {
    console.log(glanceReport, "glanceReport");
    console.log(glanceReport?.reportData?.map((d) => console.log(d, "comp breakdown")));

    const YARN_TABLE_HEADERS = [
        "JOB NO",
        "COLOR",
        "COMPOSITION",
        "ORDER QTY",
        "FINISH REQUIRE QTY",
        "YARN REQUIRE QTY",
        "YARN DELIVERY",
        "YARN RETURN",
        "YARN RECEIVED",
        "YARN RECEIVED PERCENTAGE",
        "YARN DELIVERY PERCENTAGE",
        "SHORT & EXCESS",
        "GREY DELIVERY FOR DYEING",
        "GREY RECEIVED FROM DYEING",
        "FINISH RECEIVED FROM DYEING",
        "GREY RECEIVED PERCENTAGE",
        "PROCESS LOSS %",
        "SHORT & EXCESS",

        "SENT FOR AOP",
        "RECEIVED FROM AOP",
        "GREY WEIGHT RECEIVED FROM AOP",
        "FINISH RECEIVED FROM AOP",
        "PROCESS LOSS",
        "SHORT & EXCESS",
    ];

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in" />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-md border border-gray-300 w-full max-w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-in shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b-2 border-gray-300 bg-gray-50">
                        <h2 className="text-xl font-semibold uppercase text-gray-800">At a Glance</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleGlanceReport()}
                                className="flex items-center justify-center mb-2 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm p-2"
                                title='Refresh'
                            >
                                <RefreshCcw size={20} />
                            </button>
                            <button
                                onClick={() => setGlanceReport({ ...glanceReport, showGlanceModal: false })}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-2 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <div className="overflow-x-auto border-2 border-gray-400 rounded-md">

                            <table className="min-w-[2200px] w-full border-collapse border border-gray-400">
                                <thead className="sticky top-0 z-20">
                                    {/* Column Headers */}
                                    <tr className="bg-gray-100 border-b-2 border-gray-400">
                                        {YARN_TABLE_HEADERS.map((header, I) => (
                                            <th
                                                key={I}
                                                className="px-4 py-3 text-center text-xs font-semibold text-gray-700 border border-gray-400 bg-gray-100 whitespace-nowrap"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {glanceReport?.reportData?.map((job, index) => {
                                        const comps = job?.rows?.map((comp) => comp) || [];
                                        const compBreakDown = job.compBreakdown || [];
                                        return (
                                            <tr key={index} className="border-b border-gray-300 hover:bg-gray-50">
                                                {/* Sticky Job No Column */}
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 border border-gray-400 bg-white  left-0 z-10 whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                                                    {job.jobNo || "-"}
                                                </td>

                                                {/* Color */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {comps?.length > 0 ? (
                                                        comps.map((com, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {com.color || "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* Composition */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {comps?.length > 0 ? (
                                                        comps.map((com, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {com.composition || "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* Order qty */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-900 whitespace-nowrap">
                                                    {comps?.length > 0 ? (
                                                        comps.map((com, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {com.orderQty || "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {comps?.length > 0 ? (
                                                        comps.map((com, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {com.finishRequiredQty || "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* yarn required qty */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {comps?.length > 0 ? (
                                                        comps.map((com, i) => {
                                                            const finishQty = Number(com.finishRequiredQty) || 0;
                                                            const processLoss = Number(job.processLoss) || 0;
                                                            // {(Number(cell.finishRequiredQty) * (1 + Number(row.processLoss) / 100) + Number(cell.additional)).toFixed(2)}
                                                            const yarnRequiredQty = (finishQty * (1 + processLoss / 100)).toFixed(2);
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    {/* {com.finishRequiredQty || "-"} */}
                                                                    {yarnRequiredQty || "-"}
                                                                </div>
                                                            )
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* yarn delivery */}
                                                {/* Yarn Delivery */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp?.knittingOrder_Yarn_Delivery ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* YARN RETURN */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp.knittingOrder_Yarn_Return ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* YARN RECEIVED */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp.knittingOrder_Yarn_Received ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* YARN RECEIVED PERCENTAGE */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => {
                                                            const finishQty = Number(comp.finishRequiredQty) || 0;
                                                            const processLoss = Number(job.processLoss) || 0;
                                                            const yarnRequiredQty = finishQty * (1 + processLoss / 100);

                                                            const yarnDelivery = Number(comp.knittingOrder_Yarn_Received) || 0;

                                                            const percentage = yarnRequiredQty > 0
                                                                ? ((yarnDelivery / yarnRequiredQty) * 100).toFixed(1)
                                                                : "0.0";

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < compBreakDown.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    {percentage}%
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* YARN DELIVERY PERCENTAGE */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {comps?.length > 0 ? (
                                                        comps.map((com, i) => {
                                                            const finishQty = Number(com.finishRequiredQty) || 0;
                                                            const processLoss = Number(job.processLoss) || 0;
                                                            const yarnRequiredQty = finishQty * (1 + processLoss / 100);

                                                            const yarnDelivery = Number(compBreakDown?.[i]?.knittingOrder_Yarn_Delivery) || 0;

                                                            const percentage = yarnRequiredQty > 0
                                                                ? ((yarnDelivery / yarnRequiredQty) * 100).toFixed(1)
                                                                : "0.0";

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    {percentage}%
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* SHORT & EXCESS */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => {
                                                            const yarnDelivery = Number(comp?.knittingOrder_Yarn_Delivery) || 0;
                                                            const yarnReceived = Number(comp?.knittingOrder_Yarn_Received) || 0;
                                                            const shortExcess = yarnDelivery - yarnReceived;
                                                            const diff = shortExcess > 0 ? shortExcess : -shortExcess;
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    <div className={`${diff ? "text-red-500 font-bold" : "text-green-500 font-bold"}`}>
                                                                        {diff ? Math.abs(diff).toFixed(2) : `(${diff.toFixed(2)})`}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>


                                                {/* GREY DELIVERY */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp?.dyeingOrder_Grey_Delivery ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* GREY RECEIVED */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp?.dyeingOrder_Grey_Received ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* SHORT & EXCESS GREY DELIVERY & RECEIVE */}

                                                {/* FINISH RECEIVED DYEING */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp?.dyeingOrder_Finish_Received ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* FINISH RECEIVED PERCENTAGE */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => {
                                                            const finishRequiredQty = Number(comp.dyeingOrder_Grey_Delivery) || 0;
                                                            const finishReceived = Number(comp.dyeingOrder_Grey_Received) || 0;

                                                            const percentage = finishRequiredQty > 0
                                                                ? ((finishReceived / finishRequiredQty) * 100).toFixed(1)
                                                                : "0.0";

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < compBreakDown.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    {percentage}%
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* PROCESS LOSS */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => {
                                                            const finishReceived = Number(comp?.dyeingOrder_Finish_Received) || 0;
                                                            const greyReceived = Number(comp?.dyeingOrder_Grey_Received) || 0;
                                                            const processLoss = greyReceived > 0 ? ((greyReceived - finishReceived) / greyReceived) * 100 : 0;
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    {processLoss.toFixed(1)}%
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => {
                                                            const yarnDelivery = Number(comp?.dyeingOrder_Grey_Delivery) || 0;
                                                            const yarnReceived = Number(comp?.dyeingOrder_Grey_Received) || 0;
                                                            const shortExcess = yarnDelivery - yarnReceived;
                                                            const diff = shortExcess > 0 ? shortExcess : -shortExcess;
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    <div className={`${diff ? "text-red-500 font-bold" : "text-green-500 font-bold"}`}>
                                                                        {diff ? Math.abs(diff).toFixed(2) : `(${diff.toFixed(2)})`}

                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* SENT FOR AOP */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp?.aopOrder_Sent_for_AOP ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* SENT FOR AOP */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp?.aopOrder_Received_from_AOP ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* GREY WEIGHT FROM AOP */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp?.aopOrder_Aop_Grey_Received ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* FINISH RECEIVED FROM AOP */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => (
                                                            <div
                                                                key={i}
                                                                className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                            >
                                                                {comp?.aopOrder_Finish_Received_From_Aop ?? "-"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>
                                                {/* AOP PROCESS LOSS */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => {
                                                            const finishReceived = Number(comp?.aopOrder_Finish_Received_From_Aop) || 0;
                                                            const greyReceived = Number(comp?.aopOrder_Aop_Grey_Received) || 0;
                                                            const processLoss = greyReceived > 0 ? ((greyReceived - finishReceived) / greyReceived) * 100 : 0;
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    {processLoss.toFixed(1)}%
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>


                                                {/* SEND RECEIVED FROM AOP SHORT & EXCESS */}
                                                <td className="px-0 py-0 text-sm text-center text-gray-700 border border-gray-400 whitespace-nowrap">
                                                    {compBreakDown?.length > 0 ? (
                                                        compBreakDown.map((comp, i) => {
                                                            const sentForAop = Number(comp?.aopOrder_Sent_for_AOP) || 0;
                                                            const receivedFromAop = Number(comp?.aopOrder_Received_from_AOP) || 0;
                                                            const shortExcess = Number(sentForAop) - Number(receivedFromAop);
                                                            const diff = shortExcess > 0 ? shortExcess : -shortExcess;
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`px-4 py-3 ${i < comps.length - 1 ? 'border-b border-gray-700' : ''}`}
                                                                >
                                                                    <div className={`${diff ? "text-red-500 font-bold" : "text-green-500 font-bold"}`}>
                                                                        {diff ? Number(Math.abs(diff)).toFixed(2) : `(${Number(diff).toFixed(2)})`}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-4 py-3">-</div>
                                                    )}
                                                </td>


                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                @keyframes slide-in {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </>
    );
};

export default GlanceModal;