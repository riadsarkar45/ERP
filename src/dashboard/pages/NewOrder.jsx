import { useEffect, useState } from "react";
import { Loader2, Save, X, Plus } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import Input from "../../components/Input";
import Toast from "../../components/Toast";
import { useParams, useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/UseAxiosPrivate";

const defaultYarnColor = () => ({ color: "", qty: "", price: "" });

const NewOrder = () => {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const [isClicked, setIsClicked] = useState(false);
    const { jobNumber } = useParams();
    const navigate = useNavigate();

    const [styleData, setStyleData] = useState(null);
    const [rows, setRows] = useState([]);
    const [orderType, setOrderType] = useState("");
    const [isLoading, setIsLoading] = useState(true);

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
        unitPrice: "",
        yarnCount: "",
        processLoss: "",
    });

    const axiosPrivate = useAxiosPrivate();

    useEffect(() => {
        const fetchStyleData = async () => {
            if (!jobNumber) return;
            setIsLoading(true);
            try {
                const req = await axiosPrivate.get(`/api/styles/${jobNumber}`);
                const data = req.data.data;

                const style = Array.isArray(data) ? data[0] : data;

                if (!style) {
                    showNotification('Style not found', 'error');
                    setIsLoading(false);
                    return;
                }

                setStyleData(style);

                setFormData({
                    workOrderPlaceDate: "",
                    workOrderNo: "",
                    month: "",
                    salesContractNo: style.salesContractNo || "",
                    buyer: style.buyerName || "",
                    jobNo: style.jobNo || "",
                    poNo: style.poNo || "",
                    style: style.styleNo || "",
                    orderType: "",
                    factoryName: "",
                    stichLength: "",
                    lotNo: "",
                    unitPrice: "",
                    yarnCount: "",
                    processLoss: style.processLoss || "",
                });

                const initialRows = (style.rows || []).map((row, index) => ({
                    id: row.id || Date.now() + index,
                    composition: row.composition || "",
                    color: row.color || "",
                    orderQty: row.orderQty || "",
                    finishRequiredQty: row.finishRequiredQty || "",
                    additional: row.additional || "",
                    unitPrice: row.unitPrice || "",
                    workOrderQty: "",
                    stichLength: "",
                    machineDia: "",
                    lotNo: "",
                    yarnCount: "",
                    yarnColors: [defaultYarnColor()],
                }));

                setRows(initialRows.length > 0 ? initialRows : [{
                    id: Date.now(),
                    composition: "",
                    color: "",
                    orderQty: "",
                    finishRequiredQty: "",
                    additional: "",
                    unitPrice: "",
                    workOrderQty: "",
                    stichLength: "",
                    machineDia: "",
                    lotNo: "",
                    yarnCount: "",
                    yarnColors: [defaultYarnColor()],
                }]);

            } catch (error) {
                console.error("Failed to fetch style data:", error);
                showNotification('Failed to load style data', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStyleData();
    }, [jobNumber, axiosPrivate]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "orderType") {
            setOrderType(value);
            if (value === "yarnDyeingOrder") {
                setRows(prev => prev.map(row => ({
                    ...row,
                    yarnColors: row.yarnColors ?? [defaultYarnColor()],
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
        if (rows.length <= 1) {
            showNotification("At least one composition is required", "error");
            return;
        }
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddYarnColor = (rowIndex) => {
        setRows(prev => prev.map((row, i) =>
            i === rowIndex
                ? { ...row, yarnColors: [...(row.yarnColors ?? [defaultYarnColor()]), defaultYarnColor()] }
                : row
        ));
    };

    const handleYarnColorChange = (rowIndex, colorIndex, field, value) => {
        setRows(prev => prev.map((row, i) =>
            i === rowIndex
                ? {
                    ...row,
                    yarnColors: (row.yarnColors ?? [defaultYarnColor()]).map((c, ci) =>
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
                    yarnColors: (row.yarnColors ?? [defaultYarnColor()]).filter((_, ci) => ci !== colorIndex)
                }
                : row
        ));
    };

    const showNotification = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const validateForm = () => {
        if (!formData.workOrderPlaceDate) {
            showNotification("Work Order Place Date is required", "error");
            return false;
        }
        if (!formData.workOrderNo) {
            showNotification("Work Order No is required", "error");
            return false;
        }
        if (!formData.orderType) {
            showNotification("Order Type is required", "error");
            return false;
        }
        if (!formData.factoryName) {
            showNotification("Factory Name is required", "error");
            return false;
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (orderType !== "yarnDyeingOrder") {
                if (!row.unitPrice) {
                    showNotification(`Price Per Kg is required for Composition ${i + 1}`, "error");
                    return false;
                }
                if (!row.workOrderQty) {
                    showNotification(`Work Order Qty is required for Composition ${i + 1}`, "error");
                    return false;
                }
                if (!row.yarnCount) {
                    showNotification(`Yarn Count is required for Composition ${i + 1}`, "error");
                    return false;
                }
                if (!row.lotNo) {
                    showNotification(`Lot No is required for Composition ${i + 1}`, "error");
                    return false;
                }
                if (orderType === "knittingOrder" && !row.machineDia) {
                    showNotification(`Machine Dia is required for Composition ${i + 1}`, "error");
                    return false;
                }
                if (orderType !== "aopOrder" && orderType !== "dyeingOrder" && !row.stichLength) {
                    showNotification(`Stich Length is required for Composition ${i + 1}`, "error");
                    return false;
                }
            } else {
                if (!row.yarnColors || row.yarnColors.length === 0) {
                    showNotification(`At least one yarn color is required for Composition ${i + 1}`, "error");
                    return false;
                }
                for (let j = 0; j < row.yarnColors.length; j++) {
                    const yc = row.yarnColors[j];
                    if (!yc.color) {
                        showNotification(`Yarn color is required for Composition ${i + 1}, Color ${j + 1}`, "error");
                        return false;
                    }
                    if (!yc.qty) {
                        showNotification(`Qty is required for Composition ${i + 1}, Color ${j + 1}`, "error");
                        return false;
                    }
                    if (!yc.price) {
                        showNotification(`Price is required for Composition ${i + 1}, Color ${j + 1}`, "error");
                        return false;
                    }
                }
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        if (!styleData) {
            showNotification("Style data not loaded", "error");
            return;
        }

        setIsClicked(true);
        try {
            const payload = {
                // Only send WorkOrder-level fields (not duplicated in compositions)
                workOrderPlaceDate: formData.workOrderPlaceDate,
                workOrderNo: formData.workOrderNo,
                month: formData.month,
                jobNo: formData.jobNo,
                factoryName: formData.factoryName,
                orderType: formData.orderType,
                styleNo: styleData.styleNo,

                // Per-composition fields only
                compositions: rows.map(row => ({
                    composition: row.composition,
                    color: row.color,
                    orderQty: row.orderQty,
                    workOrderQty: row.workOrderQty,
                    unitPrice: row.unitPrice,
                    machineDia: row.machineDia,      // Backend extracts from row 0
                    yarnCount: row.yarnCount,        // Backend extracts from row 0
                    stichLength: row.stichLength,    // Backend extracts from row 0
                    lotNo: row.lotNo,                // Backend extracts from row 0
                    ...(orderType === "yarnDyeingOrder"
                        ? { yarnColors: row.yarnColors }
                        : {}),
                }))
            };

            console.log("Clean payload:", payload);

            const res = await axiosPrivate.post("/api/create-job", payload);
            if (res.data.type === "success") {
                showNotification("Order created successfully", "success");
                setTimeout(() => navigate("/dashboard/style-requirement"), 1500);
            } else {
                showNotification(res.data.message || 'Failed to create order', 'error');
            }
        } catch (error) {
            console.error("Submit error:", error);
            showNotification(error?.response?.data?.message || 'Failed to create order. Please try again.', 'error');
        } finally {
            setIsClicked(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    const dyeingOrderType = ["knittingOrder", "aopOrder", "dyeingOrder", "yarnDyeingOrder"];

    if (isLoading) {
        return (
            <DashboardLayout title="Add New Order">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 size={32} className="animate-spin text-primary-500" />
                    <span className="ml-3 text-gray-600">Loading style data...</span>
                </div>
            </DashboardLayout>
        );
    }

    if (!styleData) {
        return (
            <DashboardLayout title="Add New Order">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <p className="text-gray-600 mb-4">No style data found</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                    >
                        Go Back
                    </button>
                </div>
            </DashboardLayout>
        );
    }

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
                <div className="space-y-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input
                            label="Job No"
                            name="jobNo"
                            readOnly
                            value={formData.jobNo}
                            placeholder="e.g., SM26-3429/JAN"
                        />
                        <Input
                            label="Process Loss (%)"
                            name="processLoss"
                            value={formData.processLoss}
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
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Compositions</h3>
                        {rows.map((styleRow, index) => (
                            <div key={styleRow.id || index} className="space-y-2 p-4 border-b border-gray-200">
                                <div className={`grid ${orderType === "yarnDyeingOrder" ? 'grid-cols-1 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-5 lg:grid-cols-10'} gap-4 items-end`}>
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

                                    {orderType === "yarnDyeingOrder" ? null : (
                                        <Input
                                            label={`Price Per Kg ${index + 1}`}
                                            value={styleRow.unitPrice}
                                            onChange={(e) => handleRowChange(index, "unitPrice", e.target.value)}
                                            required
                                            placeholder="Unit Price"
                                        />
                                    )}
                                    {orderType === "yarnDyeingOrder" ? null : (
                                        <Input
                                            label={`Work Order Qty ${index + 1}`}
                                            value={styleRow.workOrderQty}
                                            onChange={(e) => handleRowChange(index, "workOrderQty", e.target.value)}
                                            required
                                            placeholder="Work Order Qty"
                                        />
                                    )}
                                    {orderType === "yarnDyeingOrder" || orderType === "aopOrder" ? null : (
                                        <Input
                                            label={`Stich Length ${index + 1}`}
                                            value={styleRow.stichLength}
                                            onChange={(e) => handleRowChange(index, "stichLength", e.target.value)}
                                            placeholder="Stich Length"
                                        />
                                    )}
                                    {orderType === "yarnDyeingOrder" || orderType === "aopOrder" || orderType === "dyeingOrder" ? null : (
                                        <Input
                                            label={`Machine Dia ${index + 1}`}
                                            value={styleRow.machineDia}
                                            onChange={(e) => handleRowChange(index, "machineDia", e.target.value)}
                                            placeholder="Machine Dia"
                                        />
                                    )}
                                    {orderType === "yarnDyeingOrder" ? null : (
                                        <Input
                                            label={`Lot No ${index + 1}`}
                                            value={styleRow.lotNo}
                                            onChange={(e) => handleRowChange(index, "lotNo", e.target.value)}
                                            placeholder="Lot No"
                                        />
                                    )}
                                    {orderType === "yarnDyeingOrder" ? null : (
                                        <Input
                                            label={`Yarn Count ${index + 1}`}
                                            value={styleRow.yarnCount}
                                            onChange={(e) => handleRowChange(index, "yarnCount", e.target.value)}
                                            placeholder="Yarn Count"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRow(index)}
                                        className="flex items-center justify-center gap-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 transition-all duration-200 h-[42px]"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Yarn Color sub-rows — only for yarnDyeingOrder */}
                                {orderType === "yarnDyeingOrder" && (
                                    <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-2 mt-3">
                                        {(styleRow.yarnColors ?? [defaultYarnColor()]).map((yarnItem, ci) => (
                                            <div key={ci} className="flex flex-wrap items-end gap-3">
                                                <div className="w-full sm:w-48">
                                                    <Input
                                                        label={ci === 0 ? `Booking Color ${index + 1}` : ""}
                                                        placeholder="Yarn booking color"
                                                        value={yarnItem.color}
                                                        onChange={(e) => handleYarnColorChange(index, ci, "color", e.target.value)}
                                                    />
                                                </div>
                                                <div className="w-full sm:w-36">
                                                    <Input
                                                        label={ci === 0 ? `Qty ${index + 1}` : ""}
                                                        placeholder="Qty"
                                                        value={yarnItem.qty}
                                                        onChange={(e) => handleYarnColorChange(index, ci, "qty", e.target.value)}
                                                    />
                                                </div>
                                                <div className="w-full sm:w-36">
                                                    <Input
                                                        label={ci === 0 ? `Price Per Kg ${index + 1}` : ""}
                                                        value={yarnItem.price}
                                                        onChange={(e) => handleYarnColorChange(index, ci, "price", e.target.value)}
                                                        required
                                                        placeholder="Unit Price"
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
                    </div>

                    {/* Row 3 */}
                    <div>
                        <Input
                            label="Factory Name"
                            name="factoryName"
                            value={formData.factoryName}
                            onChange={handleChange}
                            placeholder="Factory Name"
                            required
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
                                <span>Saving...</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                            >
                                <Save size={18} />
                                Create Order
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                        >
                            <X size={18} />
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default NewOrder;