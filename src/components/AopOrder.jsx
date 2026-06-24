import { useState } from "react";

const AopOrder = ({ orders, handleEditRowData }) => {
    const [getJobIndex, setJobIndex] = useState("")
    const hoverColorChange = (jobId) => {
        console.log(jobId, "job id");
        setJobIndex(jobId)
    }
    return (
        <tbody>
            {
                orders?.map((job, jobIndex) => {
                    const workOrders = job.workOrders || [];

                    return (
                        <tr onClick={() => hoverColorChange(jobIndex)} className={`${getJobIndex === jobIndex && "bg-green-600 bg-opacity-15"}`} key={jobIndex} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders?.map((wo, i) => (
                                    <div key={i}>{wo.factoryName || "-"}</div>
                                ))}
                            </td>
                            <td onClick={() => handleEditRowData(job.jobNo)} style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {job.jobNo || "NO JOB FOUND"}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders?.map((wo, i) => (
                                    <div key={i}>{wo.workOrderNo || "-"}</div>
                                ))}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) => (
                                    <div key={i}>{wo.styleRequirement?.buyerName || "-"}</div>
                                ))}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders.map((wo, i) => (
                                    <div key={i}>{wo.styleRequirement?.styleNo || "-"}</div>
                                ))}
                            </td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                {workOrders?.map((mon, i) => (
                                    <div key={i}>{mon.month || "-"}</div>
                                ))}
                            </td>

                            {/* COMPOSITION - Changed to inline span */}
                            <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
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