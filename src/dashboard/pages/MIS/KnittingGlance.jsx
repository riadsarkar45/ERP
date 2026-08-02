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

const KnittingGlance = ({ detailView }) => {
    const processedData = useMemo(() => {
        return (detailView || []).map((job) => {
            const factoryName = job.workOrders?.[0]?.factoryName || "Unknown Factory";
            
            let totalWorkOrderQty = 0;
            let totalPayableAmount = 0;
            let yarnDelivery = 0;
            let greyReceived = 0;
            let yarnReturn = 0;

            job.workOrders?.forEach((wo) => {
                wo.compositions?.forEach((comp) => {
                    const workOrderQty = Number(comp.workOrderQty) || 0;
                    totalWorkOrderQty += workOrderQty;

                    const compYarnDelivery = getDeliverySum(comp.deliveries, "YarnDelivery");
                    // Support both "GreyReceived" and "GreyFabricReceived" depending on your DB naming
                    const compGreyReceived = getDeliverySum(comp.deliveries, "GreyReceived") || getDeliverySum(comp.deliveries, "GreyFabricReceived");
                    const compYarnReturn = getDeliverySum(comp.deliveries, "YarnReturn");

                    yarnDelivery += compYarnDelivery;
                    greyReceived += compGreyReceived;
                    yarnReturn += compYarnReturn;

                    const price = Number(comp.unitePrice) || 0;
                    totalPayableAmount += (compGreyReceived * price);
                });
            });

            const averageUnitPrice = totalWorkOrderQty > 0 ? (totalPayableAmount / totalWorkOrderQty) : 0;

            return {
                jobNo: job.jobNo,
                factoryName,
                totalWorkOrderQty,
                averageUnitPrice,
                totalPayableAmount,
                yarnDelivery,
                greyReceived,
                yarnReturn,
            };
        });
    }, [detailView]);

    const totals = useMemo(() => {
        const acc = {
            workOrderQty: 0,
            yarnDelivery: 0,
            greyReceived: 0,
            yarnReturn: 0,
            payableAmount: 0
        };
        processedData.forEach((job) => {
            acc.workOrderQty += job.totalWorkOrderQty;
            acc.yarnDelivery += job.yarnDelivery;
            acc.greyReceived += job.greyReceived;
            acc.yarnReturn += job.yarnReturn;
            acc.payableAmount += job.totalPayableAmount;
        });
        return acc;
    }, [processedData]);

    if (!processedData || processedData.length === 0) {
        return (
            <tbody>
                <tr>
                    <td colSpan={9} style={{ ...cellStyle, padding: "40px", color: "#6b7280", backgroundColor: "#fafafa" }}>
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
                        {/* 1. KNITTING FACTORY NAME */}
                        <td style={centeredCellStyle}>{job.factoryName}</td>
                        {/* 2. JOB NO. */}
                        <td style={centeredCellStyle}>{job.jobNo}</td>
                        {/* 3. KNITTING WORK ORDER QTY */}
                        <td style={cellStyle}>{formatNumber(job.totalWorkOrderQty)}</td>
                        {/* 4. YARN DELIVERY */}
                        <td style={cellStyle}>{formatNumber(job.yarnDelivery)}</td>
                        {/* 5. GREY RECEIVED */}
                        <td style={cellStyle}>{formatNumber(job.greyReceived)}</td>
                        {/* 6. YARN RETURN */}
                        <td style={cellStyle}>{formatNumber(job.yarnReturn)}</td>
                        {/* 7. SHORT & EXCESS */}
                        <td style={cellStyle}>{renderColoredShortExcess(job.yarnDelivery - job.totalWorkOrderQty)}</td>
                        {/* 8. PRICE PER KG */}
                        <td style={cellStyle}>{formatMoney(job.averageUnitPrice)}</td>
                        {/* 9. PAYABLE AMOUNT */}
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
                    {/* 4. YARN DELIVERY */}
                    <td style={footerCellStyle}>{formatNumber(totals.yarnDelivery)}</td>
                    {/* 5. GREY RECEIVED */}
                    <td style={footerCellStyle}>{formatNumber(totals.greyReceived)}</td>
                    {/* 6. YARN RETURN */}
                    <td style={footerCellStyle}>{formatNumber(totals.yarnReturn)}</td>
                    {/* 7. SHORT & EXCESS */}
                    <td style={footerCellStyle}>{renderColoredShortExcess(totals.yarnDelivery - totals.workOrderQty)}</td>
                    {/* 8. PRICE PER KG (Empty) */}
                    <td style={footerCellStyle}>&nbsp;</td>
                    {/* 9. PAYABLE AMOUNT */}
                    <td style={footerCellStyle}>{formatMoney(totals.payableAmount)}</td>
                </tr>
            </tfoot>
        </>
    );
};

export default KnittingGlance;