import type { Reference, ReferenceCategory } from '../lib/model';
import { extractFile, isImage, type Progress } from '../lib/extract';
import { now, uid } from '../lib/workspace';
import { upsert } from './store';

export const CATEGORY_LABEL: Record<ReferenceCategory, string> = {
  curriculum: 'Curriculum / teacher’s guide',
  textbook: 'Textbook',
  guideline: 'Guideline / protocol',
  past_paper: 'Past exam paper',
  notes: 'Notes / slides',
  image: 'Image / diagram',
  other: 'Other',
};

export function guessCategory(name: string, text = ''): ReferenceCategory {
  const s = `${name} ${text.slice(0, 3000)}`.toLowerCase();
  if (/curricul|syllabus|teacher'?s guide|course outline|programme structure/.test(s)) return 'curriculum';
  if (/exam(ination)?|past paper|question paper|\bcat\b|instructions to candidates/.test(s)) return 'past_paper';
  if (/guideline|protocol|formulary|pharmacopoeia|policy|standard treatment/.test(s)) return 'guideline';
  if (/slide|lecture|notes/.test(s)) return 'notes';
  if (/\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(name.toLowerCase())) return 'image';
  return 'textbook';
}

/** Read a file on the device and add it to the library. */
export async function addReference(file: File, opts: { category?: ReferenceCategory; unitIds?: string[]; onProgress?: Progress } = {}): Promise<Reference> {
  const ex = await extractFile(file, opts.onProgress);
  if (!ex.text.trim()) {
    throw new Error(
      isImage(file)
        ? `No readable text was found in ${file.name}. Use a sharper, well-lit photo.`
        : `No text could be read from ${file.name}.${ex.kind === 'pdf' ? ' The scanned pages may be too faint for OCR.' : ''}`,
    );
  }
  const ref: Reference = {
    id: uid('r-'),
    name: file.name,
    category: opts.category ?? guessCategory(file.name, ex.text),
    mime: file.type,
    size: file.size,
    text: ex.text,
    pages: ex.pages,
    ocrPages: ex.ocrPages,
    unitIds: opts.unitIds ?? [],
    addedAt: now(),
  };
  upsert('references', ref);
  return ref;
}

export function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
