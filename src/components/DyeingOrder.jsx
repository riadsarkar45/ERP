import { useState, useMemo } from "react";

const DyeingOrder = ({ 
    orders, 
    handleInlineEdit, 
    handleRedirect, 
    updatedFields, 
    handleOnChange, 
    isEdit, 
    handleEditRowData, 
    FROZEN_COUNT, 
    currentFrozenWidths, 
    currentFrozenLefts,
    searchTerm = "" 
}) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const cellPad = "py-2 px-3";

    const baseTd = {
        borderRight: "1px solid #000000",
        borderBottom: "1px solid #000000",
        padding: 0,
        textAlign: "center",
        verticalAlign: "top",
    };

    const dataTd = { ...baseTd };

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

    // Helper function to get finish dia from styleRequirement
    const getFinishDia = (wo, comp) => {
        if (!wo?.styleRequirement?.rows || !comp) return "-";
        
        const matchingRow = wo.styleRequirement.rows.find(row => 
            row.composition === comp.composition && 
            row.color === comp.color
        );
        
        return matchingRow?.finishDia || "-";
    };

    const totals = useMemo(() => {
        const acc = {
            orderQty: 0,
            workOrderQty: 0,
            totalGreyDelivery: 0,
            shortExcess: 0,
            greyReturn: 0,
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
                    const workOrderQty = Number(comp.workOrderQty) || 0;
                    const totalGreyDelivery = Number(comp.yarnDeliveriesWithColor?.GreyDelivery) || 0;
                    const greyReturnReceived = Number(comp.yarnDeliveriesWithColor?.GreyReturn) || 0;
                    const greyReceived = Number(comp.yarnDeliveriesWithColor?.GreyReceived) || 0;
                    const finishReceived = Number(comp.yarnDeliveriesWithColor?.FinishReceived) || 0;
                    const unitePrice = Number(comp.unitePrice) || 0;
                    const sentForCompacting = Number(comp.yarnDeliveriesWithColor?.SentForCompacting) || 0;
                    const receivedFromCompacting = Number(comp.yarnDeliveriesWithColor?.ReceivedFromCompacting) || 0;

                    acc.workOrderQty += workOrderQty;
                    acc.totalGreyDelivery += totalGreyDelivery;
                    acc.shortExcess += totalGreyDelivery - workOrderQty;
                    acc.greyReturn += greyReturnReceived;
                    acc.greyReceived += greyReceived;
                    acc.finishReceived += finishReceived;
                    acc.finishVsGreyDiff += greyReceived + greyReturnReceived - totalGreyDelivery;
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
        textAlign: "center",
    };

    const footerTd = {
        border: "1px solid #000000",
        padding: "8px 12px",
        textAlign: "center",
        verticalAlign: "middle",
        fontWeight: 700,
        backgroundColor: "#f3f4f6",
    };

    // Filter orders based on search term
    const filteredOrders = useMemo(() => {
        if (!searchTerm?.trim()) return orders || [];
        
        const lowerSearch = searchTerm.toLowerCase();
        
        return (orders || []).map(job => {
            const filteredWorkOrders = (job.workOrders || []).map(wo => {
                const filteredComps = (wo.compositions || []).filter(comp => {
                    const searchableValues = [
                        job?.jobNo,
                        wo?.factoryName,
                        wo?.workOrderNo,
                        wo?.styleRequirement?.buyerName,
                        wo?.styleRequirement?.styleNo,
                        wo?.month,
                        comp?.composition,
                        comp?.color,
                        wo?.yarnCount,
                        wo?.lotNo,
                        comp?.workOrderQty,
                    ].map(val => String(val || "").toLowerCase());
                    
                    return searchableValues.some(val => val.includes(lowerSearch));
                });
                
                return { ...wo, compositions: filteredComps };
            }).filter(wo => wo.compositions.length > 0);
            
            return { ...job, workOrders: filteredWorkOrders };
        }).filter(job => job.workOrders.length > 0);
    }, [orders, searchTerm]);

    // ── Flatten jobs -> workOrders -> compositions ──
    const flatRows = useMemo(() => {
        const out = [];
        (filteredOrders || []).forEach((job, jobIndex) => {
            const workOrders = job.workOrders || [];
            const jobCompCount = workOrders.reduce(
                (sum, wo) => sum + (wo.compositions?.length || 1),
                0
            ) || 1;
            let jobRowSeen = false;

            if (workOrders.length === 0) {
                out.push({
                    jobIndex, job, wo: null, comp: null,
                    isFirstOfJob: true, jobRowSpan: 1,
                    isFirstOfWo: true, woRowSpan: 1,
                });
                return;
            }

            workOrders.forEach((wo) => {
                const comps = wo.compositions && wo.compositions.length > 0 ? wo.compositions : [null];
                comps.forEach((comp, compIndex) => {
                    out.push({
                        jobIndex, job, wo, comp,
                        isFirstOfJob: !jobRowSeen,
                        jobRowSpan: jobCompCount,
                        isFirstOfWo: compIndex === 0,
                        woRowSpan: comps.length,
                    });
                    jobRowSeen = true;
                });
            });
        });
        return out;
    }, [filteredOrders]);

    return (
        <>
            <tbody>
                {flatRows.map((r, rowIndex) => {
                    const { job, wo, comp, isFirstOfJob, jobRowSpan, isFirstOfWo, woRowSpan, jobIndex } = r;
                    const isHovered = hoveredIndex === jobIndex;

                    const greyDelivery = Number(comp?.yarnDeliveriesWithColor?.GreyDelivery) || 0;
                    const workOrderQtyNum = Number(comp?.workOrderQty) || 0;
                    const shortDiff = greyDelivery - workOrderQtyNum;
                    const shortExceeded = shortDiff?.toFixed(2) > 0;

                    const greyReceivedNum = Number(comp?.yarnDeliveriesWithColor?.GreyReceived) || 0;
                    const greyReturnNum = Number(comp?.yarnDeliveriesWithColor?.GreyReturn) || 0;
                    const rcvdDiff = greyReceivedNum + greyReturnNum - greyDelivery;
                    const rcvdExceeded = rcvdDiff?.toFixed(2) < 0;

                    const unitePriceNum = Number(comp?.unitePrice) || 0;
                    const payableAmount = (greyReceivedNum * unitePriceNum).toFixed(2);

                    const currentFinishDia = getFinishDia(wo, comp);

                    return (
                        <tr 
                            key={rowIndex} 
                            onMouseEnter={() => setHoveredIndex(jobIndex)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* MONTH (per work order) */}
                            {isFirstOfWo && (
                                <td style={stickyTd(0, isHovered)} rowSpan={woRowSpan}>
                                    <div className={cellPad}>{wo?.month || "-"}</div>
                                </td>
                            )}

                            {/* FACTORY NAME (per work order) */}
                            {isFirstOfWo && (
                                <td style={stickyTd(1, isHovered)} rowSpan={woRowSpan}>
                                    {!wo || wo.factoryName === "NULL" ? (
                                        <div className={`${cellPad} text-gray-500`}>-</div>
                                    ) : (
                                        <div onDoubleClick={() => handleInlineEdit(wo.id, wo.factoryName, "workOrder", "factoryName", 0)} className={`${cellPad} cursor-pointer`}>
                                            {isEdit.updatedFieldName === "factoryName" && isEdit.rowId === wo.id ? (
                                                <input type="text" name="factoryName" className="p-2 outline-none border rounded-md w-full" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                            ) : <span onClick={() => handleEditRowData(wo.id)}>{wo.factoryName}</span>}
                                        </div>
                                    )}
                                </td>
                            )}

                            {/* WORK ORDER NO (per work order) */}
                            {isFirstOfWo && (
                                <td style={stickyTd(2, isHovered)} rowSpan={woRowSpan}>
                                    <div className={cellPad}>{wo?.workOrderNo || "-"}</div>
                                </td>
                            )}

                            {/* BUYER NAME (per work order) */}
                            {isFirstOfWo && (
                                <td style={stickyTd(3, isHovered)} rowSpan={woRowSpan}>
                                    <div className={cellPad}>{wo?.styleRequirement?.buyerName || "-"}</div>
                                </td>
                            )}

                            {/* JOB NO (per job) */}
                            {isFirstOfJob && (
                                <td style={stickyTd(4, isHovered)} rowSpan={jobRowSpan}>
                                    <div onDoubleClick={() => handleRedirect(job.jobNo)} className={cellPad}>{job.jobNo || "NO JOB FOUND"}</div>
                                </td>
                            )}

                            {/* STYLE NO (per work order) */}
                            {isFirstOfWo && (
                                <td style={stickyTd(5, isHovered)} rowSpan={woRowSpan}>
                                    <div className={cellPad}>{wo?.styleRequirement?.styleNo || "-"}</div>
                                </td>
                            )}

                            {/* COLOR (per composition) */}
                            <td style={stickyTd(6, isHovered)}>
                                <div onClick={() => handleEditRowData(comp?.id)} className={cellPad} style={{ cursor: "pointer" }}>
                                    {comp?.color || "-"}
                                </div>
                            </td>

                            {/* COMPOSITION (per composition) */}
                            <td style={stickyTd(7, isHovered)}>
                                <div className={cellPad}>{comp?.composition || "-"}</div>
                            </td>

                            {/* FINISH DIA (per composition) - FIXED: uses getFinishDia */}
                            <td style={dataTd}>
                                <div className={cellPad}>{currentFinishDia}</div>
                            </td>

                            {/* YARN COUNT (per work order) */}
                            {isFirstOfWo && (
                                <td style={dataTd} rowSpan={woRowSpan}>
                                    {!wo || wo.yarnCount === "NULL" ? (
                                        <div className={`${cellPad} text-black`}>-</div>
                                    ) : (
                                        <div onDoubleClick={() => handleInlineEdit(wo.id, wo.yarnCount, "workOrder", "yarnCount", 0)} className={`${cellPad} cursor-pointer`}>
                                            {isEdit.updatedFieldName === "yarnCount" && isEdit.rowId === wo.id ? (
                                                <input type="text" name="yarnCount" className="p-2 outline-none border rounded-md w-full" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                            ) : <span>{wo.yarnCount}</span>}
                                        </div>
                                    )}
                                </td>
                            )}

                            {/* YARN LOT (per work order) */}
                            {isFirstOfWo && (
                                <td style={dataTd} rowSpan={woRowSpan}>
                                    {!wo || wo.lotNo === "NULL" ? (
                                        <div className={`${cellPad} text-black`}>-</div>
                                    ) : (
                                        <div onDoubleClick={() => handleInlineEdit(wo.id, wo.lotNo, "workOrder", "lotNo", 0)} className={`${cellPad} cursor-pointer`}>
                                            {isEdit.updatedFieldName === "lotNo" && isEdit.rowId === wo.id ? (
                                                <input type="text" name="lotNo" className="p-2 outline-none border rounded-md w-full" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                            ) : <span>{wo.lotNo}</span>}
                                        </div>
                                    )}
                                </td>
                            )}

                            {/* STICH LENGTH (per work order) */}
                            {isFirstOfWo && (
                                <td style={dataTd} rowSpan={woRowSpan}>
                                    {!wo || wo.stichLength === "NULL" ? (
                                        <div className={`${cellPad} text-black`}>-</div>
                                    ) : (
                                        <div onDoubleClick={() => handleInlineEdit(wo.id, wo.stichLength, "workOrder", "stichLength", 0)} className={`${cellPad} cursor-pointer`}>
                                            {isEdit.updatedFieldName === "stichLength" && isEdit.rowId === wo.id ? (
                                                <input type="text" name="stichLength" className="p-2 outline-none border rounded-md w-full" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                            ) : <span>{wo.stichLength}</span>}
                                        </div>
                                    )}
                                </td>
                            )}

                            {/* MACHINE DIA (per work order) */}
                            {isFirstOfWo && (
                                <td style={dataTd} rowSpan={woRowSpan}>
                                    {!wo || wo.machineDia === "NULL" ? (
                                        <div className={`${cellPad} text-black`}>-</div>
                                    ) : (
                                        <div onDoubleClick={() => handleInlineEdit(wo.id, wo.machineDia, "workOrder", "machineDia", 0)} className={`${cellPad} cursor-pointer`}>
                                            {isEdit.updatedFieldName === "machineDia" && isEdit.rowId === wo.id ? (
                                                <input type="text" name="machineDia" className="p-2 outline-none border rounded-md w-full" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                            ) : <span>{wo.machineDia}</span>}
                                        </div>
                                    )}
                                </td>
                            )}

                            {/* SHADE % (per work order) */}
                            {isFirstOfWo && (
                                <td style={dataTd} rowSpan={woRowSpan}>
                                    {!wo || wo.shade === "NULL" ? (
                                        <div className={`${cellPad} text-black`}>-</div>
                                    ) : (
                                        <div onDoubleClick={() => handleInlineEdit(wo.id, wo.shade, "workOrder", "shade", 0)} className={`${cellPad} cursor-pointer`}>
                                            {isEdit.updatedFieldName === "shade" && isEdit.rowId === wo.id ? (
                                                <input type="text" name="shade" className="p-2 outline-none border rounded-md w-full" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                            ) : <span>{wo.shade}</span>}
                                        </div>
                                    )}
                                </td>
                            )}

                            {/* WORK ORDER QTY (per composition) */}
                            <td style={dataTd}>
                                <div onDoubleClick={() => wo && handleInlineEdit(wo.id, comp?.workOrderQty, "workOrder", "workOrderQty", comp?.id)} className={`${cellPad} cursor-pointer`}>
                                    {isEdit.updatedFieldName === "workOrderQty" && isEdit.compId === comp?.id ? (
                                        <input type="text" className="p-2 outline-none border rounded-md w-full" name="workOrderQty" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                    ) : comp?.workOrderQty?.toFixed(2) || "-"}
                                </div>
                            </td>

                            {/* GREY DELIVERY (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>{comp?.yarnDeliveriesWithColor?.GreyDelivery?.toFixed(2) || "-"}</div>
                            </td>

                            {/* DEL SHORT & EXCESS (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad} style={{ color: shortExceeded ? "red" : "green", fontWeight: "bold" }}>
                                    {shortExceeded ? shortDiff?.toFixed(2) : `(${Math.abs(shortDiff?.toFixed(2))})`}
                                </div>
                            </td>

                            {/* GREY RETURN (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>{comp?.yarnDeliveriesWithColor?.GreyReturn?.toFixed(2) || "-"}</div>
                            </td>

                            {/* GREY RECEIVED (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>{comp?.yarnDeliveriesWithColor?.GreyReceived?.toFixed(2) || "-"}</div>
                            </td>

                            {/* FINISH RECEIVED (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>{comp?.yarnDeliveriesWithColor?.FinishReceived?.toFixed(2) || "-"}</div>
                            </td>

                            {/* RCVD SHORT & EXCESS (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad} style={{ color: rcvdExceeded ? "red" : "green", fontWeight: "bold" }}>
                                    {rcvdExceeded ? Math.abs(rcvdDiff?.toFixed(2)) : `(${Math.abs(rcvdDiff?.toFixed(2))})`}
                                </div>
                            </td>

                            {/* UNIT PRICE (per composition) */}
                            <td style={dataTd}>
                                <div onDoubleClick={() => handleInlineEdit(comp?.id, comp?.unitePrice, "workOrder", "unitePrice", comp?.id)} className={`${cellPad} cursor-pointer`}>
                                    {isEdit.updatedFieldName === "unitePrice" && isEdit.rowId === comp?.id ? (
                                        <input type="text" className="p-2 outline-none border rounded-md w-full" name="unitePrice" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                    ) : comp?.unitePrice?.toFixed(2) || "-"}
                                </div>
                            </td>

                            {/* TOTAL SENT FOR COMPACTING (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>{comp?.yarnDeliveriesWithColor?.SentForCompacting?.toFixed(2) || "-"}</div>
                            </td>

                            {/* TOTAL RECEIVED FROM COMPACTING (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>{comp?.yarnDeliveriesWithColor?.ReceivedFromCompacting?.toFixed(2) || "-"}</div>
                            </td>

                            {/* TOTAL BILLING / PAYABLE AMOUNT (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>{payableAmount !== "0.00" ? payableAmount : "-"}</div>
                            </td>

                            {/* PAYABLE AMOUNT placeholder (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>-</div>
                            </td>

                            {/* PENDING BILLING AMOUNT placeholder (per composition) */}
                            <td style={dataTd}>
                                <div className={cellPad}>-</div>
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
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>{totals?.workOrderQty?.toFixed(2)}</td>
                    <td style={footerTd}>{totals?.totalGreyDelivery?.toFixed(2)}</td>
                    <td style={{ ...footerTd, color: totals?.shortExcess > 0 ? "red" : "green" }}>
                        {totals?.shortExcess > 0 ? totals?.shortExcess?.toFixed(2) : `(${Math.abs(totals?.shortExcess?.toFixed(2))})`}
                    </td>
                    <td style={footerTd}>{totals?.greyReturn?.toFixed(2)}</td>
                    <td style={footerTd}>{totals?.greyReceived?.toFixed(2)}</td>
                    <td style={footerTd}>{totals?.finishReceived?.toFixed(2)}</td>
                    <td style={{ ...footerTd, color: totals?.finishVsGreyDiff < 0 ? "red" : "green" }}>
                        {totals.finishVsGreyDiff < 0 ? Math.abs(totals.finishVsGreyDiff?.toFixed(2)) : `(${Math.abs(totals.finishVsGreyDiff.toFixed(2))})`}
                    </td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>{totals?.sentForCompacting?.toFixed(2)}</td>
                    <td style={footerTd}>{totals?.receivedFromCompacting?.toFixed(2)}</td>
                    <td style={footerTd}>{totals?.greyReceivedValue?.toFixed(2)}</td>
                    <td style={footerTd}>-</td>
                    <td style={footerTd}>-</td>
                </tr>
            </tfoot>
        </>
    );
};

export default DyeingOrder;