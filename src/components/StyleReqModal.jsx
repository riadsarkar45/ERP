import { X, Save } from 'lucide-react';
import Input from './Input';

const StyleReqModal = ({ handleShowModal, setShowModal }) => {



    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-md border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold uppercase text-gray-800">New Requirement</h2>
                        <button
                            onClick={() => setShowModal(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">



                        <div className='grid grid-cols-3 gap-3'>
                            <Input
                                label="Sales Contact"
                                type='text'
                                name="Sales Contact"
                                placeholder='Sales Contact'
                                required
                            />

                            <Input
                                label="Buyer Name"
                                type='text'
                                name="buyerName"
                                placeholder='Buyer Name'
                                required
                            />
                            <Input
                                label="Job No"
                                type='text'
                                name="Job No"
                                placeholder='Job No'
                                required
                            />

                            <Input
                                label="Composition"
                                type='text'
                                name="composition"
                                placeholder='Composition'
                                required
                            />
                            <Input
                                label="PO No"
                                type='text'
                                name="poNo"
                                placeholder='Po No'
                                required
                            />
                            <Input
                                label="Style No"
                                type='text'
                                name="styleNo"
                                placeholder='Style No'
                                required
                            />
                            <Input
                                label="Color"
                                type='text'
                                name="color"
                                placeholder='Color'
                                required
                            />
                            <Input
                                label="Finish Dia"
                                type='text'
                                name="finishDia"
                                placeholder='Finish Dia'
                                required
                            />
                            <Input
                                label="Order Qty"
                                type='text'
                                name="orderQty"
                                placeholder='Order Qty'
                                required
                            />
                            <Input
                                label="Finished Required Qty"
                                type='text'
                                name="finishRequiredQty"
                                placeholder='Finished Required Qty'
                                required
                            />
                            <Input
                                label="Process Loss"
                                type='text'
                                name="processLoss"
                                placeholder='Process Loss %'
                                required
                            />

                        </div>


                        <div className="flex flex-col sm:flex-row gap-3 mt-10 border-gray-200">
                            <button
                                type="submit"
                                // onClick={() => handleSubmit()}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                            >
                                <Save size={18} />
                                Insert
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </>
    );
};

export default StyleReqModal;
