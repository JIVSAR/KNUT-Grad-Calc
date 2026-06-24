import { createPortal } from 'react-dom'

/**
 * 화면 상단 고정 토스트. Modal처럼 document.body로 포털 렌더한다 —
 * .tab-page가 진입 시 `fadeUp`(transform)을 걸어 position:fixed 자식을 가두므로 포털이 필수.
 * 색은 기존 .banner.ok/.err 토큰 재사용, 위치·중앙정렬은 .toast-wrap이 담당.
 * 자동 사라짐 타이머는 부모(Backup)가 소유(메시지 단일 진실원).
 * 접근성: 라이브 영역(role=status)은 내용이 채워진 채 새로 마운트되면 스크린리더가
 * 안 읽으므로, 래퍼는 상시 렌더하고 안쪽 메시지만 토글한다.
 */
export function Toast({ msg }: { msg: { kind: 'ok' | 'err'; text: string } | null }) {
  return createPortal(
    <div className="toast-wrap" role="status" aria-live="polite" aria-atomic="true">
      {msg && (
        <p key={msg.text} className={`toast banner ${msg.kind === 'ok' ? 'ok' : 'err'}`}>
          {msg.text}
        </p>
      )}
    </div>,
    document.body,
  )
}
