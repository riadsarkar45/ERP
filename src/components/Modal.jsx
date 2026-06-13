import { X, Save, Loader2 } from 'lucide-react';
import Input from './Input';
import Deliveries from './Deliveries';

const Modal = ({ setIsEditing, orderType, deliveriesLoading, isLoading, workOrderId, deliveries, handleSubmit, orderId, handleEditOnChange }) => {
    const deliveryTypes = [];
    // "Yarn Delivery", "Yarn Return", "Grey Received", "Grey Receive From Dyeing", "Finish Fabric Received", "Grey Delivery"

    if (orderType === "knittingOrder") {
        deliveryTypes.push("Yarn Delivery", "Yarn Return");
    }

    if (orderType === "dyeingOrder") {
        deliveryTypes.push("Grey Received", "Grey Delivery", "Grey Receive From Dyeing", "Finish Fabric Received", "Sent for Compacting", "Received From Compacting");
    }

    if (orderType === "aopOrder") {
        deliveryTypes.push("Sent for AOP", "Received from AOP", "Sent for Compacting", "Received From Compacting");
    }

    if (orderType === "yarnDyeingOrder") {
        deliveryTypes.push("Yarn Delivery For Yarn Dye", "Yarn Return From Yarn Dye", "Yarn Received From Yarn Dye", "Grey Recived", "Grey Return", "Finish Recived", "Finish Return");
    }
    return (
        <>
            <div className="fixed inset-0 bg-slate-500/30 z-50" onClick={() => setIsEditing(false)} />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="pointer-events-auto w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden bg-white border border-gray-200 shadow-xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>
                                Edit Order
                            </h2>
                            <span className="text-xs font-medium text-indigo-500 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                                WO #{workOrderId}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Scrollable body */}
                    <div className="overflow-y-auto flex-1 flex flex-col">

                        {
                            deliveriesLoading ? <div>
                                <span className='animate-spin'><Loader2 size={30} /></span>
                            </div> : <Deliveries deliveries={deliveries} workOrderId={workOrderId} />
                        }

                        {/* Form */}
                        <div className="px-6 py-5 shrink-0">
                            <span className="text-[10px] font-semibold tracking-[0.14em] text-gray-300 uppercase block mb-4">
                                Add New Delivery
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                                <Input label="Date" name="date" type="date" onChange={handleEditOnChange} required />
                                <Input label="Challan No" name="challanNo" type="text" onChange={handleEditOnChange} placeholder="CH-005" required />
                                <Input label="Delivery Qty" name="yarnDelivery" type="text" onChange={handleEditOnChange} placeholder="0 kg" required />
                                <Input label="Delivery Type" name="deliveryType" type="select" onChange={handleEditOnChange} options={deliveryTypes} required />
                                <Input label="To Factory" name="toFactory" type="text" onChange={handleEditOnChange} placeholder="Factory" required />
                                <Input label="From Factory" name="fromFactory" type="text" onChange={handleEditOnChange} placeholder="Factory" required />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-white shrink-0">
                        {
                            isLoading ? <button
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold tracking-wide transition-colors"
                            >
                                <Loader2 className='animate-spin' size={14} />
                            </button> : <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold tracking-wide transition-colors"
                            >
                                <Save size={14} /> Update Order
                            </button>
                        }
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-xs font-medium transition-colors"
                        >
                            <X size={14} /> Cancel
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Modal;