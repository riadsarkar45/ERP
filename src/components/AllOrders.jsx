import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import useAxiosPublic from "../hooks/Axios";
import Input from "./Input";
import Modal from "./Modal";
import { useFetchData } from "../hooks/fetch";
import InlineEdit from "./inlineEdit/InlineEdit";
import YarnDyeOrders from "./YarnDyeOrders";
import KnittingOrder from "./KnittingOrder";



const AllOrders = ({ orderType }) => {
    const axiosPublic = useAxiosPublic();

    const [jobId, setOrderId] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [changedField, setChangedField] = useState({});
    const [styleNo, setStyleNo] = useState("");
    const [deliveries, setDeliveries] = useState({});
    const [workOrderId, setWorkOrderId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);
    const [editCellId, setEditCellId] = useState(null);
    const { fetchData, error, loading } = useFetchData();
    useEffect(() => {
        fetchData(`/api/work-order/${orderType}`).then(data => {
            if (data) setOrders(data);
        });
    }, [orderType]);

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded">Something went wrong please try again later</div>
    }

    if (loading) {
        return <div className="p-4 text-gray-500"><Loader2 className="animate-spin" size={40} /></div>
    }

    const COLUMNS = [];

    if (orderType === "knittingOrder") {
        COLUMNS.push(
            { header: "FACTORY NAME", width: "18mm", inputName: "factoryName" },
            { header: "JOB NO.", width: "10mm", inputName: "workOrderNo" },
            { header: "WORK ORDER NO", width: "10mm", inputName: "workOrderNo" },
            { header: "BUYER NAME", width: "30mm", inputName: "buyerName" },
            { header: "STYLE", width: "30mm", inputName: "styleNo" },
            { header: "MONTH", width: "10mm", inputName: "month" },

            { header: "COMPOSITION", width: "20mm", inputName: "composition" },
            { header: "COLOR", width: "50mm", inputName: "color" },
            { header: "ORDER QTY", width: "10mm", inputName: "orderQty" },
            { header: "PRICE PER KG", width: "11mm", inputName: "unitePrice" },
            { header: "WORK ORDER QTY", width: "13mm", inputName: "workOrderQty" },
            { header: "DELIVERY", width: "13mm", inputName: "totalYarnDelivery" },
            { header: "DEL. SHORT & EXCESS", width: "12mm" },
            { header: "YARN RETURN RECEIVED", width: "13mm" },
            { header: "YARN RECEIVED", width: "13mm" },
            { header: "RCVD SHORT & EXCESS", width: "13mm" },
            { header: "PAYABLE AMOUNT", width: "12mm" },
            { header: "PAID BILLING AMOUNT", width: "12mm" },
            { header: "PENDING BILLING AMOUNT", width: "12mm" },
        )
    }

    if (orderType === "dyeingOrder") {
        COLUMNS.push(
            { header: "FACTORY NAME", width: "18mm", inputName: "factoryName" },
            { header: "JOB NO.", width: "10mm", inputName: "workOrderNo" },
            { header: "WORK ORDER NO", width: "10mm", inputName: "workOrderNo" },
            { header: "BUYER NAME", width: "30mm", inputName: "buyerName" },
            { header: "STYLE", width: "30mm", inputName: "styleNo" },
            { header: "MONTH", width: "10mm", inputName: "month" },
            { header: "COMPOSITION", width: "20mm", inputName: "composition" },
            { header: "BOOKING COLOR", width: "50mm", inputName: "bookingColor" },
            { header: "ORDER QTY", width: "10mm", inputName: "orderQty" },
            { header: "ORDER COLOR", width: "50mm", inputName: "orderColor" },
            { header: "PRICE PER KG", width: "11mm", inputName: "unitePrice" },
            { header: "WORK ORDER QTY", width: "13mm", inputName: "workOrderQty" },
            { header: "GREY RECEIVED", width: "13mm", inputName: "greyReceived" },
            { header: "GREY RETURN", width: "13mm", inputName: "greyReturn" },
            { header: "FINISH RECEIVED", width: "13mm", inputName: "finishReceived" },
            { header: "FINISH RETURN", width: "13mm", inputName: "finishReturn" },
        )
    }

    if (orderType === "yarnDyeingOrder") {
        COLUMNS.push(
            { header: "FACTORY NAME", width: "18mm", inputName: "factoryName" },
            { header: "JOB NO.", width: "10mm", inputName: "jobNo" },
            { header: "WORK ORDER NO", width: "10mm", inputName: "workOrderNo" },
            { header: "BUYER NAME", width: "30mm", inputName: "buyerName" },
            { header: "STYLE", width: "30mm", inputName: "styleNo" },
            { header: "MONTH", width: "10mm", inputName: "month" },
            { header: "COMPOSITION", width: "20mm", inputName: "composition" },
            { header: "ORDER QTY", width: "10mm", inputName: "orderQty" },
            { header: "BOOKING COLOR", width: "50mm", inputName: "bookingColor" },
            { header: "ORDER COLOR", width: "50mm", inputName: "orderColor" },
            { header: "PRICE PER KG", width: "11mm", inputName: "unitePrice" },
            { header: "WORK ORDER QTY", width: "13mm", inputName: "workOrderQty" },
            { header: "GREY RECEIVED", width: "13mm", inputName: "greyReceived" },
            { header: "GREY RETURN", width: "13mm", inputName: "greyReturn" },
            { header: "FINISH RECEIVED", width: "13mm", inputName: "finishReceived" },
            { header: "FINISH RETURN", width: "13mm", inputName: "finishReturn" },
        )
    }

    if (orderType === "aopOrder") {
        COLUMNS.push(
            { header: "FACTORY NAME", width: "18mm", inputName: "factoryName" },
            { header: "JOB NO.", width: "10mm", inputName: "workOrderNo" },
            { header: "WORK ORDER NO", width: "10mm", inputName: "workOrderNo" },
            { header: "BUYER NAME", width: "30mm", inputName: "buyerName" },
            { header: "STYLE", width: "30mm", inputName: "styleNo" },
            { header: "MONTH", width: "10mm", inputName: "month" },
            { header: "COMPOSITION", width: "20mm", inputName: "composition" },
            { header: "COLOR", width: "50mm", inputName: "color" },
            { header: "ORDER QTY", width: "10mm", inputName: "orderQty" },
            { header: "PRICE PER KG", width: "11mm", inputName: "unitePrice" },
            { header: "WORK ORDER QTY", width: "13mm", inputName: "workOrderQty" },
            { header: "SENT FOR AOP", width: "13mm", inputName: "totalYarnDelivery" },
            { header: "DEL. SHORT & EXCESS", width: "12mm" },
            { header: "RECEIVED FROM AOP", width: "13mm" },
            { header: "SENT FOR COMPACTING", width: "13mm" },
            { header: "RECEIVED FROM COMPACTING", width: "13mm" },
            { header: "RCVD SHORT & EXCESS", width: "13mm" },
            { header: "PAYABLE AMOUNT", width: "12mm" },
            { header: "PAID BILLING AMOUNT", width: "12mm" },
            { header: "PENDING BILLING AMOUNT", width: "12mm" },
        )
    }

    const handleEditRowData = async (yarnId, workOrderNo) => {
        console.log(yarnId, workOrderNo);
        setLoadingDeliveries(true);
        console.log(yarnId, "yarnId");
        setIsEditing(true);

        const res = await axiosPublic.get(`/api/deliveries/${yarnId}`);
        console.log(res.data, "deliveries");
        if (res.data) {
            setLoadingDeliveries(false);
        }
        setDeliveries(res.data);

        setWorkOrderId(workOrderNo);
        setStyleNo(styleNo);
        setOrderId(yarnId);
    };
    console.log(jobId, "jobId");
    const handleFilter = () => {
        // const { name, value } = e.target;

    }





    const handleEditOnChange = (e) => {
        const { name, value } = e.target;
        setIsEditing(true);
        setChangedField(prev => ({ ...prev, [name]: value }));
    };
    const handleSubmit = async () => {
        setIsLoading(true);
        const update = await axiosPublic.patch(
            `/api/update-order/${jobId}`, changedField
        );
        if (update.status === 200) {
            const res = await axiosPublic.get(`/api/work-order/${orderType}`);
            const devs = await axiosPublic.get(`/api/deliveries/${jobId}`);
            setDeliveries(devs.data);
            console.log('fetched');
            setOrders(res.data);
            setIsLoading(false);
            setChangedField({});
        }
    };


    return (
        <>


            <div>
                {/* {
                    alertType && (
                        <div className={`${alertType === "success" ? "bg-green-600 border-green-500 text-green-600" : "bg-red-600 border-red-500 text-red-600"}  bg-opacity-25 border  p-2 rounded-md`}>
                            <h2>
                                {alertType === "success" ? "Update Successful" : "Something went wrong, please try again few minutes later"}
                            </h2>
                        </div>

                    )
                } */}
                <div className="mb-5 p-2 rounded-sm">
                    {(!orders || orders.length < 1) && (
                        <div>No order found</div>
                    )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="table-container printable-table-area">
                        {isEditing && (
                            <Modal
                                workOrderId={workOrderId}
                                isLoading={isLoading}
                                deliveriesLoading={loadingDeliveries}
                                deliveries={deliveries}
                                setIsEditing={setIsEditing}
                                handleSubmit={handleSubmit}
                                handleEditOnChange={handleEditOnChange}
                                orderId={jobId}
                                orders={orders}
                                orderType={orderType}
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
                                            className="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-700 text-sm border-b border-gray-200"
                                        >
                                            <div className="grid ">
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
                            {/* <YarnDyeOrders
                                orders={orders}
                                handleEditRowData={handleEditRowData}
                            /> */}
                            <KnittingOrder 
                                orders={orders}
                                handleEditRowData={handleEditRowData}
                            />
                            
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AllOrders;