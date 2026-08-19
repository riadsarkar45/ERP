import React, { useState, useMemo, useEffect } from 'react';

const YarnMovementReport = () => {
  const sampleData = [
    { id: 1, date: '2026-08-01', challanNo: 'CH-001', piNo: 'PI-1001', lcNumber: 'LC-5001', supplierName: 'ABC Spinning Mills', jobNumber: 'JOB-201', order: 'ORD-801', color: 'White', fabricComposition: '100% Cotton', fabricWidth: '60"', yarnCount: '30s', composition: 'Cotton', lot: 'LOT-A1', yarnReceivedQty: 5000.50, yarnReturnQty: 200.25, yarnDeliveryQty: 4800.75, returnReceivedQty: 150.00, from: 'Spinning', to: 'Knitting', remarks: 'Normal' },
    { id: 2, date: '2026-08-05', challanNo: 'CH-002', piNo: 'PI-1002', lcNumber: 'LC-5002', supplierName: 'XYZ Textiles', jobNumber: 'JOB-202', order: 'ORD-802', color: 'Blue', fabricComposition: '80% Cotton 20% Poly', fabricWidth: '58"', yarnCount: '40s', composition: 'Blend', lot: 'LOT-B2', yarnReceivedQty: 3500.00, yarnReturnQty: 100.00, yarnDeliveryQty: 3400.50, returnReceivedQty: 80.25, from: 'Spinning', to: 'Knitting', remarks: 'Urgent' },
    { id: 3, date: '2026-07-10', challanNo: 'CH-003', piNo: 'PI-1003', lcNumber: 'LC-5003', supplierName: 'PQR Yarns', jobNumber: 'JOB-203', order: 'ORD-803', color: 'Red', fabricComposition: '100% Polyester', fabricWidth: '62"', yarnCount: '20s', composition: 'Polyester', lot: 'LOT-C3', yarnReceivedQty: 7200.75, yarnReturnQty: 350.50, yarnDeliveryQty: 6850.00, returnReceivedQty: 300.00, from: 'Spinning', to: 'Knitting', remarks: '' },
    { id: 4, date: '2026-07-20', challanNo: 'CH-004', piNo: 'PI-1004', lcNumber: 'LC-5004', supplierName: 'ABC Spinning Mills', jobNumber: 'JOB-204', order: 'ORD-804', color: 'Green', fabricComposition: '60% Cotton 40% Poly', fabricWidth: '56"', yarnCount: '24s', composition: 'Blend', lot: 'LOT-D4', yarnReceivedQty: 4100.00, yarnReturnQty: 180.00, yarnDeliveryQty: 3920.25, returnReceivedQty: 160.50, from: 'Spinning', to: 'Knitting', remarks: 'Partial' },
    { id: 5, date: '2026-06-15', challanNo: 'CH-005', piNo: 'PI-1005', lcNumber: 'LC-5005', supplierName: 'LMN Fibers', jobNumber: 'JOB-205', order: 'ORD-805', color: 'Yellow', fabricComposition: '100% Cotton', fabricWidth: '64"', yarnCount: '36s', composition: 'Cotton', lot: 'LOT-E5', yarnReceivedQty: 6000.25, yarnReturnQty: 250.00, yarnDeliveryQty: 5750.50, returnReceivedQty: 220.00, from: 'Spinning', to: 'Knitting', remarks: 'Normal' },
    { id: 6, date: '2026-06-28', challanNo: 'CH-006', piNo: 'PI-1006', lcNumber: 'LC-5006', supplierName: 'XYZ Textiles', jobNumber: 'JOB-206', order: 'ORD-806', color: 'Black', fabricComposition: '70% Cotton 30% Poly', fabricWidth: '60"', yarnCount: '28s', composition: 'Blend', lot: 'LOT-F6', yarnReceivedQty: 5500.00, yarnReturnQty: 300.25, yarnDeliveryQty: 5200.00, returnReceivedQty: 280.00, from: 'Spinning', to: 'Knitting', remarks: 'QC Hold' },
  ];

  const columns = [
    { key: 'date', label: 'DATE', type: 'date', width: 110 },
    { key: 'challanNo', label: 'CHALLAN NO.', type: 'text', width: 110 },
    { key: 'piNo', label: 'PI NO', type: 'text', width: 90 },
    { key: 'lcNumber', label: 'LC NUMBER', type: 'text', width: 110 },
    { key: 'supplierName', label: 'SUPPLIER NAME', type: 'text', width: 160 },
    { key: 'jobNumber', label: 'JOB NUMBER', type: 'text', width: 110 },
    { key: 'order', label: 'ORDER', type: 'text', width: 100 },
    { key: 'color', label: 'COLOR', type: 'text', width: 90 },
    { key: 'fabricComposition', label: 'FABRIC COMPOSITION', type: 'text', width: 170 },
    { key: 'fabricWidth', label: 'FABRIC WIDTH', type: 'text', width: 110 },
    { key: 'yarnCount', label: 'YARN COUNT', type: 'text', width: 100 },
    { key: 'composition', label: 'COMPOSITION', type: 'text', width: 120 },
    { key: 'lot', label: 'LOT', type: 'text', width: 90 },
    { key: 'yarnReceivedQty', label: 'YARN RECEIVED QTY (SPINNING)', type: 'numeric', width: 150 },
    { key: 'yarnReturnQty', label: 'YARN RETURN QTY (SPINNING)', type: 'numeric', width: 150 },
    { key: 'yarnDeliveryQty', label: 'YARN DELIVERY QTY (KNITTING)', type: 'numeric', width: 150 },
    { key: 'returnReceivedQty', label: 'RETURN RECEIVED QTY (FROM KNITTING)', type: 'numeric', width: 160 },
    { key: 'from', label: 'FROM', type: 'text', width: 100 },
    { key: 'to', label: 'TO', type: 'text', width: 100 },
    { key: 'remarks', label: 'REMARKS', type: 'text', width: 120 },
  ];

  const numericKeys = ['yarnReceivedQty', 'yarnReturnQty', 'yarnDeliveryQty', 'returnReceivedQty'];
  
  // FIXED ORDER: Spinning first, then Knitting
  const summaryCards = [
    { key: 'yarnReceivedQty', label: 'TOTAL RECEIVED (SPINNING)', color: '#2e7d32' },
    { key: 'yarnReturnQty', label: 'TOTAL RETURN (SPINNING)', color: '#f57c00' },
    { key: 'yarnDeliveryQty', label: 'TOTAL DELIVERY (KNITTING)', color: '#1a73e8' },
    { key: 'returnReceivedQty', label: 'TOTAL RETURN FROM KNITTING', color: '#7b1fa2' },
  ];

  const [wrapText, setWrapText] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [excelFilters, setExcelFilters] = useState({});
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [filterSearchText, setFilterSearchText] = useState('');
  const [tempFilterSelection, setTempFilterSelection] = useState(null);
  const [dropdownCoords, setDropdownCoords] = useState({ x: 0, y: 0 });
  
  const uniqueValues = useMemo(() => {
    const vals = {};
    columns.forEach(col => {
      vals[col.key] = [...new Set(sampleData.map(d => d[col.key]))].sort();
    });
    return vals;
  }, []);

  const filteredData = useMemo(() => {
    return sampleData.filter(row => {
      if (monthFilter) {
        const rowMonth = row.date.substring(0, 7);
        if (rowMonth !== monthFilter) return false;
      }
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const match = columns.some(col =>
          String(row[col.key] || '').toLowerCase().includes(q)
        );
        if (!match) return false;
      }
      for (const key in excelFilters) {
        if (excelFilters[key].size > 0 && !excelFilters[key].has(row[key])) {
          return false;
        }
      }
      return true;
    });
  }, [monthFilter, globalSearch, excelFilters]);

  const subTotals = useMemo(() => {
    const totals = {};
    numericKeys.forEach(k => {
      totals[k] = filteredData.reduce((sum, row) => {
        const val = parseFloat(row[k]) || 0;
        return sum + val;
      }, 0);
    });
    return totals;
  }, [filteredData]);

  const monthOptions = useMemo(() => {
    return [...new Set(sampleData.map(d => d.date.substring(0, 7)))].sort();
  }, []);

  const openExcelFilter = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownCoords({
      x: rect.left,
      y: rect.bottom + window.scrollY + 5
    });
    
    const current = excelFilters[colKey] || new Set(uniqueValues[colKey]);
    setTempFilterSelection(new Set(current));
    setFilterSearchText('');
    setActiveFilterCol(colKey);
  };

  const applyExcelFilter = () => {
    if (activeFilterCol) {
      setExcelFilters(prev => ({ ...prev, [activeFilterCol]: new Set(tempFilterSelection) }));
    }
    setActiveFilterCol(null);
  };

  const cancelExcelFilter = () => {
    setActiveFilterCol(null);
    setTempFilterSelection(null);
  };

  const toggleTempValue = (value) => {
    setTempFilterSelection(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const selectAllTemp = () => {
    if (tempFilterSelection.size === uniqueValues[activeFilterCol].length) {
      setTempFilterSelection(new Set());
    } else {
      setTempFilterSelection(new Set(uniqueValues[activeFilterCol]));
    }
  };

  const clearAllFilters = () => {
    setExcelFilters({});
    setMonthFilter('');
    setGlobalSearch('');
  };

  const FilterIcon = ({ active }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a73e8' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );

  const styles = {
    container: { fontFamily: "'Segoe UI', Tahoma, sans-serif", padding: '24px', background: '#f5f7fa', minHeight: '100vh' },
    title: { fontSize: '26px', fontWeight: 700, color: '#000', marginBottom: '20px' },
    summarySection: { marginBottom: '20px' },
    summaryTitle: { fontSize: '16px', fontWeight: 700, color: '#000', borderLeft: '4px solid #1a73e8', paddingLeft: '10px', marginBottom: '14px' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' },
    summaryCard: (color) => ({
      background: '#fff',
      borderRadius: '6px',
      padding: '18px 22px',
      border: '1px solid #d0d0d0',
      borderLeft: `5px solid ${color}`,
    }),
    summaryLabel: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 700 },
    summaryValue: { fontSize: '26px', fontWeight: 700, color: '#000' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px', background: '#fff', padding: '12px 16px', borderRadius: '6px', border: '1px solid #d0d0d0' },
    toolbarLeft: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 },
    toolbarRight: { display: 'flex', alignItems: 'center', gap: '10px' },
    searchBox: { display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '4px', border: '1px solid #d0d0d0', padding: '6px 12px', flex: 1, maxWidth: '400px' },
    searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', flex: 1, padding: '4px' },
    searchBtn: { background: '#1a73e8', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
    clearBtn: { background: '#fff', color: '#555', border: '1px solid #d0d0d0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
    wrapBtn: (active) => ({
      padding: '8px 16px', borderRadius: '4px', border: '1px solid #d0d0d0', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
      background: active ? '#e8f5e9' : '#fff', color: active ? '#2e7d32' : '#555',
    }),
    monthSelect: { padding: '8px 12px', borderRadius: '4px', border: '1px solid #d0d0d0', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' },
    tableWrapper: { overflowX: 'auto', background: '#fff', borderRadius: '6px', border: '1px solid #d0d0d0', position: 'relative' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '1800px' },
    th: { padding: '10px 6px', fontSize: '11px', fontWeight: 700, color: '#000', textAlign: 'center', position: 'relative', userSelect: 'none', background: '#fff', borderBottom: '2px solid #d0d0d0' },
    thContent: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' },
    thLabel: (wrap) => ({ whiteSpace: wrap ? 'normal' : 'nowrap', lineHeight: '1.3' }),
    filterBtn: (active) => ({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px 4px',
      borderRadius: '3px',
      background: active ? '#e8f0fe' : 'transparent',
      cursor: 'pointer',
      border: 'none',
      marginLeft: '2px',
    }),
    filterDropdown: { 
      position: 'fixed', 
      top: dropdownCoords.y, 
      left: dropdownCoords.x, 
      background: '#fff', 
      border: '1px solid #999', 
      borderRadius: '4px', 
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)', 
      zIndex: 9999, 
      padding: '10px', 
      minWidth: '220px', 
      display: 'flex', 
      flexDirection: 'column',
      maxHeight: '350px',
    },
    filterSearch: { width: '100%', padding: '6px 8px', borderRadius: '3px', border: '1px solid #d0d0d0', fontSize: '12px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' },
    filterList: { overflowY: 'auto', flex: 1, maxHeight: '200px', marginBottom: '8px', border: '1px solid #d0d0d0', padding: '4px' },
    filterItem: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 4px', fontSize: '12px', cursor: 'pointer' },
    filterActions: { display: 'flex', justifyContent: 'flex-end', gap: '6px', borderTop: '1px solid #d0d0d0', paddingTop: '8px', marginTop: '4px' },
    filterBtnOk: { padding: '5px 14px', borderRadius: '3px', border: '1px solid #1a73e8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: '#1a73e8', color: '#fff' },
    filterBtnCancel: { padding: '5px 14px', borderRadius: '3px', border: '1px solid #d0d0d0', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: '#fff', color: '#555' },
    td: { padding: '8px 6px', fontSize: '12px', textAlign: 'center', color: '#333', background: '#fff', borderBottom: '1px solid #e8e8e8' },
    tdNumeric: { fontWeight: 600, color: '#000' },
    footerRow: { background: '#f5f5f5' },
    footerTd: { padding: '10px 6px', fontSize: '12px', fontWeight: 700, textAlign: 'center', borderTop: '2px solid #d0d0d0', color: '#000', background: '#f5f5f5' },
    noData: { textAlign: 'center', padding: '40px', color: '#888', fontSize: '14px' },
    activeFilterDot: { display: 'inline-block', width: '5px', height: '5px', background: '#1a73e8', borderRadius: '50%', marginLeft: '2px' },
    recordCount: { marginTop: '12px', fontSize: '13px', color: '#666', textAlign: 'right', fontWeight: 600 },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9998,
      background: 'transparent',
    },
  };

  const hasActiveFilters = Object.keys(excelFilters).length > 0 || monthFilter || globalSearch;

  useEffect(() => {
    if (activeFilterCol) {
      const handleClick = (e) => {
        if (!e.target.closest('.filter-dropdown-content')) {
          setActiveFilterCol(null);
        }
      };
      setTimeout(() => {
        document.addEventListener('mousedown', handleClick);
      }, 100);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [activeFilterCol]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Yarn Movement Report</h1>

      <div style={styles.summarySection}>
        <div style={styles.summaryTitle}>Quick Summary</div>
        <div style={styles.summaryGrid}>
          {summaryCards.map(card => (
            <div key={card.key} style={styles.summaryCard(card.color)}>
              <div style={styles.summaryLabel}>{card.label}</div>
              <div style={styles.summaryValue}>
                {subTotals[card.key] ? subTotals[card.key].toFixed(2).toLocaleString() : '0.00'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <div style={styles.searchBox}>
            <span style={{ marginRight: '6px', color: '#888' }}>🔍</span>
            <input type="text" placeholder="Search Challan, PI, Supplier, Job, Color..." style={styles.searchInput} value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
          <button style={styles.searchBtn}>Search</button>
          <button style={styles.clearBtn} onClick={clearAllFilters}>Clear</button>
        </div>
        <div style={styles.toolbarRight}>
          <button style={styles.wrapBtn(wrapText)} onClick={() => setWrapText(!wrapText)}>
            {wrapText ? 'Wrap Text ON' : 'Wrap Text OFF'}
          </button>
          <label style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            Month Filter:
            <select style={styles.monthSelect} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
              <option value="">All Months</option>
              {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map(col => {
                const hasFilter = excelFilters[col.key] && excelFilters[col.key].size < uniqueValues[col.key].length;
                return (
                  <th key={col.key} style={{ ...styles.th, width: col.width }}>
                    <div style={styles.thContent}>
                      <span style={styles.thLabel(wrapText)}>{col.label}</span>
                      <button
                        style={styles.filterBtn(hasFilter)}
                        onClick={(e) => openExcelFilter(col.key, e)}
                        title="Filter"
                      >
                        <FilterIcon active={hasFilter} />
                      </button>
                      {hasFilter && <span style={styles.activeFilterDot} />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan={columns.length} style={styles.noData}>No records found for the selected filters.</td></tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {columns.map(col => (
                    <td key={col.key} style={{ ...styles.td, ...(col.type === 'numeric' ? styles.tdNumeric : {}), whiteSpace: wrapText ? 'normal' : 'nowrap' }}>
                      {col.type === 'numeric' ? (parseFloat(row[col.key]) || 0).toFixed(2).toLocaleString() : row[col.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {filteredData.length > 0 && (
            <tfoot>
              <tr style={styles.footerRow}>
                {columns.map(col => (
                  <td key={col.key} style={styles.footerTd}>
                    {col.key === 'date' ? <span style={{ fontWeight: 700, color: '#1a73e8' }}>SUB-TOTAL</span> : 
                     numericKeys.includes(col.key) ? <span style={{ color: '#000', fontSize: '13px' }}>{(subTotals[col.key] || 0).toFixed(2).toLocaleString()}</span> : '-'}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {activeFilterCol && tempFilterSelection && (
        <>
          <div style={styles.overlay} onClick={() => setActiveFilterCol(null)}></div>
          <div className="filter-dropdown-content" style={styles.filterDropdown}>
            <input type="text" placeholder="Search items..." style={styles.filterSearch} value={filterSearchText} onChange={e => setFilterSearchText(e.target.value)} autoFocus />
            <div style={styles.filterList}>
              <label style={styles.filterItem}>
                <input type="checkbox" checked={tempFilterSelection.size === uniqueValues[activeFilterCol].length} onChange={selectAllTemp} />
                <strong>(Select All)</strong>
              </label>
              {uniqueValues[activeFilterCol].filter(v => String(v).toLowerCase().includes(filterSearchText.toLowerCase())).map(v => (
                <label key={v} style={styles.filterItem}>
                  <input type="checkbox" checked={tempFilterSelection.has(v)} onChange={() => toggleTempValue(v)} />
                  <span>{v}</span>
                </label>
              ))}
            </div>
            <div style={styles.filterActions}>
              <button style={styles.filterBtnCancel} onClick={cancelExcelFilter}>Cancel</button>
              <button style={styles.filterBtnOk} onClick={applyExcelFilter}>OK</button>
            </div>
          </div>
        </>
      )}

      <div style={styles.recordCount}>
        Showing <strong>{filteredData.length}</strong> of <strong>{sampleData.length}</strong> records{hasActiveFilters && <span> (filtered)</span>}
      </div>
    </div>
  );
};

export default YarnMovementReport;