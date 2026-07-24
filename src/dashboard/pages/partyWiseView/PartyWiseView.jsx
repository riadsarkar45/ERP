import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetchData } from "../../../hooks/fetch";
import KnittingDetail from "./KnittingDetail";
import DyeingDetail from "./DyeingDetail";

const BORDER_COLOR = "#aeb7c2";

const PartyWiseView = () => {
    const { fetchData, loading, error } = useFetchData();

    const [factories, setFactories] = useState([]);
    const [selectOrderType, setSelectOrderType] = useState("knittingOrder");
    const [detailView, setDetailView] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFactoryName, setFactoryName] = useState("")
    const [hideFactories, setHideFactories] = useState(false)
    const filteredFactories = factories.filter((f) =>
        f.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    useEffect(() => {
        fetchData(`/api/party-view-report/knittingOrder`)
            .then((data) => {
                setFactories(data.factoryNames || []);
            })
            .catch((e) => console.error(e));
    }, [fetchData]);

    const partyViews = ["knittingOrder", "dyeingOrder", "aopOrder"];

    let COLUMNS = [];
    if (selectOrderType === "knittingOrder") {
        COLUMNS.push(
            { header: "KNITTING FACTORY NAME", width: 220 },
            { header: "JOB NO.", width: 120 },
            { header: "COMPOSITION", width: 320 },
            { header: "PRICE PER KG", width: 120 },
            { header: "KNITTING WORK ORDER QTY", width: 220 },
            { header: "YARN DELIVERY", width: 140 },
            { header: "SHORT & EXCESS", width: 140 },
            { header: "GREY RECEIVED", width: 140 },
            { header: "YARN RETURN", width: 140 },
            { header: "BALANCE", width: 140 },
            { header: "PAYABLE AMOUNT", width: 180 },

        )
    }
    if (selectOrderType === "dyeingOrder") {
        COLUMNS.push(
            { header: "DYEING FACTORY NAME", width: 220 },
            { header: "JOB NO.", width: 120 },
            { header: "COMPOSITION", width: 320 },
            { header: "PRICE PER KG", width: 120 },
            { header: "DYEING WORK ORDER QTY", width: 220 },
            { header: "GREY DELIVERY", width: 140 },
            { header: "GREY RECEIVE", width: 140 },
            { header: "GREY DEV SHORT & EXCESS", width: 140 },
            { header: "FINISH RECEIVE", width: 140 },
            { header: "FINISH RCV SHORT & EXCESS", width: 140 },
            { header: "GREY RECEIVED", width: 140 },
            { header: "PAYABLE AMOUNT", width: 180 },

        )
    }
    if (selectOrderType === "aopOrder") {
        COLUMNS.push(
            { header: "KNITTING FACTORY NAME", width: 220 },
            { header: "JOB NO.", width: 120 },
            { header: "COMPOSITION", width: 320 },
            { header: "PRICE PER KG", width: 120 },
            { header: "KNITTING WORK ORDER QTY", width: 220 },
            { header: "YARN DELIVERY", width: 140 },
            { header: "SHORT & EXCESS", width: 140 },
            { header: "GREY RECEIVED", width: 140 },
            { header: "YARN RETURN", width: 140 },
            { header: "BALANCE", width: 140 },
            { header: "PAYABLE AMOUNT", width: 180 },

        )
    }

    const handleOrderType = (orderType) => {
        setSelectOrderType(orderType);
        setDetailView([]);
        setSearchTerm("");

        fetchData(`/api/party-view-report/${orderType}`)
            .then((data) => {
                setFactories(data.factoryNames || []);
                console.log(data);

            })
            .catch((e) => console.error(e));
    };

    const handleFetchDetail = (factoryName) => {
        setFactoryName(factoryName)
        fetchData(
            `/api/detail-party-report/${factoryName}/${selectOrderType}`
        )
            .then((data) => {
                setDetailView(data.data || []);
                console.log(data, "kkk");

            })
            .catch((e) => console.error(e));
    };

    const hideFactory = () => {
        setHideFactories(prev => !prev);
    };

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-300 pb-2 mb-4">
                {partyViews.map((v, i) => (
                    <button
                        key={i}
                        onClick={() => handleOrderType(v)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${selectOrderType === v
                            ? "bg-blue-800 text-white"
                            : "bg-blue-100 text-blue-900 hover:bg-blue-200"
                            }`}
                    >
                        {v}
                    </button>
                ))}
                {
                    loading && <button className="animate-spin">
                        <Loader2 />
                    </button>
                }
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
                            className="w-full border border-gray-300 outline-none pl-10 pr-4 py-2 text-sm bg-white"
                        />
                    </div>

                    <button onClick={() => hideFactory()} className="bg-blue-100 text-blue-900 px-4 py-2 text-sm font-medium hover:bg-blue-200 transition-colors">
                        Hide Factories
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
                            className={`${selectedFactoryName === f ? "bg-yellow-800 text-yellow-900 bg-opacity-30" : "bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100"}  p-2 text-sm font-semibold  transition-colors text-left truncate`}
                        >
                            {f}
                        </button>
                    ))
                )}
            </div>

            {/* ERP Table */}
            <div
                style={{
                    border: `2px solid ${BORDER_COLOR}`,
                    background: "#fff",
                }}
            >
                <div
                    style={{
                        overflowX: "auto",
                        overflowY: "auto",
                        maxHeight: "80vh",
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            minWidth: "1900px",
                            tableLayout: "fixed",
                            borderCollapse: "collapse",
                            borderSpacing: 0,
                            border: `2px solid ${BORDER_COLOR}`,
                            background: "#fff",
                        }}
                    >
                        <colgroup>
                            {COLUMNS.map((col, i) => (
                                <col
                                    key={i}
                                    style={{
                                        width: `${col.width}px`,
                                    }}
                                />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {COLUMNS.map((col, i) => (
                                    <th
                                        key={i}
                                        style={{
                                            position: "sticky",
                                            top: 0,
                                            zIndex: 5,

                                            border: `1px solid ${BORDER_COLOR}`,
                                            borderBottom: `2px solid ${BORDER_COLOR}`,

                                            backgroundColor: "#f3f4f6",

                                            padding: "10px 8px",

                                            textAlign: "center",

                                            fontSize: "12px",
                                            fontWeight: 600,

                                            color: "#374151",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                width: "100%",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {col.header}
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                right: "-4px",
                                                width: "8px",
                                                height: "100%",
                                                cursor: "col-resize",
                                                zIndex: 100,
                                                backgroundColor:
                                                    "transparent",
                                            }}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                         {
                            selectOrderType === "knittingOrder" && <KnittingDetail/>
                         }       
                        <DyeingDetail detailView={detailView} />
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PartyWiseView;