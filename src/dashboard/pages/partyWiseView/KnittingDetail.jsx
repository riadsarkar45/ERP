import React from 'react';

const BORDER_COLOR = "#000000";

const cellStyle = {
    // Use exactly 1px. Fractional pixels (like 0.8px) cause blurry/messy double borders in browsers.
    border: `1px solid ${BORDER_COLOR}`,
    padding: 0,
    verticalAlign: "top",
    fontSize: "13px",
    boxSizing: "border-box",
};

const normalizeToArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
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

    return (
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
    );
};

export default KnittingDetail;