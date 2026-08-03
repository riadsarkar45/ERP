import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetchData } from "../../../hooks/fetch";
import AopGlance from "./AopGlance";
import DyeingGlance from "./DyeingGlance";
import KnittingGlance from "./KnittingGlance";

const BORDER_COLOR = "#aeb7c2";

const GlanceReport = () => {
    const { fetchData, loading } = useFetchData();

    const [factories, setFactories] = useState([]);
    const [selectOrderType, setSelectOrderType] = useState("knittingOrder");
    const [detailView, setDetailView] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFactoryName, setFactoryName] = useState("");
    const [hideFactories, setHideFactories] = useState(false);

    const filteredFactories = factories.filter((f) =>
        f.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    useEffect(() => {
        fetchData(`/api/party-view-report/knittingOrder`)
            .then((data) => setFactories(data.factoryNames || []))
            .catch((e) => console.error(e));
    }, [fetchData]);

    const partyViews = ["knittingOrder", "dyeingOrder", "aopOrder"];

    let COLUMNS = [];
    if (selectOrderType === "knittingOrder") {
        COLUMNS.push(
            { header: "KNITTING FACTORY NAME", width: 220 },
            { header: "JOB NO.", width: 120 },
            { header: "KNITTING WORK ORDER QTY", width: 220 },
            { header: "YARN DELIVERY", width: 140 },
            { header: "SHORT & EXCESS", width: 140 },
            { header: "YARN DEL. (%)", width: 140 },
            { header: "GREY RECEIVED", width: 140 },
            { header: "YARN RETURN", width: 140 },
            { header: "PARTY STOCK", width: 140 },
             { header: "RECEIVED (%)", width: 140 },
            // { header: "PRICE PER KG", width: 120 },
            // { header: "PAYABLE AMOUNT", width: 180 }
        );
    }
    if (selectOrderType === "dyeingOrder") {
        COLUMNS.push(
            { header: "DYEING FACTORY NAME", width: 220 },
            { header: "JOB NO.", width: 120 },
            { header: "DYEING WORK ORDER QTY", width: 220 },
            { header: "GREY DELIVERY", width: 140 },
            { header: "GREY DEV SHORT & EXCESS", width: 140 },
            { header: "DELIVERY (%)", width: 140 },
            { header: "GREY RETURN", width: 140 },
            { header: "GREY RECEIVE", width: 140 },
                   // <-- Fixed: Added Grey Return
            { header: "FINISH RECEIVE", width: 140 },
            { header: "PROCESS LOSS", width: 140 },
            // { header: "PRICE PER KG", width: 120 },
            { header: "PARTY STOCK", width: 180 },
            { header: "RECEIVED (%)", width: 140 },
        );
    }
    if (selectOrderType === "aopOrder") {
        COLUMNS.push(
            { header: "AOP FACTORY NAME", width: 220 },
            { header: "JOB NO.", width: 120 },
            { header: "AOP WORK ORDER QTY", width: 220 },
            { header: "SENT FOR AOP", width: 140 },
            { header: "DEL.SHORT & EXCESS", width: 140 },
             { header: "DELIVERY (%)", width: 140 },
            { header: "RECEIVE FROM AOP", width: 140 },
            { header: "FINISH RECEIVED FROM AOP", width: 140 },
            { header: "RETURN FROM AOP", width: 140 },
            { header: "PROCESS LOSS", width: 180 },
            { header: "PARTY STOCK", width: 140 },            
            // { header: "PRICE PER KG", width: 120 },            
            { header: "RECEIVED (%)", width: 140 },
        );
    }

    const handleOrderType = (orderType) => {
        setSelectOrderType(orderType);
        setDetailView([]);
        setSearchTerm("");
        setFactoryName("");

        fetchData(`/api/party-view-report/${orderType}`)
            .then((data) => setFactories(data.factoryNames || []) )
            .catch((e) => console.error(e));
    };

    const handleFetchDetail = (factoryName) => {
        setFactoryName(factoryName);
        fetchData(`/api/glance-report/${factoryName}/${selectOrderType}`)
            .then((data) => {setDetailView(data.data || []), console.log(data);})
            .catch((e) => console.error(e));
    };

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-300 pb-2 mb-4">
                {partyViews.map((v, i) => (
                    <button
                        key={i}
                        onClick={() => handleOrderType(v)}
                        className={`px-4 py-2 text-sm uppercase font-medium transition-colors ${selectOrderType === v
                                ? "bg-blue-800 text-white"
                                : "bg-blue-100 text-blue-900 hover:bg-blue-200"
                            }`}
                    >
                        {v}
                    </button>
                ))}
                {loading && (
                    <button className="animate-spin text-blue-800">
                        <Loader2 />
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="mb-4">
                <div className="flex gap-2 items-center">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search Factory"
                            className="w-full border border-gray-300 outline-none pl-10 pr-4 py-2 text-sm bg-white rounded"
                        />
                    </div>
                    <button
                        onClick={() => setHideFactories((prev) => !prev)}
                        className="bg-blue-100 text-blue-900 px-4 py-2 text-sm font-medium hover:bg-blue-200 transition-colors rounded"
                    >
                        {hideFactories ? "Show Factories" : "Hide Factories"}
                    </button>
                </div>
            </div>

            {/* Factory List */}
            <div className={`${hideFactories ? "hidden" : ""} grid grid-cols-10 gap-2 border-b border-gray-300 pb-3 mb-5 max-h-48 overflow-y-auto`}>
                {filteredFactories.length === 0 ? (
                    <div className="col-span-10 text-sm text-gray-500 py-2">
                        No factories match "{searchTerm}".
                    </div>
                ) : (
                    filteredFactories.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => handleFetchDetail(f)}
                            className={`${selectedFactoryName === f
                                    ? "bg-yellow-100 border-yellow-400 text-yellow-900"
                                    : "bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100"
                                } p-2 text-sm font-semibold transition-colors text-left truncate rounded`}
                        >
                            {f}
                        </button>
                    ))
                )}
            </div>

            {/* ERP Table */}
            <div style={{ border: `2px solid ${BORDER_COLOR}`, background: "#fff", borderRadius: "4px" }}>
                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "80vh" }}>
                    <table style={{ width: "100%", minWidth: "1500px", tableLayout: "fixed", borderCollapse: "collapse", borderSpacing: 0, background: "#fff" }}>
                        <colgroup>
                            {COLUMNS.map((col, i) => (
                                <col key={i} style={{ width: `${col.width}px` }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {COLUMNS.map((col, i) => (
                                    <th
                                        key={i}
                                        style={{
                                            position: "sticky", top: 0, zIndex: 5,
                                            border: `1px solid ${BORDER_COLOR}`, borderBottom: `2px solid ${BORDER_COLOR}`,
                                            backgroundColor: "#f3f4f6", padding: "10px 8px", textAlign: "center",
                                            fontSize: "12px", fontWeight: 600, color: "#374151",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {col.header}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {selectOrderType === "knittingOrder" && <KnittingGlance detailView={detailView} />}
                        {selectOrderType === "dyeingOrder" && <DyeingGlance detailView={detailView} />}
                        {selectOrderType === "aopOrder" && <AopGlance detailView={detailView} />}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GlanceReport;