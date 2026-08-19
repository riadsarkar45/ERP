import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'

/* ----------------------------- Icons (inline, dependency-free) ----------------------------- */

const IconFilter = ({ active }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path
      d="M3 4.5h18l-7 8.2V19l-4 2v-8.3L3 4.5z"
      fill={active ? '#F59E0B' : 'none'}
      stroke={active ? '#F59E0B' : '#94A3B8'}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
)

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M4 12.5l5.5 5.5L20 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconX = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

const IconWrap = ({ active }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M3 5h18M3 12h13a3 3 0 0 1 0 6h-3m0 0l2.2-2.2M13 18l2.2 2.2M3 18h6"
      stroke={active ? '#0F766E' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconSort = ({ dir }) => (
  <span className="flex flex-col leading-3 ml-1 select-none">
    <svg width="9" height="7" viewBox="0 0 10 6" className={dir === 'asc' ? 'opacity-100' : 'opacity-30'}>
      <path d="M5 0L10 6H0Z" fill="currentColor" />
    </svg>
    <svg width="9" height="7" viewBox="0 0 10 6" className={dir === 'desc' ? 'opacity-100' : 'opacity-30'}>
      <path d="M5 6L0 0H10Z" fill="currentColor" />
    </svg>
  </span>
)

const IconChevron = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ----------------------------- Column definitions ----------------------------- */

const COLUMNS = [
  { key: 'piNo', label: 'PI No', width: 108, type: 'text' },
  { key: 'piDate', label: 'PI Date', width: 104, type: 'date' },
  { key: 'lcNo', label: 'LC No', width: 128, type: 'text' },
  { key: 'po', label: 'PO', width: 100, type: 'text' },
  { key: 'supplier', label: 'Supplier', width: 176, type: 'text' },
  { key: 'yarnCount', label: 'Yarn Count', width: 130, type: 'text' },
  { key: 'composition', label: 'Composition', width: 150, type: 'text' },
  { key: 'poQty', label: 'PO Qty', width: 110, type: 'number', numeric: true },
  { key: 'yarnReceived', label: 'Yarn Received from Spinning', width: 150, type: 'number', numeric: true },
  { key: 'yarnReturned', label: 'Yarn Returned to Spinning', width: 150, type: 'number', numeric: true },
  { key: 'pendingQty', label: 'Pending Received Qty', width: 145, type: 'number', numeric: true },
  { key: 'estPiDate', label: 'Estimated PI Date', width: 130, type: 'date' },
  { key: 'periodTime', label: 'Period Time', width: 100, type: 'text' },
  { key: 'remarks', label: 'Remarks', width: 210, type: 'text' },
]

const NUMERIC_KEYS = COLUMNS.filter((c) => c.numeric).map((c) => c.key)

/* ----------------------------- Static demo data ----------------------------- */

const BASE_DATA = [
  { piNo: 'PI-2601', piDate: '2026-01-08', lcNo: 'LC-6620/25', po: 'PO-8801', supplier: 'Sinotex Yarn Co.', yarnCount: '30/1 Ne Combed', composition: '100% Cotton', poQty: 12000, yarnReceived: 12000, yarnReturned: 0, estPiDate: '2026-02-10', periodTime: '35 Days', remarks: 'Fully received' },
  { piNo: 'PI-2602', piDate: '2026-01-11', lcNo: 'LC-6621/25', po: 'PO-8802', supplier: 'Vardhman Textiles', yarnCount: '20/1 Ne Carded', composition: '100% Cotton', poQty: 18500, yarnReceived: 11000, yarnReturned: 500, estPiDate: '2026-02-20', periodTime: '40 Days', remarks: 'Partial shipment' },
  { piNo: 'PI-2603', piDate: '2026-01-14', lcNo: 'LC-6622/25', po: 'PO-8803', supplier: 'Nice Cotton Mills', yarnCount: '40/1 Ne Compact', composition: '100% Cotton', poQty: 9000, yarnReceived: 9000, yarnReturned: 200, estPiDate: '2026-02-18', periodTime: '35 Days', remarks: '200 kg returned - quality issue' },
  { piNo: 'PI-2604', piDate: '2026-01-18', lcNo: 'LC-6623/25', po: 'PO-8804', supplier: 'Ha-Meem Spinning', yarnCount: '24/1 Ne Carded', composition: 'CVC 60/40', poQty: 15000, yarnReceived: 4000, yarnReturned: 0, estPiDate: '2026-03-05', periodTime: '46 Days', remarks: 'Awaiting balance qty' },
  { piNo: 'PI-2605', piDate: '2026-01-21', lcNo: 'LC-6624/25', po: 'PO-8805', supplier: 'Envoy Textiles', yarnCount: '30/1 Ne Carded', composition: '65% Cotton 35% Polyester', poQty: 21000, yarnReceived: 21000, yarnReturned: 0, estPiDate: '2026-02-25', periodTime: '35 Days', remarks: 'Fully received' },
  { piNo: 'PI-2606', piDate: '2026-01-25', lcNo: 'LC-6625/25', po: 'PO-8806', supplier: 'Zhejiang Xinao Textile', yarnCount: '16/1 Ne OE', composition: '100% Cotton', poQty: 26000, yarnReceived: 15500, yarnReturned: 0, estPiDate: '2026-03-10', periodTime: '44 Days', remarks: 'On schedule' },
  { piNo: 'PI-2607', piDate: '2026-01-28', lcNo: 'LC-6626/25', po: 'PO-8807', supplier: 'Square Spinning Ltd.', yarnCount: '40/1 Ne Combed', composition: '100% Cotton', poQty: 8000, yarnReceived: 8000, yarnReturned: 0, estPiDate: '2026-02-28', periodTime: '31 Days', remarks: 'Fully received' },
  { piNo: 'PI-2608', piDate: '2026-02-02', lcNo: 'LC-6627/25', po: 'PO-8808', supplier: 'Sinotex Yarn Co.', yarnCount: '20/1 Ne Carded', composition: '100% Cotton', poQty: 17000, yarnReceived: 0, yarnReturned: 0, estPiDate: '2026-03-20', periodTime: '46 Days', remarks: 'LC yet to mature' },
  { piNo: 'PI-2609', piDate: '2026-02-05', lcNo: 'LC-6628/25', po: 'PO-8809', supplier: 'Noman Weaving Mills', yarnCount: '30/1 Ne Compact', composition: 'CVC 60/40', poQty: 13500, yarnReceived: 13500, yarnReturned: 300, estPiDate: '2026-03-08', periodTime: '31 Days', remarks: '300 kg short-length return' },
  { piNo: 'PI-2610', piDate: '2026-02-09', lcNo: 'LC-6629/25', po: 'PO-8810', supplier: 'Vardhman Textiles', yarnCount: '24/1 Ne Carded', composition: '100% Cotton', poQty: 19500, yarnReceived: 9800, yarnReturned: 0, estPiDate: '2026-03-22', periodTime: '41 Days', remarks: 'Partial shipment' },
  { piNo: 'PI-2611', piDate: '2026-02-12', lcNo: 'LC-6630/25', po: 'PO-8811', supplier: 'Ha-Meem Spinning', yarnCount: '10/1 Ne OE', composition: '100% Cotton', poQty: 30000, yarnReceived: 30000, yarnReturned: 0, estPiDate: '2026-03-15', periodTime: '31 Days', remarks: 'Fully received' },
  { piNo: 'PI-2612', piDate: '2026-02-16', lcNo: 'LC-6631/25', po: 'PO-8812', supplier: 'Envoy Textiles', yarnCount: '40/1 Ne Compact', composition: '95% Cotton 5% Elastane', poQty: 6000, yarnReceived: 2000, yarnReturned: 0, estPiDate: '2026-03-25', periodTime: '38 Days', remarks: 'Slow supplier response' },
  { piNo: 'PI-2613', piDate: '2026-02-19', lcNo: 'LC-6632/25', po: 'PO-8813', supplier: 'Nice Cotton Mills', yarnCount: '30/1 Ne Carded', composition: '100% Cotton', poQty: 22000, yarnReceived: 22000, yarnReturned: 0, estPiDate: '2026-03-18', periodTime: '28 Days', remarks: 'Fully received' },
  { piNo: 'PI-2614', piDate: '2026-02-23', lcNo: 'LC-6633/25', po: 'PO-8814', supplier: 'Zhejiang Xinao Textile', yarnCount: '20/1 Ne OE', composition: '100% Cotton', poQty: 14000, yarnReceived: 6500, yarnReturned: 150, estPiDate: '2026-04-01', periodTime: '38 Days', remarks: 'Minor shade variation return' },
  { piNo: 'PI-2615', piDate: '2026-02-27', lcNo: 'LC-6634/25', po: 'PO-8815', supplier: 'Square Spinning Ltd.', yarnCount: '16/1 Ne Carded', composition: 'CVC 60/40', poQty: 25000, yarnReceived: 0, yarnReturned: 0, estPiDate: '2026-04-10', periodTime: '42 Days', remarks: 'Production not started' },
  { piNo: 'PI-2616', piDate: '2026-03-03', lcNo: 'LC-6635/25', po: 'PO-8816', supplier: 'Noman Weaving Mills', yarnCount: '40/1 Ne Combed', composition: '100% Cotton', poQty: 9500, yarnReceived: 9500, yarnReturned: 0, estPiDate: '2026-04-05', periodTime: '33 Days', remarks: 'Fully received' },
  { piNo: 'PI-2617', piDate: '2026-03-07', lcNo: 'LC-6636/25', po: 'PO-8817', supplier: 'Sinotex Yarn Co.', yarnCount: '30/1 Ne Compact', composition: '100% Cotton', poQty: 16000, yarnReceived: 8000, yarnReturned: 0, estPiDate: '2026-04-15', periodTime: '39 Days', remarks: 'On schedule' },
  { piNo: 'PI-2618', piDate: '2026-03-10', lcNo: 'LC-6637/25', po: 'PO-8818', supplier: 'Vardhman Textiles', yarnCount: '24/1 Ne OE', composition: '65% Cotton 35% Polyester', poQty: 20000, yarnReceived: 20000, yarnReturned: 400, estPiDate: '2026-04-08', periodTime: '29 Days', remarks: '400 kg contamination return' },
  { piNo: 'PI-2619', piDate: '2026-03-14', lcNo: 'LC-6638/25', po: 'PO-8819', supplier: 'Ha-Meem Spinning', yarnCount: '20/1 Ne Carded', composition: '100% Cotton', poQty: 11000, yarnReceived: 3500, yarnReturned: 0, estPiDate: '2026-04-20', periodTime: '37 Days', remarks: 'Partial shipment' },
  { piNo: 'PI-2620', piDate: '2026-03-18', lcNo: 'LC-6639/25', po: 'PO-8820', supplier: 'Envoy Textiles', yarnCount: '30/1 Ne Carded', composition: '100% Cotton', poQty: 27000, yarnReceived: 27000, yarnReturned: 0, estPiDate: '2026-04-12', periodTime: '25 Days', remarks: 'Fully received' },
  { piNo: 'PI-2621', piDate: '2026-03-22', lcNo: 'LC-6640/25', po: 'PO-8821', supplier: 'Nice Cotton Mills', yarnCount: '40/1 Ne Compact', composition: '100% Cotton', poQty: 7500, yarnReceived: 0, yarnReturned: 0, estPiDate: '2026-04-28', periodTime: '37 Days', remarks: 'LC yet to mature' },
  { piNo: 'PI-2622', piDate: '2026-03-25', lcNo: 'LC-6641/25', po: 'PO-8822', supplier: 'Square Spinning Ltd.', yarnCount: '10/1 Ne OE', composition: '100% Cotton', poQty: 32000, yarnReceived: 17000, yarnReturned: 0, estPiDate: '2026-05-02', periodTime: '38 Days', remarks: 'On schedule' },
]

const DATA = BASE_DATA.map((r, i) => ({
  id: i + 1,
  ...r,
  pendingQty: r.poQty - r.yarnReceived + r.yarnReturned,
}))

const SUPPLIER_COLORS = {}
const SUPPLIER_PALETTE = ['#0F766E', '#B45309', '#1D4ED8', '#7C3AED', '#BE123C', '#0369A1', '#4D7C0F']
DATA.forEach((r) => {
  if (!(r.supplier in SUPPLIER_COLORS)) {
    SUPPLIER_COLORS[r.supplier] = SUPPLIER_PALETTE[Object.keys(SUPPLIER_COLORS).length % SUPPLIER_PALETTE.length]
  }
})

const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString('en-US') : '-')
const fmtDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ----------------------------- Filter popover ----------------------------- */

function FilterPopover({ column, values, activeSet, onApply, onClose }) {
  const ref = useRef(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(activeSet ? new Set(activeSet) : new Set(values))

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  const visibleValues = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()))

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 w-60 bg-white border-2 border-black rounded-md shadow-2xl text-slate-800 normal-case font-normal text-xs"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-black">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${column.label}...`}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-600"
        />
      </div>
      <div className="flex justify-between px-2 py-1.5 border-b border-slate-200 text-teal-700 font-medium">
        <button className="hover:underline" onClick={() => setDraft(new Set(values))}>Select all</button>
        <button className="hover:underline" onClick={() => setDraft(new Set())}>Clear</button>
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {visibleValues.length === 0 && <div className="px-3 py-3 text-slate-400 italic">No matches</div>}
        {visibleValues.map((v) => {
          const checked = draft.has(v)
          return (
            <label key={v} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 cursor-pointer select-none">
              <span
                onClick={(e) => {
                  e.preventDefault()
                  setDraft((prev) => {
                    const next = new Set(prev)
                    checked ? next.delete(v) : next.add(v)
                    return next
                  })
                }}
                className={`w-3.5 h-3.5 border-2 border-black rounded-sm flex items-center justify-center shrink-0 ${checked ? 'bg-teal-600' : 'bg-white'}`}
              >
                {checked && <IconCheck />}
              </span>
              <span className="truncate">{v}</span>
            </label>
          )
        })}
      </div>
      <div className="flex justify-end gap-2 p-2 border-t border-black bg-slate-50 rounded-b-md">
        <button onClick={onClose} className="px-2.5 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100">Cancel</button>
        <button
          onClick={() => onApply(draft)}
          className="px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-700"
        >
          OK
        </button>
      </div>
    </div>
  )
}

/* ----------------------------- Main component ----------------------------- */

const PurchaseOrderStatus = () => {
  const [checkedRows, setCheckedRows] = useState(new Set())
  const [wrapText, setWrapText] = useState(false)
  const [filters, setFilters] = useState({}) // { colKey: Set(values) }
  const [openFilterCol, setOpenFilterCol] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)

  // Excel-like cell selection
  const [selectedCells, setSelectedCells] = useState(new Set()) // "rowIdx-colKey" (rowIdx within current page)
  const [dragging, setDragging] = useState(false)
  const anchorRef = useRef(null)
  const tableWrapRef = useRef(null)

  /* ---- unique values per column, for filter dropdowns ---- */
  const uniqueValues = useMemo(() => {
    const map = {}
    COLUMNS.forEach((col) => {
      const set = new Set()
      DATA.forEach((row) => set.add(String(row[col.key])))
      map[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    })
    return map
  }, [])

  /* ---- filtering ---- */
  const filteredData = useMemo(() => {
    let rows = DATA.filter((row) =>
      COLUMNS.every((col) => {
        const active = filters[col.key]
        if (!active) return true
        return active.has(String(row[col.key]))
      })
    )
    if (sortConfig.key) {
      const { key, dir } = sortConfig
      const isNum = NUMERIC_KEYS.includes(key)
      rows = [...rows].sort((a, b) => {
        let cmp
        if (isNum) cmp = a[key] - b[key]
        else cmp = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true })
        return dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [filters, sortConfig])

  /* ---- reset to page 1 whenever the filtered set changes ---- */
  useEffect(() => {
    setCurrentPage(1)
    setSelectedCells(new Set())
  }, [filters, sortConfig, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage))
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredData.slice(start, start + rowsPerPage)
  }, [filteredData, currentPage, rowsPerPage])

  useEffect(() => setSelectedCells(new Set()), [currentPage])

  /* ---- totals ---- */
  const grandTotals = useMemo(() => {
    const t = {}
    NUMERIC_KEYS.forEach((k) => (t[k] = DATA.reduce((s, r) => s + r[k], 0)))
    return t
  }, [])

  const filteredTotals = useMemo(() => {
    const t = {}
    NUMERIC_KEYS.forEach((k) => (t[k] = filteredData.reduce((s, r) => s + r[k], 0)))
    return t
  }, [filteredData])

  /* ---- row checkboxes ---- */
  const pageAllChecked = pagedData.length > 0 && pagedData.every((r) => checkedRows.has(r.id))
  const pageSomeChecked = pagedData.some((r) => checkedRows.has(r.id)) && !pageAllChecked
  const headerCbRef = useRef(null)
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = pageSomeChecked
  }, [pageSomeChecked])

  const toggleRow = (id) => {
    setCheckedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const togglePageAll = () => {
    setCheckedRows((prev) => {
      const next = new Set(prev)
      if (pageAllChecked) pagedData.forEach((r) => next.delete(r.id))
      else pagedData.forEach((r) => next.add(r.id))
      return next
    })
  }

  /* ---- filter apply/clear ---- */
  const applyFilter = (colKey, set) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (set.size === uniqueValues[colKey].length) delete next[colKey]
      else next[colKey] = set
      return next
    })
    setOpenFilterCol(null)
  }
  const clearFilter = (colKey) => {
    setFilters((prev) => {
      const next = { ...prev }
      delete next[colKey]
      return next
    })
  }
  const clearAllFilters = () => setFilters({})

  const toggleSort = (col) => {
    setSortConfig((prev) => {
      if (prev.key !== col.key) return { key: col.key, dir: 'asc' }
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' }
      return { key: null, dir: 'asc' }
    })
  }

  /* ---- Excel-style rectangular cell selection ---- */
  const cellKey = (rowIdx, colKey) => `${rowIdx}-${colKey}`

  const rectFromAnchor = useCallback((toRowIdx, toColIdx) => {
    if (!anchorRef.current) return new Set()
    const { rowIdx: fromRowIdx, colIdx: fromColIdx } = anchorRef.current
    const rMin = Math.min(fromRowIdx, toRowIdx)
    const rMax = Math.max(fromRowIdx, toRowIdx)
    const cMin = Math.min(fromColIdx, toColIdx)
    const cMax = Math.max(fromColIdx, toColIdx)
    const set = new Set()
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        set.add(cellKey(r, NUMERIC_KEYS[c]))
      }
    }
    return set
  }, [])

  const onCellMouseDown = (rowIdx, colIdx, e) => {
    e.preventDefault()
    const key = cellKey(rowIdx, NUMERIC_KEYS[colIdx])
    if (e.ctrlKey || e.metaKey) {
      setSelectedCells((prev) => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
      })
      anchorRef.current = { rowIdx, colIdx }
    } else {
      anchorRef.current = { rowIdx, colIdx }
      setSelectedCells(new Set([key]))
    }
    setDragging(true)
  }

  const onCellMouseEnter = (rowIdx, colIdx) => {
    if (!dragging) return
    setSelectedCells(rectFromAnchor(rowIdx, colIdx))
  }

  useEffect(() => {
    const stop = () => setDragging(false)
    window.addEventListener('mouseup', stop)
    return () => window.removeEventListener('mouseup', stop)
  }, [])

  const selectionStats = useMemo(() => {
    let sum = 0
    let count = 0
    selectedCells.forEach((key) => {
      const dash = key.indexOf('-')
      const rowIdx = Number(key.slice(0, dash))
      const colKey = key.slice(dash + 1)
      const row = pagedData[rowIdx]
      if (row) {
        sum += row[colKey]
        count += 1
      }
    })
    return { sum, count, avg: count ? sum / count : 0 }
  }, [selectedCells, pagedData])

  const activeFilterKeys = Object.keys(filters)

  const totalWidth = 44 + COLUMNS.reduce((s, c) => s + c.width, 0)

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 font-sans text-slate-900 select-none">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-teal-700 uppercase mb-1">Merchandising · Yarn Procurement</div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Order Status</h1>
            <p className="text-xs text-slate-500 mt-0.5">Yarn receive / return tracking against spinning · click &amp; drag numeric cells to sum, like Excel</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setWrapText((w) => !w)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md border-2 border-black text-xs font-semibold transition-colors ${
                wrapText ? 'bg-teal-50 text-teal-800' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle wrap text"
            >
              <IconWrap active={wrapText} />
              Wrap Text
            </button>
            {activeFilterKeys.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border-2 border-black bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                <IconX />
                Clear filters ({activeFilterKeys.length})
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterKeys.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activeFilterKeys.map((k) => {
              const col = COLUMNS.find((c) => c.key === k)
              return (
                <span key={k} className="flex items-center gap-1.5 bg-white border-2 border-black rounded-full pl-3 pr-1.5 py-1 text-xs font-medium text-slate-700">
                  {col.label}: {filters[k].size} selected
                  <button onClick={() => clearFilter(k)} className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 hover:bg-rose-200 text-slate-600">
                    <IconX />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Table card */}
        <div className="bg-white border-2 border-black rounded-lg shadow-lg overflow-hidden">
          <div ref={tableWrapRef} className="overflow-x-auto">
            <table
              className="border-collapse table-fixed"
              style={{ width: totalWidth }}
              onMouseLeave={() => setDragging(false)}
            >
              <colgroup>
                <col style={{ width: 44 }} />
                {COLUMNS.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
              </colgroup>

              {/* Header */}
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wide">
                  <th className="border border-black px-2 py-2.5 sticky left-0 z-40 bg-slate-900">
                    <input
                      ref={headerCbRef}
                      type="checkbox"
                      checked={pageAllChecked}
                      onChange={togglePageAll}
                      className="w-3.5 h-3.5 accent-teal-500 cursor-pointer"
                    />
                  </th>
                  {COLUMNS.map((col) => {
                    const isFiltered = !!filters[col.key]
                    return (
                      <th key={col.key} className="relative border border-black px-2 py-2 text-left font-semibold align-top">
                        <div className="flex items-start justify-between gap-1">
                          <button
                            onClick={() => toggleSort(col)}
                            className="flex items-start gap-1 hover:text-teal-300 text-left leading-tight"
                            title={col.label}
                          >
                            <span className="whitespace-normal break-words">{col.label}</span>
                            <IconSort dir={sortConfig.key === col.key ? sortConfig.dir : null} />
                          </button>
                          <button
                            onClick={() => setOpenFilterCol(openFilterCol === col.key ? null : col.key)}
                            className={`shrink-0 p-1 rounded mt-0.5 ${isFiltered ? 'bg-amber-100' : 'hover:bg-slate-700'}`}
                            title={`Filter ${col.label}`}
                          >
                            <IconFilter active={isFiltered} />
                          </button>
                        </div>
                        {openFilterCol === col.key && (
                          <FilterPopover
                            column={col}
                            values={uniqueValues[col.key]}
                            activeSet={filters[col.key]}
                            onApply={(set) => applyFilter(col.key, set)}
                            onClose={() => setOpenFilterCol(null)}
                          />
                        )}
                      </th>
                    )
                  })}
                </tr>
                {/* Grand total row - always reflects ALL data */}
                <tr className="bg-slate-800 text-amber-300 text-xs font-semibold">
                  <td className="border border-black px-2 py-2 sticky left-0 z-40 bg-slate-800 text-white text-xs uppercase tracking-wide">
                    Total (All)
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="border border-black px-2 py-2 text-right">
                      {col.numeric ? fmt(grandTotals[col.key]) : ''}
                    </td>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {pagedData.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="border border-black px-4 py-10 text-center text-slate-400 italic">
                      No rows match the current filters.
                    </td>
                  </tr>
                )}
                {pagedData.map((row, rowIdx) => {
                  const isChecked = checkedRows.has(row.id)
                  return (
                    <tr
                      key={row.id}
                      className={`text-xs ${isChecked ? 'bg-emerald-50' : rowIdx % 2 ? 'bg-slate-50' : 'bg-white'} hover:bg-teal-50/60`}
                    >
                      <td className="border border-black px-2 py-1.5 text-center sticky left-0 z-10 bg-inherit">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRow(row.id)}
                          className="w-3.5 h-3.5 accent-teal-600 cursor-pointer"
                        />
                      </td>
                      {COLUMNS.map((col, colIdx) => {
                        if (col.numeric) {
                          const numColIdx = NUMERIC_KEYS.indexOf(col.key)
                          const key = cellKey(rowIdx, col.key)
                          const isSelected = selectedCells.has(key)
                          let valueColor = 'text-slate-800'
                          if (col.key === 'pendingQty') {
                            valueColor = row.pendingQty > 0 ? 'text-amber-700 font-semibold' : row.pendingQty < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'
                          }
                          return (
                            <td
                              key={col.key}
                              onMouseDown={(e) => onCellMouseDown(rowIdx, numColIdx, e)}
                              onMouseEnter={() => onCellMouseEnter(rowIdx, numColIdx)}
                              className={`border px-2 py-1.5 text-right cursor-cell tabular-nums ${valueColor} ${
                                isSelected ? 'bg-blue-200 border-2 border-blue-600' : 'border-black'
                              }`}
                            >
                              {fmt(row[col.key])}
                            </td>
                          )
                        }
                        const isDate = col.type === 'date'
                        const isSupplier = col.key === 'supplier'
                        return (
                          <td
                            key={col.key}
                            title={!wrapText ? String(row[col.key]) : undefined}
                            className={`border border-black px-2 py-1.5 align-top ${
                              wrapText ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'
                            }`}
                          >
                            {isSupplier ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SUPPLIER_COLORS[row.supplier] }} />
                                {row.supplier}
                              </span>
                            ) : isDate ? (
                              fmtDate(row[col.key])
                            ) : (
                              row[col.key]
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer totals - sum of FILTERED data */}
              <tfoot>
                <tr className="bg-slate-900 text-white text-xs font-semibold sticky bottom-0 z-20">
                  <td className="border border-black px-2 py-2 sticky left-0 z-30 bg-slate-900 text-xs uppercase tracking-wide">
                    Total (Filtered)
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="border border-black px-2 py-2 text-right text-teal-300">
                      {col.numeric ? fmt(filteredTotals[col.key]) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pagination bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{pagedData.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{filteredData.length}</span> records
            {filteredData.length !== DATA.length && <span> (filtered from {DATA.length})</span>}
            {checkedRows.size > 0 && <span> · {checkedRows.size} selected</span>}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              Rows per page
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="border-2 border-black rounded px-1.5 py-1 text-xs bg-white"
              >
                {[5, 8, 10, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded border-2 border-black bg-white disabled:opacity-30 disabled:cursor-not-allowed rotate-90"
              >
                <IconChevron />
              </button>
              <span className="text-xs px-2 font-medium text-slate-700">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded border-2 border-black bg-white disabled:opacity-30 disabled:cursor-not-allowed -rotate-90"
              >
                <IconChevron />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Excel-like selection status bar */}
      {selectionStats.count > 0 && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white rounded-lg border-2 border-black shadow-2xl px-4 py-2.5 flex items-center gap-4 text-xs">
          <span className="text-slate-400">Selected cells: <span className="text-white font-semibold">{selectionStats.count}</span></span>
          <span className="w-px h-4 bg-slate-600" />
          <span className="text-slate-400">Sum: <span className="text-amber-300 font-bold tabular-nums">{fmt(selectionStats.sum)}</span></span>
          <span className="w-px h-4 bg-slate-600" />
          <span className="text-slate-400">Average: <span className="text-teal-300 font-semibold tabular-nums">{fmt(Math.round(selectionStats.avg))}</span></span>
        </div>
      )}
    </div>
  )
}

export default PurchaseOrderStatus