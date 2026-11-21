-- Etapa 3C.2: nenhum perfil logado ou visitante lê/grava a senha do portal (texto antigo ou protegida).
-- A coluna access_password segue guardada só para reversão (3C.3 apaga). Criar/regenerar só pelas
-- funções portal_acesso_*; a equipe lê e edita apenas os campos abaixo.
-- Reversão: GRANT SELECT, INSERT, UPDATE ON public.external_accesses TO authenticated;
REVOKE ALL ON public.external_accesses FROM anon;
REVOKE SELECT, INSERT, UPDATE ON public.external_accesses FROM authenticated;
GRANT SELECT (id, company_id, type, name, email, status, access_code, password_kind, senha_gerada_em,
  senha_gerada_por, falhas_zeradas_em, patient_id, doctor_id, origin_id, partner_origin_ids, partner_type,
  cnpj, responsible_name, phone, crm, specialty, permissions, last_access_at, created_by, created_at,
  updated_at, prazo_dias_adicionais) ON public.external_accesses TO authenticated;
GRANT UPDATE (type, name, email, status, patient_id, doctor_id, origin_id, partner_origin_ids, partner_type,
  cnpj, responsible_name, phone, crm, specialty, permissions) ON public.external_accesses TO authenticated;