import React, { useState, useMemo } from 'react';

const YarnDyedMovement = () => {
    // --- 1. Sample Data (Replace with your actual API data) ---
    const [allData] = useState([
        {
            id: 1, date: '2026-08-01', challanNo: 'CH-001', piNo: 'PI-1001', lcNumber: 'LC-5001',
            supplierName: 'ABC Textiles Ltd. (Very Long Name for Testing Wrap)', jobNumber: 'JOB-2001',
            color: 'Navy Blue', fabricComposition: '100% Cotton Combed', fabricWidth: '58"',
            yarnCount: '30s', composition: '100% Cotton', lot: 'LOT-A1-Long-Lot-Number',
            yarnDeliveryQty: 1500.50, yarnReturnQty: 50.00, yarnReceivedQtyGrey: 1450.50, yarnReceivedQtyFinish: 1400.00,
            from: 'Factory A', to: 'Factory B', remarks: 'Regular shipment with special instructions'
        },
        {
            id: 2, date: '2026-08-05', challanNo: 'CH-002', piNo: 'PI-1002', lcNumber: 'LC-5002',
            supplierName: 'XYZ Fabrics Inc.', jobNumber: 'JOB-2002', color: 'White',
            fabricComposition: '80% Cotton, 20% Polyester Blend', fabricWidth: '60"',
            yarnCount: '40s', composition: '80% Cotton, 20% Poly', lot: 'LOT-B2',
            yarnDeliveryQty: 2000.00, yarnReturnQty: 100.00, yarnReceivedQtyGrey: 1900.00, yarnReceivedQtyFinish: 1850.50,
            from: 'Factory B', to: 'Factory C', remarks: 'Urgent order'
        },
        {
            id: 3, date: '2026-07-15', challanNo: 'CH-003', piNo: 'PI-1003', lcNumber: 'LC-5003',
            supplierName: 'Global Yarn Co.', jobNumber: 'JOB-2003', color: 'Red',
            fabricComposition: '100% Polyester', fabricWidth: '56"',
            yarnCount: '20s', composition: '100% Polyester', lot: 'LOT-C3',
            yarnDeliveryQty: 3000.75, yarnReturnQty: 150.25, yarnReceivedQtyGrey: 2850.50, yarnReceivedQtyFinish: 2800.00,
            from: 'Factory C', to: 'Factory A', remarks: 'Monthly batch'
        },
        {
            id: 4, date: '2026-08-10', challanNo: 'CH-004', piNo: 'PI-1004', lcNumber: 'LC-5004',
            supplierName: 'Prime Textiles', jobNumber: 'JOB-2004', color: 'Green',
            fabricComposition: '60% Cotton, 40% Linen', fabricWidth: '62"',
            yarnCount: '24s', composition: '60% Cotton, 40% Linen', lot: 'LOT-D4',
            yarnDeliveryQty: 1800.00, yarnReturnQty: 75.00, yarnReceivedQtyGrey: 1725.00, yarnReceivedQtyFinish: 1700.25,
            from: 'Factory A', to: 'Factory D', remarks: 'Special order'
        },
        {
            id: 5, date: '2026-07-22', challanNo: 'CH-005', piNo: 'PI-1005', lcNumber: 'LC-5005',
            supplierName: 'Elite Fabrics', jobNumber: 'JOB-2005', color: 'Yellow',
            fabricComposition: '100% Silk', fabricWidth: '54"',
            yarnCount: '60s', composition: '100% Silk', lot: 'LOT-E5',
            yarnDeliveryQty: 500.00, yarnReturnQty: 25.00, yarnReceivedQtyGrey: 475.00, yarnReceivedQtyFinish: 450.00,
            from: 'Factory D', to: 'Factory B', remarks: 'Premium quality'
        }
    ]);

    // --- 2. State Management ---
    const [searchInput, setSearchInput] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('all');

    // --- 3. Available Months for Filter ---
    const availableMonths = useMemo(() => {
        const months = new Set();
        allData.forEach(item => {
            const monthYear = item.date.substring(0, 7); // 'YYYY-MM'
            months.add(monthYear);
        });
        return Array.from(months).sort().reverse();
    }, [allData]);

    // --- 4. Filtered Data (Search + Month Filter) ---
    const filteredData = useMemo(() => {
        return allData.filter(item => {
            // Month Filter
            const matchesMonth = selectedMonth === 'all' || item.date.startsWith(selectedMonth);
            
            // Search Filter
            const searchLower = activeSearch.toLowerCase();
            const matchesSearch = activeSearch === '' || 
                item.challanNo.toLowerCase().includes(searchLower) ||
                item.piNo.toLowerCase().includes(searchLower) ||
                item.supplierName.toLowerCase().includes(searchLower) ||
                item.jobNumber.toLowerCase().includes(searchLower) ||
                item.color.toLowerCase().includes(searchLower) ||
                item.lot.toLowerCase().includes(searchLower);

            return matchesMonth && matchesSearch;
        });
    }, [allData, selectedMonth, activeSearch]);

    // --- 5. Calculate Totals ---
    const totals = useMemo(() => {
        return filteredData.reduce((acc, item) => ({
            delivery: acc.delivery + item.yarnDeliveryQty,
            return: acc.return + item.yarnReturnQty,
            grey: acc.grey + item.yarnReceivedQtyGrey,
            finish: acc.finish + item.yarnReceivedQtyFinish
        }), { delivery: 0, return: 0, grey: 0, finish: 0 });
    }, [filteredData]);

    // --- 6. Helpers ---
    const fmt = (num) => num.toFixed(2);
    const fmtDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const fmtMonthLabel = (monthStr) => {
        const [y, m] = monthStr.split('-');
        return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const handleSearch = () => setActiveSearch(searchInput);
    const handleClear = () => { setSearchInput(''); setActiveSearch(''); };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
            
            {/* ==========================================
                SECTION 1: SUMMARY CARDS (Above Header) 
               ========================================== */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
                    Quick Summary
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 flex flex-col justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Delivery (Y/D)</span>
                        <span className="text-2xl font-bold text-gray-800 mt-1">{fmt(totals.delivery)}</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-amber-500 flex flex-col justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Return (Y/D)</span>
                        <span className="text-2xl font-bold text-gray-800 mt-1">{fmt(totals.return)}</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-emerald-500 flex flex-col justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Received (Grey)</span>
                        <span className="text-2xl font-bold text-gray-800 mt-1">{fmt(totals.grey)}</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500 flex flex-col justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Received (Finish)</span>
                        <span className="text-2xl font-bold text-gray-800 mt-1">{fmt(totals.finish)}</span>
                    </div>
                </div>
            </div>

            {/* ==========================================
                SECTION 2: SEARCH & FILTER (Action Bar)
               ========================================== */}
            <div className="bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Search Challan, PI, Supplier, Job, Color..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button 
                        onClick={handleSearch}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        Search
                    </button>
                    <button 
                        onClick={handleClear}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
                    >
                        Clear
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Month Filter:
                    </label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                    >
                        <option value="all">All Months</option>
                        {availableMonths.map(month => (
                            <option key={month} value={month}>{fmtMonthLabel(month)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ==========================================
                SECTION 3: DATA TABLE
               ========================================== */}
            <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-350px)]">
                    <table className="w-full border-collapse text-sm">
                        
                        {/* TABLE HEADER */}
                        <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Date</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Challan No.</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">PI No</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">LC Number</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Supplier Name</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Job Number</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Color</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Fabric Composition</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Fabric Width</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Yarn Count</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Composition</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Lot</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Yarn Delivery Qty (Y/D)</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Yarn Return Qty (Y/D Factory)</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Yarn Received Qty (Grey)</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Yarn Received Qty (Finish)</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">From</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">To</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase border border-gray-300 whitespace-nowrap">Remarks</th>
                            </tr>
                            
                            {/* HEADER TOTAL ROW */}
                            <tr className="bg-blue-50">
                                <td colSpan="12" className="px-3 py-2 text-right text-xs font-bold text-blue-800 border border-gray-300 uppercase tracking-wider">
                                    Header Total:
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-blue-800 border border-gray-300 font-mono">{fmt(totals.delivery)}</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-blue-800 border border-gray-300 font-mono">{fmt(totals.return)}</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-blue-800 border border-gray-300 font-mono">{fmt(totals.grey)}</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-blue-800 border border-gray-300 font-mono">{fmt(totals.finish)}</td>
                                <td colSpan="3" className="px-3 py-2 border border-gray-300 bg-blue-50"></td>
                            </tr>
                        </thead>

                        {/* TABLE BODY */}
                        <tbody className="divide-y divide-gray-200">
                            {filteredData.length > 0 ? (
                                filteredData.map((item, index) => (
                                    <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 whitespace-nowrap font-medium">{fmtDate(item.date)}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[100px]">{item.challanNo}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[80px]">{item.piNo}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[100px]">{item.lcNumber}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[150px]">{item.supplierName}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[100px]">{item.jobNumber}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[80px]">{item.color}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[150px]">{item.fabricComposition}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 whitespace-nowrap">{item.fabricWidth}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 whitespace-nowrap">{item.yarnCount}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[150px]">{item.composition}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[100px]">{item.lot}</td>
                                        
                                        {/* Numeric Columns (Right Aligned, Fixed 2 decimals, No Wrap) */}
                                        <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnDeliveryQty)}</td>
                                        <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnReturnQty)}</td>
                                        <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnReceivedQtyGrey)}</td>
                                        <td className="px-3 py-2 text-gray-900 text-right border border-gray-300 whitespace-nowrap font-mono tabular-nums">{fmt(item.yarnReceivedQtyFinish)}</td>
                                        
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[100px]">{item.from}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[100px]">{item.to}</td>
                                        <td className="px-3 py-2 text-gray-900 border border-gray-300 break-words min-w-[150px]">{item.remarks}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="19" className="px-6 py-12 text-center text-gray-500 italic bg-white">
                                        No records found matching your search or filter criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {/* TABLE FOOTER */}
                        <tfoot className="bg-gray-100 sticky bottom-0 z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                            <tr className="border-t-2 border-gray-400">
                                <td colSpan="12" className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 uppercase tracking-wider">
                                    Footer Total:
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(totals.delivery)}</td>
                                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(totals.return)}</td>
                                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(totals.grey)}</td>
                                <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 border border-gray-300 whitespace-nowrap font-mono tabular-nums bg-green-50">{fmt(totals.finish)}</td>
                                <td colSpan="3" className="px-3 py-3 border border-gray-300 bg-gray-100"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            {/* Record Count */}
            <div className="mt-3 text-right text-xs text-gray-500 font-medium">
                Showing {filteredData.length} of {allData.length} records
            </div>
        </div>
    );
};

export default YarnDyedMovement;