import { supabase } from '@/integrations/supabase/client'
import { buscarEmBlocos } from '@/lib/buscarEmBlocos'

export interface CadastroEtiqueta {
  exames: { id: string; name: string; internalCode?: string; tussCode?: string; workbenchId?: string }[]
  bancadas: { id: string; name: string }[]
}

/**
 * Lê (com await) o cadastro de exames e bancadas usado na etiqueta.
 * Lança erro se não carregar: a etiqueta nunca sai com "GERAL" ou nome cortado por falta de cadastro.
 */
export async function carregarCadastroEtiqueta(companyId: string): Promise<CadastroEtiqueta> {
  if (!companyId) throw new Error('Empresa não identificada')
  const db = supabase as any
  const [ex, wb] = await Promise.all([
    buscarEmBlocos<any>((de, ate) => db.from('exams')
      .select('id, name, internal_code, tuss_code, workbench_id')
      .eq('company_id', companyId).order('name').order('id').range(de, ate), { tela: 'Etiquetas' }),
    buscarEmBlocos<any>((de, ate) => db.from('lab_workbenches')
      .select('id, name').eq('company_id', companyId).order('name').order('id').range(de, ate)),
  ])
  if (!ex.linhas.length) throw new Error('Cadastro de exames vazio')
  return {
    exames: ex.linhas.map((r: any) => ({ id: r.id, name: r.name, internalCode: r.internal_code ?? undefined, tussCode: r.tuss_code ?? undefined, workbenchId: r.workbench_id ?? undefined })),
    bancadas: wb.linhas.map((r: any) => ({ id: r.id, name: r.name })),
  }
}
