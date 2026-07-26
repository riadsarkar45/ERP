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

// Convention: diff > 0 => excess (green, plain). diff <= 0 => short (red, parens).
const renderShortExcess = (diff) => {
    const formatted = formatNumber(Math.abs(diff));
    return diff > 0 ? formatted : `(${formatted})`;
};

const renderBreakdownCell = (items, renderItem, keyPrefix, center = false) => {
    const list = normalizeToArray(items);

    if (list.length === 0) {
        return (
            <div style={center
                ? { padding: "10px 8px", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }
                : { padding: "10px 8px", minHeight: "36px" }}>
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
                    ...(center ? { display: "flex", alignItems: "center", justifyContent: "center" } : {}),
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

const AopDetail = ({ detailView }) => {
    // Totals across every row currently in detailView. Computed unconditionally
    // (before the early-return below) so hook order stays stable across renders.
    const totals = useMemo(() => {
        const acc = {
            workOrderQty: 0,
            sentForAop: 0,
            receivedFromAop: 0,
            aopFinishFabricRcvd: 0,
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

            acc.sentForAop += sumValue(deliveries?.SentForAop);
            acc.receivedFromAop += sumValue(deliveries?.ReceivedFromAop);
            acc.aopFinishFabricRcvd += sumValue(deliveries?.AOPFinishFabricRcvd);
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

    // Two SHORT & EXCESS totals, aggregated the same way the per-row cells
    // derive them, rather than summing each row's already-rounded diffs.
    const shortExcess1Total = totals.sentForAop - totals.workOrderQty; // sent for AOP vs work order qty
    const shortExcess2Total = totals.receivedFromAop - totals.aopFinishFabricRcvd; // received from AOP vs finish fabric received

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
                            <td style={centeredCellStyle}>
                                {renderBreakdownCell(factory, (f) => f.factoryName, `factory-${i}`, true)}
                            </td>
                            <td style={centeredCellStyle}>
                                {renderBreakdownCell(d.jobNo, (jn) => jn, `job-${i}`, true)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(comps, (c) => c.composition, `comp-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(unitePrice, (up) => up.workOrderQty, `qty-${i}`)}
                            </td>

                            <td style={cellStyle}>
                                {renderBreakdownCell(deliveries?.SentForAop, (v) => v, `sent-${i}`)}
                            </td>

                            <td style={cellStyle}>
                                {renderBreakdownCell(deliveries?.ReceivedFromAop, (v) => v, `received-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(deliveries?.AOPFinishFabricRcvd, (v) => v, `finish-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(deliveries?.ReturnFromAop, (v) => v, `finish-${i}`)}

                                {/* ReturnFromAop */}
                                {/* {renderBreakdownCell(unitePrice, (up) => {
                                    // Match the total's convention: positive = excess (sent > ordered).
                                    const sentForAop = sumValue(deliveries?.SentForAop);
                                    const workOrderQty = Number(up.workOrderQty) || 0;
                                    const diff = sentForAop - workOrderQty;

                                    return diff > 0
                                        ? <span className='text-green-600 font-extrabold'>{Math.abs(diff)}</span>
                                        : <span className='text-red-600 font-extrabold'>({Math.abs(diff)})</span>;
                                }, `short-${i}`)}
                                aop return */}
                            </td>

                            <td style={cellStyle}>
                                {renderBreakdownCell(unitePrice, () => {
                                    // Received-from-AOP vs finish-fabric-received is a delivery-level
                                    // comparison, not per-composition — `up` has no AOPFinishFabricRcvd field.
                                    const receivedFromAop = sumValue(deliveries?.ReceivedFromAop);
                                    const aopFinishFabricRcvd = sumValue(deliveries?.AOPFinishFabricRcvd);
                                    const diff = receivedFromAop - aopFinishFabricRcvd;

                                    return diff > 0
                                        ? <span className='text-green-600 font-extrabold'>{Math.abs(diff)}</span>
                                        : <span className='text-red-600 font-extrabold'>({Math.abs(diff)})</span>;
                                }, `short2-${i}`)}
                            </td>
                            <td style={cellStyle}>
                                {renderBreakdownCell(unitePrice, (up) => up.unitePrice, `price-${i}`)}
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
                    {/* FACTORY NAME — total label */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>TOTAL</div>
                    </td>
                    {/* JOB NO. — not summable */}
                    <td style={footerCellStyle}><div style={{ padding: "10px 8px" }}>&nbsp;</div></td>
                    {/* COMPOSITION — not summable */}
                    <td style={footerCellStyle}><div style={{ padding: "10px 8px" }}>&nbsp;</div></td>
                    {/* WORK ORDER QTY */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.workOrderQty)}</div>
                    </td>
                    {/* SENT FOR AOP */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.sentForAop)}</div>
                    </td>
                    {/* RECEIVED FROM AOP */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.receivedFromAop)}</div>
                    </td>
                    {/* AOP FINISH FABRIC RECEIVED */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatNumber(totals.aopFinishFabricRcvd)}</div>
                    </td>
                    {/* SHORT & EXCESS (sent for AOP vs work order qty) */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{renderShortExcess(shortExcess1Total)}</div>
                    </td>
                    {/* SHORT & EXCESS (received from AOP vs finish fabric received) */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{renderShortExcess(shortExcess2Total)}</div>
                    </td>
                    {/* PRICE PER KG — not summable */}
                    <td style={footerCellStyle}><div style={{ padding: "10px 8px" }}>&nbsp;</div></td>
                    {/* PAYABLE AMOUNT */}
                    <td style={footerCellStyle}>
                        <div style={{ padding: "10px 8px" }}>{formatMoney(totals.payableAmount)}</div>
                    </td>
                </tr>
            </tfoot>
        </>
    );
};

export default AopDetail;