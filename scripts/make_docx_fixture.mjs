// Builds e2e/fixtures/pharmacokinetics-chapter.docx (a reference-upload fixture).
// Run: node scripts/make_docx_fixture.mjs
import { writeFileSync } from 'node:fs';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, ShadingType } from 'docx';

const W = [2400, 4400, 2200];
const cell = (text, i, head = false) =>
  new TableCell({
    width: { size: W[i], type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: 'E8EEF7', color: 'auto' } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: head })] })],
  });
const row = (cells, head) => new TableRow({ tableHeader: head, children: cells.map((c, i) => cell(c, i, head)) });
const para = (text) => new Paragraph({ children: [new TextRun(text)] });

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Pharmacokinetics')] }),
        para('Pharmacokinetics describes what the body does to a drug over time: absorption, distribution, metabolism and excretion (ADME).'),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Absorption')] }),
        para('Absorption is the movement of a drug from its site of administration into the bloodstream. Oral bioavailability is reduced by first-pass metabolism in the liver.'),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Distribution')] }),
        para('Distribution depends on blood flow, plasma protein binding and lipid solubility. The volume of distribution relates the amount in the body to the plasma concentration.'),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Metabolism')] }),
        para('Hepatic enzymes convert drugs to more water-soluble metabolites in phase I and phase II reactions.'),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Excretion')] }),
        para('The kidneys excrete most drugs and metabolites; clearance and half-life determine the dosing interval.'),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: W,
          rows: [
            row(['Parameter', 'Meaning', 'Unit'], true),
            row(['Half-life', 'Time for plasma concentration to fall by half', 'hours'], false),
            row(['Clearance', 'Volume of plasma cleared of drug per unit time', 'mL/min'], false),
          ],
        }),
      ],
    },
  ],
});
writeFileSync(new URL('../e2e/fixtures/pharmacokinetics-chapter.docx', import.meta.url), await Packer.toBuffer(doc));
console.log('Wrote e2e/fixtures/pharmacokinetics-chapter.docx');
