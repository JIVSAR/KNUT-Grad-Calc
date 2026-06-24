import { useState } from 'react'
import { useStore } from '../state/store'
import { useActiveSpec } from '../state/hooks'
import { requirementSpecs } from '../data/requirements'
import { shortYearLabel } from '../semester'
import { UploadBox } from './UploadBox'
import { ThemeToggle } from './ThemeToggle'
import { Select } from './Select'

export function Onboarding() {
  const spec = useActiveSpec()
  const specId = useStore((s) => s.specId)
  const setSpec = useStore((s) => s.setSpec)
  const multiMajorId = useStore((s) => s.multiMajorId)
  const setMultiMajor = useStore((s) => s.setMultiMajor)
  const setOnboarded = useStore((s) => s.setOnboarded)
  const importTranscript = useStore((s) => s.importTranscript)
  const importEnrollment = useStore((s) => s.importEnrollment)

  const [msg, setMsg] = useState('')
  const selectedMm = spec.multiMajors?.find((m) => m.id === multiMajorId)

  const onTranscript = async (file: File | undefined) => {
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const { parseTranscriptFile } = await import('../import/transcript')
      const { courses, warnings } = await parseTranscriptFile(buf, spec.admissionYear)
      if (courses.length) {
        importTranscript(courses)
        setMsg(`성적표 ${courses.length}과목을 불러왔어요.`)
      } else setMsg(warnings.join(' ') || '인식된 과목이 없습니다.')
    } catch (e) {
      setMsg(`불러오기 실패: ${(e as Error).message}`)
    }
  }

  const onEnrollment = async (file: File | undefined) => {
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const { parseEnrollmentFile } = await import('../import/transcript')
      const { courses, warnings } = await parseEnrollmentFile(buf, spec.admissionYear)
      if (courses.length) {
        const { added } = importEnrollment(courses)
        setMsg(
          added > 0
            ? `수강내역 ${added}과목을 '수강 중'으로 불러왔어요.`
            : '추가된 수강 중 과목이 없어요 — 이미 이수 완료된 학기인지 확인하세요.',
        )
      } else setMsg(warnings.join(' ') || '인식된 과목이 없습니다.')
    } catch (e) {
      setMsg(`불러오기 실패: ${(e as Error).message}`)
    }
  }

  return (
    <div className="app-shell">
      <div className="blobs" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
      </div>

      <div className="content" style={{ paddingTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="eyebrow">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 10L12 5 2 10l10 5 10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M6 12v4c0 1.1 2.7 3 6 3s6-1.9 6-3v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            시작하기
          </span>
          <ThemeToggle />
        </div>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.25, margin: '6px 0 4px' }}>
          국립한국교통대학교
          <br />
          졸업학점 계산기
        </h1>
        <p className="card-sub" style={{ marginBottom: 14 }}>
          몇 가지만 설정하면 바로 졸업 진행 상황을 볼 수 있어요.
        </p>

        {/* 1. 학과/학번 · 다전공 (필수) */}
        <section className="glass-card">
          <h2 className="card-title">1. 학과 · 학번</h2>
          <Select
            style={{ marginTop: 10 }}
            ariaLabel="학과·학번 선택"
            value={specId}
            onChange={setSpec}
            options={requirementSpecs.map((s) => ({
              value: s.id,
              label: `${s.program} · ${shortYearLabel(s.admissionYear)}`,
            }))}
          />

          <h2 className="card-title" style={{ marginTop: 16 }}>
            2. 다전공
          </h2>
          {spec.multiMajorRequired && (
            <p className="banner warn" style={{ marginTop: 8 }}>
              이 학과·학번은 다전공이 졸업 필수요건입니다.
            </p>
          )}
          {spec.multiMajors && (
            <Select
              style={{ marginTop: 8 }}
              ariaLabel="다전공 선택"
              value={multiMajorId}
              onChange={setMultiMajor}
              options={spec.multiMajors.map((m) => ({ value: m.id, label: m.label }))}
            />
          )}
          {selectedMm?.note && <p className="card-sub" style={{ marginTop: 8 }}>{selectedMm.note}</p>}
        </section>

        {/* 2. 성적표 · 수강내역 (선택) */}
        <section className="glass-card" style={{ marginTop: 16 }}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <h2 className="card-title">3. 성적표 · 수강내역 (선택)</h2>
            <a className="ext-link" href="https://portal.ut.ac.kr/p/S01/" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M14 4h6v6M20 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              통합정보시스템
            </a>
          </div>
          <p className="card-sub" style={{ marginBottom: 8 }}>
            통합정보시스템에서 받은 엑셀을 올리면 과목이 자동 추가돼요. 지금 올려도 되고, 나중에 <b>과목 탭</b>에서 불러와도 돼요.
          </p>
          <p className="privacy-note" style={{ marginTop: 0, marginBottom: 12 }}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>
              업로드한 성적표·개인정보는 <b>이 기기(브라우저)에만</b> 저장돼요.
              <br />
              서버로 전송되지 않습니다.
            </span>
          </p>
          <UploadBox
            variant="ok"
            badge="이수 과목"
            title="성적표"
            path="졸업 > 졸업자가진단 > 성적 > 개인성적 엑셀(개인성적.xlsx)"
            onFile={onTranscript}
          />
          <UploadBox
            variant="info"
            badge="현재 수강 중"
            title="수강내역"
            path="수강 > 수강내역조회 > 학생수강내역 리스트 엑셀(학생수강내역 리스트.xlsx)"
            onFile={onEnrollment}
          />
          {msg && <p className="banner ok" style={{ marginTop: 12 }}>{msg}</p>}
        </section>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={() => setOnboarded(true)}
        >
          시작하기
        </button>
      </div>
    </div>
  )
}
