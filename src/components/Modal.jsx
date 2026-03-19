import { X, Save } from 'lucide-react';
import Input from './Input';

const Modal = ({ setIsEditing, handleSubmit, orderId, orders, editRowData, handleEditOnChange, setEditRowData }) => {

    const filterWorkOrderWithId = () => {
        const filt = orders.find(wo => wo.id === orderId);
        if (filt) {
            console.log(filt, 'filtered');
        } else {
            console.log("no data found");
        }
    }
    filterWorkOrderWithId();

    console.log(editRowData.editingField, "modal .jsx");

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
                onClick={() => setIsEditing(false)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-md border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold uppercase text-gray-800">Edit Order</h2>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {/* Row 1 */}
                        {
                            editRowData.editingField === "yarnReturnReceived" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Input
                                        label="Date"
                                        name="date"
                                        type="date"
                                        onChange={handleEditOnChange}
                                        required
                                    />

                                    <Input
                                        label="Challan No"
                                        name="challanNo"
                                        type="text"
                                        onChange={handleEditOnChange}
                                        value={editRowData.challan}

                                        placeholder="Enter Challan No"
                                        required
                                    />

                                    <Input
                                        label="Yarn Received Qty"
                                        name="yarnReturnReceived"
                                        type="text"
                                        onChange={handleEditOnChange}
                                        value={editRowData.yarnReturnReceived}
                                        placeholder="Qty"
                                        required
                                    />

                                </div>
                            )
                        }
                        {
                            editRowData.editingField === "greyReceivedFromYD" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Input
                                        label="Date"
                                        name="date"
                                        type="date"
                                        onChange={handleEditOnChange}
                                        required
                                    />

                                    <Input
                                        label="Challan No"
                                        name="challanNo"
                                        type="text"
                                        onChange={handleEditOnChange}
                                        value={editRowData.challan}

                                        placeholder="Enter Challan No"
                                        required
                                    />

                                    <Input
                                        label="Grey Received From YD"
                                        name="greyReceivedFromYD"
                                        type="text"
                                        onChange={handleEditOnChange}
                                        value={editRowData.greyReceivedFromYD}
                                        placeholder="greyReceivedFromYD"
                                        required
                                    />

                                </div>
                            )
                        }
                        {
                            editRowData.editingField === "yarnDeliveryForYD" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Input
                                        label="Date"
                                        name="date"
                                        type="date"
                                        onChange={handleEditOnChange}
                                        required
                                    />

                                    <Input
                                        label="Challan No"
                                        name="challanNo"
                                        type="text"
                                        onChange={handleEditOnChange}
                                        value={editRowData.challan}

                                        placeholder="Enter Challan No"
                                        required
                                    />

                                    <Input
                                        label="Yarn Delivery YD"
                                        name="yarnDeliveryForYD"
                                        type="text"
                                        onChange={handleEditOnChange}
                                        value={editRowData.yarnDeliveryForYD}
                                        placeholder="yarnDeliveryForYD"
                                        required
                                    />

                                </div>
                            )
                        }
                        {
                            editRowData.editingField === "finishYarnReceived" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Input
                                        label="Date"
                                        name="date"
                                        type="date"
                                        onChange={handleEditOnChange}
                                        required
                                    />

                                    <Input
                                        label="Challan No"
                                        name="challanNo"
                                        type="text"
                                        onChange={handleEditOnChange}
                                        value={editRowData.challan}

                                        placeholder="Enter Challan No"
                                        required
                                    />

                                    <Input
                                        label="Finish Yarn Received"
                                        name="finishYarnReceived"
                                        type="text"
                                        onChange={handleEditOnChange}
                                        value={editRowData.finishYarnReceived}
                                        placeholder="Finish Yarn Received"
                                        required
                                    />

                                </div>
                            )
                        }


                        {/* Row 2 */}
                        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input
                                    label="Sales Contract No"
                                    name="salesContractNo"
                                    type="text"

                                    onChange={handleEditOnChange}

                                    placeholder="Select Contract"
                                    required
                                />

                                <Input
                                    label="Buyer"
                                    name="buyer"
                                    type="text"
                                    onChange={handleEditOnChange}

                                    placeholder="Select Buyer"
                                    required
                                />

                                <Input
                                    label="Job No"
                                    name="jobNo"
                                    type="text"
                                    onChange={handleEditOnChange}
                                    placeholder="e.g., SM26-3429/JAN"
                                    required
                                />
                            </div> */}

                        {/* Row 3 */}
                        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input
                                    label="PO No"
                                    name="poNo"
                                    type="text"
                                    onChange={handleEditOnChange}
                                    placeholder="e.g., P-264702"
                                    required
                                />

                                <Input
                                    label="Style"
                                    name="style"
                                    type="text"
                                    onChange={handleEditOnChange}
                                    placeholder="e.g., WGR-538"
                                    required
                                />

                                <Input
                                    label="Color"
                                    name="color"
                                    type="text"
                                    onChange={handleEditOnChange}
                                    placeholder="e.g., WHITE SWAN (12-0000 TCX)"
                                    required
                                />
                            </div> */}
                        {/* row 4 */}
                        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input
                                    label="Yarn Delivery Y/D"
                                    name="yarnDelivery"
                                    type="text"
                                    onChange={handleEditOnChange}
                                    placeholder="e.g., P-264702"
                                    required
                                />

                                <Input
                                    label="Yarn Dyed Order Qty"
                                    name="orderQty"
                                    type="text"
                                    onChange={handleEditOnChange}
                                    placeholder="e.g., WGR-538"
                                    required
                                />

                                <Input
                                    label="Finish Yarn Received"
                                    name="finishYarnReceived"
                                    type="text"

                                    onChange={handleEditOnChange}
                                    placeholder="e.g., WHITE SWAN (12-0000 TCX)"
                                    required
                                />
                            </div> */}

                        {/* Row 5 */}
                        {/* <div className="grid grid-cols-1 gap-6">
                                <Input
                                    label="Composition"
                                    name="composition"
                                    type="text"
                                    onChange={handleEditOnChange}
                                    placeholder="e.g., 95% CTN 5% ELASTANE S.J 175 GSM"
                                    required
                                />
                            </div> */}

                        {/* Footer Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-10 border-gray-200">
                            <button
                                type="submit"
                                onClick={() => handleSubmit()}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                            >
                                <Save size={18} />
                                Update Order
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
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

export default Modal;
