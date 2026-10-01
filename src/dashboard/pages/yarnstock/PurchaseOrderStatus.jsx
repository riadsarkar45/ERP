import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

const IconPen = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  { key: 'authorized', label: 'STATUS', width: 130, type: 'boolean', getDisplay: (item) => (item.authorized ? 'Authorized' : 'Open') },
  { key: 'piNo', label: 'PI NO.', width: 110, type: 'text' },
  { key: 'piDate', label: 'PI DATE', width: 110, type: 'date' },
  { key: 'lcNo', label: 'LC NO.', width: 100, type: 'text' },
  { key: 'po', label: 'PO', width: 100, type: 'text' },
  { key: 'supplierName', label: 'SUPPLIER NAME', width: 170, type: 'text' },
  { key: 'yarnCount', label: 'YARN COUNT', width: 100, type: 'text' },
  { key: 'composition', label: 'COMPOSITION', width: 150, type: 'text' },
  { key: 'poQty', label: 'PO QTY', width: 110, type: 'number', numeric: true },
  { key: 'yarnReceivedFromSpinning', label: 'YARN RECEIVED FROM SPINNING', width: 180, type: 'number', numeric: true },
  { key: 'yarnReturnedToSpinning', label: 'YARN RETURNED TO SPINNING', width: 170, type: 'number', numeric: true },
  { key: 'pendingReceivedQty', label: 'PENDING RECEIVED QTY', width: 150, type: 'number', numeric: true },
  { key: 'remarks', label: 'REMARKS', width: 200, type: 'text' },
];

const NUMERIC_KEYS = COLUMNS.filter((c) => c.numeric).map((c) => c.key);

/* Two leading columns (authorize checkbox + actions) that come before the data columns */
const LEADING_COLS = [
  { key: '__auth', width: 50 },
  { key: '__actions', width: 70 },
];
const ALL_COLS = [...LEADING_COLS, ...COLUMNS];

/* ----------------------------- Frozen (sticky) columns -----------------------------
   Every column from the first one up to and including FROZEN_THROUGH_KEY stays fixed
   on the left while the table scrolls horizontally. */
const FROZEN_THROUGH_KEY = 'supplierName';
const FROZEN_COUNT = ALL_COLS.findIndex((c) => c.key === FROZEN_THROUGH_KEY) + 1;
const LEFT_OFFSETS = ALL_COLS.map((_, i) => ALL_COLS.slice(0, i).reduce((sum, c) => sum + c.width, 0));
const TABLE_MIN_WIDTH = ALL_COLS.reduce((sum, c) => sum + c.width, 0);
const FIRST_NUMERIC_IDX = ALL_COLS.findIndex((c) => c.numeric);
const isFrozen = (i) => i < FROZEN_COUNT;
const isLastFrozen = (i) => i === FROZEN_COUNT - 1;
const FROZEN_EDGE_SHADOW = 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]';
const FOOTER_ROW_H = 44;

/* Fields shown inside the Add / Modify PO modal (generated column-wise) */
const MODAL_FIELDS = [
  { key: 'piNo', label: 'PI No.', type: 'text', required: true },
  { key: 'piDate', label: 'PI Date', type: 'date' },
  { key: 'lcNo', label: 'LC No.', type: 'text' },
  { key: 'po', label: 'PO', type: 'text' },
  { key: 'supplierName', label: 'Supplier Name', type: 'text' },
  { key: 'yarnCount', label: 'Yarn Count', type: 'text' },
  { key: 'composition', label: 'Composition', type: 'text' },
  { key: 'poQty', label: 'PO Qty', type: 'number' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', full: true },
];

/* ----------------------------- Mock Data ----------------------------- */
const BASE_DATA = [
  { id: 1, date: '2026-08-01', piNo: 'PI-1001', piDate: '2026-08-01', lcNo: 'LC-5001', po: 'PO-2001', supplierName: 'ABC Textiles Ltd.', yarnCount: '30s', composition: '100% Cotton Combed', poQty: 5000.00, yarnReceivedFromSpinning: 3500.50, yarnReturnedToSpinning: 150.00, pendingReceivedQty: 1349.50, remarks: 'Regular shipment', authorized: true },
  { id: 2, date: '2026-08-05', piNo: 'PI-1002', piDate: '2026-08-05', lcNo: 'LC-5002', po: 'PO-2002', supplierName: 'XYZ Fabrics Inc.', yarnCount: '40s', composition: '80% Cotton, 20% Polyester', poQty: 7500.00, yarnReceivedFromSpinning: 5000.00, yarnReturnedToSpinning: 200.00, pendingReceivedQty: 2300.00, remarks: 'Urgent order', authorized: false },
];

const emptyRow = (id) => ({
  id, date: '', piNo: '', piDate: '', lcNo: '', po: '', supplierName: '', yarnCount: '', composition: '', poQty: 0, yarnReceivedFromSpinning: 0, yarnReturnedToSpinning: 0, pendingReceivedQty: 0, remarks: '', authorized: false,
});

/* ----------------------------- Helper: today's date ----------------------------- */
const getTodayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/* ----------------------------- Helper: build nested payload -----------------------------
   Groups flat rows by PI NO. into:
   [{ piNo, lcNo, po, piDate, data: [ { ...line item details } ] }]
   - includeAuthorized: add the "authorized" flag to each line item
   - includeQtyFields : add yarnReceivedFromSpinning / yarnReturnedToSpinning / pendingReceivedQty
   The Add/Modify PO modal payload uses both = false (those fields are not in the modal). */
const buildNestedPayload = (rows, { includeAuthorized = true, includeQtyFields = true } = {}) => {
  const groupedMap = new Map();

  rows.forEach((row) => {
    const piNo = String(row.piNo || '');
    const groupKey = piNo.trim() || `TEMP_PI_${row.id}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        piNo: row.piNo,
        lcNo: row.lcNo,
        po: row.po,
        piDate: row.piDate,
        data: [],
      });
    }

    const lineItem = {
      supplierName: row.supplierName,
      yarnCount: row.yarnCount,
      composition: row.composition,
      poQty: Number(row.poQty) || 0,
    };
    if (includeQtyFields) {
      lineItem.yarnReceivedFromSpinning = Number(row.yarnReceivedFromSpinning) || 0;
      lineItem.yarnReturnedToSpinning = Number(row.yarnReturnedToSpinning) || 0;
      lineItem.pendingReceivedQty = Number(row.pendingReceivedQty) || 0;
    }
    lineItem.remarks = row.remarks;
    if (includeAuthorized) lineItem.authorized = row.authorized;

    groupedMap.get(groupKey).data.push(lineItem);
  });

  return Array.from(groupedMap.values());
};

/* ----------------------------- Add / Modify PO Modal ----------------------------- */
function PORecordModal({ mode, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const initialRef = useRef(JSON.stringify(initial));

  const isDirty = JSON.stringify(form) !== initialRef.current;

  // ESC => discard everything & close (clear / refresh)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setForm(initial);
        setError('');
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [initial, onClose]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleDiscard = () => {
    setForm(initial);
    setError('');
    onClose();
  };

  const handleSaveClick = () => {
    if (!String(form.piNo || '').trim()) {
      setError('PI No. is required.');
      return;
    }
    const poQty = Number(form.poQty) || 0;
    const received = Number(form.yarnReceivedFromSpinning) || 0;
    const returned = Number(form.yarnReturnedToSpinning) || 0;

    onSave({
      ...form,
      poQty,
      yarnReceivedFromSpinning: received,
      yarnReturnedToSpinning: returned,
      pendingReceivedQty: poQty - received - returned,
    });
  };

  const inputBase = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'add' ? 'Add New PO' : 'Modify PO'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {mode === 'add' ? 'Fill in the details below to add a new record.' : `Editing ${initial.piNo || 'record'} — change any field and save.`}
            </p>
          </div>
          <button onClick={handleDiscard} className="p-1.5 rounded text-gray-500 hover:bg-gray-100" title="Close (Esc)">
            <IconX />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODAL_FIELDS.map((f) => (
              <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className={inputBase}
                  />
                ) : (
                  <input
                    type={f.type}
                    step={f.type === 'number' ? '0.01' : undefined}
                    min={f.type === 'number' ? '0' : undefined}
                    autoFocus={f.key === 'piNo'}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className={`${inputBase} ${f.type === 'number' ? 'text-right font-mono' : ''}`}
                  />
                )}
              </div>
            ))}
          </div>
          {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <span className="text-xs text-gray-400">Press Esc to discard &amp; close</span>
          <div className="flex items-center gap-3">
            {isDirty && (
              <>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveClick}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <IconSave /> Save
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Filter Popover Component ----------------------------- */
const POPOVER_WIDTH = 224;

function FilterPopover({ column, values, activeSet, anchorRect, onApply, onClose }) {
  const ref = useRef(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(activeSet ? new Set(activeSet) : new Set(values));

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUpward = spaceBelow < 320 && anchorRect.top > 320;
  const left = Math.min(anchorRect.left, window.innerWidth - POPOVER_WIDTH - 8);
  const style = openUpward
    ? { left, bottom: window.innerHeight - anchorRect.top + 4, width: POPOVER_WIDTH }
    : { left, top: anchorRect.bottom + 4, width: POPOVER_WIDTH };

  const visibleValues = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()));
  const allVisibleChecked = visibleValues.length > 0 && visibleValues.every((v) => draft.has(v));

  const toggleSelectAll = () => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) {
        visibleValues.forEach((v) => next.delete(v));
      } else {
        visibleValues.forEach((v) => next.add(v));
      }
      return next;
    });
  };

  const toggleValue = (v) => {
    setDraft((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg text-gray-800 normal-case font-normal text-xs"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-2">
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs outline-none focus:border-blue-500" />
      </div>
      <div className="mx-2 mb-2 border border-gray-200 rounded max-h-56 overflow-y-auto py-1">
        {visibleValues.length === 0 ? (
          <div className="px-3 py-3 text-gray-400 italic">No matches</div>
        ) : (
          <>
            <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none font-semibold border-b border-gray-100" onClick={(e) => { e.preventDefault(); toggleSelectAll(); }}>
              <span className={`w-3.5 h-3.5 border border-gray-400 rounded-sm flex items-center justify-center shrink-0 ${allVisibleChecked ? 'bg-blue-600 border-blue-600' : 'bg-white'}`}>
                {allVisibleChecked && <IconCheck />}
              </span>
              <span>(Select All)</span>
            </label>
            {visibleValues.map((v) => {
              const checked = draft.has(v);
              return (
                <label key={v} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none" onClick={(e) => { e.preventDefault(); toggleValue(v); }}>
                  <span className={`w-3.5 h-3.5 border border-gray-400 rounded-sm flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white'}`}>
                    {checked && <IconCheck />}
                  </span>
                  <span className="truncate">{v}</span>
                </label>
              );
            })}
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 p-2 border-t border-gray-200 bg-gray-50 rounded-b-md">
        <button onClick={onClose} className="px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">Cancel</button>
        <button onClick={() => onApply(draft)} className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">APPLY</button>
      </div>
    </div>,
    document.body
  );
}

/* ----------------------------- Main Component ----------------------------- */
const PurchaseOrderStatus = () => {
  const [allData, setAllData] = useState(BASE_DATA);
  const [searchInput, setSearchInput] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filters, setFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState(null);
  const tableScrollRef = useRef(null);
  const [isDirty, setIsDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [newRowIds, setNewRowIds] = useState(() => new Set());
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  // Add / Modify PO modal state: { mode: 'add' | 'edit', record }
  const [poModal, setPoModal] = useState(null);

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
  const grandTotals = useMemo(() => calculateTotals(allData), [allData]);

  const handleSearch = () => {};
  const handleClear = () => { setSearchInput(''); setSelectedMonth('all'); setFilters({}); };
  const closeFilter = () => { setOpenFilterCol(null); setFilterAnchorRect(null); };

  const applyFilter = (colKey, set) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (set.size === uniqueValues[colKey].length) delete next[colKey];
      else next[colKey] = set;
      return next;
    });
    closeFilter();
  };

  const updateField = (id, key, rawValue) => {
    const col = COLUMNS.find((c) => c.key === key);
    const value = col && col.numeric ? (rawValue === '' ? '' : Number(rawValue)) : rawValue;
    setAllData((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
    setIsDirty(true);
    setSavedFlash(false);
  };

  /* ---------- Add / Modify PO modal handlers ---------- */
  const openAddModal = () => {
    closeFilter();
    setPoModal({ mode: 'add', record: { ...emptyRow(0), piDate: getTodayISO() } });
  };

  const openEditModal = (item) => {
    closeFilter();
    setPoModal({ mode: 'edit', record: { ...item } });
  };

  const closePoModal = () => setPoModal(null);

  const handleModalSave = (data) => {
    let savedRow;

    if (poModal.mode === 'add') {
      const maxId = allData.length > 0 ? Math.max(...allData.map((r) => r.id)) : 0;
      savedRow = { ...data, id: maxId + 1, authorized: false };
      setAllData((prev) => [savedRow, ...prev]);
      setNewRowIds((prev) => { const next = new Set(prev); next.add(savedRow.id); return next; });
    } else {
      // Keep the existing authorization state (it is not editable in the modal)
      const existing = allData.find((r) => r.id === data.id);
      savedRow = { ...data, authorized: existing ? existing.authorized : false };
      setAllData((prev) => prev.map((row) => (row.id === savedRow.id ? { ...row, ...savedRow } : row)));
    }

    // Build + log the payload for this save (only the fields that exist in the modal)
    const modalPayload = buildNestedPayload([savedRow], { includeAuthorized: false, includeQtyFields: false });
    console.log(
      poModal.mode === 'add' ? '🚀 ADD PO PAYLOAD:' : '🚀 MODIFY PO PAYLOAD:',
      modalPayload
    );
    console.log(JSON.stringify(modalPayload, null, 2));

    setIsDirty(true);
    setSavedFlash(false);
    setPoModal(null);
  };

  const handleDeleteRow = (id) => {
    if (!newRowIds.has(id)) return;
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = () => {
    const id = deleteConfirm.id;
    setAllData((prev) => prev.filter((row) => row.id !== id));
    setNewRowIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setIsDirty(true);
    setSavedFlash(false);
    setDeleteConfirm({ isOpen: false, id: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, id: null });
  };

  // Submits ALL table rows as the nested structure
  const handleSave = async () => {
    const submissionPayload = buildNestedPayload(allData, { includeAuthorized: true, includeQtyFields: true });

    console.log('🚀 FUNCTIONAL SUBMISSION PAYLOAD (Nested Structure):', submissionPayload);
    console.log(JSON.stringify(submissionPayload, null, 2));

    // Simulate API network request
    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      setIsDirty(false);
      setSavedFlash(true);
      setNewRowIds(new Set()); // Clear "new" status as they are now considered saved

      alert(`✅ Successfully submitted ${submissionPayload.length} PI group(s) to the database!\nCheck browser console to see the exact nested JSON structure.`);

      setTimeout(() => setSavedFlash(false), 3000);
    } catch (error) {
      console.error('❌ Submission failed:', error);
      alert('Failed to submit data. Please check your connection and try again.');
    }
  };

  /* ---------- Body cell renderer (keeps the same order as the header) ---------- */
  const renderBodyCell = (col, i, item, stripe) => {
    const frozen = isFrozen(i);
    const base = `border-b border-r border-gray-300 ${
      frozen ? `sticky z-10 ${stripe} group-hover:bg-yellow-50` : ''
    } ${isLastFrozen(i) ? FROZEN_EDGE_SHADOW : ''}`;
    const style = frozen ? { left: LEFT_OFFSETS[i] } : undefined;

    if (col.key === '__auth') {
      return (
        <td key={col.key} className={`${base} px-2 py-2 text-center`} style={style}>
          <input
            type="checkbox"
            checked={!!item.authorized}
            onChange={(e) => updateField(item.id, 'authorized', e.target.checked)}
            title={item.authorized ? 'Uncheck to revoke authorization' : 'Check to authorize this PI'}
            className="w-4 h-4 accent-emerald-600 cursor-pointer"
          />
        </td>
      );
    }

    if (col.key === '__actions') {
      const canDelete = newRowIds.has(item.id);
      return (
        <td key={col.key} className={`${base} px-2 py-2 text-center`} style={style}>
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
      );
    }

    if (col.key === 'authorized') {
      return (
        <td key={col.key} className={`${base} px-3 py-2`} style={style}>
          <div className="flex items-center justify-center">
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${item.authorized ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
              title={item.authorized ? 'Goods can be received against this PI.' : "Goods can't be received against this PI until it is authorized."}
            >
              {item.authorized ? 'Authorized' : 'Open'}
            </span>
          </div>
        </td>
      );
    }

    // PI NO. cell: double-click opens the Modify PO modal, pen icon shown
    if (col.key === 'piNo') {
      return (
        <td
          key={col.key}
          className={`${base} p-0 cursor-pointer select-none`}
          style={style}
          onDoubleClick={() => openEditModal(item)}
          title="Double-click to modify this PO"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="truncate text-gray-900">{item.piNo || '-'}</span>
            <span className="shrink-0 text-blue-600"><IconPen /></span>
          </div>
        </td>
      );
    }

    if (col.key === 'pendingReceivedQty') {
      return (
        <td
          key={col.key}
          className={`${base} px-3 py-2 text-right whitespace-nowrap font-mono tabular-nums font-semibold ${item.pendingReceivedQty > 0 ? 'text-red-600' : 'text-green-600'}`}
          style={style}
        >
          {fmt(Number(item.pendingReceivedQty) || 0)}
        </td>
      );
    }

    return (
      <td key={col.key} className={`${base} p-0`} style={style}>
        <span className={`block px-3 py-2 text-gray-900 ${col.numeric ? 'text-right font-mono tabular-nums' : 'truncate'}`}>
          {col.key === 'piDate'
            ? fmtDate(item[col.key])
            : (col.numeric ? fmt(Number(item[col.key]) || 0) : (item[col.key] || '-'))}
        </span>
      </td>
    );
  };

  const footerBottom = 0;
  const footerCellStyle = { bottom: footerBottom, height: FOOTER_ROW_H };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
      <CustomConfirmModal
        isOpen={deleteConfirm.isOpen}
        message="Are you sure you want to remove this newly added row? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* ADD / MODIFY PO MODAL */}
      {poModal && (
        <PORecordModal
          key={`${poModal.mode}-${poModal.record.id}`}
          mode={poModal.mode}
          initial={poModal.record}
          onSave={handleModalSave}
          onClose={closePoModal}
        />
      )}

      {/* QUICK SUMMARY */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-600 rounded-full"></span> Quick Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border-l-4 border-blue-600 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total PO Qty</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(grandTotals.poQty || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-emerald-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Received From Spinning</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(grandTotals.yarnReceivedFromSpinning || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-orange-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Returned To Spinning</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(grandTotals.yarnReturnedToSpinning || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-red-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Pending Received Qty</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(grandTotals.pendingReceivedQty || 0)}</p>
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

          <button
            onClick={openAddModal}
            title="Add a new PO"
            className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
          >
            <IconPlus /> Add PO
          </button>

          {isDirty && (
            <button onClick={handleSave} title="Submit all changes to database" className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5 animate-pulse">
              <IconSave /> Save & Submit
            </button>
          )}
          {savedFlash && (
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
              <IconCheck /> Submitted
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

      {/* TABLE */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div ref={tableScrollRef} onScroll={closeFilter} className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table
            className="text-sm"
            style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: '100%', minWidth: TABLE_MIN_WIDTH }}
          >
            <colgroup>
              {ALL_COLS.map((col, i) => (
                <col key={col.key} style={i === ALL_COLS.length - 1 ? undefined : { width: col.width }} />
              ))}
            </colgroup>

            <thead>
              <tr>
                {ALL_COLS.map((col, i) => {
                  const frozen = isFrozen(i);
                  const thBase = `sticky top-0 ${frozen ? 'z-40' : 'z-30'} border-b border-r border-gray-300 bg-gray-100 ${isLastFrozen(i) ? FROZEN_EDGE_SHADOW : ''}`;
                  const thStyle = frozen ? { left: LEFT_OFFSETS[i] } : undefined;

                  if (col.key === '__auth') {
                    return (
                      <th key={col.key} className={`${thBase} px-2 py-3 text-center font-bold text-gray-700 uppercase text-xs align-top`} style={thStyle} title="Authorization">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mx-auto text-gray-600">
                          <path d="M4 12.5l5.5 5.5L20 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </th>
                    );
                  }

                  if (col.key === '__actions') {
                    return (
                      <th key={col.key} className={`${thBase} px-2 py-3 text-center font-bold text-gray-700 uppercase text-xs align-top`} style={thStyle}>
                        Actions
                      </th>
                    );
                  }

                  const isFiltered = !!filters[col.key];
                  return (
                    <th key={col.key} className={`${thBase} px-2 py-3 text-left font-bold text-gray-700 uppercase text-xs align-top`} style={thStyle}>
                      <div className="flex items-start justify-between gap-1">
                        <span className={`whitespace-normal break-words leading-tight ${col.numeric ? 'text-right w-full' : ''}`}>{col.label}</span>
                        <button
                          onClick={(e) => {
                            if (openFilterCol === col.key) {
                              closeFilter();
                            } else {
                              setFilterAnchorRect(e.currentTarget.getBoundingClientRect());
                              setOpenFilterCol(col.key);
                            }
                          }}
                          className={`shrink-0 p-1 rounded mt-0.5 ${isFiltered ? 'bg-blue-100' : 'hover:bg-gray-200'}`}
                          title={`Filter ${col.label}`}
                        >
                          <IconFilter active={isFiltered} />
                        </button>
                      </div>
                      {openFilterCol === col.key && (
                        <FilterPopover column={col} values={uniqueValues[col.key]} activeSet={filters[col.key]} anchorRect={filterAnchorRect} onApply={(set) => applyFilter(col.key, set)} onClose={closeFilter} />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => {
                  const stripe = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  return (
                    <tr key={item.id} className={`group ${stripe} hover:bg-yellow-50 transition-colors`}>
                      {ALL_COLS.map((col, i) => renderBodyCell(col, i, item, stripe))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={ALL_COLS.length} className="px-6 py-12 text-center text-gray-500 italic bg-white">No records found matching your search or filter criteria.</td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr>
                <td
                  colSpan={FROZEN_COUNT}
                  className={`sticky z-40 px-3 text-right text-sm font-bold text-gray-800 border-t-2 border-r border-b border-gray-400 uppercase tracking-wider bg-gray-100 ${FROZEN_EDGE_SHADOW}`}
                  style={{ left: 0, ...footerCellStyle }}
                >
                  Footer Sub-Total:
                </td>
                {FIRST_NUMERIC_IDX - FROZEN_COUNT > 0 && (
                  <td
                    colSpan={FIRST_NUMERIC_IDX - FROZEN_COUNT}
                    className="sticky z-30 border-t-2 border-r border-b border-gray-400 bg-gray-100"
                    style={footerCellStyle}
                  />
                )}
                {NUMERIC_KEYS.map((key) => (
                  <td
                    key={key}
                    className={`sticky z-30 px-3 text-right text-sm font-bold border-t-2 border-r border-b border-gray-400 whitespace-nowrap font-mono tabular-nums bg-green-50 ${
                      key === 'pendingReceivedQty'
                        ? (filteredTotals.pendingReceivedQty > 0 ? 'text-red-600' : 'text-green-600')
                        : 'text-gray-800'
                    }`}
                    style={footerCellStyle}
                  >
                    {fmt(filteredTotals[key])}
                  </td>
                ))}
                <td
                  className="sticky z-30 border-t-2 border-r border-b border-gray-400 bg-gray-100"
                  style={footerCellStyle}
                />
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