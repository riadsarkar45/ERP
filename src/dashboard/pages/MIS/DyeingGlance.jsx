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

const footerCellStyle = { ...cellStyle, position: "sticky", bottom: 0, zIndex: 5, fontWeight: 700 };

const fmt = (v) =>
    Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortExcess = (diff) => {
    const f = fmt(Math.abs(diff));
    return diff > 0
        ? <span className="text-green-600 font-extrabold">{f}</span>
        : <span className="text-red-600 font-extrabold">({f})</span>;
};

const pct = (num, den) => (den ? (num / den) * 100 : 0);
const pctCell = (v) => `${(Number(v) || 0).toFixed(2)}%`;

const dv = (dt, key) => {
    if (!dt) return 0;
    const target = key.toLowerCase();
    const found = Object.keys(dt).find((k) => k.toLowerCase() === target);
    return found ? Number(dt[found]) || 0 : 0;
};

const DyeingGlance = ({ detailView, handleGetMisDetail }) => {
    const rows = useMemo(() => (detailView || []).map((job) => {
        const wo = Number(job.totalWorkOrderQty) || 0;
        const dt = job.deliveryTypeTotals || {};
        const greyDelivery = dv(dt, "GreyDelivery");
        const greyReceived = dv(dt, "GreyReceived") || dv(dt, "GreyFabricReceived");
        const greyReturn = dv(dt, "GreyReturn");
        const finishReceived = dv(dt, "FinishReceived");
        return { jobNo: job.jobNo, wo, greyDelivery, greyReceived, greyReturn, finishReceived };
    }), [detailView]);

    const t = useMemo(() => rows.reduce((a, r) => ({
        wo: a.wo + r.wo,
        greyDelivery: a.greyDelivery + r.greyDelivery,
        greyReceived: a.greyReceived + r.greyReceived,
        greyReturn: a.greyReturn + r.greyReturn,
        finishReceived: a.finishReceived + r.finishReceived,
    }), { wo: 0, greyDelivery: 0, greyReceived: 0, greyReturn: 0, finishReceived: 0 }), [rows]);

    if (!rows.length) {
        return (
            <tbody>
                <tr>
                    <td colSpan={11} style={{ ...cellStyle, padding: "40px", color: "#6b7280", backgroundColor: "#fafafa" }}>
                        No data available.
                    </td>
                </tr>
            </tbody>
        );
    }

    return (
        <>
            <tbody>
                {rows.map((r, i) => {
                    const recv = r.greyReceived + r.greyReturn;
                    return (
                        <tr key={i}>
                            <td style={cellStyle}>{r.jobNo}</td>
                            <td onClick={() => handleGetMisDetail("dyeingWorkOrder", r.jobNo)}  style={cellStyle}>{fmt(r.wo)}</td>
                            <td onClick={() => handleGetMisDetail("dyeingGreyDelivery", r.jobNo)}  style={cellStyle}>{fmt(r.greyDelivery)}</td>
                            <td className="bg-yellow-500 bg-opacity-20" style={cellStyle}>{shortExcess(r.greyDelivery - r.wo)}</td>
                            <td className="bg-[#0af07d] bg-opacity-20" style={cellStyle}>{pctCell(pct(r.greyDelivery, r.wo))}</td>
                            <td onClick={() => handleGetMisDetail("dyeingGreyReturn", r.jobNo)}  style={cellStyle}>{fmt(r.greyReturn)}</td>
                            <td onClick={() => handleGetMisDetail("dyeingGreyReceived", r.jobNo)}  style={cellStyle}>{fmt(r.greyReceived)}</td>
                            <td style={cellStyle}>{fmt(r.finishReceived)}</td>
                            <td className="bg-[#0af07d] bg-opacity-20" style={cellStyle}>{pctCell(pct(r.greyReceived - r.finishReceived, r.greyReceived))}</td>
                            <td className="bg-yellow-500 bg-opacity-20" style={cellStyle}>{shortExcess(recv - r.greyDelivery)}</td>
                            <td className="bg-[#0af07d] bg-opacity-20" style={cellStyle}>{pctCell(pct(recv, r.greyDelivery))}</td>
                        </tr>
                    );
                })}
            </tbody>
            <tfoot>
                <tr>
                    <td className="bg-yellow-100" style={footerCellStyle}>TOTAL</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.wo)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.greyDelivery)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{shortExcess(t.greyDelivery - t.wo)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{pctCell(pct(t.greyDelivery, t.wo))}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.greyReturn)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.greyReceived)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.finishReceived)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{pctCell(pct(t.greyReceived - t.finishReceived, t.greyReceived))}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{shortExcess(t.greyReceived + t.greyReturn - t.greyDelivery)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{pctCell(pct(t.greyReceived + t.greyReturn, t.greyDelivery))}</td>
                </tr>
            </tfoot>
        </>
    );
};

export default DyeingGlance;