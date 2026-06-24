import { useRef, useState, type RefObject } from 'react'

/** 성적표/수강내역 업로드 박스. variant로 색(이수=ok·청록 / 수강중=info·보라) 구분. */
export function UploadBox({
  variant,
  badge,
  title,
  path,
  onFile,
  inputRef: externalRef,
  beforePick,
}: {
  variant: 'ok' | 'info'
  badge: string
  title: string
  path: string
  onFile: (file: File | undefined) => void
  /** 부모가 파일창을 직접 열 수 있도록 input 참조를 위로 전달(예: 확인 모달 후 열기). */
  inputRef?: RefObject<HTMLInputElement | null>
  /** '파일 선택' 클릭 시 호출. false를 반환하면 파일창을 열지 않는다(부모가 모달 등으로 게이트). */
  beforePick?: () => boolean
}) {
  const localRef = useRef<HTMLInputElement | null>(null)
  const inputRef = externalRef ?? localRef
  const [fileName, setFileName] = useState('')

  const openPicker = () => {
    if (beforePick && !beforePick()) return
    inputRef.current?.click()
  }

  return (
    <div className={`upload-box ${variant}`}>
      <div className="ub-head">
        <span className={`tag ${variant}`}>{badge}</span>
        <span className="ub-title">{title}</span>
      </div>
      <p className="ub-path">{path}</p>
      <div className="ub-file">
        {/* 버튼만 파일 선택창을 연다. 파일명 텍스트는 클릭해도 아무 동작 안 함. */}
        <button type="button" className="ub-file-btn" onClick={openPicker}>
          파일 선택
        </button>
        <span className="ub-file-name">{fileName || '선택된 파일 없음'}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            setFileName(f?.name ?? '')
            onFile(f)
            // 같은 파일을 다시 선택해도 onChange가 발생하도록 값 초기화
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
