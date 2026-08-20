import React, { useState, useMemo, useRef, useEffect } from 'react';

/* ----------------------------- Icons ----------------------------- */
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
  </svg>
);

const IconFilter = ({ active }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path
      d="M3 4.5h18l-7 8.2V19l-4 2v-8.3L3 4.5z"
      fill={active ? '#2563EB' : 'none'}
      stroke={active ? '#2563EB' : '#94A3B8'}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M4 12.5l5.5 5.5L20 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M4 7h16M9 7V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V7m2 0v13a2 2 0 01-2 2H9a2 2 0 01-2-2V7h10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* ----------------------------- Custom Confirm Modal ----------------------------- */
const CustomConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-600">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm"
          >
            Delete Row
          </button>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------- Column definitions ----------------------------- */
const COLUMNS = [
  {
    key: 'authorized',
    label: 'STATUS',
    width: 160,
    type: 'boolean',
    getDisplay: (item) => (item.authorized ? 'Authorized' : 'Not Authorized'),
  },
  { key: 'piNo', label: 'PI NO.', width: 100, type: 'text' },
  { key: 'piDate', label: 'PI DATE', width: 110, type: 'date' },
  { key: 'lcNo', label: 'LC NO.', width: 110, type: 'text' },
  { key: 'po', label: 'PO', width: 110, type: 'text' },
  { key: 'supplierName', label: 'SUPPLIER NAME', width: 180, type: 'text' },
  { key: 'yarnCount', label: 'YARN COUNT', width: 100, type: 'text' },
  { key: 'composition', label: 'COMPOSITION', width: 150, type: 'text' },
  { key: 'poQty', label: 'PO QTY', width: 110, type: 'number', numeric: true },
  { key: 'yarnReceivedFromSpinning', label: 'YARN RECEIVED FROM SPINNING', width: 180, type: 'number', numeric: true },
  { key: 'yarnReturnedToSpinning', label: 'YARN RETURNED TO SPINNING', width: 170, type: 'number', numeric: true },
  { key: 'pendingReceivedQty', label: 'PENDING RECEIVED QTY', width: 150, type: 'number', numeric: true },
  { key: 'estimatedPiDate', label: 'ESTIMATED PI DATE', width: 130, type: 'date' },
  { key: 'periodTime', label: 'PERIOD TIME', width: 110, type: 'text' },
  { key: 'remarks', label: 'REMARKS', width: 200, type: 'text' },
];

const NUMERIC_KEYS = COLUMNS.filter((c) => c.numeric).map((c) => c.key);

// PI NO. through PO QTY, ESTIMATED PI DATE, and REMARKS are the double-click-to-edit fields.
const EDITABLE_KEYS = ['piNo', 'piDate', 'lcNo', 'po', 'supplierName', 'yarnCount', 'composition', 'poQty', 'estimatedPiDate', 'remarks'];

// Date fields that should default to today's date when starting to edit an empty cell
const DATE_KEYS = ['piDate', 'estimatedPiDate'];

/* ----------------------------- Mock Data ----------------------------- */
const BASE_DATA = [
  { id: 1, date: '2026-08-01', piNo: 'PI-1001', piDate: '2026-08-01', lcNo: 'LC-5001', po: 'PO-2001', supplierName: 'ABC Textiles Ltd. (Long Name Test)', yarnCount: '30s', composition: '100% Cotton Combed', poQty: 5000.00, yarnReceivedFromSpinning: 3500.50, yarnReturnedToSpinning: 150.00, pendingReceivedQty: 1349.50, estimatedPiDate: '2026-09-15', periodTime: '45 Days', remarks: 'Regular shipment with special instructions', authorized: true },
  { id: 2, date: '2026-08-05', piNo: 'PI-1002', piDate: '2026-08-05', lcNo: 'LC-5002', po: 'PO-2002', supplierName: 'XYZ Fabrics Inc.', yarnCount: '40s', composition: '80% Cotton, 20% Polyester Blend', poQty: 7500.00, yarnReceivedFromSpinning: 5000.00, yarnReturnedToSpinning: 200.00, pendingReceivedQty: 2300.00, estimatedPiDate: '2026-09-20', periodTime: '45 Days', remarks: 'Urgent order', authorized: false },
  { id: 3, date: '2026-07-15', piNo: 'PI-1003', piDate: '2026-07-15', lcNo: 'LC-5003', po: 'PO-2003', supplierName: 'Global Yarn Co.', yarnCount: '20s', composition: '100% Polyester', poQty: 10000.00, yarnReceivedFromSpinning: 8500.75, yarnReturnedToSpinning: 300.25, pendingReceivedQty: 1199.00, estimatedPiDate: '2026-08-30', periodTime: '45 Days', remarks: 'Monthly batch', authorized: true },
  { id: 4, date: '2026-08-10', piNo: 'PI-1004', piDate: '2026-08-10', lcNo: 'LC-5004', po: 'PO-2004', supplierName: 'Prime Textiles', yarnCount: '24s', composition: '60% Cotton, 40% Linen', poQty: 6000.00, yarnReceivedFromSpinning: 4200.00, yarnReturnedToSpinning: 125.00, pendingReceivedQty: 1675.00, estimatedPiDate: '2026-09-25', periodTime: '45 Days', remarks: 'Special order', authorized: false },
  { id: 5, date: '2026-07-22', piNo: 'PI-1005', piDate: '2026-07-22', lcNo: 'LC-5005', po: 'PO-2005', supplierName: 'Elite Fabrics', yarnCount: '60s', composition: '100% Silk', poQty: 2000.00, yarnReceivedFromSpinning: 1800.00, yarnReturnedToSpinning: 50.00, pendingReceivedQty: 150.00, estimatedPiDate: '2026-09-05', periodTime: '45 Days', remarks: 'Premium quality', authorized: true },
];

const emptyRow = (id) => ({
  id,
  date: '',
  piNo: '',
  piDate: '',
  lcNo: '',
  po: '',
  supplierName: '',
  yarnCount: '',
  composition: '',
  poQty: 0,
  yarnReceivedFromSpinning: 0,
  yarnReturnedToSpinning: 0,
  pendingReceivedQty: 0,
  estimatedPiDate: '',
  periodTime: '',
  remarks: '',
  authorized: false,
});

/* ----------------------------- Filter Popover Component ----------------------------- */
function FilterPopover({ column, values, activeSet, onApply, onClose }) {
  const ref = useRef(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(activeSet ? new Set(activeSet) : new Set(values));

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const visibleValues = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="absolute z-50 top-full left-0 mt-1 w-60 bg-white border border-gray-300 rounded-md shadow-lg text-gray-800 normal-case font-normal text-xs" onMouseDown={(e) => e.stopPropagation()}>
      <div className="p-2 border-b border-gray-200">
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${column.label}...`} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs outline-none focus:border-blue-500" />
      </div>
      <div className="flex justify-between px-2 py-1.5 border-b border-gray-200 text-blue-600 font-medium">
        <button className="hover:underline" onClick={() => setDraft(new Set(values))}>Select all</button>
        <button className="hover:underline" onClick={() => setDraft(new Set())}>Clear</button>
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {visibleValues.length === 0 && <div className="px-3 py-3 text-gray-400 italic">No matches</div>}
        {visibleValues.map((v) => {
          const checked = draft.has(v);
          return (
            <label key={v} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none">
              <span onClick={(e) => { e.preventDefault(); setDraft((prev) => { const next = new Set(prev); checked ? next.delete(v) : next.add(v); return next; }); }} className={`w-3.5 h-3.5 border border-gray-400 rounded-sm flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white'}`}>
                {checked && <IconCheck />}
              </span>
              <span className="truncate">{v}</span>
            </label>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 p-2 border-t border-gray-200 bg-gray-50 rounded-b-md">
        <button onClick={onClose} className="px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">Cancel</button>
        <button onClick={() => onApply(draft)} className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">OK</button>
      </div>
    </div>
  );
}

/* ----------------------------- Helper: today's date in YYYY-MM-DD ----------------------------- */
const getTodayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/* ----------------------------- Main Component ----------------------------- */
const PurchaseOrderStatus = () => {
  const [allData, setAllData] = useState(BASE_DATA);
  const [searchInput, setSearchInput] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filters, setFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [newRowIds, setNewRowIds] = useState(() => new Set());
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  const fmt = (num) => Number.isFinite(num) ? num.toFixed(2) : '0.00';
  const fmtDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const fmtMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-');
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getColumnValue = (item, col) => (col.getDisplay ? col.getDisplay(item) : String(item[col.key]));

  const uniqueValues = useMemo(() => {
    const map = {};
    COLUMNS.forEach((col) => {
      const set = new Set();
      allData.forEach((row) => set.add(getColumnValue(row, col)));
      map[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return map;
  }, [allData]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    allData.forEach(item => {
      if (item.piDate) months.add(item.piDate.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [allData]);

  const filteredData = useMemo(() => {
    return allData.filter(item => {
      if (selectedMonth !== 'all' && item.piDate && !item.piDate.startsWith(selectedMonth)) return false;

      if (searchInput.trim()) {
        const q = searchInput.trim().toLowerCase();
        const hay = [item.piNo, item.lcNo, item.po, item.supplierName, item.yarnCount, item.composition].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      for (const col of COLUMNS) {
        const active = filters[col.key];
        if (!active) continue;
        if (!active.has(getColumnValue(item, col))) return false;
      }
      return true;
    });
  }, [allData, selectedMonth, searchInput, filters]);

  const calculateTotals = (data) => {
    return NUMERIC_KEYS.reduce((acc, key) => {
      acc[key] = data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
      return acc;
    }, {});
  };

  const filteredTotals = useMemo(() => calculateTotals(filteredData), [filteredData]);

  const handleSearch = () => {};
  const handleClear = () => { setSearchInput(''); setSelectedMonth('all'); setFilters({}); };

  const applyFilter = (colKey, set) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (set.size === uniqueValues[colKey].length) delete next[colKey];
      else next[colKey] = set;
      return next;
    });
    setOpenFilterCol(null);
  };

  const updateField = (id, key, rawValue) => {
    const col = COLUMNS.find((c) => c.key === key);
    const value = col && col.numeric ? (rawValue === '' ? '' : Number(rawValue)) : rawValue;
    setAllData((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
    setIsDirty(true);
    setSavedFlash(false);
  };

  const handleAddRow = () => {
    const nextId = allData.length > 0 ? Math.max(...allData.map((r) => r.id)) + 1 : 1;
    setAllData((prev) => [emptyRow(nextId), ...prev]);
    setNewRowIds((prev) => new Set(prev).add(nextId));
    setIsDirty(true);
    setSavedFlash(false);
  };

  const handleDeleteRow = (id) => {
    if (!newRowIds.has(id)) return;
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = () => {
    const id = deleteConfirm.id;
    setAllData((prev) => prev.filter((row) => row.id !== id));
    setNewRowIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    if (editingCell && editingCell.id === id) setEditingCell(null);
    setIsDirty(true);
    setSavedFlash(false);
    setDeleteConfirm({ isOpen: false, id: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, id: null });
  };

  // When starting to edit a date field that is empty, pre-fill it with today's date
  const startEditing = (id, key) => {
    if (DATE_KEYS.includes(key)) {
      const row = allData.find((r) => r.id === id);
      if (row && !row[key]) {
        const today = getTodayISO();
        setAllData((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: today } : r)));
        setIsDirty(true);
        setSavedFlash(false);
      }
    }
    setEditingCell({ id, key });
  };

  const stopEditing = () => setEditingCell(null);
  const isEditing = (id, key) => editingCell && editingCell.id === id && editingCell.key === key;

  // Shared keydown handler for all editable cells:
  // - Enter: stop editing
  // - Tab: move to the next editable field (to the right) in the same row, wrapping around
  // - Shift+Tab: move to the previous editable field (to the left) in the same row, wrapping around
  const handleCellKeyDown = (e, id, key) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      stopEditing();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = EDITABLE_KEYS.indexOf(key);
      if (currentIndex === -1) return;
      let nextIndex;
      if (e.shiftKey) {
        nextIndex = (currentIndex - 1 + EDITABLE_KEYS.length) % EDITABLE_KEYS.length;
      } else {
        nextIndex = (currentIndex + 1) % EDITABLE_KEYS.length;
      }
      const nextKey = EDITABLE_KEYS[nextIndex];
      // If the next cell is a date field and currently empty, pre-fill it with today's date
      if (DATE_KEYS.includes(nextKey)) {
        const row = allData.find((r) => r.id === id);
        if (row && !row[nextKey]) {
          const today = getTodayISO();
          setAllData((prev) => prev.map((r) => (r.id === id ? { ...r, [nextKey]: today } : r)));
          setIsDirty(true);
          setSavedFlash(false);
        }
      }
      setEditingCell({ id, key: nextKey });
    }
  };

  const handleSave = () => {
    setIsDirty(false);
    setSavedFlash(true);
    setNewRowIds(new Set());
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const TOTAL_COLUMN_COUNT = COLUMNS.length + 2; // +1 for Auth Checkbox, +1 for Actions

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">

      <CustomConfirmModal 
        isOpen={deleteConfirm.isOpen}
        message="Are you sure you want to remove this newly added row? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* QUICK SUMMARY - 4 numeric cards */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-600 rounded-full"></span> Quick Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border-l-4 border-blue-600 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total PO Qty</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.poQty || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-emerald-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Received From Spinning</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.yarnReceivedFromSpinning || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-orange-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Returned To Spinning</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.yarnReturnedToSpinning || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-red-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Pending Received Qty</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.pendingReceivedQty || 0)}</p>
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <input type="text" placeholder="Search PI, LC, PO, Supplier..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="absolute left-3 top-2.5"><IconSearch /></div>
          </div>
          <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
            <IconSearch /> Search
          </button>

          {searchInput.length > 0 && (
            <button onClick={handleClear} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors border border-gray-300 flex items-center gap-1.5">
              <IconX /> Clear
            </button>
          )}

          <button onClick={handleAddRow} title="Add new row" className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
            <IconPlus /> Add Row
          </button>

          {isDirty && (
            <button onClick={handleSave} title="Save changes" className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5 animate-pulse">
              <IconSave /> Save Changes
            </button>
          )}
          {savedFlash && (
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
              <IconCheck /> Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Month Filter:
          </label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm">
            <option value="all">All Months</option>
            {availableMonths.map(month => (<option key={month} value={month}>{fmtMonthLabel(month)}</option>))}
          </select>
        </div>
      </div>

      {/* TABLE - Scrollable container with sticky header/footer */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <tr>
                <th className="border border-gray-300 px-2 py-3 text-center font-bold text-gray-700 uppercase text-xs align-top" style={{ minWidth: 50 }} title="Authorization">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mx-auto text-gray-600">
                    <path d="M4 12.5l5.5 5.5L20 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </th>
                <th className="border border-gray-300 px-2 py-3 text-center font-bold text-gray-700 uppercase text-xs align-top" style={{ minWidth: 70 }}>
                  Actions
                </th>
                {COLUMNS.map((col) => {
                  const isFiltered = !!filters[col.key];
                  return (
                    <th key={col.key} className="relative border border-gray-300 px-2 py-3 text-left font-bold text-gray-700 uppercase text-xs align-top bg-gray-100" style={{ minWidth: col.width }}>
                      <div className="flex items-start justify-between gap-1">
                        <span className={`whitespace-normal break-words leading-tight ${col.numeric ? 'text-right w-full' : ''}`}>{col.label}</span>
                        <button onClick={() => setOpenFilterCol(openFilterCol === col.key ? null : col.key)} className={`shrink-0 p-1 rounded mt-0.5 ${isFiltered ? 'bg-blue-100' : 'hover:bg-gray-200'}`} title={`Filter ${col.label}`}>
                          <IconFilter active={isFiltered} />
                        </button>
                      </div>
                      {openFilterCol === col.key && (
                        <FilterPopover column={col} values={uniqueValues[col.key]} activeSet={filters[col.key]} onApply={(set) => applyFilter(col.key, set)} onClose={() => setOpenFilterCol(null)} />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => {
                  const canDelete = newRowIds.has(item.id);
                  return (
                    <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                      
                      {/* Auth Checkbox Column */}
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="checkbox"
                          checked={!!item.authorized}
                          onChange={(e) => updateField(item.id, 'authorized', e.target.checked)}
                          title={item.authorized ? 'Uncheck to revoke authorization' : 'Check to authorize this PI'}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                      </td>

                      {/* Delete row action */}
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {canDelete ? (
                          <button
                            onClick={() => handleDeleteRow(item.id)}
                            title="Remove this newly added row"
                            className="p-1.5 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <IconTrash />
                          </button>
                        ) : (
                          <span className="text-gray-300 select-none">—</span>
                        )}
                      </td>

                      {/* Authorization status (Text only) */}
                      <td className="px-3 py-2 border border-gray-300">
                        <div className="flex items-center justify-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${item.authorized ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                            title={item.authorized ? 'Goods can be received against this PI.' : "Goods can't be received against this PI until it is authorized."}
                          >
                            {item.authorized ? 'Authorized' : 'Not Authorized'}
                          </span>
                        </div>
                      </td>

                      {/* Editable fields */}
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'piNo')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'piNo') ? (
                          <input
                            autoFocus
                            type="text"
                            value={item.piNo}
                            onChange={(e) => updateField(item.id, 'piNo', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'piNo')}
                            className="w-full h-full px-3 py-2 text-gray-900 font-medium bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 font-medium truncate">{item.piNo || '-'}</span>
                        )}
                      </td>
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'piDate')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'piDate') ? (
                          <input
                            autoFocus
                            type="date"
                            value={item.piDate || getTodayISO()}
                            onChange={(e) => updateField(item.id, 'piDate', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'piDate')}
                            className="w-full h-full px-3 py-2 text-gray-900 bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 whitespace-nowrap">{fmtDate(item.piDate)}</span>
                        )}
                      </td>
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'lcNo')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'lcNo') ? (
                          <input
                            autoFocus
                            type="text"
                            value={item.lcNo}
                            onChange={(e) => updateField(item.id, 'lcNo', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'lcNo')}
                            className="w-full h-full px-3 py-2 text-gray-900 bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 truncate">{item.lcNo || '-'}</span>
                        )}
                      </td>
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'po')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'po') ? (
                          <input
                            autoFocus
                            type="text"
                            value={item.po}
                            onChange={(e) => updateField(item.id, 'po', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'po')}
                            className="w-full h-full px-3 py-2 text-gray-900 bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 truncate">{item.po || '-'}</span>
                        )}
                      </td>
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'supplierName')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'supplierName') ? (
                          <input
                            autoFocus
                            type="text"
                            value={item.supplierName}
                            onChange={(e) => updateField(item.id, 'supplierName', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'supplierName')}
                            className="w-full h-full px-3 py-2 text-gray-900 bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 truncate">{item.supplierName || '-'}</span>
                        )}
                      </td>
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'yarnCount')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'yarnCount') ? (
                          <input
                            autoFocus
                            type="text"
                            value={item.yarnCount}
                            onChange={(e) => updateField(item.id, 'yarnCount', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'yarnCount')}
                            className="w-full h-full px-3 py-2 text-gray-900 bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 truncate">{item.yarnCount || '-'}</span>
                        )}
                      </td>
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'composition')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'composition') ? (
                          <input
                            autoFocus
                            type="text"
                            value={item.composition}
                            onChange={(e) => updateField(item.id, 'composition', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'composition')}
                            className="w-full h-full px-3 py-2 text-gray-900 bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 truncate">{item.composition || '-'}</span>
                        )}
                      </td>
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'poQty')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'poQty') ? (
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            value={item.poQty}
                            onChange={(e) => updateField(item.id, 'poQty', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'poQty')}
                            className="w-full h-full px-3 py-2 text-right text-gray-900 font-mono tabular-nums bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-right text-gray-900 font-mono tabular-nums">{fmt(Number(item.poQty) || 0)}</span>
                        )}
                      </td>

                      {/* Non-editable fields */}
                      <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnReceivedFromSpinning)}</td>
                      <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnReturnedToSpinning)}</td>
                      <td className={`px-3 py-2 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums font-semibold ${item.pendingReceivedQty > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(item.pendingReceivedQty)}</td>

                      {/* Editable Estimated PI Date */}
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'estimatedPiDate')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'estimatedPiDate') ? (
                          <input
                            autoFocus
                            type="date"
                            value={item.estimatedPiDate || getTodayISO()}
                            onChange={(e) => updateField(item.id, 'estimatedPiDate', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'estimatedPiDate')}
                            className="w-full h-full px-3 py-2 text-gray-900 bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 whitespace-nowrap">{fmtDate(item.estimatedPiDate)}</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words">{item.periodTime}</td>

                      {/* Editable Remarks */}
                      <td
                        className="p-0 border border-gray-300 cursor-text"
                        onDoubleClick={() => startEditing(item.id, 'remarks')}
                        title="Double-click to edit"
                      >
                        {isEditing(item.id, 'remarks') ? (
                          <input
                            autoFocus
                            type="text"
                            value={item.remarks}
                            onChange={(e) => updateField(item.id, 'remarks', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => handleCellKeyDown(e, item.id, 'remarks')}
                            className="w-full h-full px-3 py-2 text-gray-900 bg-blue-50 outline-none ring-1 ring-inset ring-blue-400"
                          />
                        ) : (
                          <span className="block px-3 py-2 text-gray-900 break-words">{item.remarks || '-'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={TOTAL_COLUMN_COUNT} className="px-6 py-12 text-center text-gray-500 italic bg-white">No records found matching your search or filter criteria.</td>
                </tr>
              )}
            </tbody>

            <tfoot className="sticky bottom-0 z-20 bg-gray-100 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
              <tr className="border-t-2 border-gray-400">
                <td colSpan="10" className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 uppercase tracking-wider bg-gray-100">Footer Sub-Total:</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.poQty)}</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.yarnReceivedFromSpinning)}</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.yarnReturnedToSpinning)}</td>
                <td className={`px-3 py-3 text-right text-sm font-bold border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50 ${filteredTotals.pendingReceivedQty > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(filteredTotals.pendingReceivedQty)}</td>
                <td colSpan="4" className="px-3 py-3 border border-gray-300 bg-gray-100"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-3 text-right text-xs text-gray-500 font-medium">
        Showing {filteredData.length} of {allData.length} records
      </div>
    </div>
  );
};

export default PurchaseOrderStatus;