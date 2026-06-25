import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useStore } from '../state/store'
import { useActiveSpec, useEvaluation, useProjection } from '../state/hooks'
import { compareSem, semLabel } from '../semester'
import { SemesterSelect } from './SemesterSelect'
import { AlsoCountsSelect } from './AlsoCountsSelect'
import { Select } from './Select'
import { ConfirmModal } from './ConfirmModal'
import { Modal } from './Modal'
import { replayShake } from '../lib/replayShake'
import { retakeEligible, gradeScore } from '../engine/dedup'
import { buildGradeMap } from '../engine/gpa'
import type { Course } from '../types'

export default function Planner() {
  const spec = useActiveSpec()
  const r = useEvaluation()
  const proj = useProjection()
  const courses = useStore((s) => s.courses)
  const addCourse = useStore((s) => s.addCourse)
  const removeCourse = useStore((s) => s.removeCourse)

  const [mode, setMode] = useState<'planned' | 'enrolled'>('planned')
  const [name, setName] = useState('')
  const [credits, setCredits] = useState(0)
  const [categoryId, setCategoryId] = useState('')
  const [semester, setSemester] = useState('')
  const [alsoCounts, setAlsoCounts] = useState<string[]>([])
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const addFormRef = useRef<HTMLDivElement | null>(null)
  const clearErr = (f: string) =>
    setErrors((p) => {
      if (!p.has(f)) return p
      const n = new Set(p)
      n.delete(f)
      return n
    })
  const [pendingDup, setPendingDup] = useState<{ payload: Omit<Course, 'id'>; dupes: Course[] } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deletingCourse = deletingId ? courses.find((c) => c.id === deletingId) : null

  const total = r.areas.find((a) => a.id === 'total')!
  const totalRow = proj.rows.find((row) => row.id === 'total')!
  // 아래 편집 목록(학기별 계획 과목)은 '예정' 학기만. 표/요약은 수강중도 반영(proj).
  const plannedTerms = [
    ...new Set(courses.filter((c) => c.planned).map((c) => c.semester || '미정')),
  ].sort(compareSem)
  const comingLabel =
    r.totalEnrolled > 0 && r.totalPlanned > 0
      ? '수강중·계획'
      : r.totalEnrolled > 0
        ? '수강중'
        : '계획'

  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const failGrades = new Set(spec.gradeScale.filter((g) => g.fail).map((g) => g.grade))

  const resetForm = () => {
    setName('')
    setCredits(0)
    setCategoryId('')
    setSemester('')
    setAlsoCounts([])
    setErrors(new Set())
  }

  const add = () => {
    const missing = new Set<string>()
    if (!name.trim()) missing.add('name')
    if (credits <= 0) missing.add('credits')
    if (!categoryId) missing.add('categoryId')
    if (!semester) missing.add('semester')
    if (missing.size) {
      // 빨간 강조·안내는 유지한 채(비우면 빈 프레임이 깜빡임) 흔들림만 리플로우로 재생.
      // flushSync로 .field-error를 먼저 커밋해야 재시작 대상 요소가 DOM에 존재한다.
      flushSync(() => setErrors(missing))
      replayShake(addFormRef.current)
      return
    }
    const payload: Omit<Course, 'id'> = {
      name: name.trim(),
      credits,
      categoryId,
      grade: '',
      semester,
      planned: mode === 'planned',
      enrolled: mode === 'enrolled',
      alsoCounts: alsoCounts.length ? alsoCounts : undefined,
    }
    // 이미 '이수(합격)'한 같은 이름 과목이 있으면 재수강 여부를 먼저 묻는다(낙제 과목 재수강은 새 학점이므로 제외).
    const dupes = courses.filter(
      (c) =>
        !c.planned &&
        !c.enrolled &&
        !c.retake &&
        !failGrades.has(c.grade) &&
        norm(c.name) === norm(payload.name),
    )
    if (dupes.length > 0) {
      setPendingDup({ payload, dupes })
      return
    }
    addCourse(payload)
    resetForm()
  }

  const confirmRetake = () => {
    if (!pendingDup) return
    addCourse({ ...pendingDup.payload, retaking: true })
    setPendingDup(null)
    resetForm()
  }
  const justAdd = () => {
    if (!pendingDup) return
    addCourse(pendingDup.payload)
    setPendingDup(null)
    resetForm()
  }

  const catLabel = (id: string) => spec.categories.find((c) => c.id === id)?.label ?? id
  const plannedByTerm = (term: string) =>
    courses.filter((c) => c.planned && (c.semester || '미정') === term)

  const inputCls = 'field'

  return (
    <div className="stack">
      {/* 요약 */}
      <section className="glass-card">
        <p className="card-sub">졸업까지 남은 학점 (이수 기준)</p>
        <p style={{ fontSize: 30, fontWeight: 800 }} className="grad-text">{total.remaining}학점</p>
        <p className="card-sub">
          {comingLabel} {proj.totalPlanned}학점 반영 시 →{' '}
          <b className="grad-text">{totalRow.finalRemaining}학점</b> 남음
        </p>
      </section>

      {/* 과목 추가 (수강 계획 / 수강 중) */}
      <section className="glass-card" ref={addFormRef}>
        <h2 className="card-title">과목 추가</h2>
        <div className="segmented" style={{ margin: '10px 0 12px' }}>
          <button className={mode === 'planned' ? 'on' : ''} onClick={() => setMode('planned')}>
            수강 계획
          </button>
          <button className={mode === 'enrolled' ? 'on' : ''} onClick={() => setMode('enrolled')}>
            수강 중
          </button>
        </div>
        <div className="space-y-3">
          <input
            className={`w-full ${inputCls}${errors.has('name') ? ' field-error' : ''}`}
            placeholder={mode === 'enrolled' ? '과목명 (예: 운영체제)' : '과목명 (예: 마이크로프로세서)'}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clearErr('name')
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              ariaLabel="학점 선택"
              placeholder="학점"
              error={errors.has('credits')}
              value={credits > 0 ? String(credits) : ''}
              onChange={(v) => {
                setCredits(Number(v))
                clearErr('credits')
              }}
              options={[...new Set(credits > 0 ? [1, 2, 3, 4, 5, 6, 9, credits] : [1, 2, 3, 4, 5, 6, 9])]
                .sort((a, b) => a - b)
                .map((n) => ({ value: String(n), label: String(n) }))}
            />
            <Select
              ariaLabel="이수 영역 선택"
              placeholder="이수 영역"
              error={errors.has('categoryId')}
              value={categoryId}
              onChange={(v) => {
                setCategoryId(v)
                clearErr('categoryId')
              }}
              options={spec.categories.map((c) => ({ value: c.id, label: c.label }))}
            />
          </div>
          <SemesterSelect
            value={semester}
            onChange={(v) => {
              setSemester(v)
              clearErr('semester')
            }}
            years={[1, 2, 3, 4, 5]}
            error={errors.has('semester')}
          />
          <AlsoCountsSelect
            categories={spec.categories}
            primary={categoryId}
            value={alsoCounts}
            onChange={setAlsoCounts}
          />
        </div>
        {errors.size > 0 && (
          <p className="form-error-msg">비어 있는 필수 항목을 입력해 주세요.</p>
        )}
        <button onClick={add} className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
          {mode === 'enrolled' ? '수강 중에 추가' : '계획에 추가'}
        </button>
      </section>

      {/* 학기별 남은 학점 표 */}
      <section className="glass-card">
        <h2 className="card-title">학기별 남은 학점</h2>
        {proj.terms.length === 0 ? (
          <p className="empty">
            예정 과목을 추가하면 학기별로 남는 학점이 계산돼요.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="lbl">영역</th>
                  <th className="num">현재</th>
                  {proj.terms.map((t) => (
                    <th key={t} className="num">
                      {semLabel(t)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proj.rows.map((row) => (
                  <tr key={row.id} className={row.id === 'total' ? 'total-row' : ''}>
                    <td className="lbl">{row.label}</td>
                    <td className="num">
                      {Math.max(0, row.min - row.earned)}
                    </td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.term}
                        className={cell.remaining === 0 ? 'num done' : 'num'}
                      >
                        {cell.remaining}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="card-sub">숫자 = 그 학기까지 들었을 때 남는 학점. 0이면 충족.</p>
          </div>
        )}
      </section>

      {/* 학기별 계획 과목 (예정만 — 수강중은 과목 탭에서 관리) */}
      {plannedTerms.map((term) => (
        <section key={term} className="glass-card">
          <div className="flex items-center justify-between">
            <h2 className="card-title">{semLabel(term)}</h2>
            <span className="group-meta">
              {plannedByTerm(term).reduce((s, c) => s + c.credits, 0)}학점
            </span>
          </div>
          <ul className="group-body">
            {plannedByTerm(term).map((c) => (
              <li key={c.id} className="list-row">
                <div className="row-main min-w-0 flex-1">
                  <p className="row-title">
                    {c.name}
                    {proj.retakeIds.has(c.id) && (
                      <span className="tag mute" style={{ marginLeft: 6 }}>재수강</span>
                    )}
                  </p>
                  <p className="row-sub">
                    {catLabel(c.categoryId)} · {c.credits}학점
                    {proj.retakeIds.has(c.id) && ' · 이미 이수해 학점 미반영'}
                  </p>
                </div>
                <button onClick={() => setDeletingId(c.id)} className="row-act del">
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {deletingCourse && (
        <ConfirmModal
          message={`「${deletingCourse.name}」 과목을 계획에서 삭제할까요?`}
          onConfirm={() => {
            removeCourse(deletingCourse.id)
            setDeletingId(null)
          }}
          onClose={() => setDeletingId(null)}
        />
      )}

      {pendingDup &&
        (() => {
          const gradeMap = buildGradeMap(spec)
          const eligible = retakeEligible(pendingDup.dupes, gradeMap)
          const bestDupe = pendingDup.dupes.reduce((a, b) =>
            gradeScore(b.grade, gradeMap) > gradeScore(a.grade, gradeMap) ? b : a,
          )
          return (
            <Modal onClose={() => setPendingDup(null)} maxWidth={380}>
              <h2 className="card-title">{eligible ? '재수강 처리' : '중복 과목 확인'}</h2>
              <p className="card-sub" style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
                이미 이수한 「{pendingDup.payload.name}」 과목이 있어요.{' '}
                {eligible
                  ? '이번에 추가하는 과목을 재수강으로 처리할까요? (재수강은 이미 받은 학점이라 남은 학점에 반영되지 않아요)'
                  : `기존 성적이 ${bestDupe.grade || '미입력'}(B0 이상)이라 재수강 대상이 아니에요. 그래도 추가할까요?`}
              </p>
              <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {eligible && (
                  <button onClick={confirmRetake} className="btn btn-primary btn-block">
                    재수강으로 추가
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={justAdd} className="btn btn-ghost" style={{ flex: 1 }}>
                    그냥 추가
                  </button>
                  <button
                    onClick={() => setPendingDup(null)}
                    className="btn"
                    style={{ flex: 1, color: '#e24b6a', border: '1px solid #e24b6a', background: 'transparent' }}
                  >
                    취소
                  </button>
                </div>
              </div>
            </Modal>
          )
        })()}
    </div>
  )
}
