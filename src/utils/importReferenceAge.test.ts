import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { importReferenceAge } from './importReferenceAge';

describe('catalog reference age import', () => {
  it('preserves the exported newborn and infant ranges through an Excel round trip', () => {
    const rows = [
      { 'Idade mínima': 0, 'Idade máxima': 1, 'Unidade da Idade': 'Semanas' },
      { 'Idade mínima': 2, 'Idade máxima': 52, 'Unidade da Idade': 'Semanas' },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Faixas de Referência');
    const restored = XLSX.read(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
    const imported = XLSX.utils.sheet_to_json<Record<string, unknown>>(restored.Sheets['Faixas de Referência']);
    expect(imported.map(importReferenceAge)).toEqual([
      { minAge: 0, maxAge: 1, ageUnit: 'semanas' },
      { minAge: 2, maxAge: 52, ageUnit: 'semanas' },
    ]);
  });
  it.each(['Anos', 'Meses', 'Semanas', 'Dias'])('reads %s with abbreviated headers and preserves zero', unit => {
    expect(importReferenceAge({ 'Idade Mín (anos)': 0, 'Idade Máx (anos)': 0, 'Unidade da idade': unit }))
      .toEqual({ minAge: 0, maxAge: 0, ageUnit: unit.toLowerCase() });
  });
  it('supports legacy headers and defaults to years only when the unit is absent', () => {
    expect(importReferenceAge({ 'Idade mínima (anos)': 18, 'Idade máxima (anos)': 150 }))
      .toEqual({ minAge: 18, maxAge: 150, ageUnit: 'anos' });
  });
  it('accepts case, accents, whitespace and decimal commas', () => {
    expect(importReferenceAge({ ' IDADE MINIMA ': '0,5', 'IDADE MAXIMA': 2, 'UNIDADE DA IDADE': ' months ' }))
      .toEqual({ minAge: 0.5, maxAge: 2, ageUnit: 'meses' });
  });
  it('rejects invalid values instead of silently replacing them', () => {
    expect(() => importReferenceAge({ 'Idade mínima': 'abc' })).toThrow();
    expect(() => importReferenceAge({ 'Unidade da Idade': 'unknown' })).toThrow();
  });
});