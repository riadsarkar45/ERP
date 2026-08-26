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

const MovementSpinning = () => {
  const [committedData, setCommittedData] = useState([
    createEmptyRow(1),
    createEmptyRow(2),
    createEmptyRow(3),
  ]);
  const [draftData, setDraftData] = useState(() => deepCopy(committedData));
  const [isDirty, setIsDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const [nextId, setNextId] = useState(4);
  const filterRef = useRef(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setCommittedData(deepCopy(draftData));
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setDraftData(deepCopy(committedData));
    setIsDirty(false);
  };

  const toggleFilter = (colKey, e) => {
    e.stopPropagation();
    setOpenFilter((prev) => (prev === colKey ? null : colKey));
  };

  const applyColumnFilter = (colKey, selectedValues) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (selectedValues.length === 0) {
        delete next[colKey];
      } else {
        next[colKey] = selectedValues;
      }
      return next;
    });
  };

  // Unique values for filters (based on committed data so filters don't disappear while typing)
  const uniqueValues = useMemo(() => {
    const map = {};
    COLUMNS.forEach((col) => {
      const vals = new Set(committedData.map((row) => String(row[col.key] || '')));
      map[col.key] = Array.from(vals).sort((a, b) => a.localeCompare(b));
    });
    return map;
  }, [committedData]);

  // Apply search + column filters
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <style>{`
        .ms-container { max-width: 100%; overflow-x: auto; }
        .ms-table { border-collapse: collapse; width: 100%; background: white; font-size: 12px; table-layout: auto; }
        .ms-table th, .ms-table td { border: 1px solid #d4d4d4; padding: 4px 6px; white-space: nowrap; }
        .ms-table th { background: #f8f9fa; font-weight: 600; position: relative; color: #333; }
        .ms-table td { background: #fff; }
        .ms-table tr:hover td { background-color: #f0f8ff; }
        .ms-table td input { border: 1px solid transparent; outline: none; width: 100%; font-size: 12px; background: transparent; font-family: inherit; padding: 2px; }
        .ms-table td input:focus { border-color: #217346; background: #fff; }
        .filter-btn { cursor: pointer; margin-left: 4px; color: #666; font-size: 9px; display: inline-block; width: 14px; text-align: center; border-radius: 2px; }
        .filter-btn:hover { background: #e0e0e0; color: #000; }
        .filter-btn.active { color: #217346; font-weight: bold; }
        .filter-dropdown { position: absolute; top: 100%; left: 0; background: white; border: 1px solid #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; min-width: 200px; max-height: 320px; overflow-y: auto; padding: 8px; margin-top: 2px; border-radius: 4px; }
        .filter-item { display: flex; align-items: center; padding: 3px 0; cursor: pointer; }
        .filter-item:hover { background: #f0f0f0; }
        .filter-item input { margin-right: 6px; cursor: pointer; }
        .filter-item span { font-size: 12px; color: #333; }
        .filter-actions { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; }
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
      `}</style>

      <div className="ms-container">
        {/* Search Bar */}
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Search across all columns..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isDirty && (
            <span className="dirty-badge">
              <span style={{ width: 8, height: 8, background: '#c00000', borderRadius: '50%', display: 'inline-block' }}></span>
              Unsaved Changes
            </span>
          )}
        </div>

        {/* Controls: Add Row (front/left) | Save/Discard (right, on edit) */}
        <div className="control-bar">
          <div className="left-controls">
            <button className="btn-add" onClick={handleAddRow}>+ Add Row</button>
          </div>
          <div className="right-controls">
            {isDirty && (
              <>
                <button className="btn btn-primary" onClick={handleSave}>💾 Save</button>
                <button className="btn btn-danger" onClick={handleDiscard}>↩ Discard</button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #d4d4d4' }}>
          <table className="ms-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{col.label}</span>
                      <span
                        className={`filter-btn ${getFilterCount(col.key) > 0 ? 'active' : ''}`}
                        onClick={(e) => toggleFilter(col.key, e)}
                        title="Filter"
                      >
                        ▼
                      </span>
                    </div>
                    {openFilter === col.key && (
                      <div className="filter-dropdown" ref={filterRef}>
                        <div className="filter-item" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={
                              uniqueValues[col.key].length > 0 &&
                              (columnFilters[col.key]?.length || 0) === uniqueValues[col.key].length
                            }
                            onChange={() => {
                              const all = uniqueValues[col.key];
                              const current = columnFilters[col.key] || [];
                              if (current.length === all.length) {
                                applyColumnFilter(col.key, []);
                              } else {
                                applyColumnFilter(col.key, [...all]);
                              }
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>(Select All)</span>
                        </div>
                        <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }}></div>
                        {uniqueValues[col.key].map((val) => (
                          <div key={val} className="filter-item" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={(columnFilters[col.key] || []).includes(val)}
                              onChange={(e) => {
                                const current = new Set(columnFilters[col.key] || []);
                                if (e.target.checked) {
                                  current.add(val);
                                } else {
                                  current.delete(val);
                                }
                                applyColumnFilter(col.key, Array.from(current));
                              }}
                            />
                            <span>{val === '' ? '(Blank)' : val}</span>
                          </div>
                        ))}
                        <div className="filter-actions">
                          <button className="btn" onClick={() => applyColumnFilter(col.key, [])}>Clear</button>
                          <button className="btn" onClick={() => setOpenFilter(null)}>Close</button>
                        </div>
                      </div>
                    )}
                  </th>
                ))}
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
                filteredData.map((row) => (
                  <tr key={row.id}>
                    {COLUMNS.map((col) => (
                      <td key={col.key}>
                        <input
                          type="text"
                          value={row[col.key] || ''}
                          onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
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