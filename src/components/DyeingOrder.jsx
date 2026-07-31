import { useState, useMemo } from "react";

const DyeingOrder = ({ orders, handleInlineEdit, updatedFields, handleOnChange, isEdit, handleEditRowData, FROZEN_COUNT, currentFrozenWidths, currentFrozenLefts }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);


    const innerItem = "border-b border-gray-300 last:border-b-0 w-full py-2 px-3";

    const baseTd = {
        borderRight: "1px solid #e2e8f0",
        borderBottom: "1px solid #e2e8f0",
        padding: 0,
        textAlign: "center",
        verticalAlign: "middle",
        overflow: "hidden",
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
        cursor: "pointer",
    });

    const totals = useMemo(() => {
        const acc = {
            orderQty: 0,
            workOrderQty: 0,
            totalGreyDelivery: 0,
            shortExcess: 0,
            greyReturnReceived: 0,
            greyReceived: 0,
            finishReceived: 0,
            finishVsGreyDiff: 0,
            unitePrice: 0,
            sentForCompacting: 0,
            receivedFromCompacting: 0,
            greyReceivedValue: 0,
        };

        (orders || []).forEach(job => {
            (job.workOrders || []).forEach(wo => {
                (wo.compositions || []).forEach(comp => {
                    const orderQty = Number(comp.orderQty) || 0;
                    const workOrderQty = Number(comp.workOrderQty) || 0;
                    const totalGreyDelivery = Number(comp.totalGreyDelivery) || 0;
                    const greyReturnReceived = Number(comp.yarnDeliveriesWithColor?.GreyReturnReceived) || 0;
                    const greyReceived = Number(comp.yarnDeliveriesWithColor?.GreyReceived) || 0;
                    const finishReceived = Number(comp.yarnDeliveriesWithColor?.FinishReceived) || 0;
                    const unitePrice = Number(comp.unitePrice) || 0;
                    const sentForCompacting = Number(comp.yarnDeliveriesWithColor?.SentForCompacting) || 0;
                    const receivedFromCompacting = Number(comp.yarnDeliveriesWithColor?.ReceivedFromCompacting) || 0;

                    acc.orderQty += orderQty;
                    acc.workOrderQty += workOrderQty;
                    acc.totalGreyDelivery += totalGreyDelivery;
                    acc.shortExcess += totalGreyDelivery - workOrderQty;
                    acc.greyReturnReceived += greyReturnReceived;
                    acc.greyReceived += greyReceived;
                    acc.finishReceived += finishReceived;
                    acc.finishVsGreyDiff += finishReceived - greyReceived;
                    acc.unitePrice += unitePrice;
                    acc.sentForCompacting += sentForCompacting;
                    acc.receivedFromCompacting += receivedFromCompacting;
                    acc.greyReceivedValue += greyReceived * unitePrice;
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
                        <tr key={jobIndex}>
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
                            <td
                                style={stickyTd(1, isHovered)}
                                onClick={() => handleEditRowData(workOrders.map(wo => wo.id))}
                            >
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

                            {/* FIXED: Changed from plain style to stickyTd(6, isHovered) */}
                            <td style={stickyTd(6, isHovered)}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((comp, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {comp.composition || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((col, j) => (
                                        <div onClick={() => handleEditRowData(col.id)} key={`${i}-${j}`} className={innerItem} style={{ cursor: 'pointer' }}>
                                            {col.color || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} onClick={() => handleInlineEdit(wo.id, wrk.workOrderQty, "workOrder", "workOrderQty", wrk.id)} className={`${innerItem} cursor-pointer`}>
                                        {isEdit.updatedFieldName === "workOrderQty" && isEdit.compId === wrk.id ? (
                                            <input type="text" className="p-2 outline-none border rounded-md w-full" name="workOrderQty" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                        ) : wrk.workOrderQty || "-"}

                                    </div>
                                )))}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {wrk.totalGreyDelivery || "-"}
                                        </div>
                                    ))
                                )}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => {
                                        const diff = (wrk.totalGreyDelivery || 0) - (wrk.workOrderQty || 0);
                                        const exceeded = diff > 0;
                                        return (
                                            <div key={`${i}-${j}`} className={innerItem} style={{ color: exceeded ? "red" : "green", fontWeight: "bold" }}>
                                                {exceeded ? diff : `(${Math.abs(diff)})`}
                                            </div>
                                        );
                                    })
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {wrk.yarnDeliveriesWithColor?.GreyReturnReceived || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {wrk.yarnDeliveriesWithColor?.GreyReceived || "-"}
                                        </div>
                                    ))
                                )}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {wrk.yarnDeliveriesWithColor?.FinishReceived || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => {
                                        const diff = (wrk.yarnDeliveriesWithColor?.FinishReceived || 0) - (wrk.yarnDeliveriesWithColor?.GreyReceived || 0);
                                        const exceeded = diff < 0;
                                        return (
                                            <div key={`${i}-${j}`} className={innerItem} style={{ color: exceeded ? "red" : "green", fontWeight: "bold" }}>
                                                {exceeded ? Math.abs(diff) : `(${Math.abs(diff)})`}
                                            </div>
                                        );
                                    })
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) => wo.compositions?.map((unt, j) => (
                                    <div key={`${i}-${j}`} onClick={() => handleInlineEdit(unt.id, unt.unitePrice, "workOrder", "unitePrice", unt.id)} className={`${innerItem} cursor-pointer`}>
                                        {isEdit.updatedFieldName === "unitePrice" && isEdit.rowId === unt.id ? (
                                            <input type="text" className="p-2 outline-none border rounded-md w-full" name="unitePrice" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                        ) : unt.unitePrice || "-"}

                                    </div>
                                )))}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {wrk.yarnDeliveriesWithColor?.SentForCompacting || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            {wrk.yarnDeliveriesWithColor?.ReceivedFromCompacting || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>

                                            {(wrk.yarnDeliveriesWithColor?.GreyReceived || 0) * (wrk.unitePrice || 0).toFixed(2) || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            PAYABLE AMOUNT
                                        </div>
                                    ))
                                )}
                            </td>

                            <td style={{ border: "1px solid #e2e8f0", padding: 0, textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} className={innerItem}>
                                            PENDING BILLING AMOUNT
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
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>{totals.orderQty}</td>
                    <td style={footerTd}>{totals.workOrderQty}</td>
                    <td style={footerTd}>{totals.totalGreyDelivery}</td>
                    <td style={{ ...footerTd, color: totals.shortExcess > 0 ? "red" : "green" }}>
                        {totals.shortExcess > 0 ? totals.shortExcess : `(${Math.abs(totals.shortExcess)})`}
                    </td>
                    <td style={footerTd}>{totals.greyReturnReceived}</td>
                    <td style={footerTd}>{totals.greyReceived}</td>
                    <td style={footerTd}>{totals.finishReceived}</td>
                    <td style={{ ...footerTd, color: totals.finishVsGreyDiff < 0 ? "red" : "green" }}>
                        {totals.finishVsGreyDiff < 0 ? Math.abs(totals.finishVsGreyDiff) : `(${Math.abs(totals.finishVsGreyDiff)})`}
                    </td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>{totals.sentForCompacting}</td>
                    <td style={footerTd}>{totals.receivedFromCompacting}</td>
                    <td style={footerTd}>{totals.greyReceivedValue.toFixed(2)}</td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>-</td>
                </tr>
            </tfoot>
        </>
    );
};

export default DyeingOrder;