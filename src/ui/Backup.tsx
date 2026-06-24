import { useState, useRef, useEffect } from 'react'
import { useStore } from '../state/store'
import { ThemeSetting } from './ThemeSetting'
import { ConfirmModal } from './ConfirmModal'
import { Toast } from './Toast'

export default function Backup() {
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const courseCount = useStore((s) => s.courses.length)

  const [pasted, setPasted] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [restoreFileName, setRestoreFileName] = useState('')
  const [confirmingRestore, setConfirmingRestore] = useState<null | 'file' | 'paste'>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // 토스트 자동 사라짐: 새 메시지마다 타이머 리셋(클린업이 이전 타이머 제거).
  // 에러는 읽고 대응할 시간이 필요해 더 오래 표시.
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), msg.kind === 'err' ? 6000 : 2500)
    return () => clearTimeout(t)
  }, [msg])

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `knut-grad-backup.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ kind: 'ok', text: '백업 파일을 내려받았어요.' })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportData())
      setMsg({ kind: 'ok', text: '클립보드에 복사했어요.' })
    } catch {
      setMsg({ kind: 'err', text: '복사에 실패했어요. 아래 내용을 직접 선택해 복사하세요.' })
    }
  }

  const doImport = (text: string) => {
    try {
      importData(text)
      setMsg({ kind: 'ok', text: '가져오기 완료!' })
      setPasted('')
    } catch (e) {
      setMsg({ kind: 'err', text: `가져오기 실패: ${(e as Error).message}` })
    }
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    file.text().then(doImport)
  }

  // 복원은 전체 덮어쓰기(되돌릴 수 없음) → 기존 내역이 있으면 확인 모달로 게이트한다.
  const requestFilePick = () => {
    if (courseCount > 0) setConfirmingRestore('file')
    else fileRef.current?.click()
  }
  const requestPasteImport = () => {
    if (courseCount > 0) setConfirmingRestore('paste')
    else doImport(pasted)
  }
  const onConfirmRestore = () => {
    const kind = confirmingRestore
    setConfirmingRestore(null)
    if (kind === 'file') fileRef.current?.click()
    else if (kind === 'paste') doImport(pasted)
  }

  return (
    <div className="stack">
      <ThemeSetting />
      <section className="glass-card">
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <h2 className="card-title">백업 (내보내기)</h2>
          <span className="tag info">{courseCount}과목</span>
        </div>
        <p className="card-sub">
          파일로 저장해 두면 기기를 바꾸거나 브라우저 데이터가 지워져도 복원할 수 있어요.
        </p>
        <div className="flex gap-2 mt-3">
          <button onClick={download} className="btn btn-primary" style={{ flex: 1 }}>
            파일로 저장
          </button>
          <button onClick={copy} className="btn btn-ghost" style={{ minWidth: 72 }}>
            복사
          </button>
        </div>
        <textarea
          readOnly
          value={exportData()}
          className="field code-area mt-3 h-28 slim-scroll"
        />
      </section>

      <section className="glass-card">
        <h2 className="card-title">복원 (가져오기)</h2>
        <p className="card-sub">백업 파일을 선택하거나 내용을 붙여넣으세요.</p>
        <div className="ub-file mt-3">
          {/* 버튼만 파일창을 연다. 파일명 텍스트는 클릭해도 동작 안 함. */}
          <button type="button" className="ub-file-btn" onClick={requestFilePick}>
            파일 선택
          </button>
          <span className="ub-file-name">{restoreFileName || '선택된 파일 없음'}</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              setRestoreFileName(f?.name ?? '')
              onFile(f)
              // 같은 파일을 다시 선택해도 onChange가 발생하도록 값 초기화
              e.target.value = ''
            }}
          />
        </div>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="여기에 백업 JSON 붙여넣기"
          className="field code-area h-24 mt-3 slim-scroll"
        />
        <button
          onClick={requestPasteImport}
          disabled={!pasted.trim()}
          className="btn btn-primary btn-block mt-3"
        >
          붙여넣은 내용 가져오기
        </button>
      </section>

      <Toast msg={msg} />

      <section className="glass-card">
        <h2 className="card-title danger">전체 초기화</h2>
        <p className="card-sub">모든 과목·설정을 지웁니다. 되돌릴 수 없어요.</p>
        <button onClick={() => setConfirmingReset(true)} className="btn btn-danger btn-block mt-3">
          전체 초기화
        </button>
      </section>

      {confirmingRestore && (
        <ConfirmModal
          title="기존 내역 덮어쓰기"
          message={
            <>
              현재 저장된 내역을 새로 가져온 데이터로 덮어씁니다.
              <br />
              되돌릴 수 없어요. 정말 진행할까요?
            </>
          }
          confirmLabel="덮어쓰기"
          onConfirm={onConfirmRestore}
          onClose={() => setConfirmingRestore(null)}
        />
      )}

      {confirmingReset && (
        <ConfirmModal
          title="전체 초기화"
          message={
            <>
              모든 과목·설정을 지웁니다. 되돌릴 수 없어요.
              <br />
              정말 진행할까요?
            </>
          }
          confirmLabel="전체 초기화"
          onConfirm={() => {
            resetAll()
            setConfirmingReset(false)
            setMsg({ kind: 'ok', text: '초기화했어요.' })
          }}
          onClose={() => setConfirmingReset(false)}
        />
      )}
    </div>
  )
}
