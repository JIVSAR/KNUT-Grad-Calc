import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
}

/**
 * 네이티브 <select>를 대체하는 커스텀 드롭다운. OS 팝업 대신 앱 글래스 테마로 렌더한다.
 * 메뉴는 document.body로 포털해 카드의 backdrop-filter 쌓임 맥락에 가려지지 않게 한다.
 */
export function Select({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder,
  error,
  style,
}: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  ariaLabel?: string
  /** 선택값이 없을 때 트리거에 보여줄 안내 문구(목록에는 항목으로 넣지 않는다). */
  placeholder?: string
  /** 필수 미입력 등 오류 강조(빨간 테두리). */
  error?: boolean
  style?: CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{
    up: boolean
    top?: number
    bottom?: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const selected = options.find((o) => o.value === value)

  const openMenu = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) {
      const gap = 6 // 트리거와 메뉴 사이 간격
      const margin = 8 // 뷰포트 가장자리 여백
      const vh = window.innerHeight
      const below = vh - r.bottom - gap - margin // 아래로 펼칠 때 쓸 수 있는 높이
      const above = r.top - gap - margin // 위로 펼칠 때 쓸 수 있는 높이
      // 고정 모달에선 페이지 스크롤이 없어, 아래 공간이 부족하고 위가 더 넓으면 위로 펼쳐 잘림을 막는다.
      const up = below < 240 && above > below
      const space = up ? above : below
      setPos({
        up,
        top: up ? undefined : r.bottom + gap,
        bottom: up ? vh - r.top + gap : undefined,
        left: r.left,
        width: r.width,
        // 남은 공간에 맞춰 높이를 제한(고정 260px 대신) → 넘치는 옵션은 메뉴 내부 스크롤로.
        maxHeight: Math.max(120, Math.min(260, space)),
      })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    // 메뉴 '바깥' 스크롤 시에만 닫는다(메뉴 내부 스크롤은 유지해야 스크롤이 동작).
    const onScroll = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <div className="select" style={style}>
      <button
        ref={triggerRef}
        type="button"
        className={`field select-trigger${error ? ' field-error' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className={`select-value${selected ? '' : ' placeholder'}`}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <svg
          className={`select-caret${open ? ' open' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            className="select-menu slim-scroll"
            role="listbox"
            style={{
              position: 'fixed',
              ...(pos.up ? { bottom: pos.bottom } : { top: pos.top }),
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              transformOrigin: pos.up ? 'bottom' : 'top',
            }}
          >
            {options.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`select-option${o.value === value ? ' on' : ''}`}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              >
                <span>{o.label}</span>
                {o.value === value && (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}
