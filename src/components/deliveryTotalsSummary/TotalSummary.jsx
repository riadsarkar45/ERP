import React, { useEffect, useState, useCallback } from 'react';
import Input from '../Input';
import { RefreshCcw } from 'lucide-react';
import useAxiosPrivate from '../../hooks/UseAxiosPrivate';

const SUMMARY_CONFIG = {
    knittingOrder: [
        { key: 'knittingOrder', field: 'workOrderQty', label: 'Total Work Order Qty' },
        { key: 'YarnDelivery', field: 'deliveryQty', label: 'Total Yarn Delivery Qty' },
        { key: 'YarnReturn', field: 'deliveryQty', label: 'Total Yarn Return Qty' },
        { key: 'GreyFabricReceived', field: 'deliveryQty', label: 'Total Grey Fabric Received Qty' },
    ],
    dyeingOrder: [
        { key: 'dyeingOrder', field: 'workOrderQty', label: 'Total Work Order Qty' },
        { key: 'GreyDelivery', field: 'deliveryQty', label: 'Total Grey Delivery Qty' },
        { key: 'GreyReceived', field: 'deliveryQty', label: 'Total Grey Received Qty' },
        { key: 'FinishReceived', field: 'deliveryQty', label: 'Total Finish Received Qty' },
        { key: 'GreyReturn', field: 'deliveryQty', label: 'Total Grey Return Qty' },
        { key: 'SentForReprocess', field: 'deliveryQty', label: 'Total Sent For Reprocess Qty' },
        { key: 'ReceivedFromReprocess', field: 'deliveryQty', label: 'Total Received From Reprocess Qty' },
    ],
    aopOrder: [
        { key: 'aopOrder', field: 'workOrderQty', label: 'Total Work Order Qty' },
        { key: 'SentForAop', field: 'deliveryQty', label: 'Total Sent For AOP Qty' },
        { key: 'ReceivedFromAop', field: 'deliveryQty', label: 'Total Received From AOP Qty' },
        { key: 'AOPFinishFabricRcvd', field: 'deliveryQty', label: 'Total AOP Finish Fabric Received Qty' },
        { key: 'ReturnFromAop', field: 'deliveryQty', label: 'Total Return From AOP Qty' },
    ],
};

const dyeingOrderType = Object.keys(SUMMARY_CONFIG);

const TotalSummary = ({ height, bgColor, color }) => {
    const [orderType, setOrderType] = useState(dyeingOrderType[0]);
    const [detailData, setDetailData] = useState({});
    const [loading, setLoading] = useState(false);
    const axiosSecure = useAxiosPrivate();

    const fields = SUMMARY_CONFIG[orderType] ?? [];

    const fetchDetail = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosSecure.get(`/api/delivery/type/total/${orderType}`);
            setDetailData(res.data ?? {});
        } catch (err) {
            console.error('Failed to fetch summary', err);
            setDetailData({});
        } finally {
            setLoading(false);
        }
    }, [axiosSecure, orderType]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    // fixed: Input calls onChange(e), same as NewOrder.jsx — read e.target.value, not the arg itself
    const handleChange = (e) => {
        const { value } = e.target;
        setOrderType(value);
    };

    return (
        <div className='bg-white p-2'>
            <div className='flex gap-2 mb-2'>
                <Input
                    name="orderType"
                    type="select"
                    required
                    placeholder="Order Type"
                    options={dyeingOrderType}
                    value={orderType}
                    onChange={handleChange}
                />
                <button
                    onClick={fetchDetail}
                    className='border p-2 hover:bg-gray-100 rounded-lg text-gray-400'
                >
                    <RefreshCcw className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 
                ${orderType === "dyeingOrder" ? "lg:grid-cols-7" : "lg:grid-cols-4"}
                ${orderType === "aopOrder" ? "lg:grid-cols-5" : "lg:grid-cols-4"}
                
                gap-4
                `
            }>
                {fields.map((f) => {
                    const value = detailData[f.key]?.[f.field] ?? 0;
                    return (
                        <div
                            key={f.key}
                            className={`${bgColor} ${height} border-l-4 border-l-green-500 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 p-5`}
                        >
                            <p className={`text-[11px] uppercase tracking-wider ${color} font-medium mb-2`}>{f.label}</p>
                            <p className={`text-xl font-semibold ${color} tabular-nums`}>
                                {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TotalSummary;