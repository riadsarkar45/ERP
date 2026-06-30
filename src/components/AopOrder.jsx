import { useState } from "react";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";

// 1. Accept the NEW props from AllOrders
const AopOrder = ({ orders, setJobId, handleEditRowData, FROZEN_COUNT, currentFrozenWidths, currentFrozenLefts }) => {
    const [getJobIndex, setJobIndex] = useState("")
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const { handleInlineEdit, changedField, handleOnChange, isEdit, handleSubmit } = InlineEdit();

    const hoverColorChange = (jobId) => {
        console.log(jobId, "job id");
        setJobIndex(jobId)
    }

    const innerItem = "border-b border-gray-300 px-3 py-2 last:border-b-0";

    // All td share these base styles
    const baseTd = {
        borderRight: "1px solid #d1d5db",
        borderBottom: "1px solid #d1d5db",
        padding: 0,
        textAlign: "center",
        verticalAlign: "middle",
    };

    // 2. Use the dynamic props passed from the parent
    const stickyTd = (colIndex, isHovered) => ({
        ...baseTd,
        position: "sticky",
        left: `${currentFrozenLefts[colIndex]}px`, // Updated
        zIndex: 3,
        backgroundColor: isHovered ? "#bbf7d0" : "#ffffff",
        width: `${currentFrozenWidths[colIndex]}px`, // Updated
        minWidth: `${currentFrozenWidths[colIndex]}px`, // Updated
        boxShadow: colIndex === FROZEN_COUNT - 1
            ? "2px 0 5px -1px rgba(0,0,0,0.18)"
            : "none",
    });

    // Non-frozen td
    const plainTd = (isHovered) => ({
        ...baseTd,
        backgroundColor: isHovered ? "#f0fdf4" : "#ffffff",
    });

    // REMOVED: The old FROZEN_LEFTS_LOCAL calculation is completely gone!

    return (
        <tbody>
            {
                orders?.map((job, jobIndex) => {
                    const workOrders = job.workOrders || [];
                    const isHovered = hoveredIndex === jobIndex;

                    return (
                        <tr onClick={() => hoverColorChange(jobIndex)} className={`${getJobIndex === jobIndex && "bg-green-600 bg-opacity-15"}`} key={jobIndex} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={stickyTd(0, isHovered)}>
                                {workOrders?.map((wo, i) => (
                                    <div key={i}>{wo.factoryName || "-"}</div>
                                ))}
                            </td>
                            <td style={stickyTd(1, isHovered)} onClick={() => handleEditRowData(workOrders.map(wo => wo.id))}>
                                {job.jobNo || "NO JOB FOUND"}
                            </td>
                            <td style={stickyTd(2, isHovered)}>
                                {workOrders?.map((wo, i) => (
                                    <div key={i}>{wo.workOrderNo || "-"}</div>
                                ))}
                            </td>
                            <td style={stickyTd(3, isHovered)}>
                                {workOrders.map((wo, i) => (
                                    <div key={i}>{wo.styleRequirement?.buyerName || "-"}</div>
                                ))}
                            </td>
                            <td style={stickyTd(4, isHovered)}>
                                {workOrders.map((wo, i) => (
                                    <div key={i}>{wo.styleRequirement?.styleNo || "-"}</div>
                                ))}
                            </td>
                            <td style={stickyTd(5, isHovered)}>
                                {workOrders?.map((mon, i) => (
                                    <div key={i}>{mon.month || "-"}</div>
                                ))}
                            </td>

                            {/* COMPOSITION */}
                            <td style={stickyTd(6, isHovered)}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((comp, j) => (
                                        <span key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                            {comp.composition || "-"}
                                        </span>
                                    ))
                                )}
                            </td>

                            {/* COLOR */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((col, j) => (
                                        <span onClick={() => handleEditRowData(col.id)} key={`${i}-${j}`} style={{ marginRight: '6px', cursor: 'pointer' }}>
                                            {col.color || "-"}
                                        </span>
                                    ))
                                )}
                            </td>

                            {/* ORDER QTY */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((ord, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {ord.orderQty || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            {/* UNIT PRICE */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((unt, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {unt.unitePrice || "-"}
                                        </div>
                                    ))
                                )}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((unt, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {unt.workOrderQty || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            {/* WORK ORDER QTY */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {wrk.yarnDeliveriesWithColor?.SentforAOP || "-"}
                                        </div>
                                    ))
                                )}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => {
                                        const diff = (wrk.yarnDeliveriesWithColor?.SentforAOP || 0) - (wrk.workOrderQty || 0);
                                        const exceeded = diff > 0;
                                        return (
                                            <div key={`${i}-${j}`} style={{ marginRight: '6px', color: exceeded ? "red" : "green", fontWeight: "bold" }}>
                                                {exceeded ? diff : `(${Math.abs(diff)})`}
                                            </div>
                                        );
                                    })
                                )}
                            </td>

                            {/* TOTAL YARN DELIVERY */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {wrk.yarnDeliveriesWithColor?.ReceivedfromAOP || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {(wrk.yarnDeliveriesWithColor?.ReceivedfromAOP || 0) * (wrk.unitePrice || 0) || "-"}
                                        </div>
                                    ))
                                )}
                            </td>
                        </tr>
                    )
                })
            }
        </tbody>
    );
};

export default AopOrder;