const Deliveries = ({ deliveries }) => {
    const rows = deliveries?.deliveries ?? [];
    const styleReq = deliveries?.workOrder?.styleRequirement;
    const yarnDyeingJobs = deliveries?.workOrder?.yarnDyeingJobs ?? [];
    console.log(deliveries, "deliveries from inside component");
    const totalDelivered = rows.filter(d => d.deliveryType === "Yarn Delivery").reduce((s, d) => s + d.deliveryQty, 0);
    const totalReturned = rows.filter(d => d.deliveryType === "Yarn Return").reduce((s, d) => s + d.deliveryQty, 0);

    const badge = (type) => {
        if (type === "Yarn Delivery") return "bg-green-50 text-green-700 border border-green-200";
        if (type === "Yarn Return") return "bg-red-50 text-red-600 border border-red-200";
        return "bg-sky-50 text-sky-600 border border-sky-200";
    };
    const dot = (type) => {
        if (type === "Yarn Delivery") return "bg-green-500";
        if (type === "Yarn Return") return "bg-red-500";
        return "bg-sky-400";
    };

    // Format ISO date → YYYY-MM-DD
    const fmtDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '—';

    return (
        <div className="border-b border-gray-100 shrink-0">

            {/* ── Info Strip ── */}
            <div className="grid grid-cols-5 border-b border-gray-100">
                {[
                    { label: 'Buyer', value: styleReq?.buyerName ?? '—', accent: true },
                    { label: 'Composition', value: deliveries?.composition ?? '—', small: true },
                    { label: 'Order Qty', value: deliveries?.orderQty ? `${Number(deliveries.orderQty).toLocaleString()} kg` : '—' },
                    { label: 'Work Order Qty', value: deliveries?.workOrderQty ? `${deliveries.workOrderQty} kg` : '—' },
                    { label: 'Process Loss', value: null, pill: `${styleReq?.processLoss ?? 0}%` },
                ].map((c, i) => (
                    <div key={i} className="px-4 py-3 border-r border-gray-100 last:border-r-0">
                        <span className="text-[9px] font-semibold tracking-[0.14em] text-gray-300 uppercase block mb-1">{c.label}</span>
                        {c.pill
                            ? <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">⚠ {c.pill}</span>
                            : <span className={`font-semibold ${c.small ? 'text-xs' : 'text-sm'} ${c.accent ? 'text-indigo-500' : 'text-slate-800'}`}>{c.value}</span>
                        }
                    </div>
                ))}
            </div>

            {/* ── Yarn Dyeing Jobs ── */}
            {yarnDyeingJobs.length > 0 && (
                <>
                    <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-[9px] font-semibold tracking-[0.16em] text-gray-300 uppercase">Yarn Booking</span>
                        <span className="text-[10px] text-gray-300">{yarnDyeingJobs.length} entries</span>
                    </div>
                    <div className="grid grid-cols-3 px-5 py-2 bg-gray-50 border-y border-gray-100">
                        {['Color', 'Composition', 'Qty'].map(h => (
                            <span key={h} className="text-[9px] font-semibold tracking-[0.1em] text-gray-300 uppercase">{h}</span>
                        ))}
                    </div>
                    {yarnDyeingJobs.map((y, i) => (
                        <div key={i} className="grid grid-cols-3 px-5 py-3 border-b border-gray-50 hover:bg-slate-50 transition-colors items-center">
                            <div className="text-xs font-semibold text-slate-800">{y.color}</div>
                            <div className="text-xs text-gray-400">{y.composition}</div>
                            <div className="text-[15px] font-bold text-slate-800">
                                {y.qty}<sub className="text-[9px] text-gray-300 font-normal ml-1">kg</sub>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ── Table Header ── */}
            <div className="flex items-center justify-between px-5 py-3">
                <span className="text-[9px] font-semibold tracking-[0.16em] text-gray-300 uppercase">Previous Delivery History</span>
                <span className="text-[10px] text-gray-300">{rows.length} entries</span>
            </div>

            {/* ── Column Headers ── 6 cols to match rows */}
            <div className="grid grid-cols-6 px-5 py-2 bg-gray-50 border-y border-gray-100">
                {['Qty', 'Date', 'Challan', 'Type', 'To', 'From'].map(h => (
                    <span key={h} className="text-[9px] font-semibold tracking-[0.1em] text-gray-300 uppercase">{h}</span>
                ))}
            </div>

            {/* ── Rows ── */}
            {rows.length === 0
                ? <div className="py-10 text-center text-[11px] tracking-widest text-gray-300 uppercase">No deliveries recorded</div>
                : rows.map((d, i) => (
                    <div key={i} className="grid grid-cols-6 px-5 py-3 border-b border-gray-50 hover:bg-slate-50 transition-colors items-center">
                        <div className="text-[15px] font-bold text-slate-800">
                            {d.deliveryQty}<sub className="text-[9px] text-gray-300 font-normal ml-1">kg</sub>
                        </div>
                        <div className="text-xs text-gray-400">{fmtDate(d.deliveryDate)}</div>
                        <div className="text-xs text-gray-400">{d.challanNo ?? '—'}</div>
                        <div>
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full ${badge(d.deliveryType)}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dot(d.deliveryType)}`} />
                                {d.deliveryType}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500">
                            <span className="text-[8px] text-gray-300 uppercase tracking-wider font-semibold block">To</span>
                            {d.toFactory ?? '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                            <span className="text-[8px] text-gray-300 uppercase tracking-wider font-semibold block">From</span>
                            {d.fromFactory ?? '—'}
                        </div>
                    </div>
                ))
            }

            {/* ── Stats ── */}
            <div className="flex bg-slate-50 border-t border-gray-100">
                <div className="px-5 py-3 border-r border-gray-100">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">Total Delivered</span>
                    <span className="text-sm font-bold text-green-600">{totalDelivered} kg</span>
                </div>
                <div className="px-5 py-3 border-r border-gray-100">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">Total Returned</span>
                    <span className="text-sm font-bold text-red-500">{totalReturned} kg</span>
                </div>
                <div className="px-5 py-3">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">Net Yarn</span>
                    <span className="text-sm font-bold text-slate-800">{totalDelivered - totalReturned} kg</span>
                </div>
            </div>
        </div>
    );
};

export default Deliveries;