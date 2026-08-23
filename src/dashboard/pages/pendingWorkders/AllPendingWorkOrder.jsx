const AllPendingWorkOrder = ({ compositions, lotNo, jobNo, workOrderNo, styleRequirement, factoryName, stichLength, machineDia, yarnCount }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow mb-3">
            {/* Header strip */}
            <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-gray-200 rounded-t-lg">
                <div className="flex gap-1">
                    <h2 className="font-semibold text-blue-900">{styleRequirement?.buyerName}</h2>
                    <h2 className="font-semibold text-blue-900">|</h2>
                    <h2 className="font-semibold text-blue-900">{jobNo}</h2>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        WO# {workOrderNo}
                    </span>
                    <span className="text-xs bg-gray-500 font-medium bg-opacity-30 p-2 rounded-md disabled cursor-not-allowed text-gray-700 uppercase tracking-wide">
                        Download Pdf
                    </span>
                </div>
            </div>

            {/* Main details grid */}
            <div className="grid grid-cols-5 sm:grid-cols-4 gap-x-4 gap-y-3 p-4">
                <Field label="Factory" value={factoryName} />
                <Field label="Stitch Length" value={stichLength} />
                <Field label="Machine Dia" value={machineDia} />
                <Field label="Lot No" value={lotNo} />
                <Field label="Yarn Count" value={yarnCount} />
            </div>

            {/* Compositions */}
            {compositions?.length > 0 && (
                <div className="border-t border-gray-200 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Compositions
                    </p>
                    <div className="grid flex-wrap gap-3">
                        {compositions.map((cmp, i) => (
                            <div>
                                <span
                                    key={i}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                                >
                                    {cmp.composition} <span className="text-gray-400 ml-1"></span>
                                </span>
                                <span
                                    key={i}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                                >
                                    {cmp.workOrderQty} <span className="text-gray-400 ml-1">Work Order Qty</span>
                                </span>
                                <span
                                    key={i}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                                >
                                    {cmp.unitePrice} <span className="text-gray-400 ml-1">unit price</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Field = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value ?? '-'}</p>
    </div>
);

export default AllPendingWorkOrder;