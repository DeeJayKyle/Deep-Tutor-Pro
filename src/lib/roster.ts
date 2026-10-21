import type { Gender, Student } from './model';

/** Parse CSV (quoted fields, commas or semicolons) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map((c) => {
    let s = c === null || c === undefined ? '' : String(c);
    // Neutralise spreadsheet formulas in user text (CSV injection).
    if (typeof c === 'string' && /^\s*[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n');
}

type Key = keyof Pick<
  Student,
  'regNo' | 'firstName' | 'lastName' | 'otherNames' | 'gender' | 'dateOfBirth' | 'nationalId' | 'phone' | 'email' | 'address' | 'nationality' | 'guardianName' | 'guardianPhone' | 'guardianRelation' | 'admissionDate' | 'sponsorship' | 'status' | 'notes'
> | 'fullName';

const HEADERS: [RegExp, Key][] = [
  [/^(reg(istration)?|adm(ission)?|index|student)\.?\s*(no|number|#|id)?\.?$/, 'regNo'],
  [/^(full\s*)?names?$|^student\s*name$/, 'fullName'],
  [/^(first|given)\s*name|^forename/, 'firstName'],
  [/^(last|sur|family)\s*name|^surname$/, 'lastName'],
  [/^(other|middle)\s*names?/, 'otherNames'],
  [/^(gender|sex)$/, 'gender'],
  [/^(date\s*of\s*birth|dob|birth\s*date)$/, 'dateOfBirth'],
  [/^(national\s*id|nin|id\s*(no|number))$/, 'nationalId'],
  [/^(phone|tel|telephone|mobile|contact)(\s*(no|number))?$/, 'phone'],
  [/^e-?mail(\s*address)?$/, 'email'],
  [/^(address|home|district|residence|home\s*district)/, 'address'],
  [/^nationality$/, 'nationality'],
  [/^(guardian|parent|next\s*of\s*kin)(\s*name)?$/, 'guardianName'],
  [/^(guardian|parent|next\s*of\s*kin)('?s)?\s*(phone|tel|contact)/, 'guardianPhone'],
  [/^(guardian|next\s*of\s*kin)\s*relation/, 'guardianRelation'],
  [/^relationship$/, 'guardianRelation'],
  [/^(admission|enrol+ment|entry)\s*date$/, 'admissionDate'],
  [/^(sponsor(ship)?|funding)$/, 'sponsorship'],
  [/^(status|enrol+ment\s*status)$/, 'status'],
  [/^(notes?|remarks?|comments?)$/, 'notes'],
];

export function mapHeader(h: string): Key | null {
  const s = h.toLowerCase().replace(/[_*]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [re, key] of HEADERS) if (re.test(s)) return key;
  return null;
}

function normGender(v: string): Gender {
  const s = v.trim().toLowerCase();
  if (/^f/.test(s)) return 'Female';
  if (/^m/.test(s)) return 'Male';
  return s ? 'Other' : '';
}

export interface RosterRow {
  values: Partial<Student>;
  problems: string[];
}

/** Map spreadsheet rows (first row = headers) to student records. */
export function parseRoster(rows: string[][]): { rows: RosterRow[]; unknownHeaders: string[] } {
  if (!rows.length) return { rows: [], unknownHeaders: [] };
  const [head, ...body] = rows;
  const keys = head.map(mapHeader);
  const unknownHeaders = head.filter((_, i) => !keys[i] && head[i]);
  const out: RosterRow[] = [];
  for (const r of body) {
    const v: Partial<Student> & { fullName?: string } = {};
    keys.forEach((k, i) => {
      if (!k || !r[i]) return;
      (v as Record<string, string>)[k] = r[i];
    });
    if (v.fullName && !v.firstName && !v.lastName) {
      const parts = v.fullName.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
      // "SURNAME Given Names" (surname in capitals) is common on class lists.
      if (parts.length > 1 && parts[0] === parts[0].toUpperCase() && parts[1] !== parts[1].toUpperCase()) {
        v.lastName = parts[0];
        v.firstName = parts[1];
        v.otherNames = parts.slice(2).join(' ');
      } else {
        v.firstName = parts[0] ?? '';
        v.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        v.otherNames = parts.slice(1, -1).join(' ');
      }
    }
    delete v.fullName;
    if (v.gender) v.gender = normGender(v.gender);
    if (v.status) {
      const s = v.status.toLowerCase();
      v.status = /defer|leave/.test(s) ? 'Deferred' : /susp/.test(s) ? 'Suspended' : /discon|drop|withdr/.test(s) ? 'Discontinued' : /grad/.test(s) ? 'Graduated' : /compl/.test(s) ? 'Completed' : 'Active';
    }
    const problems: string[] = [];
    if (!v.firstName && !v.lastName) problems.push('no name');
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) problems.push('email looks wrong');
    if (Object.keys(v).length) out.push({ values: v, problems });
  }
  return { rows: out, unknownHeaders };
}
