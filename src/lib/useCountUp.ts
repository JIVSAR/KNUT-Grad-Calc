import { useEffect, useRef, useState } from 'react'

/** 0(또는 직전 값)에서 end까지 easeOut으로 카운트업. decimals 자리수 반올림. */
export function useCountUp(end: number, duration = 900, decimals = 0): number {
  const [v, setV] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      from.current = end
      setV(end)
      return
    }
    let raf = 0
    const start = performance.now()
    const startVal = from.current
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const cur = startVal + (end - startVal) * eased
      setV(cur)
      if (t < 1) raf = requestAnimationFrame(step)
      else {
        from.current = end
        setV(end)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [end, duration])

  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}
