import React, { useState, useEffect, useContext } from 'react';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';
import { Loader2 } from 'lucide-react';
import AllPendingWorkOrder from './AllPendingWorkOrder';
import UseAllUsers from '../users/allUsers/AllUsers';
import { useSocket } from '../../../hooks/socket.io/socketContext';
import { AuthContext } from '../../auth/AuthContext';

const NotApprovedWorkOrder = () => {
    const axiosSecure = useAxiosPrivate();
    const [isLoading, setIsLoading] = useState(true);
    const [selectOrderType, setSelectedOrderType] = useState("knittingOrder");
    const [workOrder, setWorkOrder] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [error, setError] = useState(null);
    const partyViews = ["knittingOrder", "dyeingOrder", "aopOrder"];
    const { allUsers } = UseAllUsers();
    const socket = useSocket();
    const { user } = useContext(AuthContext);

    const handleOrderType = (v) => {
        if (v === selectOrderType) return;
        setSelectedOrderType(v);
        setIsLoading(true);
    };

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    useEffect(() => {
        let isActive = true;
        const fetchApprovalPendingWorkOrder = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data } = await axiosSecure.get(
                    `/api/pending/work-order/${selectOrderType}`,
                    { params: debouncedSearch ? { search: debouncedSearch } : {} }
                );
                if (isActive) setWorkOrder(Array.isArray(data) ? data : []);
            } catch (err) {
                if (isActive) {
                    console.error("Failed to fetch pending work orders:", err);
                    setError("Failed to load pending work orders.");
                    setWorkOrder([]);
                }
            } finally {
                if (isActive) setIsLoading(false);
            }
        };
        fetchApprovalPendingWorkOrder();
        return () => { isActive = false; };
    }, [axiosSecure, selectOrderType, debouncedSearch]);

    const handleUserOnchange = async (e, workOrderId) => {
        const { value } = e.target;
        if (!value || !workOrderId) return;

        try {
            const sendRequest = await axiosSecure.patch(`/api/request-for-approval/workOrderApproval/${workOrderId}/${value}`);
            if (sendRequest.status === 200) {
                setError(null);
                const { data } = await axiosSecure.get(`/api/pending/work-order/${selectOrderType}`);
                setWorkOrder(Array.isArray(data) ? data : []);

                if (!socket || !user) return console.warn("Socket or User missing");

                const senderId = user.id || user._id;
                
                console.log("🚀 Emitting to socket...");
                socket.emit("notify-work-order-request", {
                    senderUserId: senderId,
                    userName: user.name,
                    receiverUserId: value,
                    message: `${user.name} sent a work order approval request`,
                });
            }
        } catch (err) {
            console.error("Failed to process work order:", err);
            setError("Failed to process work order.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto p-4">
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

            {error && <p className="text-center text-red-500 py-4">{error}</p>}
            {!isLoading && !error && workOrder.length === 0 && <p className="text-center text-gray-400 py-10">No pending work orders found.</p>}

            <div>
                {workOrder?.map((it) => (
                    <AllPendingWorkOrder key={it.id ?? `${it.workOrderNo}-${it.jobNo}`} {...it} concernPersons={allUsers} handleUserOnchange={handleUserOnchange} />
                ))}
            </div>
        </div>
    );
};

export default NotApprovedWorkOrder;