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

const AopGlance = ({ detailView }) => {
    const rows = useMemo(() => (detailView || []).map((job) => {
        const wo = Number(job.totalWorkOrderQty) || 0;
        const dt = job.deliveryTypeTotals || {};
        const sentForAop = dv(dt, "SentForAop");
        const receivedFromAop = dv(dt, "ReceivedFromAop");
        const aopFinishFabricRcvd = dv(dt, "AOPFinishFabricRcvd");
        const returnFromAop = dv(dt, "ReturnFromAop");
        return { jobNo: job.jobNo, wo, sentForAop, receivedFromAop, aopFinishFabricRcvd, returnFromAop };
    }), [detailView]);

    const t = useMemo(() => rows.reduce((a, r) => ({
        wo: a.wo + r.wo,
        sentForAop: a.sentForAop + r.sentForAop,
        receivedFromAop: a.receivedFromAop + r.receivedFromAop,
        aopFinishFabricRcvd: a.aopFinishFabricRcvd + r.aopFinishFabricRcvd,
        returnFromAop: a.returnFromAop + r.returnFromAop,
    }), { wo: 0, sentForAop: 0, receivedFromAop: 0, aopFinishFabricRcvd: 0, returnFromAop: 0 }), [rows]);

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
                    const recv = r.receivedFromAop + r.returnFromAop;
                    return (
                        <tr key={i}>
                            <td style={cellStyle}>{r.jobNo}</td>
                            <td style={cellStyle}>{fmt(r.wo)}</td>
                            <td style={cellStyle}>{fmt(r.sentForAop)}</td>
                            <td className="bg-yellow-500 bg-opacity-20" style={cellStyle}>{shortExcess(r.sentForAop - r.wo)}</td>
                            <td className="bg-[#0af07d] bg-opacity-20" style={cellStyle}>{pctCell(pct(r.sentForAop, r.wo))}</td>
                            <td style={cellStyle}>{fmt(r.receivedFromAop)}</td>
                            <td style={cellStyle}>{fmt(r.aopFinishFabricRcvd)}</td>
                            <td style={cellStyle}>{fmt(r.returnFromAop)}</td>
                            <td className="bg-[#0af07d] bg-opacity-20" style={cellStyle}>{pctCell(pct(r.receivedFromAop - r.aopFinishFabricRcvd, r.receivedFromAop))}</td>
                            <td className="bg-yellow-500 bg-opacity-20" style={cellStyle}>{shortExcess(recv - r.aopFinishFabricRcvd)}</td>
                            <td className="bg-[#0af07d] bg-opacity-20" style={cellStyle}>{pctCell(pct(recv, r.sentForAop))}</td>
                        </tr>
                    );
                })}
            </tbody>
            <tfoot>
                <tr>
                    <td className="bg-yellow-100" style={footerCellStyle}>TOTAL</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.wo)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.sentForAop)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{shortExcess(t.sentForAop - t.wo)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{pctCell(pct(t.sentForAop, t.wo))}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.receivedFromAop)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.aopFinishFabricRcvd)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{fmt(t.returnFromAop)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{pctCell(pct(t.receivedFromAop - t.aopFinishFabricRcvd, t.receivedFromAop))}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{shortExcess(t.receivedFromAop + t.returnFromAop - t.aopFinishFabricRcvd)}</td>
                    <td className="bg-yellow-100" style={footerCellStyle}>{pctCell(pct(t.receivedFromAop + t.returnFromAop, t.sentForAop))}</td>
                </tr>
            </tfoot>
        </>
    );
};

export default AopGlance;