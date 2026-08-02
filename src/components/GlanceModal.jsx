import { useState } from 'react';
import { RefreshCcw, X, WrapText, AlignJustify } from 'lucide-react';

const GlanceModal = ({ glanceReport, setGlanceReport, handleGlanceReport }) => {
    // Wrap / Unwrap toggle state
    const [isWrapped, setIsWrapped] = useState(false);

    // When wrapped, we force every column to the SAME narrow width (via
    // table-layout: fixed) so short 2-word headers/cells are also forced
    // to break onto multiple lines instead of just sitting on one line
    // with room to spare.
    const WRAPPED_COL_WIDTH = 110; // px, tweak to taste

    const wrapClass = isWrapped
        ? "whitespace-normal break-words"
        : "whitespace-nowrap";

    const YARN_TABLE_HEADERS = [
        "JOB NO",
        "COLOR",
        "COMPOSITION",
        "ORDER QTY",
        "MANUFACTURING UNITE",
        "FINISH REQUIRE QTY",
        "YARN REQUIRE QTY",
        "YARN DELIVERY",
        "YARN RETURN",
        "GREY RECEIVED",
        "SHORT & EXCESS",
        "GREY DELIVERY FOR DYEING",
        "GREY RET. RCVD FROM DYEING",
        "GREY RECEIVED FROM DYEING",
        "FINISH RECEIVED FROM DYEING",
        "PROCESS LOSS %",
        "SHORT & EXCESS",
        "SENT FOR AOP",
        "RETURN RECEIVED FROM AOP",
        "GREY WEIGHT RECEIVED FROM AOP",
        "FINISH RECEIVED FROM AOP",
        "PROCESS LOSS",
        "SHORT & EXCESS",
        "FABRIC ISSUE CUTTING DEPT.",
        "FABRIC ISSUED SHORT EXCESS",
        "REMARKS",
        "CAD CONSUMPTION",
        "PLANNED CUTTING QTY",
        "ACTUAL CUTTING QTY",
        "SHORT & EXCESS CUTTING",
        "SHORT/EXCESS %",
        "REMARKS",
        "CUTTING TO SEWING INPUT BALANCE",
        "PHYSICAL FOUND",
        "EXCESS QTY",
        "SWING INPUT QTY",
        "INPUT SHORT/EXCESS",
        "REMARKS",
        "OUTPUT QTY",
        "OUTPUT SHORT/EXCESS",
        "REMARKS",
        "FINISH INPUT QTY",
        "FINISH OUTPUT QTY",
        "SHORT EXCESS",
        "REMARKS",
        "PACKING INPUT QTY",
        "PACKING OUTPUT QTY",
        "SHIPPED QTY",
        "EXCESS SHORT",
        "PLANNED LEFTOVER",
        "PHYSICAL FOUND LEFTOVER",
        "%PHYSICAL FOUND LEFTOVER",
        "LEFT OVER SHORT EXCESS",
        "REMARKS",
    ];

    // Reusable cell class (real <td>, no inner divs => no drift between columns)
    const cellClass = `px-4 py-3 text-sm text-center text-gray-700 border border-gray-400 align-top ${wrapClass}`;
    const cellStyle = isWrapped
        ? { width: WRAPPED_COL_WIDTH, maxWidth: WRAPPED_COL_WIDTH, wordBreak: "break-word" }
        : undefined;

    // Small helper so we don't repeat the Math.abs/formatting pattern everywhere
    const ShortExcess = ({ value }) => {
        const diff = Math.abs(value || 0);
        return (
            <div className={`${diff ? "text-red-500 font-bold" : "text-green-500 font-bold"}`}>
                {diff ? diff.toFixed(2) : `(${diff.toFixed(2)})`}
            </div>
        );
    };

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
                            {/* Wrap / Unwrap toggle button */}
                            <button
                                onClick={() => setIsWrapped((prev) => !prev)}
                                className="flex items-center justify-center gap-1.5 mb-2 h-9 px-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm text-xs font-medium text-gray-700"
                                title={isWrapped ? "Switch to Unwrap" : "Switch to Wrap"}
                            >
                                {isWrapped ? <AlignJustify size={16} /> : <WrapText size={16} />}
                                {isWrapped ? "Unwrap" : "Wrap"}
                            </button>
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

                            <table
                                className={`${isWrapped ? "w-full" : "min-w-[2200px] w-full"} border-collapse border border-gray-400`}
                                style={{ tableLayout: isWrapped ? "fixed" : "auto" }}
                            >
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-gray-100 border-b-2 border-gray-400">
                                        {YARN_TABLE_HEADERS.map((header, I) => (
                                            <th
                                                key={I}
                                                className={`px-4 py-3 text-center text-xs font-semibold text-gray-700 border border-gray-400 bg-gray-100 ${wrapClass}`}
                                                style={cellStyle}
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {glanceReport?.reportData?.map((job, jobIndex) => {
                                        const comps = job?.rows || [];
                                        const compBreakDown = job.compBreakdown || [];
                                        // Real number of sub-rows this job needs. At least 1 so the job
                                        // always renders even with no component data.
                                        const subRowCount = Math.max(comps.length, compBreakDown.length, 1);

                                        return Array.from({ length: subRowCount }).map((_, i) => {
                                            const com = comps[i];
                                            const comp = compBreakDown[i];

                                            const finishQty = Number(com?.finishRequiredQty) || 0;
                                            const processLoss = Number(job.processLoss) || 0;
                                            const yarnRequiredQty = finishQty * (1 + processLoss / 100);

                                            const knitYarnDelivery = Number(comp?.knittingOrder_Yarn_Delivery) || 0;
                                            const knitGreyReceived = Number(comp?.knittingOrder_Grey_Received) || 0;
                                            const knitYarnReturn = Number(comp?.knittingOrder_Yarn_Return) || 0;
                                            const knitShortExcess = (knitGreyReceived + knitYarnReturn) - knitYarnDelivery;

                                            const dyeFinishReceived = Number(comp?.dyeingOrder_Finish_Received) || 0;
                                            const dyeGreyReceived = Number(comp?.dyeingOrder_Grey_Received) || 0;
                                            const dyeProcessLoss = dyeGreyReceived > 0
                                                ? ((dyeGreyReceived - dyeFinishReceived) / dyeGreyReceived) * 100
                                                : 0;

                                            const dyeGreyDelivery = Number(comp?.dyeingOrder_Grey_Delivery) || 0;
                                            const dyeShortExcess = dyeGreyDelivery - dyeGreyReceived;

                                            const aopFinishReceived = Number(comp?.aopOrder_Finish_Received_From_Aop) || 0;
                                            const aopGreyReceived = Number(comp?.aopOrder_Aop_Grey_Received) || 0;
                                            const aopProcessLoss = aopGreyReceived > 0
                                                ? ((aopGreyReceived - aopFinishReceived) / aopGreyReceived) * 100
                                                : 0;

                                            const aopSent = Number(comp?.aopOrder_Sent_for_AOP) || 0;
                                            const aopReceived = Number(comp?.aopOrder_Received_from_AOP) || 0;
                                            const aopShortExcess = aopSent - aopReceived;

                                            const isLastSubRow = i === subRowCount - 1;

                                            return (
                                                <tr
                                                    key={`${jobIndex}-${i}`}
                                                    className={`hover:bg-gray-50 ${isLastSubRow ? 'border-b border-gray-300' : ''}`}
                                                >
                                                    {/* Job No — spans all sub-rows for this job, rendered once */}
                                                    {i === 0 && (
                                                        <td
                                                            rowSpan={subRowCount}
                                                            className={`px-4 py-3 text-sm font-semibold text-gray-900 border border-gray-400 bg-white align-top left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${wrapClass}`}
                                                            style={cellStyle}
                                                        >
                                                            {job.jobNo || "-"}
                                                        </td>
                                                    )}

                                                    <td className={cellClass} style={cellStyle}>{com?.color || "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com?.composition || "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com?.orderQty || "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com ? "MU" : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com?.finishRequiredQty != null ? Number(com.finishRequiredQty).toFixed(2) : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{com ? yarnRequiredQty.toFixed(2) : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.knittingOrder_Yarn_Delivery ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.knittingOrder_Yarn_Return ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.knittingOrder_Grey_Fabric_Received ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? <ShortExcess value={knitShortExcess} /> : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.dyeingOrder_Grey_Delivery ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.dyeingOrder_Grey_Return ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.dyeingOrder_Grey_Received ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.dyeingOrder_Finish_Received ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? `${dyeProcessLoss.toFixed(1)}%` : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? <ShortExcess value={dyeShortExcess} /> : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.aopOrder_Sent_for_AOP ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.aopOrder_Return_From_Aop ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.aopOrder_Received_From_Aop ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp?.aopOrder_AOP_Finish_Fabric_Rcvd ?? "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? `${aopProcessLoss.toFixed(1)}%` : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}>{comp ? <ShortExcess value={aopShortExcess} /> : "-"}</td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}>FORMULA</td>
                                                    <td className={cellClass} style={cellStyle}><input className="border rounded-md p-2 w-full" placeholder="Editable" type="text" /></td>

                                                </tr>
                                            );
                                        });
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