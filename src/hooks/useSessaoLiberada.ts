import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'

/**
 * Verdadeiro quando o usuário já entrou e tem perfil + setor definidos (primeira tela liberada).
 * Cargas que não são necessárias para liberar o acesso esperam por isto.
 * Uma vez liberada, continua liberada para o mesmo usuário (trocar de perfil não interrompe).
 */
export function useSessaoLiberada(): boolean {
  const { user } = useAuth()
  const { isSessionReady, activeProfile, activeSector } = useCompanyContext()
  const pronta = !!user && (isSessionReady || (!!activeProfile && !!activeSector))
  const [liberadaPara, setLiberadaPara] = useState<string | null>(null)
  useEffect(() => {
    if (pronta && user) setLiberadaPara(user.id)
  }, [pronta, user?.id])
  return !!user && (pronta || liberadaPara === user.id)
}
