import { useState } from "react";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";

const DyeingOrder = ({ orders, handleEditRowData, FROZEN_COUNT, currentFrozenWidths, currentFrozenLefts }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const { handleInlineEdit, changedField, handleOnChange, isEdit, handleSubmit } = InlineEdit();

    const innerItem = "border-b border-gray-300 px-3 py-2 last:border-b-0";

    // All td share these base styles
    const baseTd = {
        borderRight: "1px solid #d1d5db",
        borderBottom: "1px solid #d1d5db",
        padding: 0,
        textAlign: "center",
        verticalAlign: "middle",
        overflow: "hidden", // NEW: Prevents text from overlapping the next column
    };

    const stickyTd = (colIndex, isHovered) => ({
        ...baseTd,
        position: "sticky",
        left: `${currentFrozenLefts[colIndex]}px`,
        zIndex: 3,
        backgroundColor: isHovered ? "#bbf7d0" : "#ffffff",
        width: `${currentFrozenWidths[colIndex]}px`,
        minWidth: `${currentFrozenWidths[colIndex]}px`,
        boxShadow: colIndex === FROZEN_COUNT - 1
            ? "2px 0 5px -1px rgba(0,0,0,0.18)"
            : "none",
    });

    const plainTd = (isHovered) => ({
        ...baseTd,
        backgroundColor: isHovered ? "#f0fdf4" : "#ffffff",
    });

    return (
        <tbody>
            {orders?.map((job, jobIndex) => {
                const workOrders = job.workOrders || [];
                const isHovered = hoveredIndex === jobIndex;

                return (
                    <tr key={jobIndex} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={stickyTd(0, isHovered)}>
                            {workOrders?.map((wo, i) => (
                                <div key={i}>{wo.factoryName || "-"}</div>
                            ))}
                        </td>
                        <td onClick={() => handleEditRowData(workOrders.map(wo => wo.id))}>
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

                        {/* COMPOSITION - FIXED: Removed whiteSpace: 'nowrap' */}
                        <td style={stickyTd(6, isHovered)}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((comp, j) => (
                                    <span key={`${i}-${j}`} style={{ marginRight: '8px', display: 'inline-block' }}>
                                        {comp.composition || "-"}
                                    </span>
                                ))
                            )}
                        </td>

                        {/* COLOR - Added overflow: hidden */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((col, j) => (
                                    <div onClick={() => handleEditRowData(col.id)} key={`${i}-${j}`} style={{ marginRight: '6px', cursor: 'pointer' }}>
                                        {col.color || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* ORDER QTY */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((ord, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {ord.orderQty || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* UNIT PRICE */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((unt, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {unt.workOrderQty || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* WORK ORDER QTY */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.totalGreyDelivery || "-"}
                                    </div>
                                ))
                            )}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    const diff = wrk.totalGreyDelivery - wrk.workOrderQty;
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
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.yarnDeliveriesWithColor?.GreyReturnReceived || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.yarnDeliveriesWithColor?.GreyReceived || "-"}
                                    </div>
                                ))
                            )}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.yarnDeliveriesWithColor?.FinishReceived || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* DIFFERENCE */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    const diff = (wrk.yarnDeliveriesWithColor?.FinishReceived || 0) - (wrk.yarnDeliveriesWithColor?.GreyReceived || 0);
                                    const exceeded = diff < 0;
                                    return (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px', color: exceeded ? "red" : "green", fontWeight: "bold" }}>
                                            {exceeded ? Math.abs(diff) : `(${Math.abs(diff)})`}
                                        </div>
                                    );
                                })
                            )}
                        </td>

                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.unitePrice || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.yarnDeliveriesWithColor?.SentForCompacting || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* TOTAL YARN RETURN - FIXED: Removed whiteSpace: 'nowrap' */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '8px' }}>
                                        {wrk.yarnDeliveriesWithColor?.ReceivedFromCompacting || "-"}
                                    </div>
                                ))
                            )}
                        </td>
                        
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {(wrk.yarnDeliveriesWithColor?.GreyReceived || 0) * (wrk.unitePrice || 0) || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* PAYABLE AMOUNT - FIXED: Removed whiteSpace: 'nowrap' */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '8px' }}>
                                        PAYABLE AMOUNT
                                    </div>
                                ))
                            )}
                        </td>

                        {/* PENDING BILLING AMOUNT - FIXED: Removed whiteSpace: 'nowrap' */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '8px' }}>
                                        PENDING BILLING AMOUNT
                                    </div>
                                ))
                            )}
                        </td>
                    </tr>
                );
            })}
        </tbody>
    );
};

export default DyeingOrder;