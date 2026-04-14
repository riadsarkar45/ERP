import { Plus, X } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import { useState } from "react";
import Input from "../../../components/Input";
import useAxiosPublic from "../../../hooks/Axios";

const defaultRow = () => ({
    id: Date.now() + Math.random(),

    size: ''
});

const DailyFabricCutting = () => {
    const [rows, setRows] = useState([defaultRow()]);
    const [styleInfos, setStyleInfos] = useState({
        styleNo: '',
        item: '',
        fabricRequired: '',
        color: '',
        orderQty: '',
        fabricReceived: '',

    })
    const axiosPublic = useAxiosPublic();
    const sizes = ["98/104", "110/116", "122/128", "134/140", "N/A", "N/A", "N/A", "N/A"];
    const emptyRows = Array(12).fill(null);

    const addRow = () => setRows((prev) => [...prev, defaultRow()]);

    const updateRow = (id, field, value) =>
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    const removeRow = (id) =>
        setRows((prev) => prev.filter((r) => r.id !== id));

    const handleStyleCuttingInfoSubmit = async () => {
        const payload = {
            rows: rows.map(row => ({
                size: row.size,
            })),
            styleInfos

        }

        const insert = await axiosPublic.post("/api/cutting-production", payload)
        console.log(insert.data);

        console.log(payload, "payload");
    }

    console.log(styleInfos, "style infos");
    console.log(rows, "rows");
    return (
        <DashboardLayout>
            {/* Search Inputs */}
            <div className="flex gap-2 items-center">
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Style No</label>
                        <input className="w-full border border-gray-300 rounded px-2 py-1 text-xs" placeholder="Search by Style No" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Color</label>
                        <input className="w-full border border-gray-300 rounded px-2 py-1 text-xs" placeholder="Search by Color" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={addRow}
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1 text-sm bg-primary-50 text-primary-600 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
                    >
                        <Plus size={15} />
                        New Style
                    </button>
                    <button
                        onClick={() => handleStyleCuttingInfoSubmit()}
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1 text-sm bg-primary-50 text-primary-600 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
                    >
                        <Plus size={15} />
                        Submit
                    </button>
                </div>
            </div>

            <div>
                <div className="grid grid-cols-7 mb-4 gap-2">
                    <Input
                        label={"Style"}
                        name={"style"}
                        placeholder="Style"
                        onChange={(e) => setStyleInfos({ ...styleInfos, styleNo: e.target.value })}
                    />
                    <Input
                        label={"Buyer Name"}
                        name={"buyerName"}
                        placeholder="Buyer Name"
                        onChange={(e) => setStyleInfos({ ...styleInfos, buyerName: e.target.value })}

                    />
                    <Input
                        label={"Item"}
                        name={"item"}
                        placeholder="Item"
                        onChange={(e) => setStyleInfos({ ...styleInfos, item: e.target.value })}

                    />
                    <Input
                        label={"Fabric Required"}
                        name={"fabricRequired"}
                        placeholder="Fabric Required"
                        onChange={(e) => setStyleInfos({ ...styleInfos, fabricRequired: e.target.value })}

                    />

                    <Input
                        label={"Color"}
                        name={"color"}
                        placeholder="Color"
                        onChange={(e) => setStyleInfos({ ...styleInfos, color: e.target.value })}

                    />
                    <Input
                        label={"Order Quantity"}
                        name={"orderQty"}
                        placeholder="Order Quantity"
                        onChange={(e) => setStyleInfos({ ...styleInfos, orderQty: e.target.value })}

                    />
                    <Input
                        label={"Fabric Received"}
                        name={"fabricReceived"}
                        placeholder="Fabric Received"
                        onChange={(e) => setStyleInfos({ ...styleInfos, fabricReceived: e.target.value })}

                    />
                </div>
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_32px] gap-2 items-center"
                    >
                        {[
                            { field: 'size', placeholder: 'Size' },
                        ].map(({ field, placeholder }) => (
                            <input
                                key={field}
                                type="text"
                                placeholder={placeholder}
                                value={row[field]}
                                onChange={(e) => updateRow(row.id, field, e.target.value)}
                                className="w-full px-3 mb-2 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
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

            {/* Buyer Banner */}
            <div className="text-center font-bold text-sm py-1 border border-gray-400 border-b-0 bg-gray-100">
                BUYER : LPP
            </div>

            {/* Info Bar */}
            <div className="grid grid-cols-5 border border-gray-400 text-xs">
                {[
                    [["Style :", "25481"], ["Color :", "WHITE LOVE AOP"]],
                    [["Item :", "BOXER"], ["Order Quantity :", "1,800"]],
                    [["Fabric Required :", "55"], ["Fabric Received :", "-"]],
                    [["Booking Consumption :", "0.031"], ["Actual Consumption :", "-"]],
                    [["CUTTING CONSUMP.", ""], ["CONSUMP. VARIATION", ""]],
                ].map((col, ci) => (
                    <div key={ci} className={ci < 4 ? "border-r border-gray-400" : ""}>
                        {col.map(([label, val], ri) => (
                            <div key={ri} className={`px-2 py-1 ${ri === 0 ? "border-b border-gray-400" : ""}`}>
                                <span className="font-semibold">{label}</span> {val}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto mt-2">
                <table className="w-full border-collapse text-xs text-center">
                    <thead>
                        <tr>
                            {["Body Part Name", "CUTTING NUMBER.", "Total Layers", "Pcs Per Layer", "Total Cutting"].map(h => (
                                <th key={h} rowSpan={2} className="border border-gray-500 bg-green-200 p-1 font-bold text-green-900">{h}</th>
                            ))}
                            <th colSpan={8} className="border border-gray-500 bg-green-300 p-1 font-bold text-green-900">Sizes</th>
                            <th rowSpan={2} className="border border-gray-500 bg-green-200 p-1 font-bold text-green-900">Total</th>
                        </tr>
                        <tr>
                            {sizes.map((s, i) => (
                                <th key={i} className="border border-gray-500 bg-green-300 p-1 font-bold text-green-900">{s}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Size Wise Requirements */}
                        <tr className="bg-white">
                            <td colSpan={5} className="border border-gray-500 italic text-gray-500 py-1">Size Wise Requirements</td>
                            <td className="border border-gray-500">375</td>
                            <td className="border border-gray-500">300</td>
                            <td className="border border-gray-500">600</td>
                            <td className="border border-gray-500">525</td>
                            {["-", "-", "-", "-"].map((v, i) => <td key={i} className="border border-gray-500">{v}</td>)}
                            <td className="border border-gray-500 font-bold">1,800</td>
                        </tr>

                        {/* With 2% */}
                        <tr className="bg-yellow-200 text-red-800 font-semibold">
                            <td colSpan={5} className="border border-gray-500 text-right pr-2">With <strong>2%</strong></td>
                            <td className="border border-gray-500">383</td>
                            <td className="border border-gray-500">306</td>
                            <td className="border border-gray-500">612</td>
                            <td className="border border-gray-500">536</td>
                            {["-", "-", "-", "-"].map((v, i) => <td key={i} className="border border-gray-500">{v}</td>)}
                            <td className="border border-gray-500">1,836</td>
                        </tr>

                        {/* Already Cutted */}
                        <tr className="bg-green-400 font-bold text-green-900">
                            <td colSpan={5} className="border border-gray-500">ALREADY CUTTED</td>
                            <td className="border border-gray-500">372</td>
                            <td className="border border-gray-500">310</td>
                            <td className="border border-gray-500">620</td>
                            <td className="border border-gray-500">558</td>
                            {["-", "-", "-", "-"].map((v, i) => <td key={i} className="border border-gray-500">{v}</td>)}
                            <td className="border border-gray-500">1,860</td>
                        </tr>

                        {/* Data row */}
                        <tr className="bg-white">
                            <td className="border border-gray-500"></td>
                            <td className="border border-gray-500">1</td>
                            <td className="border border-gray-500">31</td>
                            <td className="border border-gray-500">60</td>
                            <td className="border border-gray-500">1,860</td>
                            <td className="border border-gray-500">12</td>
                            <td className="border border-gray-500">10</td>
                            <td className="border border-gray-500">20</td>
                            <td className="border border-gray-500">18</td>
                            {["-", "-", "-", "-"].map((v, i) => <td key={i} className="border border-gray-500">{v}</td>)}
                            <td className="border border-gray-500">-</td>
                        </tr>

                        {/* Empty rows */}
                        {emptyRows.map((_, i) => (
                            <tr key={i} className="bg-white">
                                <td className="border border-gray-500 py-1">EMPTY</td>
                                <td className="border border-gray-500">EMPTY 1</td>
                                <td className="border border-gray-500">EMPTY TEST COUNT 1</td>
                                <td className="border border-gray-500">TEST COUNT 1</td>
                                <td className="border border-gray-500">-</td>
                                {Array(8).fill("").map((_, j) => <td key={j} className="border border-gray-500"></td>)}
                                <td className="border border-gray-500">-</td>
                            </tr>
                        ))}

                        {/* Pending to Cut */}
                        <tr className="text-red-700 font-bold italic">
                            <td colSpan={5} className="border border-gray-500 text-center">PENDING TO CUT / EXCESS CUT.</td>
                            <td className="border border-gray-500">(11)</td>
                            <td className="border border-gray-500">4</td>
                            <td className="border border-gray-500">8</td>
                            <td className="border border-gray-500">23</td>
                            {["", "", "", ""].map((v, i) => <td key={i} className="border border-gray-500">{v}</td>)}
                            <td className="border border-gray-500">(24)</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
};

export default DailyFabricCutting;