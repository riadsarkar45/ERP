import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { ArrowLeft, Pencil, Printer } from 'lucide-react';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';

// ───────────────────────── config ─────────────────────────
const LIST_PATH = '/debit-notes';
const editPath = (id) => `/dashboard/edit-debit-notes/${id}`; // the DebitNote editor page

// true = Print / PDF is enabled only after the note is approved
const PRINT_ONLY_WHEN_APPROVED = true;

const STATUS_STYLE = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    APPROVED: 'bg-green-100 text-green-800 border-green-300',
    REJECTED: 'bg-red-100 text-red-700 border-red-300',
};

// same look as the editor page (tables, headings, lists), without the editing-only styles
const VIEW_CLASS = [
    'outline-none',
    '[&_p]:mb-1.5 [&_p]:min-h-[1em]',
    '[&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:mb-3',
    '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-1.5',
    '[&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_table]:my-2 [&_table]:overflow-hidden',
    '[&_td]:relative [&_td]:border [&_td]:border-gray-800 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_td]:min-w-[40px] [&_td]:box-border',
    '[&_th]:relative [&_th]:border [&_th]:border-gray-800 [&_th]:px-2 [&_th]:py-1.5 [&_th]:align-top [&_th]:min-w-[40px] [&_th]:box-border',
    '[&_th]:bg-gray-100 [&_th]:font-bold [&_th]:text-left',
].join(' ');

// ───────────────────────── helpers ─────────────────────────
const pad = (n) => String(n).padStart(2, '0');

const formatDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Info = ({ label, value }) => (
    <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800">{value}</p>
    </div>
);

// ───────────────────────── component ─────────────────────────
const ViewDebitNote = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const axiosSecure = useAxiosPrivate();

    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // read-only editor: used only to render the saved document exactly like the editor does
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: '',
        editable: false,
        editorProps: {
            attributes: { class: VIEW_CLASS },
        },
    });

    // load the note
    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            setLoading(true);
            setError('');
            setNote(null);
            try {
                const res = await axiosSecure.get(`/api/debit-notes/${id}`, {
                    signal: controller.signal,
                });
                setNote(res.data);
            } catch (err) {
                if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
                console.error('Failed to load debit note', err);
                setError(err?.response?.data?.message || 'Failed to load debit note');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [axiosSecure, id]);

    // put the saved HTML into the read-only editor
    useEffect(() => {
        if (editor && note) editor.commands.setContent(note.content);
    }, [editor, note]);

    if (!editor) return null;

    const status = note?.status;
    const printDisabled = PRINT_ONLY_WHEN_APPROVED && status !== 'APPROVED';

    return (
        <div className="bg-gray-100 min-h-screen p-4 print:bg-white print:p-0 print:min-h-0">
            {/*
              Tailwind has no utility for @page or for hiding the rest of the app while printing,
              so this is the only raw CSS: A4 paper size + show only the debit note page.
            */}
            <style>{`
                @page { size: A4; margin: 12mm; }
                @media print {
                    body * { visibility: hidden; }
                    #debit-note-view, #debit-note-view * { visibility: visible; }
                    #debit-note-view { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>

            {/* ───────── header ───────── */}
            <div className=" mx-auto mb-3 bg-white border rounded-lg p-3 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(LIST_PATH)}
                        className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100"
                        title="Back to list"
                    >
                        <ArrowLeft size={16} />
                    </button>

                    <div className="mr-auto min-w-0">
                        <h1 className="text-base font-semibold truncate">
                            {note ? note.title : 'Debit Note'}
                        </h1>
                        {note && (
                            <p className="text-xs text-gray-500 tabular-nums">
                                {note.noteNo ?? `#${note.id}`}
                            </p>
                        )}
                    </div>

                    {status && (
                        <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                STATUS_STYLE[status] ?? STATUS_STYLE.DRAFT
                            }`}
                        >
                            {status}
                        </span>
                    )}

                    {/* only the creator, while the note is still editable, gets this button */}
                    {note?.permissions?.canEdit && (
                        <button
                            type="button"
                            onClick={() => navigate(editPath(note.id))}
                            className="flex items-center gap-1 p-2 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-100"
                        >
                            <Pencil size={16} /> Edit
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={!note || printDisabled}
                        onClick={() => window.print()}
                        title={printDisabled ? 'Available after approval' : 'Print / Save as PDF'}
                        className={`flex items-center gap-1 p-2 rounded-md border text-sm transition-colors ${
                            !note || printDisabled
                                ? 'border-gray-200 text-gray-400 opacity-40 cursor-not-allowed'
                                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <Printer size={16} /> Print / PDF
                    </button>
                </div>

                {loading && <p className="text-sm text-gray-400 mt-3">Loading…</p>}
                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                {note && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t">
                        <Info label="Created by" value={note.creator?.name ?? '-'} />
                        <Info label="Created" value={formatDateTime(note.createdAt)} />
                        <Info label="Submitted" value={formatDateTime(note.submittedAt)} />
                        <Info label="Last updated" value={formatDateTime(note.updatedAt)} />
                    </div>
                )}

                {status === 'REJECTED' && note?.reviewRemark && (
                    <div className="mt-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md p-3">
                        <strong>Rejected:</strong> {note.reviewRemark}
                    </div>
                )}

                {status === 'PENDING' && (
                    <p className="text-sm text-amber-700 mt-3">Waiting for approval.</p>
                )}
            </div>

            {/* ───────── A4 page ───────── */}
            {note && (
                <div
                    id="debit-note-view"
                    className=" mx-auto bg-white shadow-md p-[15mm] text-[14px] text-black print:shadow-none print:p-0 print:max-w-none [print-color-adjust:exact]"
                >
                    <EditorContent editor={editor} />

                    {status === 'APPROVED' && (
                        <div className="mt-6 pt-2 border-t border-gray-400 text-xs text-gray-700">
                            Approved{note.noteNo ? ` · ${note.noteNo}` : ''}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ViewDebitNote;