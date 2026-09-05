// DailyExport.jsx (Daily Shipment table)
import React, { useState, useRef, useEffect, useMemo } from 'react'

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
const sampleData = [
    { id: 1, date: '2026-09-01', jobNumber: 'JOB-1001', styleNumber: 'STY-A21', color: 'Navy', dailyShipment: 500, remarks: 'Partial shipment' },
    { id: 2, date: '2026-09-02', jobNumber: 'JOB-1001', styleNumber: 'STY-A21', color: 'Navy', dailyShipment: 600, remarks: '' },
    { id: 3, date: '2026-09-02', jobNumber: 'JOB-1002', styleNumber: 'STY-B14', color: 'White', dailyShipment: 400, remarks: '' },
    { id: 4, date: '2026-08-30', jobNumber: 'JOB-0998', styleNumber: 'STY-D02', color: 'Grey', dailyShipment: 350, remarks: 'Final lot' },
    { id: 5, date: '2026-09-03', jobNumber: 'JOB-1003', styleNumber: 'STY-C07', color: 'Black', dailyShipment: 200, remarks: 'Delayed truck' },
    { id: 6, date: '2026-08-31', jobNumber: 'JOB-0999', styleNumber: 'STY-D02', color: 'Grey', dailyShipment: 480, remarks: '' },
]

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

// ---------- FILTER DROPDOWN (Excel-style column filter) ----------
const FilterDropdown = ({ label, options, selected, onToggle, onClear }) => {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = options.filter((opt) =>
        opt.toLowerCase().includes(search.toLowerCase())
    )
    const isActive = selected && selected.size > 0

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
                className={`ml-1 rounded px-1 text-xs ${isActive ? 'text-amber-400' : 'text-slate-300'} hover:text-white`}
                title={`Filter ${label}`}
            >
                ▾
            </button>
            {open && (
                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white text-slate-800 shadow-lg">
                    <div className="p-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto border-t border-gray-100 px-2 py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-2 text-center text-xs text-gray-400">No values</div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <label key={opt} className="flex cursor-pointer items-center gap-2 py-1 text-xs font-normal">
                                    <input
                                        type="checkbox"
                                        checked={selected?.has(opt) ?? false}
                                        onChange={() => onToggle(opt)}
                                        className="h-3 w-3"
                                    />
                                    <span className="truncate">{opt || '(blank)'}</span>
                                </label>
                            ))
                        )}
                    </div>
                    <div className="flex justify-between border-t border-gray-100 px-2 py-1.5">
                        <button onClick={onClear} className="text-xs font-normal text-blue-600 hover:underline">Clear</button>
                        <button onClick={() => setOpen(false)} className="text-xs font-normal text-slate-500 hover:underline">Close</button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ---------- MAIN COMPONENT ----------
const DailyExport = ({ data = sampleData }) => {
    const [filters, setFilters] = useState({})
    const [monthFilter, setMonthFilter] = useState('ALL')

    const monthLabel = (dateStr) => {
        const d = new Date(dateStr)
        if (isNaN(d)) return null
        return d.toLocaleString('default', { month: 'long', year: 'numeric' })
    }

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

    const toggleFilterValue = (key, value) => {
        setFilters((prev) => {
            const current = new Set(prev[key] ?? [])
            current.has(value) ? current.delete(value) : current.add(value)
            return { ...prev, [key]: current }
        })
    }

    const clearFilter = (key) => {
        setFilters((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
        })
    }

    const filteredData = useMemo(() => {
        return data.filter((row) => {
            if (monthFilter !== 'ALL' && row.date) {
                if (monthLabel(row.date) !== monthFilter) return false
            }
            for (const key of Object.keys(filters)) {
                const set = filters[key]
                if (set && set.size > 0 && !set.has(String(row[key] ?? ''))) return false
            }
            return true
        })
    }, [data, filters, monthFilter])

    return (
        <div className="w-full rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Toolbar: title, month filter, export */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-800">Daily Shipment</h3>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-600">Month:</label>
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                        <option value="ALL">All Months</option>
                        {availableMonths.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => exportToCSV(filteredData, columns, 'daily-shipment.csv')}
                        className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                        ⬇ Export
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="border border-slate-700 px-3 py-2 text-center font-semibold whitespace-nowrap"
                                >
                                    {col.label}
                                    <FilterDropdown
                                        label={col.label}
                                        options={getUniqueValues(col.key)}
                                        selected={filters[col.key]}
                                        onToggle={(val) => toggleFilterValue(col.key, val)}
                                        onClear={() => clearFilter(col.key)}
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
                                            {row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default DailyExport