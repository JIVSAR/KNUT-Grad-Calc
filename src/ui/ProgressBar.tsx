import { useEffect, useState } from 'react'

type Variant = 'g1' | 'g2' | 'g3' | 'g4'

/** 마운트 시 차오르는 그라디언트 진행바. 충족 시 g4(민트→앰버). */
export function ProgressBar({
  value,
  max,
  satisfied,
  variant = 'g1',
}: {
  value: number
  max: number
  satisfied?: boolean
  variant?: Variant
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const [w, setW] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setW(pct)
      return
    }
    const id = requestAnimationFrame(() => setW(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  return (
    <div className="grad-bar">
      <i className={satisfied ? 'g4' : variant} style={{ width: `${w}%` }} />
    </div>
  )
}
