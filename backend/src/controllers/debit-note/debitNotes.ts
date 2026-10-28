import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import prisma from "../../database/prismaClient/prisma";

// ───────────────────────── CONFIG ─────────────────────────
const APPROVER_ROLES = ["SUPER ADMIN", "ADMIN"]; // who can approve / reject
const ALLOW_SELF_APPROVAL = false;               // true = approvers may approve their own notes
const MAX_CONTENT_LENGTH = 100_000;              // characters of HTML
// ──────────────────────────────────────────────────────────

const STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED"] as const;
const EDITABLE = ["DRAFT", "REJECTED"];

type Actor = { id: number; role: string };

// Reads the logged-in user from your authenticate middleware.
// Adjust the field names here if your req.user looks different.
const getActor = (req: Request): Actor | null => {
    const u = (req as any).user;
    if (!u) return null;
    const id = Number(u.id ?? u.userId);
    const role = String(u.userRole ?? u.role ?? "").toUpperCase();
    return Number.isInteger(id) && id > 0 ? { id, role } : null;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (res: Response, code: number, message: string) =>
    res.status(code).send({ message, type: "error" });

const parseId = (req: Request): number | null => {
    const n = Number(str(req.params.id));
    return Number.isInteger(n) && n > 0 ? n : null;
};

const isApprover = (a: Actor) => APPROVER_ROLES.includes(a.role);

type NoteLike = {
    status: string;
    createdBy?: number | null;
    userId?: number | null;
};

const permissionsFor = (note: NoteLike, a: Actor) => {
    const isOwner = (note.createdBy ?? note.userId) === a.id;
    const editable = EDITABLE.includes(note.status);
    return {
        canEdit: isOwner && editable,
        canSubmit: isOwner && editable,
        canReview:
            isApprover(a) && note.status === "PENDING" && (ALLOW_SELF_APPROVAL || !isOwner),
        canDelete: (isOwner || a.role === "SUPER ADMIN") && editable,
    };
};

const canView = (note: NoteLike, a: Actor) =>
    (note.createdBy ?? note.userId) === a.id || isApprover(a);

// The stored HTML is later rendered in other people's browsers, so only allow
// what the editor can actually produce.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [
        "h1", "h2", "h3", "p", "br", "hr", "blockquote",
        "strong", "b", "em", "i", "u", "s",
        "ul", "ol", "li",
        "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col",
    ],
    allowedAttributes: {
        "*": ["style"],
        th: ["colspan", "rowspan", "data-colwidth"],
        td: ["colspan", "rowspan", "data-colwidth"],
    },
    allowedStyles: {
        "*": { "text-align": [/^(left|right|center|justify)$/] },
        table: {
            "min-width": [/^\d+(\.\d+)?px$/],
            width: [/^\d+(\.\d+)?(px|%)$/],
        },
        col: {
            "min-width": [/^\d+(\.\d+)?px$/],
            width: [/^\d+(\.\d+)?(px|%)$/],
        },
    },
};

const parseBody = (
    body: unknown
): { title: string; content: string } | { error: string } => {
    const b = (body ?? {}) as Record<string, unknown>;
    const title = str(b.title);
    const raw = typeof b.content === "string" ? b.content : "";

    if (!title) return { error: "Title is required" };
    if (title.length > 150) return { error: "Title is too long (max 150 characters)" };
    if (!raw.trim()) return { error: "Content is required" };
    if (raw.length > MAX_CONTENT_LENGTH) return { error: "Document is too large" };

    return { title, content: sanitizeHtml(raw, SANITIZE_OPTIONS) };
};

const loadNote = (id: number) =>
    prisma.debitNote.findUnique({ where: { id } });

const serialize = <T extends NoteLike>(note: T, actor: Actor) => ({
    ...note,
    permissions: permissionsFor(note, actor),
});

// ───────────────────────── handlers ─────────────────────────

// POST /debit-notes
export const createDebitNote = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        if (!actor) return fail(res, 401, "Not authenticated");

        const input = parseBody(req.body);
        if ("error" in input) return fail(res, 400, input.error);

        const row = await prisma.debitNote.create({
            data: { title: input.title, content: input.content, userId: actor.id },
        });

        const noteNo = `DN-${new Date().getFullYear()}-${String(row.id).padStart(6, "0")}`;
        const created = await prisma.debitNote.update({
            where: { id: row.id },
            data: { noteNo },
        });

        return res.status(201).send(serialize({ ...created, createdBy: actor.id }, actor));
    } catch (err) {
        console.error("createDebitNote failed:", err);
        return fail(res, 500, "Failed to create debit note");
    }
};

// GET /debit-notes?status=&q=&page=&limit=
export const listDebitNotes = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        if (!actor) return fail(res, 401, "Not authenticated");

        const page = Math.max(1, parseInt(str(req.query.page), 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(str(req.query.limit), 10) || 20));
        const status = str(req.query.status).toUpperCase();
        const q = str(req.query.q);

        const where: Prisma.debitNoteWhereInput = {
            // approvers see everything, everyone else sees only their own notes
            ...(isApprover(actor) ? {} : { userId: actor.id }),
            ...((STATUSES as readonly string[]).includes(status) ? { status } : {}),
            ...(q
                ? {
                      OR: [
                          { title: { contains: q, mode: "insensitive" } },
                          { noteNo: { contains: q, mode: "insensitive" } },
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.debitNote.findMany({
                where,
                orderBy: { id: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    noteNo: true,
                    title: true,
                    status: true,
                    createdAt: true,
                    submittedAt: true,
                    // reviewedAt: true,
                },
            }),
            prisma.debitNote.count({ where }),
        ]);

        return res.send({ items, total, page, limit });
    } catch (err) {
        console.error("listDebitNotes failed:", err);
        return fail(res, 500, "Failed to load debit notes");
    }
};

// GET /debit-notes/:id
export const getDebitNote = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        if (!actor) return fail(res, 401, "Not authenticated");

        const id = parseId(req);
        if (!id) return fail(res, 400, "Invalid id");

        const note = await loadNote(id);
        if (!note) return fail(res, 404, "Debit note not found");
        if (!canView(note, actor)) return fail(res, 403, "You cannot view this debit note");

        return res.send(serialize(note, actor));
    } catch (err) {
        console.error("getDebitNote failed:", err);
        return fail(res, 500, "Failed to load debit note");
    }
};

// PUT /debit-notes/:id   (owner only, while DRAFT or REJECTED)
export const updateDebitNote = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        if (!actor) return fail(res, 401, "Not authenticated");

        const id = parseId(req);
        if (!id) return fail(res, 400, "Invalid id");

        const input = parseBody(req.body);
        if ("error" in input) return fail(res, 400, input.error);

        const note = await prisma.debitNote.findUnique({
            where: { id },
            select: { status: true },
        });
        if (!note) return fail(res, 404, "Debit note not found");
        if (!permissionsFor(note, actor).canEdit) {
            return fail(res, 403, "This debit note can no longer be edited");
        }

        // the status check is repeated in the WHERE so a concurrent submit can't be overwritten
        const result = await prisma.debitNote.updateMany({
            where: { id, status: { in: EDITABLE } },
            data: { title: input.title, content: input.content },
        });
        if (result.count === 0) {
            return fail(res, 409, "The debit note changed state. Please reload.");
        }

        const fresh = await loadNote(id);
        if (!fresh) return fail(res, 404, "Debit note not found");
        return res.send(serialize(fresh, actor));
    } catch (err) {
        console.error("updateDebitNote failed:", err);
        return fail(res, 500, "Failed to update debit note");
    }
};

// POST /debit-notes/:id/submit   (owner: DRAFT/REJECTED -> PENDING)
// export const submitDebitNote = async (req: Request, res: Response) => {
//     try {
//         const actor = getActor(req);
//         if (!actor) return fail(res, 401, "Not authenticated");

//         const id = parseId(req);
//         if (!id) return fail(res, 400, "Invalid id");

//         const note = await prisma.debitNote.findUnique({
//             where: { id },
//             select: { createdBy: true, status: true },
//         });
//         if (!note) return fail(res, 404, "Debit note not found");
//         if (!permissionsFor(note, actor).canSubmit) {
//             return fail(res, 403, "You cannot submit this debit note");
//         }

//         const result = await prisma.debitNote.updateMany({
//             where: { id, createdBy: actor.id, status: { in: EDITABLE } },
//             data: {
//                 status: "PENDING",
//                 submittedAt: new Date(),
//                 reviewedBy: null,
//                 reviewedAt: null,
//                 reviewRemark: null,
//             },
//         });
//         if (result.count === 0) {
//             return fail(res, 409, "The debit note changed state. Please reload.");
//         }

//         const fresh = await loadNote(id);
//         if (!fresh) return fail(res, 404, "Debit note not found");
//         return res.send(serialize(fresh, actor));
//     } catch (err) {
//         console.error("submitDebitNote failed:", err);
//         return fail(res, 500, "Failed to submit debit note");
//     }
// };

// shared by approve / reject
// const review = async (req: Request, res: Response, decision: "APPROVED" | "REJECTED") => {
//     try {
//         const actor = getActor(req);
//         if (!actor) return fail(res, 401, "Not authenticated");

//         const id = parseId(req);
//         if (!id) return fail(res, 400, "Invalid id");

//         let remark: string | null = null;
//         if (decision === "REJECTED") {
//             remark = str((req.body as Record<string, unknown> | undefined)?.remark);
//             if (remark.length < 3) return fail(res, 400, "Please enter a reason for rejection");
//             if (remark.length > 500) return fail(res, 400, "Remark is too long (max 500 characters)");
//         }

//         const note = await prisma.debitNote.findUnique({
//             where: { id },
//             select: { createdBy: true, status: true },
//         });
//         if (!note) return fail(res, 404, "Debit note not found");
//         if (!permissionsFor(note, actor).canReview) {
//             return fail(
//                 res,
//                 403,
//                 isApprover(actor)
//                     ? "This debit note is not waiting for your approval"
//                     : "You are not allowed to review debit notes"
//             );
//         }

//         // only PENDING notes can be reviewed; guards against two approvers clicking at once
//         const result = await prisma.debitNote.updateMany({
//             where: { id, status: "PENDING" },
//             data: {
//                 status: decision,
//                 reviewedBy: actor.id,
//                 reviewedAt: new Date(),
//                 reviewRemark: remark,
//             },
//         });
//         if (result.count === 0) {
//             return fail(res, 409, "This debit note was already reviewed. Please reload.");
//         }

//         const fresh = await loadNote(id);
//         if (!fresh) return fail(res, 404, "Debit note not found");
//         return res.send(serialize(fresh, actor));
//     } catch (err) {
//         console.error("review failed:", err);
//         return fail(res, 500, "Failed to review debit note");
//     }
// };

// export const approveDebitNote = (req: Request, res: Response) => review(req, res, "APPROVED");
// export const rejectDebitNote = (req: Request, res: Response) => review(req, res, "REJECTED");

// DELETE /debit-notes/:id   (only DRAFT / REJECTED)
export const deleteDebitNote = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        if (!actor) return fail(res, 401, "Not authenticated");

        const id = parseId(req);
        if (!id) return fail(res, 400, "Invalid id");

        const note = await prisma.debitNote.findUnique({
            where: { id },
            select: { status: true },
        });
        if (!note) return fail(res, 404, "Debit note not found");
        if (!permissionsFor(note, actor).canDelete) {
            return fail(res, 403, "This debit note cannot be deleted");
        }

        const result = await prisma.debitNote.deleteMany({
            where: { id, status: { in: EDITABLE } },
        });
        if (result.count === 0) {
            return fail(res, 409, "The debit note changed state. Please reload.");
        }

        return res.send({ message: "Deleted", type: "success" });
    } catch (err) {
        console.error("deleteDebitNote failed:", err);
        return fail(res, 500, "Failed to delete debit note");
    }
};