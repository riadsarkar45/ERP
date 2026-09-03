import React, { useState, useMemo, useRef, useEffect } from 'react';

const ProductionSummary = () => {
    const [filterValues, setFilterValues] = useState({});
    const [activeFilter, setActiveFilter] = useState(null);
    const [filterSearch, setFilterSearch] = useState('');
    const dropdownRef = useRef(null);

    const [tableData] = useState([
        {
            buyer: 'Nike', jobNumber: 'JOB001', orderNo: 'ORD-001', color: 'Blue', orderQty: 1000, hod: 'John Doe',
            dailyCutting: 100, totalCutting: 500, dailyInput: 95, totalInput: 480, dailySewing: 90, totalSewing: 450,
            dailyFinishingRcvd: 85, totalFinishingRcvd: 430, dailyFinishing: 80, totalFinishing: 400,
            dailyShipment: 75, totalShipment: 380, plannedLeftover: 20, physicalFound: 18, leftFoundPercent: 90, remarks: 'On track'
        },
        {
            buyer: 'Adidas', jobNumber: 'JOB002', orderNo: 'ORD-002', color: 'Red', orderQty: 1500, hod: 'Jane Smith',
            dailyCutting: 150, totalCutting: 750, dailyInput: 145, totalInput: 720, dailySewing: 140, totalSewing: 700,
            dailyFinishingRcvd: 135, totalFinishingRcvd: 680, dailyFinishing: 130, totalFinishing: 650,
            dailyShipment: 125, totalShipment: 620, plannedLeftover: 30, physicalFound: 28, leftFoundPercent: 93, remarks: 'Delayed'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
        {
            buyer: 'Nike', jobNumber: 'JOB003', orderNo: 'ORD-003', color: 'Green', orderQty: 2000, hod: 'Mike Johnson',
            dailyCutting: 200, totalCutting: 1000, dailyInput: 195, totalInput: 980, dailySewing: 190, totalSewing: 950,
            dailyFinishingRcvd: 185, totalFinishingRcvd: 920, dailyFinishing: 180, totalFinishing: 900,
            dailyShipment: 175, totalShipment: 880, plannedLeftover: 20, physicalFound: 19, leftFoundPercent: 95, remarks: 'On track'
        },
    ]);

    // ALL columns are now filterable
    const filterableColumns = [
        'buyer', 'jobNumber', 'orderNo', 'color', 'orderQty', 'hod',
        'dailyCutting', 'totalCutting', 'dailyInput', 'totalInput', 'dailySewing', 'totalSewing',
        'dailyFinishingRcvd', 'totalFinishingRcvd', 'dailyFinishing', 'totalFinishing',
        'dailyShipment', 'totalShipment', 'plannedLeftover', 'physicalFound', 'leftFoundPercent',
        'remarks'
    ];

    // Sub-header columns with filter
    const subHeaders = [
        { key: 'dailyCutting', label: 'TODAY CUTTING' },
        { key: 'totalCutting', label: 'TOTAL CUTTING' },
        { key: 'dailyInput', label: 'TODAY INPUT' },
        { key: 'totalInput', label: 'TOTAL INPUT' },
        { key: 'dailySewing', label: 'TODAY SEWING' },
        { key: 'totalSewing', label: 'TOTAL SEWING' },
        { key: 'dailyFinishingRcvd', label: 'TODAY FIN. RCVD' },
        { key: 'totalFinishingRcvd', label: 'TOTAL FIN. RCVD' },
        { key: 'dailyFinishing', label: 'TODAY FINISHING' },
        { key: 'totalFinishing', label: 'TOTAL FINISHING' },
        { key: 'dailyShipment', label: 'TODAY SHIPMENT' },
        { key: 'totalShipment', label: 'TOTAL SHIPMENT' },
        { key: 'plannedLeftover', label: 'PLANNED LEFTOVER' },
        { key: 'physicalFound', label: 'PHYSICAL FOUND' },
        { key: 'leftFoundPercent', label: 'LEFT. FOUND (%)' },
    ];

    const colWidths = {
        buyer: 100,
        jobNumber: 110,
        orderNo: 110,
        color: 90,
        orderQty: 90,
        hod: 120,
    };

    const frozenColumns = {
        buyer: 0,
        jobNumber: colWidths.buyer,
        orderNo: colWidths.buyer + colWidths.jobNumber,
        color: colWidths.buyer + colWidths.jobNumber + colWidths.orderNo,
        orderQty: colWidths.buyer + colWidths.jobNumber + colWidths.orderNo + colWidths.color,
        hod: colWidths.buyer + colWidths.jobNumber + colWidths.orderNo + colWidths.color + colWidths.orderQty,
    };

    // Numeric-aware sorting for filter values
    const getUniqueValues = (key) => {
        const unique = [...new Set(tableData.map(item => item[key]))];
        return unique.sort((a, b) => {
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });
    };

    const handleFilterChange = (key, value) => {
        setFilterValues(prev => ({ ...prev, [key]: value }));
    };

    const openFilter = (key, label, event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setActiveFilter({ key, label, rect });
        setFilterSearch('');
    };

    const closeFilter = () => {
        setActiveFilter(null);
        setFilterSearch('');
    };

    // ✅ BUG FIX: filter can be a NUMBER, so we must convert to String first
    const filteredData = useMemo(() => {
        return tableData.filter(row => {
            return Object.keys(filterValues).every(key => {
                if (!filterValues[key] || filterValues[key].length === 0) return true;
                const cellValue = String(row[key]).toLowerCase();
                return filterValues[key].some(filter => cellValue.includes(String(filter).toLowerCase()));
            });
        });
    }, [tableData, filterValues]);

    const clearAllFilters = () => {
        setFilterValues({});
        setActiveFilter(null);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                closeFilter();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const FilterIcon = ({ columnKey, label }) => {
        const hasFilter = filterValues[columnKey] && filterValues[columnKey].length > 0;
        return (
            <span
                className={`cursor-pointer p-0.5 rounded inline-flex items-center justify-center flex-shrink-0 ${hasFilter ? 'text-blue-600 bg-blue-100' : 'text-gray-500 hover:bg-gray-300'
                    }`}
                onClick={(e) => {
                    e.stopPropagation();
                    openFilter(columnKey, label, e);
                }}
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
            </span>
        );
    };

    const FilterDropdown = () => {
        if (!activeFilter) return null;
        const { key, label, rect } = activeFilter;
        const uniqueValues = getUniqueValues(key);
        const filteredValues = uniqueValues.filter(v =>
            String(v).toLowerCase().includes(filterSearch.toLowerCase())
        );
        const currentFilters = filterValues[key] || [];

        return (
            <div
                ref={dropdownRef}
                className="fixed bg-white border border-black rounded shadow-xl z-[9999] w-64 flex flex-col"
                style={{ top: `${rect.bottom + 5}px`, left: `${rect.left}px` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-100 font-bold text-sm">
                    <span>Filter: {label}</span>
                    <button onClick={closeFilter} className="text-gray-500 hover:text-gray-800 text-lg leading-none">×</button>
                </div>
                <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                        <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="w-full pl-7 pr-2 py-1.5 text-sm border border-black rounded focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="overflow-y-auto max-h-60 p-1">
                    {filteredValues.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-2">No results found</div>
                    ) : (
                        filteredValues.map((value, idx) => (
                            <label key={idx} className="flex items-center p-1.5 px-2 cursor-pointer rounded hover:bg-gray-100 text-sm">
                                <input
                                    type="checkbox"
                                    className="mr-2 accent-blue-600"
                                    checked={currentFilters.includes(value)}
                                    onChange={(e) => {
                                        if (e.target.checked) handleFilterChange(key, [...currentFilters, value]);
                                        else handleFilterChange(key, currentFilters.filter(v => v !== value));
                                    }}
                                />
                                <span>{String(value)}</span>
                            </label>
                        ))
                    )}
                </div>
                <div className="flex gap-2 p-2 border-t border-gray-200 bg-gray-50">
                    <button className="flex-1 px-3 py-1.5 border border-blue-600 rounded bg-blue-600 text-white text-xs cursor-pointer hover:bg-blue-700" onClick={closeFilter}>Apply</button>
                    <button className="flex-1 px-3 py-1.5 border border-black rounded bg-white text-gray-700 text-xs cursor-pointer hover:bg-gray-100" onClick={() => { handleFilterChange(key, []); closeFilter(); }}>Clear</button>
                </div>
            </div>
        );
    };

    const isLastFrozen = (columnKey) => columnKey === 'hod';

    const StickyTh = ({ children, columnKey, label, colSpan, rowSpan }) => {
        const isFrozen = frozenColumns.hasOwnProperty(columnKey);
        const left = frozenColumns[columnKey] || 0;
        const width = colWidths[columnKey] || 'auto';
        const hasFilter = filterableColumns.includes(columnKey);

        return (
            <th
                colSpan={colSpan}
                rowSpan={rowSpan}
                className={`bg-red-200 border-b border-r border-black p-2 text-center font-bold text-red-700 align-middle ${isFrozen ? 'sticky z-30' : ''
                    } ${isLastFrozen(columnKey) ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]' : ''}`}
                style={{
                    ...(isFrozen ? { left: `${left}px` } : {}),
                    ...(width !== 'auto' ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}),
                }}
            >
                <div className="flex items-center justify-center gap-1">
                    <span className="whitespace-normal break-words leading-tight text-center">{children}</span>
                    {hasFilter && <FilterIcon columnKey={columnKey} label={label} />}
                </div>
            </th>
        );
    };

    const StickyTd = ({ children, columnKey, className = '', isEvenRow }) => {
        const isFrozen = frozenColumns.hasOwnProperty(columnKey);
        const left = frozenColumns[columnKey] || 0;
        const width = colWidths[columnKey] || 'auto';

        return (
            <td
                className={`border-b border-r border-black p-2 text-center text-[15px] align-middle ${isFrozen ? 'sticky z-10' : ''
                    } ${isEvenRow ? 'bg-white' : 'bg-gray-50'} ${isLastFrozen(columnKey) ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]' : ''
                    } ${className}`}
                style={{
                    ...(isFrozen ? { left: `${left}px` } : {}),
                    ...(width !== 'auto' ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}),
                }}
            >
                <div className="whitespace-normal break-words leading-snug">{children}</div>
            </td>
        );
    };

    const thClass = ' border-b border-r border-black p-2 text-center font-bold text-gray-700 whitespace-nowrap align-middle';

    return (
        <div className="p-5 font-sans text-xs">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Production Summary</h2>
                <button
                    className="px-4 py-2 bg-gray-100 border border-black rounded cursor-pointer text-sm hover:bg-gray-200"
                    onClick={clearAllFilters}
                >
                    Clear All Filters
                </button>
            </div>

            <div className="overflow-x-auto border border-gray-700 rounded shadow-sm">
                <table
                    className="w-full bg-white"
                    style={{
                        minWidth: '2000px',
                        tableLayout: 'fixed',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                    }}
                >
                    <colgroup>
                        <col style={{ width: `${colWidths.buyer}px` }} />
                        <col style={{ width: `${colWidths.jobNumber}px` }} />
                        <col style={{ width: `${colWidths.orderNo}px` }} />
                        <col style={{ width: `${colWidths.color}px` }} />
                        <col style={{ width: `${colWidths.orderQty}px` }} />
                        <col style={{ width: `${colWidths.hod}px` }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '135px' }} />
                        <col style={{ width: '135px' }} />
                        <col style={{ width: '135px' }} />
                        <col style={{ width: '135px' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <StickyTh columnKey="buyer" label="Buyer" rowSpan={2}>BUYER</StickyTh>
                            <StickyTh columnKey="jobNumber" label="Job Number" rowSpan={2}>JOB NUMBER</StickyTh>
                            <StickyTh columnKey="orderNo" label="Order No." rowSpan={2}>ORDER NO.</StickyTh>
                            <StickyTh columnKey="color" label="Color" rowSpan={2}>COLOR</StickyTh>
                            <StickyTh columnKey="orderQty" label="Order Qty" rowSpan={2}>ORDER QTY</StickyTh>
                            <StickyTh columnKey="hod" label="HOD" rowSpan={2}>HOD</StickyTh>

                            <th colSpan={2} className={`${thClass} bg-green-200  text-green-900`}>CUTTING</th>
                            <th colSpan={4} className={`${thClass} bg-red-200 text-red-700`}>SEWING</th>
                            <th colSpan={4} className={`${thClass} bg-green-200 text-green-700`}>FINISHING</th>
                            <th colSpan={5} className={`${thClass} bg-blue-200 text-blue-900`}>OTHERS</th>
                            <StickyTh columnKey="remarks" label="Remarks" rowSpan={2}>REMARKS</StickyTh>
                        </tr>
                        <tr>
                            {subHeaders.map((header) => (
                                <th key={header.key} className={`${thClass} 
                ${header.label === "TODAY CUTTING" && "bg-green-200 text-green-900"}
                ${header.label === "TOTAL CUTTING" && "bg-green-200 text-green-900"}
                ${header.label === "TODAY INPUT" && "bg-red-200 text-red-700"}
                ${header.label === "TOTAL INPUT" && "bg-red-200  text-red-700"}
                ${header.label === "TODAY SEWING" && "bg-red-200  text-red-700"}
                ${header.label === "TOTAL SEWING" && "bg-red-200  text-red-700"}
                ${header.label === "TODAY FIN. RCVD" && "bg-green-200 text-green-700"}
                ${header.label === "TOTAL FIN. RCVD" && "bg-green-200 text-green-700"}
                ${header.label === "TODAY FINISHING" && "bg-green-200 text-green-700"}
                ${header.label === "TOTAL FINISHING" && "bg-green-200 text-green-700"}
                ${header.label === "TODAY SHIPMENT" && "bg-blue-200 text-blue-900"}
                ${header.label === "TOTAL SHIPMENT" && "bg-blue-200 text-blue-900"}
                ${header.label === "PLANNED LEFTOVER" && "bg-blue-200 text-blue-900"}
                ${header.label === "PHYSICAL FOUND" && "bg-blue-200 text-blue-900"}
                ${header.label === "LEFT. FOUND (%)" && "bg-blue-200 text-blue-900"}
                
                `}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="whitespace-nowrap">{header.label}</span>
                                        <FilterIcon columnKey={header.key} label={header.label} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, index) => {
                            const isEvenRow = index % 2 === 0;
                            const tdClass = `border-b border-r border-black p-2 text-center align-middle text-[15px]`;
                            return (
                                <tr key={index} className="hover:bg-blue-50">
                                    <StickyTd columnKey="buyer" isEvenRow={isEvenRow}>{row.buyer}</StickyTd>
                                    <StickyTd columnKey="jobNumber" isEvenRow={isEvenRow}>{row.jobNumber}</StickyTd>
                                    <StickyTd columnKey="orderNo" isEvenRow={isEvenRow}>{row.orderNo}</StickyTd>
                                    <StickyTd columnKey="color" isEvenRow={isEvenRow}>{row.color}</StickyTd>
                                    <StickyTd columnKey="orderQty" isEvenRow={isEvenRow}>{row.orderQty}</StickyTd>
                                    <StickyTd columnKey="hod" isEvenRow={isEvenRow}>{row.hod}</StickyTd>
                                    <td className={`${tdClass} bg-green-100 text-green-900`}>{row.dailyCutting}</td>
                                    <td className={`${tdClass} bg-green-100 text-green-900`}>{row.totalCutting}</td>
                                    <td className={`${tdClass} bg-red-100 text-red-700 `}>{row.dailyInput}</td>
                                    <td className={`${tdClass} bg-red-100 text-red-700 `}>{row.totalInput}</td>
                                    <td className={`${tdClass} bg-red-100 text-red-700 `}>{row.dailySewing}</td>
                                    <td className={`${tdClass} bg-red-100 text-red-700 `}>{row.totalSewing}</td>
                                    <td className={`${tdClass} bg-green-100 text-green-700 `}>{row.dailyFinishingRcvd}</td>
                                    <td className={`${tdClass} bg-green-100 text-green-700 `}>{row.totalFinishingRcvd}</td>
                                    <td className={`${tdClass} bg-green-100 text-green-700 `}>{row.dailyFinishing}</td>
                                    <td className={`${tdClass} bg-green-100 text-green-700 `}>{row.totalFinishing}</td>
                                    <td className={`${tdClass} bg-blue-100 text-blue-900`}>{row.dailyShipment}</td>
                                    <td className={`${tdClass} bg-blue-100 text-blue-900`}>{row.totalShipment}</td>
                                    <td className={`${tdClass} bg-blue-100 text-blue-900`}>{row.plannedLeftover}</td>
                                    <td className={`${tdClass} bg-blue-100 text-blue-900`}>{row.physicalFound}</td>
                                    <td className={`${tdClass} bg-blue-100 text-blue-900`}>{row.leftFoundPercent}%</td>
                                    <td className={`${tdClass} `}>{row.remarks}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <FilterDropdown />
        </div>
    );
};

export default ProductionSummary;