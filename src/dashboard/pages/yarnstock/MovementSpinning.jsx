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

/* ----------------------------- Column definitions ----------------------------- */
const COLUMNS = [
  { key: 'date', label: 'DATE', width: 130, type: 'date' },
  { key: 'challan', label: 'CHALLAN', width: 110, type: 'text' },
  { key: 'piNo', label: 'PI NO', width: 130, type: 'text' },
  { key: 'lcNo', label: 'L/C NO', width: 100, type: 'text' },
  { key: 'supplierName', label: 'SUPPLIER NAME', width: 170, type: 'text' },
  { key: 'yarnCount', label: 'YARN COUNT', width: 110, type: 'text' },
  { key: 'yarnComposition', label: 'YARN COMPOSITION', width: 170, type: 'text' },
  { key: 'yarnReceived', label: 'YARN RECEIVED', width: 140, type: 'text', numeric: true },
  { key: 'yarnReturned', label: 'YARN RETURNED', width: 140, type: 'text', numeric: true },
  { key: 'remarks', label: 'REMARKS', width: 200, type: 'text' },
];

const NUMERIC_COLUMNS = COLUMNS.filter((c) => c.numeric).map((c) => c.key);
const LABEL_COL_SPAN = COLUMNS.findIndex((c) => c.numeric); // columns before the first numeric one
const STORAGE_KEY = 'movementSpinningData_v1';

/* ----------------------------- Frozen (sticky) columns -----------------------------
   Every column from the first one up to and including FROZEN_THROUGH_KEY stays fixed
   on the left while the table scrolls horizontally. */
const FROZEN_THROUGH_KEY = 'supplierName';
const FROZEN_COUNT = COLUMNS.findIndex((c) => c.key === FROZEN_THROUGH_KEY) + 1;
const LEFT_OFFSETS = COLUMNS.map((_, i) => COLUMNS.slice(0, i).reduce((sum, c) => sum + c.width, 0));
const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const isFrozen = (i) => i < FROZEN_COUNT;
const isLastFrozen = (i) => i === FROZEN_COUNT - 1;
const FROZEN_EDGE_SHADOW = 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]';
const FOOTER_ROW_H = 44;

/* Fields shown inside the Add / Modify Challan modal (generated column-wise) */
const MODAL_FIELDS = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'challan', label: 'Challan', type: 'text', required: true },
  { key: 'piNo', label: 'PI No', type: 'text' },
  { key: 'lcNo', label: 'L/C No', type: 'text' },
  { key: 'supplierName', label: 'Supplier Name', type: 'text' },
  { key: 'yarnCount', label: 'Yarn Count', type: 'text' },
  { key: 'yarnComposition', label: 'Yarn Composition', type: 'text' },
  { key: 'yarnReceived', label: 'Yarn Received', type: 'text', numeric: true },
  { key: 'yarnReturned', label: 'Yarn Returned', type: 'text', numeric: true },
  { key: 'remarks', label: 'Remarks', type: 'textarea', full: true },
];

const createEmptyRow = (id) => ({
  id,
  date: '',
  challan: '',
  piNo: '',
  lcNo: '',
  supplierName: '',
  yarnCount: '',
  yarnComposition: '',
  yarnReceived: '',
  yarnReturned: '',
  remarks: '',
});

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

const parseNumeric = (val) => {
  if (val === null || val === undefined) return 0;
  const match = String(val).match(/-?\d+(\.\d+)?/);
  if (!match) return 0;
  const n = parseFloat(match[0]);
  return isNaN(n) ? 0 : n;
};

const formatTotal = (n) => {
  if (!n) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTodayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const loadSavedData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load data from localStorage', e);
  }
  return [createEmptyRow(1), createEmptyRow(2), createEmptyRow(3)];
};

/* ----------------------------- Add / Modify Challan Modal ----------------------------- */
function ChallanRecordModal({ mode, initial, onSave, onClose }) {
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
    if (!String(form.challan || '').trim()) {
      setError('Challan is required.');
      return;
    }
    onSave({ ...form });
  };

  const inputBase = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'add' ? 'Add New Challan' : 'Modify Challan'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {mode === 'add' ? 'Fill in the details below to add a new record.' : `Editing ${initial.challan || 'record'} — change any field and save.`}
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
                    autoFocus={f.key === 'challan'}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className={`${inputBase} ${f.numeric ? 'text-right font-mono' : ''}`}
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

function FilterPopover({ values, activeSet, anchorRect, onApply, onClose }) {
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

  const labelOf = (v) => (v === '' ? '(Blank)' : v);
  const visibleValues = values.filter((v) => labelOf(v).toLowerCase().includes(search.toLowerCase()));
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
                <label key={v === '' ? '__blank__' : v} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none" onClick={(e) => { e.preventDefault(); toggleValue(v); }}>
                  <span className={`w-3.5 h-3.5 border border-gray-400 rounded-sm flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white'}`}>
                    {checked && <IconCheck />}
                  </span>
                  <span className="truncate">{labelOf(v)}</span>
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
const MovementSpinning = () => {
  const initialData = useMemo(() => loadSavedData(), []);

  const [committedData, setCommittedData] = useState(initialData);
  const [draftData, setDraftData] = useState(() => deepCopy(initialData));
  const [isDirty, setIsDirty] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState(null);
  const tableScrollRef = useRef(null);

  // Add / Modify Challan modal state: { mode: 'add' | 'edit', record }
  const [challanModal, setChallanModal] = useState(null);

  const closeFilter = () => { setOpenFilterCol(null); setFilterAnchorRect(null); };

  /* ---------- Unique values per column (for the filter popover) ---------- */
  const uniqueValues = useMemo(() => {
    const map = {};
    COLUMNS.forEach((col) => {
      const set = new Set(draftData.map((row) => String(row[col.key] ?? '')));
      map[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return map;
  }, [draftData]);

  const hasActiveFilter = searchInput.trim() !== '' || Object.keys(filters).length > 0;

  const filteredData = useMemo(() => {
    let result = [...draftData];

    if (searchInput.trim()) {
      const q = searchInput.trim().toLowerCase();
      result = result.filter((row) =>
        COLUMNS.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q))
      );
    }

    Object.entries(filters).forEach(([colKey, allowed]) => {
      if (allowed) {
        result = result.filter((row) => allowed.has(String(row[colKey] ?? '')));
      }
    });

    return result;
  }, [draftData, searchInput, filters]);

  const grandTotals = useMemo(() => {
    const totals = {};
    NUMERIC_COLUMNS.forEach((key) => {
      totals[key] = draftData.reduce((sum, row) => sum + parseNumeric(row[key]), 0);
    });
    return totals;
  }, [draftData]);

  const subTotals = useMemo(() => {
    const totals = {};
    NUMERIC_COLUMNS.forEach((key) => {
      totals[key] = filteredData.reduce((sum, row) => sum + parseNumeric(row[key]), 0);
    });
    return totals;
  }, [filteredData]);

  /* ---------- Filter handlers ---------- */
  const applyFilter = (colKey, set) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (set.size === uniqueValues[colKey].length) delete next[colKey];
      else next[colKey] = set;
      return next;
    });
    closeFilter();
  };

  const handleClear = () => { setSearchInput(''); setFilters({}); };

  /* ---------- Add / Modify Challan modal handlers ---------- */
  const openAddModal = () => {
    closeFilter();
    setChallanModal({ mode: 'add', record: { ...createEmptyRow(0), date: getTodayISO() } });
  };

  const openEditModal = (item) => {
    closeFilter();
    setChallanModal({ mode: 'edit', record: { ...item } });
  };

  const closeChallanModal = () => setChallanModal(null);

  const handleModalSave = (data) => {
    if (challanModal.mode === 'add') {
      // Clear search/filters so the new row is visible in the table
      setSearchInput('');
      setFilters({});
      setDraftData((prev) => {
        const maxId = prev.reduce((max, row) => Math.max(max, row.id || 0), 0);
        return [{ ...data, id: maxId + 1 }, ...prev];
      });
      setTimeout(() => {
        if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
      }, 0);
    } else {
      setDraftData((prev) => prev.map((row) => (row.id === data.id ? { ...row, ...data } : row)));
    }
    setIsDirty(true);
    setChallanModal(null);
  };

  /* ---------- Page-level Save / Discard ---------- */
  const handleSave = () => {
    const newData = deepCopy(draftData);
    setCommittedData(newData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
    }
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setDraftData(deepCopy(committedData));
    setIsDirty(false);
  };

  /* ---------- Footer row (frozen label cell + totals) ---------- */
  const renderFooterRow = (label, totals, bottom, numericBg) => (
    <tr>
      <td
        colSpan={FROZEN_COUNT}
        className={`sticky z-40 px-3 text-right text-sm font-bold text-gray-800 border-t border-r border-b border-gray-400 uppercase tracking-wider bg-gray-100 ${FROZEN_EDGE_SHADOW}`}
        style={{ left: 0, bottom, height: FOOTER_ROW_H }}
      >
        {label}
      </td>
      {LABEL_COL_SPAN - FROZEN_COUNT > 0 && (
        <td
          colSpan={LABEL_COL_SPAN - FROZEN_COUNT}
          className="sticky z-30 border-t border-r border-b border-gray-400 bg-gray-100"
          style={{ bottom, height: FOOTER_ROW_H }}
        />
      )}
      {NUMERIC_COLUMNS.map((key) => (
        <td
          key={key}
          className={`sticky z-30 px-3 text-right text-sm font-bold text-gray-800 border-t border-r border-b border-gray-400 whitespace-nowrap font-mono tabular-nums ${numericBg}`}
          style={{ bottom, height: FOOTER_ROW_H }}
        >
          {formatTotal(totals[key])}
        </td>
      ))}
      <td
        className="sticky z-30 border-t border-r border-b border-gray-400 bg-gray-100"
        style={{ bottom, height: FOOTER_ROW_H }}
      />
    </tr>
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
      {/* ADD / MODIFY CHALLAN MODAL */}
      {challanModal && (
        <ChallanRecordModal
          key={`${challanModal.mode}-${challanModal.record.id}`}
          mode={challanModal.mode}
          initial={challanModal.record}
          onSave={handleModalSave}
          onClose={closeChallanModal}
        />
      )}

      {/* QUICK SUMMARY */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-600 rounded-full"></span> Quick Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border-l-4 border-emerald-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Yarn Received</p>
            <p className="text-2xl font-bold text-gray-900">{formatTotal(grandTotals.yarnReceived)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-orange-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Yarn Returned</p>
            <p className="text-2xl font-bold text-gray-900">{formatTotal(grandTotals.yarnReturned)}</p>
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search across all columns..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-2.5"><IconSearch /></div>
          </div>

          {hasActiveFilter && (
            <button onClick={handleClear} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors border border-gray-300 flex items-center gap-1.5">
              <IconX /> Clear
            </button>
          )}

          <button
            onClick={openAddModal}
            title="Add a new challan"
            className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
          >
            <IconPlus /> Add Challan
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <>
              <span className="text-sm font-medium text-red-600 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-600 rounded-full inline-block"></span> Unsaved Changes
              </span>
              <button
                onClick={handleDiscard}
                title="Discard all unsaved changes"
                className="px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
              >
                <IconX /> Discard
              </button>
              <button
                onClick={handleSave}
                title="Save all changes"
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5 animate-pulse"
              >
                <IconSave /> Save
              </button>
            </>
          )}
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
              {COLUMNS.map((col, i) => (
                <col key={col.key} style={i === COLUMNS.length - 1 ? undefined : { width: col.width }} />
              ))}
            </colgroup>

            <thead>
              <tr>
                {COLUMNS.map((col, i) => {
                  const isFiltered = !!filters[col.key];
                  const frozen = isFrozen(i);
                  return (
                    <th
                      key={col.key}
                      className={`sticky top-0 ${frozen ? 'z-40' : 'z-30'} border-b border-r border-gray-300 px-2 py-3 text-left font-bold text-gray-700 uppercase text-xs align-top bg-gray-100 ${isLastFrozen(i) ? FROZEN_EDGE_SHADOW : ''}`}
                      style={frozen ? { left: LEFT_OFFSETS[i] } : undefined}
                    >
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
                        <FilterPopover
                          values={uniqueValues[col.key]}
                          activeSet={filters[col.key]}
                          anchorRect={filterAnchorRect}
                          onApply={(set) => applyFilter(col.key, set)}
                          onClose={closeFilter}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, rowIndex) => {
                  const stripe = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  return (
                    <tr key={row.id} className={`group ${stripe} hover:bg-yellow-50 transition-colors`}>
                      {COLUMNS.map((col, i) => {
                        const frozen = isFrozen(i);
                        const isPiNo = col.key === 'piNo';
                        const cellClass = `p-0 border-b border-r border-gray-300 ${
                          frozen ? `sticky z-10 ${stripe} group-hover:bg-yellow-50` : ''
                        } ${isLastFrozen(i) ? FROZEN_EDGE_SHADOW : ''} ${isPiNo ? 'cursor-pointer select-none' : ''}`;

                        return (
                          <td
                            key={col.key}
                            className={cellClass}
                            style={frozen ? { left: LEFT_OFFSETS[i] } : undefined}
                            onDoubleClick={isPiNo ? () => openEditModal(row) : undefined}
                            title={isPiNo ? 'Double-click to modify this challan' : undefined}
                          >
                            {isPiNo ? (
                              <div className="flex items-center justify-between gap-2 px-3 py-2">
                                <span className="truncate text-gray-900">{row.piNo || '-'}</span>
                                <span className="shrink-0 text-blue-600"><IconPen /></span>
                              </div>
                            ) : (
                              <span className={`block px-3 py-2 text-gray-900 ${col.numeric ? 'text-right font-mono tabular-nums' : 'truncate'}`}>
                                {col.key === 'date' ? fmtDate(row[col.key]) : (row[col.key] || '-')}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-gray-500 italic bg-white">
                    No records found matching your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              {hasActiveFilter && renderFooterRow('Footer Sub-Total (Filtered):', subTotals, FOOTER_ROW_H, 'bg-amber-50')}
              {renderFooterRow('Grand Total:', grandTotals, 0, 'bg-green-50')}
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-3 text-right text-xs text-gray-500 font-medium">
        Showing {filteredData.length} of {draftData.length} records
      </div>
    </div>
  );
};

export default MovementSpinning;