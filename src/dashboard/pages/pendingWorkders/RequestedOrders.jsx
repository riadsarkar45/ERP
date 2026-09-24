import { useContext, useEffect, useState } from "react";
import useAxiosPrivate from "../../../hooks/UseAxiosPrivate";
import RequestedData from "./ReceivedRequesteData";
import UseAllUsers from "../users/allUsers/AllUsers";
import { AuthContext } from "../../auth/AuthContext";
import { useSocket } from "../../../hooks/socket.io/socketContext";
import { Loader2 } from "lucide-react";

const RequestedOrders = () => {
    const axiosPrivate = useAxiosPrivate();
    const [requestedWorkOrder, setWorkOrderData] = useState([])
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(null);
    const partyViews = ["knittingOrder", "dyeingOrder", "aopOrder"];
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [selectOrderType, setSelectedOrderType] = useState("knittingOrder");

    const [error, setError] = useState(null);
    const socket = useSocket();

    const { user } = useContext(AuthContext);

    const { allUsers } = UseAllUsers();


    const handleOrderType = (v) => {
        if (v === selectOrderType) return;
        setSelectedOrderType(v);
        setIsLoading(true);
    };

    useEffect(() => {
        const getRequestedData = async () => {
            const data = await axiosPrivate.get(`/api/requested-work-data/${selectOrderType}`)
            console.log(data.data);
            setWorkOrderData(data.data)
        }
        getRequestedData();
    }, [axiosPrivate, selectOrderType])

    const extractErrorMessage = async (err) => {
        const fallback = 'Failed to generate PDF. Please try again.';
        const data = err?.response?.data;

        if (!data) return fallback;

        if (data instanceof Blob) {
            try {
                const text = await data.text();
                const parsed = JSON.parse(text);
                return parsed?.message || fallback;
            } catch {
                return fallback;
            }
        }

        return data?.message || fallback;
    };

    const handleDownloadPdf = async (id, jobNo) => {
        if (!id || isDownloading) return;

        setIsDownloading(true);
        setDownloadError(null);

        try {
            const response = await axiosPrivate.get(
                `/api/generate-pdf-work-order/${id}`, // adjust to match your actual route mount path
                { responseType: 'blob' }
            );

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `Knitting-WorkOrder-${jobNo ?? id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download work order PDF:', err);
            const message = await extractErrorMessage(err);
            setDownloadError(message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleUserOnchange = async (e, workOrderId) => {
        const { value } = e.target;
        if (!value || !workOrderId) return;

        try {
            const sendRequest = await axiosPrivate.patch(`/api/request-for-approval/workOrderApproval/${workOrderId}/${value}`);
            if (sendRequest.status === 200) {
                setError(null);
            }
        } catch (err) {
            console.error("Failed to process work order:", err);
            setError("Failed to process work order.");
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
                {partyViews.map((v) => (
                    <button key={v} onClick={() => handleOrderType(v)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectOrderType === v ? "bg-blue-800 text-white shadow-sm" : "bg-blue-50 text-blue-900 hover:bg-blue-100"}`}>
                        {v.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </button>
                ))}
                {isLoading && <Loader2 className="animate-spin text-blue-800 ml-1" size={20} />}
            </div>

            <div className='pb-2 mb-5 border-b'>
                <input type="text" value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Buyer, Lot No, Stich Length, Yarn Count'
                    className='w-full rounded-lg outline-none border p-2 mb-2' />
            </div>
            {
                requestedWorkOrder?.map((item, i) => {
                    return (
                        <RequestedData
                            key={i + 3 + 4}
                            byUser={item.byUser}
                            requestType={item.requestType}
                            workOrder={item.workOrder}
                            requestedAt={item.requestAt}
                            handleDownloadPdf={handleDownloadPdf}
                            downloadError={downloadError}
                            isDownloading={isDownloading}
                            concernPersons={allUsers}
                            handleUserOnchange={handleUserOnchange}
                        />
                    )
                })
            }
        </div>
    );
};

export default RequestedOrders;