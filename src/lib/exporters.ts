// Document export: Word (DOCX), PowerPoint (PPTX), Excel (XLSX) and PDF,
// generated on the device so exports work offline. Libraries load on first use.

import { inlineRuns, parseMarkdown, plainText, slugify, toSlides } from './markdown';

export interface DocMeta {
  title?: string;
  subtitle?: string;
  author?: string;
  institution?: string;
  status?: 'draft' | 'final';
  aiAssisted?: boolean;
}

const MIME: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  json: 'application/json',
  csv: 'text/csv',
  md: 'text/markdown',
};

export function isNativeApp(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface SaveResult {
  saved: boolean;
  method: string;
  name: string;
}

/** Android app: write to Documents/Deep Tutor Pro, then offer to open or share. */
async function saveNative(blob: Blob, filename: string): Promise<SaveResult> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const data = await blobToBase64(blob);
  let uri: string;
  let where = 'Documents › Deep Tutor Pro';
  try {
    uri = (await Filesystem.writeFile({ path: `Deep Tutor Pro/${filename}`, data, directory: Directory.Documents, recursive: true })).uri;
  } catch {
    // Some devices refuse shared storage; keep a private copy and share it.
    uri = (await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache })).uri;
    where = 'the share sheet';
  }
  try {
    await Share.share({ title: filename, url: uri, dialogTitle: 'Open or send the file' });
  } catch {
    // Closing the share sheet is fine — the file is already saved.
  }
  return { saved: true, method: where, name: filename };
}

type SavePicker = (opts: unknown) => Promise<{ name: string; createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;

export async function saveBlob(blob: Blob, filename: string): Promise<SaveResult> {
  if (!blob || !blob.size) throw new Error('The generated file is empty — nothing was saved.');
  if (isNativeApp()) return saveNative(blob, filename);
  const ext = filename.split('.').pop() ?? '';
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (typeof picker === 'function' && window.isSecureContext && !navigator.webdriver) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: ext.toUpperCase(), accept: { [MIME[ext] || blob.type || 'application/octet-stream']: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { saved: true, method: 'the chosen folder', name: handle.name };
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return { saved: false, method: 'cancelled', name: filename };
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { saved: true, method: 'Downloads', name: filename };
}

export const fileName = (title: string | undefined, ext: string) => `${slugify(title || 'document') || 'document'}.${ext}`;

export function footerText(meta: DocMeta): string {
  return [meta.institution, meta.subtitle, meta.status === 'final' ? 'Reviewed by tutor' : 'DRAFT — not yet reviewed', meta.aiAssisted ? 'AI-assisted' : '']
    .filter(Boolean)
    .join(' · ');
}

/** Drop a leading "# Title" that repeats the document title shown above it. */
export function withoutRepeatedTitle(markdown: string, title?: string): string {
  if (!title) return markdown;
  const m = /^\s*#\s+(.+?)\s*(?:\n|$)/.exec(markdown);
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return m && norm(m[1]) === norm(title) ? markdown.slice(m[0].length) : markdown;
}

// ---------------------------------------------------------------- DOCX ----

export async function exportDocx(markdown: string, meta: DocMeta = {}): Promise<Blob> {
  const d = await import('docx');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, Footer, PageNumber, ExternalHyperlink, BorderStyle, ShadingType, LevelFormat } = d;
  type Extra = { bold?: boolean; italics?: boolean; color?: string; size?: number };
  const runsFor = (text: string, extra: Extra = {}) =>
    inlineRuns(text).map((r) =>
      r.link && /^https?:/.test(r.link)
        ? new ExternalHyperlink({ link: r.link, children: [new TextRun({ text: r.text, style: 'Hyperlink' })] })
        : new TextRun({
            text: r.text,
            bold: r.bold || extra.bold,
            italics: r.italic || extra.italics,
            font: r.code ? 'Consolas' : undefined,
            color: r.source ? '1F6F43' : extra.color,
            size: extra.size,
          }),
    );
  const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  if (meta.institution) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: meta.institution.toUpperCase(), bold: true, size: 26 })] }));
  if (meta.title) children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(meta.title)] }));
  if (meta.subtitle) children.push(new Paragraph({ children: [new TextRun({ text: meta.subtitle, italics: true, color: '555555' })], spacing: { after: 200 } }));
  let listCounter = 0;
  for (const b of parseMarkdown(withoutRepeatedTitle(markdown, meta.title))) {
    if (b.type === 'heading') children.push(new Paragraph({ heading: levels[b.level - 1], children: runsFor(b.text) }));
    else if (b.type === 'para') children.push(new Paragraph({ children: runsFor(b.text), spacing: { after: 120 } }));
    else if (b.type === 'list') {
      listCounter += 1;
      for (const it of b.items)
        children.push(
          new Paragraph({
            children: runsFor(it.text),
            ...(b.ordered ? { numbering: { reference: 'num', level: it.depth, instance: listCounter } } : { bullet: { level: it.depth } }),
          }),
        );
    } else if (b.type === 'quote')
      children.push(
        new Paragraph({
          children: runsFor(b.text, { italics: true, color: '6B4E16' }),
          indent: { left: 400 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'C9A227', space: 8 } },
        }),
      );
    else if (b.type === 'code') children.push(...b.text.split('\n').map((line) => new Paragraph({ children: [new TextRun({ text: line, font: 'Consolas', size: 18 })] })));
    else if (b.type === 'hr') children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } } }));
    else if (b.type === 'table')
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: b.rows.map(
            (row, ri) =>
              new TableRow({
                tableHeader: ri === 0,
                children: row.map(
                  (cell) =>
                    new TableCell({
                      shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'E8EEF7', color: 'auto' } : undefined,
                      children: [new Paragraph({ children: runsFor(cell, ri === 0 ? { bold: true } : {}) })],
                    }),
                ),
              }),
          ),
        }),
        new Paragraph(''),
      );
  }
  const doc = new Document({
    creator: meta.author || 'Deep Tutor Pro',
    title: meta.title || 'Document',
    numbering: {
      config: [
        {
          reference: 'num',
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } } },
          })),
        },
      ],
    },
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${footerText(meta)}  ·  Page `, size: 16, color: '777777' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '777777' })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

// ---------------------------------------------------------------- PPTX ----

export async function exportPptx(markdown: string, meta: DocMeta = {}): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = meta.author || 'Deep Tutor Pro';
  pptx.title = meta.title || 'Presentation';
  const accent = '1F4E79';
  pptx.defineSlideMaster({
    title: 'DTP',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.12, fill: { color: accent } } },
      { text: { text: footerText(meta), options: { x: 0.4, y: 7.05, w: 9, h: 0.3, fontSize: 9, color: '888888' } } },
    ],
    slideNumber: { x: 12.4, y: 7.05, fontSize: 9, color: '888888' },
  });
  const slides = toSlides(markdown);
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: accent };
  titleSlide.addText(meta.title || slides[0]?.title || 'Presentation', { x: 0.6, y: 2.2, w: 12, h: 1.4, fontSize: 40, bold: true, color: 'FFFFFF' });
  if (meta.subtitle) titleSlide.addText(meta.subtitle, { x: 0.6, y: 3.7, w: 12, h: 0.8, fontSize: 20, color: 'DCE6F2' });
  if (meta.institution) titleSlide.addText(meta.institution, { x: 0.6, y: 4.5, w: 12, h: 0.6, fontSize: 16, color: 'DCE6F2' });
  for (const s of slides) {
    if (meta.title && s === slides[0] && s.title === meta.title && !s.bullets.length) continue;
    if (!s.bullets.length && !s.tables.length) {
      const divider = pptx.addSlide({ masterName: 'DTP' });
      divider.background = { color: 'E8EEF7' };
      divider.addText(s.title, { x: 0.6, y: 2.8, w: 12, h: 1.2, fontSize: 34, bold: true, color: accent });
      if (s.notes.length) divider.addNotes(s.notes.join('\n'));
      continue;
    }
    // Long sections are split over several slides so text stays readable.
    const chunks: (typeof s.bullets)[] = [];
    for (let i = 0; i < Math.max(1, s.bullets.length); i += 9) chunks.push(s.bullets.slice(i, i + 9));
    chunks.forEach((bullets, ci) => {
      const slide = pptx.addSlide({ masterName: 'DTP' });
      slide.addText(ci ? `${s.title} (cont.)` : s.title, { x: 0.5, y: 0.3, w: 12.3, h: 0.9, fontSize: 28, bold: true, color: accent });
      let y = 1.35;
      const hasTable = ci === chunks.length - 1 && s.tables.length > 0;
      if (bullets.length) {
        const size = bullets.length > 7 ? 15 : bullets.length > 4 ? 18 : 20;
        const h = hasTable ? 2.6 : 5.4;
        slide.addText(
          bullets.map((b) => ({ text: b.text, options: { bullet: b.bold ? false : { indent: 18 }, bold: b.bold, indentLevel: b.depth, breakLine: true } })),
          { x: 0.6, y, w: 12.1, h, fontSize: size, color: '222222', valign: 'top', paraSpaceAfter: 6, fit: 'shrink' },
        );
        y += h + 0.15;
      }
      if (hasTable) {
        slide.addTable(
          s.tables[0].map((row, ri) => row.map((cell) => ({ text: cell, options: { bold: ri === 0, fill: { color: ri === 0 ? 'E8EEF7' : 'FFFFFF' } } }))),
          { x: 0.6, y, w: 12.1, fontSize: 12, border: { type: 'solid', pt: 0.5, color: 'B0B7C3' }, autoPage: false },
        );
      }
      if (s.notes.length && ci === 0) slide.addNotes(s.notes.join('\n'));
    });
  }
  return (await pptx.write({ outputType: 'blob' })) as Blob;
}

// ---------------------------------------------------------------- XLSX ----

export interface SheetDef {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, string | number | null>[];
  notes?: string[];
}

export async function exportXlsx(sheets: SheetDef[], meta: DocMeta = {}): Promise<Blob> {
  const mod = await import('exceljs');
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.author || 'Deep Tutor Pro';
  wb.created = new Date();
  for (const def of sheets) {
    const ws = wb.addWorksheet(def.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet');
    ws.columns = def.columns.map((c) => ({ header: c.header, key: c.key, width: c.width || Math.max(10, c.header.length + 2) }));
    for (const row of def.rows) ws.addRow(row);
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    if (def.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: def.columns.length } };
    if (def.notes?.length) {
      ws.addRow([]);
      for (const n of def.notes) ws.addRow([n]).font = { italic: true, color: { argb: 'FF555555' } };
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: MIME.xlsx });
}

/** Read the first sheet of an .xlsx file as rows of cell text. */
export async function readXlsxRows(file: Blob): Promise<string[][]> {
  const mod = await import('exceljs');
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  const rows: string[][] = [];
  ws?.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1);
    rows.push(
      values.map((v) => {
        if (v === null || v === undefined) return '';
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === 'object') {
          const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
          if (o.richText) return o.richText.map((r) => r.text).join('');
          return String(o.text ?? o.result ?? '');
        }
        return String(v);
      }),
    );
  });
  return rows;
}

// ----------------------------------------------------------------- PDF ----

export async function exportPdf(markdown: string, meta: DocMeta = {}): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 56;
  const width = W - 2 * M;
  let y = M;
  const ensure = (h: number) => {
    if (y + h > H - M) {
      pdf.addPage();
      y = M;
    }
  };
  type Opts = { size?: number; style?: string; indent?: number; color?: [number, number, number]; gap?: number; bullet?: string; align?: 'center' };
  const write = (text: string, { size = 11, style = 'normal', indent = 0, color = [30, 30, 30], gap = 6, bullet = '', align }: Opts = {}) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines: string[] = pdf.splitTextToSize(text, width - indent - (bullet ? 14 : 0));
    const lh = size * 1.35;
    lines.forEach((line, i) => {
      ensure(lh);
      if (bullet && i === 0) pdf.text(bullet, M + indent, y + size);
      if (align === 'center') pdf.text(line, W / 2, y + size, { align: 'center' });
      else pdf.text(line, M + indent + (bullet ? 14 : 0), y + size);
      y += lh;
    });
    y += gap;
  };
  if (meta.institution) write(meta.institution.toUpperCase(), { size: 13, style: 'bold', align: 'center', gap: 4 });
  if (meta.title) write(meta.title, { size: 20, style: 'bold', color: [31, 78, 121], gap: 4 });
  if (meta.subtitle) write(meta.subtitle, { size: 10, style: 'italic', color: [90, 90, 90], gap: 14 });
  const sizes = [18, 15, 13, 12, 11, 11];
  for (const b of parseMarkdown(withoutRepeatedTitle(markdown, meta.title))) {
    if (b.type === 'heading') {
      y += 6;
      ensure(40);
      write(plainText(b.text), { size: sizes[b.level - 1], style: 'bold', color: [31, 78, 121] });
    } else if (b.type === 'para') write(plainText(b.text));
    else if (b.type === 'list') b.items.forEach((it, i) => write(plainText(it.text), { indent: 12 + it.depth * 16, bullet: b.ordered ? `${i + 1}.` : '•', gap: 3 }));
    else if (b.type === 'quote') write(plainText(b.text), { style: 'italic', indent: 14, color: [107, 78, 22] });
    else if (b.type === 'code') write(b.text, { size: 9, indent: 8, color: [60, 60, 60] });
    else if (b.type === 'hr') {
      ensure(12);
      pdf.setDrawColor(180);
      pdf.line(M, y + 4, W - M, y + 4);
      y += 12;
    } else if (b.type === 'table') {
      const cols = b.rows[0].length;
      const cw = width / cols;
      pdf.setFontSize(9);
      for (const [ri, row] of b.rows.entries()) {
        pdf.setFont('helvetica', ri === 0 ? 'bold' : 'normal');
        const cells: string[][] = row.map((c) => pdf.splitTextToSize(plainText(c), cw - 8));
        const rh = Math.max(...cells.map((c) => c.length)) * 11 + 8;
        ensure(rh);
        cells.forEach((lines, ci) => {
          if (ri === 0) {
            pdf.setFillColor(232, 238, 247);
            pdf.rect(M + ci * cw, y, cw, rh, 'F');
          }
          pdf.setDrawColor(176, 183, 195);
          pdf.rect(M + ci * cw, y, cw, rh);
          pdf.setTextColor(30, 30, 30);
          pdf.text(lines, M + ci * cw + 4, y + 12);
        });
        y += rh;
      }
      y += 10;
    }
  }
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(`${footerText(meta)}  ·  Page ${p} of ${pages}`, W / 2, H - 28, { align: 'center' });
  }
  return pdf.output('blob');
}

export type DocFormat = 'docx' | 'pptx' | 'pdf' | 'md';

export async function exportDocument(format: DocFormat, markdown: string, meta: DocMeta = {}): Promise<SaveResult> {
  let blob: Blob;
  if (format === 'md') blob = new Blob([markdown], { type: MIME.md });
  else blob = await { docx: exportDocx, pptx: exportPptx, pdf: exportPdf }[format](markdown, meta);
  return saveBlob(blob, fileName(meta.title, format));
}
