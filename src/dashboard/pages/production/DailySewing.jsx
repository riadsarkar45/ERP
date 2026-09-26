// DailySewing.jsx
import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Download, RefreshCw, X, Search } from 'lucide-react'

// ---------- HOUR + LEFT COLUMN DEFINITIONS ----------
const HOUR_SLOTS = ['8-9', '9-10', '10-11', '11-12', '12-1', 'LUNCH BREACK', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10']
const HOUR_COLUMNS = HOUR_SLOTS.map((slot, i) => ({ key: `h${i}`, label: slot }))

const LEFT_COLUMNS = [
    { key: 'date', label: 'DATE' },
    { key: 'lineNumber', label: 'LINE NUMBER' },
    { key: 'jobNumber', label: 'JOB NUMBER' },
    { key: 'styleNumber', label: 'STYLE NUMBER' },
    { key: 'color', label: 'COLOR' },
    { key: 'orderQty', label: 'ORDER QTY' },
    { key: 'targetHour', label: 'TARGET HOUR' },
    { key: 'dailyTarget', label: 'DAILY TARGET' },
    { key: 'dailyInput', label: 'DAILY INPUT' },
    { key: 'dailyOutput', label: 'DAILY OUTPUT' },
    { key: 'achv', label: 'ACHV (%)' },
]
const REMARKS_COLUMN = { key: 'remarks', label: 'REMARKS' }
const ALL_COLUMNS = [...LEFT_COLUMNS, ...HOUR_COLUMNS, REMARKS_COLUMN]

// numeric columns that get totaled in the sticky footer
const TOTAL_KEYS = ['dailyTarget', 'dailyInput', 'dailyOutput', ...HOUR_COLUMNS.map((h) => h.key)]

// ---------- SAMPLE DATA ----------
// NOTE: "today" for the summary cards is derived from the most recent date
// found in this dataset (see `referenceDate` below). Once real/live data is
// wired in, referenceDate can simply be `new Date()`.
const sampleData = [
    {
        id: 1, date: '2026-09-01', lineNumber: 'L-01', jobNumber: 'JOB-1001', styleNumber: 'STY-A21', color: 'Navy',
        orderQty: 5000, targetHour: 120, dailyTarget: 960, dailyInput: 1000, dailyOutput: 920, achv: '95.8%',
        h0: 80, h1: 85, h2: 90, h3: 88, h4: 82, h5: '-', h6: 90, h7: 95, h8: 92, h9: 88, h10: 85, h11: 80, h12: 78, h13: 75,
        remarks: 'Line balanced',
    },
    {
        id: 2, date: '2026-09-01', lineNumber: 'L-02', jobNumber: 'JOB-1002', styleNumber: 'STY-B14', color: 'White',
        orderQty: 3000, targetHour: 100, dailyTarget: 800, dailyInput: 850, dailyOutput: 780, achv: '97.5%',
        h0: 65, h1: 70, h2: 72, h3: 68, h4: 60, h5: '-', h6: 70, h7: 75, h8: 72, h9: 68, h10: 65, h11: 60, h12: 58, h13: 55,
        remarks: '',
    },
    {
        id: 3, date: '2026-09-02', lineNumber: 'L-01', jobNumber: 'JOB-1001', styleNumber: 'STY-A21', color: 'Navy',
        orderQty: 5000, targetHour: 120, dailyTarget: 960, dailyInput: 1000, dailyOutput: 940, achv: '97.9%',
        h0: 82, h1: 88, h2: 92, h3: 90, h4: 85, h5: '-', h6: 92, h7: 96, h8: 94, h9: 90, h10: 88, h11: 82, h12: 80, h13: 78,
        remarks: 'New helper trained',
    },
    {
        id: 4, date: '2026-09-03', lineNumber: 'L-02', jobNumber: 'JOB-1002', styleNumber: 'STY-B14', color: 'White',
        orderQty: 3000, targetHour: 100, dailyTarget: 800, dailyInput: 820, dailyOutput: 800, achv: '100%',
        h0: 68, h1: 72, h2: 74, h3: 70, h4: 62, h5: '-', h6: 72, h7: 76, h8: 74, h9: 70, h10: 66, h11: 62, h12: 60, h13: 58,
        remarks: '',
    },
    {
        id: 5, date: '2026-08-31', lineNumber: 'L-03', jobNumber: 'JOB-0999', styleNumber: 'STY-D02', color: 'Grey',
        orderQty: 2000, targetHour: 80, dailyTarget: 640, dailyInput: 660, dailyOutput: 630, achv: '98.4%',
        h0: 56, h1: 58, h2: 60, h3: 58, h4: 52, h5: '-', h6: 58, h7: 60, h8: 58, h9: 55, h10: 52, h11: 48, h12: 46, h13: 41,
        remarks: '',
    },
    {
        id: 6, date: '2026-08-30', lineNumber: 'L-03', jobNumber: 'JOB-0998', styleNumber: 'STY-D02', color: 'Grey',
        orderQty: 2000, targetHour: 80, dailyTarget: 640, dailyInput: 700, dailyOutput: 610, achv: '95.3%',
        h0: 55, h1: 58, h2: 60, h3: 58, h4: 50, h5: '-', h6: 58, h7: 60, h8: 58, h9: 55, h10: 50, h11: 48, h12: 45, h13: 40,
        remarks: 'Machine breakdown 30 min',
    },
]

// ---------- DATE HELPERS ----------
const toDateOnly = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

const isSameDay = (a, b) => toDateOnly(a).getTime() === toDateOnly(b).getTime()

const startOfWeek = (d) => {
    const x = toDateOnly(d)
    const day = x.getDay() // 0 = Sunday
    const diff = (day === 0 ? 6 : day - 1) // treat Monday as start of week
    x.setDate(x.getDate() - diff)
    return x
}

const startOfMonth = (d) => {
    const x = toDateOnly(d)
    x.setDate(1)
    return x
}

const monthLabel = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d)) return null
    return d.toLocaleString('default', { month: 'long', year: 'numeric' })
}

const formatNumber = (n) => Number(n || 0).toLocaleString('en-US')

// ---------- CSV EXPORT HELPER ----------
const exportToCSV = (data, cols, filename = 'daily-sewing.csv') => {
    const header = cols.map((c) => c.label).join(',')
    const rows = data.map((row) =>
        cols.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

// ---------- SUMMARY CARD ----------
const SummaryCard = ({ label, value, accent = 'border-emerald-500' }) => (
    <div className={`flex-1 min-w-[200px] rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm border-l-4 ${accent}`}>
        <div className="text-[11px] font-semibold tracking-wide text-amber-600 uppercase">{label}</div>
        <div className="mt-1 text-xl font-bold text-slate-800">{formatNumber(value)}</div>
    </div>
)

// ---------- FILTER TRIGGER (funnel icon in the header cell) ----------
const FilterTrigger = ({ label, isActive, onOpen }) => (
    <button
        onClick={(e) => {
            e.stopPropagation()
            const rect = e.currentTarget.getBoundingClientRect()
            onOpen(rect)
        }}
        className={`ml-1 rounded p-0.5 align-middle ${isActive ? 'text-amber-400' : 'text-slate-300'} hover:text-white`}
        title={`Filter ${label}`}
    >
        <Filter size={12} fill={isActive ? 'currentColor' : 'none'} />
    </button>
)

// ---------- FILTER MODAL (Excel-style: search + checkbox list, Apply / Clear) ----------
// Rendered through a portal, fixed-positioned right under the column's own
// filter icon (using its on-screen rect) so it always sits at that column's
// position instead of being clipped by the table's scroll container.
const PANEL_WIDTH = 240

const FilterModal = ({ label, options, initialSelected, anchorRect, onApply, onClear, onClose }) => {
    const [search, setSearch] = useState('')
    const [pending, setPending] = useState(new Set(initialSelected))

    useEffect(() => {
        setPending(new Set(initialSelected))
        setSearch('')
    }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

    const filteredOptions = options.filter((opt) =>
        opt.toLowerCase().includes(search.toLowerCase())
    )

    const toggleOption = (opt) => {
        setPending((prev) => {
            const next = new Set(prev)
            next.has(opt) ? next.delete(opt) : next.add(opt)
            return next
        })
    }

    const top = anchorRect.bottom + 4
    const maxLeft = window.innerWidth - PANEL_WIDTH - 8
    const left = Math.min(Math.max(anchorRect.left - PANEL_WIDTH + 20, 8), maxLeft)

    return createPortal(
        <>
            <div className="fixed inset-0 z-[99]" onMouseDown={onClose} />
            <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{ position: 'fixed', top, left, width: PANEL_WIDTH }}
                className="z-[100] overflow-hidden rounded-md border border-gray-200 bg-white text-slate-800 shadow-xl"
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
                    <span className="text-sm font-semibold">Filter: {label}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-2.5">
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full rounded border border-gray-300 py-1.5 pl-7 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                    </div>
                </div>

                <div className="max-h-52 overflow-y-auto px-2.5 pb-1">
                    {filteredOptions.length === 0 ? (
                        <div className="py-3 text-center text-xs text-gray-400">No values</div>
                    ) : (
                        filteredOptions.map((opt) => (
                            <label key={opt} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm">
                                <input
                                    type="checkbox"
                                    checked={pending.has(opt)}
                                    onChange={() => toggleOption(opt)}
                                    className="h-3.5 w-3.5"
                                />
                                <span className="truncate">{opt || '(blank)'}</span>
                            </label>
                        ))
                    )}
                </div>

                <div className="flex gap-2 border-t border-gray-200 px-2.5 py-2">
                    <button
                        onClick={() => onApply(pending)}
                        className="flex-1 rounded bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Apply
                    </button>
                    <button
                        onClick={onClear}
                        className="flex-1 rounded border border-gray-300 py-1.5 text-sm font-medium text-slate-700 hover:bg-gray-50"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </>,
        document.body
    )
}

// ---------- MAIN COMPONENT ----------
const DailySewing = ({ data = sampleData }) => {
    const [filters, setFilters] = useState({})
    const [activeFilter, setActiveFilter] = useState(null) // { key, rect }

    // date filter mode: 'all' | 'today' | 'yesterday' | 'date' | 'month'
    const [dateMode, setDateMode] = useState('all')
    const [customDate, setCustomDate] = useState('')
    const [customMonth, setCustomMonth] = useState('')

    const referenceDate = useMemo(() => {
        const dates = data.map((r) => toDateOnly(r.date)).filter((d) => !isNaN(d))
        if (dates.length === 0) return toDateOnly(new Date())
        return new Date(Math.max(...dates.map((d) => d.getTime())))
    }, [data])

    const yesterday = useMemo(() => {
        const y = new Date(referenceDate)
        y.setDate(y.getDate() - 1)
        return y
    }, [referenceDate])

    const weekStart = useMemo(() => startOfWeek(referenceDate), [referenceDate])
    const monthStart = useMemo(() => startOfMonth(referenceDate), [referenceDate])

    // ---------- SUMMARY TOTALS (based on DAILY OUTPUT) ----------
    const summary = useMemo(() => {
        let dailyTotal = 0
        let weekTotal = 0
        let monthTotal = 0
        let grandTotal = 0

        data.forEach((row) => {
            const qty = Number(row.dailyOutput) || 0
            const d = toDateOnly(row.date)
            grandTotal += qty
            if (isSameDay(d, referenceDate)) dailyTotal += qty
            if (d >= weekStart && d <= referenceDate) weekTotal += qty
            if (d >= monthStart && d <= referenceDate) monthTotal += qty
        })

        return { dailyTotal, weekTotal, monthTotal, grandTotal }
    }, [data, referenceDate, weekStart, monthStart])

    const availableMonths = useMemo(() => {
        const set = new Set()
        data.forEach((row) => {
            const label = row.date ? monthLabel(row.date) : null
            if (label) set.add(label)
        })
        return Array.from(set)
    }, [data])

    const getUniqueValues = (key) => {
        const set = new Set(data.map((row) => String(row[key] ?? '')))
        return Array.from(set).sort()
    }

    const applyFilter = (key, valuesSet) => {
        setFilters((prev) => {
            const next = { ...prev }
            if (valuesSet.size === 0) delete next[key]
            else next[key] = valuesSet
            return next
        })
        setActiveFilter(null)
    }

    const clearFilter = (key) => {
        setFilters((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
        })
        setActiveFilter(null)
    }

    // ---------- FILTERED ROWS ----------
    const filteredData = useMemo(() => {
        return data.filter((row) => {
            const d = toDateOnly(row.date)

            if (dateMode === 'today' && !isSameDay(d, referenceDate)) return false
            if (dateMode === 'yesterday' && !isSameDay(d, yesterday)) return false
            if (dateMode === 'date' && customDate && !isSameDay(d, toDateOnly(customDate))) return false
            if (dateMode === 'month' && customMonth && monthLabel(row.date) !== customMonth) return false

            for (const key of Object.keys(filters)) {
                const set = filters[key]
                if (set && set.size > 0 && !set.has(String(row[key] ?? ''))) return false
            }
            return true
        })
    }, [data, filters, dateMode, customDate, customMonth, referenceDate, yesterday])

    // totals per numeric column (dailyTarget/dailyInput/dailyOutput + every hour slot), for the sticky footer
    const footerTotals = useMemo(() => {
        const totals = {}
        TOTAL_KEYS.forEach((key) => {
            totals[key] = filteredData.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
        })
        return totals
    }, [filteredData])

    const dateModes = [
        { key: 'all', label: 'All' },
        { key: 'today', label: 'Today' },
        { key: 'yesterday', label: 'Yesterday' },
        { key: 'date', label: 'Date' },
        { key: 'month', label: 'Month' },
    ]

    // TOTAL label spans every left column before the first summed column (dailyTarget)
    const labelSpan = LEFT_COLUMNS.findIndex((c) => c.key === 'dailyTarget')

    return (
        <div className="w-full space-y-3">
            {/* ---------- SUMMARY CARDS ---------- */}
            <div className="flex flex-wrap gap-3">
                <SummaryCard label="Daily Output" value={summary.dailyTotal} accent="border-emerald-500" />
                <SummaryCard label="This Week Output" value={summary.weekTotal} accent="border-sky-500" />
                <SummaryCard label="This Month Output" value={summary.monthTotal} accent="border-violet-500" />
                <SummaryCard label="Total Output" value={summary.grandTotal} accent="border-amber-500" />
            </div>

            {/* ---------- TABLE CARD ---------- */}
            <div className="w-full rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* Toolbar: date filter pills + custom inputs + export */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {dateModes.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => setDateMode(m.key)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    dateMode === m.key
                                        ? 'border-slate-800 bg-slate-800 text-white'
                                        : 'border-gray-300 bg-white text-slate-600 hover:bg-gray-50'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}

                        {dateMode === 'date' && (
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                        )}

                        {dateMode === 'month' && (
                            <select
                                value={customMonth}
                                onChange={(e) => setCustomMonth(e.target.value)}
                                className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                            >
                                <option value="">Select month</option>
                                {availableMonths.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={() => { setDateMode('all'); setCustomDate(''); setCustomMonth('') }}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                            title="Reset date filter"
                        >
                            <RefreshCw size={12} /> Reset
                        </button>
                    </div>

                    <button
                        onClick={() => exportToCSV(filteredData, ALL_COLUMNS, 'daily-sewing.csv')}
                        className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                        <Download size={13} /> Export
                    </button>
                </div>

                {/* Table (vertical scroll container so the total footer can stick) */}
                <div className="max-h-[560px] overflow-auto" onScroll={() => activeFilter && setActiveFilter(null)}>
                    <table className="min-w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-slate-700 text-white">
                                {LEFT_COLUMNS.map((col) => (
                                    <th key={col.key} rowSpan={2} className="border border-slate-600 px-3 py-2 text-center font-semibold align-middle whitespace-nowrap">
                                        {col.label}
                                        <FilterTrigger
                                            label={col.label}
                                            isActive={filters[col.key] && filters[col.key].size > 0}
                                            onOpen={(rect) => setActiveFilter({ key: col.key, rect })}
                                        />
                                    </th>
                                ))}
                                <th colSpan={HOUR_COLUMNS.length} className="border border-slate-600 px-3 py-2 text-center font-semibold">
                                    HOUR & PRODUCTION
                                </th>
                                <th rowSpan={2} className="border border-slate-600 px-3 py-2 text-center font-semibold align-middle whitespace-nowrap">
                                    {REMARKS_COLUMN.label}
                                    <FilterTrigger
                                        label={REMARKS_COLUMN.label}
                                        isActive={filters[REMARKS_COLUMN.key] && filters[REMARKS_COLUMN.key].size > 0}
                                        onOpen={(rect) => setActiveFilter({ key: REMARKS_COLUMN.key, rect })}
                                    />
                                </th>
                            </tr>
                            <tr className="bg-slate-600 text-white">
                                {HOUR_COLUMNS.map((col) => (
                                    <th key={col.key} className="border border-slate-500 px-2 py-2 text-center font-medium whitespace-nowrap">
                                        {col.label}
                                        <FilterTrigger
                                            label={col.label}
                                            isActive={filters[col.key] && filters[col.key].size > 0}
                                            onOpen={(rect) => setActiveFilter({ key: col.key, rect })}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={ALL_COLUMNS.length} className="border border-gray-200 px-3 py-6 text-center text-gray-400">
                                        No matching records
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row, i) => (
                                    <tr key={row.id ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        {ALL_COLUMNS.map((col) => (
                                            <td key={col.key} className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                                                {TOTAL_KEYS.includes(col.key) && typeof row[col.key] === 'number'
                                                    ? formatNumber(row[col.key])
                                                    : row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="sticky bottom-0 z-20">
                            <tr className="bg-slate-700 font-semibold text-white">
                                <td colSpan={labelSpan} className="border border-slate-600 px-3 py-2 text-center">
                                    TOTAL
                                </td>
                                {LEFT_COLUMNS.slice(labelSpan).map((col) => (
                                    <td key={col.key} className="border border-slate-600 px-3 py-2 text-center">
                                        {TOTAL_KEYS.includes(col.key) ? formatNumber(footerTotals[col.key]) : ''}
                                    </td>
                                ))}
                                {HOUR_COLUMNS.map((col) => (
                                    <td key={col.key} className="border border-slate-600 px-2 py-2 text-center">
                                        {formatNumber(footerTotals[col.key])}
                                    </td>
                                ))}
                                <td className="border border-slate-600 px-3 py-2 text-center" />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {activeFilter && (
                <FilterModal
                    label={ALL_COLUMNS.find((c) => c.key === activeFilter.key)?.label}
                    options={getUniqueValues(activeFilter.key)}
                    initialSelected={filters[activeFilter.key] ?? new Set()}
                    anchorRect={activeFilter.rect}
                    onApply={(pendingSet) => applyFilter(activeFilter.key, pendingSet)}
                    onClear={() => clearFilter(activeFilter.key)}
                    onClose={() => setActiveFilter(null)}
                />
            )}
        </div>
    )
}

export default DailySewing