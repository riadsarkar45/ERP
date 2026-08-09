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

const KnittingGlance = ({ detailView, handleGetMisDetail }) => {
    const rows = useMemo(() => (detailView || []).map((job) => {
        const wo = Number(job.totalWorkOrderQty) || 0;
        const dt = job.deliveryTypeTotals || {};
        const yarnDelivery = dv(dt, "YarnDelivery");
        const greyReceived = dv(dt, "GreyReceived") || dv(dt, "GreyFabricReceived");
        const yarnReturn = dv(dt, "YarnReturn");
        return { jobNo: job.jobNo, wo, yarnDelivery, greyReceived, yarnReturn };
    }), [detailView]);

    const t = useMemo(() => rows.reduce((a, r) => ({
        wo: a.wo + r.wo,
        yarnDelivery: a.yarnDelivery + r.yarnDelivery,
        greyReceived: a.greyReceived + r.greyReceived,
        yarnReturn: a.yarnReturn + r.yarnReturn,
    }), { wo: 0, yarnDelivery: 0, greyReceived: 0, yarnReturn: 0 }), [rows]);

    if (!rows.length) {
        return (
            <tbody>
                <tr>
                    <td colSpan={9} style={{ ...cellStyle, padding: "40px", color: "#6b7280", backgroundColor: "#fafafa" }}>
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
                    const recv = r.greyReceived + r.yarnReturn;
                    return (
                        <tr key={i}>
                            <td style={cellStyle}>{r.jobNo}</td>
                            <td onClick={() => handleGetMisDetail("knittingWorkOrder", r.jobNo)} style={cellStyle}>{fmt(r.wo)}</td>
                            <td onClick={() => handleGetMisDetail("knittingYarnDelivery", r.jobNo)} style={cellStyle}>{fmt(r.yarnDelivery)}</td>
                            <td onClick={() => handleGetMisDetail("yarnDeliveryShortExcess", r.jobNo)}  className="bg-yellow-500 bg-opacity-20" style={cellStyle}>{shortExcess(r.yarnDelivery - r.wo)}</td>
                            <td className="bg-[#0af07d] bg-opacity-20" style={cellStyle}>{pctCell(pct(r.yarnDelivery, r.wo))}</td>
                            <td onClick={() => handleGetMisDetail("knittingGreyReceived", r.jobNo)} style={cellStyle}>{fmt(r.greyReceived)}</td>
                            <td onClick={() => handleGetMisDetail("knittingYarnReturn", r.jobNo)}  style={cellStyle}>{fmt(r.yarnReturn)}</td>
                            <td onClick={() => handleGetMisDetail("knittingPartyStock", r.jobNo)}
                                className="bg-yellow-500 bg-opacity-20" style={cellStyle}>{shortExcess(recv - r.yarnDelivery)}
                            </td>
                            <td className="bg-[#0af07d] bg-opacity-20" style={cellStyle}>{pctCell(pct(recv, r.yarnDelivery))}</td>
                        </tr>
                    );
                })}
            </tbody>
            <tfoot>
                <tr>
                    <td className="bg-yellow-100" style={footerCellStyle}>TOTAL</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.wo)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.yarnDelivery)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{shortExcess(t.yarnDelivery - t.wo)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{pctCell(pct(t.yarnDelivery, t.wo))}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.greyReceived)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.yarnReturn)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{shortExcess(t.greyReceived + t.yarnReturn - t.yarnDelivery)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{pctCell(pct(t.greyReceived + t.yarnReturn, t.yarnDelivery))}</td>
                </tr>
            </tfoot>
        </>
    );
};

export default KnittingGlance;