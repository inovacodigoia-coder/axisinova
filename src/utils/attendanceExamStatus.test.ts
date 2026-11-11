import { describe, it, expect } from 'vitest';
import { attendanceExamStatus } from './attendanceExamStatus';

const typed = { status: 'digitized', values: [{ value: '12' }], typedAt: '2026-11-10T10:00:00Z' };

describe('status do exame no Detalhes Atendimento', () => {
  it('recoleta solicitada em exame digitado volta para Aberto', () => {
    expect(attendanceExamStatus({ recollection: { requestedAt: '2026-11-10T12:00:00Z' } }, typed, false)).toBe('aberto');
  });
  it('recoleta solicitada sem resultado mostra Aberto', () => {
    expect(attendanceExamStatus({ recollection: { requestedAt: '2026-11-10T12:00:00Z' } }, null, false)).toBe('aberto');
  });
  it('recoleta com amostra coletada de novo mostra Aguardando', () => {
    expect(attendanceExamStatus({ recollection: { requestedAt: '2026-11-10T12:00:00Z' } }, typed, true)).toBe('aguardando');
  });
  it('digitado de novo depois da recoleta volta a D', () => {
    expect(attendanceExamStatus({ recollection: { requestedAt: '2026-11-10T09:00:00Z' } }, typed, true)).toBe('D');
  });
  it('liberado continua L mesmo com recoleta registrada', () => {
    expect(attendanceExamStatus({ recollection: { requestedAt: '2026-11-10T12:00:00Z' } }, { ...typed, status: 'released' }, false)).toBe('L');
  });
  it('sem recoleta: digitado é D e não coletado é Aberto', () => {
    expect(attendanceExamStatus({}, typed, true)).toBe('D');
    expect(attendanceExamStatus({}, null, false)).toBe('aberto');
  });
});
