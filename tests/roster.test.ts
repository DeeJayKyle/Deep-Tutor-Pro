import { describe, expect, it } from 'vitest';
import { mapHeader, parseCsv, parseRoster, toCsv } from '../src/lib/roster';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, embedded commas and newlines', () => {
    const csv = 'Name,Notes\r\n"Doe, Jane","said ""hi""\nthen left"\r\nPlain,x\n';
    expect(parseCsv(csv)).toEqual([
      ['Name', 'Notes'],
      ['Doe, Jane', 'said "hi"\nthen left'],
      ['Plain', 'x'],
    ]);
  });
  it('detects semicolon and tab delimiters', () => {
    expect(parseCsv('Name;Reg No\n"Doe; Jane";A,1')).toEqual([
      ['Name', 'Reg No'],
      ['Doe; Jane', 'A,1'],
    ]);
    expect(parseCsv('Name\tReg\nJane\tR1')).toEqual([
      ['Name', 'Reg'],
      ['Jane', 'R1'],
    ]);
  });
  it('strips a UTF-8 BOM so the first header still matches', () => {
    const rows = parseCsv('﻿Reg No,Name\nR1,Jane');
    expect(rows[0][0]).toBe('Reg No');
    expect(mapHeader(rows[0][0])).toBe('regNo');
  });
  it('drops blank lines, trims cells and keeps a last line without newline', () => {
    expect(parseCsv('a , b\n\n , \n c,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsv('')).toEqual([]);
  });
  it('round-trips through toCsv', () => {
    const rows = [
      ['Name', 'Notes', 'Score'],
      ['Doe, Jane', 'said "hi"\nthen left', '12'],
      ['A;B', '', '0'],
    ];
    const csv = toCsv(rows);
    expect(csv.split('\r\n')[0]).toBe('Name,Notes,Score');
    expect(parseCsv(csv)).toEqual(rows);
    expect(toCsv([[null, undefined, 3]])).toBe(',,3');
  });
});

describe('mapHeader', () => {
  it.each([
    ['Reg No', 'regNo'],
    ['Reg. No.', 'regNo'],
    ['Registration Number', 'regNo'],
    ['Adm. No', 'regNo'],
    ['Admission No', 'regNo'],
    ['Student ID', 'regNo'],
    ['Index #', 'regNo'],
    ['Name', 'fullName'],
    ['Full names', 'fullName'],
    ['Student Name', 'fullName'],
    ['First Name', 'firstName'],
    ['Given name', 'firstName'],
    ['SURNAME', 'lastName'],
    ['Last_Name', 'lastName'],
    ['Other Names', 'otherNames'],
    ['Sex', 'gender'],
    ['Gender', 'gender'],
    ['DOB', 'dateOfBirth'],
    ['Date of birth', 'dateOfBirth'],
    ['NIN', 'nationalId'],
    ['Phone Number', 'phone'],
    ['E-mail', 'email'],
    ['Home District', 'address'],
    ['Next of kin', 'guardianName'],
    ['Next of Kin Phone', 'guardianPhone'],
    ["Parent's contact", 'guardianPhone'],
    ['Next of kin relationship', 'guardianRelation'],
    ['Relationship', 'guardianRelation'],
    ['Sponsorship', 'sponsorship'],
    ['Status', 'status'],
    ['Remarks', 'notes'],
  ])('%s → %s', (header, key) => {
    expect(mapHeader(header)).toBe(key);
  });
  it('returns null for unknown headers', () => {
    expect(mapHeader('Favourite colour')).toBeNull();
    expect(mapHeader('')).toBeNull();
  });
});

describe('parseRoster', () => {
  it('maps columns, splits names and normalises values', () => {
    const rows = parseCsv(
      [
        'Adm. No,Name,Sex,Email,Next of kin,Next of kin phone,Status,Shoe size',
        'A/001,OKELLO John Paul,M,john@example.com,Mary,0700,On leave,42',
        'A/002,Jane Mary Doe,female,jane@,,,,',
        'A/003,"NAKATO, Sarah",F,,,,graduated,',
        'A/004,Madonna,,,,,,',
        'A/005,,,,,,,',
      ].join('\n'),
    );
    const { rows: out, unknownHeaders } = parseRoster(rows);
    expect(unknownHeaders).toEqual(['Shoe size']);
    expect(out).toHaveLength(5);

    expect(out[0].values).toEqual({ regNo: 'A/001', lastName: 'OKELLO', firstName: 'John', otherNames: 'Paul', gender: 'Male', email: 'john@example.com', guardianName: 'Mary', guardianPhone: '0700', status: 'Deferred' });
    expect(out[0].problems).toEqual([]);

    expect(out[1].values).toMatchObject({ firstName: 'Jane', otherNames: 'Mary', lastName: 'Doe', gender: 'Female' });
    expect(out[1].problems).toEqual(['email looks wrong']);

    expect(out[2].values).toMatchObject({ lastName: 'NAKATO', firstName: 'Sarah', otherNames: '', status: 'Graduated', gender: 'Female' });

    expect(out[3].values).toMatchObject({ firstName: 'Madonna', lastName: '', otherNames: '' });
    expect(out[3].problems).toEqual([]);

    expect(out[4].values).toEqual({ regNo: 'A/005' });
    expect(out[4].problems).toEqual(['no name']);
  });

  it('keeps separate name columns and ignores the full-name split', () => {
    const { rows } = parseRoster([
      ['First name', 'Surname', 'Name', 'Gender'],
      ['Ann', 'Lee', 'IGNORED Name', 'x'],
    ]);
    expect(rows[0].values).toEqual({ firstName: 'Ann', lastName: 'Lee', gender: 'Other' });
  });

  it('maps status words', () => {
    const { rows } = parseRoster([['Name', 'Status'], ['A B', 'Suspended'], ['A B', 'Dropped out'], ['A B', 'completed'], ['A B', 'whatever']]);
    expect(rows.map((r) => r.values.status)).toEqual(['Suspended', 'Discontinued', 'Completed', 'Active']);
  });

  it('handles empty input and rows shorter than the header', () => {
    expect(parseRoster([])).toEqual({ rows: [], unknownHeaders: [] });
    const { rows } = parseRoster([['Reg No', 'Name', 'Email'], ['R1']]);
    expect(rows[0]).toEqual({ values: { regNo: 'R1' }, problems: ['no name'] });
  });
});
