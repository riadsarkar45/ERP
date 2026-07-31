import { useState, useMemo } from "react";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";

const AopOrder = ({ orders, handleInlineEdit, updatedFields, handleOnChange, isEdit, setJobId, handleEditRowData, FROZEN_COUNT, currentFrozenWidths, currentFrozenLefts }) => {
    const [getJobIndex, setJobIndex] = useState("");
    const [hoveredIndex, setHoveredIndex] = useState(null);
    // const { handleInlineEdit, changedField, handleOnChange, isEdit, handleSubmit } = InlineEdit();

    const hoverColorChange = (jobId) => {
        console.log(jobId, "job id");
        setJobIndex(jobId);
    };

    // Updated innerItem to ensure proper full-width borders
    const innerItem = "border-b border-gray-300 last:border-b-0 w-full py-2 px-3";

    // All td share these base styles
    const baseTd = {
        borderRight: "1px solid #e2e8f0",
        borderBottom: "1px solid #e2e8f0",
        padding: 0, // Padding is 0 so innerItem borders align perfectly
        textAlign: "center",
        verticalAlign: "middle",
        overflow: "hidden",
    };

    // Use the dynamic props passed from the parent
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
        cursor: "pointer",
    });

    // Non-frozen td (kept for reference, but we apply inline styles below for consistency)
    const plainTd = (isHovered) => ({
        ...baseTd,
        backgroundColor: isHovered ? "#f0fdf4" : "#ffffff",
    });

    // ── TOTALS: flatten every composition across all orders/workOrders and sum the numeric fields ──
    const totals = useMemo(() => {
        const acc = {
            orderQty: 0,
            workOrderQty: 0,
            sentForAop: 0,
            shortExcess: 0,
            receivedFromAop: 0,
            payableAmount: 0,
        };

        (orders || []).forEach(job => {
            (job.workOrders || []).forEach(wo => {
                (wo.compositions || []).forEach(comp => {
                    const orderQty = Number(comp.orderQty) || 0;
                    const workOrderQty = Number(comp.workOrderQty) || 0;
                    const sentForAop = Number(comp.yarnDeliveriesWithColor?.SentForAop) || 0;
                    const receivedFromAop = Number(comp.yarnDeliveriesWithColor?.ReceivedFromAop) || 0;
                    const unitePrice = Number(comp.unitePrice) || 0;

                    acc.orderQty += orderQty;
                    acc.workOrderQty += workOrderQty;
                    acc.sentForAop += sentForAop;
                    acc.shortExcess += sentForAop - workOrderQty;
                    acc.receivedFromAop += receivedFromAop;
                    acc.payableAmount += receivedFromAop * unitePrice;
                });
            });
        });

        return acc;
    }, [orders]);

    const totalFrozenWidth = currentFrozenWidths.reduce((sum, w) => sum + w, 0);

    const footerStickyLabelTd = {
        ...baseTd,
        position: "sticky",
        left: 0,
        zIndex: 4,
        backgroundColor: "#f3f4f6",
        width: `${totalFrozenWidth}px`,
        minWidth: `${totalFrozenWidth}px`,
        fontWeight: 700,
        boxShadow: "2px 0 5px -1px rgba(0,0,0,0.18)",
        padding: "8px 12px",
        textAlign: "left",
    };

    const footerTd = {
        border: "1px solid #e2e8f0",
        padding: "8px 12px",
        textAlign: "center",
        verticalAlign: "middle",
        fontWeight: 700,
        backgroundColor: "#f3f4f6",
    };

    return (
        <>
            <tbody>
                {orders?.map((job, jobIndex) => {
                    const workOrders = job.workOrders || [];
                    const isHovered = hoveredIndex === jobIndex;

                    return (
                        <tr
                            onClick={() => hoverColorChange(jobIndex)}
                            className={`${getJobIndex === jobIndex ? "bg-green-600 bg-opacity-15" : ""}`}
                            key={jobIndex}
                        >
                            <td style={stickyTd(0, isHovered)}>
                                {workOrders?.map((wo, i) => (
                                    wo.factoryName === "NULL" ? (
                                        <div key={i} className={`${innerItem} text-gray-500`}>-</div>
                                    ) : (
                                        <div key={i} onClick={() => handleInlineEdit(wo.id, wo.factoryName, "workOrder", "factoryName", 0)} className={`${innerItem} text-green-600 font-bold cursor-pointer`}>
                                            {isEdit.updatedFieldName === "factoryName" && isEdit.rowId === wo.id ? (
                                                <input type="text" name="factoryName" className="p-2 outline-none border rounded-md w-full" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                            ) : wo.factoryName}
                                        </div>
                                    )
                                ))}
                            </td>
                            <td style={stickyTd(1, isHovered)} onClick={() => handleEditRowData(workOrders.map(wo => wo.id))}>
                                <div className={innerItem}>{job.jobNo || "NO JOB FOUND"}</div>
                            </td>
                            <td style={stickyTd(2, isHovered)}>
                                {workOrders?.map((wo, i) => (
                                    <div key={i} className={innerItem}>{wo.workOrderNo || "-"}</div>
                                ))}
                            </td>
                            <td style={stickyTd(3, isHovered)}>
                                {workOrders.map((wo, i) => (
                                    <div key={i} className={innerItem}>{wo.styleRequirement?.buyerName || "-"}</div>
                                ))}
                            </td>
                            <td style={stickyTd(4, isHovered)}>
                                {workOrders.map((wo, i) => (
                                    <div key={i} className={innerItem}>{wo.styleRequirement?.styleNo || "-"}</div>
                                ))}
                            </td>
                            <td style={stickyTd(5, isHovered)}>
                                {workOrders?.map((mon, i) => (
                                    <div key={i} className={innerItem}>{mon.month || "-"}</div>
                                ))}
                            </td>

                            {/* COMPOSITION - Now uses stickyTd and proper div with innerItem */}
                            <td style={stickyTd(6, isHovered)}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((comp, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {comp.composition || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            {/* COLOR */}
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((col, j) => (
                                        <div
                                            onClick={() => handleEditRowData(col.id)}
                                            key={`${i}-${j}`}
                                            className={innerItem}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {col.color || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            

                            {/* UNIT PRICE */}
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) => wo.compositions?.map((unt, j) => (
                                    <div key={`${i}-${j}`} onClick={() => handleInlineEdit(unt.id, unt.unitePrice, "workOrder", "unitePrice", unt.id)} className={`${innerItem} cursor-pointer`}>
                                        {isEdit.updatedFieldName === "unitePrice" && isEdit.rowId === unt.id ? (
                                            <input type="text" className="p-2 outline-none border rounded-md w-full" name="unitePrice" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                        ) : unt.unitePrice || "-"}

                                    </div>
                                )))}
                            </td>

                            {/* WORK ORDER QTY */}
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} onClick={() => handleInlineEdit(wo.id, wrk.workOrderQty, "workOrder", "workOrderQty", wrk.id)} className={`${innerItem} cursor-pointer`}>
                                        {isEdit.updatedFieldName === "workOrderQty" && isEdit.compId === wrk.id ? (
                                            <input type="text" className="p-2 outline-none border rounded-md w-full" name="workOrderQty" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                        ) : wrk.workOrderQty || "-"}

                                    </div>
                                )))}
                            </td>

                            {/* SENT FOR AOP */}
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {wrk.yarnDeliveriesWithColor?.SentForAop || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            {/* DEL. SHORT & EXCESS */}
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => {
                                        const diff = (wrk.yarnDeliveriesWithColor?.SentForAop || 0) - (wrk.workOrderQty || 0);
                                        const exceeded = diff > 0;
                                        return (
                                            <div key={`${i}-${j}`} className={innerItem} style={{ color: exceeded ? "red" : "green", fontWeight: "bold" }}>
                                                {exceeded ? diff : `(${Math.abs(diff)})`}
                                            </div>
                                        );
                                    })
                                )}
                            </td>

                            {/* RECEIVED FROM AOP */}
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {wrk.yarnDeliveriesWithColor?.ReceivedFromAop || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            {/* PAYABLE AMOUNT */}
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {(wrk.yarnDeliveriesWithColor?.ReceivedFromAop || 0) * (wrk.unitePrice || 0) || "-"}
                                        </div>
                                    ))
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>

            <tfoot>
                <tr>
                    <td colSpan={FROZEN_COUNT} style={footerStickyLabelTd}>
                        TOTAL
                    </td>
                    {/* COLOR — not numeric, left blank */}
                    <td style={footerTd}>-</td>
                    {/* ORDER QTY */}
                    <td style={footerTd}>{totals.orderQty}</td>
                    {/* UNIT PRICE — not meaningful to sum */}
                    <td style={footerTd}>-</td>
                    {/* WORK ORDER QTY */}
                    <td style={footerTd}>{totals.workOrderQty}</td>
                    {/* SENT FOR AOP */}
                    <td style={footerTd}>{totals.sentForAop}</td>
                    {/* DEL. SHORT & EXCESS */}
                    <td style={{ ...footerTd, color: totals.shortExcess > 0 ? "red" : "green" }}>
                        {totals.shortExcess > 0 ? totals.shortExcess : `(${Math.abs(totals.shortExcess)})`}
                    </td>
                    {/* RECEIVED FROM AOP */}
                    <td style={footerTd}>{totals.receivedFromAop}</td>
                    {/* PAYABLE AMOUNT */}
                    <td style={footerTd}>{totals.payableAmount.toFixed(2)}</td>
                </tr>
            </tfoot>
        </>
    );
};

export default AopOrder;