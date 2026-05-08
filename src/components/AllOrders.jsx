import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import useAxiosPublic from "../hooks/Axios";
import Input from "./Input";
import Modal from "./Modal";

const COLUMNS = [
    { header: "FACTORY NAME", width: "18mm", inputName: "factoryName" },
    { header: "JOB NO.", width: "10mm", inputName: "workOrderNo" },
    { header: "BUYER NAME", width: "30mm", inputName: "buyerName" },
    { header: "PO NO", width: "12mm", inputName: "poNo" },
    { header: "COMPOSITION", width: "20mm", inputName: "composition" },
    { header: "STYLE", width: "30mm", inputName: "styleNo" },
    { header: "MONTH", width: "10mm", inputName: "month" },
    { header: "COLOR", width: "50mm", inputName: "color" },
    { header: "ORDER QTY", width: "10mm", inputName: "orderQty" },
    { header: "PRICE PER KG", width: "11mm", inputName: "unitePrice" },
    { header: "WORK ORDER QTY", width: "13mm", inputName: "workOrderQty" },
    { header: "DELIVERY", width: "13mm", inputName: "totalYarnDelivery" },
    { header: "DEL. SHORT & EXCESS", width: "12mm" },
    { header: "YARN RETURN RECEIVED", width: "13mm" },
    { header: "GREY RECEIVED FROM", width: "13mm" },
    { header: "RCVD SHORT & EXCESS", width: "13mm" },
    { header: "PAYABLE AMOUNT", width: "12mm" },
    { header: "PAID BILLING AMOUNT", width: "12mm" },
    { header: "PENDING BILLING AMOUNT", width: "12mm" },
];

const AllOrders = ({ orderType }) => {
    const axiosPublic = useAxiosPublic();

    const [jobId, setOrderId] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [changedField, setChangedField] = useState({});
    const [styleNo, setStyleNo] = useState("");
    const [alertType, setAlertType] = useState("");
    const [filters, setFilters] = useState({})


    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await axiosPublic.get(`/api/work-order/${orderType}`);
                console.log(res.data, "data");
                setOrders(res.data);
            } catch (err) {
                console.log(err);
            }
        };
        fetchOrders();
    }, [axiosPublic, orderType]);



    const handleEditRowData = (yarnId) => {
        // setEditRowData(prev => ({
        //     ...prev,
        //     editingField,
        //     editingIndex: indexId,
        //     [editingField]: editingText,
        // }));
        console.log("clicked", yarnId);
        setStyleNo(styleNo);
        setOrderId(yarnId);
        setIsEditing(true);
    };

    const handleFilter = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));

    }
    const filteredOrders = orders?.filter(job => {
        const matchesJob =
            (!filters.workOrderNo || job.workOrderNo?.includes(filters.workOrderNo)) &&
            (!filters.styleNo || job.styleNo?.toLowerCase().includes(filters.styleNo.toLowerCase())) &&
            (!filters.month || job.month?.toLowerCase().includes(filters.month.toLowerCase()));

        const matchedCompositions = job.compositions.filter(comp =>
            (!filters.composition || comp.composition?.toLowerCase().includes(filters.composition.toLowerCase())) &&
            (!filters.color || comp.color?.toLowerCase().includes(filters.color.toLowerCase())) &&
            (!filters.orderQty || String(comp.orderQty).includes(filters.orderQty)) &&
            (!filters.unitePrice || String(comp.unitePrice).includes(filters.unitePrice)) &&
            (!filters.workOrderQty || String(comp.workOrderQty).includes(filters.workOrderQty)) &&
            (!filters.totalYarnDelivery || String(comp.totalYarnDelivery).includes(filters.totalYarnDelivery))
        );

        return matchesJob && matchedCompositions.length > 0;
    }).map(job => ({
        ...job,
        compositions: job.compositions.filter(comp =>
            (!filters.composition || comp.composition?.toLowerCase().includes(filters.composition.toLowerCase())) &&
            (!filters.color || comp.color?.toLowerCase().includes(filters.color.toLowerCase())) &&
            (!filters.orderQty || String(comp.orderQty).includes(filters.orderQty)) &&
            (!filters.unitePrice || String(comp.unitePrice).includes(filters.unitePrice)) &&
            (!filters.workOrderQty || String(comp.workOrderQty).includes(filters.workOrderQty)) &&
            (!filters.totalYarnDelivery || String(comp.totalYarnDelivery).includes(filters.totalYarnDelivery))
        )
    }));



    console.log(filteredOrders, "filters");

    const handleEditOnChange = (e) => {
        const { name, value } = e.target;
        setIsEditing(true);
        setChangedField(prev => ({ ...prev, [name]: value }));
    };
    console.log(changedField, "changed field");
    const handleSubmit = async () => {
        const update = await axiosPublic.patch(
            `/api/update-order/${jobId}`, changedField
        );
        console.log(jobId, "job id");
        if (update.status === 200) {
            const res = await axiosPublic.get(`/api/work-order/${orderType}`);
            setOrders(res.data);
            setChangedField({});
            setIsEditing(false);
            setAlertType(update.data.type);
        }
    };



    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 8mm;
                    }

                    body * { visibility: hidden; }

                    .printable-table-area,
                    .printable-table-area * { visibility: visible; }

                    .printable-table-area {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        overflow: visible !important;
                    }

                    /* ✅ Remove screen min-width, use explicit col widths instead of fixed layout */
                    .factory-table {
                        width: 100% !important;
                        min-width: unset !important;
                        table-layout: auto !important;
                        border-collapse: collapse;
                    }

                    /* ✅ Apply explicit widths from <col> elements */
                    .factory-table col {
                        width: auto;
                    }

                    .factory-table th {
                        font-size: 6px !important;
                        padding: 2px 2px !important;
                        white-space: normal !important;
                        word-break: break-word !important;
                        text-align: center !important;
                        vertical-align: bottom !important;
                        border: 0.5px solid #999 !important;
                        background-color: #f3f4f6 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        line-height: 1.1 !important;
                    }

                    .factory-table td {
                        font-size: 6.5px !important;
                        padding: 2px 2px !important;
                        white-space: normal !important;
                        word-break: break-word !important;
                        border: 0.5px solid #999 !important;
                        line-height: 1.2 !important;
                    }

                    /* ✅ Repeat header on every page */
                    .factory-table thead {
                        display: table-header-group;
                    }

                    .factory-table tbody {
                        display: table-row-group;
                    }
                }
            `}</style>

            <div>
                {
                    alertType && (
                        <div className={`${alertType === "success" ? "bg-green-600 border-green-500 text-green-600" : "bg-red-600 border-red-500 text-red-600"}  bg-opacity-25 border  p-2 rounded-md`}>
                            <h2>
                                {alertType === "success" ? "Update Successful" : "Something went wrong, please try again few minutes later"}
                            </h2>
                        </div>

                    )
                }
                <div className="mb-5 p-2 rounded-sm">
                    {(!orders || orders.length < 1) && (
                        <div>No order found</div>
                    )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="table-container printable-table-area overflow-x-auto">
                        {isEditing && (
                            <Modal
                                setIsEditing={setIsEditing}
                                handleSubmit={handleSubmit}
                                handleEditOnChange={handleEditOnChange}
                                orderId={jobId}
                                orders={orders}
                            />
                        )}
                        <table className="w-full border-collapse factory-table" style={{ minWidth: '1200px' }}>

                            <colgroup>
                                {COLUMNS.map((col, i) => (
                                    <col key={i} style={{ width: col.width }} />
                                ))}
                            </colgroup>

                            <thead className="bg-gray-50">
                                <tr>
                                    {COLUMNS.map((col, i) => (
                                        <th
                                            key={i}
                                            className="px-3 py-2 text-left font-semibold text-gray-700 text-sm border-b border-gray-200 whitespace-nowrap"
                                        >
                                            <div className="grid">
                                                {col.header}
                                                {
                                                    col.inputName && (
                                                        <input onChange={(e) => handleFilter(e)} className="border uppercase rounded-md p-1" placeholder={col.inputName} type="text" name={col.inputName} />

                                                    )
                                                }
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {filteredOrders?.map((job, factoryIndex) => {

                                    return (
                                        <tr className={""} key={`${factoryIndex}`}>

                                            <td className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300">{job.workOrderPlaceDate}</td>
                                            <td className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300">{job.workOrderNo}</td>
                                            <td className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300">{"BUYER NAME"}</td>
                                            <td className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300">{"static"}</td>
                                            <td>
                                                <div className="space-y-1">
                                                    {
                                                        job.compositions.map((comp, i) =>
                                                            <div key={i} className="border-b py-1">
                                                                {comp.composition}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300">{job.styleNo}</td>

                                            <td className="px-3 py-2 align-middle text-gray-700 text-sm border border-gray-300">{"month"}</td>

                                            <td>
                                                <div className="space-y-1">
                                                    {
                                                        job.compositions.map((comp, i) =>
                                                            <div key={i} className="border-b py-1">
                                                                {comp.color}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </td>
                                            <td>
                                                <div className="space-y-1">
                                                    {
                                                        job.compositions.map((comp, i) =>
                                                            <div key={i} className="border-b py-1">
                                                                {comp.orderQty}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </td>
                                            <td>
                                                <div className="space-y-1">
                                                    {
                                                        job.compositions.map((comp, i) =>
                                                            <div key={i} className="border-b py-1">
                                                                {comp.unitePrice | "PRICE PER KG"}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </td>
                                            <td>
                                                <div className="space-y-1">
                                                    {
                                                        job.compositions.map((comp, i) =>
                                                            <div onClick={() => handleEditRowData(comp.id)} key={i} className="border-b py-1">
                                                                {comp.workOrderQty}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </td>
                                            <td>
                                                <div className="space-y-1">
                                                    {
                                                        job.compositions.map((comp, i) =>
                                                            <div onClick={() => handleEditRowData(comp.id)} key={i} className="border-b py-1">
                                                                {comp.totalYarnDelivery}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </td>
                                            <td>
                                                {
                                                    job.compositions.map((comp, i) =>

                                                        <div onClick={() => handleEditRowData(comp.id)} key={i} className="text-red-700 border-b py-1">
                                                            {comp.workOrderQty - comp.totalYarnDelivery}
                                                        </div>
                                                    )
                                                }
                                            </td>
                                            <td>
                                                {
                                                    job.compositions.map((comp, i) =>

                                                        <div onClick={() => handleEditRowData(comp.id)} key={i} className="text-red-700 border-b py-1">
                                                            {comp.totalYarnReturn}
                                                        </div>
                                                    )
                                                }
                                            </td>
                                            <td>
                                                {
                                                    job.compositions.map((comp, i) =>

                                                        <div onClick={() => handleEditRowData(comp.id)} key={i} className="text-red-700 border-b py-1">
                                                            {comp.greyReceived}
                                                        </div>
                                                    )
                                                }
                                            </td>
                                            <td>
                                                {
                                                    job.compositions.map((comp, i) =>

                                                        <div onClick={() => handleEditRowData(comp.id)} key={i} className="border-b py-1">
                                                            {comp.workOrderQty - comp.greyReceived}
                                                        </div>
                                                    )
                                                }
                                            </td>
                                            <td>
                                                {
                                                    job.compositions.map((comp, i) =>

                                                        <div onClick={() => handleEditRowData(comp.id)} key={i} className="text-pink-500 border-b py-1">
                                                            {comp.unitePrice * comp.greyReceived}
                                                        </div>
                                                    )
                                                }
                                            </td>
                                        </tr>
                                    );

                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AllOrders;