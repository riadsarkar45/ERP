
const RequestedData = ({ byUser, requestedAt, workOrder }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow mb-3">
            {/* Header strip */}
            <div className={`flex pb-2 items-center justify-between px-4 py-2 border-b border-gray-200 rounded-t-lg`}>
                <div className="flex gap-1">
                    <h2 className="font-semibold text-blue-900">{workOrder.jobNo}</h2>
                    <h2 className="font-semibold text-blue-900">|</h2>
                    <h2 className="font-semibold text-blue-900">Requested By {"->"} {byUser.name}</h2>
                    <h2 className="font-semibold text-blue-900">|</h2>
                    <h2 className="font-semibold text-blue-900">Requested Date {"->"} {requestedAt}</h2>
                    {/* <h2 className="font-semibold text-blue-900">|</h2> */}
                    {/* <h2 className="font-semibold text-blue-900">Requested Type {"->"} {requestType}</h2> */}
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        WO#  {"->"} 
                    </span>
                    
                </div>
            </div>


            {/* Main details grid */}
            <div className="grid grid-cols-5 border-b pb-2 sm:grid-cols-4 gap-x-5 gap-y-3 p-4">
                <Field label="Factory" value={workOrder.factoryName} />
                <Field label="Stitch Length" value={workOrder.stichLength} />
                <Field label="Machine Dia" value={workOrder.machineDia} />
                <Field label="Lot No" value={workOrder.lotNo} />
                <Field label="Yarn Count" value={workOrder.yarnCount} />
            </div>

            {/* Compositions */}
            {workOrder.compositions?.length > 0 && (
                <div className="border-t border-gray-200 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Compositions
                    </p>
                    <div className="grid flex-wrap gap-3">
                        {workOrder.compositions.map((cmp, i) => (
                            <div key={i}>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                                    {cmp.composition} <span className="text-gray-400 ml-1"></span>
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                                    {cmp.workOrderQty} <span className="text-gray-400 ml-1">Work Order Qty</span>
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
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

export default RequestedData;