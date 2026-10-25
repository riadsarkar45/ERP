import React, { useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/*  Stage dates, current stage, status, progress and due date are all  */
/*  entered by the planner. Nothing is calculated or assumed.          */
/* ------------------------------------------------------------------ */
const STAGES = [
  { key: "cutting", label: "Cutting", color: "#4f46c8", text: "#ffffff" },
  { key: "stitching", label: "Stitching", color: "#f97316", text: "#ffffff" },
  { key: "finishing", label: "Finishing", color: "#16a34a", text: "#ffffff" },
  { key: "packing", label: "Packing", color: "#facc15", text: "#422006" },
];
const STATUSES = ["Planned", "In Progress", "Complete"];
const WEEKEND = [5, 6]; // 0=Sun ... 6=Sat. Fri/Sat for Bangladesh. Use [0, 6] for Sat/Sun.
const FIXED_HOLIDAYS = {
  "02-21": "Language Martyrs' Day",
  "03-26": "Independence Day",
  "04-14": "Pohela Boishakh",
  "05-01": "May Day",
  "12-16": "Victory Day",
  "12-25": "Christmas Day",
};
const JOB_COLORS = ["#4f46c8", "#f97316", "#16a34a", "#0ea5e9", "#db2777", "#ca8a04"];
const LANE = 22, BAR = 18, RH = LANE * 4 + 10, LW = 250; // LW must match w-[250px] below
const MAX_RANGE_DAYS = 60;

/* ------------------------------------------------------------------ */
/*  Shared Tailwind class strings                                      */
/* ------------------------------------------------------------------ */
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46c8]";
const btnPrimary = `rounded-lg bg-[#4f46c8] px-3.5 py-2.5 text-sm font-medium text-white hover:bg-[#4338b0] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
const btnGhost = `rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm hover:bg-gray-50 ${FOCUS}`;
const iconBtn = `h-7 w-7 rounded-md border border-gray-200 bg-white text-base leading-none hover:bg-gray-50 ${FOCUS}`;
const card = "min-w-0 rounded-xl border border-gray-200 bg-white p-3.5";
const cardHead = "mb-2.5 flex flex-wrap items-center justify-between gap-2";
const cardTitle = "text-[17px] font-semibold";
const tag = "rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500";
const inputCls = `w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 ${FOCUS}`;
const dateCls = `rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[13px] text-gray-900 ${FOCUS}`;
const labelCls = "mb-2.5 flex flex-1 flex-col gap-1 text-xs text-gray-500";
const errCls = "my-1 text-[13px] text-red-700";
const hintCls = "mt-2 text-xs text-gray-500";
const PILL = {
  Complete: "bg-green-100 text-green-800",
  "In Progress": "bg-amber-100 text-amber-800",
  Planned: "bg-blue-100 text-blue-800",
};

/* ------------------------------------------------------------------ */
/*  Date helpers (all dates are local "YYYY-MM-DD" strings)            */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s, n) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const diffDays = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 864e5);
const eachDay = (a, b) => Array.from({ length: diffDays(a, b) + 1 }, (_, i) => addDays(a, i));
const fmt = (s, o = { month: "short", day: "numeric" }) => fromISO(s).toLocaleDateString("en-US", o);
const fmtFull = (s) => fmt(s, { month: "short", day: "numeric", year: "numeric" });
const fmtRange = (a, b) =>
  fromISO(a).getFullYear() === fromISO(b).getFullYear()
    ? `${fmt(a)} - ${fmt(b)}, ${fromISO(b).getFullYear()}`
    : `${fmtFull(a)} - ${fmtFull(b)}`;
const isWeekend = (s) => WEEKEND.includes(fromISO(s).getDay());
const weekStartOf = (s) => addDays(s, -((fromISO(s).getDay() + 6) % 7)); // Monday

/* Overall span of a job = earliest planned start to latest planned end. */
const spanOf = (j) => {
  const all = STAGES.map((s) => j.dates?.[s.key]).filter((x) => x && x.start && x.end);
  if (!all.length) return null;
  return {
    start: all.reduce((m, x) => (x.start < m ? x.start : m), all[0].start),
    end: all.reduce((m, x) => (x.end > m ? x.end : m), all[0].end),
  };
};
const emptyDates = () => Object.fromEntries(STAGES.map((s) => [s.key, { start: "", end: "" }]));
const blankForm = () => ({
  id: null, style: "", name: "", customer: "", qty: 100, due: "",
  stage: STAGES[0].label, status: "Planned", progress: 0, dates: emptyDates(),
});

/* ------------------------------------------------------------------ */
/*  Demo data. Replace with real jobs via the initialJobs prop.        */
/* ------------------------------------------------------------------ */
const seedJobs = (base) => {
  const mk = (id, style, name, customer, qty, off, stage, status, progress) => ({
    id, style, name, customer, qty, stage, status, progress,
    dates: {
      cutting: { start: addDays(base, off), end: addDays(base, off + 1) },
      stitching: { start: addDays(base, off + 2), end: addDays(base, off + 6) },
      finishing: { start: addDays(base, off + 7), end: addDays(base, off + 8) },
      packing: { start: addDays(base, off + 9), end: addDays(base, off + 9) },
    },
    due: addDays(base, off + 9),
  });
  return [
    mk("PO001", "Men's Shirts", "Men's Cotton Shirt", "Northline Apparel", 500, 0, "Stitching", "In Progress", 65),
    mk("PO002", "Women's Dresses", "Women's Summer Dress", "Bloom & Co.", 500, 3, "Cutting", "In Progress", 55),
    mk("PO003", "Jackets", "Utility Jacket", "Harbor Outfitters", 200, 6, "Cutting", "Planned", 0),
  ];
};
const seedResources = [
  { id: 1, name: "Line 1 - Cutting Table A", detail: "4 operators, 4 machines", util: 88 },
  { id: 2, name: "Line 2 - Sewing Line B", detail: "18 operators, 18 machines", util: 91 },
];

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                        */
/* ------------------------------------------------------------------ */
const Bar = ({ v, green }) => (
  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
    <i className={`block h-full rounded-full ${green ? "bg-green-600" : "bg-[#4f46c8]"}`} style={{ width: `${v}%` }} />
  </div>
);
const Pill = ({ s }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL[s]}`}>{s}</span>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ProductionPlanning({
  initialJobs,
  initialResources = seedResources,
  kpis = { output: 4150, efficiency: 89.5, onTime: 94 },
  onJobsChange,
}) {
  const today = toISO(new Date());
  const base = useMemo(() => weekStartOf(today), [today]);

  const [jobs, setJobs] = useState(() => initialJobs || seedJobs(base));
  const [range, setRange] = useState({ start: base, end: addDays(base, 13) });
  const [pending, setPending] = useState(false); // calendar: waiting for 2nd click
  const [view, setView] = useState("weekly");
  const [cursor, setCursor] = useState(() => fromISO(base)); // calendar month
  const [showHolidays, setShowHolidays] = useState(true);
  const [customHolidays, setCustomHolidays] = useState({});
  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState(range);
  const [rowMenu, setRowMenu] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [dragId, setDragId] = useState(null);
  const [selectedId, setSelectedId] = useState(null); // clicked production order
  const pickerRef = useRef(null);

  useEffect(() => { onJobsChange && onJobsChange(jobs); }, [jobs]); // eslint-disable-line

  useEffect(() => {
    const onDown = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
      if (!e.target.closest?.("[data-menu-wrap]")) setRowMenu(null);
    };
    const onKey = (e) => { if (e.key === "Escape") { setPickerOpen(false); setModal(false); setRowMenu(null); setSelectedId(null); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  const holidayOf = (d) => customHolidays[d] || FIXED_HOLIDAYS[d.slice(5)];
  const updateJob = (id, patch) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  /* ---- range handling ---- */
  const applyRange = (start, end, follow = true) => {
    if (!start || !end || end < start) return false;
    if (diffDays(start, end) + 1 > MAX_RANGE_DAYS) end = addDays(start, MAX_RANGE_DAYS - 1);
    setRange({ start, end });
    if (follow) setCursor(fromISO(start));
    return true;
  };
  const draftError = !draft.start || !draft.end ? "Pick both dates."
    : draft.end < draft.start ? "End date must be on or after the start date."
    : diffDays(draft.start, draft.end) + 1 > MAX_RANGE_DAYS ? `Range can be at most ${MAX_RANGE_DAYS} days.` : "";
  const presets = [
    ["This week", base, addDays(base, 6)],
    ["Next 14 days", today, addDays(today, 13)],
    ["This month", toISO(new Date(fromISO(today).getFullYear(), fromISO(today).getMonth(), 1)),
      toISO(new Date(fromISO(today).getFullYear(), fromISO(today).getMonth() + 1, 0))],
  ];
  const shiftRange = (dir) => {
    const len = diffDays(range.start, range.end) + 1;
    applyRange(addDays(range.start, dir * len), addDays(range.end, dir * len));
  };
  const onCalendarDay = (d) => {
    if (!pending) { setRange({ start: d, end: d }); setPending(true); }
    else {
      const a = range.start;
      const [s, e] = d < a ? [d, a] : [a, d];
      applyRange(s, e, false);
      setPending(false);
    }
  };
  const toggleHoliday = (d) =>
    setCustomHolidays((h) => {
      const n = { ...h };
      if (n[d]) delete n[d]; else if (!FIXED_HOLIDAYS[d.slice(5)]) n[d] = "Holiday";
      return n;
    });

  /* ---- derived ---- */
  const days = useMemo(() => eachDay(range.start, range.end), [range]);
  const cw = view === "weekly" ? 64 : 112;
  const n = days.length;

  // One bar per stage that the planner has scheduled. Unscheduled stages have no bar.
  const rects = useMemo(() => jobs.map((j, ji) =>
    STAGES.map((st, k) => {
      const d = j.dates?.[st.key];
      if (!d || !d.start || !d.end) return null;
      const x1 = diffDays(range.start, d.start), x2 = diffDays(range.start, d.end);
      if (x2 < 0 || x1 > n - 1) return null;
      const c1 = Math.max(0, x1), c2 = Math.min(n - 1, x2);
      return { s: { ...st, ...d }, left: c1 * cw + 2, width: (c2 - c1 + 1) * cw - 4, top: ji * RH + 6 + k * LANE + (LANE - BAR) / 2 };
    })), [jobs, range, cw, n]);

  const rows = useMemo(() => {
    const r = [...jobs];
    const { key, dir } = sort;
    r.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (dir === "asc" ? 1 : -1));
    return r;
  }, [jobs, sort]);

  const calCells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startCell = addDays(toISO(first), -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(startCell, i));
  }, [cursor]);

  /* ---- actions ---- */
  const sortBy = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) return;
    setJobs((js) => {
      const from = js.findIndex((j) => j.id === dragId), to = js.findIndex((j) => j.id === targetId);
      const copy = [...js];
      copy.splice(to, 0, copy.splice(from, 1)[0]);
      return copy;
    });
    setDragId(null);
  };

  const openNew = () => { setForm(blankForm()); setModal(true); setRowMenu(null); };
  const openEdit = (j) => {
    setForm({ ...blankForm(), ...j, dates: { ...emptyDates(), ...j.dates } });
    setModal(true);
    setRowMenu(null);
  };
  const setStageDate = (key, field, value) =>
    setForm((f) => ({ ...f, dates: { ...f.dates, [key]: { ...f.dates[key], [field]: value } } }));

  const formErrors = useMemo(() => {
    const e = [];
    if (!form.style.trim()) e.push("Enter a style name.");
    if (!form.customer.trim()) e.push("Enter a customer.");
    if (!(Number(form.qty) > 0)) e.push("Quantity must be more than 0.");
    if (!form.due) e.push("Pick a due date.");
    if (!(Number(form.progress) >= 0 && Number(form.progress) <= 100)) e.push("Progress must be between 0 and 100.");
    STAGES.forEach((s) => {
      const { start, end } = form.dates[s.key];
      if (!!start !== !!end) e.push(`${s.label} needs both a start and an end date, or leave both empty.`);
      else if (start && end < start) e.push(`${s.label} end date must be on or after its start date.`);
    });
    return e;
  }, [form]);

  const lateStages = STAGES.filter((s) => form.due && form.dates[s.key].end && form.dates[s.key].end > form.due);

  const saveJob = (e) => {
    e.preventDefault();
    if (formErrors.length) return;
    const clean = {
      style: form.style.trim(), name: form.name.trim() || form.style.trim(), customer: form.customer.trim(),
      qty: Number(form.qty), due: form.due, stage: form.stage, status: form.status,
      progress: Number(form.progress), dates: form.dates,
    };
    if (form.id) updateJob(form.id, clean);
    else {
      const num = jobs.reduce((m, j) => Math.max(m, parseInt(j.id.replace(/\D/g, ""), 10) || 0), 0) + 1;
      setJobs((js) => [...js, { id: `PO${String(num).padStart(3, "0")}`, ...clean }]);
    }
    setModal(false);
  };

  const selected = jobs.find((j) => j.id === selectedId);
  const sortMark = (k) => (sort.key === k ? (sort.dir === "asc" ? " \u25B2" : " \u25BC") : "");
  const cols = [["id", "Job ID"], ["style", "Style"], ["customer", "Customer"], ["qty", "Qty"],
    ["stage", "Stage"], ["status", "Status"], ["progress", "Progress"], ["due", "Due Date"]];
  const monthTitle = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-full bg-[#f4f5f8] p-5 font-sans text-gray-900">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Production Planning &amp; Scheduling</h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative" ref={pickerRef}>
            <button
              className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${FOCUS}`}
              onClick={() => { setDraft(range); setPickerOpen((o) => !o); }}
              aria-expanded={pickerOpen}
            >
              <span aria-hidden>&#128197;</span> {fmtRange(range.start, range.end)}
            </button>
            {pickerOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-80 max-w-[90vw] rounded-xl border border-gray-200 bg-white p-3.5 shadow-xl" role="dialog" aria-label="Choose date range">
                <div className="flex gap-2.5">
                  <label className={labelCls}>Start
                    <input type="date" className={inputCls} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
                  </label>
                  <label className={labelCls}>End
                    <input type="date" className={inputCls} min={draft.start} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
                  </label>
                </div>
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {presets.map(([l, a, b]) => (
                    <button key={l} className={`rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs hover:bg-gray-100 ${FOCUS}`} onClick={() => setDraft({ start: a, end: b })}>{l}</button>
                  ))}
                </div>
                {draftError && <p className={errCls}>{draftError}</p>}
                <div className="mt-1.5 flex justify-end gap-2">
                  <button className={btnGhost} onClick={() => setPickerOpen(false)}>Cancel</button>
                  <button className={btnPrimary} disabled={!!draftError}
                    onClick={() => { if (applyRange(draft.start, draft.end)) setPickerOpen(false); }}>Apply range</button>
                </div>
              </div>
            )}
          </div>
          <button className={btnPrimary} onClick={openNew}>Schedule New Job</button>
          <span className="text-sm text-gray-500">View</span>
          <div className="flex rounded-lg bg-gray-200 p-[3px]">
            {["weekly", "daily"].map((v) => (
              <button key={v}
                className={`rounded-md px-3.5 py-1.5 text-sm ${FOCUS} ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ============ LEFT COLUMN ============ */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Gantt */}
          <section className={card}>
            <div className={cardHead}>
              <h2 className={cardTitle}>Gantt Chart ({fmt(range.start)} - {fmt(range.end)})</h2>
              <div className="flex items-center gap-3 text-[13px]">
                <button className={iconBtn} onClick={() => shiftRange(-1)} aria-label="Previous period">&lsaquo;</button>
                <button className={iconBtn} onClick={() => shiftRange(1)} aria-label="Next period">&rsaquo;</button>
                {STAGES.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <i className="inline-block h-[11px] w-[11px] rounded-[3px]" style={{ background: s.color }} />{s.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto rounded-lg border border-gray-200">
              <div style={{ width: LW + n * cw }}>
                {/* header */}
                <div className="sticky top-0 z-[4] flex border-b border-gray-200 bg-white">
                  <div className="sticky left-0 z-[3] flex h-11 w-[250px] shrink-0 items-center justify-between border-r border-gray-200 bg-white px-3 text-[13px]">
                    <b>Production Order</b><span className="text-xs text-gray-500">Progress</span>
                  </div>
                  <div className="flex" style={{ width: n * cw }}>
                    {days.map((d) => (
                      <div key={d} style={{ width: cw }}
                        className={`flex h-11 shrink-0 flex-col justify-center border-r border-gray-200 text-center text-xs ${isWeekend(d) ? "bg-blue-50" : ""} ${d === today ? "font-semibold shadow-[inset_0_-3px_#4f46c8]" : ""}`}>
                        {view === "daily" && <small className="text-[11px] text-gray-500">{fmt(d, { weekday: "short" })}</small>}
                        {fmt(d)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* body */}
                <div className="flex">
                  <div className="sticky left-0 z-[3] w-[250px] shrink-0 border-r border-gray-200 bg-white">
                    {jobs.map((j) => (
                      <button key={j.id} onClick={() => setSelectedId(selectedId === j.id ? null : j.id)} title="Show order details" aria-pressed={selectedId === j.id} style={{ height: RH }}
                        className={`flex w-full flex-col justify-center gap-2 border-b border-gray-200 p-3 text-left hover:bg-gray-50 ${selectedId === j.id ? "bg-indigo-50 shadow-[inset_3px_0_#4f46c8]" : ""} ${FOCUS}`}>
                        <div className="flex justify-between gap-1.5 text-sm">
                          <b className="font-medium">{j.id} - {j.style}</b>
                          <span className="text-xs text-gray-500">{j.progress}%</span>
                        </div>
                        <div className="flex"><Bar v={j.progress} /></div>
                      </button>
                    ))}
                    {jobs.length === 0 && <div className="p-4 text-center text-[13px] text-gray-500">No jobs yet. Use Schedule New Job.</div>}
                  </div>

                  <div className="relative shrink-0" style={{ width: n * cw, height: Math.max(jobs.length, 1) * RH }}>
                    {days.map((d, i) => {
                      const hol = showHolidays && holidayOf(d);
                      const bg = d === today ? "border-l-2 border-l-[#4f46c8] bg-indigo-50" : hol ? "bg-red-100" : isWeekend(d) ? "bg-blue-50" : "";
                      return <div key={d} title={hol || undefined} style={{ left: i * cw, width: cw }} className={`absolute inset-y-0 border-r border-gray-100 ${bg}`} />;
                    })}
                    {jobs.map((j, ji) => j.id === selectedId && <div key={`sel-${j.id}`} className="absolute inset-x-0 bg-indigo-500/10" style={{ top: ji * RH, height: RH }} />)}
                    {jobs.map((_, ji) => <div key={ji} className="absolute inset-x-0 h-px bg-gray-200" style={{ top: (ji + 1) * RH - 1 }} />)}

                    <svg width={n * cw} height={jobs.length * RH} className="pointer-events-none absolute left-0 top-0" aria-hidden>
                      <defs>
                        <marker id="pp-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
                          <path d="M0 0L6 3L0 6z" fill="#94a3b8" />
                        </marker>
                      </defs>
                      {rects.map((r, ji) => r.slice(0, 3).map((a, k) => {
                        const b = r[k + 1];
                        if (!a || !b) return null;
                        const x1 = a.left + a.width, y1 = a.top + BAR / 2, x2 = b.left, y2 = b.top + BAR / 2;
                        if (x2 < x1) return null; // stages overlap, no connector
                        return <path key={`${ji}-${k}`} d={`M${x1} ${y1} H${x1 + 2} V${y2} H${x2}`} fill="none" stroke="#94a3b8" strokeWidth="1.4" markerEnd="url(#pp-arrow)" />;
                      }))}
                    </svg>

                    {rects.map((r, ji) => r.map((b) => b && (
                      <div key={`${ji}-${b.s.key}`}
                        className="absolute truncate rounded-[5px] px-2 text-xs font-medium leading-[18px]"
                        style={{ left: b.left, width: b.width, top: b.top, height: BAR, background: b.s.color, color: b.s.text }}
                        title={`${jobs[ji].id} ${b.s.label}: ${fmt(b.s.start)} - ${fmt(b.s.end)}`}>{b.s.label}</div>
                    )))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Active orders */}
          <section className={card}>
            <div className={cardHead}>
              <h2 className={cardTitle}>Active Production Orders</h2>
              <span className={tag}>Drag to reorder</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {jobs.filter((j) => j.status !== "Complete").map((j) => (
                <div key={j.id} draggable
                  onDragStart={() => setDragId(j.id)} onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(j.id)}
                  onClick={(e) => { if (!e.target.closest("input,button,select")) setSelectedId(j.id); }}
                  className={`grid cursor-grab grid-cols-[18px_1fr_1fr] items-center gap-3 rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 md:grid-cols-[18px_70px_minmax(110px,1.4fr)_44px_100px_135px_minmax(130px,1.3fr)] ${dragId === j.id ? "opacity-45" : ""} ${selectedId === j.id ? "border-[#4f46c8] ring-1 ring-[#4f46c8]" : ""}`}>
                  <span className="tracking-[-3px] text-gray-400" aria-hidden>&#8942;&#8942;</span>
                  <div><small className="mb-0.5 block text-xs text-gray-500">PO ID</small><b className="text-sm font-medium">{j.id}</b></div>
                  <div><small className="mb-0.5 block text-xs text-gray-500">Job Name</small><b className="text-sm font-medium">{j.name}</b></div>
                  <div><small className="mb-0.5 block text-xs text-gray-500">Qty</small><b className="text-sm font-medium">{j.qty}</b></div>
                  <div><small className="mb-0.5 block text-xs text-gray-500">Status</small><Pill s={j.status} /></div>
                  <div>
                    <small className="mb-0.5 block text-xs text-gray-500">Due Date</small>
                    <input type="date" className={dateCls} value={j.due} aria-label={`Due date for ${j.id}`}
                      onChange={(e) => e.target.value && updateJob(j.id, { due: e.target.value })} />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <div className="flex items-center justify-between">
                      <small className="mb-0.5 block text-xs text-gray-500">Real-time Progress</small>
                      <button className={`text-xs font-medium text-[#4f46c8] hover:underline ${FOCUS}`} onClick={() => openEdit(j)}>Edit schedule</button>
                    </div>
                    <div className="text-[13px]">{j.progress}% Complete</div>
                    <input type="range" min="0" max="100" step="5" value={j.progress} aria-label={`Progress for ${j.id}`}
                      className="mt-1 w-full accent-[#4f46c8]"
                      onChange={(e) => updateJob(j.id, { progress: Number(e.target.value) })} />
                  </div>
                </div>
              ))}
              {jobs.every((j) => j.status === "Complete") && <div className="p-4 text-center text-[13px] text-gray-500">No active orders.</div>}
            </div>
          </section>

          {/* Order tracking */}
          <section className={card}>
            <div className={cardHead}>
              <h2 className={cardTitle}>Order Tracking Table</h2>
              <span className={tag}>{rows.length} orders</span>
            </div>
            <div className="max-h-[520px] overflow-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr>
                    {cols.map(([k, l]) => (
                      <th key={k} aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                        className="sticky top-0 border-b border-gray-200 bg-gray-50 p-0 text-left">
                        <button onClick={() => sortBy(k)} className={`w-full px-3 py-2.5 text-left text-[13px] font-semibold ${FOCUS}`}>{l}{sortMark(k)}</button>
                      </th>
                    ))}
                    <th className="sticky top-0 border-b border-gray-200 bg-gray-50" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((j) => (
                    <tr key={j.id} className={`cursor-pointer hover:bg-indigo-50/60 ${selectedId === j.id ? "bg-indigo-50" : ""}`}
                      onClick={(e) => { if (!e.target.closest("select,input,button,[data-menu-wrap]")) setSelectedId(j.id); }}>
                      <td className="border-b border-gray-100 px-3 py-2.5"><b>{j.id}</b></td>
                      <td className="border-b border-gray-100 px-3 py-2.5">{j.style}</td>
                      <td className="border-b border-gray-100 px-3 py-2.5">{j.customer}</td>
                      <td className="border-b border-gray-100 px-3 py-2.5">{j.qty}</td>
                      <td className="border-b border-gray-100 px-3 py-2.5">
                        <select className={dateCls} value={j.stage} aria-label={`Current stage for ${j.id}`}
                          onChange={(e) => updateJob(j.id, { stage: e.target.value })}>
                          {STAGES.map((s) => <option key={s.key}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2.5">
                        <select className={dateCls} value={j.status} aria-label={`Status for ${j.id}`}
                          onChange={(e) => updateJob(j.id, { status: e.target.value })}>
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2.5">
                        <div className="flex min-w-[110px] items-center gap-2">
                          <Bar v={j.progress} /><span className="w-9 text-xs text-gray-500">{j.progress}%</span>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2.5">
                        <input type="date" className={dateCls} value={j.due} aria-label={`Due date for ${j.id}`}
                          onChange={(e) => e.target.value && updateJob(j.id, { due: e.target.value })} />
                      </td>
                      <td data-menu-wrap className="relative w-11 border-b border-gray-100 px-3 py-2.5">
                        <button className={iconBtn} aria-label={`Actions for ${j.id}`} onClick={() => setRowMenu(rowMenu === j.id ? null : j.id)}>&#8942;</button>
                        {rowMenu === j.id && (
                          <div className="absolute right-2 top-[80%] z-10 flex min-w-[150px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                            <button className="px-3 py-2 text-left text-[13px] hover:bg-gray-100" onClick={() => openEdit(j)}>Edit schedule</button>
                            <button className="px-3 py-2 text-left text-[13px] hover:bg-gray-100" onClick={() => { updateJob(j.id, { status: "Complete", progress: 100 }); setRowMenu(null); }}>Mark complete</button>
                            <button className="px-3 py-2 text-left text-[13px] text-red-700 hover:bg-gray-100" onClick={() => { setJobs((js) => js.filter((x) => x.id !== j.id)); setSelectedId((sid) => (sid === j.id ? null : sid)); setRowMenu(null); }}>Delete order</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-[13px] text-gray-500">No orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ============ RIGHT COLUMN ============ */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Resource allocation */}
          <section className={card}>
            <div className={cardHead}><h2 className={cardTitle}>Resource Allocation</h2></div>
            <div className="mb-2.5 flex justify-between border-y border-gray-200 py-2 text-[13px]">
              <b>Machine &amp; Workforce</b><span className="text-gray-500">Task progress</span>
            </div>
            {initialResources.map((r) => (
              <div key={r.id} className="mb-2 border-l-4 border-green-600 pb-2.5 pl-3 pt-1">
                <div className="flex items-center justify-between text-sm"><b className="font-medium">{r.name}</b><Pill s="Complete" /></div>
                <div className="my-1.5 flex justify-between text-xs"><span>{r.detail}</span><span>{r.util}% utilized</span></div>
                <div className="flex"><Bar v={r.util} /></div>
              </div>
            ))}
          </section>

          {/* Calendar */}
          <section className={card}>
            <div className={cardHead}>
              <h2 className={cardTitle}>Production Calendar</h2>
              <button aria-pressed={showHolidays} onClick={() => setShowHolidays((s) => !s)}
                className={`rounded-lg border px-2.5 py-1 text-[13px] ${FOCUS} ${showHolidays ? "border-indigo-200 bg-indigo-50 text-[#4f46c8]" : "border-gray-200 bg-white"}`}>Holidays</button>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <b>{monthTitle}</b>
              <div className="flex gap-1">
                <button className={iconBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">&lsaquo;</button>
                <button className={iconBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">&rsaquo;</button>
              </div>
            </div>
            <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-gray-200">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                <div key={w} className="border-b border-gray-200 bg-gray-50 py-1.5 text-center text-[11px] text-gray-500">{w}</div>
              ))}
              {calCells.map((d) => {
                const inMonth = fromISO(d).getMonth() === cursor.getMonth();
                const inRange = d >= range.start && d <= range.end;
                const edge = d === range.start || d === range.end;
                const hol = showHolidays && holidayOf(d);
                const active = jobs.map((j, i) => ({ j, i, sp: spanOf(j) })).filter(({ sp }) => sp && d >= sp.start && d <= sp.end);
                const tone = edge ? "bg-[#4f46c8] text-white" : inRange ? "bg-indigo-100" : isWeekend(d) ? "bg-slate-50" : "bg-white";
                return (
                  <button key={d}
                    onClick={() => onCalendarDay(d)} onDoubleClick={() => toggleHoliday(d)}
                    title={`${fmtFull(d)}${hol ? " - " + hol : ""}${active.length ? "\nActive: " + active.map(({ j }) => j.id).join(", ") : ""}\nClick to pick a range. Double-click to mark a holiday.`}
                    className={`relative flex h-[50px] flex-col overflow-hidden border-b border-r border-gray-100 p-1 text-left text-xs ${tone} ${inMonth || edge ? "" : "text-gray-300"} ${FOCUS}`}>
                    <span className={d === today ? "font-bold underline" : ""}>{fromISO(d).getDate()}</span>
                    {hol && <em className="mt-0.5 self-start rounded-[3px] bg-red-200 px-[3px] text-[9px] not-italic text-red-800">Holiday</em>}
                    <div className="mt-auto flex gap-0.5">
                      {active.slice(0, 3).map(({ j, i }) => <i key={j.id} className="h-1 flex-1 rounded-sm" style={{ background: JOB_COLORS[i % JOB_COLORS.length] }} />)}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className={hintCls}>{pending ? "Pick the end date." : "Click a day to start a range. Double-click to mark a holiday."}</p>
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-3 gap-2.5">
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-gray-200 bg-white p-2.5">
              <small className="text-xs text-gray-500">Daily Output</small>
              <b className="text-[19px]">{kpis.output.toLocaleString()} <span className="text-xs font-medium">Units</span></b>
              <div className="flex"><Bar v={52} /></div>
            </div>
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-gray-200 bg-white p-2.5">
              <small className="text-xs text-gray-500">Efficiency</small>
              <b className="text-[19px]">{kpis.efficiency}%</b>
              <div className="flex"><Bar v={kpis.efficiency} green /></div>
            </div>
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-gray-200 bg-white p-2.5">
              <small className="text-xs text-gray-500">On-Time Delivery</small>
              <b className="text-[19px]">{kpis.onTime}%</b>
              <div className="flex"><Bar v={kpis.onTime} green /></div>
            </div>
          </section>
        </div>
      </div>

      {/* Details of the clicked production order only */}
      {selected && (
        <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[400px] flex-col border-l border-gray-200 bg-white shadow-2xl" aria-label={`Details for ${selected.id}`}>
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
            <div>
              <p className="text-xs text-gray-500">Production Order</p>
              <h2 className="text-lg font-semibold">{selected.id} - {selected.name}</h2>
              <div className="mt-1.5"><Pill s={selected.status} /></div>
            </div>
            <button className={iconBtn} aria-label="Close details" onClick={() => setSelectedId(null)}>&times;</button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Style", selected.style],
                ["Customer", selected.customer],
                ["Quantity", selected.qty],
                ["Current stage", selected.stage],
                ["Due date", selected.due ? fmtFull(selected.due) : "Not set"],
                ["Progress", `${selected.progress}%`],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-gray-500">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-3 flex"><Bar v={selected.progress} /></div>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Stage schedule</h3>
            <ul className="flex flex-col gap-2">
              {STAGES.map((st) => {
                const d = selected.dates?.[st.key];
                const planned = d && d.start && d.end;
                const late = planned && selected.due && d.end > selected.due;
                return (
                  <li key={st.key} className="rounded-lg border border-gray-200 p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium">
                        <i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: st.color }} />{st.label}
                        {selected.stage === st.label && selected.status !== "Complete" && <span className="rounded bg-indigo-100 px-1.5 text-[11px] text-[#4f46c8]">Current</span>}
                      </span>
                      <span className="text-xs text-gray-500">{planned ? `${diffDays(d.start, d.end) + 1} day${diffDays(d.start, d.end) ? "s" : ""}` : "Not planned"}</span>
                    </div>
                    {planned && <p className="mt-1 text-[13px] text-gray-600">{fmtFull(d.start)} to {fmtFull(d.end)}</p>}
                    {late && <p className="mt-1 text-xs text-amber-700">Ends after the due date.</p>}
                  </li>
                );
              })}
            </ul>

            {spanOf(selected) && (
              <p className={hintCls}>Planned from {fmtFull(spanOf(selected).start)} to {fmtFull(spanOf(selected).end)}.</p>
            )}
          </div>

          <div className="flex justify-between gap-2 border-t border-gray-200 p-3">
            <button className={btnGhost} disabled={!spanOf(selected)} onClick={() => { const sp = spanOf(selected); sp && applyRange(sp.start, sp.end); }}>Show dates in Gantt</button>
            <button className={btnPrimary} onClick={() => openEdit(selected)}>Edit schedule</button>
          </div>
        </aside>
      )}

      {/* Schedule / edit job modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}>
          <form className="max-h-[92vh] w-full max-w-[560px] overflow-auto rounded-2xl bg-white p-5 shadow-2xl" onSubmit={saveJob} role="dialog" aria-label={form.id ? "Edit job" : "Schedule new job"}>
            <h2 className="mb-3.5 text-lg font-semibold">{form.id ? `Edit ${form.id}` : "Schedule New Job"}</h2>

            <div className="flex gap-2.5">
              <label className={labelCls}>Style
                <input autoFocus className={inputCls} value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} placeholder="e.g. Men's Shirts" />
              </label>
              <label className={labelCls}>Job name
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Men's Cotton Shirt" />
              </label>
            </div>
            <div className="flex gap-2.5">
              <label className={labelCls}>Customer
                <input className={inputCls} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
              </label>
              <label className={labelCls}>Quantity
                <input type="number" min="1" className={inputCls} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              </label>
              <label className={labelCls}>Due date
                <input type="date" className={inputCls} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
              </label>
            </div>
            <div className="flex gap-2.5">
              <label className={labelCls}>Current stage
                <select className={inputCls} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map((s) => <option key={s.key}>{s.label}</option>)}
                </select>
              </label>
              <label className={labelCls}>Status
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className={labelCls}>Progress (%)
                <input type="number" min="0" max="100" className={inputCls} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
              </label>
            </div>

            <fieldset className="mb-2 rounded-lg border border-gray-200 p-3">
              <legend className="px-1 text-xs font-medium text-gray-500">Stage dates (leave both empty if not planned yet)</legend>
              {STAGES.map((s) => (
                <div key={s.key} className="mb-2 grid grid-cols-[92px_1fr_1fr_auto] items-center gap-2">
                  <span className="flex items-center gap-1.5 text-sm"><i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}</span>
                  <input type="date" className={inputCls} aria-label={`${s.label} start`} value={form.dates[s.key].start}
                    onChange={(e) => setStageDate(s.key, "start", e.target.value)} />
                  <input type="date" className={inputCls} aria-label={`${s.label} end`} min={form.dates[s.key].start} value={form.dates[s.key].end}
                    onChange={(e) => setStageDate(s.key, "end", e.target.value)} />
                  <button type="button" className={`text-xs text-gray-500 hover:text-red-700 ${FOCUS}`}
                    onClick={() => setForm((f) => ({ ...f, dates: { ...f.dates, [s.key]: { start: "", end: "" } } }))}>Clear</button>
                </div>
              ))}
            </fieldset>

            {lateStages.length > 0 && (
              <p className="mb-1 text-[13px] text-amber-700">
                {lateStages.map((s) => s.label).join(", ")} {lateStages.length > 1 ? "end" : "ends"} after the due date ({fmtFull(form.due)}).
              </p>
            )}
            {formErrors.map((m) => <p key={m} className={errCls}>{m}</p>)}

            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={formErrors.length > 0}>{form.id ? "Save changes" : "Schedule job"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}