import { useEffect, useRef } from 'react'

interface UseIdleTimeoutOptions {
  onIdle: () => void
  idleTime?: number
}

export function useIdleTimeout({ onIdle, idleTime = 30 * 60 * 1000 }: UseIdleTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onIdleRef = useRef(onIdle)

  // Keep the ref up to date without triggering effect re-runs
  useEffect(() => {
    onIdleRef.current = onIdle
  })

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => onIdleRef.current(), idleTime)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [idleTime]) // only re-run if idleTime changes, NOT onIdle
}
