// DailyExport.jsx (Daily Shipment table)
import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Download, RefreshCw, X, Search } from 'lucide-react'

// ---------- COLUMN DEFINITIONS ----------
const columns = [
    { key: 'date', label: 'DATE' },
    { key: 'jobNumber', label: 'JOB NUMBER' },
    { key: 'styleNumber', label: 'STYLE NUMBER' },
    { key: 'color', label: 'COLOR' },
    { key: 'dailyShipment', label: 'DAILY SHIPMENT' },
    { key: 'remarks', label: 'REMARKS' },
]

// ---------- SAMPLE DATA ----------
// NOTE: "today" for the summary cards is derived from the most recent date
// found in this dataset (see `referenceDate` below). Once real/live data is
// wired in, referenceDate can simply be `new Date()`.
const sampleData = [
    { id: 1, date: '2026-09-01', jobNumber: 'JOB-1001', styleNumber: 'STY-A21', color: 'Navy', dailyShipment: 500, remarks: 'Partial shipment' },
    { id: 2, date: '2026-09-02', jobNumber: 'JOB-1001', styleNumber: 'STY-A21', color: 'Navy', dailyShipment: 600, remarks: '' },
    { id: 3, date: '2026-09-02', jobNumber: 'JOB-1002', styleNumber: 'STY-B14', color: 'White', dailyShipment: 400, remarks: '' },
    { id: 4, date: '2026-09-03', jobNumber: 'JOB-1003', styleNumber: 'STY-C07', color: 'Black', dailyShipment: 200, remarks: 'Delayed truck' },
    { id: 5, date: '2026-09-03', jobNumber: 'JOB-1002', styleNumber: 'STY-B14', color: 'White', dailyShipment: 350, remarks: '' },
    { id: 6, date: '2026-08-31', jobNumber: 'JOB-0999', styleNumber: 'STY-D02', color: 'Grey', dailyShipment: 480, remarks: '' },
    { id: 7, date: '2026-08-30', jobNumber: 'JOB-0998', styleNumber: 'STY-D02', color: 'Grey', dailyShipment: 350, remarks: 'Final lot' },
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
const exportToCSV = (data, cols, filename = 'daily-shipment.csv') => {
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
const DailyExport = ({ data = sampleData }) => {
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

    // ---------- SUMMARY TOTALS ----------
    const summary = useMemo(() => {
        let dailyTotal = 0
        let weekTotal = 0
        let monthTotal = 0
        let grandTotal = 0

        data.forEach((row) => {
            const qty = Number(row.dailyShipment) || 0
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

    const filteredTotal = useMemo(
        () => filteredData.reduce((sum, row) => sum + (Number(row.dailyShipment) || 0), 0),
        [filteredData]
    )

    const dateModes = [
        { key: 'all', label: 'All' },
        { key: 'today', label: 'Today' },
        { key: 'yesterday', label: 'Yesterday' },
        { key: 'date', label: 'Date' },
        { key: 'month', label: 'Month' },
    ]

    return (
        <div className="w-full space-y-3">
            {/* ---------- SUMMARY CARDS ---------- */}
            <div className="flex flex-wrap gap-3">
                <SummaryCard label="Daily Shipment" value={summary.dailyTotal} accent="border-emerald-500" />
                <SummaryCard label="This Week Shipment" value={summary.weekTotal} accent="border-sky-500" />
                <SummaryCard label="This Month Shipment" value={summary.monthTotal} accent="border-violet-500" />
                <SummaryCard label="Total Shipment" value={summary.grandTotal} accent="border-amber-500" />
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
                        onClick={() => exportToCSV(filteredData, columns, 'daily-shipment.csv')}
                        className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                        <Download size={13} /> Export
                    </button>
                </div>

                {/* Table (vertical scroll container so the total footer can stick) */}
                <div className="max-h-[520px] overflow-auto" onScroll={() => activeFilter && setActiveFilter(null)}>
                    <table className="min-w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-slate-700 text-white">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className="border border-slate-600 px-3 py-2 text-center font-semibold whitespace-nowrap"
                                    >
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
                                    <td colSpan={columns.length} className="border border-gray-200 px-3 py-6 text-center text-gray-400">
                                        No matching records
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row, i) => (
                                    <tr key={row.id ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        {columns.map((col) => (
                                            <td key={col.key} className="border border-gray-200 px-3 py-2 text-center whitespace-nowrap">
                                                {col.key === 'dailyShipment' ? formatNumber(row[col.key]) : row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="sticky bottom-0 z-20">
                            <tr className="bg-slate-700 font-semibold text-white">
                                <td
                                    colSpan={columns.findIndex((c) => c.key === 'dailyShipment')}
                                    className="border border-slate-600 px-3 py-2 text-center"
                                >
                                    TOTAL
                                </td>
                                <td className="border border-slate-600 px-3 py-2 text-center">
                                    {formatNumber(filteredTotal)}
                                </td>
                                <td
                                    colSpan={columns.length - columns.findIndex((c) => c.key === 'dailyShipment') - 1}
                                    className="border border-slate-600 px-3 py-2 text-center"
                                />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {activeFilter && (
                <FilterModal
                    label={columns.find((c) => c.key === activeFilter.key)?.label}
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

export default DailyExport