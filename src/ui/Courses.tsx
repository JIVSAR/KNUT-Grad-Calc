import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import { useActiveSpec, useSuperseded } from '../state/hooks'
import { compareSem, semLabelLong } from '../semester'
import { SemesterSelect } from './SemesterSelect'
import { AlsoCountsSelect } from './AlsoCountsSelect'
import { Select } from './Select'
import { Collapse } from './Collapse'
import { ConfirmModal } from './ConfirmModal'
import { Modal } from './Modal'
import { UploadBox } from './UploadBox'
import { flushSync } from 'react-dom'
import type { Course } from '../types'
import type { RequirementSpec } from '../data/requirements/types'

type Draft = Omit<Course, 'id'>

/**
 * 상태 변경(mutate)을 커밋한 뒤, 새 구역으로 '도착'한 행(ids)에 등장 애니메이션 클래스를 부여한다.
 * View Transition 스냅샷을 쓰지 않으므로 잔상(고스팅)/overflow 잘림이 없다.
 * flushSync로 동기 커밋해야 새 행이 즉시 DOM에 있어 클래스를 걸 수 있다. 모션축소 시 생략.
 */
function markArrivals(mutate: () => void, ids: string[]): void {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  flushSync(mutate)
  if (reduce) return
  const wanted = new Set(ids)
  document.querySelectorAll<HTMLElement>('[data-course-id]').forEach((el) => {
    if (!wanted.has(el.dataset.courseId ?? '')) return
    el.classList.remove('row-arrive')
    void el.offsetWidth // 리플로우로 애니메이션 재시작 보장
    el.classList.add('row-arrive')
    el.addEventListener('animationend', () => el.classList.remove('row-arrive'), { once: true })
  })
}
type CourseState = 'completed' | 'enrolled' | 'planned'

const emptyDraft = (categoryId = ''): Draft => ({
  name: '',
  credits: 0,
  categoryId,
  grade: '',
  semester: '',
  retake: false,
  planned: false,
  enrolled: false,
  alsoCounts: [],
})

/** 추가/저장 시 비어 있는 필수 항목 키. 완료 과목은 성적까지 필수, 예정/수강중은 성적 제외. */
function requiredMissing(d: Draft): Set<string> {
  const inProgress = d.planned || d.enrolled
  const m = new Set<string>()
  if (!d.name.trim()) m.add('name')
  if (!d.credits || d.credits <= 0) m.add('credits')
  if (!d.categoryId) m.add('categoryId')
  if (!d.semester) m.add('semester')
  if (!inProgress && !d.grade) m.add('grade')
  return m
}

function draftFromCourse(c: Course): Draft {
  return {
    name: c.name,
    code: c.code,
    credits: c.credits,
    categoryId: c.categoryId,
    grade: c.grade,
    semester: c.semester ?? '',
    retake: c.retake ?? false,
    planned: c.planned ?? false,
    enrolled: c.enrolled ?? false,
    alsoCounts: c.alsoCounts ?? [],
  }
}

/** 유효성 검사 + 정규화. 유효하지 않으면 null. */
function toPayload(d: Draft): Draft | null {
  if (!d.name.trim() || d.credits <= 0 || !d.categoryId) return null
  const inProgress = d.planned || d.enrolled
  return {
    ...d,
    name: d.name.trim(),
    semester: d.semester || undefined,
    grade: inProgress ? '' : d.grade,
    retake: inProgress ? false : d.retake,
    alsoCounts: d.alsoCounts && d.alsoCounts.length ? d.alsoCounts : undefined,
  }
}

export default function Courses() {
  const spec = useActiveSpec()
  const courses = useStore((s) => s.courses)
  const addCourse = useStore((s) => s.addCourse)
  const addCourseRetaking = useStore((s) => s.addCourseRetaking)
  const updateCourse = useStore((s) => s.updateCourse)
  const removeCourse = useStore((s) => s.removeCourse)
  const importTranscript = useStore((s) => s.importTranscript)
  const importEnrollment = useStore((s) => s.importEnrollment)
  const startSemester = useStore((s) => s.startSemester)
  const completeCourses = useStore((s) => s.completeCourses)
  const superseded = useSuperseded()

  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft())
  const [addErrors, setAddErrors] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Course | null>(null)
  const [msg, setMsg] = useState('')
  const [completing, setCompleting] = useState<string | null>(null)
  const [guardOpen, setGuardOpen] = useState(false)
  const [pendingDup, setPendingDup] = useState<{ payload: Draft; dupes: Course[] } | null>(null)
  const [pendingPick, setPendingPick] = useState(false)
  const enrollInputRef = useRef<HTMLInputElement | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deletingCourse = deletingId ? courses.find((c) => c.id === deletingId) : null

  const catLabel = (id: string) => spec.categories.find((c) => c.id === id)?.label ?? id

  const onTranscript = async (file: File | undefined) => {
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const { parseTranscriptFile } = await import('../import/transcript')
      const { courses: parsed, warnings } = await parseTranscriptFile(buf, spec.admissionYear)
      if (parsed.length) {
        const { added, plannedRemoved } = importTranscript(parsed)
        setMsg(
          `성적표 ${added}과목 반영 (포함된 학기 갱신 · 다른 학기 이수는 유지 · 동시인정 유지).` +
            (plannedRemoved ? ` 성적 나온 학기의 예정/수강중 ${plannedRemoved}과목 정리.` : '') +
            (warnings.length ? ` ${warnings.join(' ')}` : ''),
        )
      } else {
        setMsg(warnings.length ? warnings.join(' ') : '인식된 과목이 없습니다.')
      }
    } catch (e) {
      setMsg(`불러오기 실패: ${(e as Error).message}`)
    }
  }

  const applyEnrollment = (parsed: Course[], warnings: string[]) => {
    const { added, plannedRemoved } = importEnrollment(parsed)
    if (added === 0) {
      setMsg('추가된 수강 중 과목이 없어요 — 이미 이수 완료된 학기인지 확인하세요.')
    } else {
      setMsg(
        `수강내역 ${added}과목을 '수강 중'에 반영 (기존 수강중 교체).` +
          (plannedRemoved ? ` 같은 학기 예정 ${plannedRemoved}과목 정리.` : '') +
          (warnings.length ? ` ${warnings.join(' ')}` : ''),
      )
    }
  }

  const onEnrollment = async (file: File | undefined) => {
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const { parseEnrollmentFile } = await import('../import/transcript')
      const { courses: parsed, warnings } = await parseEnrollmentFile(buf, spec.admissionYear)
      if (!parsed.length) {
        setMsg(warnings.length ? warnings.join(' ') : '인식된 과목이 없습니다.')
        return
      }
      applyEnrollment(parsed, warnings)
    } catch (e) {
      setMsg(`불러오기 실패: ${(e as Error).message}`)
    }
  }

  // 수강내역 '파일 선택' 클릭 시: 완료 처리 안 된 수강 중 과목이 있으면 파일창을 열기 전에 먼저 확인한다.
  const enrollBeforePick = () => {
    if (courses.some((c) => c.enrolled)) {
      setPendingPick(true)
      return false
    }
    return true
  }

  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const resetAdd = () => {
    setAddDraft(emptyDraft())
    setAddErrors(new Set())
  }

  // 추가 폼 입력 변경: 값이 채워진 필수 항목은 오류 강조를 해제한다.
  const setAddDraftV = (d: Draft) => {
    setAddDraft(d)
    setAddErrors((prev) => {
      if (!prev.size) return prev
      const still = requiredMissing(d)
      return new Set([...prev].filter((f) => still.has(f)))
    })
  }

  const addSubmit = () => {
    const missing = requiredMissing(addDraft)
    if (missing.size) {
      // 비어 있는 필수 항목 빨갛게 강조(재시도마다 흔들림 다시 보이도록 비웠다 채움)
      setAddErrors(new Set())
      setTimeout(() => setAddErrors(missing), 0)
      return
    }
    const payload = toPayload(addDraft)
    if (!payload) return
    // 이미 같은 이름의 이수 완료 과목이 있으면 재수강 처리 여부를 묻는다
    const dupes = courses.filter(
      (c) => !c.planned && !c.enrolled && !c.retake && norm(c.name) === norm(payload.name),
    )
    if (dupes.length > 0) {
      setPendingDup({ payload, dupes })
      return
    }
    addCourse(payload)
    resetAdd()
  }

  const confirmRetake = () => {
    if (!pendingDup) return
    addCourseRetaking(
      pendingDup.payload,
      pendingDup.dupes.map((c) => c.id),
    )
    setPendingDup(null)
    resetAdd()
  }
  const justAdd = () => {
    if (!pendingDup) return
    addCourse(pendingDup.payload)
    setPendingDup(null)
    resetAdd()
  }

  const completed = courses.filter((c) => !c.planned && !c.enrolled)
  const enrolled = courses.filter((c) => c.enrolled)
  const planned = courses.filter((c) => c.planned)

  const onStartSemester = (semester: string) => {
    // 한 번에 한 학기만 수강중. 이미 수강중 과목이 있으면 먼저 정리해야 함.
    if (enrolled.length > 0) {
      setGuardOpen(true)
      return
    }
    markArrivals(
      () => startSemester(semester),
      planned.filter((c) => (c.semester || '미입력') === semester).map((c) => c.id),
    )
  }

  return (
    <div className="stack">
      {/* 성적표·수강내역 불러오기 */}
      <section className="glass-card">
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <h2 className="card-title">성적표 · 수강내역 불러오기</h2>
          <a className="ext-link" href="https://portal.ut.ac.kr/p/S01/" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 4h6v6M20 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            통합정보시스템
          </a>
        </div>
        <p className="card-sub" style={{ marginBottom: 8 }}>
          통합정보시스템에서 받은 엑셀을 올리면 과목이 자동 추가돼요.
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
          inputRef={enrollInputRef}
          beforePick={enrollBeforePick}
        />
        {msg && <p className="banner info" style={{ marginTop: 12 }}>{msg}</p>}
      </section>

      {/* 이수 과목 추가 */}
      <section className="glass-card">
        <h2 className="card-title">이수 완료 과목 추가</h2>
        <p className="card-sub">들을 예정 과목은 '계획' 탭에서 추가하세요.</p>
        <CourseFields draft={addDraft} setDraft={setAddDraftV} spec={spec} errors={addErrors} />
        {addErrors.size > 0 && (
          <p className="form-error-msg">비어 있는 필수 항목을 입력해 주세요.</p>
        )}
        <button onClick={addSubmit} className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
          추가
        </button>
      </section>

      {/* 목록: 이수 / 수강 중 / 예정 */}
      <GroupedCourses
        title="이수 완료"
        state="completed"
        items={completed}
        catLabel={catLabel}
        onEdit={setEditing}
        onRemove={setDeletingId}
        superseded={superseded}
      />
      {enrolled.length > 0 && (
        <GroupedCourses
          title="수강 중"
          state="enrolled"
          items={enrolled}
          catLabel={catLabel}
          onEdit={setEditing}
          onRemove={setDeletingId}
          actionLabel="수강 완료"
          onAction={setCompleting}
        />
      )}
      {planned.length > 0 && (
        <GroupedCourses
          title="수강 계획"
          state="planned"
          items={planned}
          catLabel={catLabel}
          onEdit={setEditing}
          onRemove={setDeletingId}
          actionLabel="학기 시작"
          onAction={onStartSemester}
        />
      )}

      {editing && (
        <CourseEditModal
          course={editing}
          spec={spec}
          onSave={(patch) => {
            updateCourse(editing.id, patch)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {completing !== null && (
        <CompleteSemesterModal
          semester={completing}
          courses={enrolled.filter((c) => (c.semester || '미입력') === completing)}
          catLabel={catLabel}
          gradeScale={spec.gradeScale}
          onConfirm={(updates) => {
            // 모달 닫기 + 완료 처리 커밋 후, 이수완료로 도착한 행에 등장 애니메이션.
            markArrivals(() => {
              setCompleting(null)
              completeCourses(updates)
            }, updates.map((u) => u.id))
          }}
          onClose={() => setCompleting(null)}
        />
      )}

      {guardOpen && (
        <Modal onClose={() => setGuardOpen(false)} maxWidth={360}>
          <h2 className="card-title">수강 중인 과목 정리 필요</h2>
          <p className="card-sub" style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
            이미 '수강 중인 과목'이 있어요. 새 학기를 시작하려면 먼저 수강 중인 과목을 <b>수강 완료(이수)</b>
            로 옮기거나 삭제해 주세요.
          </p>
          <button
            onClick={() => setGuardOpen(false)}
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
          >
            확인
          </button>
        </Modal>
      )}

      {pendingDup && (
        <Modal onClose={() => setPendingDup(null)} maxWidth={380}>
          <h2 className="card-title">재수강 처리</h2>
          <p className="card-sub" style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
            {[...new Set(pendingDup.dupes.map((c) => (c.semester ? semLabelLong(c.semester) : '학기 미입력')))].join(', ')}
            에 「{pendingDup.payload.name}」 과목이 이미 있어요. 이번에 추가하는 과목을 <b>재수강</b>으로
            처리할까요? (기존 과목은 학점·평점에서 제외돼요)
          </p>
          <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={confirmRetake} className="btn btn-primary btn-block">
              재수강 처리
            </button>
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
      )}

      {deletingCourse && (
        <ConfirmModal
          message={`「${deletingCourse.name}」 과목을 삭제할까요?`}
          onConfirm={() => {
            removeCourse(deletingCourse.id)
            setDeletingId(null)
          }}
          onClose={() => setDeletingId(null)}
        />
      )}

      {pendingPick && (
        <ConfirmModal
          title="수강 중 과목 교체 확인"
          message={`현재 '수강 중'인 ${courses.filter((c) => c.enrolled).length}과목이 아직 이수 완료 처리되지 않았어요. 새 수강내역을 불러오면 기존 수강 중 과목이 교체돼 사라집니다. 끝난 과목은 먼저 '수강 완료'를 눌러 이수로 옮긴 뒤 불러오세요. 그래도 진행할까요?`}
          confirmLabel="그래도 불러오기"
          onConfirm={() => {
            setPendingPick(false)
            enrollInputRef.current?.click()
          }}
          onClose={() => setPendingPick(false)}
        />
      )}
    </div>
  )
}

/** 과목 추가/수정 공용 입력 필드 (버튼 제외) */
function CourseFields({
  draft,
  setDraft,
  spec,
  showToggle,
  errors,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
  spec: RequirementSpec
  showToggle?: boolean
  errors?: Set<string>
}) {
  const inProgress = draft.planned || draft.enrolled
  const stateOf = (d: Draft): CourseState =>
    d.planned ? 'planned' : d.enrolled ? 'enrolled' : 'completed'
  const setState = (s: CourseState) =>
    setDraft({ ...draft, planned: s === 'planned', enrolled: s === 'enrolled' })

  return (
    <div className="space-y-3">
      {/* 이수/수강중/예정 토글 (수정 모달에서만) */}
      {showToggle && (
        <div className="segmented">
          {(
            [
              { v: 'completed', label: '이수 완료' },
              { v: 'enrolled', label: '수강 중' },
              { v: 'planned', label: '들을 예정' },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => setState(o.v)}
              className={stateOf(draft) === o.v ? 'on' : ''}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <input
        className={`field${errors?.has('name') ? ' field-error' : ''}`}
        placeholder="과목명 (예: 자료구조)"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="field-label">
          학점
          <Select
            ariaLabel="학점 선택"
            placeholder="학점"
            error={errors?.has('credits')}
            value={draft.credits > 0 ? String(draft.credits) : ''}
            onChange={(v) => setDraft({ ...draft, credits: Number(v) })}
            options={[...new Set(draft.credits > 0 ? [1, 2, 3, 4, 5, 6, 9, draft.credits] : [1, 2, 3, 4, 5, 6, 9])]
              .sort((a, b) => a - b)
              .map((n) => ({ value: String(n), label: String(n) }))}
          />
        </div>
        <div className="field-label">
          영역
          <Select
            ariaLabel="이수 영역 선택"
            placeholder="이수 영역"
            error={errors?.has('categoryId')}
            value={draft.categoryId}
            onChange={(v) => setDraft({ ...draft, categoryId: v })}
            options={spec.categories.map((c) => ({ value: c.id, label: c.label }))}
          />
        </div>
      </div>
      <div
        className="grid gap-2 tight-selects"
        style={{ gridTemplateColumns: inProgress ? '1fr' : 'minmax(0, 1fr) minmax(0, 0.42fr)' }}
      >
        <div className="field-label">
          학기
          <SemesterSelect
            value={draft.semester ?? ''}
            onChange={(v) => setDraft({ ...draft, semester: v })}
            error={errors?.has('semester')}
          />
        </div>
        {!inProgress && (
          <div className="field-label">
            성적
            <Select
              ariaLabel="성적 선택"
              placeholder="미입력"
              error={errors?.has('grade')}
              value={draft.grade}
              onChange={(v) => setDraft({ ...draft, grade: v })}
              options={spec.gradeScale.map((g) => ({ value: g.grade, label: g.grade }))}
            />
          </div>
        )}
      </div>
      <AlsoCountsSelect
        categories={spec.categories}
        primary={draft.categoryId}
        value={draft.alsoCounts ?? []}
        onChange={(v) => setDraft({ ...draft, alsoCounts: v })}
      />
      {!inProgress && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            style={{ accentColor: 'var(--p1)' }}
            checked={draft.retake ?? false}
            onChange={(e) => setDraft({ ...draft, retake: e.target.checked })}
          />
          재수강으로 대체된 이전 과목 (학점·평점 제외)
        </label>
      )}
    </div>
  )
}

function CourseEditModal({
  course,
  spec,
  onSave,
  onClose,
}: {
  course: Course
  spec: RequirementSpec
  onSave: (patch: Draft) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromCourse(course))
  const save = () => {
    const payload = toPayload(draft)
    if (payload) onSave(payload)
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="card-title">과목 수정</h2>
      <div style={{ marginTop: 12 }}>
        <CourseFields draft={draft} setDraft={setDraft} spec={spec} showToggle />
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={save} className="btn btn-primary" style={{ flex: 1 }}>
          저장
        </button>
        <button onClick={onClose} className="btn btn-ghost">
          취소
        </button>
      </div>
    </Modal>
  )
}

function GroupedCourses({
  title,
  state,
  items,
  catLabel,
  onEdit,
  onRemove,
  superseded,
  actionLabel,
  onAction,
}: {
  title: string
  state: CourseState
  items: Course[]
  catLabel: (id: string) => string
  onEdit: (c: Course) => void
  onRemove: (id: string) => void
  superseded?: Set<string>
  actionLabel?: string
  onAction?: (semester: string) => void
}) {
  const collapsedGroups = useStore((s) => s.collapsedGroups)
  const toggleGroup = useStore((s) => s.toggleGroup)
  const gkey = (k: string) => `${title}::${k}`
  const eff = (list: Course[]) =>
    list.reduce((s, c) => s + (superseded?.has(c.id) ? 0 : c.credits), 0)

  const groups = new Map<string, Course[]>()
  for (const c of items) {
    const key = c.semester || '미입력'
    const arr = groups.get(key)
    if (arr) arr.push(c)
    else groups.set(key, [c])
  }
  const keys = [...groups.keys()].sort(compareSem)

  return (
    <section className="glass-card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="card-title">{title}</h2>
        <span className="card-sub">
          {items.length}과목 · {eff(items)}학점
        </span>
      </div>
      {items.length === 0 ? (
        <p className="empty">아직 없어요.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => {
            const list = groups.get(k)!
            const open = !collapsedGroups.includes(gkey(k))
            return (
              <div key={k} className="group-box">
                <div className="group-head">
                  <button onClick={() => toggleGroup(gkey(k))} className="gh-btn">
                    <span className="group-title">
                      {k === '미입력' ? '학기 미입력' : semLabelLong(k)}
                    </span>
                    <span className="group-meta">
                      {list.length}과목 · {eff(list)}학점{' '}
                      <span className={`group-caret ml-1${open ? ' open' : ''}`}>▾</span>
                    </span>
                  </button>
                  {actionLabel && onAction && (
                    <button onClick={() => onAction(k)} className="btn btn-primary btn-xs">
                      {actionLabel}
                    </button>
                  )}
                </div>
                <Collapse open={open}>
                  <ul className="group-body">
                    {list.map((c) => (
                      <CourseRow
                        key={c.id}
                        c={c}
                        state={state}
                        catLabel={catLabel}
                        onEdit={onEdit}
                        onRemove={onRemove}
                        dup={superseded?.has(c.id)}
                      />
                    ))}
                  </ul>
                </Collapse>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function CourseRow({
  c,
  state,
  catLabel,
  onEdit,
  onRemove,
  dup,
}: {
  c: Course
  state: CourseState
  catLabel: (id: string) => string
  onEdit: (c: Course) => void
  onRemove: (id: string) => void
  dup?: boolean
}) {
  return (
    <li className="list-row" data-course-id={c.id}>
      <div className="row-main">
        <p className={`row-title ${c.retake || dup ? 'dim' : ''}`}>
          {state === 'planned' && <span className="tag amber">예정</span>}
          {state === 'enrolled' && <span className="tag info">수강중</span>}
          {c.retaking && <span className="tag mute">재수강</span>}
          {dup && <span className="tag mute">대체됨</span>}
          {c.name}
        </p>
        <p className="row-sub">
          {catLabel(c.categoryId)}
          {c.alsoCounts?.length ? ` +${c.alsoCounts.map(catLabel).join(',')}` : ''} · {c.credits}학점
          {c.grade && ` · ${c.grade}`}
        </p>
      </div>
      <button onClick={() => onEdit(c)} className="row-act edit">
        수정
      </button>
      <button onClick={() => onRemove(c.id)} className="row-act del">
        삭제
      </button>
    </li>
  )
}

function CompleteSemesterModal({
  semester,
  courses,
  catLabel,
  gradeScale,
  onConfirm,
  onClose,
}: {
  semester: string
  courses: Course[]
  catLabel: (id: string) => string
  gradeScale: { grade: string }[]
  onConfirm: (updates: { id: string; grade: string }[]) => void
  onClose: () => void
}) {
  const [grades, setGrades] = useState<Record<string, string>>(() =>
    Object.fromEntries(courses.map((c) => [c.id, c.grade ?? ''])),
  )
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set())
  const title = semester === '미입력' ? '학기 미입력' : semLabelLong(semester)

  const submit = () => {
    const missing = courses.filter((c) => !grades[c.id]).map((c) => c.id)
    if (missing.length > 0) {
      // 미입력 과목 강조(흔들림) — 재시도마다 다시 애니메이션이 보이도록 잠깐 비웠다 채움
      setErrorIds(new Set())
      requestAnimationFrame(() => setErrorIds(new Set(missing)))
      return
    }
    onConfirm(courses.map((c) => ({ id: c.id, grade: grades[c.id] })))
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="card-title">{title} 수강 완료</h2>
      <p className="card-sub">각 과목 성적을 모두 입력해야 이수로 옮길 수 있어요.</p>
      <ul style={{ marginTop: 12 }}>
        {courses.map((c) => (
          <li key={c.id} className="list-row">
            <div className="row-main">
              <p className="row-title">{c.name}</p>
              <p className="row-sub">
                {catLabel(c.categoryId)} · {c.credits}학점
              </p>
            </div>
            <Select
              ariaLabel={`${c.name} 성적`}
              style={{ width: '6.5rem', flex: 'none' }}
              value={grades[c.id]}
              placeholder="미입력"
              error={errorIds.has(c.id)}
              onChange={(v) => {
                setGrades({ ...grades, [c.id]: v })
                if (v)
                  setErrorIds((prev) => {
                    const n = new Set(prev)
                    n.delete(c.id)
                    return n
                  })
              }}
              options={gradeScale.map((g) => ({ value: g.grade, label: g.grade }))}
            />
          </li>
        ))}
      </ul>
      {errorIds.size > 0 && (
        <p className="banner err" style={{ marginTop: 12 }}>
          성적을 입력하지 않은 과목이 {errorIds.size}개 있어요. 모두 입력해 주세요.
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button onClick={submit} className="btn btn-primary" style={{ flex: 1 }}>
          수강 완료
        </button>
        <button onClick={onClose} className="btn btn-ghost">
          취소
        </button>
      </div>
    </Modal>
  )
}
