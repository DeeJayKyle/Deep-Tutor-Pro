import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { docxXmlToText, drawingXmlToText, extOf, extractFile, htmlToText, isImage, odfXmlToText, relevantExcerpt, rtfToText } from '../src/lib/extract';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const P = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

const para = (text: string, style?: string) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const cell = (text: string) => `<w:tc>${para(text)}</w:tc>`;
const DOCX_BODY = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W}><w:body>
${para('Diploma in Pharmacy', 'Heading1')}
${para('Unit outline', 'Heading2')}
<w:p><w:r><w:t>Line one</w:t><w:br/><w:t>line two</w:t><w:tab/><w:t>tabbed</w:t></w:r></w:p>
${para('   ')}
<w:tbl><w:tr>${cell('Code')}${cell('Title')}</w:tr><w:tr>${cell('PHA 101')}<w:tc>${para('Pharma-')}${para('ceutics')}</w:tc></w:tr><w:tr>${cell('')}${cell('')}</w:tr></w:tbl>
<w:sdt><w:sdtContent>${para('Inside content control')}</w:sdtContent></w:sdt>
</w:body></w:document>`;

const slideXml = (...paras: string[]) =>
  `<?xml version="1.0"?><p:sld ${P} ${A}><p:cSld><p:spTree><p:sp><p:txBody>${paras.map((t) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;

async function zipFile(name: string, files: Record<string, string>, type = ''): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const bytes = await zip.generateAsync({ type: 'arraybuffer' });
  return new File([bytes], name, { type });
}

describe('docxXmlToText', () => {
  it('turns Heading styles into # and tables into "a | b" lines', () => {
    expect(docxXmlToText(DOCX_BODY).split('\n')).toEqual([
      '# Diploma in Pharmacy',
      '## Unit outline',
      'Line one',
      'line two\ttabbed',
      'Code | Title',
      'PHA 101 | Pharma- ceutics',
      'Inside content control',
    ]);
  });
  it('does not throw on malformed XML', () => {
    expect(() => docxXmlToText('<w:document><unclosed>')).not.toThrow();
  });
});

describe('drawingXmlToText / odfXmlToText', () => {
  it('reads one line per DrawingML paragraph', () => {
    expect(drawingXmlToText(`<x ${A}><a:p><a:r><a:t>Hello </a:t></a:r><a:r><a:t>world</a:t></a:r></a:p><a:p/><a:p><a:r><a:t>Two</a:t></a:r></a:p></x>`)).toBe('Hello world\nTwo');
  });
  it('reads OpenDocument headings and paragraphs', () => {
    const T = 'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"';
    const xml = `<doc ${T}><text:h text:outline-level="2">Heading</text:h><text:p>Body <text:span>text</text:span></text:p><text:p/></doc>`;
    expect(odfXmlToText(xml)).toBe('## Heading\nBody text');
  });
});

describe('htmlToText / rtfToText', () => {
  it('strips scripts and keeps block breaks', () => {
    const text = htmlToText('<html><head><style>p{}</style></head><body><h1>Title</h1><script>alert(1)</script><p>Para<br>next</p><ul><li>a</li><li>b</li></ul></body></html>');
    expect(text).toContain('Title');
    expect(text).toContain('Para\nnext');
    expect(text).toMatch(/a\s*\n\s*b/);
    expect(text).not.toContain('alert');
    expect(text).not.toContain('p{}');
  });
  it('removes RTF control words and decodes hex escapes', () => {
    const text = rtfToText("{\\rtf1\\ansi{\\fonttbl\\f0 Arial;}{\\*\\generator Writer;}\\f0\\fs24 Caf\\'e9 one\\par Two\\par}");
    expect(text.split('\n').map((l) => l.trim())).toEqual(['Arial;Café one', 'Two']);
    expect(text).not.toMatch(/\\|[{}]|generator/);
  });
});

describe('extractFile', () => {
  it('reads a real .docx with footnotes', async () => {
    const file = await zipFile('outline.docx', {
      '[Content_Types].xml': '<Types/>',
      'word/document.xml': DOCX_BODY,
      'word/footnotes.xml': `<w:footnotes ${W}><w:footnote>${para('A footnote')}</w:footnote></w:footnotes>`,
    });
    const out = await extractFile(file);
    expect(out.kind).toBe('docx');
    expect(out.text).toContain('# Diploma in Pharmacy');
    expect(out.text).toContain('Code | Title');
    expect(out.text.endsWith('\n\nA footnote')).toBe(true);
  });

  it('rejects a .docx without a document body', async () => {
    await expect(extractFile(await zipFile('empty.docx', { 'x.txt': 'x' }))).rejects.toThrow('no document body');
  });

  it('reads a real .pptx in slide order with speaker notes', async () => {
    const file = await zipFile('deck.pptx', {
      'ppt/slides/slide1.xml': slideXml('Welcome', 'Pharmacology'),
      'ppt/slides/slide2.xml': slideXml('Analgesics'),
      'ppt/slides/slide10.xml': slideXml('Summary'),
      'ppt/slides/slide3.xml': slideXml(),
      'ppt/notesSlides/notesSlide2.xml': slideXml('Ask about paracetamol', '2'),
    });
    const out = await extractFile(file);
    expect(out.kind).toBe('pptx');
    expect(out.pages).toBe(4);
    expect(out.text).toBe('[Slide 1]\nWelcome\nPharmacology\n\n[Slide 2]\nAnalgesics\nNotes: Ask about paracetamol\n\n[Slide 4]\nSummary');
  });

  it('reads plain text, HTML and RTF files', async () => {
    expect(await extractFile(new File(['  hello\nworld  '], 'a.txt'))).toEqual({ text: 'hello\nworld', pages: 0, ocrPages: 0, kind: 'text' });
    expect((await extractFile(new File(['<p>Hi</p>'], 'a.html'))).text).toBe('Hi');
    expect((await extractFile(new File(['{\\rtf1 Hello\\par}'], 'a.rtf'))).text).toBe('Hello');
  });

  it('gives readable errors for old Office and binary files', async () => {
    await expect(extractFile(new File(['x'], 'old.doc'))).rejects.toThrow(/save it as \.docx/);
    await expect(extractFile(new File(['ab\u0000cd'], 'blob.bin'))).rejects.toThrow('not a document format');
  });

  it('reports progress', async () => {
    const calls: string[] = [];
    await extractFile(new File(['x'], 'p.md'), (m) => calls.push(m));
    expect(calls[0]).toBe('Opening p.md…');
  });
});

describe('helpers', () => {
  it('extOf and isImage', () => {
    expect(extOf('A.Report.PDF')).toBe('pdf');
    expect(extOf('noext')).toBe('noext');
    expect(isImage({ name: 'scan.JPG' })).toBe(true);
    expect(isImage({ name: 'x', type: 'image/png' })).toBe(true);
    expect(isImage({ name: 'x.pdf', type: 'application/pdf' })).toBe(false);
  });

  it('relevantExcerpt returns short text as is and picks matching passages from long text', () => {
    expect(relevantExcerpt('short', 'anything')).toBe('short');
    const chunks = Array.from({ length: 200 }, (_, i) => (i === 120 ? 'Insulin dosing for diabetes mellitus explained.' : `Filler paragraph ${i} about unrelated history.`));
    const text = chunks.join('\n\n');
    const ex = relevantExcerpt(text, 'insulin diabetes', 300);
    expect(ex).toContain('Insulin dosing');
    expect(ex.length).toBeLessThanOrEqual(300);
    expect(ex).toContain('Filler paragraph 119'); // neighbouring context kept
    expect(relevantExcerpt(text, '', 100)).toBe(text.slice(0, 100));
    expect(relevantExcerpt(text, 'zebra crossing', 100)).toBe(text.slice(0, 100));
  });
});
