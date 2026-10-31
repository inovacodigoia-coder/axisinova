import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EditAccessOriginsDialog } from './EditAccessOriginsDialog';
import type { ExternalAccessRecord } from '@/hooks/useExternalAccesses';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) query[method] = () => query;
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({data:[{id:'o1', name:'UBS',internal_code:'01'}],error:null}).then(resolve);
  return query;
} } }));
afterEach(cleanup);
it('salva o novo nome do acesso preservando suas origens selecionadas', async () => {
  const onSave = vi.fn().mockResolvedValue({});
  const access = {id:'a1',name:'Anterior',type:'parceiro',partner_origin_ids:['o1']} as ExternalAccessRecord;
  render(<EditAccessOriginsDialog access={access} companyId="company" onOpenChange={vi.fn()} onSave={onSave} />);
  await screen.findByText('UBS');
  fireEvent.change(screen.getByLabelText('Nome exibido *'), {target:{value:'UBS Novo nome'}});
  fireEvent.click(screen.getByRole('button',{name:/^Salvar$/}));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith('a1',{name:'UBS Novo nome',partner_origin_ids:['o1']}));
});