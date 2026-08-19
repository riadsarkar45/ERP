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

/* ----------------------------- Column definitions ----------------------------- */
const COLUMNS = [
  { key: 'jobNumber', label: 'JOB NUMBER', width: 100, type: 'text' },
  { key: 'color', label: 'COLOR', width: 90, type: 'text' },
  { key: 'fabricComposition', label: 'FABRIC COMPOSITION', width: 160, type: 'text' },
  { key: 'fabricWidth', label: 'FABRIC WIDTH', width: 100, type: 'text' },
  { key: 'yarnCount', label: 'YARN COUNT', width: 90, type: 'text' },
  { key: 'composition', label: 'COMPOSITION', width: 140, type: 'text' },
  { key: 'lot', label: 'LOT', width: 140, type: 'text' },
  { key: 'workOrderQty', label: 'WORKORDER QTY', width: 120, type: 'number', numeric: true },
  { key: 'yarnDeliveryQty', label: 'YARN DELIVERY QTY (Y/D)', width: 140, type: 'number', numeric: true },
  { key: 'delShortExcess', label: 'DEL. SHORT & EXCESS', width: 130, type: 'number', numeric: true },
  { key: 'yarnReturnQty', label: 'YARN RETURN QTY (Y/D FACTORY)', width: 150, type: 'number', numeric: true },
  { key: 'yarnReceivedGrey', label: 'YARN RECEIVED QTY (GREY)', width: 150, type: 'number', numeric: true },
  { key: 'yarnReceivedFinish', label: 'YARN RECEIVED QTY (FINISH)', width: 160, type: 'number', numeric: true },
  { key: 'stock', label: 'STOCK', width: 90, type: 'number', numeric: true },
  { key: 'remarks', label: 'REMARKS', width: 220, type: 'text' },
];

const NUMERIC_KEYS = COLUMNS.filter((c) => c.numeric).map((c) => c.key);

/* ----------------------------- Mock Data ----------------------------- */
const BASE_DATA = [
  { id: 1, date: '2026-08-01', jobNumber: 'JOB-2001', color: 'Navy Blue', fabricComposition: '100% Cotton Combed Long Text', fabricWidth: '58"', yarnCount: '30s', composition: '100% Cotton', lot: 'LOT-A1-Long', workOrderQty: 2000.00, yarnDeliveryQty: 1500.50, delShortExcess: -499.50, yarnReturnQty: 50.00, yarnReceivedGrey: 1450.50, yarnReceivedFinish: 1400.00, stock: 50.50, remarks: 'Regular shipment with special instructions' },
  { id: 2, date: '2026-08-05', jobNumber: 'JOB-2002', color: 'White', fabricComposition: '80% Cotton, 20% Polyester Blend', fabricWidth: '60"', yarnCount: '40s', composition: '80% Cotton, 20% Poly', lot: 'LOT-B2', workOrderQty: 2500.00, yarnDeliveryQty: 2000.00, delShortExcess: -500.00, yarnReturnQty: 100.00, yarnReceivedGrey: 1900.00, yarnReceivedFinish: 1850.50, stock: 49.50, remarks: 'Urgent order' },
  { id: 3, date: '2026-07-15', jobNumber: 'JOB-2003', color: 'Red', fabricComposition: '100% Polyester', fabricWidth: '56"', yarnCount: '20s', composition: '100% Polyester', lot: 'LOT-C3', workOrderQty: 3500.00, yarnDeliveryQty: 3000.75, delShortExcess: -499.25, yarnReturnQty: 150.25, yarnReceivedGrey: 2850.50, yarnReceivedFinish: 2800.00, stock: 50.50, remarks: 'Monthly batch' },
  { id: 4, date: '2026-08-10', jobNumber: 'JOB-2004', color: 'Green', fabricComposition: '60% Cotton, 40% Linen', fabricWidth: '62"', yarnCount: '24s', composition: '60% Cotton, 40% Linen', lot: 'LOT-D4', workOrderQty: 2000.00, yarnDeliveryQty: 1800.00, delShortExcess: -200.00, yarnReturnQty: 75.00, yarnReceivedGrey: 1725.00, yarnReceivedFinish: 1700.25, stock: 24.75, remarks: 'Special order' },
  { id: 5, date: '2026-07-22', jobNumber: 'JOB-2005', color: 'Yellow', fabricComposition: '100% Silk', fabricWidth: '54"', yarnCount: '60s', composition: '100% Silk', lot: 'LOT-E5', workOrderQty: 600.00, yarnDeliveryQty: 500.00, delShortExcess: -100.00, yarnReturnQty: 25.00, yarnReceivedGrey: 475.00, yarnReceivedFinish: 450.00, stock: 25.00, remarks: 'Premium quality' },
];

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

/* ----------------------------- Main Component ----------------------------- */
const YarnDyedStock = () => {
  const [allData] = useState(BASE_DATA);
  const [searchInput, setSearchInput] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filters, setFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);

  const fmt = (num) => Number.isFinite(num) ? num.toFixed(2) : '0.00';
  const fmtMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-');
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Unique values for header filters
  const uniqueValues = useMemo(() => {
    const map = {};
    COLUMNS.forEach((col) => {
      const set = new Set();
      allData.forEach((row) => set.add(String(row[col.key])));
      map[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return map;
  }, [allData]);

  // Available months
  const availableMonths = useMemo(() => {
    const months = new Set();
    allData.forEach(item => months.add(item.date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [allData]);

  // Filtered Data (Search + Month + Header Filters)
  const filteredData = useMemo(() => {
    return allData.filter(item => {
      if (selectedMonth !== 'all' && !item.date.startsWith(selectedMonth)) return false;
      
      if (searchInput.trim()) {
        const q = searchInput.trim().toLowerCase();
        const hay = [item.jobNumber, item.color, item.lot, item.fabricComposition].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      for (const col of COLUMNS) {
        const active = filters[col.key];
        if (!active) continue;
        if (!active.has(String(item[col.key]))) return false;
      }
      return true;
    });
  }, [allData, selectedMonth, searchInput, filters]);

  // Totals
  const calculateTotals = (data) => {
    return NUMERIC_KEYS.reduce((acc, key) => {
      acc[key] = data.reduce((sum, item) => sum + (item[key] || 0), 0);
      return acc;
    }, {});
  };

  const grandTotals = useMemo(() => calculateTotals(allData), [allData]);
  const filteredTotals = useMemo(() => calculateTotals(filteredData), [filteredData]);

  const handleSearch = () => {}; // Reactive via useMemo
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

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* QUICK SUMMARY - 5 cards */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-600 rounded-full"></span> Quick Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border-l-4 border-blue-600 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Work Order Qty</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.workOrderQty || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-amber-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Delivery (Y/D)</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.yarnDeliveryQty || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-orange-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Return (Y/D)</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.yarnReturnQty || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-teal-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Received (Grey)</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.yarnReceivedGrey || 0)}</p>
          </div>
          <div className="bg-white rounded-lg border-l-4 border-purple-600 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Stock</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(filteredTotals.stock || 0)}</p>
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <input type="text" placeholder="Search Job, Color, Lot..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="absolute left-3 top-2.5"><IconSearch /></div>
          </div>
          <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
            <IconSearch /> Search
          </button>
          <button onClick={handleClear} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors border border-gray-300">Clear</button>
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              {/* Main Header with Filters - NO Header Total Row */}
              <tr>
                {COLUMNS.map((col) => {
                  const isFiltered = !!filters[col.key];
                  return (
                    <th key={col.key} className="relative border border-gray-300 px-2 py-3 text-left font-bold text-gray-700 uppercase text-xs align-top" style={{ minWidth: col.width }}>
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
                filteredData.map((item, index) => (
                  <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                    <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words font-medium">{item.jobNumber}</td>
                    <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words">{item.color}</td>
                    <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words">{item.fabricComposition}</td>
                    <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words">{item.fabricWidth}</td>
                    <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words">{item.yarnCount}</td>
                    <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words">{item.composition}</td>
                    <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words">{item.lot}</td>
                    
                    <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.workOrderQty)}</td>
                    <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnDeliveryQty)}</td>
                    <td className={`px-3 py-2 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums ${item.delShortExcess < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(item.delShortExcess)}</td>
                    <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnReturnQty)}</td>
                    <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnReceivedGrey)}</td>
                    <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnReceivedFinish)}</td>
                    <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums font-bold">{fmt(item.stock)}</td>
                    
                    <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words">{item.remarks}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="15" className="px-6 py-12 text-center text-gray-500 italic bg-white">No records found matching your search or filter criteria.</td>
                </tr>
              )}
            </tbody>

            <tfoot className="bg-gray-100">
              <tr className="border-t-2 border-gray-400">
                <td colSpan="7" className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 uppercase tracking-wider">Footer Sub-Total:</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.workOrderQty)}</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.yarnDeliveryQty)}</td>
                <td className={`px-3 py-3 text-right text-sm font-bold border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50 ${filteredTotals.delShortExcess < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(filteredTotals.delShortExcess)}</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.yarnReturnQty)}</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.yarnReceivedGrey)}</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.yarnReceivedFinish)}</td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(filteredTotals.stock)}</td>
                <td colSpan="1" className="px-3 py-3 border border-gray-300 bg-gray-100"></td>
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

export default YarnDyedStock;