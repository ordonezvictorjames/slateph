import { useEffect, useRef } from 'react'

interface UseIdleTimeoutOptions {
  onIdle: () => void
  onWarn?: () => void      // called warnBefore ms before idle
  onActivity?: () => void  // called when user becomes active again
  idleTime?: number
  warnBefore?: number      // ms before idle to show warning
}

export function useIdleTimeout({
  onIdle,
  onWarn,
  onActivity,
  idleTime = 30 * 60 * 1000,
  warnBefore = 60 * 1000,
}: UseIdleTimeoutOptions) {
  const idleRef    = useRef(onIdle)
  const warnRef    = useRef(onWarn)
  const activityRef = useRef(onActivity)
  const idleTimer  = useRef<NodeJS.Timeout | null>(null)
  const warnTimer  = useRef<NodeJS.Timeout | null>(null)
  const warned     = useRef(false)

  useEffect(() => { idleRef.current = onIdle })
  useEffect(() => { warnRef.current = onWarn })
  useEffect(() => { activityRef.current = onActivity })

  useEffect(() => {
    const clearTimers = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (warnTimer.current) clearTimeout(warnTimer.current)
    }

    const resetTimer = () => {
      clearTimers()

      // If warning was showing, dismiss it
      if (warned.current) {
        warned.current = false
        activityRef.current?.()
      }

      // Set warn timer
      if (warnRef.current && idleTime > warnBefore) {
        warnTimer.current = setTimeout(() => {
          warned.current = true
          warnRef.current?.()
        }, idleTime - warnBefore)
      }

      // Set idle timer
      idleTimer.current = setTimeout(() => {
        warned.current = false
        idleRef.current()
      }, idleTime)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      clearTimers()
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [idleTime, warnBefore])
}
