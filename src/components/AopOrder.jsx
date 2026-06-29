import { useState } from "react";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";

const AopOrder = ({ orders, handleEditRowData, FROZEN_COUNT, FROZEN_WIDTHS }) => {
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

    // Frozen td — must use solid opaque bg, never transparent
    const stickyTd = (colIndex, isHovered) => ({
        ...baseTd,
        position: "sticky",
        left: `${FROZEN_LEFTS_LOCAL[colIndex]}px`,
        zIndex: 3,
        // solid color — no rgba, no opacity, no Tailwind bg class
        backgroundColor: isHovered ? "#bbf7d0" : "#ffffff",
        width: `${FROZEN_WIDTHS[colIndex]}px`,
        minWidth: `${FROZEN_WIDTHS[colIndex]}px`,
        boxShadow: colIndex === FROZEN_COUNT - 1
            ? "2px 0 5px -1px rgba(0,0,0,0.18)"
            : "none",
    });

    // Non-frozen td
    const plainTd = (isHovered) => ({
        ...baseTd,
        // solid color here too — no opacity tricks
        backgroundColor: isHovered ? "#f0fdf4" : "#ffffff",
    });

    // Recompute lefts locally from FROZEN_WIDTHS prop
    const FROZEN_LEFTS_LOCAL = FROZEN_WIDTHS.reduce((acc, w, i) => {
        if (i === 0) return [0];
        return [...acc, acc[i - 1] + FROZEN_WIDTHS[i - 1]];
    }, []);
    return (
        <tbody>
            {
                orders?.map((job, jobIndex) => {
                    const workOrders = job.workOrders || [];
                    const isHovered = hoveredIndex === jobIndex;

                    return (
                        <tr onClick={() => hoverColorChange(jobIndex)} className={`${getJobIndex === jobIndex && "bg-green-600 bg-opacity-15"}`} key={jobIndex} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td   style={stickyTd(0, isHovered)}>
                                {workOrders?.map((wo, i) => (
                                    <div key={i}>{wo.factoryName || "-"}</div>
                                ))}
                            </td>
                            <td style={stickyTd(1, isHovered)} onClick={() => handleEditRowData(job.jobNo)}>
                                {job.jobNo || "NO JOB FOUND"}
                            </td>
                            <td  style={stickyTd(2, isHovered)}>
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

                            {/* COMPOSITION - Changed to inline span */}
                            <td style={stickyTd(6, isHovered)}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((comp, j) => (
                                        <span key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                            {comp.composition || "-"}
                                        </span>
                                    ))
                                )}
                            </td>

                            {/* COLOR - Changed to inline span */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((col, j) => (
                                        <span onClick={() => handleEditRowData(col.id)} key={`${i}-${j}`} style={{ marginRight: '6px', cursor: 'pointer' }}>
                                            {col.color || "-"}
                                        </span>
                                    ))
                                )}
                            </td>

                            {/* ORDER QTY - Changed to inline span */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((ord, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {ord.orderQty || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            {/* UNIT PRICE - Changed to inline span */}
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

                            {/* WORK ORDER QTY - Changed to inline span */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {wrk.yarnDeliveriesWithColor.SentforAOP || "-"}
                                        </div>
                                    ))
                                )}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => {
                                        const diff = wrk.yarnDeliveriesWithColor.SentforAOP - wrk.workOrderQty || 0;
                                        const exceeded = diff > 0 || 0;
                                        return (
                                            <div key={`${i}-${j}`} style={{ marginRight: '6px', color: exceeded ? "red" : "green", fontWeight: "bold" }}>
                                                {exceeded ? diff : `(${Math.abs(diff)})`}
                                            </div>
                                        );
                                    })
                                )}
                            </td>

                            {/* TOTAL YARN DELIVERY - Changed to inline span */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {wrk.yarnDeliveriesWithColor.ReceivedfromAOP || "-"}

                                        </div>
                                    ))
                                )}
                            </td>


                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {wrk.yarnDeliveriesWithColor.ReceivedfromAOP * wrk.unitePrice || "-"}
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