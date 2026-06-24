import { createPortal } from 'react-dom'
import { useEffect, type ReactNode } from 'react'

/**
 * 공용 모달. document.body로 포털 렌더해서 조상 요소의 transform/overflow에
 * 갇히지 않고 항상 화면 중앙 전체 오버레이로 뜬다.
 */
export function Modal({
  onClose,
  children,
  maxWidth,
}: {
  onClose: () => void
  children: ReactNode
  maxWidth?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card slim-scroll"
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
