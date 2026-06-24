import type { ReactNode } from 'react'
import { Modal } from './Modal'

/** 공용 확인 모달 (삭제 등 되돌릴 수 없는 동작 확인용) */
export function ConfirmModal({
  title = '삭제 확인',
  message,
  confirmLabel = '삭제',
  onConfirm,
  onClose,
}: {
  title?: string
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal onClose={onClose} maxWidth={360}>
      <h2 className="card-title">{title}</h2>
      <p className="card-sub" style={{ fontSize: 13.5, color: 'var(--ink-soft)', wordBreak: 'keep-all' }}>
        {message}
      </p>
      <div className="mt-4 flex gap-2">
        <button onClick={onConfirm} className="btn btn-danger" style={{ flex: 2 }}>
          {confirmLabel}
        </button>
        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
          취소
        </button>
      </div>
    </Modal>
  )
}
