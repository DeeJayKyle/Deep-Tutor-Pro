// Reads text out of uploaded documents and images on the device, so it works
// offline: PDF (text layer, with OCR for scanned pages), Word, PowerPoint,
// Excel, OpenDocument, plain text/Markdown/CSV/HTML/RTF, and photos (OCR).

export interface Extracted {
  text: string;
  pages: number;
  ocrPages: number;
  kind: 'pdf' | 'image' | 'docx' | 'pptx' | 'xlsx' | 'odf' | 'text';
  note?: string;
}

export type Progress = (message: string, fraction?: number) => void;

const MIN_PAGE_CHARS = 25; // fewer characters → treat the page as scanned
export const MAX_OCR_PAGES = 200;

export const ACCEPT =
  '.pdf,.docx,.pptx,.xlsx,.odt,.odp,.ods,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.rtf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff,image/*,application/pdf';

const vendorBase = () => new URL('vendor/tesseract/', document.baseURI).href;

export function extOf(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

export function isImage(file: { name: string; type?: string }): boolean {
  return /^image\//.test(file.type || '') || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tif', 'tiff'].includes(extOf(file.name));
}

// ------------------------------------------------------------------- OCR --

type OcrWorker = { recognize: (img: unknown) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };

async function createOcrWorker(onProgress?: (p: number) => void): Promise<OcrWorker> {
  const { createWorker } = await import('tesseract.js');
  const base = vendorBase();
  try {
    return (await createWorker('eng', 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
      gzip: true,
      workerBlobURL: false,
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress);
      },
    })) as unknown as OcrWorker;
  } catch (err) {
    throw new Error(`The OCR engine could not start (${(err as Error).message || err}).`);
  }
}

/** OCR a photo or rendered page. */
export async function ocrImage(image: Blob | HTMLCanvasElement | string, onProgress?: Progress): Promise<string> {
  onProgress?.('Reading text from the image…', 0);
  const worker = await createOcrWorker((p) => onProgress?.('Reading text from the image…', p));
  try {
    const { data } = await worker.recognize(image);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

// ------------------------------------------------------------------- PDF --

async function loadPdfjs() {
  const lib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  return lib;
}

export async function readPdf(file: Blob, onProgress?: Progress, ocr = true): Promise<Extracted> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  const doc = await task.promise;
  const pages: string[] = [];
  const scanned: number[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const text = (content.items as { str?: string; hasEOL?: boolean }[])
        .map((it) => (it.str || '') + (it.hasEOL ? '\n' : ' '))
        .join('')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
      pages.push(text);
      if (text.length < MIN_PAGE_CHARS) scanned.push(n);
      onProgress?.(`Reading page ${n} of ${doc.numPages}…`, n / doc.numPages);
    }
    let ocrPages = 0;
    const toOcr = ocr ? scanned.slice(0, MAX_OCR_PAGES) : [];
    if (toOcr.length) {
      const worker = await createOcrWorker();
      try {
        for (const [i, n] of toOcr.entries()) {
          onProgress?.(`Scanned page ${n}: recognising text (${i + 1} of ${toOcr.length})…`, i / toOcr.length);
          const page = await doc.getPage(n);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
          const { data } = await worker.recognize(canvas);
          const text = (data.text || '').trim();
          if (text) {
            pages[n - 1] = text;
            ocrPages += 1;
          }
          canvas.width = canvas.height = 0;
        }
      } finally {
        await worker.terminate();
      }
    }
    const text = pages
      .map((t, i) => (t ? `[Page ${i + 1}]\n${t}` : ''))
      .filter(Boolean)
      .join('\n\n');
    const skipped = Math.max(0, scanned.length - toOcr.length);
    return { text, pages: pages.length, ocrPages, kind: 'pdf', note: skipped ? `${skipped} scanned page(s) beyond the OCR limit were skipped.` : undefined };
  } finally {
    await task.destroy();
  }
}

// --------------------------------------------------- Office / OpenDocument --

function xmlDoc(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

/** Word: paragraphs in order, tables as pipe-separated rows. */
export function docxXmlToText(xml: string): string {
  const doc = xmlDoc(xml);
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = doc.getElementsByTagNameNS(W, 'body')[0] ?? doc.documentElement;
  const out: string[] = [];
  const paraText = (p: Element) => {
    let s = '';
    const walk = (node: Element) => {
      for (const child of Array.from(node.children)) {
        if (child.namespaceURI === W && child.localName === 't') s += child.textContent ?? '';
        else if (child.namespaceURI === W && (child.localName === 'tab' || child.localName === 'ptab')) s += '\t';
        else if (child.namespaceURI === W && (child.localName === 'br' || child.localName === 'cr')) s += '\n';
        else walk(child);
      }
    };
    walk(p);
    return s;
  };
  const visit = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (child.namespaceURI !== W) {
        visit(child);
        continue;
      }
      if (child.localName === 'p') {
        const style = child.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') ?? child.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttribute('w:val') ?? '';
        const text = paraText(child).trim();
        if (!text) continue;
        const level = /^Heading(\d)/i.exec(style)?.[1];
        out.push(level ? `${'#'.repeat(Math.min(6, Number(level)))} ${text}` : text);
      } else if (child.localName === 'tbl') {
        for (const tr of Array.from(child.children).filter((c) => c.localName === 'tr')) {
          const cells = Array.from(tr.children)
            .filter((c) => c.localName === 'tc')
            .map((tc) =>
              Array.from(tc.getElementsByTagNameNS(W, 'p'))
                .map(paraText)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim(),
            );
          if (cells.some(Boolean)) out.push(cells.join(' | '));
        }
      } else visit(child);
    }
  };
  visit(body);
  return out.join('\n');
}

/** PowerPoint / Drawing XML: every a:t, one line per a:p. */
export function drawingXmlToText(xml: string): string {
  const doc = xmlDoc(xml);
  const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  return Array.from(doc.getElementsByTagNameNS(A, 'p'))
    .map((p) =>
      Array.from(p.getElementsByTagNameNS(A, 't'))
        .map((t) => t.textContent ?? '')
        .join(''),
    )
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

/** OpenDocument content.xml: text:h / text:p / table rows. */
export function odfXmlToText(xml: string): string {
  const doc = xmlDoc(xml);
  const TEXT = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0';
  const out: string[] = [];
  for (const el of Array.from(doc.getElementsByTagNameNS(TEXT, '*'))) {
    if (el.localName !== 'p' && el.localName !== 'h') continue;
    if (el.parentElement?.namespaceURI === TEXT && (el.parentElement.localName === 'p' || el.parentElement.localName === 'h')) continue;
    const text = (el.textContent ?? '').trim();
    if (!text) continue;
    const level = el.localName === 'h' ? Number(el.getAttributeNS(TEXT, 'outline-level') || 1) : 0;
    out.push(level ? `${'#'.repeat(Math.min(6, level))} ${text}` : text);
  }
  return out.join('\n');
}

async function readZip(file: Blob) {
  const { default: JSZip } = await import('jszip');
  return JSZip.loadAsync(await file.arrayBuffer());
}

async function readDocx(file: Blob): Promise<Extracted> {
  const zip = await readZip(file);
  const main = zip.file('word/document.xml');
  if (!main) throw new Error('This Word file has no document body.');
  const parts = [docxXmlToText(await main.async('string'))];
  for (const name of Object.keys(zip.files).filter((n) => /^word\/(footnotes|endnotes)\.xml$/.test(n))) {
    const t = docxXmlToText(await zip.file(name)!.async('string'));
    if (t.trim()) parts.push(t);
  }
  return { text: parts.join('\n\n'), pages: 0, ocrPages: 0, kind: 'docx' };
}

async function readPptx(file: Blob): Promise<Extracted> {
  const zip = await readZip(file);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]));
  const parts: string[] = [];
  for (const [i, name] of slideNames.entries()) {
    let text = drawingXmlToText(await zip.file(name)!.async('string'));
    const notes = zip.file(name.replace('slides/slide', 'notesSlides/notesSlide'));
    if (notes) {
      const n = drawingXmlToText(await notes.async('string')).replace(/^\d+$/gm, '').trim();
      if (n) text += `\nNotes: ${n}`;
    }
    if (text.trim()) parts.push(`[Slide ${i + 1}]\n${text}`);
  }
  return { text: parts.join('\n\n'), pages: slideNames.length, ocrPages: 0, kind: 'pptx' };
}

async function readXlsx(file: Blob): Promise<Extracted> {
  const mod = await import('exceljs');
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const parts: string[] = [];
  for (const ws of wb.worksheets) {
    const rows: string[] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells = (row.values as unknown[]).slice(1).map((v) => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') {
          const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
          return o.richText ? o.richText.map((r) => r.text).join('') : String(o.text ?? o.result ?? '');
        }
        return String(v);
      });
      if (cells.some((c) => c.trim())) rows.push(cells.join(' | '));
    });
    if (rows.length) parts.push(`[Sheet: ${ws.name}]\n${rows.join('\n')}`);
  }
  return { text: parts.join('\n\n'), pages: wb.worksheets.length, ocrPages: 0, kind: 'xlsx' };
}

async function readOdf(file: Blob): Promise<Extracted> {
  const zip = await readZip(file);
  const content = zip.file('content.xml');
  if (!content) throw new Error('This OpenDocument file has no content.');
  return { text: odfXmlToText(await content.async('string')), pages: 0, ocrPages: 0, kind: 'odf' };
}

// ------------------------------------------------------------------ text --

export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript').forEach((n) => n.remove());
  doc.querySelectorAll('br').forEach((n) => n.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,tr,section,article').forEach((n) => n.append('\n'));
  return (doc.body?.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

export function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Read any supported file. Throws a readable error for unsupported formats. */
export async function extractFile(file: File, onProgress?: Progress): Promise<Extracted> {
  const ext = extOf(file.name);
  onProgress?.(`Opening ${file.name}…`, 0);
  if (ext === 'pdf' || file.type === 'application/pdf') return readPdf(file, onProgress);
  if (isImage(file)) {
    const text = await ocrImage(file, onProgress);
    return { text, pages: 1, ocrPages: 1, kind: 'image', note: text ? undefined : 'No readable text was found in the image.' };
  }
  if (ext === 'docx' || ext === 'docm' || ext === 'dotx') return readDocx(file);
  if (ext === 'pptx' || ext === 'ppsx' || ext === 'potx') return readPptx(file);
  if (ext === 'xlsx' || ext === 'xlsm') return readXlsx(file);
  if (ext === 'odt' || ext === 'odp' || ext === 'ods') return readOdf(file);
  if (ext === 'doc' || ext === 'ppt' || ext === 'xls')
    throw new Error(`Old .${ext} files cannot be read on the device. Open it in Word/PowerPoint/Excel and save it as .${ext}x or PDF, then upload it again.`);
  const raw = await file.text();
  if (ext === 'html' || ext === 'htm') return { text: htmlToText(raw), pages: 0, ocrPages: 0, kind: 'text' };
  if (ext === 'rtf') return { text: rtfToText(raw), pages: 0, ocrPages: 0, kind: 'text' };
  if (raw.includes('\u0000')) throw new Error(`${file.name} is not a document format Deep Tutor Pro can read.`);
  return { text: raw.trim(), pages: 0, ocrPages: 0, kind: 'text' };
}

/** Read an image file as a data URL (for sending photos to Deep Solve), downscaled. */
export async function imageToDataUrl(file: Blob, maxSide = 1600, quality = 0.85): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This image could not be opened.'));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Pick the most relevant passages of a reference for a topic (simple keyword scoring). */
export function relevantExcerpt(text: string, query: string, maxChars = 12_000): string {
  if (text.length <= maxChars) return text;
  const words = [...new Set(query.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [])];
  if (!words.length) return text.slice(0, maxChars);
  const chunks = text.split(/\n{2,}/);
  const scored = chunks.map((c, i) => {
    const lower = c.toLowerCase();
    const score = words.reduce((s, w) => s + (lower.split(w).length - 1), 0);
    return { i, c, score };
  });
  const top = scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);
  const keep = new Set<number>();
  let size = 0;
  for (const x of top) {
    for (const j of [x.i - 1, x.i, x.i + 1]) {
      if (j < 0 || j >= chunks.length || keep.has(j)) continue;
      if (size + chunks[j].length > maxChars) continue;
      keep.add(j);
      size += chunks[j].length + 2;
    }
    if (size >= maxChars) break;
  }
  if (!keep.size) return text.slice(0, maxChars);
  return [...keep]
    .sort((a, b) => a - b)
    .map((j) => chunks[j])
    .join('\n\n');
}
