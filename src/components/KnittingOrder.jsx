import { useState } from "react";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";

const KnittingOrder = ({ orders, handleEditRowData, getFrozenStyle }) => {
    const [getJobIndex, setJobIndex] = useState(null);


    const { handleInlineEdit, changedField, handleOnChange, isEdit, handleSubmit } = InlineEdit();


    const hoverColorChange = (jobId) => {
        setJobIndex(jobId);
    };
    // Outer cell border
    const tdClasses = "border border-gray-400 px-0 py-0 text-center align-middle";

    // Inner item border - EACH item gets a bottom border, last one doesn't
    const innerItem = "border-b border-gray-300 px-3 py-2 last:border-b-0";



    return (
        <tbody>
            {orders?.map((job, jobIndex) => {
                const workOrders = job.workOrders || [];
                return (
                    <tr
                        className={`${getJobIndex === jobIndex ? "bg-green-600 bg-opacity-15" : ""}`}
                        onClick={() => hoverColorChange(jobIndex)}
                        key={jobIndex}
                    >
                        {/* FACTORY NAME */}
                        <td style={getFrozenStyle} className={tdClasses}>
                            {workOrders?.map((wo, i) => (
                                wo.factoryName === "NULL" ? (
                                    <div key={i} className={`${innerItem} text-gray-500`}>-</div>
                                ) : (
                                    <div onClick={() => handleInlineEdit(wo.id, wo.factoryName, "workOrder", "factoryName", 0)} key={i} className={`${innerItem} text-green-500 font-bold`}>
                                        {/* {wo.factoryName} */}
                                        {
                                            isEdit.updatedFieldName === "factoryName" && isEdit.rowId === wo.id ?
                                                <input
                                                    type="text"
                                                    name="factoryName"
                                                    className="p-2 outline-none border rounded-md"
                                                    value={changedField.currentValue}
                                                    onChange={
                                                        (e) => handleOnChange(e)
                                                    }
                                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}

                                                /> : wo.factoryName
                                        }
                                    </div>
                                )
                            ))}
                        </td>

                        {/* JOB NO */}
                        <td onClick={() => handleEditRowData(job.jobNo)} className={`${tdClasses} cursor-pointer hover:text-blue-600`}>
                            <div className={innerItem}>{job.jobNo || "NO JOB FOUND"}</div>
                        </td>

                        {/* WORK ORDER NO */}
                        <td className={tdClasses}>
                            {workOrders?.map((wo, i) => (
                                <div key={i} className={innerItem}>
                                    {wo.workOrderNo || "NO WORK ORDER FOUND"}
                                </div>
                            ))}
                        </td>

                        {/* BUYER NAME */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) => (
                                <div key={i} className={innerItem}>
                                    {wo.styleRequirement?.buyerName || "NO BUYER NAME FOUND"}
                                </div>
                            ))}
                        </td>

                        {/* STYLE NO */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) => (
                                <div key={i} className={innerItem}>
                                    {wo.styleRequirement?.styleNo || "NO STYLE NO FOUND"}
                                </div>
                            ))}
                        </td>

                        {/* MONTH */}
                        <td className={tdClasses}>
                            {workOrders?.map((mon, i) => (
                                <div key={i} className={innerItem}>
                                    {mon.month || "NO MONTH NAME FOUND"}
                                </div>
                            ))}
                        </td>

                        {/* COMPOSITION */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((comp, j) => (
                                    <div key={`${i}-${j}`} className={`${innerItem} w-[25rem]`}>                                        {comp.composition || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* COLOR */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((col, j) => (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleEditRowData(col.id); }}
                                        key={`${i}-${j}`}
                                        className={`${innerItem} w-[20rem] cursor-pointer hover:text-blue-500`}
                                    >
                                        {col.color || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* ORDER QTY */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((ord, j) => (
                                    <div key={`${i}-${j}`} className={innerItem}>
                                        {ord.orderQty || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* UNIT PRICE */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((unt, j) => (
                                    <div onClick={() => handleInlineEdit(wo.id, unt.unitePrice, "workOrder", "unitePrice", unt.id)} key={`${i}-${j}`} className={innerItem}>
                                        {/* {unt.unitePrice || "-"} */}
                                        {
                                            isEdit.updatedFieldName === "unitePrice" && isEdit.rowId === wo.id ?
                                                <input
                                                    type="text"
                                                    className="p-2 outline-none border rounded-md"
                                                    name="factoryName"
                                                    value={changedField.currentValue}
                                                    onChange={(e) => handleOnChange(e)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                                /> : unt.unitePrice
                                        }
                                    </div>
                                ))
                            )}
                        </td>

                        {/* WORK ORDER QTY */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div onClick={() => handleInlineEdit(wo.id, wrk.workOrderQty, "workOrder", "workOrderQty", wrk.id)} key={`${i}-${j}`} className={innerItem}>
                                        {/* {wrk.workOrderQty || "-"} */}
                                        {
                                            isEdit.updatedFieldName === "workOrderQty" && isEdit.rowId === wo.id ?
                                                <input
                                                    type="text"
                                                    className="p-2 outline-none border rounded-md"
                                                    name="factoryName"
                                                    value={changedField.currentValue}
                                                    onChange={(e) => handleOnChange(e)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                                /> : wrk.workOrderQty
                                        }
                                    </div>
                                ))
                            )}
                        </td>

                        {/* TOTAL YARN DELIVERY */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className={innerItem}>
                                        {wrk.yarnDeliveriesWithColor?.YarnDelivery || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* DIFFERENCE */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    const workOrderQty = Number(wrk.workOrderQty) || 0;
                                    const totalYarnDelivery = Number(wrk.totalYarnDelivery) || 0;
                                    const diff = workOrderQty - totalYarnDelivery;
                                    const exceeded = diff > 0;
                                    return (
                                        <div
                                            key={`${i}-${j}`}
                                            className={`${innerItem} font-bold`}
                                            style={{ color: exceeded ? "green" : "red" }}
                                        >
                                            {exceeded ? `(${Math.abs(diff)})` : Math.abs(diff)}
                                        </div>
                                    );
                                })
                            )}
                        </td>

                        {/* TOTAL YARN RETURN */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className={`${innerItem} text-red-600 font-extrabold`}>
                                        {wrk.yarnDeliveriesWithColor?.YarnReturn || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* YARN RECEIVED */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className={innerItem}>
                                        {wrk.yarnDeliveriesWithColor?.YarnReceived || "-"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* DIFFERENCE 2 */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    const grey = Number(wrk.yarnDeliveriesWithColor?.YarnReceived) || 0;
                                    const ret = Number(wrk.yarnDeliveriesWithColor?.YarnReturn) || 0;
                                    const del = Number(wrk.yarnDeliveriesWithColor?.YarnDelivery) || 0;
                                    const diff2 = grey + ret - del;
                                    const exceed = diff2 < 0;
                                    return (
                                        <div
                                            key={`${i}-${j}`}
                                            className={`${innerItem} font-bold`}
                                            style={{ color: exceed ? "red" : "green" }}
                                        >
                                            {exceed ? `(${Math.abs(diff2)})` : diff2}
                                        </div>
                                    );
                                })
                            )}
                        </td>

                        {/* TOTAL VALUE */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    const received = Number(wrk.yarnDeliveriesWithColor?.YarnReceived) || 0;
                                    const price = Number(wrk.unitePrice) || 0;
                                    const total = received * price;
                                    return (
                                        <div key={`${i}-${j}`} className={`${innerItem} text-red-600 font-extrabold`}>
                                            {total > 0 ? total.toFixed(2) : "-"}
                                        </div>
                                    );
                                })
                            )}
                        </td>

                        {/* PAID BILLING AMOUNT */}
                        <td className={tdClasses}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className={`${innerItem} text-red-600 font-extrabold`}>
                                        PAID BILLING AMOUNT
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

export default KnittingOrder;