import { useEffect, useId, useState, type ReactNode } from 'react'

/** 마운트 시 채워지는 그라디언트 진행링 (인라인 SVG) */
export function Ring({
  pct,
  size = 148,
  stroke = 13,
  glow = true,
  children,
}: {
  pct: number
  size?: number
  stroke?: number
  glow?: boolean
  children?: ReactNode
}) {
  const r = (size - stroke) / 2 - 1
  const circ = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const target = circ * (1 - clamped / 100)
  const gid = useId().replace(/[:]/g, '')

  const [offset, setOffset] = useState(circ)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setOffset(target)
      return
    }
    const id = requestAnimationFrame(() => setOffset(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      {glow && <div className="ring-glow" />}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--p1)" />
            <stop offset="0.5" stopColor="var(--p2)" />
            <stop offset="1" stopColor="var(--p4)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}
