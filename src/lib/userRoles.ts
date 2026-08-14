/** Funções (cargos) de usuário — rótulos oficiais em português (pt-BR). */
export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'company_admin', label: 'Administrador' },
  { value: 'doctor', label: 'Médico' },
  { value: 'receptionist', label: 'Recepcionista' },
  { value: 'billing', label: 'Faturista' },
  { value: 'telephonist', label: 'Telefonista' },
  { value: 'nurse', label: 'Enfermeiro(a)' },
  { value: 'pharmacist', label: 'Farmacêutico(a)' },
  { value: 'biochemist', label: 'Bioquímico' },
  { value: 'analyst', label: 'Analista' },
  { value: 'other', label: 'Outros' },
]

export const roleLabelMap: Record<string, string> = {
  ...Object.fromEntries(ROLE_OPTIONS.map(o => [o.value, o.label])),
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  employee: 'Colaborador',
  technician: 'Técnico(a)',
  lab_technician: 'Técnico(a) de Laboratório',
  manager: 'Gestor(a)',
}

/** Retorna sempre um rótulo legível em português. */
export const getRoleLabel = (role?: string | null) =>
  (role && (roleLabelMap[role] || role.replace(/_/g, ' '))) || '—'
