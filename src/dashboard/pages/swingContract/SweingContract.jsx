import React, { useState } from "react";

const processLists = [
  "Body Hem",
  "Neck Joint",
  "Shoulder to Shoulder",
  "Sleeve Hem",
  "Sleeve Join",
  "Cuff Join",
  "Side Seam",
];

const initialSampleRows = [
  {
    id: 1,
    date: "2026-10-24",
    jobNo: "JOB-4821",
    styleNo: "ST-POLO-88",
    lineNo: "Line 04",
    processType: "Neck Joint",
    todayInput: 1200,
    todayOutput: 1140,
  },
  {
    id: 2,
    date: "2026-10-24",
    jobNo: "JOB-4821",
    styleNo: "ST-POLO-88",
    lineNo: "Line 04",
    processType: "Shoulder to Shoulder",
    todayInput: 1200,
    todayOutput: 1180,
  },
];

// Billing Statement initial dataset matching your rate sheet
const initialBillingItems = [
  { id: 1, sl: 1, process: "Body Hem", pcQty: 386607, rate: 8.00 },
  { id: 2, sl: 2, process: "Neck Joint", pcQty: 181851, rate: 8.00 },
  { id: 3, sl: 3, process: "Shoulder to Shoulder", pcQty: 88918, rate: 11.50 },
  { id: 4, sl: 4, process: "Sleeve Hem", pcQty: 307364, rate: 11.50 },
  { id: 5, sl: 5, process: "Sleeve Joint", pcQty: 374852, rate: 14.00 },
  { id: 6, sl: 6, process: "V-Joint", pcQty: 0, rate: 10.00 },
  { id: 7, sl: 7, process: "Cuff Joint", pcQty: 136413, rate: 16.00 },
  { id: 8, sl: 8, process: "Side Seam", pcQty: 338044, rate: 14.50 },
];

export default function SewingContract() {
  // Master Contract Info
  const [headerData, setHeaderData] = useState({
    date: new Date().toISOString().split("T")[0],
    jobNo: "JOB-4821",
    styleNo: "ST-POLO-88",
    lineNo: "Line 04",
  });

  // Active Entry Form
  const [formData, setFormData] = useState({
    processType: processLists[0],
    todayInput: "",
    todayOutput: "",
  });

  // Table Rows (Floor Operations)
  const [rows, setRows] = useState(initialSampleRows);

  // Billing Sheet State
  const [billingRows, setBillingRows] = useState(initialBillingItems);
  const [tiffinBill, setTiffinBill] = useState(0);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRow = (e) => {
    e.preventDefault();
    if (!formData.processType || !formData.todayInput || !formData.todayOutput) {
      alert("Please fill in process type, input, and output quantities.");
      return;
    }

    const newRow = {
      id: Date.now(),
      date: headerData.date,
      jobNo: headerData.jobNo || "—",
      styleNo: headerData.styleNo || "—",
      lineNo: headerData.lineNo || "—",
      processType: formData.processType,
      todayInput: Number(formData.todayInput) || 0,
      todayOutput: Number(formData.todayOutput) || 0,
    };

    setRows((prev) => [newRow, ...prev]);
    setFormData({
      processType: processLists[0],
      todayInput: "",
      todayOutput: "",
    });
  };

  const handleDeleteRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  // Floor KPI calculations
  const totalInput = rows.reduce((acc, row) => acc + Number(row.todayInput || 0), 0);
  const totalOutput = rows.reduce((acc, row) => acc + Number(row.todayOutput || 0), 0);
  const totalWip = Math.max(0, totalInput - totalOutput);
  const efficiencyRate = totalInput > 0 ? ((totalOutput / totalInput) * 100).toFixed(1) : 0;

  // Billing Calculations (Matching sheet logic: Drzn = Pcs / 12, Total = Drzn * Rate)
  const totalBillingPcs = billingRows.reduce((acc, item) => acc + (Number(item.pcQty) || 0), 0);

  const totalBillAmount = billingRows.reduce((acc, item) => {
    const dozen = item.pcQty ? item.pcQty / 12 : 0;
    const amount = dozen * (Number(item.rate) || 0);
    return acc + amount;
  }, 0);

  // Less 3% deduction (sheet displays 48,136 for this batch)
  const deduction3Percent = billingRows.reduce((acc, item) => {
    const deductedPcs = (Number(item.pcQty) || 0) * 0.03;
    const deductedDozen = deductedPcs / 12;
    return acc + (deductedDozen * (Number(item.rate) || 0));
  }, 0);

  const netBillAmountTk = Math.round(totalBillAmount - deduction3Percent + (Number(tiffinBill) || 0));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-2 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Sewing Contract & Daily Output
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Production line intake, operation tracking, and contract rate billing statements.
            </p>
          </div>

          {/* Quick Header Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-600 shadow-xs flex items-center gap-2">
              <span>Contract Job:</span>
              <input
                className="px-2 py-1 border border-slate-200 rounded text-slate-900 font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                type="text"
                placeholder="Search Job No"
                value={headerData.jobNo}
                onChange={(e) => setHeaderData({ ...headerData, jobNo: e.target.value })}
              />
            </span>
            <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700">
              Active Shift
            </span>
          </div>
        </header>

        {/* Real-time KPI Stats Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Input</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalInput.toLocaleString()}</p>
            <span className="text-xs text-slate-400">Pieces issued to line</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total Output</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalOutput.toLocaleString()}</p>
            <span className="text-xs text-slate-400">Passed QA checkpoints</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Balance</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{totalWip.toLocaleString()}</p>
            <span className="text-xs text-slate-400">In-progress on floor</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Pass Rate / Eff.</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{efficiencyRate}%</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, efficiencyRate)}%` }}
              />
            </div>
          </div>
        </section>

        {/* SECTION 1: Floor Operation Entry & Recorded Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Form Column (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">1. Production & Contract Info</h2>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={headerData.date}
                    onChange={handleHeaderChange}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Line / Unit</label>
                  <input
                    type="text"
                    name="lineNo"
                    value={headerData.lineNo}
                    onChange={handleHeaderChange}
                    placeholder="e.g. Line 04"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Job No</label>
                  <input
                    type="text"
                    name="jobNo"
                    value={headerData.jobNo}
                    onChange={handleHeaderChange}
                    placeholder="e.g. JOB-4821"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Style No</label>
                  <input
                    type="text"
                    name="styleNo"
                    value={headerData.styleNo}
                    onChange={handleHeaderChange}
                    placeholder="e.g. ST-POLO-88"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Step 2: Operation Entry */}
            <form onSubmit={handleAddRow} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">2. Operation Output Entry</h2>
                <p className="text-xs text-slate-500">Record current shift operational metrics.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Process Type</label>
                <div className="relative">
                  <select
                    name="processType"
                    value={formData.processType}
                    onChange={handleFormChange}
                    className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                  >
                    {processLists.map((process) => (
                      <option key={process} value={process}>
                        {process}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Today Input (Pcs)</label>
                  <input
                    type="number"
                    name="todayInput"
                    placeholder="0"
                    min="0"
                    value={formData.todayInput}
                    onChange={handleFormChange}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Today Output (Pcs)</label>
                  <input
                    type="number"
                    name="todayOutput"
                    placeholder="0"
                    min="0"
                    value={formData.todayOutput}
                    onChange={handleFormChange}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Operation Row
              </button>
            </form>
          </div>

          {/* Right Data Table Column (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recorded Operations</h2>
                <p className="text-xs text-slate-500">Live breakdown by sewing stage and piece count.</p>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {rows.length} {rows.length === 1 ? "Record" : "Records"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Date / Batch</th>
                    <th className="py-3 px-4">Process Operation</th>
                    <th className="py-3 px-4 text-right">Input</th>
                    <th className="py-3 px-4 text-right">Output</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm font-medium text-slate-600">No operations entered yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">Fill the form on the left and click "Add Operation Row".</p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const balance = row.todayInput - row.todayOutput;
                      const ratio = row.todayInput > 0 ? (row.todayOutput / row.todayInput) * 100 : 0;
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">{row.date}</span>
                            <span className="text-[11px] text-slate-400">{row.jobNo} • {row.styleNo}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              {row.processType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {Number(row.todayInput).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            {Number(row.todayOutput).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-amber-600">
                            {balance > 0 ? `+${balance.toLocaleString()}` : "0"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {ratio >= 95 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Target Met
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                In Progress
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              title="Delete Record"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer with Summaries */}
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
                      <td colSpan="2" className="py-3 px-4 text-slate-600">
                        Total Production Run
                      </td>
                      <td className="py-3 px-4 text-right">{totalInput.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-emerald-600">{totalOutput.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-amber-600">+{totalWip.toLocaleString()}</td>
                      <td colSpan="2" className="py-3 px-4 text-center text-indigo-600">
                        {efficiencyRate}% Avg
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
