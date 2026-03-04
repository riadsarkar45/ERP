import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import Input from "../../components/Input";
import Toast from "../../components/Toast";

const NewOrder = () => {
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const showNotification = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        try {
            const existingOrders = JSON.parse(localStorage.getItem('knittingOrders') || '[]');
            
            const newOrder = {
                id: Date.now(),
                ...formData,
                createdAt: new Date().toISOString()
            };
            
            existingOrders.push(newOrder);
            localStorage.setItem('knittingOrders', JSON.stringify(existingOrders));
            
            // Show success toast
            showNotification('Order created successfully!', 'success');
            
            // Reset form
            setFormData({
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
            
            // Navigate after toast
            setTimeout(() => {
                navigate('/dashboard/knitting-order');
            }, 1500);
        } catch (error) {
            showNotification('Failed to create order. Please try again.', 'error');
        }
    };

    const buyers = ["KIK", "LC WAIKIKI", "H&M", "ZARA", "UNIQLO"];
    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    const salesContracts = ["N/A", "SC-001", "SC-002", "SC-003"];

    return (
        <DashboardLayout title="Add New Order">
            {showToast && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setShowToast(false)}
                    duration={3000}
                />
            )}
            
            <div className="bg-white rounded-md border border-gray-200 p-6 md:p-8">
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

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                        >
                            <Save size={18} />
                            Create Order
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/knitting-order')}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                        >
                            <X size={18} />
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default NewOrder;
