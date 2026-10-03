import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChallanRecordModal } from './SpinningDeliveryModal';
import { useFetchData } from '../../../hooks/fetch';

/* ----------------------------- Icons ----------------------------- */
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
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
const LABEL_COL_SPAN = COLUMNS.findIndex((c) => c.numeric); 
const PI_LEVEL_KEYS = ['date', 'challan', 'piNo', 'lcNo', 'supplierName', 'remarks'];

/* ----------------------------- Frozen (sticky) columns ----------------------------- */
const FROZEN_THROUGH_KEY = 'supplierName';
const FROZEN_COUNT = COLUMNS.findIndex((c) => c.key === FROZEN_THROUGH_KEY) + 1;
const LEFT_OFFSETS = COLUMNS.map((_, i) => COLUMNS.slice(0, i).reduce((sum, c) => sum + c.width, 0));
const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const isFrozen = (i) => i < FROZEN_COUNT;
const isLastFrozen = (i) => i === FROZEN_COUNT - 1;
const FROZEN_EDGE_SHADOW = 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]';
const FOOTER_ROW_H = 44;

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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ----------------------------- Flatten Nested API Data ----------------------------- */
const flattenApiData = (apiData) => {
  if (!Array.isArray(apiData)) return [];
  
  return apiData.flatMap(pi => {
    const baseRow = {
      piId: pi.id,
      date: pi.piDate || '',
      challan: pi.challan || pi.poNo || '',
      piNo: pi.piNo || '',
      lcNo: pi.lcNo || '',
      supplierName: pi.supplierName || '',
      remarks: pi.remarks || '',
    };

    if (pi.items && pi.items.length > 0) {
      return pi.items.map(item => ({
        id: item.id,
        ...baseRow,
        yarnCount: item.yarnCount || '',
        yarnComposition: item.composition || '', // Maps API 'composition' to table 'yarnComposition'
        yarnReceived: item.yarnReceived || 0,
        yarnReturned: item.yarnReturned || 0,
      }));
    } else {
      return [{
        id: pi.id,
        ...baseRow,
        yarnCount: '',
        yarnComposition: '',
        yarnReceived: 0,
        yarnReturned: 0,
      }];
    }
  });
};

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
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (!anchorRect) return null;

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUpward = spaceBelow < 320 && anchorRect.top > 320;
  const left = Math.min(anchorRect.left, window.innerWidth - POPOVER_WIDTH - 8);
  const style = openUpward ? { left, bottom: window.innerHeight - anchorRect.top + 4, width: POPOVER_WIDTH } : { left, top: anchorRect.bottom + 4, width: POPOVER_WIDTH };

  const visibleValues = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()));
  const allVisibleChecked = visibleValues.length > 0 && visibleValues.every((v) => draft.has(v));

  const toggleSelectAll = () => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) visibleValues.forEach((v) => next.delete(v));
      else visibleValues.forEach((v) => next.add(v));
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
    <div ref={ref} className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg text-gray-800 normal-case font-normal text-xs" style={style} onMouseDown={(e) => e.stopPropagation()}>
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
const MovementSpinning = () => {
  // Strictly API-driven state. No static data or localStorage.
  const [committedData, setCommittedData] = useState([]);
  const [draftData, setDraftData] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState(null);
  const tableScrollRef = useRef(null);
  const { fetchData, error, loading } = useFetchData();
  const [piNo, setPiNo] = useState(null);
  const [challanModal, setChallanModal] = useState(null);

  const closeFilter = () => { setOpenFilterCol(null); setFilterAnchorRect(null); };

  /* ---------- Fetch Real Data on Mount ---------- */
  useEffect(() => {
    fetchData('/api/yarn-purchase-data')
      .then((res) => {
        const dataArray = res?.data ? res.data : res;
        const flattened = flattenApiData(dataArray);
        setCommittedData(flattened);
        setDraftData(flattened);
      })
      .catch((err) => {
        console.error('Error fetching yarn purchase data:', err);
      });
  }, [fetchData]);

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

  /* ---------- Filtered Data (MUST BE BEFORE groupedData) ---------- */
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

  /* ---------- Group data by PI No. for rowSpan rendering ---------- */
  const groupedData = useMemo(() => {
    const groups = new Map();
    filteredData.forEach(item => {
      if (!groups.has(item.piNo)) {
        groups.set(item.piNo, []);
      }
      groups.get(item.piNo).push(item);
    });
    return Array.from(groups.values());
  }, [filteredData]);

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
  const openAddModal = (piNo) => {
    setPiNo(piNo);
    closeFilter();
    setChallanModal({ 
      mode: 'add', 
      record: { 
        id: Date.now(), 
        date: new Date().toISOString().split('T')[0], 
        challan: '', piNo: piNo, lcNo: '', supplierName: '', 
        yarnCount: '', yarnComposition: '', yarnReceived: 0, yarnReturned: 0, remarks: '' 
      } 
    });
  };

  const openEditModal = (item) => {
    closeFilter();
    setChallanModal({ mode: 'edit', record: { ...item } });
  };

  const closeChallanModal = () => setChallanModal(null);

  const handleModalSave = (data) => {
    if (challanModal.mode === 'add') {
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
    setCommittedData(draftData);
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setDraftData(committedData);
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

  if (loading && draftData.length === 0) {
    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading spinning movement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
      {challanModal && (
        <ChallanRecordModal
          key={`${challanModal.mode}-${challanModal.record.id}`}
          mode={challanModal.mode}
          initial={challanModal.record}
          onSave={handleModalSave}
          onClose={closeChallanModal}
          piNo={piNo}
        />
      )}

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
              {groupedData.length > 0 ? groupedData.map((group, groupIndex) => {
                const stripe = groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                return group.map((row, rowIndex) => {
                  const isFirstInGroup = rowIndex === 0;
                  const rowSpan = group.length;

                  return (
                    <tr key={row.id} className={`group ${stripe} hover:bg-yellow-50 transition-colors`}>
                      {COLUMNS.map((col, i) => {
                        const frozen = isFrozen(i);
                        const isPiLevel = PI_LEVEL_KEYS.includes(col.key);
                        
                        if (isPiLevel && !isFirstInGroup) {
                          return null;
                        }

                        const isPiNo = col.key === 'piNo';
                        const cellClass = `p-0 border-b border-r border-gray-300 ${frozen ? `sticky z-10 ${stripe} group-hover:bg-yellow-50` : ''
                          } ${isLastFrozen(i) ? FROZEN_EDGE_SHADOW : ''} ${isPiNo ? 'cursor-pointer select-none' : ''}`;
                        
                        const alignAttr = isPiLevel && rowSpan > 1 ? { className: `${cellClass} align-middle` } : { className: cellClass };
                        const rowSpanAttr = (isPiLevel && rowSpan > 1) ? { rowSpan } : {};

                        return (
                          <td
                            key={col.key}
                            {...alignAttr}
                            style={frozen ? { left: LEFT_OFFSETS[i] } : undefined}
                            {...rowSpanAttr}
                            onDoubleClick={isPiNo ? () => openEditModal(row) : undefined}
                            title={isPiNo ? 'Double-click to modify this challan' : undefined}
                          >
                            {isPiNo ? (
                              <div className="flex items-center justify-between gap-2 px-3 py-2">
                                <span className="truncate text-gray-900">{row.piNo || '-'}</span>
                                <span onClick={() => openAddModal(row.piNo)} className="shrink-0 text-blue-600"><IconPen /></span>
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
                });
              }) : (
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