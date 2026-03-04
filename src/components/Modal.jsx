import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import Input from './Input';

const Modal = ({ order, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        workOrderPlaceDate: "",
        workOrderNo: "",
        month: "",
        salesContractNo: "",
        buyer: "",
        jobNo: "",
        poNo: "",
        style: "",
        color: "",
        composition: ""
    });

    useEffect(() => {
        if (order) {
            setFormData(order);
        }
    }, [order]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(formData);
    };

    const buyers = ["KIK", "LC WAIKIKI", "H&M", "ZARA", "UNIQLO"];
    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    const salesContracts = ["N/A", "SC-001", "SC-002", "SC-003"];

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div 
                    className="bg-white rounded-md border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-800">Edit Order</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Row 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input
                                    label="Work Order Place Date"
                                    name="workOrderPlaceDate"
                                    type="date"
                                    value={formData.workOrderPlaceDate}
                                    onChange={handleChange}
                                    required
                                />

                                <Input
                                    label="Work Order No"
                                    name="workOrderNo"
                                    type="text"
                                    value={formData.workOrderNo}
                                    onChange={handleChange}
                                    placeholder="Enter work order number"
                                    required
                                />

                                <Input
                                    label="Month"
                                    name="month"
                                    type="select"
                                    value={formData.month}
                                    onChange={handleChange}
                                    options={months}
                                    placeholder="Select Month"
                                    required
                                />
                            </div>

                            {/* Row 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input
                                    label="Sales Contract No"
                                    name="salesContractNo"
                                    type="select"
                                    value={formData.salesContractNo}
                                    onChange={handleChange}
                                    options={salesContracts}
                                    placeholder="Select Contract"
                                    required
                                />

                                <Input
                                    label="Buyer"
                                    name="buyer"
                                    type="select"
                                    value={formData.buyer}
                                    onChange={handleChange}
                                    options={buyers}
                                    placeholder="Select Buyer"
                                    required
                                />

                                <Input
                                    label="Job No"
                                    name="jobNo"
                                    type="text"
                                    value={formData.jobNo}
                                    onChange={handleChange}
                                    placeholder="e.g., SM26-3429/JAN"
                                    required
                                />
                            </div>

                            {/* Row 3 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input
                                    label="PO No"
                                    name="poNo"
                                    type="text"
                                    value={formData.poNo}
                                    onChange={handleChange}
                                    placeholder="e.g., P-264702"
                                    required
                                />

                                <Input
                                    label="Style"
                                    name="style"
                                    type="text"
                                    value={formData.style}
                                    onChange={handleChange}
                                    placeholder="e.g., WGR-538"
                                    required
                                />

                                <Input
                                    label="Color"
                                    name="color"
                                    type="text"
                                    value={formData.color}
                                    onChange={handleChange}
                                    placeholder="e.g., WHITE SWAN (12-0000 TCX)"
                                    required
                                />
                            </div>

                            {/* Row 4 */}
                            <div className="grid grid-cols-1 gap-6">
                                <Input
                                    label="Composition"
                                    name="composition"
                                    type="text"
                                    value={formData.composition}
                                    onChange={handleChange}
                                    placeholder="e.g., 95% CTN 5% ELASTANE S.J 175 GSM"
                                    required
                                />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="submit"
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                                >
                                    <Save size={18} />
                                    Update Order
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                                >
                                    <X size={18} />
                                    Cancel
                                </button>
                            </div>
                        </form>
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
