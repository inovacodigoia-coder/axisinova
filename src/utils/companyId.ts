// =====================================================================
// resolveCompanyId — Mapeia companyIds mock (ex: "comp_001") para UUIDs
// reais existentes no Supabase. Usuários "demo" do sistema usam o mock
// 'comp_001', mas as tabelas Postgres exigem uuid.
// =====================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Mapeamento mock → UUID real (empresa demo no Supabase)
const MOCK_TO_REAL: Record<string, string> = {
  comp_001: '00000000-0000-0000-0000-000000000001',
}

/**
 * Devolve um UUID válido para uso em consultas Supabase.
 * Se o id já for UUID, retorna como está.
 * Se for um id mock conhecido, devolve o UUID real correspondente.
 * Caso contrário devolve null (chamador deve tratar).
 */
export function resolveCompanyId(id: string | null | undefined): string | null {
  if (!id) return null
  if (UUID_REGEX.test(id)) return id
  return MOCK_TO_REAL[id] ?? null
}
