import { useEffect, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import Input from "../../components/Input";
import Toast from "../../components/Toast";
import useAxiosPublic from "../../hooks/Axios";
import { useParams } from "react-router-dom";

const NewOrder = () => {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const [isClicked, setIsClicked] = useState(false)
    const { jobNumber } = useParams();
    const [styleData, setStyleData] = useState([]);
    const [rows, setRows] = useState([]);
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
        composition: "",
        processLoss: "",
        orderType: "",
        factoryName: "",
        orderQTY: "",
    });
    const axios = useAxiosPublic();

    useEffect(() => {
        const styleReq = async () => {
            if (!jobNumber) return;
            const req = await axios.get(`/api/styles/${jobNumber}`)
            setStyleData(req.data.data);
            console.log(req.data.data);
            setRows(req.data.data[0]?.rows || []);
        }
        if (styleData.length === 0) styleReq();

    })

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
    const handleRemoveRow = (index) => {
        setRows(prev => prev.filter((_, i) => i !== index));
    };
    console.log(formData, "formdata");
    const handleSubmit = async (e) => {
        console.log("clicked...");
        setIsClicked(true)
        e.preventDefault();

        try {
            const res = await axios.post("/api/create-new-order", formData)
            console.log(res.data);
            if (res.data.type === "success") {
                showNotification("Order created", "success")
                setIsClicked(false)
            }
        } catch (error) {
            console.log(error);
            showNotification('Failed to create order. Please try again.', 'error');
            setIsClicked(false)

        }
    };




    const dyeingOrderType = ["knittingOrder", "aopOrder", "fabricBookingOrder", "masterDyeingOrder", "yarnDyeingOrder"];

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
                {
                    styleData?.map((style, i) => {
                        return (
                            <form key={i} onSubmit={handleSubmit} className="space-y-6">
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
                                        type="text"
                                        value={formData.month}
                                        onChange={handleChange}
                                        placeholder="Select Month"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <Input
                                        label="Job No"
                                        name="jobNo"
                                        readOnly
                                        value={style.jobNo}
                                        onChange={handleChange}
                                        placeholder="e.g., SM26-3429/JAN"
                                        required
                                    />
                                    <Input
                                        label={"Process Loss"}
                                        name={"processLoss"}
                                        value={style.processLoss}
                                        readOnly
                                        onChange={handleChange}
                                        required
                                        placeholder="Wastage %"
                                    />
                                    <Input
                                        label={"Order Type"}
                                        name={"orderType"}
                                        value={formData.orderType}
                                        type="select"
                                        onChange={handleChange}
                                        required
                                        placeholder="Order Type"
                                        options={dyeingOrderType}
                                    />

                                </div>

                                {
                                    rows.map((styleRow, index) => {
                                        return (
                                            <div key={index} className="grid grid-cols-5 gap-6 items-center">
                                                <Input
                                                    label={`Composition ${index + 1}`}
                                                    name="color"
                                                    readOnly
                                                    value={styleRow.composition}
                                                    onChange={handleChange}
                                                    placeholder="e.g., SM26-3429/JAN"
                                                    required
                                                />
                                                <Input
                                                    label={`Color ${index + 1}`}
                                                    name={"Color"}
                                                    value={styleRow.color}
                                                    readOnly
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="Wastage %"
                                                />
                                                <Input
                                                    label={`Order Qty ${index + 1}`}
                                                    name={"orderQty"}
                                                    value={styleRow.orderQty}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="Order Type"
                                                />
                                                <Input
                                                    label={`Work Order Qty ${index + 1}`}
                                                    name={"workOrderQty"}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="Work Order Qty"
                                                />
                                                {/* Remove button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRow(index)}
                                                    className="flex items-center justify-center gap-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 transition-all duration-200"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )
                                    })
                                }

                                <div className="grid grid-cols-3 gap-6">
                                    <Input
                                        label="Factory Name"
                                        name="FactoryName"
                                        onChange={handleChange}
                                        placeholder="Factory Name"
                                        required
                                    />
                                    <Input
                                        label={"Stich Length"}
                                        name={"stichLength"}
                                        onChange={handleChange}
                                        required
                                        placeholder="Wastage %"
                                    />
                                    <Input
                                        label={"Lot No"}
                                        name={"lotNo"}
                                        onChange={handleChange}
                                        required
                                        placeholder="Lot No"
                                    />

                                </div>


                                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                                    {
                                        isClicked ? <button
                                            disabled
                                            className="flex  items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                                        >
                                            <span className="rotate-180"><Loader2 size={18} /></span>

                                        </button> : <button
                                            type="submit"
                                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                                        >
                                            <Save size={18} />
                                            Create Order
                                        </button>
                                    }
                                    <button
                                        type="button"
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                                    >
                                        <X size={18} />
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )
                    })
                }
            </div>
        </DashboardLayout>
    );
};

export default NewOrder;
