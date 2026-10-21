import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { exportDocx, exportPdf, exportPptx, exportXlsx, fileName, readXlsxRows, saveBlob } from '../src/lib/exporters';
import { extractFile } from '../src/lib/extract';

const MD = `# Pain management

Paracetamol is **first line** for mild pain [Source: WHO ladder].

## Dosing

1. Adults: 1 g every 6 hours
2. Maximum 4 g per day
   - lower in liver disease

- Monitor liver function
- Avoid duplicates

| Drug | Dose |
|---|---|
| Paracetamol | 1 g |
| Ibuprofen | 400 mg |

> Always check allergies.

\`\`\`
dose = weight * 15
\`\`\`

---

Notes: Ask students about OTC products.
`;

const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());
const head = async (b: Blob, n: number) => String.fromCharCode(...(await bytes(b)).slice(0, n));

describe('exportDocx', () => {
  it('produces a Word file containing the text', async () => {
    const blob = await exportDocx(MD, { title: 'Lecture 1', subtitle: 'PHA 101', institution: 'Test School', status: 'draft', aiAssisted: true });
    expect(blob.size).toBeGreaterThan(1000);
    expect(await head(blob, 2)).toBe('PK');
    const zip = await JSZip.loadAsync(await bytes(blob));
    const xml = await zip.file('word/document.xml')!.async('string');
    for (const t of ['Lecture 1', 'TEST SCHOOL', 'Pain management', 'first line', 'Maximum 4 g per day', 'Ibuprofen', '400 mg', 'Always check allergies.', 'dose = weight * 15'])
      expect(xml).toContain(t);
    const footer = Object.keys(zip.files).filter((n) => /word\/footer\d*\.xml/.test(n));
    expect(footer.length).toBeGreaterThan(0);
    const footerXml = await zip.file(footer[0])!.async('string');
    expect(footerXml).toContain('DRAFT');
    expect(footerXml).toContain('AI-assisted, reviewed by tutor');
    // and our own reader can read it back
    const back = await extractFile(new File([await bytes(blob)], 'x.docx'));
    expect(back.text).toContain('Pain management');
    expect(back.text).toContain('Paracetamol | 1 g');
  });

  it('handles empty markdown', async () => {
    const blob = await exportDocx('');
    expect(await head(blob, 2)).toBe('PK');
  });
});

describe('exportPptx', () => {
  it('produces a PowerPoint file with slide text and notes', async () => {
    const blob = await exportPptx(MD, { title: 'Pain deck', subtitle: 'Week 1' });
    expect(blob.size).toBeGreaterThan(1000);
    expect(await head(blob, 2)).toBe('PK');
    const zip = await JSZip.loadAsync(await bytes(blob));
    const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slides.length).toBeGreaterThanOrEqual(3);
    const all = (await Promise.all(slides.map((n) => zip.file(n)!.async('string')))).join('\n');
    for (const t of ['Pain deck', 'Week 1', 'Dosing', 'Monitor liver function', 'Ibuprofen']) expect(all).toContain(t);
    const notes = Object.keys(zip.files).filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n));
    const notesText = (await Promise.all(notes.map((n) => zip.file(n)!.async('string')))).join('\n');
    expect(notesText).toContain('Ask students about OTC products.');
    const back = await extractFile(new File([await bytes(blob)], 'x.pptx'));
    expect(back.text).toContain('Monitor liver function');
  });

  it('splits long sections over several slides', async () => {
    const long = '## Many points\n' + Array.from({ length: 20 }, (_, i) => `- point ${i + 1}`).join('\n');
    const zip = await JSZip.loadAsync(await bytes(await exportPptx(long)));
    const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slides).toHaveLength(1 + 3); // title + 9 + 9 + 2
    const all = (await Promise.all(slides.map((n) => zip.file(n)!.async('string')))).join('\n');
    expect(all).toContain('Many points (cont.)');
    expect(all).toContain('point 20');
  });
});

describe('exportPdf', () => {
  it('produces a PDF', async () => {
    const blob = await exportPdf(MD + '\n' + 'Long paragraph text. '.repeat(600), { title: 'Lecture', institution: 'School' });
    expect(blob.size).toBeGreaterThan(1000);
    expect(await head(blob, 5)).toBe('%PDF-');
    const text = new TextDecoder('latin1').decode(await bytes(blob));
    expect(text).toContain('Pain management');
    expect((text.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1); // the long paragraph flows onto further pages
  });
});

describe('exportXlsx / readXlsxRows', () => {
  it('round-trips a sheet', async () => {
    const blob = await exportXlsx(
      [
        {
          name: 'Marks: PHA/101?',
          columns: [
            { header: 'Reg No', key: 'reg' },
            { header: 'Name', key: 'name' },
            { header: 'Score', key: 'score' },
          ],
          rows: [
            { reg: 'R1', name: 'Doe, Jane', score: 75.5 },
            { reg: 'R2', name: 'Peter', score: null },
          ],
          notes: ['Generated for testing'],
        },
        { name: 'Second', columns: [{ header: 'X', key: 'x' }], rows: [] },
      ],
      { author: 'Tester' },
    );
    expect(await head(blob, 2)).toBe('PK');
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const rows = await readXlsxRows(blob);
    expect(rows).toEqual([
      ['Reg No', 'Name', 'Score'],
      ['R1', 'Doe, Jane', '75.5'],
      ['R2', 'Peter'],
      ['Generated for testing'],
    ]);
    const zip = await JSZip.loadAsync(await bytes(blob));
    const wb = await zip.file('xl/workbook.xml')!.async('string');
    expect(wb).toContain('name="Marks  PHA 101 "');
    expect(wb).toContain('name="Second"');
  });
});

describe('fileName / saveBlob', () => {
  it('builds safe file names', () => {
    expect(fileName('Lecture 1: Pain & Fever', 'docx')).toBe('lecture-1-pain-fever.docx');
    expect(fileName(undefined, 'pdf')).toBe('document.pdf');
    expect(fileName('!!!', 'pdf')).toBe('document.pdf');
  });
  it('refuses to save an empty file', async () => {
    await expect(saveBlob(new Blob([]), 'x.pdf')).rejects.toThrow('empty');
  });
});
