import { useState, useMemo } from "react";
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
        overflow: "hidden", // Prevents text from overlapping the next column
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

    const plainTd = (isHovered) => ({
        ...baseTd,
        backgroundColor: isHovered ? "#f0fdf4" : "#ffffff",
    });

    // ── TOTALS: flatten every composition across all orders/workOrders and sum the numeric fields ──
    const totals = useMemo(() => {
        const acc = {
            orderQty: 0,
            workOrderQty: 0,       // note: rendered from `unt.workOrderQty` under the "UNIT PRICE" header — see flag below
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
        border: "1px solid #d1d5db",
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
                        <tr key={jobIndex} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={stickyTd(0, isHovered)}>
                                {workOrders?.map((wo, i) => (
                                    <div key={i}>{wo.factoryName || "-"}</div>
                                ))}
                            </td>
                            {/* FIXED: was a plain <td> with no sticky positioning at all */}
                            <td
                                style={stickyTd(1, isHovered)}
                                onClick={() => handleEditRowData(workOrders.map(wo => wo.id))}
                            >
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
                                        <span key={`${i}-${j}`} style={{ marginRight: '8px', display: 'inline-block' }}>
                                            {comp.composition || "-"}
                                        </span>
                                    ))
                                )}
                            </td>

                            {/* COLOR */}
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

                            {/* UNIT PRICE — ⚠️ renders wo.workOrderQty, not unitePrice; see flag below */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((unt, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                            {unt.workOrderQty || "-"}
                                        </div>
                                    ))
                                )}
                            </td>

                            {/* WORK ORDER QTY — ⚠️ renders totalGreyDelivery; see flag below */}
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
                                        const diff = (wrk.totalGreyDelivery || 0) - (wrk.workOrderQty || 0);
                                        const exceeded = diff > 0;
                                        return (
                                            <div key={`${i}-${j}`} style={{ marginRight: '6px', color: exceeded ? "red" : "green", fontWeight: "bold" }}>
                                                {exceeded ? diff : `(${Math.abs(diff)})`}
                                            </div>
                                        );
                                    })
                                )}
                            </td>

                            {/* GREY RETURN RECEIVE */}
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

                            {/* DIFFERENCE (Finish vs Grey) */}
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

                            {/* RECEIVED FROM COMPACTING */}
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

                            {/* PAYABLE AMOUNT — ⚠️ hardcoded placeholder text, not a real value; see flag below */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle", overflow: "hidden" }}>
                                {workOrders.map((wo, i) =>
                                    wo.compositions?.map((wrk, j) => (
                                        <div key={`${i}-${j}`} style={{ marginRight: '8px' }}>
                                            PAYABLE AMOUNT
                                        </div>
                                    ))
                                )}
                            </td>

                            {/* PENDING BILLING AMOUNT — ⚠️ same, hardcoded placeholder text */}
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

            <tfoot>
                <tr>
                    <td colSpan={FROZEN_COUNT} style={footerStickyLabelTd}>
                        TOTAL
                    </td>
                    {/* COLOR — not numeric */}
                    <td style={footerTd}>-</td>
                    {/* ORDER QTY */}
                    <td style={footerTd}>{totals.orderQty}</td>
                    {/* "UNIT PRICE" column — mirrors body's workOrderQty render */}
                    <td style={footerTd}>{totals.workOrderQty}</td>
                    {/* "WORK ORDER QTY" column — mirrors body's totalGreyDelivery render */}
                    <td style={footerTd}>{totals.totalGreyDelivery}</td>
                    {/* DELIVERY SHORT & EXCESS */}
                    <td style={{ ...footerTd, color: totals.shortExcess > 0 ? "red" : "green" }}>
                        {totals.shortExcess > 0 ? totals.shortExcess : `(${Math.abs(totals.shortExcess)})`}
                    </td>
                    {/* GREY RETURN RECEIVE */}
                    <td style={footerTd}>{totals.greyReturnReceived}</td>
                    {/* GREY RECEIVED FROM DYEING */}
                    <td style={footerTd}>{totals.greyReceived}</td>
                    {/* FINISH FABRIC RECEIVED */}
                    <td style={footerTd}>{totals.finishReceived}</td>
                    {/* BALANCE (Finish vs Grey diff) */}
                    <td style={{ ...footerTd, color: totals.finishVsGreyDiff < 0 ? "red" : "green" }}>
                        {totals.finishVsGreyDiff < 0 ? Math.abs(totals.finishVsGreyDiff) : `(${Math.abs(totals.finishVsGreyDiff)})`}
                    </td>
                    {/* PRICE PER KG — not meaningful to sum */}
                    <td style={footerTd}>-</td>
                    {/* TOTAL SENT FOR COMPACTING */}
                    <td style={footerTd}>{totals.sentForCompacting}</td>
                    {/* TOTAL RECEIVED FROM COMPACTING */}
                    <td style={footerTd}>{totals.receivedFromCompacting}</td>
                    {/* TOTAL BILLING AMOUNT (Grey Received × Unit Price) */}
                    <td style={footerTd}>{totals.greyReceivedValue.toFixed(2)}</td>
                    {/* PAYABLE AMOUNT — body shows placeholder text, so no real total available */}
                    <td style={footerTd}>-</td>
                    {/* PENDING BILLING AMOUNT — same */}
                    <td style={footerTd}>-</td>
                </tr>
            </tfoot>
        </>
    );
};

export default DyeingOrder;