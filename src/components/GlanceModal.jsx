import { RefreshCcw, X } from 'lucide-react';

const GlanceModal = ({ setShowModal, glanceReport, setGlanceReport, handleGlanceReport }) => {
    const jobs = glanceReport?.jobs || [];


    const YARN_TABLE_HEADERS = [
        'Yarn Delivery',
        'Excess Delivery',
        'Yarn Delivery %',
        'Yarn Return',
        'Yarn Received',
        'Yarn Received %',
        'Grey Delivery',
        'Grey Received',
        'Finish Received',
    ];

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in" />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-md border border-gray-200 w-full max-w-[95vw] max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold uppercase text-gray-800">At a Glance</h2>
                        <button
                            onClick={() => setGlanceReport({ ...glanceReport, showGlanceModal: false })}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>



                    {/* Content */}
                    <div className="p-2 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <div className="overflow-x-auto">
                            <button
                                onClick={() => handleGlanceReport()}
                                 className="flex items-center justify-center mb-2 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm p-2"
                            >
                                <RefreshCcw size={20} />
                            </button>
                            <table className="min-w-full border border-gray-300">
                                <thead>
                                    {/* Group Headers */}
                                    <tr className="bg-gray-100 border-b border-gray-300">
                                        <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r border-gray-300 bg-white sticky left-0 z-10">
                                            Job No
                                        </th>
                                        <th colSpan={4} className="px-4 py-2 text-center text-sm font-semibold text-blue-700 border-r border-gray-300 bg-blue-50">
                                            Work Order Qty
                                        </th>
                                        <th colSpan={10} className="px-4 py-2 text-center text-sm font-semibold text-green-700 border-r border-gray-300 bg-green-50">
                                            Delivery Qty
                                        </th>
                                    </tr>
                                    {/* Column Headers */}
                                    <tr className="bg-gray-50 border-b border-gray-300">
                                        {/* Work Order Headers */}
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Knitting Order</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Dyeing Order</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 border-r border-gray-200">AOP Order</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 border-r border-gray-300 bg-blue-100">Total</th>

                                        {/* Delivery Headers */}
                                        {YARN_TABLE_HEADERS.map((header) => (
                                            <th
                                                key={header}
                                                className="px-4 py-3 text-center text-xs font-medium text-gray-600 border-r border-gray-200"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map((job, index) => {

                                        return (
                                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-300 bg-white sticky left-0 z-10">
                                                    {job.jobNo || "-"}
                                                </td>

                                                {/* Work Order Data */}
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.workOrderQty?.knittingOrder || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.workOrderQty?.dyeingOrder || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.workOrderQty?.aopOrder || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-semibold text-blue-700 border-r border-gray-300 bg-blue-50">
                                                    {(job.workOrderQty?.total || 0).toLocaleString()}
                                                </td>

                                                {/* Delivery Data */}
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.deliveryQty?.totalByDeliveryType?.YarnDelivery || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(() => {
                                                        const diff = Number(job.workOrderQty?.knittingOrder) - Number(job.deliveryQty?.totalByDeliveryType?.YarnDelivery) || 0;
                                                        const isGreen = diff >= 0;
                                                        return (
                                                            <span className={isGreen ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                                {isGreen ? `(${Math.abs(diff)})` : Math.abs(diff)}
                                                            </span>
                                                        );
                                                    })()}
                                                    {/* yarn dev */}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(() => {
                                                        const orderQty = Number(job.workOrderQty?.knittingOrder) || 0;
                                                        const deliveredQty = Number(job.deliveryQty?.totalByDeliveryType?.YarnDelivery) || 0;
                                                        const percentage = orderQty > 0 ? ((deliveredQty / orderQty) * 100).toFixed(1) : '0.0';

                                                        return (
                                                            <div className="flex flex-col items-center">
                                                                {/* <span className={isGreen ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                                    {isGreen ? `(${Math.abs(diff)})` : Math.abs(diff)}
                                                                </span> */}
                                                                <span className="text-md text-black-400 font-extrabold ">
                                                                    {percentage}%
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                    {/* yarn dev */}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.deliveryQty?.totalByDeliveryType?.YarnReturn || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.deliveryQty?.totalByDeliveryType?.YarnReceived || 0).toLocaleString()}

                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(() => {
                                                        const orderQty = Number(job.deliveryQty?.totalByDeliveryType?.YarnDelivery) || 0;
                                                        const deliveredQty = Number(job.deliveryQty?.totalByDeliveryType?.YarnReceived) || 0;
                                                        const percentage = orderQty > 0 ? ((deliveredQty / orderQty) * 100).toFixed(1) : '0.0';

                                                        return (
                                                            <div className="flex flex-col items-center">
                                                                {/* <span className={isGreen ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                                    {isGreen ? `(${Math.abs(diff)})` : Math.abs(diff)}
                                                                </span> */}
                                                                <span className="text-md text-black-400 font-extrabold ">
                                                                    {percentage}%
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.deliveryQty?.totalByDeliveryType?.GreyDelivery || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.deliveryQty?.totalByDeliveryType?.GreyReceived || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700 border-r border-gray-200">
                                                    {(job.deliveryQty?.totalByDeliveryType?.FinishReceived || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-semibold text-green-700 border-r border-gray-300 bg-green-50">
                                                    {(job.deliveryQty?.total || 0).toLocaleString()}
                                                </td>


                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                @keyframes slide-in {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </>
    );
};

export default GlanceModal;