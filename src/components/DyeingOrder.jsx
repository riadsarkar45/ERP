
const DyeingOrder = ({ orders, handleEditRowData }) => {
    return (
        <tbody>
            {orders?.map((job, jobIndex) => {
                const workOrders = job.workOrders || [];
                return (
                    <tr key={jobIndex} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders?.map((wo, i) => (
                                <div key={i}>{wo.factoryName || "NO FACTORY FOUND"}</div>
                            ))}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {job.jobNo || "NO JOB FOUND"}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders?.map((wo, i) => (
                                <div key={i}>{wo.workOrderNo || "NO WORK ORDER FOUND"}</div>
                            ))}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) => (
                                <div key={i}>{wo.styleRequirement?.buyerName || "NO BUYER NAME FOUND"}</div>
                            ))}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) => (
                                <div key={i}>{wo.styleRequirement?.styleNo || "NO STYLE NO FOUND"}</div>
                            ))}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders?.map((mon, i) => (
                                <div key={i}>{mon.month || "NO MONTH NAME FOUND"}</div>
                            ))}
                        </td>

                        {/* COMPOSITION - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((comp, j) => (
                                    <span key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                        {comp.composition || "NO COMPOSITION FOUND"}
                                    </span>
                                ))
                            )}
                        </td>

                        {/* COLOR - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((col, j) => (
                                    <span onClick={() => handleEditRowData(col.id)} key={`${i}-${j}`} style={{ marginRight: '6px', cursor: 'pointer' }}>
                                        {col.color || "NO COLOR FOUND"}
                                    </span>
                                ))
                            )}
                        </td>

                        {/* ORDER QTY - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((ord, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {ord.orderQty || "NO QTY FOUND"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* UNIT PRICE - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((unt, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {unt.workOrderQty || "NO PRICE FOUND"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* WORK ORDER QTY - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.totalGreyDelivery || "NOT DELIVERED YET"}
                                    </div>
                                ))
                            )}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    const diff =  wrk.totalGreyDelivery - wrk.workOrderQty;
                                    const exceeded = diff > 0;
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
                                        {wrk.totalGreyReturnReceived || "NOT RETURNED YET"}
                                    </div>
                                ))
                            )}
                        </td>

                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.totalGreyReceivedFromDyeing || "NOT RECEIVED    YET"}
                                    </div>
                                ))
                            )}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.totalFinishFabricReceived || "NOT RECEIVED    YET"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* DIFFERENCE - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    const diff = wrk.workOrderQty - wrk.totalYarnDelivery;
                                    const exceeded = diff < 0;
                                    return (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px', color: exceeded ? "red" : "green", fontWeight: "bold" }}>
                                            {exceeded ? diff : `(${Math.abs(diff)})`}
                                        </div>
                                    );
                                })
                            )}
                        </td>

                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.unitePrice || "PRICE NOT SET YET"}
                                    </div>
                                ))
                            )}
                        </td>

                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.totalSentForCompacting || "NOT SENT YET"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* TOTAL YARN RETURN  */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', }}>
                                        {wrk.totalReceivedFromCompacting || "NOT SENT YET"}
                                    </div>
                                ))
                            )}
                        </td>
                        {/* TOTAL YARN RETURN  */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.totalGreyReceivedFromDyeing * wrk.unitePrice}

                                    </div>
                                ))
                            )}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                        {/* {wrk.greyReceived || <span>NO YARN RETURNED   YET</span>} */}
                                        PAYABLE AMOUNT
                                    </div>
                                ))
                            )}
                        </td>


                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                        {/* {wrk.greyReceived * wrk.unitePrice || <span>NO PAYABLE AMOUNT IS SET YET</span>} */}
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