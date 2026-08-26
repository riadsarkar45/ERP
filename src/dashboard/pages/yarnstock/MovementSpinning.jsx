import React, { useState, useMemo, useRef, useEffect } from 'react';

const COLUMNS = [
  { key: 'date', label: 'DATE' },
  { key: 'challan', label: 'CHALLAN' },
  { key: 'piNo', label: 'PI NO' },
  { key: 'lcNo', label: 'L/C NO' },
  { key: 'supplierName', label: 'SUPPLIER NAME' },
  { key: 'yarnCount', label: 'YARN COUNT' },
  { key: 'yarnComposition', label: 'YARN COMPOSITION' },
  { key: 'yarnReceived', label: 'YARN RECEIVED' },
  { key: 'yarnReturned', label: 'YARN RETURNED' },
  { key: 'remarks', label: 'REMARKS' },
];

const NUMERIC_COLUMNS = ['yarnReceived', 'yarnReturned'];
const STORAGE_KEY = 'movementSpinningData_v1';

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
  if (n === 0) return '0';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const loadSavedData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load data from localStorage", e);
  }
  return [createEmptyRow(1), createEmptyRow(2), createEmptyRow(3)];
};

const MovementSpinning = () => {
  const initialData = useMemo(() => loadSavedData(), []);
  
  const [committedData, setCommittedData] = useState(initialData);
  const [draftData, setDraftData] = useState(() => deepCopy(initialData));
  const [isDirty, setIsDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [filterSearch, setFilterSearch] = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const [tempFilters, setTempFilters] = useState({});
  
  const [nextId, setNextId] = useState(() => {
    const maxId = initialData.reduce((max, row) => Math.max(max, row.id || 0), 0);
    return maxId + 1;
  });
  
  const filterRef = useRef(null);
  const filterButtonRefs = useRef({});
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setOpenFilter(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenFilter(null);
        if (document.activeElement && document.activeElement.tagName === 'INPUT') {
          document.activeElement.blur();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (openFilter && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 50);
    }
  }, [openFilter]);

  const handleCellChange = (rowId, colKey, value) => {
    setDraftData((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [colKey]: value } : row))
    );
    setIsDirty(true);
  };

  const handleAddRow = () => {
    const newRow = createEmptyRow(nextId);
    setDraftData((prev) => [...prev, newRow]);
    setNextId((prev) => prev + 1);
    setIsDirty(true);
  };

  const handleSave = () => {
    const newData = deepCopy(draftData);
    setCommittedData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setDraftData(deepCopy(committedData));
    setIsDirty(false);
  };

  const toggleFilter = (colKey, e) => {
    e.stopPropagation();
    if (openFilter === colKey) {
      setOpenFilter(null);
    } else {
      setTempFilters({ ...columnFilters });
      setOpenFilter(colKey);
    }
  };

  const applyColumnFilter = (colKey, selectedValues) => {
    setTempFilters((prev) => {
      const next = { ...prev };
      if (selectedValues.length === 0) {
        delete next[colKey];
      } else {
        next[colKey] = selectedValues;
      }
      return next;
    });
  };

  const handleApplyFilter = () => {
    setColumnFilters(tempFilters);
    setOpenFilter(null);
  };

  const handleCancelFilter = () => {
    setOpenFilter(null);
  };

  const handleClearColumnFilter = () => {
    setTempFilters((prev) => {
      const next = { ...prev };
      delete next[openFilter];
      return next;
    });
  };

  const uniqueValues = useMemo(() => {
    const map = {};
    COLUMNS.forEach((col) => {
      const vals = new Set(committedData.map((row) => String(row[col.key] || '')));
      map[col.key] = Array.from(vals).sort((a, b) => a.localeCompare(b));
    });
    return map;
  }, [committedData]);

  const hasActiveFilter = searchQuery.trim() !== '' || Object.keys(columnFilters).length > 0;

  const filteredData = useMemo(() => {
    let result = [...draftData];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        COLUMNS.some((col) => String(row[col.key] || '').toLowerCase().includes(q))
      );
    }

    Object.entries(columnFilters).forEach(([colKey, allowed]) => {
      if (allowed && allowed.length > 0) {
        result = result.filter((row) => allowed.includes(String(row[colKey] || '')));
      }
    });

    return result;
  }, [draftData, searchQuery, columnFilters]);

  const getFilterCount = (colKey) => columnFilters[colKey]?.length || 0;

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

  const cellRefs = useRef({});

  const registerCellRef = (rowIndex, colIndex) => (el) => {
    cellRefs.current[`${rowIndex}-${colIndex}`] = el;
  };

  const focusCell = (rowIndex, colIndex) => {
    if (rowIndex < 0 || rowIndex >= filteredData.length) return;
    if (colIndex < 0 || colIndex >= COLUMNS.length) return;
    const el = cellRefs.current[`${rowIndex}-${colIndex}`];
    if (el) {
      el.focus();
      if (el.type !== 'date') {
        el.select();
      }
    }
  };

  const handleCellKeyDown = (e, rowIndex, colIndex) => {
    const input = e.target;
    const isDateInput = input.type === 'date';

    switch (e.key) {
      case 'Tab': {
        e.preventDefault();
        let nextRow = rowIndex;
        let nextCol = colIndex + (e.shiftKey ? -1 : 1);
        if (nextCol > COLUMNS.length - 1) {
          nextCol = 0;
          nextRow += 1;
        } else if (nextCol < 0) {
          nextCol = COLUMNS.length - 1;
          nextRow -= 1;
        }
        focusCell(nextRow, nextCol);
        break;
      }
      case 'ArrowRight': {
        if (!isDateInput) {
          const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
          if (atEnd) {
            e.preventDefault();
            focusCell(rowIndex, colIndex + 1);
          }
        }
        break;
      }
      case 'ArrowLeft': {
        if (!isDateInput) {
          const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
          if (atStart) {
            e.preventDefault();
            focusCell(rowIndex, colIndex - 1);
          }
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        focusCell(rowIndex - 1, colIndex);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        focusCell(rowIndex + 1, colIndex);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        focusCell(rowIndex + 1, colIndex);
        break;
      }
      default:
        break;
    }
  };

  const toggleFilterValue = (colKey, val, currentFilters) => {
    const current = new Set(currentFilters[colKey] || []);
    if (current.has(val)) {
      current.delete(val);
    } else {
      current.add(val);
    }
    applyColumnFilter(colKey, Array.from(current));
  };

  const toggleSelectAll = (colKey, visibleValues, currentFilters) => {
    const current = new Set(currentFilters[colKey] || []);
    const allVisibleSelected = visibleValues.every((v) => current.has(v));
    if (allVisibleSelected) {
      visibleValues.forEach((v) => current.delete(v));
    } else {
      visibleValues.forEach((v) => current.add(v));
    }
    applyColumnFilter(colKey, Array.from(current));
  };

  const getFilterDropdownStyle = (colKey) => {
    const button = filterButtonRefs.current[colKey];
    if (!button) return { top: '0px', left: '0px' };
    
    const rect = button.getBoundingClientRect();
    const dropdownWidth = 280;
    
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = window.innerWidth - dropdownWidth - 10;
    }
    if (left < 10) left = 10;
    
    return {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${left}px`,
      width: `${dropdownWidth}px`,
      zIndex: 99999,
    };
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <style>{`
        .ms-container { max-width: 100%; }
        
        .ms-table-container {
          max-height: 65vh;
          overflow-y: auto;
          overflow-x: auto;
          border: 1px solid #d4d4d4;
          border-radius: 4px;
          position: relative;
        }
        .ms-table { 
          border-collapse: collapse; 
          width: 100%; 
          background: white; 
          font-size: 12px; 
          table-layout: auto;
        }
        .ms-table th { 
          position: sticky; 
          top: 0; 
          z-index: 50; 
          background: #f8f9fa; 
          font-weight: 600; 
          color: #333; 
          white-space: nowrap;
          min-width: 120px;
          box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1);
        }
        .ms-table td { 
          background: #fff; 
          position: relative; 
          z-index: 1; 
          white-space: nowrap;
        }
        .ms-table th, .ms-table td { border: 1px solid #d4d4d4; padding: 4px 6px; }
        .ms-table tr:hover td { background-color: #f0f8ff; }
        
        .ms-table td input { 
          border: 1px solid transparent; 
          outline: none; 
          width: 100%; 
          min-width: 100px;
          font-size: 12px; 
          background: transparent; 
          font-family: inherit; 
          padding: 2px; 
          box-sizing: border-box;
        }
        .ms-table td input:focus { border-color: #217346; background: #fff; box-shadow: inset 0 0 0 1px #217346; }
        .ms-table td input[type="date"] { cursor: pointer; }
        .ms-table td input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; }
        
        .ms-table tfoot td { background: #f8f9fa; font-weight: 700; color: #1e1e1e; white-space: nowrap; }
        .ms-table tfoot tr.subtotal-row td { background: #fff6e5; color: #8a5a00; }
        
        .filter-btn-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .filter-btn { 
          cursor: pointer; 
          margin-left: 4px; 
          color: #666; 
          font-size: 9px; 
          display: inline-block; 
          width: 18px; 
          height: 18px;
          text-align: center; 
          border-radius: 3px;
          line-height: 18px;
          background: #e8e8e8;
          transition: all 0.2s;
          user-select: none;
        }
        .filter-btn:hover { 
          background: #d0d0d0; 
          color: #000; 
        }
        .filter-btn.active { 
          color: white; 
          font-weight: bold;
          background: #0078d4;
        }
        .filter-badge {
          position: absolute;
          top: -6px;
          right: -8px;
          background: #d83b01;
          color: white;
          font-size: 9px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .filter-dropdown { 
          position: fixed;
          background: white; 
          border: 1px solid #d4d4d4; 
          box-shadow: 0 8px 24px rgba(0,0,0,0.18); 
          z-index: 99999; 
          width: 280px; 
          border-radius: 6px; 
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
        
        .filter-search-box {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 12px;
          border: none;
          border-bottom: 1px solid #d4d4d4;
          font-size: 13px;
          font-family: inherit;
          outline: none;
        }
        .filter-search-box:focus {
          border-bottom-color: #217346;
        }
        
        .filter-items-container {
          padding: 4px 0;
          max-height: 280px;
          overflow-y: auto;
          flex: 1;
        }
        
        .filter-item { 
          display: flex; 
          align-items: center; 
          padding: 5px 12px; 
          cursor: pointer;
        }
        .filter-item:hover { 
          background: #e5f3ff; 
        }
        .filter-item input { 
          margin-right: 8px; 
          cursor: pointer;
          width: 16px;
          height: 16px;
          pointer-events: none;
          flex-shrink: 0;
        }
        .filter-item span { 
          font-size: 13px; 
          color: #333; 
          word-break: break-all;
        }
        
        .filter-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-top: 1px solid #d4d4d4;
          background: #fafafa;
          flex-shrink: 0;
        }
        
        .btn-filter { 
          padding: 5px 14px; 
          border: 1px solid #d4d4d4; 
          background: white; 
          cursor: pointer; 
          font-size: 12px; 
          border-radius: 3px; 
          font-family: inherit;
          font-weight: 500;
          transition: all 0.15s;
        }
        .btn-filter:hover { 
          background: #f0f0f0; 
          border-color: #bbb;
        }
        .btn-apply { 
          background: #217346; 
          color: white; 
          border-color: #217346; 
        }
        .btn-apply:hover { 
          background: #1e663d; 
        }
        .btn-clear {
          background: transparent;
          border-color: transparent;
          color: #c00000;
        }
        .btn-clear:hover {
          background: #fde7e9;
          border-color: #ffc2c2;
        }
        
        .btn { padding: 5px 14px; border: 1px solid #ccc; background: white; cursor: pointer; font-size: 12px; border-radius: 2px; font-family: inherit; }
        .btn:hover { background: #f5f5f5; }
        .btn-primary { background: #217346; color: white; border-color: #217346; }
        .btn-primary:hover { background: #1e663d; }
        .btn-danger { background: #c00000; color: white; border-color: #c00000; }
        .btn-danger:hover { background: #a00000; }
        .btn-add { background: #217346; color: white; border: none; padding: 7px 16px; cursor: pointer; font-size: 13px; border-radius: 3px; font-weight: 600; font-family: inherit; }
        .btn-add:hover { background: #1e663d; }
        .search-input { padding: 7px 12px; border: 1px solid #ccc; border-radius: 3px; width: 280px; font-size: 13px; outline: none; font-family: inherit; }
        .search-input:focus { border-color: #217346; }
        .dirty-badge { color: #c00000; font-weight: 600; margin-left: 10px; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
        
        .control-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px; }
        .left-controls { display: flex; align-items: center; gap: 10px; }
        .right-controls { display: flex; align-items: center; gap: 10px; }
        
        .summary-bar { display: flex; gap: 16px; align-items: stretch; background: transparent; border: none; padding: 0; margin-bottom: 16px; flex-wrap: wrap; }
        .summary-card { display: flex; align-items: center; gap: 14px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px 18px; flex: 1; min-width: 200px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: all 0.2s ease; }
        .summary-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); border-color: #217346; }
        .summary-icon { font-size: 24px; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; background: #e8f5e9; border-radius: 8px; color: #217346; }
        .summary-content { display: flex; flex-direction: column; }
        .summary-label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; }
        .summary-value { font-weight: 700; color: #1e1e1e; font-size: 18px; margin-top: 2px; }
      `}</style>

      <div className="ms-container">
        <div className="summary-bar">
          <div className="summary-card">
            <div className="summary-icon">📥</div>
            <div className="summary-content">
              <span className="summary-label">Yarn Received</span>
              <span className="summary-value">{formatTotal(grandTotals.yarnReceived)}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">🔄</div>
            <div className="summary-content">
              <span className="summary-label">Yarn Returned</span>
              <span className="summary-value">{formatTotal(grandTotals.yarnReturned)}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">📋</div>
            <div className="summary-content">
              <span className="summary-label">Total Rows</span>
              <span className="summary-value">{draftData.length}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search across all columns..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="btn" onClick={() => setSearchQuery('')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span>✕</span> Clear
            </button>
          )}
          {isDirty && (
            <span className="dirty-badge">
              <span style={{ width: 8, height: 8, background: '#c00000', borderRadius: '50%', display: 'inline-block' }}></span>
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="control-bar">
          <div className="left-controls">
            <button className="btn-add" onClick={handleAddRow}>+ Add Row</button>
          </div>
          <div className="right-controls">
            {isDirty && (
              <>
                <button className="btn btn-primary" onClick={handleSave}>💾 Save</button>
                <button className="btn btn-danger" onClick={handleDiscard}>✕ Discard</button>
              </>
            )}
          </div>
        </div>

        <div className="ms-table-container">
          <table className="ms-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => {
                  const filterText = filterSearch[col.key] || '';
                  const currentFilters = openFilter === col.key ? tempFilters : columnFilters;
                  const visibleValues = uniqueValues[col.key].filter((val) =>
                    val.toLowerCase().includes(filterText.toLowerCase())
                  );
                  const filterCount = getFilterCount(col.key);
                  
                  return (
                    <th key={col.key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                        <span>{col.label}</span>
                        <div className="filter-btn-wrapper">
                          <span
                            ref={(el) => {
                              if (el) filterButtonRefs.current[col.key] = el;
                            }}
                            className={`filter-btn ${filterCount > 0 ? 'active' : ''}`}
                            onClick={(e) => toggleFilter(col.key, e)}
                            title={filterCount > 0 ? `${filterCount} filter(s) active` : "Filter"}
                          >
                            ▼
                          </span>
                          {filterCount > 0 && (
                            <span className="filter-badge">{filterCount}</span>
                          )}
                        </div>
                      </div>
                      
                      {openFilter === col.key && (
                        <div 
                          className="filter-dropdown" 
                          ref={filterRef}
                          style={getFilterDropdownStyle(col.key)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={searchInputRef}
                            type="text"
                            className="filter-search-box"
                            placeholder="Search items..."
                            value={filterText}
                            onChange={(e) =>
                              setFilterSearch((prev) => ({ ...prev, [col.key]: e.target.value }))
                            }
                          />
                          
                          <div className="filter-items-container">
                            <div 
                              className="filter-item"
                              onClick={() => toggleSelectAll(col.key, visibleValues, currentFilters)}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  visibleValues.length > 0 &&
                                  visibleValues.every((v) => (currentFilters[col.key] || []).includes(v))
                                }
                                readOnly
                              />
                              <span style={{ fontWeight: 600 }}>(Select All)</span>
                            </div>
                            {visibleValues.map((val) => (
                              <div 
                                key={val} 
                                className="filter-item"
                                onClick={() => toggleFilterValue(col.key, val, currentFilters)}
                              >
                                <input
                                  type="checkbox"
                                  checked={(currentFilters[col.key] || []).includes(val)}
                                  readOnly
                                />
                                <span>{val === '' ? '(Blank)' : val}</span>
                              </div>
                            ))}
                            {visibleValues.length === 0 && (
                              <div style={{ fontSize: 12, color: '#999', padding: '12px', textAlign: 'center' }}>No matches found</div>
                            )}
                          </div>
                          
                          <div className="filter-footer">
                            <button 
                              className="btn-filter btn-clear" 
                              onClick={handleClearColumnFilter}
                              disabled={!(currentFilters[col.key] && currentFilters[col.key].length > 0)}
                              style={{ opacity: (currentFilters[col.key] && currentFilters[col.key].length > 0) ? 1 : 0.4 }}
                            >
                              Clear Filter
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn-filter" onClick={handleCancelFilter}>Cancel</button>
                              <button className="btn-filter btn-apply" onClick={handleApplyFilter}>OK</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    No matching records found
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIndex) => (
                  <tr key={row.id}>
                    {COLUMNS.map((col, colIndex) => {
                      const isDate = col.key === 'date';
                      return (
                        <td key={col.key}>
                          <input
                            type={isDate ? 'date' : 'text'}
                            ref={registerCellRef(rowIndex, colIndex)}
                            value={row[col.key] || ''}
                            onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                            style={isDate ? { cursor: 'pointer' } : {}}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {hasActiveFilter && (
                <tr className="subtotal-row">
                  {COLUMNS.map((col, idx) => (
                    <td key={col.key}>
                      {idx === 0
                        ? 'SUBTOTAL (Filtered)'
                        : NUMERIC_COLUMNS.includes(col.key)
                        ? formatTotal(subTotals[col.key])
                        : ''}
                    </td>
                  ))}
                </tr>
              )}
              <tr>
                {COLUMNS.map((col, idx) => (
                  <td key={col.key}>
                    {idx === 0
                      ? 'GRAND TOTAL'
                      : NUMERIC_COLUMNS.includes(col.key)
                      ? formatTotal(grandTotals[col.key])
                      : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
          Showing {filteredData.length} of {draftData.length} rows
        </div>
      </div>
    </div>
  );
};

export default MovementSpinning;