import { X, Save, Plus } from 'lucide-react';
import Input from './Input';
import { useState } from 'react';
import useAxiosPublic from '../hooks/Axios';
import { RefreshCcw } from "lucide-react";

const defaultRow = () => ({
    id: Date.now() + Math.random(),
    color: '',
    composition: '',
    finishDia: '',
    orderQty: '',
    finishRequiredQty: '',
});

const StyleReqModal = ({ setShowModal, setRawData }) => {
    const [rows, setRows] = useState([defaultRow()]);
    const [orderInfo, setOrderInfo] = useState(
        {
            salesContact: '',
            buyerName: '',
            jobNo: '',
            poNo: '',
            styleNo: '',
            processLoss: '',
        }
    )
    const [isLoading, setIsLoading] = useState(false);

    const axiosPublic = useAxiosPublic();
    console.log(orderInfo, "order info");

    const addRow = () => setRows((prev) => [...prev, defaultRow()]);

    const removeRow = (id) =>
        setRows((prev) => prev.filter((r) => r.id !== id));

    const updateRow = (id, field, value) =>
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );

    const createNewRequirement = async () => {
        setIsLoading(true);
        const payload = {
            orderInfo,
            rows: rows.map(row => ({
                color: row.color,
                composition: row.composition,
                finishDia: row.finishDia,
                orderQty: row.orderQty,
                finishRequiredQty: row.finishRequiredQty,
            }))
        };

        const res = await axiosPublic.post("/api/new-style-requirements", payload)
        if (res.data.type === "success") {
            axiosPublic.get("/api/styles").then((res) => { setRawData(res.data.data), setIsLoading(false) });

        }

        console.log(payload, "data converted to object");
    }

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

                        {/* Fixed fields - original 3-col grid */}
                        <div className='grid grid-cols-3 gap-3'>
                            <Input
                                label="Sales Contact"
                                type='text'
                                name="salesContact"
                                onChange={(e) => setOrderInfo({ ...orderInfo, salesContact: e.target.value })}
                                placeholder='Sales Contact'
                                value={orderInfo.salesContact}
                                required
                            />
                            <Input
                                label="Buyer Name"
                                type='text'
                                name="buyerName"
                                onChange={(e) => setOrderInfo({ ...orderInfo, buyerName: e.target.value })}
                                value={orderInfo.buyerName}

                                placeholder='Buyer Name'
                                required
                            />
                            <Input
                                label="Job No"
                                type='text'
                                name="jobNo"
                                onChange={(e) => setOrderInfo({ ...orderInfo, jobNo: e.target.value })}
                                value={orderInfo.jobNo}

                                placeholder='Job No'
                                required
                            />
                            <Input
                                label="PO No"
                                type='text'
                                name="poNo"
                                onChange={(e) => setOrderInfo({ ...orderInfo, poNo: e.target.value })}
                                value={orderInfo.poNo}

                                placeholder='Po No'
                                required
                            />
                            <Input
                                label="Style No"
                                type='text'
                                name="styleNo"
                                onChange={(e) => setOrderInfo({ ...orderInfo, styleNo: e.target.value })}
                                value={orderInfo.styleNo}

                                placeholder='Style No'
                                required
                            />
                            <Input
                                label="Process Loss"
                                type='text'
                                name="processLoss"
                                onChange={(e) => setOrderInfo({ ...orderInfo, processLoss: e.target.value })}
                                value={orderInfo.processLoss}
                                placeholder='Process Loss %'
                                required
                            />
                        </div>

                        {/* Repeatable rows section */}
                        <div className="mt-6">

                            {/* Section header with Add Row button */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                                    Color / Composition Details
                                </span>
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-50 text-primary-600 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
                                >
                                    <Plus size={15} />
                                    Add Row
                                </button>
                            </div>

                            {/* Column headers */}
                            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_32px] gap-2 mb-1 px-1">
                                {['Color', 'Composition', 'Finish Dia', 'Order Qty', 'Finished Req. Qty', ''].map((h, i) => (
                                    <span key={i} className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        {h}
                                    </span>
                                ))}
                            </div>

                            {/* Dynamic rows */}
                            <div className="flex flex-col gap-2">
                                {rows.map((row) => (
                                    <div
                                        key={row.id}
                                        className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_32px] gap-2 items-center"
                                    >
                                        {[
                                            { field: 'color', placeholder: 'Color' },
                                            { field: 'composition', placeholder: 'Composition' },
                                            { field: 'finishDia', placeholder: 'Finish Dia' },
                                            { field: 'orderQty', placeholder: 'Order Qty' },
                                            { field: 'finishRequiredQty', placeholder: 'Finished Req. Qty' },
                                        ].map(({ field, placeholder }) => (
                                            <input
                                                key={field}
                                                type="text"
                                                placeholder={placeholder}
                                                value={row[field]}
                                                onChange={(e) => updateRow(row.id, field, e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                                            />
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            disabled={rows.length === 1}
                                            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action buttons - original design */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-10 border-gray-200">
                            {
                                isLoading ? (
                                    <button
                                    onClick={() => setIsLoading(false)}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                                    >
                                        <Save size={18} />
                                        <RefreshCcw size={18} className="animate-spin" />
                                    </button>
                                ) : <button
                                    onClick={() => createNewRequirement()}
                                    type="submit"
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                                >
                                    <Save size={18} />
                                    Insert
                                </button>
                            }
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
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
        </>
    );
};

export default StyleReqModal;