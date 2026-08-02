import React, { useMemo } from 'react';

const BORDER_COLOR = "#000000";

const cellStyle = {
    border: `1px solid ${BORDER_COLOR}`,
    padding: "10px 8px",
    verticalAlign: "middle",
    textAlign: "center",
    fontSize: "13px",
    boxSizing: "border-box",
};

const centeredCellStyle = {
    ...cellStyle,
    verticalAlign: "middle",
    textAlign: "center",
};

const footerCellStyle = {
    ...cellStyle,
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    backgroundColor: "#f3f4f6",
    fontWeight: 700,
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-US");
const formatMoney = (value) => Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const renderColoredShortExcess = (diff) => {
    const formatted = formatNumber(Math.abs(diff));
    return diff > 0
        ? <span className='text-green-600 font-extrabold'>{formatted}</span>
        : <span className='text-red-600 font-extrabold'>({formatted})</span>;
};

const getDeliverySum = (deliveries, targetType) => {
    if (!Array.isArray(deliveries)) return 0;
    const normalizedTarget = (targetType || "").trim().replace(/\s+/g, "").toLowerCase();
    
    return deliveries.reduce((acc, d) => {
        const normalizedType = (d.deliveryType || "").trim().replace(/\s+/g, "").toLowerCase();
        if (normalizedType === normalizedTarget) {
            return acc + (Number(d.deliveryQty) || 0);
        }
        return acc;
    }, 0);
};

const AopGlance = ({ detailView }) => {
    const processedData = useMemo(() => {
        return (detailView || []).map((job) => {
            const factoryName = job.workOrders?.[0]?.factoryName || "Unknown Factory";
            
            let totalWorkOrderQty = 0;
            let totalPayableAmount = 0;
            let sentForAop = 0;
            let receivedFromAop = 0;
            let aopFinishFabricRcvd = 0;
            let returnFromAop = 0;

            job.workOrders?.forEach((wo) => {
                wo.compositions?.forEach((comp) => {
                    const workOrderQty = Number(comp.workOrderQty) || 0;
                    totalWorkOrderQty += workOrderQty;

                    const compSentForAop = getDeliverySum(comp.deliveries, "SentForAop");
                    const compReceivedFromAop = getDeliverySum(comp.deliveries, "ReceivedFromAop");
                    const compAopFinishFabricRcvd = getDeliverySum(comp.deliveries, "AOPFinishFabricRcvd");
                    const compReturnFromAop = getDeliverySum(comp.deliveries, "ReturnFromAop");

                    sentForAop += compSentForAop;
                    receivedFromAop += compReceivedFromAop;
                    aopFinishFabricRcvd += compAopFinishFabricRcvd;
                    returnFromAop += compReturnFromAop;

                    const price = Number(comp.unitePrice) || 0;
                    // AOP billing is typically based on the finished fabric received
                    totalPayableAmount += (compAopFinishFabricRcvd * price);
                });
            });

            const averageUnitPrice = totalWorkOrderQty > 0 ? (totalPayableAmount / totalWorkOrderQty) : 0;

            return {
                jobNo: job.jobNo,
                factoryName,
                totalWorkOrderQty,
                averageUnitPrice,
                totalPayableAmount,
                sentForAop,
                receivedFromAop,
                aopFinishFabricRcvd,
                returnFromAop,
            };
        });
    }, [detailView]);

    const totals = useMemo(() => {
        const acc = {
            workOrderQty: 0,
            sentForAop: 0,
            receivedFromAop: 0,
            aopFinishFabricRcvd: 0,
            returnFromAop: 0,
            payableAmount: 0
        };
        processedData.forEach((job) => {
            acc.workOrderQty += job.totalWorkOrderQty;
            acc.sentForAop += job.sentForAop;
            acc.receivedFromAop += job.receivedFromAop;
            acc.aopFinishFabricRcvd += job.aopFinishFabricRcvd;
            acc.returnFromAop += job.returnFromAop;
            acc.payableAmount += job.totalPayableAmount;
        });
        return acc;
    }, [processedData]);

    if (!processedData || processedData.length === 0) {
        return (
            <tbody>
                <tr>
                    <td colSpan={10} style={{ ...cellStyle, padding: "40px", color: "#6b7280", backgroundColor: "#fafafa" }}>
                        Select a factory from the list above to view detailed breakdown.
                    </td>
                </tr>
            </tbody>
        );
    }

    return (
        <>
            <tbody>
                {processedData.map((job, i) => (
                    <tr key={i}>
                        {/* 1. AOP FACTORY NAME */}
                        <td style={centeredCellStyle}>{job.factoryName}</td>
                        {/* 2. JOB NO. */}
                        <td style={centeredCellStyle}>{job.jobNo}</td>
                        {/* 3. AOP WORK ORDER QTY */}
                        <td style={cellStyle}>{formatNumber(job.totalWorkOrderQty)}</td>
                        {/* 4. SENT FOR AOP */}
                        <td style={cellStyle}>{formatNumber(job.sentForAop)}</td>
                        {/* 5. RECEIVE FROM AOP */}
                        <td style={cellStyle}>{formatNumber(job.receivedFromAop)}</td>
                        {/* 6. FINISH RECEIVED FROM AOP */}
                        <td style={cellStyle}>{formatNumber(job.aopFinishFabricRcvd)}</td>
                        {/* 7. RETURN FROM AOP */}
                        <td style={cellStyle}>{formatNumber(job.returnFromAop)}</td>
                        {/* 8. SHORT & EXCESS */}
                        <td style={cellStyle}>{renderColoredShortExcess(job.receivedFromAop - job.aopFinishFabricRcvd)}</td>
                        {/* 9. PRICE PER KG */}
                        <td style={cellStyle}>{formatMoney(job.averageUnitPrice)}</td>
                        {/* 10. PAYABLE AMOUNT */}
                        <td style={cellStyle}>{formatMoney(job.totalPayableAmount)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    {/* 1. TOTAL Label */}
                    <td style={footerCellStyle}>TOTAL</td>
                    {/* 2. JOB NO. (Empty) */}
                    <td style={footerCellStyle}>&nbsp;</td>
                    {/* 3. WORK ORDER QTY */}
                    <td style={footerCellStyle}>{formatNumber(totals.workOrderQty)}</td>
                    {/* 4. SENT FOR AOP */}
                    <td style={footerCellStyle}>{formatNumber(totals.sentForAop)}</td>
                    {/* 5. RECEIVE FROM AOP */}
                    <td style={footerCellStyle}>{formatNumber(totals.receivedFromAop)}</td>
                    {/* 6. FINISH RECEIVED FROM AOP */}
                    <td style={footerCellStyle}>{formatNumber(totals.aopFinishFabricRcvd)}</td>
                    {/* 7. RETURN FROM AOP */}
                    <td style={footerCellStyle}>{formatNumber(totals.returnFromAop)}</td>
                    {/* 8. SHORT & EXCESS */}
                    <td style={footerCellStyle}>{renderColoredShortExcess(totals.receivedFromAop - totals.aopFinishFabricRcvd)}</td>
                    {/* 9. PRICE PER KG (Empty) */}
                    <td style={footerCellStyle}>&nbsp;</td>
                    {/* 10. PAYABLE AMOUNT */}
                    <td style={footerCellStyle}>{formatMoney(totals.payableAmount)}</td>
                </tr>
            </tfoot>
        </>
    );
};

export default AopGlance;