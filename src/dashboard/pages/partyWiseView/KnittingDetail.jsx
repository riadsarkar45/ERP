import React, { useMemo } from 'react';

const BORDER_COLOR = "#000000";

const cellStyle = {
    // Use exactly 1px. Fractional pixels (like 0.8px) cause blurry/messy double borders in browsers.
    border: `1px solid ${BORDER_COLOR}`,
    padding: 0,
    verticalAlign: "top",
    fontSize: "13px",
    boxSizing: "border-box",
};

const footerCellStyle = {
    ...cellStyle,
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    backgroundColor: "#f3f4f6",
    fontWeight: 700,
};

const normalizeToArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
};

// Sums a field that may come through as a single number, a numeric string,
// or an array of either (same shapes normalizeToArray already handles for display).
const sumValue = (value) => {
    const list = normalizeToArray(value);
    return list.reduce((acc, v) => acc + (Number(v) || 0), 0);
};

const formatNumber = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString("en-US");
};

const formatMoney = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Mirrors the per-row SHORT & EXCESS convention already used below:
// diff > 0 renders plain, diff <= 0 renders in parentheses.
const renderShortExcess = (diff) => {
    const formatted = formatNumber(Math.abs(diff));
    return diff > 0 ? formatted : `(${formatted})`;
};

const renderBreakdownCell = (items, renderItem, keyPrefix) => {
    const list = normalizeToArray(items);
    
    if (list.length === 0) {
        return (
            <div style={{ padding: "10px 8px", minHeight: "36px" }}>
                &nbsp;
            </div>
        );
    }

    return list.map((item, idx) => {
        const isLastItem = idx === list.length - 1;
        
        return (
            <div
                key={`${keyPrefix}-${idx}`}
                style={{
                    padding: "10px 8px",
                    // ONLY draw a line BETWEEN items. 
                    // The last item relies on the parent <td>'s bottom border, preventing double borders.
                    borderBottom: isLastItem ? "none" : `1px solid ${BORDER_COLOR}`,
                }}
            >
                {renderItem(item, idx)}
            </div>
        );
    });
};

const KnittingDetail = ({ detailView }) => {
    // Totals across every row currently in detailView. Computed unconditionally
    // (before the early-return below) so hook order stays stable across renders.
    const totals = useMemo(() => {
        const acc = {
            workOrderQty: 0,
            yarnDelivery: 0,
            greyReceived: 0,
            yarnReturn: 0,
            balance: 0,
            payableAmount: 0,
        };

        (detailView || []).forEach((d) => {
            const factory = d.workOrders || [];
            const deliveries = d.deliveryTotals || {};
            const unitePriceArr = factory.flatMap((c) => c.compositions || []) || [];

            unitePriceArr.forEach((up) => {
                acc.workOrderQty += Number(up.workOrderQty) || 0;
            });

            acc.yarnDelivery += sumValue(deliveries?.YarnDelivery);
            acc.greyReceived += sumValue(deliveries?.GreyReceived);
            acc.yarnReturn += sumValue(deliveries?.YarnReturn);
            acc.balance += sumValue(deliveries?.Balance);

            if (deliveries?.PayableAmount !== undefined && deliveries?.PayableAmount !== null) {
                acc.payableAmount += sumValue(deliveries.PayableAmount);
            } else {
                unitePriceArr.forEach((up) => {
                    const price = Number(up.unitePrice) || 0;
                    const qty = Number(up.workOrderQty) || 0;
                    acc.payableAmount += price * qty;
                });
            }
        });

        return acc;
    }, [detailView]);

    if (!detailView || detailView.length === 0) {
        return (
            <tbody>
                <tr>
                    <td 
                        colSpan={11} 
                        style={{ 
                            border: `1px solid ${BORDER_COLOR}`, 
                            padding: "40px", 
                            textAlign: "center", 
                            color: "#6b7280",
                            fontSize: "14px",
                            backgroundColor: "#fafafa"
                        }}
                    >
                        Select a factory from the list above to view detailed breakdown.
                    </td>
                </tr>
            </tbody>
        );
    }

    // SHORT & EXCESS total, aggregated the same way the per-row cell derives
    // it (yarn delivered minus work order qty) rather than summing each
    // row's already-rounded per-composition diffs.
    const shortExcessTotal = totals.yarnDelivery - totals.workOrderQty;

    return (
        <>
            <tbody>
                {detailView.map((d, i) => {
                    const factory = d.workOrders || [];
                    const deliveries = d.deliveryTotals || {}; 
                    const comps = d.rows || [];
                    const unitePrice = factory.flatMap((c) => c.compositions || []) || [];

                    return (
                        <tr key={i}>
                            <td style={cellStyle}>
                                {renderBreakdownCell(factory, (f) => f.factoryName, `factory-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(d.jobNo, (jn) => jn, `job-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(comps, (c) => c.composition, `comp-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(unitePrice, (up) => up.unitePrice, `price-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(unitePrice, (up) => up.workOrderQty, `qty-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(deliveries?.YarnDelivery, (v) => v, `yd-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(unitePrice, (up) => {
                                    const yarnDelivery = Number(deliveries?.YarnDelivery) || 0;
                                    const workOrderQty = Number(up.workOrderQty) || 0;
                                    const diff = yarnDelivery - workOrderQty;
                                    return diff > 0 ? Math.abs(diff) : `(${Math.abs(diff)})`;
                                }, `short-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(deliveries?.GreyReceived, (v) => v, `grey-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(deliveries?.YarnReturn, (v) => v, `return-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(deliveries?.Balance, (v) => v, `balance-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(unitePrice, (up) => {
                                    const price = Number(up.unitePrice) || 0;
                                    const qty = Number(up.workOrderQty) || 0;
                                    const payable = deliveries?.PayableAmount ?? (price * qty);
                                    return typeof payable === "number" ? payable.toFixed(2) : payable;
                                }, `payable-${i}`)}
                            </td>
                        </tr>
                    );
                })}
            </tbody>

            <tfoot>
                <tr>
                    {/* KNITTING FACTORY NAME — total label */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>TOTAL</div>
                    </td>
                    {/* JOB NO. */}
                    <td style={footerCellStyle}><div style={{ padding: "10px 8px" }}>&nbsp;</div></td>
                    {/* COMPOSITION */}
                    <td style={footerCellStyle}><div style={{ padding: "10px 8px" }}>&nbsp;</div></td>
                    {/* PRICE PER KG — not summable */}
                    <td style={footerCellStyle}><div style={{ padding: "10px 8px" }}>&nbsp;</div></td>
                    {/* KNITTING WORK ORDER QTY */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.workOrderQty)}</div>
                    </td>
                    {/* YARN DELIVERY */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.yarnDelivery)}</div>
                    </td>
                    {/* SHORT & EXCESS */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{renderShortExcess(shortExcessTotal)}</div>
                    </td>
                    {/* GREY RECEIVED */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.greyReceived)}</div>
                    </td>
                    {/* YARN RETURN */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.yarnReturn)}</div>
                    </td>
                    {/* BALANCE */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.balance)}</div>
                    </td>
                    {/* PAYABLE AMOUNT */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatMoney(totals.payableAmount)}</div>
                    </td>
                </tr>
            </tfoot>
        </>
    );
};

export default KnittingDetail;