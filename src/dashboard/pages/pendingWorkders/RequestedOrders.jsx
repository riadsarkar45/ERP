import { useEffect, useState } from "react";
import useAxiosPrivate from "../../../hooks/UseAxiosPrivate";
import RequestedData from "./RequestedData";

const RequestedOrders = () => {
    const axiosPrivate = useAxiosPrivate();
    const [requestedWorkOrder, setWorkOrderData] = useState([])
    useEffect(() => {
        const getRequestedData = async () => {
            const data = await axiosPrivate.get("/api/requested-work-data")
            console.log(data.data);
            setWorkOrderData(data.data)
        }
        getRequestedData();
    }, [axiosPrivate])
    return (
        <div>
            {
                requestedWorkOrder?.map((item, i) => {
                    return (
                        <RequestedData
                            key={i + 3 + 4}
                            byUser={item.byUser}
                            requestType={item.requestType}
                            workOrder={item.workOrder}
                            requestedAt={item.requestAt}
                        />
                    )
                })
            }
        </div>
    );
};

export default RequestedOrders;