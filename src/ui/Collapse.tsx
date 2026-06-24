import { useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * 펼치기/접기 높이 애니메이션. 콘텐츠 실제 높이를 측정해 height를 트랜지션한다.
 * - grid-template-rows fr 트랜지션은 일부 브라우저에서 런타임 접기가 동작하지 않아 사용하지 않음.
 * - rAF 의존 없이 동기 리플로우(offsetHeight)로 시작 높이를 등록해 트랜지션을 발생시킨다.
 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const prevOpen = useRef<boolean | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // 최초 마운트: 애니메이션 없이 현재 상태만 반영
    if (prevOpen.current === null) {
      el.style.height = open ? 'auto' : '0px'
      prevOpen.current = open
      return
    }
    if (prevOpen.current === open) return
    prevOpen.current = open

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      el.style.height = open ? 'auto' : '0px'
      return
    }

    if (open) {
      // 0 → 콘텐츠 높이로 펼친 뒤, 끝나면 auto로(이후 콘텐츠 변화 대응)
      el.style.height = el.scrollHeight + 'px'
      const onEnd = (e: TransitionEvent) => {
        if (e.target === el && e.propertyName === 'height') el.style.height = 'auto'
      }
      el.addEventListener('transitionend', onEnd, { once: true })
      return () => el.removeEventListener('transitionend', onEnd)
    }

    // 접기: auto → 픽셀 높이로 고정 → 동기 리플로우 → 0
    el.style.height = el.scrollHeight + 'px'
    void el.offsetHeight
    el.style.height = '0px'
  }, [open])

  return (
    <div ref={ref} className="collapse-anim">
      {children}
    </div>
  )
}
