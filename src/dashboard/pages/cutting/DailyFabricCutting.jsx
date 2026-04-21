import { Plus, X } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import { useEffect, useState } from "react";
import Input from "../../../components/Input";
import useAxiosPublic from "../../../hooks/Axios";

const defaultRow = () => ({
    id: Date.now() + Math.random(),

    size: ''
});

const DailyFabricCutting = () => {

    const [rows, setRows] = useState([defaultRow()]);
    const [styleReq, setStyleReq] = useState([]);
    const [styleInfos, setStyleInfos] = useState({
        styleNo: '',

    })
    const axiosPublic = useAxiosPublic();
    useEffect(() => {
        const fetchStyleReq = async () => {
            const res = await axiosPublic.get("/api/styles");
            console.log(res.data.data);
            // const data = res.data.data;


            // const convertArrayToObject = arrayToObject(data, item => item.id);
            setStyleReq(res.data.data);
        };

        fetchStyleReq();
    }, [axiosPublic]);
    console.log(styleReq, "converted");

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

    }

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
            <div className="overflow-x-auto mt-2">
                {
                    styleReq?.map((req) =>
                        req.rows.map((row, j) =>
                            <div key={req.id - j + 1} className="text-[10px] text-gray-700 mb-5">
                                <div className="grid grid-cols-4 border border-gray-300 p-2 bg-gray-50">
                                    <div className="border-r border-gray-300 p-2 font-bold">
                                        Buyer: <span className="font-normal ml-1">{req.buyerName}</span>
                                    </div>
                                    <div className="p-2 border-r font-bold pl-4">
                                        Style: <span className="font-normal ml-1">{req.styleNo}</span>
                                    </div>
                                    <div className="p-2 border-r font-bold pl-4">
                                        Color: <span className="font-normal ml-1">{row.color}</span>
                                    </div>
                                    <div className="p-2 border-r font-bold pl-4">
                                        Order Qty: <span className="font-normal ml-1">{row.orderQty}</span>
                                    </div>

                                </div>
                                <div className="border border-r border-t-0 border-gray-300 grid grid-cols-4 p-2 bg-white">
                                    <div className="p-2 font-bold">
                                        Fabric Required: <span className="font-normal ml-1">non</span>
                                    </div>
                                    <div className="p-2 border-r font-bold pl-4">
                                        Booking Consumption: <span className="font-normal ml-1">0.031</span>
                                    </div>
                                    <div className="p-2 border-r font-bold pl-4">
                                        Cutting Consumption: <span className="font-normal ml-1">-</span>
                                    </div>
                                    <div className="p-2 border-r font-bold pl-4">
                                        Variation Consumption: <span className="font-normal ml-1">-</span>
                                    </div>
                                </div>
                                <div className="flex gap-8 border border-t-0 border-gray-300 p-4 bg-gray-50">
                                    <div className="border-r font-bold">
                                        Order Quantity: <span className="font-normal ml-1">56</span>
                                    </div>
                                    <div className="border-r font-bold">
                                        Fabric Received: <span className="font-normal ml-1">56</span>
                                    </div>
                                    <div className="border-r font-bold">
                                        Actual Consumption: <span className="font-normal ml-1">-</span>
                                    </div>
                                    <div className="border-r font-bold">
                                        Item: <span className="font-normal ml-1">box</span>
                                    </div>
                                    <div className="border-r font-bold">
                                        Last Updated: <span className="font-normal ml-1">{"14.4.2026"}</span>
                                    </div>
                                </div>
                                <div className="">
                                    <table className="w-full text-[11px] text-left border-collapse">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="border border-gray-300 p-2">Cutting Part</th>
                                                <th className="border border-gray-300 p-2">Cutting Number</th>
                                                <th className="border border-gray-300 p-2">PCS Per Layer</th>
                                                <th className="border border-gray-300 p-2">Cutting Layer</th>
                                                <th className="border border-gray-300 p-2">Quantity</th>
                                                {req?.sizes?.map((s) => (
                                                    <th key={s.id} className="border border-gray-300 p-2">{s.sizeName}</th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {[
                                                { size: "S", qty: 10 },
                                                { size: "M", qty: 20 },
                                                { size: "L", qty: 15 }
                                            ].map((s, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="border border-gray-300 p-2">{s.size}</td>
                                                    <td className="border border-gray-300 p-2">{s.qty}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>


                        )
                    )
                }
            </div>
        </DashboardLayout>
    );
};

export default DailyFabricCutting;