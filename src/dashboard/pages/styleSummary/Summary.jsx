import { useEffect, useState, useRef } from "react";
import { PlusCircle, RefreshCcw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import StyleReqModal from "../../../components/StyleReqModal";
import useAxiosPublic from "../../../hooks/Axios";
import { useNavigate } from "react-router-dom";

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
    "SALES CONTACT NO", "BUYER", "JOB NO", "STYLE", "PO NO", "COLOR", "COMPOSITION",
    "FINISH DIA", "ORDER QTY", "1st BOOKING", "ADDITIONAL BOOKING",
    "REQUIRED YARN QTY", "KNITTING WORK ORDER QTY",
    "SHORT & EXCESS", "YARN DELIVERY", "SHORT & EXCESS (+/-)",
    "RAW YARN DELIVERY FOR DYED", "YARN RECEIVED AFTER DYED",
    "PARTY STOCK (SHORT & EXCESS)", "TOTAL KNITTING (GREY)", "RETURN YARN RECEIVED",
    "BALANCE (+/-)", "GREY DELIVERY FOR DYEING", "GREY RETURN FROM DYEING",
    "GREY RECEIVED FROM DYEING",
    "FINISH RECEIVED FROM DYEING", "GREY BALANCE (+/-)", "PROCESS LOSS %",
    "FINISH DELIVERY FROM AOP", "FINISH RECEIVED FROM AOP", "AOP FAB. BALANCE (+/-)",
    "AOP PROCESS LOSS (%)", "SENT FOR RE-PROCESS", "RETURN RCVD",
    "RECEIVED AFTER RE-PROCESS (GREY)", "RECEIVED AFTER RE-PROCESS (FINISH)",
    "RE-PROCESS FAB. BALANCE (+/-)", "RE-PROCESS PROCESS LOSS (%)",
];

// ── Frozen column widths ─────────────────────────────────────────────────────
const FROZEN_WIDTHS = [150, 120, 180, 100, 120, 250, 280]; 
const FROZEN_COUNT = FROZEN_WIDTHS.length;

const FROZEN_LEFTS = FROZEN_WIDTHS.reduce((acc, width, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + FROZEN_WIDTHS[idx - 1]);
    return acc;
}, []);

// ── Helper: Safely get a numeric value from compBreakdown item ───────────────
const getBreakdownValue = (item, key) => {
    if (!item) return 0;
    if (item.status) return 0;
    return Number(item[key]) || 0;
};

// ── Summary Page ─────────────────────────────────────────────────────────────
export default function Summary() {
    const axiosPublic = useAxiosPublic();
    const [rawData, setRawData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    
    // Ref to control scrolling programmatically
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        axiosPublic.get("/api/styles").then((res) => {
            setRawData(res.data.data);
        }).catch(e => console.error(e));
    }, [axiosPublic]);

    const handleRedirect = (jobNumber) => {
        navigate(`/dashboard/new-order/${jobNumber}`)
    }

    // ── Scroll Control Functions ─────────────────────────────────────────────
    const scrollHorizontal = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300; // Scroll by 300px
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const scrollVertical = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 150; // Scroll by 150px (approx 2-3 rows)
            scrollContainerRef.current.scrollBy({
                top: direction === 'up' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const renderBreakdownCell = (compBreakdown, key, colIndex) => (
        <td 
            className="p-0 align-top"
            style={{
                backgroundColor: colIndex >= 6 ? '#e0e7ff' : '#ffffff',
                borderRight: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb',
            }}
        >
            <div className="divide-y divide-gray-200">
                {compBreakdown.map((cb, j) => {
                    if (cb?.status) {
                        return (
                            <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400 italic">
                                _
                            </div>
                        );
                    }
                    const value = cb?.[key];
                    return (
                        <div key={j} className="px-3 py-2 whitespace-nowrap">
                            {value !== undefined && value !== null ? value : "_"}
                        </div>
                    );
                })}
            </div>
        </td>
    );

    const getColBg = (index) => index >= 6 ? '#e0e7ff' : '#ffffff';

    const getFrozenStyle = (index) => ({
        position: 'sticky',
        left: `${FROZEN_LEFTS[index]}px`,
        width: `${FROZEN_WIDTHS[index]}px`,
        minWidth: `${FROZEN_WIDTHS[index]}px`,
        maxWidth: `${FROZEN_WIDTHS[index]}px`,
        zIndex: 20,
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.1)' : 'none',
        overflow: index === FROZEN_COUNT - 1 ? 'hidden' : 'visible', 
    });

    const getCellStyle = (index) => ({
        backgroundColor: getColBg(index),
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
    });

    return (
        <DashboardLayout>
            {/* ── Action Bar & Scroll Controls ───────────────────────────────── */}
            <div className="flex gap-2 mb-4 items-center flex-wrap">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <PlusCircle size={18} />
                </button>
                <button
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <RefreshCcw size={18} />
                </button>

                {/* Separator */}
                <div className="h-8 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                {/* Horizontal Scroll Buttons */}
                <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 mr-1 hidden sm:inline">Scroll:</span>
                    <button
                        onClick={() => scrollHorizontal('left')}
                        className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                        title="Scroll Left"
                    >
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <button
                        onClick={() => scrollHorizontal('right')}
                        className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                        title="Scroll Right"
                    >
                        <ChevronRight size={18} className="text-gray-600" />
                    </button>
                </div>

                {/* Vertical Scroll Buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => scrollVertical('up')}
                        className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                        title="Scroll Up"
                    >
                        <ChevronUp size={18} className="text-gray-600" />
                    </button>
                    <button
                        onClick={() => scrollVertical('down')}
                        className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                        title="Scroll Down"
                    >
                        <ChevronDown size={18} className="text-gray-600" />
                    </button>
                </div>
            </div>

            {showModal && <StyleReqModal setRawData={setRawData} setShowModal={setShowModal} />}

            {/* ── Scrollable Container (Ref attached here) ─────────────────── */}
            <div 
                ref={scrollContainerRef}
                className="relative overflow-auto shadow-xs rounded-base border border-default"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
                <table 
                    className="w-full text-sm text-left rtl:text-right text-body"
                    style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                >
                    
                    {/* ── Sticky Header ─────────────────────────────────────── */}
                    <thead className="sticky top-0 z-30 text-sm text-body">
                        <tr>
                            {COLUMNS.map((col, index) => (
                                <th 
                                    key={index} 
                                    scope="col" 
                                    className="px-3 py-3 font-medium whitespace-nowrap"
                                    style={{
                                        backgroundColor: index >= 6 ? '#c7d2fe' : '#e5e7eb',
                                        position: index < FROZEN_COUNT ? 'sticky' : 'relative',
                                        left: index < FROZEN_COUNT ? `${FROZEN_LEFTS[index]}px` : 'auto',
                                        width: index < FROZEN_COUNT ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                        minWidth: index < FROZEN_COUNT ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                        maxWidth: index < FROZEN_COUNT ? `${FROZEN_WIDTHS[index]}px` : 'auto',
                                        zIndex: index < FROZEN_COUNT ? 40 : 30,
                                        borderRight: '1px solid #d1d5db',
                                        borderBottom: '2px solid #d1d5db',
                                        boxShadow: index === FROZEN_COUNT - 1 ? '2px 0 4px -2px rgba(0,0,0,0.15)' : 'none',
                                        overflow: index === FROZEN_COUNT - 1 ? 'hidden' : 'visible',
                                    }}
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rawData?.map((row, i) => {
                            const compBreakdown = row.compBreakdown || row.rows.map(() => ({}));

                            return (
                                <tr key={i} className="group">

                                    {/* 1. SALES CONTACT - Frozen Column */}
                                    <td 
                                        className="px-3 py-2 whitespace-nowrap align-middle group-hover:bg-gray-50"
                                        style={getFrozenStyle(0)}
                                    >
                                        {row.salesContact}
                                    </td>

                                    {/* 2. BUYER - Frozen Column */}
                                    <td 
                                        className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50"
                                        style={getFrozenStyle(1)}
                                    >
                                        {row.buyerName}
                                    </td>

                                    {/* 3. JOB NO - Frozen Column */}
                                    <td 
                                        onDoubleClick={() => handleRedirect(row.jobNo)} 
                                        className="px-3 py-2 whitespace-nowrap align-middle text-center cursor-pointer hover:text-blue-600 group-hover:bg-gray-50"
                                        style={getFrozenStyle(2)}
                                    >
                                        {row.jobNo}
                                    </td>

                                    {/* 4. STYLE - Frozen Column */}
                                    <td 
                                        className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50"
                                        style={getFrozenStyle(3)}
                                    >
                                        {row.styleNo}
                                    </td>

                                    {/* 5. PO NO - Frozen Column */}
                                    <td 
                                        className="px-3 py-2 whitespace-nowrap align-middle text-center group-hover:bg-gray-50"
                                        style={getFrozenStyle(4)}
                                    >
                                        {row.poNo}
                                    </td>

                                    {/* 6. COLOR - Frozen Column */}
                                    <td 
                                        className="p-0 align-top group-hover:bg-gray-50"
                                        style={getFrozenStyle(5)}
                                    >
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.color}</div>)}
                                        </div>
                                    </td>

                                    {/* 7. COMPOSITION - Frozen Column */}
                                    <td 
                                        className="p-0 align-top group-hover:bg-gray-50"
                                        style={getFrozenStyle(6)}
                                    >
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => (
                                                <div 
                                                    key={j} 
                                                    className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
                                                    title={cell.composition}
                                                >
                                                    {cell.composition}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 8. FINISH DIA */}
                                    <td className="p-0 align-top" style={getCellStyle(7)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.finishDia}</div>)}
                                        </div>
                                    </td>

                                    {/* 9. ORDER QTY */}
                                    <td className="p-0 align-top" style={getCellStyle(8)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">{cell.orderQty}</div>)}
                                        </div>
                                    </td>

                                    {/* 10. 1st BOOKING */}
                                    <td className="p-0 align-top" style={getCellStyle(9)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {(Number(cell.finishRequiredQty) + Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 11. ADDITIONAL BOOKING */}
                                    <td className="p-0 align-top" style={getCellStyle(10)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">additional</div>)}
                                        </div>
                                    </td>

                                    {/* 12. REQUIRED YARN QTY */}
                                    <td className="p-0 align-top" style={getCellStyle(11)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {(Number(cell.finishRequiredQty) + Number(cell.finishRequiredQty) * (Number(row.processLoss) / 100)).toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 13. KNITTING WORK ORDER QTY */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_workOrderQty', 12)}

                                    {/* 14. SHORT & EXCESS */}
                                    <td className="p-0 align-top" style={getCellStyle(13)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => {
                                                const cb = compBreakdown[j] || {};
                                                if (cb.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const finishRequiredQty = cell.finishRequiredQty || 0;
                                                const processLoss = row.processLoss || 0;
                                                const knittingWorkOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');
                                                const diff0 = (Number(finishRequiredQty) + Number(finishRequiredQty) * Number(processLoss) / 100) - Number(knittingWorkOrderQty);
                                                const isExceeded0 = diff0 > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}`}>
                                                        {isExceeded0 ? `(${diff0.toFixed(2)})` : Math.abs(diff0).toFixed(2)}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>

                                    {/* 15. YARN DELIVERY */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Yarn_Delivery', 14)}

                                    {/* 16. SHORT & EXCESS (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(15)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((cell, j) => {
                                                const cb = compBreakdown[j] || {};
                                                if (cb.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const finishQty = Number(cell.finishRequiredQty) || 0;
                                                const processLoss = Number(row.processLoss) || 0;
                                                const delivered = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');

                                                const totalRequired = finishQty + finishQty * (processLoss / 100);
                                                const diff1 = totalRequired - delivered;
                                                const isExceed1 = diff1 > 0;

                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceed1 ? "text-green-500 font-bold" : "text-red-500 font-bold"}`}>
                                                        {totalRequired === 0 ? "_" : isExceed1 ? `(${diff1.toFixed(2)})` : Math.abs(diff1).toFixed(2)}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>

                                    {/* 17. RAW YARN DELIVERY FOR DYED */}
                                    {renderBreakdownCell(compBreakdown, 'yarnDyeingOrder_Yarn_Delivery_For_Yarn_Dye', 16)}

                                    {/* 18. YARN RECEIVED AFTER DYED */}
                                    {renderBreakdownCell(compBreakdown, 'yarnDyeingOrder_Yarn_Received_From_Yarn_Dye', 17)}

                                    {/* 19. PARTY STOCK */}
                                    <td className="p-0 align-top" style={getCellStyle(18)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((_, j) => <div key={j} className="px-3 py-2 whitespace-nowrap">party stock</div>)}
                                        </div>
                                    </td>

                                    {/* 20. TOTAL KNITTING (GREY) */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Grey_Received', 19)}

                                    {/* 21. RETURN YARN RECEIVED */}
                                    {renderBreakdownCell(compBreakdown, 'knittingOrder_Yarn_Return', 20)}

                                    {/* 22. BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(21)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const yarnDelivery = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                                                const yarnReturn = getBreakdownValue(cb, 'knittingOrder_Yarn_Return');
                                                const greyReceived = getBreakdownValue(cb, 'knittingOrder_Grey_Received');
                                                const workOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');
                                                const balance = (greyReceived + yarnReturn) - (workOrderQty - yarnDelivery);
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap font-bold ${balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {balance === 0 ? "_" : balance.toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 23. GREY DELIVERY FOR DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Delivery', 22)}

                                    {/* 24. GREY RETURN FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Return_Received', 23)}

                                    {/* 25. GREY RECEIVED FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Grey_Received_From_Dyeing', 24)}

                                    {/* 26. FINISH RECEIVED FROM DYEING */}
                                    {renderBreakdownCell(compBreakdown, 'dyeingOrder_Finish_Fabric_Received', 25)}

                                    {/* 27. GREY BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(26)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const diff = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received') +
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing') -
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery');
                                                const isExceeded = diff > 0;
                                                const hasAnyData = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received') ||
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing') ||
                                                    getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery');
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {!hasAnyData ? "_" : (isExceeded ? `(${diff})` : Math.abs(diff))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 28. PROCESS LOSS % */}
                                    <td className="p-0 align-top" style={getCellStyle(27)}>
                                        <div className="divide-y divide-gray-200">
                                            {row.rows.map((_, j) => (
                                                <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                    {row.processLoss || 0}%
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* 29. FINISH DELIVERY FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Sent_for_AOP', 28)}

                                    {/* 30. FINISH RECEIVED FROM AOP */}
                                    {renderBreakdownCell(compBreakdown, 'aopOrder_Received_from_AOP', 29)}

                                    {/* 31. AOP FAB. BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(30)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'aopOrder_Sent_for_AOP');
                                                const received = getBreakdownValue(cb, 'aopOrder_Received_from_AOP');
                                                const diff = received - sent;
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {sent === 0 && received === 0 ? "_" : (isExceeded ? `(${diff})` : Math.abs(diff))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 32. AOP PROCESS LOSS (%) */}
                                    <td className="p-0 align-top" style={getCellStyle(31)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'aopOrder_Sent_for_AOP');
                                                const received = getBreakdownValue(cb, 'aopOrder_Received_from_AOP');
                                                const loss = sent > 0 ? (((sent - received) / sent) * 100).toFixed(2) : "_";
                                                return (
                                                    <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                        {loss === "_" ? "_" : `${loss}%`}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 33. SENT FOR RE-PROCESS */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Sent_for_Re_Process', 32)}

                                    {/* 34. RETURN RCVD */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Return_Received', 33)}

                                    {/* 35. RECEIVED AFTER RE-PROCESS (GREY) */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Received_After_Re_Process_Grey', 34)}

                                    {/* 36. RECEIVED AFTER RE-PROCESS (FINISH) */}
                                    {renderBreakdownCell(compBreakdown, 'reProcessOrder_Received_After_Re_Process_Finish', 35)}

                                    {/* 37. RE-PROCESS FAB. BALANCE (+/-) */}
                                    <td className="p-0 align-top" style={getCellStyle(36)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                                                const receivedGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                                                const receivedFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                                                const diff = (receivedGrey + receivedFinish) - sent;
                                                const isExceeded = diff > 0;
                                                return (
                                                    <div key={j} className={`px-3 py-2 whitespace-nowrap ${isExceeded ? "text-green-500 font-bold" : "font-bold text-red-500"}`}>
                                                        {sent === 0 && receivedGrey === 0 && receivedFinish === 0 ? "_" : (isExceeded ? `(${diff})` : Math.abs(diff))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 38. RE-PROCESS PROCESS LOSS (%) */}
                                    <td className="p-0 align-top" style={getCellStyle(37)}>
                                        <div className="divide-y divide-gray-200">
                                            {compBreakdown.map((cb, j) => {
                                                if (cb?.status) return <div key={j} className="px-3 py-2 whitespace-nowrap text-gray-400">_</div>;
                                                const sent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                                                const receivedGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                                                const receivedFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                                                const loss = sent > 0 ? (((sent - (receivedGrey + receivedFinish)) / sent) * 100).toFixed(2) : "_";
                                                return (
                                                    <div key={j} className="px-3 py-2 whitespace-nowrap">
                                                        {loss === "_" ? "_" : `${loss}%`}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}