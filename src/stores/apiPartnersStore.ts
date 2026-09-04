import { useSyncExternalStore } from 'react'
import type { ApiPartner, ApiPartnerAuthMethod } from '@/types/api-partners.types'
import { DEMO_API_PARTNERS } from '@/mocks/api-partners.mock'

/**
 * Store local (mock) dos Parceiros de Integração via API.
 * Etapa 1: sem persistência real — os dados vivem em memória durante a sessão.
 */
let partners: ApiPartner[] = [...DEMO_API_PARTNERS]
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

export function useApiPartners(): ApiPartner[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
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

export function generateCredential(): GeneratedCredential {
  return { method: 'oauth2', clientId: `cli_live_${randomToken(12)}`, clientSecret: `cs_live_${randomToken(32)}` }
}

export function maskCredential(cred: GeneratedCredential): string {
  return `${cred.clientId.slice(0, 8)}••••••${cred.clientId.slice(-4)}`
}

export function addPartner(input: Omit<ApiPartner, 'id' | 'createdAt' | 'credentials' | 'lastSyncAt'>, cred: GeneratedCredential): ApiPartner {
  const partner: ApiPartner = {
    ...input,
    id: `apart_${randomToken(8)}`,
    createdAt: new Date().toISOString(),
    lastSyncAt: null,
    credentials: [{
      method: cred.method,
      masked: maskCredential(cred),
      clientId: cred.clientId,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    }],
  }
  partners = [partner, ...partners]
  emit()
  return partner
}

export function updatePartner(id: string, patch: Partial<ApiPartner>) {
  partners = partners.map(p => (p.id === id ? { ...p, ...patch } : p))
  emit()
}

export function removePartner(id: string) {
  partners = partners.filter(p => p.id !== id)
  emit()
}

/** Regenera credenciais revogando a anterior. Retorna a credencial em texto puro (exibição única). */
export function regenerateCredential(id: string, method: ApiPartnerAuthMethod = 'oauth2'): GeneratedCredential {
  const cred = generateCredential()
  const now = new Date().toISOString()
  partners = partners.map(p => {
    if (p.id !== id) return p
    return {
      ...p,
      authMethod: method,
      credentials: [
        { method, masked: maskCredential(cred), clientId: cred.clientId, createdAt: now, revokedAt: null },
        ...p.credentials.map(c => ({ ...c, revokedAt: c.revokedAt ?? now })),
      ],
    }
  })
  emit()
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
