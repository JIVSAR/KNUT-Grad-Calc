import { useEffect, useRef, useState } from 'react'

/**
 * 직전 표시값에서 end까지 easeOut으로 카운트업. decimals 자리수 반올림.
 * 애니메이션 도중 end가 바뀌면 '마지막 완료값'이 아니라 '현재 표시 중인 값'에서 새 목표로 이어 재생한다
 * (빠르게 토글해도 점프 없이 부드럽게 전환).
 */
export function useCountUp(end: number, duration = 900, decimals = 0): number {
  const [v, setV] = useState(0)
  const display = useRef(0) // 현재 표시값(애니메이션 중간값 포함) — 중단 시 여기서 이어감

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      display.current = end
      setV(end)
      return
    }
    let raf = 0
    const start = performance.now()
    const startVal = display.current
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const cur = startVal + (end - startVal) * eased
      display.current = cur
      setV(cur)
      if (t < 1) raf = requestAnimationFrame(step)
      else {
        display.current = end
        setV(end)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [end, duration])

  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}
