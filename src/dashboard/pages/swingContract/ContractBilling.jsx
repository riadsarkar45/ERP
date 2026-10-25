import React, { useMemo } from 'react';

// ---------- Static data (replace with API data later) ----------
const DEDUCTION_RATE = 0.03; // 3% deduction
const TIFFIN_BILL = 4500;    // static tiffin bill in Taka

// rate = Taka per dozen
const billingRows = [
    { id: 1, sl: 1, process: "Shoulder Join", pcQty: 12480, rate: 6.5 },
    { id: 2, sl: 2, process: "Neck Rib Attach", pcQty: 12480, rate: 9.0 },
    { id: 3, sl: 3, process: "Sleeve Attach", pcQty: 12360, rate: 11.5 },
    { id: 4, sl: 4, process: "Side Seam", pcQty: 12360, rate: 10.0 },
    { id: 5, sl: 5, process: "Sleeve Hem", pcQty: 12240, rate: 5.5 },
    { id: 6, sl: 6, process: "Bottom Hem", pcQty: 12240, rate: 6.0 },
    { id: 7, sl: 7, process: "Label Attach", pcQty: 11880, rate: 3.5 },
    { id: 8, sl: 8, process: "Thread Trimming", pcQty: 11880, rate: 4.0 },
    { id: 9, sl: 9, process: "Iron & Fold", pcQty: 11760, rate: 7.5 },
    { id: 10, sl: 10, process: "Poly & Packing", pcQty: 11640, rate: 8.0 },
    { id: 11, sl: 11, process: "Button Attach", pcQty: 0, rate: 5.0 },
    { id: 12, sl: 12, process: "Embroidery", pcQty: 0, rate: 14.0 },
];

const ContractBilling = () => {
    // ---------- Calculations ----------
    const {
        totalBillingPcs,
        totalBillAmount,
        deductionAmount,
        netBillAmountTk,
    } = useMemo(() => {
        const totalPcs = billingRows.reduce((sum, r) => sum + (r.pcQty || 0), 0);

        const billTotal = billingRows.reduce((sum, r) => {
            if (!(r.pcQty > 0)) return sum;
            const dozen = r.pcQty / 12;
            return sum + Math.round(dozen * (r.rate || 0));
        }, 0);

        const deduction = Math.round(billTotal * DEDUCTION_RATE);
        const net = billTotal - deduction + TIFFIN_BILL;

        return {
            totalBillingPcs: totalPcs,
            totalBillAmount: billTotal,
            deductionAmount: deduction,
            netBillAmountTk: net,
        };
    }, []);

    return (
        <div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 md:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-emerald-600 text-white rounded-md text-xs font-bold">৳</span>
                            <h2 className="text-base font-bold text-slate-900">
                                Sewing Contract Billing Statement
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Process-wise piece quantity, dozen conversions, contract rates, and gross billing in Taka (Tk).
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700">
                            Total Pcs: <strong className="text-slate-900">{totalBillingPcs.toLocaleString()}</strong>
                        </span>
                        <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-md font-semibold text-emerald-700">
                            Net Payable: ৳ {netBillAmountTk.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-3 text-center w-12 border-r border-slate-200">SL No</th>
                                <th className="py-3 px-4 border-r border-slate-200">Process</th>
                                <th className="py-3 px-4 text-right border-r border-slate-200 font-bold">Pc Qty</th>
                                <th className="py-3 px-4 text-right border-r border-slate-200 text-slate-400">
                                    Pc Qty <span className="font-normal text-[10px]">(3% deduction)</span>
                                </th>
                                <th className="py-3 px-4 text-right border-r border-slate-200">Drzn Qnty</th>
                                <th className="py-3 px-4 text-right border-r border-slate-200">Rate (৳)</th>
                                <th className="py-3 px-4 text-right font-bold text-slate-900">Total Taka (৳)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {billingRows.map((item, idx) => {
                                const hasQty = item.pcQty > 0;
                                const deduction3 = hasQty ? (item.pcQty * 0.03) : 0;
                                const dozenQty = hasQty ? item.pcQty / 12 : 0;
                                const lineTotal = dozenQty * (item.rate || 0);

                                return (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-indigo-50/30 transition-colors ${idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}`}
                                    >
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 border-r border-slate-200">
                                            {item.sl}
                                        </td>
                                        <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                                            {item.process}
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 border-r border-slate-200">
                                            {hasQty ? item.pcQty.toLocaleString() : "—"}
                                        </td>
                                        <td className="py-2.5 px-4 text-right text-slate-400 border-r border-slate-200">
                                            {hasQty ? Math.round(deduction3).toLocaleString() : "—"}
                                        </td>
                                        <td className="py-2.5 px-4 text-right text-slate-700 font-mono text-[11px] border-r border-slate-200">
                                            {hasQty ? dozenQty.toFixed(2) : "0.00"}
                                        </td>
                                        <td className="py-2.5 px-4 text-right text-slate-700 font-mono text-[11px] border-r border-slate-200">
                                            {Number(item.rate).toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono text-[11px]">
                                            {hasQty ? Math.round(lineTotal).toLocaleString() : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {/* Billing Table Footer Calculations matching the exact sheet */}
                        <tfoot>
                            {/* Total Bill / Total Bill Amount */}
                            <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                                <td colSpan="2" className="py-2.5 px-4 text-center uppercase tracking-wide border-r border-slate-200">
                                    Total
                                </td>
                                <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">
                                    {totalBillingPcs.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-4 text-center font-bold text-slate-800 border-r border-slate-200">
                                    Total Bill
                                </td>
                                <td colSpan="2" className="py-2.5 px-4 text-right uppercase tracking-wide font-extrabold text-slate-900 border-r border-slate-200">
                                    TOTAL BILL AMOUNT
                                </td>
                                <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 font-mono text-sm">
                                    {totalBillAmount.toLocaleString()}
                                </td>
                            </tr>

                            {/* Less: 3% deduction */}
                            <tr className="border-t border-slate-200 bg-white text-slate-700">
                                <td colSpan="4" className="border-r border-slate-200"></td>
                                <td colSpan="2" className="py-2 px-4 text-right italic text-slate-600 border-r border-slate-200">
                                    Less: 3% deduction
                                </td>
                                <td className="py-2 px-4 text-right font-medium text-rose-600 font-mono">
                                    - {deductionAmount.toLocaleString()}
                                </td>
                            </tr>

                            {/* Add: Tiffin Bill */}
                            <tr className="border-t border-slate-200 bg-white text-slate-700">
                                <td colSpan="4" className="border-r border-slate-200"></td>
                                <td colSpan="2" className="py-2 px-4 text-right italic text-slate-600 border-r border-slate-200">
                                    Add: Tiffin Bill
                                </td>
                                <td className="py-2 px-4 text-right font-medium text-slate-600 font-mono">
                                    + {TIFFIN_BILL.toLocaleString()}
                                </td>
                            </tr>

                            {/* TOTAL BILL AMOUNT TK. */}
                            <tr className="border-t-2 border-slate-400 bg-emerald-50/70 text-slate-900 font-extrabold">
                                <td colSpan="4" className="border-r border-slate-200"></td>
                                <td colSpan="2" className="py-3 px-4 text-right text-xs uppercase tracking-wider text-emerald-950 border-r border-slate-200">
                                    TOTAL BILL AMOUNT TK.
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-700 font-mono text-base font-extrabold">
                                    ৳ {netBillAmountTk.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ContractBilling;