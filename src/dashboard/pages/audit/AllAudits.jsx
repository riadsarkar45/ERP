import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import useAxiosPublic from "../../../hooks/Axios";

const STATUS_CONFIG = {
    pending:  { label: "Pending",  bg: "bg-yellow-50",  border: "border-yellow-400", badge: "bg-yellow-100 text-yellow-700 border-yellow-400" },
    complete: { label: "Complete", bg: "bg-green-50",   border: "border-green-400",  badge: "bg-green-100 text-green-700 border-green-400"   },
    canceled: { label: "Canceled", bg: "bg-red-50",     border: "border-red-400",    badge: "bg-red-100 text-red-700 border-red-400"         },
};

const AllAudits = () => {
    const axiosPublic = useAxiosPublic();
    const [audits, setAudits] = useState([]);
    const [loadingId, setLoadingId] = useState(null);

    useEffect(() => {
        const allAudits = async () => {
            const res = await axiosPublic.get("/api/audits");
            setAudits(res.data);
        };
        allAudits();
    }, [axiosPublic]);

    const handleChangeAuditStatus = async (auditId, newStatus) => {
        setLoadingId(auditId);
        const res = await axiosPublic.patch(`/api/update-audit/${auditId}/${newStatus}`);
        if (res.status === 201) {
            const updated = await axiosPublic.get("/api/audits");
            setAudits(updated.data);
        }
        setLoadingId(null);
    };

    return (
        <DashboardLayout>
            <div className="space-y-3">
                {audits?.map((audit) => {
                    const config = STATUS_CONFIG[audit.auditType] || STATUS_CONFIG.pending;
                    const isLoading = loadingId === audit.id;

                    return (
                        <div
                            key={audit.id}
                            className={`${config.bg} ${config.border} border rounded-lg p-4 transition-all duration-200`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                {/* Left — title + dates */}
                                <div className="flex-1 min-w-0">
                                    <h2 className="font-semibold text-gray-800 text-sm truncate">
                                        {audit.auditTitle}
                                    </h2>
                                    <div className="flex gap-4 mt-1">
                                        <span className="text-xs text-gray-500">
                                            Start: <span className="text-gray-700">{audit.auditStartDate}</span>
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            End: <span className="text-gray-700">{audit.auditEndDate}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Right — status dropdown */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {isLoading && (
                                        <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                    )}
                                    <select
                                        value={audit.auditType}
                                        disabled={isLoading}
                                        onChange={(e) => handleChangeAuditStatus(audit.id, e.target.value)}
                                        className={`
                                            ${config.badge}
                                            border rounded-md text-xs font-semibold px-2 py-1.5
                                            cursor-pointer outline-none appearance-none
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            transition-all duration-150
                                        `}
                                    >
                                        <option value="pending">⏳ Pending</option>
                                        <option value="complete">✅ Complete</option>
                                        <option value="canceled">❌ Canceled</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {audits.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-10">
                        No audits found.
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AllAudits;