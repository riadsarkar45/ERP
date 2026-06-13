const YarnDyeOrders = ({ orders, handleEditRowData }) => {

    const cellClass = " cursor-pointer px-3 py-1.5 border-b border-gray-200 last:border-b-0";
    const compCellClass = "hover:bg-red-500/10 hover:text-red-500 cursor-pointer px-3 py-1.5 border-b border-gray-200 last:border-b-0";

    return (
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
                        <td className="border border-gray-200 align-top">
                            {(job.workOrders || []).map((w, i) => (
                                <div key={i} className={cellClass}>
                                    {w.factoryName || w.workOrderPlaceDate || "-"}
                                </div>
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
                                                <div key={yi} className="border-b border-gray-100 last:border-b-0 py-0.5">{y.color}</div>
                                            ))
                                            : "-"}
                                    </div>
                                );
                            })}
                        </td>

                        {/* ORDER QTY */}
                        <td className="border border-gray-200 align-top">
                            {compositions.map((c, i) => (
                                <div onClick={() => handleEditRowData(c.id, c.id)} key={i} className={compCellClass}>
                                    {c.orderQty}
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
                                                <div onClick={() => handleEditRowData(c.id, c.id)} key={yi} className="border-b border-gray-100 last:border-b-0 py-0.5">
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
                                <div key={i} className={compCellClass}>{c.workOrderQty}</div>
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
    );
};

export default YarnDyeOrders;