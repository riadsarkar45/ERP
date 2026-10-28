import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, RefreshCcw } from 'lucide-react';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';
import UseResponsibleUsers from '../users/allUsers/ResponsibleUsers';
import Input from '../../../components/Input';

// where "View" and "New" go; change these if your routes are different
const viewPath = (id) => `/dashboard/debit-notes/${id}`;
const NEW_PATH = '/dashboard/debit-notes/new';

const PAGE_SIZE = 20;

const TABS = [
    { id: '', label: 'All' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'PENDING', label: 'Pending approval' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Rejected' },
];

const STATUS_STYLE = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    APPROVED: 'bg-green-100 text-green-800 border-green-300',
    REJECTED: 'bg-red-100 text-red-700 border-red-300',
};

const pad = (n) => String(n).padStart(2, '0');
const formatDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const DebitNoteLists = () => {
    const navigate = useNavigate();
    const axiosSecure = useAxiosPrivate();
    const { allResponsibleUsers, setUserResponsibility, setResponsibleSection } = UseResponsibleUsers();

    useEffect(() => {
        setUserResponsibility("responsibleForApprovalDebitNote");
        setResponsibleSection("debitNote")
    }, [setUserResponsibility, setResponsibleSection])

    console.log(allResponsibleUsers, "all responsible users");

    const [status, setStatus] = useState('');
    const [searchText, setSearchText] = useState('');
    const [query, setQuery] = useState(''); // the search that is actually applied
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, page: 1, limit: PAGE_SIZE });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    // refetch whenever the tab, search, page or refresh button changes
    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            setLoading(true);
            setError('');
            try {
                const res = await axiosSecure.get('/api/debit-notes', {
                    params: {
                        status: status || undefined,
                        q: query || undefined,
                        page,
                        limit: PAGE_SIZE,
                    },
                    signal: controller.signal,
                });
                setData(res.data);
            } catch (err) {
                if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
                console.error('Failed to load debit notes', err);
                setError(err?.response?.data?.message || 'Failed to load debit notes');
                setData({ items: [], total: 0, page: 1, limit: PAGE_SIZE });
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [axiosSecure, status, query, page, reloadKey]);

    const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

    const changeTab = (id) => {
        setStatus(id);
        setPage(1);
    };

    const submitSearch = (e) => {
        e.preventDefault();
        setQuery(searchText.trim());
        setPage(1);
    };

    const clearSearch = () => {
        setSearchText('');
        setQuery('');
        setPage(1);
    };

    const handleDebitNoteApproveRequest = async (e, debitNoteId) => {
        console.log(e);

        if (!e || !debitNoteId) return;

        console.log(e, debitNoteId);

        try {
            const response = await axiosSecure.patch(
                `/api/request-for-debit-note-approval/debitNoteApproval/${debitNoteId}/${e}`
            );

            console.log(response.data);
        } catch (error) {
            console.log("BACKEND RESPONSE:", error.response?.data);
            console.log("STATUS:", error.response?.status);
        }

    }

    return (
        <div className="bg-white p-4">
            {/* header: search, refresh, new */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <h1 className="text-lg font-semibold mr-auto">Debit Notes</h1>

                <form onSubmit={submitSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search title or note no."
                        className="border rounded-md px-3 py-2 text-sm w-56"
                    />
                    <button
                        type="submit"
                        className="border rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    >
                        Search
                    </button>
                    {query && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="border rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
                        >
                            Clear
                        </button>
                    )}
                </form>

                <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    title="Refresh"
                    className="border p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                >
                    <RefreshCcw className={loading ? 'animate-spin' : ''} size={18} />
                </button>

                <button
                    type="button"
                    onClick={() => navigate(NEW_PATH)}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded-md px-3 py-2 text-sm"
                >
                    <Plus size={16} /> New debit note
                </button>
            </div>

            {/* status tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => changeTab(t.id)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${status === t.id
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            {/* table */}
            <div className={`overflow-x-auto border rounded-lg ${loading ? 'opacity-60' : ''}`}>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                        <tr>
                            <th className="px-3 py-2">Note No</th>
                            <th className="px-3 py-2">Title / Party</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Created By</th>
                            <th className="px-3 py-2">Created</th>
                            <th className="px-3 py-2">Reviewed By</th>
                            <th className="px-3 py-2">Request For Approval</th>
                            <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((n) => (
                            <tr
                                key={n.id}
                                className="border-t hover:bg-gray-50 cursor-pointer"
                            >
                                <td className="px-3 py-2 tabular-nums">{n.noteNo ?? `#${n.id}`}</td>
                                <td className="px-3 py-2 font-medium">{n.title}</td>
                                <td className="px-3 py-2">
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[n.status] ?? STATUS_STYLE.DRAFT
                                            }`}
                                    >
                                        {n.status}
                                    </span>
                                </td>
                                <td className="px-3 py-2">{n.creator?.name ?? '-'}</td>
                                <td className="px-3 py-2">{formatDate(n.createdAt)}</td>
                                <td className="px-3 py-2">{n.reviewer?.name ?? '-'}</td>
                                <td className="px-3 py-2">

                                    <Input
                                        type="select"
                                        name={`responsibleUser-${n.id}`}
                                        label="Request For Approval"
                                        placeholder="Select responsible user"
                                        options={(allResponsibleUsers ?? [])
                                            .filter((item) => item?.user?.name)
                                            .map((item) => item.user.name)}
                                        onChange={(e) => {
                                            const selectedUser = allResponsibleUsers.find(
                                                (item) => item.user?.name === e.target.value
                                            );

                                            if (selectedUser) {
                                                handleDebitNoteApproveRequest(
                                                    selectedUser.user.id,
                                                    n.id
                                                );
                                            }
                                        }}
                                        required
                                    />

                                </td>

                                <td className="px-3 py-2 text-right">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation(); // don't trigger the row click twice
                                            navigate(viewPath(n.id));
                                        }}
                                        className="inline-flex items-center gap-1 border rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
                                    >
                                        <Eye size={14} /> View
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!loading && data.items.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                                    No debit notes found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                <span>{data.total} total</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => p - 1)}
                        className="border rounded-md px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}
                        className="border rounded-md px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DebitNoteLists;