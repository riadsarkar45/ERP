import { useState } from "react";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";

// 1. Accept the NEW props from AllOrders
const KnittingOrder = ({ orders, handleEditRowData, FROZEN_COUNT, currentFrozenWidths, currentFrozenLefts }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const { handleInlineEdit, changedField, handleOnChange, isEdit, handleSubmit } = InlineEdit();

    const innerItem = "border-b border-gray-300 px-3 py-2 last:border-b-0";

    // 2. REMOVED: The old FROZEN_LEFTS_LOCAL calculation is gone!

    const baseTd = {
        borderRight: "1px solid #d1d5db",
        borderBottom: "1px solid #d1d5db",
        padding: 0,
        textAlign: "center",
        verticalAlign: "middle",
    };

    // 3. Use the dynamic props passed from the parent
    const stickyTd = (colIndex, isHovered) => ({
        ...baseTd,
        position: "sticky",
        left: `${currentFrozenLefts[colIndex]}px`, 
        zIndex: 3,
        backgroundColor: isHovered ? "#bbf7d0" : "#ffffff",
        width: `${currentFrozenWidths[colIndex]}px`, 
        minWidth: `${currentFrozenWidths[colIndex]}px`,
        boxShadow: colIndex === FROZEN_COUNT - 1 ? "2px 0 5px -1px rgba(0,0,0,0.18)" : "none",
    });

    const plainTd = (isHovered) => ({
        ...baseTd,
        backgroundColor: isHovered ? "#f0fdf4" : "#ffffff",
    });

    return (
        <tbody>
            {orders?.map((job, jobIndex) => {
                const workOrders = job.workOrders || [];
                const isHovered  = hoveredIndex === jobIndex;

                return (
                    <tr key={jobIndex} onClick={() => setHoveredIndex(jobIndex)}>
                        {/* COL 0 — FACTORY NAME */}
                        <td style={stickyTd(0, isHovered)}>
                            {workOrders?.map((wo, i) => (
                                wo.factoryName === "NULL" ? (
                                    <div key={i} className={`${innerItem} text-gray-500`}>-</div>
                                ) : (
                                    <div key={i} onClick={() => handleInlineEdit(wo.id, wo.factoryName, "workOrder", "factoryName", 0)} className={`${innerItem} text-green-600 font-bold cursor-pointer`}>
                                        {isEdit.updatedFieldName === "factoryName" && isEdit.rowId === wo.id ? (
                                            <input type="text" name="factoryName" className="p-2 outline-none border rounded-md w-full" value={changedField.currentValue} onChange={(e) => handleOnChange(e)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
                                        ) : wo.factoryName}
                                    </div>
                                )
                            ))}
                        </td>

                        {/* COL 1 — JOB NO */}
                        <td style={stickyTd(1, isHovered)} onClick={() => handleEditRowData(job.jobNo)}>
                            <div className={`${innerItem} cursor-pointer hover:text-blue-600`}>{job.jobNo || "NO JOB FOUND"}</div>
                        </td>

                        {/* COL 2 — WORK ORDER NO */}
                        <td style={stickyTd(2, isHovered)}>
                            {workOrders?.map((wo, i) => (<div key={i} className={innerItem}>{wo.workOrderNo || "NO WORK ORDER FOUND"}</div>))}
                        </td>

                        {/* COL 3 — BUYER NAME */}
                        <td style={stickyTd(3, isHovered)}>
                            {workOrders.map((wo, i) => (<div key={i} className={innerItem}>{wo.styleRequirement?.buyerName || "NO BUYER NAME FOUND"}</div>))}
                        </td>

                        {/* COL 4 — STYLE NO */}
                        <td style={stickyTd(4, isHovered)}>
                            {workOrders.map((wo, i) => (<div key={i} className={innerItem}>{wo.styleRequirement?.styleNo || "NO STYLE NO FOUND"}</div>))}
                        </td>

                        {/* COL 5 — MONTH */}
                        <td style={stickyTd(5, isHovered)}>
                            {workOrders?.map((mon, i) => (<div key={i} className={innerItem}>{mon.month || "NO MONTH NAME FOUND"}</div>))}
                        </td>

                        {/* COL 6 — COMPOSITION (last frozen) */}
                        <td style={stickyTd(6, isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((comp, j) => (<div key={`${i}-${j}`} className={`${innerItem}`}>{comp.composition || "-"}</div>)))}
                        </td>

                        {/* COL 7 — COLOR */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((col, j) => (
                                <div key={`${i}-${j}`} onClick={(e) => { e.stopPropagation(); handleEditRowData(col.id); }} className={`${innerItem} cursor-pointer hover:text-blue-500`}>{col.color || "-"}</div>
                            )))}
                        </td>

                        {/* COL 8 — ORDER QTY */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((ord, j) => (<div key={`${i}-${j}`} className={innerItem}>{ord.orderQty || "-"}</div>)))}
                        </td>

                        {/* COL 9 — UNIT PRICE */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((unt, j) => (
                                <div key={`${i}-${j}`} onClick={() => handleInlineEdit(wo.id, unt.unitePrice, "workOrder", "unitePrice", unt.id)} className={`${innerItem} cursor-pointer`}>
                                    {isEdit.updatedFieldName === "unitePrice" && isEdit.rowId === wo.id ? (
                                        <input type="text" className="p-2 outline-none border rounded-md w-full" name="unitePrice" value={changedField.currentValue} onChange={(e) => handleOnChange(e)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
                                    ) : unt.unitePrice || "-"}
                                </div>
                            )))}
                        </td>

                        {/* COL 10 — WORK ORDER QTY */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => (
                                <div key={`${i}-${j}`} onClick={() => handleInlineEdit(wo.id, wrk.workOrderQty, "workOrder", "workOrderQty", wrk.id)} className={`${innerItem} cursor-pointer`}>
                                    {isEdit.updatedFieldName === "workOrderQty" && isEdit.rowId === wo.id ? (
                                        <input type="text" className="p-2 outline-none border rounded-md w-full" name="workOrderQty" value={changedField.currentValue} onChange={(e) => handleOnChange(e)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
                                    ) : wrk.workOrderQty || "-"}
                                </div>
                            )))}
                        </td>

                        {/* COL 11 — TOTAL YARN DELIVERY */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => (<div key={`${i}-${j}`} className={innerItem}>{wrk.yarnDeliveriesWithColor?.YarnDelivery || "-"}</div>)))}
                        </td>

                        {/* COL 12 — DEL SHORT & EXCESS */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => {
                                const workOrderQty = Number(wrk.workOrderQty) || 0;
                                const totalYarnDelivery = Number(wrk.totalYarnDelivery) || 0;
                                const diff = workOrderQty - totalYarnDelivery;
                                const exceeded = diff > 0;
                                return (
                                    <div key={`${i}-${j}`} className={`${innerItem} font-bold`} style={{ color: exceeded ? "green" : "red" }}>
                                        {exceeded ? `(${Math.abs(diff)})` : Math.abs(diff)}
                                    </div>
                                );
                            }))}
                        </td>

                        {/* COL 13 — YARN RETURN */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => (<div key={`${i}-${j}`} className={`${innerItem} text-red-600 font-extrabold`}>{wrk.yarnDeliveriesWithColor?.YarnReturn || "-"}</div>)))}
                        </td>

                        {/* COL 14 — YARN RECEIVED */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => (<div key={`${i}-${j}`} className={innerItem}>{wrk.yarnDeliveriesWithColor?.YarnReceived || "-"}</div>)))}
                        </td>

                        {/* COL 15 — RCVD SHORT & EXCESS */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => {
                                const grey = Number(wrk.yarnDeliveriesWithColor?.YarnReceived) || 0;
                                const ret = Number(wrk.yarnDeliveriesWithColor?.YarnReturn) || 0;
                                const del = Number(wrk.yarnDeliveriesWithColor?.YarnDelivery) || 0;
                                const diff2 = grey + ret - del;
                                const exceed = diff2 < 0;
                                return (
                                    <div key={`${i}-${j}`} className={`${innerItem} font-bold`} style={{ color: exceed ? "red" : "green" }}>
                                        {exceed ? `(${Math.abs(diff2)})` : diff2}
                                    </div>
                                );
                            }))}
                        </td>

                        {/* COL 16 — PAYABLE AMOUNT */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => {
                                const received = Number(wrk.yarnDeliveriesWithColor?.YarnReceived) || 0;
                                const price = Number(wrk.unitePrice) || 0;
                                const total = received * price;
                                return (<div key={`${i}-${j}`} className={`${innerItem} text-red-600 font-extrabold`}>{total > 0 ? total.toFixed(2) : "-"}</div>);
                            }))}
                        </td>

                        {/* COL 17 — PAID BILLING AMOUNT */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => (<div key={`${i}-${j}`} className={`${innerItem} text-red-600 font-extrabold`}>PAID BILLING AMOUNT</div>)))}
                        </td>

                        {/* COL 18 — PENDING BILLING AMOUNT */}
                        <td style={plainTd(isHovered)}>
                            {workOrders.map((wo, i) => wo.compositions?.map((wrk, j) => (<div key={`${i}-${j}`} className={`${innerItem} text-red-600 font-extrabold`}>-</div>)))}
                        </td>
                    </tr>
                );
            })}
        </tbody>
    );
};

export default KnittingOrder;