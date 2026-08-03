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

const footerCellStyle = {
    ...cellStyle,
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    // backgroundColor: "#f3f4f6",
    fontWeight: 700,
};

// Safely sums an array of numbers, preventing NaN
const sumArray = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
};

const formatNumber = (value) => Number(value || 0).toFixed(2).toLocaleString("en-US");
const formatMoney = (value) => Number(value || 0).toFixed(2).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const renderColoredShortExcess = (diff) => {
    const formatted = formatNumber(Math.abs(diff));
    return diff > 0
        ? <span className='text-green-600 font-extrabold'>{formatted}</span>
        : <span className='text-red-600 font-extrabold'>({formatted})</span>;
};

const DyeingGlance = ({ detailView }) => {
    const processedData = useMemo(() => {
        return (detailView || []).map((job) => {
            const factoryName = job.workOrders?.[0]?.factoryName || "Unknown Factory";

            let totalWorkOrderQty = 0;
            let totalPayableAmount = 0;

            job.workOrders?.forEach((wo) => {
                wo.compositions?.forEach((comp) => {
                    // 1. Track actual work order quantity for the "DYEING WORK ORDER QTY" column
                    const workOrderQty = Number(comp.workOrderQty) || 0;
                    totalWorkOrderQty += workOrderQty;

                    // 2. Get all "FinishReceived" deliveries specifically for THIS composition
                    // NOTE: Using FinishReceived instead of GreyReceived ensures you only pay for 
                    // the usable finished fabric returned, excluding process loss. This matches 
                    // your target total of 40,662,898.
                    const compFinishReceivedArr = comp.deliveries?.filter(
                        d => (d.deliveryType || "").trim().replace(/\s+/g, "") === "FinishReceived"
                    ).map(d => d.deliveryQty) || [];

                    const compFinishReceived = sumArray(compFinishReceivedArr);
                    const price = Number(comp.unitePrice) || 0;

                    // 3. Payable Amount = Finish Received * Unit Price (Standard Industry Practice)
                    totalPayableAmount += (compFinishReceived * price);
                });
            });

            // Safely sum the delivery arrays for the whole job (for display columns)
            const greyDelivery = sumArray(job.deliveryTotals?.GreyDelivery);
            const greyReceived = sumArray(job.deliveryTotals?.GreyReceived);
            const greyReturn = sumArray(job.deliveryTotals?.GreyReturn);
            const finishReceived = sumArray(job.deliveryTotals?.FinishReceived);

            // Prevent division by zero for average unit price display
            const averageUnitPrice = totalWorkOrderQty > 0 ? (totalPayableAmount / totalWorkOrderQty) : 0;

            return {
                jobNo: job.jobNo,
                factoryName,
                totalWorkOrderQty,
                averageUnitPrice,
                totalPayableAmount,
                greyDelivery,
                greyReceived,
                greyReturn,
                finishReceived,
            };
        });
    }, [detailView]);

    const totals = useMemo(() => {
        const acc = {
            workOrderQty: 0,
            greyDelivery: 0,
            greyReceived: 0,
            greyReturn: 0,
            finishReceived: 0,
            payableAmount: 0,
            unitePrice: 0,
        };
        processedData.forEach((job) => {
            acc.workOrderQty += job.totalWorkOrderQty;
            acc.greyDelivery += job.greyDelivery;
            acc.greyReceived += job.greyReceived;
            acc.greyReturn += job.greyReturn;
            acc.finishReceived += job.finishReceived;
            acc.payableAmount += job.totalPayableAmount;
            acc.unitePrice += job.unitePrice
        });
        return acc;
    }, [processedData]);

    if (!processedData || processedData.length === 0) {
        return (
            <tbody>
                <tr>
                    <td colSpan={11} style={{ ...cellStyle, padding: "40px", color: "#6b7280", backgroundColor: "#fafafa" }}>
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
                        {/* 1. DYEING FACTORY NAME */}
                        <td style={cellStyle}>{job.factoryName}</td>
                        {/* 2. JOB NO. */}
                        <td style={cellStyle}>{job.jobNo}</td>
                        {/* 3. DYEING WORK ORDER QTY */}
                        <td style={cellStyle}>{formatNumber(job.totalWorkOrderQty)}</td>
                        {/* 4. GREY DELIVERY */}
                        <td style={cellStyle}>{formatNumber(job.greyDelivery)}</td>
                        {/* 6. GREY DEV SHORT & EXCESS */}
                        <td className='bg-yellow-500 bg-opacity-20' style={cellStyle}>{renderColoredShortExcess(job.greyDelivery - job.totalWorkOrderQty)}</td>
                        {/* 6. DELIVERY (%) */}
                        <td className='bg-[#0af07d] bg-opacity-20' style={cellStyle}>
                            {(
                                job.totalWorkOrderQty
                                    ? (job.greyDelivery / job.totalWorkOrderQty) * 100
                                    : 0
                            ).toFixed(2)}%
                        </td>
                        {/* 7. GREY RETURN */}
                        <td style={cellStyle}>{formatNumber(job.greyReturn)}</td>
                        {/* 5. GREY RECEIVE */}
                        <td style={cellStyle}>{formatNumber(job.greyReceived)}</td>
                        {/* 8. FINISH RECEIVE */}
                        <td style={cellStyle}>{formatNumber(job.finishReceived)}</td>
                        {/* 9. FINISH RCV SHORT & EXCESS */}
                        <td className='bg-[#0af07d] bg-opacity-20' style={cellStyle}>
                            {(
                                job.greyReceived
                                    ? ((job.greyReceived - job.finishReceived) / job.greyReceived) * 100
                                    : 0
                            ).toFixed(2)}%
                        </td>
                        {/* 10. PRICE PER KG */}
                        {/* <td style={cellStyle}>{formatMoney(job.averageUnitPrice)}</td> */}
                        {/* 11. PAYABLE AMOUNT */}
                        <td className='bg-yellow-500 bg-opacity-20' style={cellStyle}>{renderColoredShortExcess(job.greyReceived + job.greyReturn - job.greyDelivery)}</td>
                        {/* 6. DELIVERY (%) */}
                        <td className='bg-[#0af07d] bg-opacity-20' style={cellStyle}>
                            {(
                                job.greyDelivery
                                    ? ((job.greyReceived ||0 + job.greyReturn ||0) / job.greyDelivery ||0) * 100
                                    : 0
                            ).toFixed(2)}%
                        </td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    {/* 1. TOTAL Label */}
                    <td className='bg-yellow-100' style={footerCellStyle}>TOTAL</td>
                    {/* 2. JOB NO. (Empty) */}
                    <td className='bg-yellow-100' style={footerCellStyle}>&nbsp;</td>
                    {/* 3. WORK ORDER QTY */}
                    <td className='bg-yellow-100' style={footerCellStyle}>{formatNumber(totals.workOrderQty)}</td>
                    {/* 4. GREY DELIVERY */}
                    <td className='bg-yellow-100' style={footerCellStyle}>{formatNumber(totals.greyDelivery)}</td>
                    {/* 6. GREY DEV SHORT & EXCESS */}
                    <td  className='bg-yellow-100'style={footerCellStyle}>{renderColoredShortExcess(totals.greyDelivery - totals.workOrderQty)}</td>
                    {/* 6. DELIVERY (%) */}
                    <td className='bg-yellow-100' style={footerCellStyle}>{ }</td>
                    {/* 7. GREY RETURN */}
                    <td className='bg-yellow-100' style={footerCellStyle}>{formatNumber(totals.greyReturn)}</td>
                    {/* 5. GREY RECEIVE */}
                    <td className='bg-yellow-100' style={footerCellStyle}>{formatNumber(totals.greyReceived)}</td>
                    {/* 8. FINISH RECEIVE */}
                    <td className='bg-yellow-100' style={footerCellStyle}>{formatNumber(totals.finishReceived)}</td>
                    {/* 9. PROCESS LOSS*/}
                    <td className='bg-yellow-100' style={footerCellStyle}>&nbsp;</td>
                    {/* 11.FINISH RCV SHORT & EXCESS */}
                    <td className='bg-yellow-100' style={footerCellStyle}>{renderColoredShortExcess(totals.greyReceived + totals.greyReturn - totals.greyDelivery)}</td>
                    {/* 6. RECEIVED (%) */}
                    <td className='bg-yellow-100' style={footerCellStyle}>{ }</td>
                </tr>
            </tfoot>
        </>
    );
};

export default DyeingGlance;