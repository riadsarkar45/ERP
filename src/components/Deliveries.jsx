const Deliveries = ({ deliveries }) => {
    const rows = deliveries?.deliveries ?? [];
    const totalDelivered = rows.filter(d => d.deliveryType === "Yarn Delivery").reduce((s, d) => s + d.deliveryQty, 0);
    const totalReturned  = rows.filter(d => d.deliveryType === "Yarn Return").reduce((s, d) => s + d.deliveryQty, 0);

    const badge = (type) => {
        if (type === "Yarn Delivery") return "bg-green-50 text-green-700 border border-green-200";
        if (type === "Yarn Return")   return "bg-red-50 text-red-600 border border-red-200";
        return "bg-gray-100 text-gray-500 border border-gray-200";
    };
    const dot = (type) => {
        if (type === "Yarn Delivery") return "bg-green-500";
        if (type === "Yarn Return")   return "bg-red-500";
        return "bg-gray-400";
    };

    return (
        <div className="border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between px-6 py-3">
                <span className="text-[10px] font-semibold tracking-[0.14em] text-gray-300 uppercase">Previous Delivery History</span>
                <span className="text-[10px] text-gray-300">{rows.length} entries</span>
            </div>

            {/* Col headers */}
            <div className="grid grid-cols-6 px-6 py-2 bg-gray-50 border-y border-gray-100">
                {["Qty", "Date", "Challan", "Type", "To", "From"].map(h => (
                    <span key={h} className="text-[9px] font-semibold tracking-[0.12em] text-gray-300 uppercase">{h}</span>
                ))}
            </div>

            {rows.length === 0 ? (
                <div className="py-10 text-center text-xs tracking-widest text-gray-300 uppercase">No deliveries recorded</div>
            ) : rows.map((d, i) => (
                <div key={i} className="grid grid-cols-6 px-6 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center">
                    <div className="text-[15px] font-semibold text-gray-800">
                        {d.deliveryQty}<span className="text-[9px] text-gray-300 ml-1 font-normal">kg</span>
                    </div>
                    <div className="text-xs text-gray-400">{d.deliveryDate ?? "—"}</div>
                    <div className="text-xs text-gray-400">{d.challanNo ?? "—"}</div>
                    <div>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-semibold tracking-wide uppercase px-2 py-1 rounded-full ${badge(d.deliveryType)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dot(d.deliveryType)}`} />
                            {d.deliveryType}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500">
                        <span className="text-[8px] text-gray-300 uppercase tracking-wider block">To</span>
                        {d.toFactory ?? "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                        <span className="text-[8px] text-gray-300 uppercase tracking-wider block">From</span>
                        {d.fromFactory ?? "—"}
                    </div>
                </div>
            ))}

            {/* Stats */}
            <div className="flex bg-gray-50 border-t border-gray-100">
                <div className="px-5 py-3 border-r border-gray-100">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">Total Delivered</span>
                    <span className="text-sm font-semibold text-green-600">{totalDelivered} kg</span>
                </div>
                <div className="px-5 py-3 border-r border-gray-100">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">Total Returned</span>
                    <span className="text-sm font-semibold text-red-500">{totalReturned} kg</span>
                </div>
                <div className="px-5 py-3">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">Net Yarn</span>
                    <span className="text-sm font-semibold text-gray-700">{totalDelivered - totalReturned} kg</span>
                </div>
            </div>
        </div>
    );
};

export default Deliveries;