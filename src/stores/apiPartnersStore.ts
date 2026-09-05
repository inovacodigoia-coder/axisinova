import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { ApiPartner, ApiPartnerAuthMethod, ApiPartnerCredential } from '@/types/api-partners.types'

/**
 * Parceiros de Integração via API — dados REAIS, isolados por empresa (Supabase + RLS).
 * O estado em memória é apenas um cache da consulta ao banco.
 */
let partners: ApiPartner[] = []
let loadedCompanyId: string | null = null
const listeners = new Set<() => void>()

function emit() {
  partners = [...partners]
  listeners.forEach(l => l())
}

function getSnapshot() {
  return partners
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

interface PartnerRow {
  id: string
  company_id: string
  type: string
  name: string
  document: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  auth_method: string
  api_authorized: boolean
  status: string
  credentials: ApiPartnerCredential[] | null
  last_sync_at: string | null
  created_at: string
}

function fromRow(r: PartnerRow): ApiPartner {
  return {
    id: r.id,
    companyId: r.company_id,
    type: r.type as ApiPartner['type'],
    name: r.name,
    document: r.document,
    contactName: r.contact_name || undefined,
    contactEmail: r.contact_email || '',
    contactPhone: r.contact_phone || undefined,
    notes: r.notes || undefined,
    authMethod: (r.auth_method || 'oauth2') as ApiPartnerAuthMethod,
    apiAuthorized: r.api_authorized,
    status: r.status as ApiPartner['status'],
    credentials: r.credentials || [],
    lastSyncAt: r.last_sync_at,
    createdAt: r.created_at,
  }
}

function toRow(p: Partial<ApiPartner>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (p.type !== undefined) row.type = p.type
  if (p.name !== undefined) row.name = p.name
  if (p.document !== undefined) row.document = p.document
  if (p.contactName !== undefined) row.contact_name = p.contactName || null
  if (p.contactEmail !== undefined) row.contact_email = p.contactEmail || null
  if (p.contactPhone !== undefined) row.contact_phone = p.contactPhone || null
  if (p.notes !== undefined) row.notes = p.notes || null
  if (p.authMethod !== undefined) row.auth_method = p.authMethod
  if (p.apiAuthorized !== undefined) row.api_authorized = p.apiAuthorized
  if (p.status !== undefined) row.status = p.status
  if (p.credentials !== undefined) row.credentials = p.credentials
  if (p.lastSyncAt !== undefined) row.last_sync_at = p.lastSyncAt
  return row
}

const db = () => (supabase as unknown as {
  from: (t: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}).from('api_partners')

export async function loadPartners(companyId: string) {
  const { data, error } = await db().select('*').eq('company_id', companyId).order('created_at', { ascending: false })
  if (error) return
  loadedCompanyId = companyId
  partners = ((data || []) as PartnerRow[]).map(fromRow)
  emit()
}

/** Lista os parceiros da empresa do usuário logado (carrega do banco na montagem). */
export function useApiPartners(): ApiPartner[] {
  const { user } = useAuth()
  const companyId = (user as { companyId?: string } | null)?.companyId
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!companyId) return
    if (loadedCompanyId !== companyId) {
      partners = []
      emit()
    }
    void loadPartners(companyId)
  }, [companyId])

  return companyId ? list.filter(p => p.companyId === companyId) : []
}

export function getApiPartner(id: string): ApiPartner | undefined {
  return partners.find(p => p.id === id)
}

export function randomToken(len = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  bytes.forEach(b => { out += chars[b % chars.length] })
  return out
}

export interface GeneratedCredential {
  method: ApiPartnerAuthMethod
  clientId: string
  clientSecret: string
}

export async function generateCredential(name = 'Parceiro de Integração'): Promise<GeneratedCredential> {
  const { data, error } = await supabase.functions.invoke('create-oauth-client', {
    body: { name },
  })
  if (error) throw new Error('Não foi possível registrar as credenciais OAuth2')

  const payload = data as { client_id?: unknown; client_secret?: unknown; error?: unknown } | null
  if (typeof payload?.error === 'string') throw new Error(payload.error)
  if (typeof payload?.client_id !== 'string' || typeof payload.client_secret !== 'string') {
    throw new Error('O serviço de autenticação não retornou credenciais válidas')
  }

  return {
    method: 'oauth2',
    clientId: payload.client_id,
    clientSecret: payload.client_secret,
  }
}

export function maskCredential(cred: GeneratedCredential): string {
  return `${cred.clientId.slice(0, 8)}••••••${cred.clientId.slice(-4)}`
}

export async function addPartner(
  input: Omit<ApiPartner, 'id' | 'createdAt' | 'credentials' | 'lastSyncAt'>,
  cred: GeneratedCredential,
): Promise<ApiPartner> {
  const credentials: ApiPartnerCredential[] = [{
    method: cred.method,
    masked: maskCredential(cred),
    clientId: cred.clientId,
    createdAt: new Date().toISOString(),
    revokedAt: null,
  }]

  const { data, error } = await db()
    .insert({ company_id: input.companyId, credentials, ...toRow(input) })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  const partner = fromRow(data as PartnerRow)
  partners = [partner, ...partners.filter(p => p.id !== partner.id)]
  emit()
  return partner
}

export async function updatePartner(id: string, patch: Partial<ApiPartner>) {
  partners = partners.map(p => (p.id === id ? { ...p, ...patch } : p))
  emit()
  await db().update(toRow(patch)).eq('id', id)
}

export async function removePartner(id: string) {
  partners = partners.filter(p => p.id !== id)
  emit()
  await db().delete().eq('id', id)
}

/** Regenera credenciais revogando a anterior. Retorna a credencial em texto puro (exibição única). */
export async function regenerateCredential(id: string, method: ApiPartnerAuthMethod = 'oauth2'): Promise<GeneratedCredential> {
  const current = partners.find(p => p.id === id)
  if (!current) throw new Error('Parceiro não encontrado')

  const cred = await generateCredential(`${current.name} — Parceiro API`)
  const now = new Date().toISOString()
  const credentials: ApiPartnerCredential[] = [
    { method, masked: maskCredential(cred), clientId: cred.clientId, createdAt: now, revokedAt: null },
    ...(current?.credentials || []).map(c => ({ ...c, revokedAt: c.revokedAt ?? now })),
  ]
  await updatePartner(id, { authMethod: method, credentials })
  return cred
}

export function documentExists(document: string, ignoreId?: string) {
  const digits = document.replace(/\D/g, '')
  if (!digits) return false
  return partners.some(p => p.id !== ignoreId && p.document.replace(/\D/g, '') === digits)
}

export function maskDocument(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function isValidDocument(value: string) {
  const d = value.replace(/\D/g, '')
  return d.length === 11 || d.length === 14
}

export function maskPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}
