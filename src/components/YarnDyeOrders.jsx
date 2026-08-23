const YarnDyeOrders = ({ orders, isEdit, updatedFields, handleOnChange, handleInlineEdit, handleEditRowData }) => {

    const cellClass = " cursor-pointer px-3 py-1.5 border-b border-gray-200 last:border-b-0";
    const compCellClass = "hover:bg-red-500/10 hover:text-red-500 cursor-pointer px-3 py-1.5 border-gray-200 last:border-b-0";

    // ---- FOOTER TOTALS ----
    const allCompositions =
        (orders || []).flatMap(job =>
            (job.workOrders || []).flatMap(w =>
                (w.compositions || []).map(c => ({ ...c, _workOrder: w }))
            )
        );

    const totals = allCompositions.reduce(
        (acc, c) => {
            const yarnJobs = (c._workOrder?.yarnDyeingJobs || []).filter(
                y => y.composition === c.composition
            );
            const bookingQty = yarnJobs.reduce((s, y) => s + (Number(y.qty) || 0), 0);

            acc.bookingQty += bookingQty;
            acc.workOrderQty += Number(c.yarnDeliveriesWithColor?.YarnDeliveryForYarnDye) || 0;
            acc.greyReceived += Number(c.greyReceived) || 0;
            acc.greyReturn += Number(c.greyReturn) || 0;
            acc.finishReceived += Number(c.finishReceived) || 0;
            acc.finishReturn += Number(c.finishReturn) || 0;
            return acc;
        },
        { bookingQty: 0, workOrderQty: 0, greyReceived: 0, greyReturn: 0, finishReceived: 0, finishReturn: 0 }
    );

    return (
        <>
            <tbody className="whitespace-nowrap">
                {orders?.map((job, jobIndex) => {

                    const compositions =
                        job.workOrders?.flatMap(w =>
                            (w.compositions || []).map(c => ({
                                ...c,
                                _workOrder: w,
                            }))
                        ) || [];

                    return (
                        <tr key={jobIndex} className="border-b border-gray-200">

                            {/* FACTORY NAME */}
                            <td>
                                {job.workOrders.map((wo, i) => (
                                    wo.factoryName === "NULL" ? (
                                        <div key={i} className={`${compCellClass} text-gray-500`}>-</div>
                                    ) : (
                                        <div key={i} onDoubleClick={() => handleInlineEdit(wo.id, wo.factoryName, "workOrder", "factoryName", 0)} className={`cursor-pointer`}>
                                            {isEdit.updatedFieldName === "factoryName" && isEdit.rowId === wo.id ? (
                                                <input type="text" name="factoryName" className="p-2 outline-none border rounded-md w-full" value={updatedFields.currentValue} onChange={(e) => handleOnChange(e)} />
                                            ) : <span onClick={() => handleEditRowData(wo.id)}>{wo.factoryName}</span>}
                                        </div>
                                    )
                                ))}
                            </td>
                            {/* JOB NO */}
                            <td className="border border-gray-200 px-3 py-1.5 text-sm align-top">
                                {job.jobNo}
                            </td>

                            {/* WORK ORDER NO */}
                            <td className="border border-gray-200 align-top">
                                {(job.workOrders || []).map((w, i) => (
                                    <div key={i} className={cellClass}>{w.workOrderNo}</div>
                                ))}
                            </td>

                            {/* BUYER NAME */}
                            <td className="border border-gray-200 align-top">
                                {(job.workOrders || []).map((w, i) => (
                                    <div key={i} className={cellClass}>
                                        {w.styleRequirement?.buyerName || "-"}
                                    </div>
                                ))}
                            </td>

                            {/* STYLE */}
                            <td className="border border-gray-200 align-top">
                                {(job.workOrders || []).map((w, i) => (
                                    <div key={i} className={cellClass}>{w.styleNo}</div>
                                ))}
                            </td>

                            {/* MONTH */}
                            <td className="border border-gray-200 align-top">
                                {(job.workOrders || []).map((w, i) => (
                                    <div key={i} className={cellClass}>{w.month}</div>
                                ))}
                            </td>

                            {/* COMPOSITION */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => (
                                    <div key={i} className={compCellClass}>{c.composition}</div>
                                ))}
                            </td>

                            {/* BOOKING COLOR */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => {
                                    const yarnJobs = (c._workOrder?.yarnDyeingJobs || []).filter(
                                        y => y.composition === c.composition
                                    );
                                    return (
                                        <div key={i} className={compCellClass}>
                                            {yarnJobs.length > 0
                                                ? yarnJobs.map((y, yi) => (
                                                    <div onClick={() => handleEditRowData(c.id, y.id)} key={yi} className="border-b border-gray-100 last:border-b-0 py-0.5">{y.color} y id {"=>"} {y.id}  </div>
                                                ))
                                                : "-"}

                                            booking color
                                        </div>
                                    );
                                })}
                            </td>

                            {/* SHADE (%) */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => (
                                    <div onClick={() => handleEditRowData(c.id, c.id)} key={i} className={compCellClass}>
                                        SHADE (%)
                                    </div>
                                ))}
                            </td>

                            {/* BOOKING QTY */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => {
                                    const yarnJobs = (c._workOrder?.yarnDyeingJobs || []).filter(
                                        y => y.composition === c.composition
                                    );
                                    return (
                                        <div key={i} className={compCellClass}>
                                            {yarnJobs.length > 0
                                                ? yarnJobs.map((y, yi) => (
                                                    <div onClick={() => handleEditRowData(c.id, y.id)} key={yi} className="border-b border-gray-100 last:border-b-0 py-0.5">
                                                        {y.qty}
                                                    </div>
                                                ))
                                                : "-"}
                                        </div>
                                    );
                                })}
                            </td>

                            {/* PRICE PER KG */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => (
                                    <div key={i} className={compCellClass}>{c.unitePrice}</div>
                                ))}
                            </td>

                            {/* WORK ORDER QTY */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => (
                                    <div key={i} className={compCellClass}>{c.yarnDeliveriesWithColor.YarnDeliveryForYarnDye || "NOT DELIVERED YET"}</div>
                                ))}
                            </td>

                            {/* GREY RECEIVED */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => (
                                    <div key={i} className={compCellClass}>{c.greyReceived || 0}</div>
                                ))}
                            </td>

                            {/* GREY RETURN */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => (
                                    <div key={i} className={compCellClass}>{c.greyReturn || 0}</div>
                                ))}
                            </td>

                            {/* FINISH RECEIVED */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => (
                                    <div key={i} className={compCellClass}>{c.finishReceived || 0}</div>
                                ))}
                            </td>

                            {/* FINISH RETURN */}
                            <td className="border border-gray-200 align-top">
                                {compositions.map((c, i) => (
                                    <div key={i} className={compCellClass}>{c.finishReturn || 0}</div>
                                ))}
                            </td>

                        </tr>
                    );
                })}
            </tbody>

            {/* FOOTER TOTALS ROW */}
            <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td colSpan={6} className="border border-gray-200 px-3 py-1.5 text-right text-sm">
                        TOTAL
                    </td>
                    <td className="border border-gray-200 px-3 py-1.5"></td>
                    <td className="border border-gray-200 px-3 py-1.5"></td>
                    <td className="border border-gray-200 px-3 py-1.5"></td>
                    <td className="border border-gray-200 px-3 py-1.5">{totals.bookingQty}</td>
                    <td className="border border-gray-200 px-3 py-1.5"></td>
                    <td className="border border-gray-200 px-3 py-1.5">{totals.workOrderQty}</td>
                    <td className="border border-gray-200 px-3 py-1.5">{totals.greyReceived}</td>
                    <td className="border border-gray-200 px-3 py-1.5">{totals.greyReturn}</td>
                    <td className="border border-gray-200 px-3 py-1.5">{totals.finishReceived}</td>
                    <td className="border border-gray-200 px-3 py-1.5">{totals.finishReturn}</td>
                </tr>
            </tfoot>
        </>
    );
};

export default YarnDyeOrders;