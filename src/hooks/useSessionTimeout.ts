import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { SESSION_TIMEOUT_MINUTES } from '@/utils/constants'

const SESSION_TIMEOUT = SESSION_TIMEOUT_MINUTES * 60 * 1000
const WARNING_BEFORE = 2 * 60 * 1000

export function useSessionTimeout() {
  const { logout, isAuthenticated } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const lastActivityRef = useRef(Date.now())
  const countdownRef = useRef<ReturnType<typeof setInterval>>()

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
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const
    const handler = () => { lastActivityRef.current = Date.now() }
    events.forEach(e => document.addEventListener(e, handler, true))
    return () => events.forEach(e => document.removeEventListener(e, handler, true))
  }, [isAuthenticated])

  // Check loop
  useEffect(() => {
    if (!isAuthenticated) return
    const check = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current
      const timeUntilExpiry = SESSION_TIMEOUT - inactive

      if (timeUntilExpiry <= 0) {
        logout()
      } else if (timeUntilExpiry <= WARNING_BEFORE && !showWarning) {
        setShowWarning(true)
        setCountdown(Math.floor(timeUntilExpiry / 1000))
        countdownRef.current = setInterval(() => {
          setCountdown(c => {
            if (c <= 1) { logout(); return 0 }
            return c - 1
          })
        }, 1000)
      }
    }, 30000)

    return () => {
      clearInterval(check)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [isAuthenticated, logout, showWarning])

  return { showWarning, countdown, extendSession: resetTimer }
}
