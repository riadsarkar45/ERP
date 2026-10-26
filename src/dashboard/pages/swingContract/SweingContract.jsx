import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useAxiosPrivate from "../../../hooks/UseAxiosPrivate";
import { Loader } from "lucide-react";

const processLists = [
  "Body Hem",
  "Neck Joint",
  "Shoulder to Shoulder",
  "Sleeve Hem",
  "Sleeve Join",
  "Cuff Join",
  "Side Seam",
];

// Works whether the API sends composition as a string or as an object
const getCompositionLabel = (c) => {
  if (!c) return "—";
  if (typeof c === "string") return c;
  return c.name || c.title || c.label || c.composition || "—";
};

// Convert one record from /api/get-contractual-job-summary into a table row
const mapSummaryRow = (r) => ({
  id: r.id,
  date: r.date ? String(r.date).split("T")[0] : "",
  jobNo: r.jobs?.jobNo || "",
  styleNo: r.jobs?.styleNo || "",
  lineNo: r.lineNo || "",
  compositionId: r.styleReqRows?.id ?? r.styleReqRowsId ?? null,
  compositionLabel: r.styleReqRows?.composition
    ? getCompositionLabel(r.styleReqRows.composition)
    : "—",
  orderQty: Number(r.styleReqRows?.orderQty) || 0,
  processType: r.processType || "",
  todayInput: Number(r.input) || 0,
  todayOutput: Number(r.output) || 0,
});

export default function SewingContract() {
  // Master Contract Info
  const [headerData, setHeaderData] = useState({
    date: new Date().toISOString().split("T")[0],
    jobNo: "",
    styleNo: "",
    lineNo: "",
  });

  // Job search
  const [jobSearch, setJobSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [compositionId, setCompositionId] = useState(null); // real composition row id from the API
  const skipNextSearch = useRef(false);

  // Active Entry Form
  const [formData, setFormData] = useState({
    processType: processLists[0],
    todayInput: "",
    todayOutput: "",
  });

  // Saving / loading state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(false);

  // Table Rows (Floor Operations) — loaded from the server
  const [rows, setRows] = useState([]);

  const axiosPrivate = useAxiosPrivate();

  // Load recorded operations from the server
  const fetchSummary = useCallback(async () => {
    setIsLoadingRows(true);
    try {
      const { data } = await axiosPrivate.get("/api/get-contractual-job-summary");
      const list = Array.isArray(data) ? data : data ? [data] : [];
      setRows(list.map(mapSummaryRow));
    } catch (error) {
      console.error("Failed to load contractual job summary:", error);
    } finally {
      setIsLoadingRows(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Only compositions that actually have an order qty
  const compositions = useMemo(() => {
    if (!selectedJob?.rows) return [];
    return selectedJob.rows
      .map((r) => ({
        id: r.id,
        label: getCompositionLabel(r.composition),
        orderQty: Number(r.orderQty) || 0,
      }))
      .filter((c) => c.orderQty > 0);
  }, [selectedJob]);

  const activeComposition =
    compositions.find((c) => String(c.id) === String(compositionId)) || null;

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchJob = (e) => {
    setJobSearch(e.target.value);
  };

  // Debounced job search
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const term = jobSearch.trim();
    if (!term) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await axiosPrivate.get("/api/get-contractual-job", {
          params: { jobNo: term },
        });
        if (cancelled) return;
        setSearchResults(Array.isArray(data) ? data : data ? [data] : []);
      } catch (error) {
        if (cancelled) return;
        console.error("Job search failed:", error);
        setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobSearch, axiosPrivate]);

  // When a job is picked from the dropdown
  const handleSelectJob = (job, chosenCompositionId = null) => {
    const firstValid = (job.rows || []).find((r) => Number(r.orderQty) > 0);

    setSelectedJob(job);
    setCompositionId(
      chosenCompositionId !== null
        ? chosenCompositionId
        : firstValid
          ? firstValid.id
          : null
    );
    setHeaderData((prev) => ({
      ...prev,
      jobNo: job.jobNo || "",
      styleNo: job.styleNo || "",
    }));

    skipNextSearch.current = true;
    setJobSearch(job.jobNo || "");
    setSearchResults([]);
  };

  const handleClearJob = () => {
    setSelectedJob(null);
    setCompositionId(null);
    setHeaderData((prev) => ({ ...prev, jobNo: "", styleNo: "" }));
    setJobSearch("");
    setSearchResults([]);
  };

  const handleAddRow = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!headerData.jobNo) {
      alert("Please search and select a contract job first.");
      return;
    }
    if (!headerData.lineNo.trim()) {
      alert("Please enter the line / unit.");
      return;
    }
    if (!activeComposition) {
      alert("Please select a composition.");
      return;
    }
    if (
      !formData.processType ||
      formData.todayInput === "" ||
      formData.todayOutput === ""
    ) {
      alert("Please fill in process type, input, and output quantities.");
      return;
    }

    // ---- Payload sent to the server ----
    const payload = {
      jobNo: headerData.jobNo,
      compositionId: activeComposition.id,
      date: headerData.date,
      lineNo: headerData.lineNo.trim(),
      processType: formData.processType,
      input: Number(formData.todayInput) || 0,
      output: Number(formData.todayOutput) || 0,
    };

    setIsSaving(true);
    try {
      await axiosPrivate.post("/api/add-contractual-job", payload);

      // Reload real data from the server after a successful save
      await fetchSummary();

      setFormData({
        processType: processLists[0],
        todayInput: "",
        todayOutput: "",
      });
    } catch (error) {
      console.error("Save failed:", error);
      alert(
        error?.response?.data?.message ||
          "Could not save the entry. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Local delete only (add a DELETE API call here, then fetchSummary(), if needed)
  const handleDeleteRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  // All real rows from the API; narrowed to the selected job (+ composition when the row has one)
  const scopedRows = useMemo(() => {
    if (!headerData.jobNo) return rows;
    return rows.filter((r) => {
      if (r.jobNo !== headerData.jobNo) return false;
      if (activeComposition && r.compositionId !== null) {
        return String(r.compositionId) === String(activeComposition.id);
      }
      return true;
    });
  }, [rows, headerData.jobNo, activeComposition]);

  // Order qty: from the selected composition if there is one,
  // otherwise from the real rows (counted once per job/composition)
  const orderQty = useMemo(() => {
    if (activeComposition) return activeComposition.orderQty;
    const seen = new Map();
    scopedRows.forEach((r) => {
      const key = `${r.jobNo}|${r.compositionId ?? ""}|${r.orderQty}`;
      if (!seen.has(key)) seen.set(key, r.orderQty);
    });
    return Array.from(seen.values()).reduce((a, b) => a + b, 0);
  }, [activeComposition, scopedRows]);

  // Floor KPI calculations
  const totalInput = scopedRows.reduce((acc, r) => acc + Number(r.todayInput || 0), 0);
  const totalOutput = scopedRows.reduce((acc, r) => acc + Number(r.todayOutput || 0), 0);
  const totalWip = Math.max(0, totalInput - totalOutput);
  const efficiencyRate =
    totalInput > 0 ? ((totalOutput / totalInput) * 100).toFixed(1) : 0;
  const remainingToOrder = Math.max(0, orderQty - totalOutput);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="mx-auto space-y-8">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex flex-wrap items-start gap-2 text-xs font-medium">
            {/* Search box + dropdown */}
            <div className="relative">
              <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-600 shadow-xs flex items-center gap-2">
                <span>Contract Job:</span>
                <input
                  className="px-2 py-1 border border-slate-200 rounded text-slate-900 font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                  type="text"
                  placeholder="Search Job No"
                  value={jobSearch}
                  onChange={handleSearchJob}
                />
                {selectedJob && (
                  <button
                    type="button"
                    onClick={handleClearJob}
                    className="text-slate-400 hover:text-rose-600"
                    title="Clear selected job"
                  >
                    ✕
                  </button>
                )}
              </span>

              {searchResults.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full min-w-64 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {searchResults.flatMap((job, i) => {
                    const validRows = (job.rows || []).filter(
                      (r) => Number(r.orderQty) > 0
                    );

                    // Job without any valid composition: still selectable
                    if (validRows.length === 0) {
                      return [
                        <li key={`${job.jobNo}-${i}`}>
                          <button
                            type="button"
                            onClick={() => handleSelectJob(job)}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors"
                          >
                            <span className="block font-semibold text-slate-900">
                              {job.jobNo}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              Style: {job.styleNo || "—"}
                            </span>
                          </button>
                        </li>,
                      ];
                    }

                    // One entry per composition
                    return validRows.map((r) => (
                      <li key={`${job.jobNo}-${i}-${r.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectJob(job, r.id)}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors"
                        >
                          <span className="block font-semibold text-slate-900">
                            {job.jobNo}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            Style: {job.styleNo || "—"}
                          </span>
                          <span className="block text-[11px] text-indigo-600 font-medium">
                            {getCompositionLabel(r.composition)} • Order Qty{" "}
                            {Number(r.orderQty).toLocaleString()}
                          </span>
                        </button>
                      </li>
                    ));
                  })}
                </ul>
              )}
            </div>

            {isSearching && (
              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700">
                <span className="animate-spin inline-block">
                  <Loader size={16} />
                </span>
              </span>
            )}

            {selectedJob && (
              <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-md text-indigo-700">
                {selectedJob.jobNo} • {selectedJob.styleNo}
              </span>
            )}
          </div>
        </header>

        {/* Real-time KPI Stats Bar */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order Qty</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{orderQty.toLocaleString()}</p>
            <span className="text-xs text-slate-400">
              {activeComposition
                ? activeComposition.label
                : headerData.jobNo || "All jobs"}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Input</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalInput.toLocaleString()}</p>
            <span className="text-xs text-slate-400">Pieces issued to line</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total Output</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalOutput.toLocaleString()}</p>
            <span className="text-xs text-slate-400">
              {orderQty > 0
                ? `${remainingToOrder.toLocaleString()} left to order qty`
                : "Passed QA checkpoints"}
            </span>
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
                    readOnly
                    placeholder="Search a job above"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-700 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Style No</label>
                  <input
                    type="text"
                    name="styleNo"
                    value={headerData.styleNo}
                    readOnly
                    placeholder="Auto-filled"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-700 cursor-not-allowed focus:outline-none"
                  />
                </div>
              </div>

              {/* Composition selector — only when more than one has an order qty */}
              {compositions.length > 1 && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Composition
                  </label>
                  <select
                    value={compositionId ?? ""}
                    onChange={(e) => setCompositionId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                  >
                    {compositions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} — Order Qty {c.orderQty.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Single composition: just show it */}
              {compositions.length === 1 && (
                <p className="mt-3 text-xs text-slate-500">
                  {compositions[0].label} • Order Qty{" "}
                  <span className="font-semibold text-slate-800">
                    {compositions[0].orderQty.toLocaleString()}
                  </span>
                </p>
              )}
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
                disabled={isSaving}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin inline-block">
                      <Loader size={16} />
                    </span>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Operation Row
                  </>
                )}
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
                {scopedRows.length} {scopedRows.length === 1 ? "Record" : "Records"}
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
                  {isLoadingRows && rows.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <span className="animate-spin inline-block">
                          <Loader size={20} />
                        </span>
                      </td>
                    </tr>
                  ) : scopedRows.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm font-medium text-slate-600">No operations entered yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Fill the form on the left and click "Add Operation Row".
                        </p>
                      </td>
                    </tr>
                  ) : (
                    scopedRows.map((row) => {
                      const balance = row.todayInput - row.todayOutput;
                      const ratio =
                        row.todayInput > 0 ? (row.todayOutput / row.todayInput) * 100 : 0;
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">{row.date}</span>
                            <span className="text-[11px] text-slate-400">
                              {row.jobNo}
                              {row.styleNo && ` • ${row.styleNo}`} • {row.lineNo}
                              {row.compositionLabel !== "—" && ` • ${row.compositionLabel}`}
                            </span>
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
                {scopedRows.length > 0 && (
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