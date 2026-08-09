import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { SESSION_TIMEOUT_MINUTES } from '@/utils/constants'
import { supabase } from '@/integrations/supabase/client'

export function useSessionTimeout() {
  const { logout, isAuthenticated, user } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const [sessionTimeoutMs, setSessionTimeoutMs] = useState(SESSION_TIMEOUT_MINUTES * 60 * 1000)
  const lastActivityRef = useRef(Date.now())
  const countdownRef = useRef<ReturnType<typeof setInterval>>()
  const WARNING_BEFORE = 1 * 60 * 1000 // 1 minute before expiry

  // Load custom company timeout
  useEffect(() => {
    async function loadTimeout() {
      if (!isAuthenticated || !user?.companyId) return
      
      try {
        const { data } = await supabase
          .from('companies')
          .select('session_timeout')
          .eq('id', user.companyId)
          .maybeSingle()
        
        if (data?.session_timeout) {
          setSessionTimeoutMs(data.session_timeout * 60 * 1000)
        }
      } catch (error) {
        console.error('Error loading session timeout:', error)
      }
    }
    loadTimeout()
  }, [isAuthenticated, user?.companyId])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (showWarning) {
      setShowWarning(false)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [showWarning])

  // Activity listeners
  useEffect(() => {
    if (!isAuthenticated) return
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const
    const handler = () => { lastActivityRef.current = Date.now() }
    events.forEach(e => document.addEventListener(e, handler, true))
    return () => events.forEach(e => document.removeEventListener(e, handler, true))
  }, [isAuthenticated])

  // Check loop
  useEffect(() => {
    if (!isAuthenticated) return
    
    const check = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current
      const timeUntilExpiry = sessionTimeoutMs - inactive

      if (timeUntilExpiry <= 0) {
        logout()
      } else if (timeUntilExpiry <= WARNING_BEFORE && !showWarning) {
        setShowWarning(true)
        setCountdown(Math.floor(timeUntilExpiry / 1000))
        
        if (countdownRef.current) clearInterval(countdownRef.current)
        countdownRef.current = setInterval(() => {
          setCountdown(c => {
            if (c <= 1) { 
              if (countdownRef.current) clearInterval(countdownRef.current)
              logout()
              return 0 
            }
            return c - 1
          })
        }, 1000)
      }
    }, 10000) // Check more frequently (every 10s)

    return () => {
      clearInterval(check)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [isAuthenticated, logout, showWarning, sessionTimeoutMs])

  return { showWarning, countdown, extendSession: resetTimer }
}
