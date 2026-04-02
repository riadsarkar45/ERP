import { useEffect, useState } from "react";
import { PlusCircle, RefreshCcw } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import StyleReqModal from "../../../components/StyleReqModal";
import useAxiosPublic from "../../../hooks/Axios";
import ColumnHeader from "../../../components/ColumnHeader";
import FilterToolbar from "../../../components/Filtertoolbar";
import { useTableFilter } from "../../../hooks/UseTableFilter";
import { exportToExcel } from "../../../hooks/Exporttoexcel";

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
    "SALES CONTACT NO", "BUYER", "JOB NO", "STYLE", "COLOR", "COMPOSITION",
    "FINISH DIA", "ORDER QTY", "1st BOOKING", "ADDITIONAL BOOKING",
    "TOTAL REQUIRED YARN BOOKING", "KNITTING WORK ORDER QTY",
    "WORK ORDER SHORT & EXCESS", "RAW YARN DELIVERY", "SHORT & EXCESS (+/-)",
    "RAW YARN DELIVERY FOR DYED", "YARN RECEIVED AFTER DYED",
    "PARTY STOCK (SHORT & EXCESS)", "TOTAL KNITTING (GREY)", "RETURN YARN RECEIVED",
    "BALANCE (+/-)", "GREY DELIVERY FOR DYEING", "GREY RETURN FROM DYEING",
    "GREY RECEIVED FROM DYEING", "FINISH RECEIVED FROM DYEING",
    "FINISH RECEIVED FROM DYEING", "GREY BALANCE (+/-)", "PROCESS LOSS %",
    "FINISH DELIVERY FROM AOP", "FINISH RECEIVED FROM AOP", "AOP FAB. BALANCE (+/-)",
    "AOP PROCESS LOSS (%)", "SENT FOR RE-PROCESS", "RETURN RCVD",
    "RECEIVED AFTER RE-PROCESS (GREY)", "RECEIVED AFTER RE-PROCESS (FINISH)",
    "RE-PROCESS FAB. BALANCE (+/-)", "RE-PROCESS PROCESS LOSS (%)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const sumStr = (str) =>
    str ? str.split("+").reduce((acc, n) => acc + Number(n.trim()), 0) : 0;

const toRow = (rep) => {
    const hasData = rep.totalDelivery || rep.totalReturn || rep.totalOrderQty ||
        rep.totalYarnDyed || rep.totalGreyReceived || rep.totalFinishYarn;

    const computed = hasData ? {
        orderQty:     sumStr(rep.totalOrderQty),
        yarnDyed:     sumStr(rep.totalYarnDyed),
        delivery:     sumStr(rep.totalDelivery),
        return:       sumStr(rep.totalReturn),
        greyReceived: sumStr(rep.totalGreyReceived),
        finishYarn:   sumStr(rep.totalFinishYarn),
    } : { orderQty: 0, yarnDyed: 0, delivery: 0, return: 0, greyReceived: 0, finishYarn: 0 };

    // ⚠️ Adjust field names to match your actual API response
    return [
        rep.salesContactNo               ?? "",
        rep.buyers                       ?? "",
        rep.jobNo                        ?? "",
        rep.style                        ?? "",
        rep.color                        ?? "",
        rep.composition                  ?? "",
        rep.finishDia                    ?? "",
        computed.orderQty,
        rep.firstBooking                 ?? "",
        rep.additionalBooking            ?? "",
        rep.totalRequiredYarnBooking     ?? "",
        rep.knittingWorkOrderQty         ?? "",
        rep.workOrderShortExcess         ?? "",
        rep.rawYarnDelivery              ?? "",
        rep.shortExcess                  ?? "",
        rep.rawYarnDeliveryForDyed       ?? "",
        computed.yarnDyed,
        rep.partyStock                   ?? "",
        rep.totalKnittingGrey            ?? "",
        computed.return,
        rep.balance                      ?? "",
        rep.greyDeliveryForDyeing        ?? "",
        rep.greyReturnFromDyeing         ?? "",
        computed.greyReceived,
        computed.finishYarn,
        rep.finishReceivedFromDyeing2    ?? "",
        rep.greyBalance                  ?? "",
        rep.processLoss                  ?? "",
        rep.finishDeliveryFromAop        ?? "",
        rep.finishReceivedFromAop        ?? "",
        rep.aopFabBalance                ?? "",
        rep.aopProcessLoss               ?? "",
        rep.sentForReProcess             ?? "",
        rep.returnRcvd                   ?? "",
        rep.receivedAfterReProcessGrey   ?? "",
        rep.receivedAfterReProcessFinish ?? "",
        rep.reProcessFabBalance          ?? "",
        rep.reProcessLoss                ?? "",
    ].map(String);
};

// ── Summary Page ──────────────────────────────────────────────────────────────
export default function Summary() {
    const axiosPublic = useAxiosPublic();
    const [rawData, setRawData] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        axiosPublic.get("/api/style-requirement").then((res) => setRawData(res.data));
    }, [axiosPublic]);

    const rows = rawData.map(toRow);

    const {
        filtered, globalSearch, setGlobalSearch,
        colFilters, setColFilter,
        sortCol, sortDir, handleSort,
        clearAll, isActive,
    } = useTableFilter(rows, COLUMNS.length);

    const handleExport = () => exportToExcel(COLUMNS, rows, "style-summary");

    return (
        <DashboardLayout>
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <PlusCircle size={18} />
                </button>
                <button
                    onClick={clearAll}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-colors border border-primary-600"
                >
                    <RefreshCcw size={18} />
                </button>
            </div>

            {showModal && <StyleReqModal setShowModal={setShowModal} />}

            <FilterToolbar
                globalSearch={globalSearch}
                onSearch={setGlobalSearch}
                onClear={clearAll}
                onExport={handleExport}
                isActive={isActive}
                total={rows.length}
                filtered={filtered.length}
            />

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse" style={{ minWidth: "1200px" }}>
                        <thead>
                            <tr>
                                {COLUMNS.map((col, i) => (
                                    <ColumnHeader
                                        key={i}
                                        label={col}
                                        values={rows.map((r) => r[i])}
                                        activeFilter={colFilters[i] ?? new Set()}
                                        onFilterApply={(filter) => setColFilter(i, filter)}
                                        isSorted={sortCol === i}
                                        sortDir={sortDir}
                                        onSort={() => handleSort(i)}
                                    />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="py-10 text-center text-sm text-gray-400">
                                        No rows match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row, ri) => (
                                    <tr key={ri} className="hover:bg-gray-50">
                                        {row.map((cell, ci) => (
                                            <td key={ci} className="px-3 py-2 text-sm text-gray-700 border border-gray-200 whitespace-nowrap align-middle">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}