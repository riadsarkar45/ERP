import { useEffect, useState } from "react";
import { Loader2, Save, X, Plus } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import Input from "../../components/Input";
import Toast from "../../components/Toast";
import useAxiosPublic from "../../hooks/Axios";
import { useParams } from "react-router-dom";

const defaultRow = () => ({
    id: Date.now() + Math.random(),
    color: '',
});

const NewOrder = () => {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const [isClicked, setIsClicked] = useState(false);
    const { jobNumber } = useParams();
    const [styleData, setStyleData] = useState([]);
    const [yarnDyeColorRows, setYarnDyeColorRows] = useState([defaultRow()]);
    const [rows, setRows] = useState([]);
    const [orderType, setOrderType] = useState("");
    const [formData, setFormData] = useState({
        workOrderPlaceDate: "",
        workOrderNo: "",
        month: "",
        salesContractNo: "",
        buyer: "",
        jobNo: "",
        poNo: "",
        style: "",
        orderType: "",
        factoryName: "",
        stichLength: "",
        lotNo: "",
        unitPrice: ""
    });

    const axios = useAxiosPublic();

    useEffect(() => {
        const styleReq = async () => {
            if (!jobNumber) return;
            const req = await axios.get(`/api/styles/${jobNumber}`);
            setStyleData(req.data.data);
            setRows(req.data.data[0]?.rows.map(row => ({
                ...row,
                workOrderQty: "",
                yarnColors: [{ color: "", qty: "" }],
            })) || []);
            setFormData(prev => ({
                ...prev,
                jobNo: req.data.data[0]?.jobNo || "",
            }));
        };
        styleReq();
    }, [jobNumber]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "orderType") {
            setOrderType(value);
            if (value === "yarnDyeingOrder") {
                setRows(prev => prev.map(row => ({
                    ...row,
                    yarnColors: row.yarnColors ?? [{ color: "", qty: "" }],
                })));
            }
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRowChange = (index, field, value) => {
        setRows(prev => prev.map((row, i) =>
            i === index ? { ...row, [field]: value } : row
        ));
    };

    const handleRemoveRow = (index) => {
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddYarnColor = (rowIndex) => {
        setRows(prev => prev.map((row, i) =>
            i === rowIndex
                ? { ...row, yarnColors: [...(row.yarnColors ?? [{ color: "", qty: "" }]), { color: "", qty: "" }] }
                : row
        ));
    };

    const handleYarnColorChange = (rowIndex, colorIndex, field, value) => {
        setRows(prev => prev.map((row, i) =>
            i === rowIndex
                ? {
                    ...row,
                    yarnColors: (row.yarnColors ?? [{ color: "", qty: "" }]).map((c, ci) =>
                        ci === colorIndex ? { ...c, [field]: value } : c
                    )
                }
                : row
        ));
    };

    const handleRemoveYarnColor = (rowIndex, colorIndex) => {
        setRows(prev => prev.map((row, i) =>
            i === rowIndex
                ? {
                    ...row,
                    yarnColors: (row.yarnColors ?? [{ color: "", qty: "" }]).filter((_, ci) => ci !== colorIndex)
                }
                : row
        ));
    };

    const showNotification = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const handleSubmit = async (styleNo) => {
        setIsClicked(true);
        try {
            const payload = {
                ...formData,
                styleNo,
                compositions: rows.map(row => ({
                    composition: row.composition,
                    color: row.color,
                    orderQty: row.orderQty,
                    workOrderQty: row.workOrderQty,
                    unitPrice: row.unitPrice,
                    ...(orderType === "yarnDyeingOrder" && { yarnColors: row.yarnColors }),
                }))
            };

            const res = await axios.post("/api/create-job", payload);
            if (res.data.type === "success") {
                showNotification("Order created", "success");
            }
        } catch (error) {
            console.log(error);
            showNotification('Failed to create order. Please try again.', 'error');
        } finally {
            setIsClicked(false);
        }
    };

    const dyeingOrderType = ["knittingOrder", "aopOrder", "dyeingOrder", "yarnDyeingOrder"];

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
                {styleData?.map((style, i) => (
                    <div key={i} className="space-y-6">

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
                                type="text"
                                value={formData.month}
                                onChange={handleChange}
                                placeholder="Select Month"
                                required
                            />
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-3 gap-6">
                            <Input
                                label="Job No"
                                name="jobNo"
                                readOnly
                                value={formData.jobNo}
                                placeholder="e.g., SM26-3429/JAN"
                            />
                            <Input
                                label="Process Loss"
                                name="processLoss"
                                value={style.processLoss}
                                readOnly
                                placeholder="Wastage %"
                            />
                            <Input
                                label="Order Type"
                                name="orderType"
                                value={formData.orderType}
                                type="select"
                                onChange={handleChange}
                                required
                                placeholder="Order Type"
                                options={dyeingOrderType}
                            />
                        </div>

                        {/* Dynamic Rows */}
                        {rows.map((styleRow, index) => (
                            <div key={index} className="space-y-2">
                                <div className={`grid ${orderType === "yarnDyeingOrder" ? 'grid-cols-5' : 'grid-cols-6'} gap-4 items-end`}>
                                    <Input
                                        label={`Composition ${index + 1}`}
                                        readOnly
                                        value={styleRow.composition}
                                    />
                                    <Input
                                        label={`Color ${index + 1}`}
                                        readOnly
                                        value={styleRow.color}
                                    />
                                    <Input
                                        label={`Order Qty ${index + 1}`}
                                        readOnly
                                        value={styleRow.orderQty}
                                    />
                                    <Input
                                        label={`Price Per Kg ${index + 1}`}
                                        value={styleRow.unitPrice}
                                        onChange={(e) => handleRowChange(index, "unitPrice", e.target.value)}
                                        required
                                        placeholder="Unit Price"
                                    />
                                    {
                                        orderType === "yarnDyeingOrder" ? " " : <Input
                                            label={`Work Order Qty ${index + 1}`}
                                            value={styleRow.workOrderQty}
                                            onChange={(e) => handleRowChange(index, "workOrderQty", e.target.value)}
                                            required
                                            placeholder="Work Order Qty"
                                        />
                                    }
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRow(index)}
                                        className="flex items-center justify-center gap-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 transition-all duration-200"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Yarn Color sub-rows — only for yarnDyeingOrder */}
                                {orderType === "yarnDyeingOrder" && (
                                    <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-2">
                                        {(styleRow.yarnColors ?? [{ color: "", qty: "" }]).map((yarnItem, ci) => (
                                            <div key={ci} className="flex items-end gap-3">
                                                <div className="w-48">
                                                    <Input
                                                        label={ci === 0 ? `Booking Color ${index + 1}` : ""}
                                                        placeholder="Yarn booking color"
                                                        value={yarnItem.color}
                                                        onChange={(e) => handleYarnColorChange(index, ci, "color", e.target.value)}
                                                    />
                                                </div>
                                                <div className="w-36">
                                                    <Input
                                                        label={ci === 0 ? `Qty ${index + 1}` : ""}
                                                        placeholder="Qty"
                                                        value={yarnItem.qty}
                                                        onChange={(e) => handleYarnColorChange(index, ci, "qty", e.target.value)}
                                                    />
                                                </div>
                                                {(styleRow.yarnColors ?? []).length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveYarnColor(index, ci)}
                                                        className="flex items-center justify-center px-2.5 py-2.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-all duration-200"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => handleAddYarnColor(index)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-all duration-200"
                                        >
                                            <Plus size={14} />
                                            Add Color
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Row 3 */}
                        <div className="grid grid-cols-3 gap-6">
                            <Input
                                label="Factory Name"
                                name="factoryName"
                                value={formData.factoryName}
                                onChange={handleChange}
                                placeholder="Factory Name"
                                required
                            />
                            <Input
                                label="Stich Length"
                                name="stichLength"
                                value={formData.stichLength}
                                onChange={handleChange}
                                required
                                placeholder="Stich Length"
                            />
                            <Input
                                label="Lot No"
                                name="lotNo"
                                value={formData.lotNo}
                                onChange={handleChange}
                                required
                                placeholder="Lot No"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                            {isClicked ? (
                                <button
                                    disabled
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md border border-primary-600"
                                >
                                    <Loader2 size={18} className="animate-spin" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSubmit(style.styleNo)}
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                                >
                                    <Save size={18} />
                                    Create Order
                                </button>
                            )}
                            <button
                                type="button"
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
};

export default NewOrder;