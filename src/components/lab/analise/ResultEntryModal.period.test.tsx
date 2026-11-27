import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultEntryModal } from './ResultEntryModal';
import { buscaSoNumeros } from '@/lib/buscaEtiqueta';

const apoio = vi.hoisted(() => ({ porExame: {}, recarregar: vi.fn() }));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useResultEntryPermissions', () => ({ useResultEntryPermissions: () => ({ canType: false, canRelease: false, canCorrect: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => {
    const query: any = { then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }) };
    for (const key of ['select', 'eq', 'in', 'order', 'range']) query[key] = () => query;
    return query;
  },
} }));
vi.mock('@/components/apoio/useApoioCancelamento', () => ({ useApoioCancelamento: () => ({ cancelarNoApoio: vi.fn(), dialog: null }) }));
vi.mock('./apoio/apoioAnalise', async importOriginal => ({
  ...await importOriginal<typeof import('./apoio/apoioAnalise')>(),
  useApoioAnalise: () => apoio,
}));
vi.mock('@/components/lab/PDFPreviewModal', () => ({ default: () => null }));
vi.mock('./DesliberarExameDialog', () => ({ DesliberarExameDialog: () => null, AvisoRetesteLiberadoDialog: () => null }));
vi.mock('./InstrumentGraphicsSection', () => ({ InstrumentGraphicsSection: () => null }));

const exams = [
  { id: 'p27:e', examId: 'e', orderId: 'p27', protocol: '27-01', patientName: 'Paciente de hoje', registeredAt: '2026-11-27T12:00:00Z', name: 'Hemograma', status: 'pending' },
  { id: 'p24:e', examId: 'e', orderId: 'p24', protocol: '24-01', patientName: 'Paciente de 24 novembro', registeredAt: '2026-11-24T12:00:00Z', name: 'Hemograma', status: 'released' },
];
const props = { isOpen: true, onClose: vi.fn(), filteredExams: exams, workbenchNames: {}, establishmentNames: {} };
const filters = { period: 'hoje', workbenches: [], establishments: [], protocol: '' };

describe('recorte de pacientes ao abrir Digitação', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 27, 13, 27)); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('Hoje não mostra paciente de 24/11 em Todos nem em 1 por vez', async () => {
    render(<ResultEntryModal {...props} filters={{ ...filters, ignorarPeriodo: buscaSoNumeros('') }} />);
    expect(await screen.findByText('Paciente de hoje')).toBeInTheDocument();
    expect(screen.queryByText('Paciente de 24 novembro')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1 por vez' }));
    expect(screen.queryByText('Paciente de 24 novembro')).not.toBeInTheDocument();
  });

  it('trocar Últimos 7 dias por Hoje recorta novamente os pacientes da janela aberta', async () => {
    const { rerender } = render(<ResultEntryModal {...props} filters={{ ...filters, period: '7d' }} />);
    expect(await screen.findByText('Paciente de 24 novembro')).toBeInTheDocument();
    rerender(<ResultEntryModal {...props} filters={filters} />);
    expect(screen.queryByText('Paciente de 24 novembro')).not.toBeInTheDocument();
    expect(screen.getByText('Paciente de hoje')).toBeInTheDocument();
  });

  it('apagar uma busca numérica restaura Hoje e remove o atendimento de 24/11', async () => {
    const { rerender } = render(<ResultEntryModal {...props} filters={{ ...filters, ignorarPeriodo: buscaSoNumeros('24-01') }} />);
    expect(await screen.findByText('Paciente de 24 novembro')).toBeInTheDocument();
    rerender(<ResultEntryModal {...props} filters={{ ...filters, ignorarPeriodo: buscaSoNumeros('') }} />);
    expect(screen.queryByText('Paciente de 24 novembro')).not.toBeInTheDocument();
    expect(screen.getByText('Paciente de hoje')).toBeInTheDocument();
  });
});