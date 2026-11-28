import React, { useCallback, useEffect, useState } from "react";
import { Activity, Eye, Monitor, Users } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useSocket } from "../../../../hooks/socket.io/socketContext";

const formatTime = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleTimeString();
};

const statusStyles = {
    working: "bg-emerald-50 text-emerald-700 border-emerald-200",
    viewing: "bg-blue-50 text-blue-700 border-blue-200",
    background: "bg-slate-100 text-slate-600 border-slate-200",
};

const statusLabels = {
    working: "Working",
    viewing: "Viewing",
    background: "Background",
};

const UserActivityPanel = () => {
    const socket = useSocket();
    const { user, accessToken } = useAuth();
    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);

    const isAdmin = ["ADMIN", "SUPER ADMIN"].includes(
        String(user?.accountRole || "").trim().toUpperCase()
    );

    const loadActivity = useCallback(() => {
        if (!isAdmin || !accessToken || !socket?.connected) return;

        socket.emit(
            "monitoring:user-activity:request",
            { token: accessToken },
            (result) => {
                if (result?.success) {
                    setSnapshot(result);
                    setError("");
                    setUpdatedAt(new Date());
                } else {
                    setError(result?.message || "Unable to load user activity");
                }
            }
        );
    }, [accessToken, isAdmin, socket]);

    useEffect(() => {
        if (!isAdmin) return undefined;

        socket.on("connect", loadActivity);
        if (socket.connected) loadActivity();

        const timer = window.setInterval(loadActivity, 10000);
        return () => {
            window.clearInterval(timer);
            socket.off("connect", loadActivity);
        };
    }, [isAdmin, loadActivity, socket]);

    if (!isAdmin) return null;

    const summary = snapshot?.summary || {
        total: 0,
        working: 0,
        viewing: 0,
        background: 0,
        modules: 0,
    };

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity className="text-blue-600" size={19} />
                        <h2 className="font-bold text-slate-800">Live User Activity</h2>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            LIVE
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Current page and recent interaction status. Updates every 10 seconds.
                    </p>
                </div>
                <span className="text-[11px] text-slate-400">
                    {updatedAt ? `Updated ${formatTime(updatedAt)}` : "Waiting for activity"}
                </span>
            </div>

            {error && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500"><Users size={14} /> Online sessions</div>
                    <p className="mt-1 text-2xl font-bold text-slate-800">{summary.total}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-700"><Activity size={14} /> Working</div>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">{summary.working}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-blue-700"><Eye size={14} /> Viewing</div>
                    <p className="mt-1 text-2xl font-bold text-blue-800">{summary.viewing}</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600"><Monitor size={14} /> Background</div>
                    <p className="mt-1 text-2xl font-bold text-slate-700">{summary.background}</p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">User sessions</h3>
                <span className="text-xs text-slate-500">{summary.modules} active pages</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-3 py-2.5">User</th>
                            <th className="px-3 py-2.5">Current page</th>
                            <th className="px-3 py-2.5">Working station</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Last activity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(snapshot?.sessions || []).map((session) => (
                            <tr key={session.sessionKey} className="hover:bg-slate-50">
                                <td className="px-3 py-2.5">
                                    <p className="font-semibold text-slate-800">{session.name}</p>
                                    <p className="text-[11px] text-slate-500">ID {session.userId} · {session.role}</p>
                                </td>
                                <td className="px-3 py-2.5">
                                    <p className="font-medium text-slate-700">{session.page}</p>
                                    <p className="max-w-[260px] truncate text-[11px] text-slate-400">{session.path}</p>
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">{session.workingStation || "—"}</td>
                                <td className="px-3 py-2.5">
                                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${statusStyles[session.status] || statusStyles.background}`}>
                                        {statusLabels[session.status] || session.status}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-xs text-slate-500">{formatTime(session.lastInteractionAt)}</td>
                            </tr>
                        ))}
                        {(!snapshot?.sessions || snapshot.sessions.length === 0) && (
                            <tr>
                                <td colSpan="5" className="px-3 py-8 text-center text-sm text-slate-400">
                                    {error ? "Activity data is unavailable." : "No active user sessions yet."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-[11px] text-slate-400">
                A session expires after 90 seconds without a heartbeat. Multiple tabs are shown as separate sessions.
            </p>
        </section>
    );
};

export default UserActivityPanel;
