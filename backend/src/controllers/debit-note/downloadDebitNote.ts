import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { parse, HTMLElement, TextNode } from "node-html-parser";
import type { Node as HtmlNode } from "node-html-parser";

import prisma from "../../database/prismaClient/prisma";

/* ------------------------------------------------------------------ */
/*  Settings – change these if the letterhead ever changes             */
/* ------------------------------------------------------------------ */

const BODY_SIZE = 11; // pt
const TABLE_HEAD_SIZE = 7.5; // pt, same as the approved sample
const TABLE_BODY_SIZE = 8.5; // pt, same as the approved sample
const TABLE_HEAD_FILL = "C6DFB3"; // light green header row

// A4 in points (72pt = 1 inch)
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M_LEFT = 72;
const M_RIGHT = 54;
const M_TOP = 69;
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // 469.28
const CONTENT_BOTTOM = 772; // text must stop above the footer banner

// Generate the "Ref:" and "Date:" lines automatically (noteNo / approvedAt).
// Set to false if your editor content already contains them.
const ADD_REF_AND_DATE = true;

// 05th / 1st / 2nd ... -> superscript suffix, like the sample
const AUTO_SUPERSCRIPT_ORDINALS = true;

// Company that signs on the left side of every debit note
const ISSUER_LINE = "On behalf of Audit Dept \u2013 SM Sourcing.";

/* ------------------------------------------------------------------ */
/*  Image assets                                                       */
/* ------------------------------------------------------------------ */

// Images are read from disk (a backend cannot `import` .png files like Vite does).
// process.cwd() is used so it also works when the app runs from /dist on Render.
const ASSET_DIR =
    process.env.DEBIT_NOTE_ASSET_DIR ??
    path.join(process.cwd(), "src", "assets", "images", "signatures");

interface Assets {
    headerLogo: Buffer;
    signature: Buffer;
    footerBanner: Buffer | null; // Made nullable to prevent crashes if missing
}

let assetCache: Assets | null = null;

const loadAssets = (): Assets => {
    if (!assetCache) {
        const read = (file: string) => fs.readFileSync(path.join(ASSET_DIR, file));
        const readOptional = (file: string): Buffer | null => {
            try {
                return fs.readFileSync(path.join(ASSET_DIR, file));
            } catch {
                return null;
            }
        };
        assetCache = {
            headerLogo: read("debit-note-company-icon-header.png"),
            signature: read("sign-rofiqul-islam-signature.png"),
            footerBanner: readOptional("debit-note-footer-banner.jpg"),
        };
    }
    return assetCache;
};

// positions / sizes in points, copied from the approved Word sample
const LOGO = { w: 66.8, h: 54 };
const SIGNATURE = { w: 121.5, h: 75 };
const WATERMARK = { x: 79.8, y: 192.2, w: 439.5, h: 457.5 };
const FOOTER = { x: 6.6, y: 785.4, w: 584.4, h: 41.55 };

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Align = "left" | "center" | "right" | "justify";

interface RunStyle {
    bold?: boolean;
    italics?: boolean;
    underline?: boolean;
    strike?: boolean;
    superScript?: boolean;
    subScript?: boolean;
    color?: string; // hex without #
    size?: number; // pt
}

type Piece = { kind: "text"; text: string; style: RunStyle } | { kind: "br" };

interface ParaBlock {
    type: "para";
    pieces: Piece[];
    align?: Align;
    indent: number; // pt
    marker?: { text: string; offset: number }; // list bullet / number
    spaceAfter: number;
    baseSize: number;
}

interface HrBlock {
    type: "hr";
}

interface CellSpec {
    row: number;
    col: number;
    colSpan: number;
    rowSpan: number;
    blocks: ParaBlock[];
    fill?: string;
}

interface TableBlock {
    type: "table";
    rowCount: number;
    colW: number[];
    cells: CellSpec[];
}

type Block = ParaBlock | HrBlock | TableBlock;

interface Ctx {
    run: RunStyle;
    align?: Align;
    indent: number; // pt
    listDepth: number;
    inCell?: boolean;
}

const BLOCK_TAGS = new Set([
    "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI",
    "TABLE", "HR", "BLOCKQUOTE", "PRE", "SECTION", "ARTICLE", "HEADER", "FOOTER",
]);

/* ------------------------------------------------------------------ */
/*  HTML helpers                                                       */
/* ------------------------------------------------------------------ */

const escapeHtml = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const isElement = (n: HtmlNode): n is HTMLElement => n instanceof HTMLElement;
const isText = (n: HtmlNode): n is TextNode => n instanceof TextNode;

const parseStyleAttr = (el: HTMLElement): Record<string, string> => {
    const out: Record<string, string> = {};
    const raw = el.getAttribute("style");
    if (!raw) return out;
    for (const part of raw.split(";")) {
        const i = part.indexOf(":");
        if (i === -1) continue;
        out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim().toLowerCase();
    }
    return out;
};

// "12px" | "9pt" | "1.5em" -> points
const lengthToPt = (v: string | undefined): number => {
    if (!v) return 0;
    const m = v.match(/^(-?\d+(?:\.\d+)?)(px|pt|em|rem|in|cm)?$/);
    if (!m) return 0;
    const n = parseFloat(m[1]!);
    switch (m[2]) {
        case "pt": return n;
        case "em":
        case "rem": return n * 12;
        case "in": return n * 72;
        case "cm": return n * 28.35;
        default: return n * 0.75; // px
    }
};

const toHexColor = (v: string | undefined): string | undefined => {
    if (!v) return undefined;
    const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
        const h = hex[1]!;
        return (h.length === 3 ? h.split("").map((c) => c + c).join("") : h).toUpperCase();
    }
    const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
        return [rgb[1], rgb[2], rgb[3]]
            .map((x) => Math.min(255, parseInt(x ?? "0", 10)).toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase();
    }
    return undefined;
};

const fontSizeFrom = (v: string | undefined): number | undefined => {
    const pt = lengthToPt(v);
    return pt > 0 ? Math.max(6, Math.min(72, pt)) : undefined;
};

const alignFrom = (el: HTMLElement, style: Record<string, string>): Align | undefined => {
    const v = (style["text-align"] ?? el.getAttribute("align") ?? "").toLowerCase();
    return v === "center" || v === "right" || v === "justify" || v === "left" ? v : undefined;
};

// Merge the tag + inline CSS of an element into the inherited run style
const runStyleFor = (el: HTMLElement, inherited: RunStyle): RunStyle => {
    const s: RunStyle = { ...inherited };
    const css = parseStyleAttr(el);

    switch (el.tagName) {
        case "B":
        case "STRONG": s.bold = true; break;
        case "I":
        case "EM": s.italics = true; break;
        case "U":
        case "INS": s.underline = true; break;
        case "S":
        case "STRIKE":
        case "DEL": s.strike = true; break;
        case "SUP": s.superScript = true; break;
        case "SUB": s.subScript = true; break;
        case "H1": s.bold = true; s.size = 16; break;
        case "H2": s.bold = true; s.size = 14; break;
        case "H3": s.bold = true; s.size = 13; break;
        case "H4":
        case "H5":
        case "H6": s.bold = true; s.size = 12; break;
        default: break;
    }

    const fw = css["font-weight"];
    if (fw) s.bold = fw === "bold" || fw === "bolder" || parseInt(fw, 10) >= 600;
    if (css["font-style"]) s.italics = css["font-style"] === "italic";
    const deco = css["text-decoration"] ?? css["text-decoration-line"];
    if (deco) {
        s.underline = deco.includes("underline");
        s.strike = deco.includes("line-through");
    }
    const color = toHexColor(css["color"]);
    if (color) s.color = color;
    const size = fontSizeFrom(css["font-size"]);
    if (size) s.size = size;
    if (el.tagName === "FONT") {
        const c = toHexColor((el.getAttribute("color") ?? "").toLowerCase());
        if (c) s.color = c;
    }
    return s;
};

/* ------------------------------------------------------------------ */
/*  HTML -> blocks                                                     */
/* ------------------------------------------------------------------ */

const collectPieces = (nodes: HtmlNode[], style: RunStyle, out: Piece[]): void => {
    for (const node of nodes) {
        if (isText(node)) {
            const text = node.text.replace(/[ \t\r\n\f]+/g, " ").replace(/\u200b/g, "");
            if (text) out.push({ kind: "text", text, style });
        } else if (isElement(node)) {
            if (node.tagName === "BR") out.push({ kind: "br" });
            else collectPieces(node.childNodes, runStyleFor(node, style), out);
        }
    }
};

const tidyPieces = (pieces: Piece[]): Piece[] => {
    // collapse double spaces across tags, trim both ends of the paragraph
    let prevEndsWithSpace = true;
    for (const p of pieces) {
        if (p.kind === "br") { prevEndsWithSpace = true; continue; }
        if (prevEndsWithSpace) p.text = p.text.replace(/^ +/, "");
        prevEndsWithSpace = p.text.endsWith(" ");
    }
    for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]!;
        if (p.kind === "br") break;
        p.text = p.text.replace(/ +$/, "");
        if (p.text) break;
    }
    const kept = pieces.filter((p) => p.kind === "br" || p.text !== "");

    if (!AUTO_SUPERSCRIPT_ORDINALS) return kept;

    // 05th -> 05 + superscript "th"
    const out: Piece[] = [];
    for (const p of kept) {
        if (p.kind === "br" || p.style.superScript || p.style.subScript) { out.push(p); continue; }
        const re = /(?<=\d)(st|nd|rd|th)(?![A-Za-z])/g;
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(p.text)) !== null) {
            if (m.index > last) out.push({ kind: "text", text: p.text.slice(last, m.index), style: p.style });
            out.push({ kind: "text", text: m[1]!, style: { ...p.style, superScript: true } });
            last = m.index + m[1]!.length;
        }
        if (last < p.text.length) out.push({ kind: "text", text: p.text.slice(last), style: p.style });
    }
    return out;
};

const makeParagraph = (
    nodes: HtmlNode[],
    ctx: Ctx,
    marker?: { text: string; offset: number }
): ParaBlock => {
    const raw: Piece[] = [];
    collectPieces(nodes, ctx.run, raw);

    // a single trailing <br> is only the browser's "empty line" placeholder
    if (raw.length && raw[raw.length - 1]!.kind === "br") raw.pop();

    return {
        type: "para",
        pieces: tidyPieces(raw),
        ...(ctx.align !== undefined ? { align: ctx.align } : {}),
        indent: ctx.indent,
        ...(marker !== undefined ? { marker } : {}),
        spaceAfter: ctx.inCell ? 0 : 3,
        baseSize: ctx.run.size ?? BODY_SIZE,
    };
};

const hasContent = (nodes: HtmlNode[]): boolean =>
    nodes.some((n) =>
        isText(n) ? n.text.replace(/[\s\u00a0]+/g, "") !== "" : isElement(n) && !BLOCK_TAGS.has(n.tagName)
    );

const hasBlockChild = (el: HTMLElement): boolean =>
    el.childNodes.some((n) => isElement(n) && BLOCK_TAGS.has(n.tagName));

const deriveCtx = (el: HTMLElement, ctx: Ctx): Ctx => {
    const css = parseStyleAttr(el);
    const align = alignFrom(el, css) ?? ctx.align;
    return {
        ...ctx,
        run: runStyleFor(el, ctx.run),
        ...(align !== undefined ? { align } : {}),
        indent: ctx.indent + lengthToPt(css["margin-left"]) + lengthToPt(css["padding-left"]),
    };
};

const toRoman = (n: number): string => {
    const map: [number, string][] = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
    let out = "";
    for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
    return out;
};

const listToBlocks = (el: HTMLElement, ctx: Ctx): Block[] => {
    const ordered = el.tagName === "OL";
    const level = Math.min(ctx.listDepth, 2);
    const out: Block[] = [];
    let n = 0;

    for (const li of el.childNodes) {
        if (!isElement(li) || li.tagName !== "LI") continue;
        n++;
        const liCtx = deriveCtx(li, ctx);
        const textIndent = ctx.indent + 28 * (level + 1);
        const inline: HtmlNode[] = [];
        const nested: HTMLElement[] = [];
        for (const c of li.childNodes) {
            if (isElement(c) && (c.tagName === "UL" || c.tagName === "OL")) nested.push(c);
            else inline.push(c);
        }
        const markerText = ordered
            ? level === 0 ? `${n}.` : level === 1 ? `${String.fromCharCode(96 + ((n - 1) % 26) + 1)}.` : `${toRoman(n)}.`
            : level === 1 ? "o" : "\u2022";
        out.push(makeParagraph(inline, { ...liCtx, indent: textIndent }, { text: markerText, offset: -16 }));
        for (const nl of nested) out.push(...listToBlocks(nl, { ...liCtx, listDepth: ctx.listDepth + 1 }));
    }
    return out;
};

const blocksFromNodes = (nodes: HtmlNode[], ctx: Ctx): Block[] => {
    const out: Block[] = [];
    let buffer: HtmlNode[] = [];

    const flush = () => {
        if (buffer.length && hasContent(buffer)) out.push(makeParagraph(buffer, ctx));
        buffer = [];
    };

    for (const node of nodes) {
        if (isElement(node) && BLOCK_TAGS.has(node.tagName)) {
            flush();
            out.push(...blockFromElement(node, ctx));
        } else {
            buffer.push(node);
        }
    }
    flush();
    return out;
};

const blockFromElement = (el: HTMLElement, ctx: Ctx): Block[] => {
    switch (el.tagName) {
        case "UL":
        case "OL":
            return listToBlocks(el, ctx);
        case "TABLE":
            return [tableFromElement(el, ctx)];
        case "HR":
            return [{ type: "hr" }];
        case "BLOCKQUOTE": {
            const c = deriveCtx(el, ctx);
            return blocksFromNodes(el.childNodes, { ...c, indent: c.indent + 36 });
        }
        default: {
            const c = deriveCtx(el, ctx);
            if (hasBlockChild(el)) return blocksFromNodes(el.childNodes, c);
            return [makeParagraph(el.childNodes, c)]; // empty <p> => blank line, like the editor
        }
    }
};

/* ---- tables (colspan + rowspan supported) ---- */

const tableFromElement = (table: HTMLElement, ctx: Ctx): TableBlock => {
    const trs = table.querySelectorAll("tr");
    const occupied: boolean[][] = trs.map(() => []);
    const cells: (CellSpec & { el: HTMLElement })[] = [];

    trs.forEach((tr, r) => {
        let c = 0;
        for (const cell of tr.childNodes) {
            if (!isElement(cell) || (cell.tagName !== "TD" && cell.tagName !== "TH")) continue;
            while (occupied[r]![c]) c++;
            const colSpan = Math.max(1, parseInt(cell.getAttribute("colspan") ?? "1", 10) || 1);
            const rowSpan = Math.min(
                trs.length - r,
                Math.max(1, parseInt(cell.getAttribute("rowspan") ?? "1", 10) || 1)
            );
            for (let rr = r; rr < r + rowSpan; rr++)
                for (let cc = c; cc < c + colSpan; cc++) occupied[rr]![cc] = true;
            cells.push({ el: cell, row: r, col: c, colSpan, rowSpan, blocks: [] });
            c += colSpan;
        }
    });

    const colCount = Math.max(1, ...occupied.map((row) => row.length));

    // ---- column widths: use widths set in the editor if any, otherwise by content ----
    const widths: (number | undefined)[] = new Array(colCount).fill(undefined);
    for (const p of cells) {
        if (p.row !== 0 || p.colSpan !== 1) continue;
        const css = parseStyleAttr(p.el);
        const w = css["width"] ?? (p.el.getAttribute("width") ?? "").toLowerCase();
        if (w.endsWith("%")) widths[p.col] = (parseFloat(w) / 100) * CONTENT_W;
        else if (w) widths[p.col] = lengthToPt(/^\d+$/.test(w) ? `${w}px` : w) || undefined;
    }
    // columns without a width get a share based on their longest unbroken word,
    // so "SM26-4934/AUG" does not wrap while "BUYER" stays narrow (like the sample)
    const weight: number[] = new Array(colCount).fill(5);
    for (const p of cells) {
        if (p.colSpan !== 1) continue;
        const longest = Math.max(0, ...p.el.text.split(/\s+/).map((t) => t.length));
        weight[p.col] = Math.max(weight[p.col]!, Math.min(24, longest));
    }
    const known = widths.reduce<number>((a, w) => a + (w ?? 0), 0);
    const unknownWeight = widths.reduce<number>((a, w, i) => a + (w === undefined ? weight[i]! : 0), 0);
    let colW: number[];
    if (unknownWeight === 0) colW = widths.map((w) => w ?? 0);
    else if (known >= CONTENT_W) colW = widths.map((w, i) => w ?? (CONTENT_W / colCount) * (weight[i]! / 8));
    else colW = widths.map((w, i) => w ?? ((CONTENT_W - known) * weight[i]!) / unknownWeight);
    const sum = colW.reduce((a, b) => a + b, 0);
    colW = colW.map((w) => (w / sum) * CONTENT_W);

    // ---- cell content ----
    for (const p of cells) {
        const css = parseStyleAttr(p.el);
        const headerCell = p.row === 0 || p.el.tagName === "TH"; // first row = green header row
        const cellCtx: Ctx = {
            run: {
                ...ctx.run,
                size: headerCell ? TABLE_HEAD_SIZE : TABLE_BODY_SIZE,
                bold: headerCell ? true : (ctx.run.bold ?? false),
            },
            align: alignFrom(p.el, css) ?? "center", // sample centres every cell
            indent: 0,
            listDepth: 0,
            inCell: true,
        };
        const c2 = deriveCtx(p.el, cellCtx);
        p.blocks = blocksFromNodes(p.el.childNodes, c2).filter((b): b is ParaBlock => b.type === "para");
        const fill = toHexColor(css["background-color"]) ?? (p.row === 0 ? TABLE_HEAD_FILL : undefined);
        if (fill !== undefined) p.fill = fill;
        if (p.blocks.length === 0) p.blocks = [makeParagraph([], c2)];
    }

    return {
        type: "table",
        rowCount: trs.length,
        colW,
        cells: cells.map(({ el: _el, ...rest }) => rest),
    };
};

/* ------------------------------------------------------------------ */
/*  Text layout (wrapping, alignment) on top of PDFKit                 */
/* ------------------------------------------------------------------ */

type Doc = InstanceType<typeof PDFDocument>;

interface Word {
    text: string;
    style: RunStyle;
    size: number; // effective size (superscript is smaller)
    font: string;
    w: number;
    space: boolean;
}

interface Line {
    words: Word[];
    w: number; // width without trailing spaces
    h: number;
    base: number; // baseline offset from top of line
    forced: boolean; // ended by <br> or end of paragraph
}

const fontName = (s: RunStyle): string =>
    s.bold && s.italics ? "Times-BoldItalic" : s.bold ? "Times-Bold" : s.italics ? "Times-Italic" : "Times-Roman";

const ASC = 0.683; // Times ascender / descender (per em)
const DESC = 0.217;

const makeWord = (doc: Doc, text: string, style: RunStyle, space: boolean, base: number): Word => {
    const size = (style.size ?? base) * (style.superScript || style.subScript ? 0.65 : 1);
    const font = fontName(style);
    doc.font(font).fontSize(size);
    return { text, style, size, font, w: doc.widthOfString(text.replace(/\u00a0/g, " ")), space };
};

const layoutPara = (doc: Doc, block: ParaBlock, width: number): Line[] => {
    const avail = Math.max(20, width - block.indent);
    const lines: Line[] = [];

    // 1) split into groups: unbreakable runs of words, and spaces between them
    type Group = { words: Word[]; w: number; space: boolean };
    const items: (Group | "br")[] = [];
    let current: Group | null = null;

    for (const p of block.pieces) {
        if (p.kind === "br") { current = null; items.push("br"); continue; }
        for (const tok of p.text.split(/( +)/)) {
            if (!tok) continue;
            if (tok.startsWith(" ")) {
                current = null;
                items.push({ words: [makeWord(doc, tok, p.style, true, block.baseSize)], w: 0, space: true });
            } else {
                const word = makeWord(doc, tok, p.style, false, block.baseSize);
                if (!current) { current = { words: [], w: 0, space: false }; items.push(current); }
                current.words.push(word);
                current.w += word.w;
            }
        }
    }
    for (const it of items) if (it !== "br" && it.space) it.w = it.words[0]!.w;

    // 2) greedy line filling
    let line: Word[] = [];
    let lineW = 0;

    const finish = (forced: boolean) => {
        while (line.length && line[line.length - 1]!.space) line.pop(); // drop trailing spaces
        const w = line.reduce((a, x) => a + x.w, 0);
        const sizes = line.filter((x) => !x.style.superScript && !x.style.subScript).map((x) => x.size);
        const maxSize = sizes.length ? Math.max(...sizes) : line.length ? Math.max(...line.map((x) => x.size)) : block.baseSize;
        const h = maxSize * 1.17;
        lines.push({
            words: line,
            w,
            h,
            base: (h - maxSize * (ASC + DESC)) / 2 + maxSize * ASC,
            forced,
        });
        line = [];
        lineW = 0;
    };

    for (const it of items) {
        if (it === "br") { finish(true); continue; }
        if (it.space) {
            if (line.length) { line.push(it.words[0]!); lineW += it.w; }
            continue;
        }
        // a single word wider than the line: cut it into pieces
        if (it.words.length === 1 && it.w > avail) {
            const word = it.words[0]!;
            let chunk = "";
            for (const ch of word.text) {
                const test = makeWord(doc, chunk + ch, word.style, false, block.baseSize);
                if (test.w > avail && chunk) {
                    if (lineW > 0) finish(false);
                    line.push(makeWord(doc, chunk, word.style, false, block.baseSize));
                    finish(false);
                    chunk = ch;
                } else chunk += ch;
            }
            if (chunk) {
                const last = makeWord(doc, chunk, word.style, false, block.baseSize);
                if (lineW + last.w > avail && lineW > 0) finish(false);
                line.push(last);
                lineW += last.w;
            }
            continue;
        }
        if (lineW + it.w > avail && line.some((x) => !x.space)) finish(false);
        line.push(...it.words);
        lineW += it.w;
    }
    finish(true);
    return lines;
};

const paraHeight = (lines: Line[], block: ParaBlock): number =>
    lines.reduce((a, l) => a + l.h, 0) + block.spaceAfter;

const drawLine = (
    doc: Doc,
    line: Line,
    x0: number,
    avail: number,
    top: number,
    align: Align,
    asc: (font: string, size: number) => number
): void => {
    let extra = 0;
    let startX = x0;
    if (align === "center") startX = x0 + (avail - line.w) / 2;
    else if (align === "right") startX = x0 + avail - line.w;
    else if (align === "justify" && !line.forced) {
        const gaps = line.words.filter((w) => w.space).length;
        if (gaps > 0) extra = (avail - line.w) / gaps;
    }

    const baseline = top + line.base;
    let x = startX;
    for (const w of line.words) {
        const width = w.w + (w.space ? extra : 0);
        if (!w.space) {
            const shift = w.style.superScript ? w.size * 0.55 : w.style.subScript ? -w.size * 0.2 : 0;
            const color = "#" + (w.style.color ?? "000000");
            doc.font(w.font).fontSize(w.size).fillColor(color);
            doc.text(w.text.replace(/\u00a0/g, " "), x, baseline - shift - asc(w.font, w.size), { lineBreak: false });
        }
        if (w.style.underline) {
            const uy = baseline + w.size * 0.15;
            doc.save().lineWidth(Math.max(0.4, w.size * 0.05)).strokeColor("#" + (w.style.color ?? "000000"))
                .moveTo(x, uy).lineTo(x + width, uy).stroke().restore();
        }
        if (w.style.strike) {
            const sy = baseline - w.size * 0.3;
            doc.save().lineWidth(Math.max(0.4, w.size * 0.05)).strokeColor("#" + (w.style.color ?? "000000"))
                .moveTo(x, sy).lineTo(x + width, sy).stroke().restore();
        }
        x += width;
    }
};

/* ------------------------------------------------------------------ */
/*  Renderer                                                           */
/* ------------------------------------------------------------------ */

const DHAKA_TZ = "Asia/Dhaka";

const ordinalSuffix = (d: number): string => {
    if (d % 100 >= 11 && d % 100 <= 13) return "th";
    switch (d % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
};

// "01st August 2026." – always in Bangladesh time, because Render runs in UTC
const datePieces = (date: Date): Piece[] => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: DHAKA_TZ,
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = get("day");
    const style: RunStyle = { size: BODY_SIZE };
    return [
        { kind: "text", text: `Date: ${day}`, style },
        { kind: "text", text: ordinalSuffix(parseInt(day, 10)), style: { ...style, superScript: true } },
        { kind: "text", text: ` ${get("month")} ${get("year")}.`, style },
    ];
};

// "To, / MANAGING DIRECTOR / DRESDEN TEXTILE LTD / address ..." -> "DRESDEN TEXTILE LTD"
const guessPartyName = (html: string): string | null => {
    const lines = parse(html)
        .structuredText.split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    const toIdx = lines.findIndex((l) => /^to[,:]?$/i.test(l));
    if (toIdx === -1) return null;
    const designation = /(director|manager|chairman|proprietor|owner|partner|ceo|\bmd\b|authority|in[- ]?charge)/i;
    for (const line of lines.slice(toIdx + 1, toIdx + 5)) {
        if (!designation.test(line) && line.length <= 80) return line.replace(/[.,]+$/, "");
    }
    return null;
};

class Renderer {
    y = M_TOP;
    private readonly asc: (font: string, size: number) => number;

    constructor(private readonly doc: Doc) {
        this.asc = (font, size) => {
            doc.font(font).fontSize(size);
            const a = (doc as unknown as { _font?: { ascender?: number } })._font?.ascender;
            return ((a ?? ASC * 1000) / 1000) * size;
        };
    }

    newPage(): void {
        this.doc.addPage();
        this.y = M_TOP;
    }

    ensure(h: number): void {
        if (this.y + h > CONTENT_BOTTOM) this.newPage();
    }

    paragraph(block: ParaBlock): void {
        const lines = layoutPara(this.doc, block, CONTENT_W);
        const x0 = M_LEFT + block.indent;
        const avail = CONTENT_W - block.indent;
        const align: Align = block.align ?? "left";

        lines.forEach((line, i) => {
            this.ensure(line.h);
            if (i === 0 && block.marker) {
                this.doc.font("Times-Roman").fontSize(block.baseSize).fillColor("#000000");
                this.doc.text(block.marker.text, x0 + block.marker.offset, this.y + line.base - this.asc("Times-Roman", block.baseSize), { lineBreak: false });
            }
            drawLine(this.doc, line, x0, avail, this.y, align, this.asc);
            this.y += line.h;
        });
        this.y += block.spaceAfter;
    }

    hr(): void {
        this.ensure(8);
        this.doc.save().lineWidth(0.75).strokeColor("#808080")
            .moveTo(M_LEFT, this.y + 2).lineTo(PAGE_W - M_RIGHT, this.y + 2).stroke().restore();
        this.y += 8;
    }

    table(t: TableBlock): void {
        const PAD_X = 4;
        const PAD_Y = 3;
        const MIN_H = 16;
        const colX: number[] = [];
        t.colW.reduce((acc, w, i) => { colX[i] = acc; return acc + w; }, 0);
        const cellW = (c: CellSpec) => t.colW.slice(c.col, c.col + c.colSpan).reduce((a, b) => a + b, 0);

        // lay out every cell once
        const laid = t.cells.map((c) => {
            const inner = cellW(c) - PAD_X * 2;
            const lines = c.blocks.map((b) => layoutPara(this.doc, b, inner));
            const h = c.blocks.reduce((a, b, i) => a + paraHeight(lines[i]!, b), 0);
            return { c, lines, h: h + PAD_Y * 2 };
        });

        // row heights (rowspan cells share their height over the rows they cover)
        const rowH: number[] = new Array(t.rowCount).fill(MIN_H);
        for (const l of laid) if (l.c.rowSpan === 1) rowH[l.c.row] = Math.max(rowH[l.c.row]!, l.h);
        for (const l of laid) {
            if (l.c.rowSpan === 1) continue;
            const end = l.c.row + l.c.rowSpan - 1;
            let have = 0;
            for (let r = l.c.row; r <= end; r++) have += rowH[r]!;
            if (l.h > have) rowH[end]! += l.h - have;
        }

        // row groups: rows tied together by a rowspan must stay on the same page
        const groups: [number, number][] = [];
        for (let r = 0; r < t.rowCount; ) {
            let end = r;
            let changed = true;
            while (changed) {
                changed = false;
                for (const c of t.cells) {
                    if (c.row >= r && c.row <= end && c.row + c.rowSpan - 1 > end) {
                        end = c.row + c.rowSpan - 1;
                        changed = true;
                    }
                }
            }
            groups.push([r, end]);
            r = end + 1;
        }

        const drawGroup = ([from, to]: [number, number]) => {
            const rowY: number[] = [];
            let yy = this.y;
            for (let r = from; r <= to; r++) { rowY[r] = yy; yy += rowH[r]!; }

            for (const l of laid) {
                if (l.c.row < from || l.c.row > to) continue;
                const x = M_LEFT + colX[l.c.col]!;
                const w = cellW(l.c);
                let h = 0;
                for (let r = l.c.row; r < l.c.row + l.c.rowSpan; r++) h += rowH[r]!;
                const y = rowY[l.c.row]!;

                if (l.c.fill) this.doc.save().rect(x, y, w, h).fill("#" + l.c.fill).restore();
                this.doc.save().lineWidth(0.5).strokeColor("#000000").rect(x, y, w, h).stroke().restore();

                // vertical centre
                let cy = y + (h - (l.h - PAD_Y * 2)) / 2;
                l.c.blocks.forEach((b, i) => {
                    const lines = l.lines[i]!;
                    const inner = w - PAD_X * 2;
                    for (const line of lines) {
                        drawLine(this.doc, line, x + PAD_X + b.indent, inner - b.indent, cy, b.align ?? "center", this.asc);
                        cy += line.h;
                    }
                    cy += b.spaceAfter;
                });
            }
            this.y = yy;
        };

        const heightOf = ([from, to]: [number, number]) => rowH.slice(from, to + 1).reduce((a, b) => a + b, 0);

        groups.forEach((g, i) => {
            const h = heightOf(g);
            if (this.y + h > CONTENT_BOTTOM && this.y > M_TOP + 1) {
                this.newPage();
                // repeat the green header row on the new page
                if (i > 0) {
                    const hg = groups[0]!;
                    drawGroup(hg);
                }
            }
            drawGroup(g);
        });
        this.y += 6;
    }

    signature(party: string | null): void {
        const needed = 10 + SIGNATURE.h + 4 + 14 + 24;
        this.ensure(needed);
        const half = CONTENT_W / 2;
        const top = this.y + 10;

        this.doc.image(loadAssets().signature, M_LEFT, top, { width: SIGNATURE.w, height: SIGNATURE.h });

        const labelY = top + SIGNATURE.h + 4;
        const t = (text: string, x: number, y: number, size: number, width: number) => {
            this.doc.font("Times-Roman").fontSize(size).fillColor("#000000");
            this.doc.text(text, x, y, { width, lineBreak: true });
        };
        t("Authorized Signature", M_LEFT, labelY, 10, half - 8);
        t("Authorized Signature", M_LEFT + half, labelY, 10, half - 8);
        t(ISSUER_LINE, M_LEFT, labelY + 13, 9, half - 8);
        t(`On behalf of ${party ? party.toUpperCase() : "Receiving Party"}.`, M_LEFT + half, labelY + 13, 9, half - 8);

        this.y = labelY + 40;
    }
}

/* ------------------------------------------------------------------ */
/*  Build the PDF                                                      */
/* ------------------------------------------------------------------ */

interface NoteForPdf {
    id: number;
    noteNo: string | null;
    content: string;
    approvedAt: Date | null;
    createdAt: Date;
}

export const buildDebitNotePdf = (note: NoteForPdf): Promise<Buffer> =>
    new Promise<Buffer>((resolve, reject) => {
        try {
            const assets = loadAssets();
            const approvedDate = note.approvedAt ?? note.createdAt;
            const refNo =
                note.noteNo ?? `DEBIT NOTE/${approvedDate.getFullYear()}/${String(note.id).padStart(4, "0")}`;

            // The editor may save HTML (normal) or plain text (fallback)
            const html = /<\/?[a-z][\s\S]*>/i.test(note.content)
                ? note.content
                : note.content
                      .split(/\r?\n/)
                      .map((l) => `<p>${escapeHtml(l)}</p>`)
                      .join("");
            const blocks = blocksFromNodes(parse(html).childNodes, {
                run: { size: BODY_SIZE },
                indent: 0,
                listDepth: 0,
            });
            const party = guessPartyName(html);

            const doc = new PDFDocument({
                size: "A4",
                margin: 0,
                autoFirstPage: false,
                info: { Title: `Debit Note ${refNo}`, Author: "SM Sourcing ERP" },
            });

            const chunks: Buffer[] = [];
            doc.on("data", (c: Buffer) => chunks.push(c));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            // watermark (behind the text) + address banner on every page
            doc.on("pageAdded", () => {
                if (assets.footerBanner) {
                    doc.image(assets.footerBanner, FOOTER.x, FOOTER.y, { width: FOOTER.w, height: FOOTER.h });
                }
            });

            doc.addPage();
            const r = new Renderer(doc);

            /* ---- letterhead: logo + rule ---- */
            doc.image(assets.headerLogo, M_LEFT + 6.7, r.y, { width: LOGO.w, height: LOGO.h });
            const ruleY = r.y + LOGO.h + 6;
            doc.save().lineWidth(0.75).strokeColor("#A6A6A6")
                .moveTo(M_LEFT, ruleY).lineTo(PAGE_W - M_RIGHT, ruleY).stroke().restore();
            r.y = ruleY + 8;


            /* ---- body ---- */
            for (const b of blocks) {
                if (b.type === "para") r.paragraph(b);
                else if (b.type === "hr") r.hr();
                else r.table(b);
            }

            /* ---- signature ---- */
            r.y += 6;
            r.signature(party);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });

/* ------------------------------------------------------------------ */
/*  Express controller                                                 */
/*  GET /api/debit-note/:id/download                                   */
/* ------------------------------------------------------------------ */

export const downloadDebitNote = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid debit note id" });
        }

        const note = await prisma.debitNote.findUnique({
            where: { id },
            select: {
                id: true,
                noteNo: true,
                content: true,
                status: true,
                approvedAt: true,
                createdAt: true,
            },
        });

        if (!note) {
            return res.status(404).json({ message: "Debit note not found" });
        }

        // Only approved notes can be downloaded
        if (note.status !== "Approved") {
            return res.status(403).json({ message: "Debit note must be approved before it can be downloaded" });
        }

        const buffer = await buildDebitNotePdf(note);

        const safeName = (note.noteNo ?? `debit-note-${note.id}`).replace(/[^\w.-]+/g, "-");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
        res.setHeader("Content-Length", buffer.length.toString());
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        return res.status(200).send(buffer);
    } catch (error) {
        console.error("downloadDebitNote error:", error);
        return res.status(500).json({ message: "Failed to generate debit note" });
    }
};