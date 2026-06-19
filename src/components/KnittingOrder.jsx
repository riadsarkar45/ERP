const KnittingOrder = ({ orders, handleEditRowData }) => {
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
                                    <div onClick={() => handleEditRowData(col.id)} key={`${i}-${j}`} style={{ marginRight: '6px', cursor: 'pointer' }}>
                                        {col.color || "NO COLOR FOUND"}
                                    </div>
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
                                        {unt.unitePrice || "NO PRICE FOUND"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* WORK ORDER QTY - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.workOrderQty || "NO WO QTY FOUND"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* TOTAL YARN DELIVERY - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} style={{ marginRight: '6px' }}>
                                        {wrk.totalYarnDelivery || "NOT DELIVERED YET"}
                                    </div>
                                ))
                            )}
                        </td>

                        {/* DIFFERENCE - Changed to inline span */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    const diff = wrk.workOrderQty - wrk.totalYarnDelivery;
                                    const exceeded = diff > 0;
                                    return (
                                        <div key={`${i}-${j}`} style={{ marginRight: '6px', color: exceeded ? "green" : "red", fontWeight: "bold" }}>
                                            {exceeded ? `(${Math.abs(diff)})` : Math.abs(diff)}
                                        </div>
                                    );
                                })
                            )}
                        </td>
                        {/* TOTAL YARN RETURN  */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                        {wrk.totalYarnReturn || <span>NOT YARN RETURNED   YET</span>}
                                    </div>
                                ))
                            )}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                        {wrk.greyReceived || <span>NO YARN RETURNED   YET</span>}
                                    </div>
                                ))
                            )}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => {
                                    // 1. Safe Math: Convert to numbers, fallback to 0 if missing to prevent "NaN"
                                    const grey = Number(wrk.greyReceived) || 0;
                                    const ret = Number(wrk.totalYarnReturn) || 0;
                                    const del = Number(wrk.totalYarnDelivery) || 0;

                                    const diff2 = grey + ret - del;
                                    const exceed = diff2 < 0;

                                    // 2. Set the color based on the condition
                                    const textColor = exceed ? "red" : "green";

                                    return (
                                        // 3. Changed back to <span> for perfect inline behavior
                                        <div
                                            key={`${i}-${j}`}
                                            className="grid grid-cols-1"
                                            style={{
                                                marginRight: '8px',
                                                whiteSpace: 'nowrap',
                                                color: textColor,
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {exceed ? `(${Math.abs(diff2)})` : diff2}
                                        </div>
                                    );
                                })
                            )}
                        </td>

                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                        {wrk.greyReceived * wrk.unitePrice || <span>NO PAYABLE AMOUNT IS SET YET</span>}
                                    </div>
                                ))
                            )}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                            {workOrders.map((wo, i) =>
                                wo.compositions?.map((wrk, j) => (
                                    <div key={`${i}-${j}`} className="" style={{ marginRight: '8px', whiteSpace: 'nowrap', display: 'inline-block' }}>
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