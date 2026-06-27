import type { Course } from '../types'
import type { GradePoint, RequirementSpec } from '../data/requirements/types'
import { compareSem } from '../semester'
import { equivalentGroup } from '../data/equivalence'
import { buildGradeMap, computeGpa } from './gpa'
import { getSuperseded } from './dedup'

export interface AreaResult {
  id: string
  label: string
  min: number
  earned: number
  planned: number
  /** 수강중(enrolled) 과목 학점 */
  enrolled: number
  remaining: number
  remainingAfterPlan: number
  satisfied: boolean
}

export interface RequiredCourseResult {
  name: string
  taken: boolean
  /** 미취득이고 수강중(enrolled)인 상태 */
  enrolled: boolean
  /** 미취득이고, 수강중도 아니며, 수강 계획(planned)에만 있는 상태 */
  planned: boolean
}

export interface NonCreditResult {
  id: string
  label: string
  detail: string
  exempt: boolean
  completed: boolean
  satisfied: boolean
}

export interface GradResult {
  totalEarned: number
  totalPlanned: number
  totalEnrolled: number
  totalMin: number
  areas: AreaResult[]
  gpa: number
  gpaCredits: number
  gpaSatisfied: boolean
  requiredCourses: RequiredCourseResult[]
  requiredCoursesSatisfied: boolean
  nonCredit: NonCreditResult[]
  semestersCounted: number
  semesterSatisfied: boolean
  hasSemesterData: boolean
  canGraduate: boolean
  unmet: string[]
  /** 전체 졸업요건 평균 충족도(0~100). 학점 영역·GPA·필수과목·비학점 인증을 종합. */
  overallProgress: number
  /** 현재 스펙(학과·다전공)의 어느 영역에도 분류되지 않는 과목 — 총학점엔 잡히나 영역엔 안 잡힘. */
  unclassified: { name: string; categoryId: string; credits: number }[]
}

const normalize = (s: string): string => s.replace(/\s+/g, '').toLowerCase()

/** 학점 취득(이수) 과목 여부. 예정·수강중·재수강대체·불합격(F/NP)은 제외. 등급 미입력 이수과목은 취득으로 인정. */
export function isEarned(course: Course, gradeMap: Map<string, GradePoint>): boolean {
  if (course.retake || course.planned || course.enrolled) return false
  const g = gradeMap.get(course.grade)
  return !(g && g.fail)
}

/** 해당 영역(includes)에 속하는 과목들의 학점 합 (과목당 영역 1회). */
function creditsInArea(courses: Course[], includes: string[]): number {
  const inc = new Set(includes)
  return courses
    .filter((c) => inc.has(c.categoryId))
    .reduce((s, c) => s + c.credits, 0)
}

/**
 * 같은 동일교과목 그룹(코드 기준)은 새 학점으로 1회만 인정. seen에 이미 있는 그룹은 제외(seen을 갱신).
 * 코드 없는 수동 과목은 자동으로 묶지 않는다 — 이름 기준 재수강은 명시적 retake 플래그(계획/과목 탭 모달)로 처리.
 */
function dedupNewCredit(list: Course[], seen: Set<string>): Course[] {
  const out: Course[] = []
  for (const c of list) {
    if (!c.code) {
      out.push(c)
      continue
    }
    const key = equivalentGroup(c.code)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

export function evaluate(
  courses: Course[],
  spec: RequirementSpec,
  completedNonCredit: ReadonlySet<string> = new Set(),
): GradResult {
  const gradeMap = buildGradeMap(spec)
  const superseded = getSuperseded(courses, gradeMap)
  const earnedCourses = courses.filter((c) => isEarned(c, gradeMap) && !superseded.has(c.id))
  // 재수강(명시적 retake 플래그 또는 이미 이수한 과목과 같은 코드)은 '새 학점'이 아니므로 제외하고,
  // 예정·수강중 사이에서도 같은 코드는 1회만 새 학점으로 인정(이중 계산 방지).
  const earnedKeys = new Set(earnedCourses.filter((c) => c.code).map((c) => equivalentGroup(c.code!)))
  const scheduledSeen = new Set(earnedKeys)
  const plannedCourses = dedupNewCredit(courses.filter((c) => c.planned && !c.retaking), scheduledSeen)
  const enrolledCourses = dedupNewCredit(courses.filter((c) => c.enrolled && !c.retaking), scheduledSeen)

  // 현재 스펙(학과·다전공)의 어느 영역에도 분류되지 않는 과목(예: 트랙 변경으로 남겨진 과목).
  const knownCats = new Set(spec.categories.map((c) => c.id))
  const unclassified = [...earnedCourses, ...enrolledCourses, ...plannedCourses]
    .filter((c) => !knownCats.has(c.categoryId))
    .map((c) => ({ name: c.name, categoryId: c.categoryId, credits: c.credits }))

  const totalEarned = earnedCourses.reduce((s, c) => s + c.credits, 0)
  const totalPlanned = plannedCourses.reduce((s, c) => s + c.credits, 0)
  const totalEnrolled = enrolledCourses.reduce((s, c) => s + c.credits, 0)

  const areas: AreaResult[] = spec.areas.map((a) => {
    // '총 졸업학점'은 카테고리 무관 모든 학점이 들어간다(다전공 트랙과 무관하게 140 기준).
    const earned = a.id === 'total' ? totalEarned : creditsInArea(earnedCourses, a.includes)
    const planned = a.id === 'total' ? totalPlanned : creditsInArea(plannedCourses, a.includes)
    const enrolled = a.id === 'total' ? totalEnrolled : creditsInArea(enrolledCourses, a.includes)
    return {
      id: a.id,
      label: a.label,
      min: a.minCredits,
      earned,
      planned,
      enrolled,
      remaining: Math.max(0, a.minCredits - earned),
      remainingAfterPlan: Math.max(0, a.minCredits - earned - planned - enrolled),
      satisfied: earned >= a.minCredits,
    }
  })

  const { gpa, gpaCredits } = computeGpa(courses, spec, gradeMap)
  const gpaSatisfied = gpa >= spec.gpaMin

  const earnedNames = earnedCourses.map((c) => normalize(c.name))
  const enrolledNames = courses.filter((c) => c.enrolled).map((c) => normalize(c.name))
  const plannedNames = courses.filter((c) => c.planned).map((c) => normalize(c.name))
  const requiredCourses: RequiredCourseResult[] = spec.requiredCourses.map((rc) => {
    const target = normalize(rc.name)
    const taken = earnedNames.some((n) => n === target)
    // 수강중을 계획보다 우선(둘 다 있으면 '수강중'으로 표시)
    const enrolled = !taken && enrolledNames.some((n) => n === target)
    return {
      name: rc.name,
      taken,
      enrolled,
      planned: !taken && !enrolled && plannedNames.some((n) => n === target),
    }
  })
  const requiredCoursesSatisfied = requiredCourses.every((r) => r.taken)

  const nonCredit: NonCreditResult[] = spec.nonCredit.map((n) => {
    const completed = completedNonCredit.has(n.id)
    return {
      id: n.id,
      label: n.label,
      detail: n.detail,
      exempt: !!n.exempt,
      completed,
      satisfied: !!n.exempt || completed,
    }
  })

  const semesters = new Set(
    earnedCourses.map((c) => c.semester).filter((s): s is string => !!s),
  )
  const semestersCounted = semesters.size
  const hasSemesterData = semestersCounted > 0
  const semesterSatisfied = !hasSemesterData || semestersCounted >= spec.minSemesters

  const unmet: string[] = []
  for (const a of areas) if (!a.satisfied) unmet.push(`${a.label} ${a.earned}/${a.min}학점`)
  if (!gpaSatisfied) unmet.push(`평점평균 ${gpa.toFixed(2)} (기준 ${spec.gpaMin})`)
  if (!requiredCoursesSatisfied) {
    const missingCount = requiredCourses.filter((r) => !r.taken).length
    unmet.push(`필수과목 ${missingCount}개 미이수`)
  }
  for (const n of nonCredit) if (!n.satisfied) unmet.push(n.label)
  if (hasSemesterData && !semesterSatisfied) {
    unmet.push(`이수학기 ${semestersCounted}/${spec.minSemesters}`)
  }

  const canGraduate =
    areas.every((a) => a.satisfied) &&
    gpaSatisfied &&
    requiredCoursesSatisfied &&
    nonCredit.every((n) => n.satisfied) &&
    semesterSatisfied

  // 전체 진행률: 각 졸업요건의 충족 비율 평균(학점 영역·GPA·필수과목·비학점 인증·이수학기).
  const ratios: number[] = []
  for (const a of areas) {
    if (a.id === 'total') continue // 총학점은 다른 영역과 중복이라 평균에서 제외
    ratios.push(a.min > 0 ? Math.min(1, a.earned / a.min) : 1)
  }
  ratios.push(spec.gpaMin > 0 ? Math.min(1, gpa / spec.gpaMin) : 1)
  if (requiredCourses.length > 0) {
    ratios.push(requiredCourses.filter((r) => r.taken).length / requiredCourses.length)
  }
  for (const n of nonCredit) if (!n.exempt) ratios.push(n.satisfied ? 1 : 0)
  if (hasSemesterData) {
    ratios.push(spec.minSemesters > 0 ? Math.min(1, semestersCounted / spec.minSemesters) : 1)
  }
  const overallProgress = ratios.length
    ? Math.round((ratios.reduce((s, x) => s + x, 0) / ratios.length) * 100)
    : 0

  return {
    totalEarned,
    totalPlanned,
    totalEnrolled,
    totalMin: spec.totalMinCredits,
    areas,
    gpa,
    gpaCredits,
    gpaSatisfied,
    requiredCourses,
    requiredCoursesSatisfied,
    nonCredit,
    semestersCounted,
    semesterSatisfied,
    hasSemesterData,
    canGraduate,
    unmet,
    overallProgress,
    unclassified,
  }
}

// ── 학기별 남은학점 projection (계획 탭) ──────────────────────────────

export interface ProjCell {
  term: string
  planned: number
  remaining: number
}
export interface ProjRow {
  id: string
  label: string
  min: number
  earned: number
  cells: ProjCell[]
  finalRemaining: number
}
export interface Projection {
  terms: string[]
  rows: ProjRow[]
  termTotals: { term: string; planned: number }[]
  totalPlanned: number
  /** 이미 이수한 과목의 재수강이라 새 학점에 반영되지 않은 예정/수강중 과목 id. */
  retakeIds: Set<string>
}

const UNSCHEDULED = '미정'

/**
 * 이수 학점을 기준으로, '수강중 + 예정' 과목을 학기 순서대로 반영했을 때 영역별 남은 학점 추이.
 * (수강중도 곧 이수될 학점이라 함께 반영한다.)
 */
export function project(courses: Course[], spec: RequirementSpec): Projection {
  const gradeMap = buildGradeMap(spec)
  const superseded = getSuperseded(courses, gradeMap)
  const earnedCourses = courses.filter((c) => isEarned(c, gradeMap) && !superseded.has(c.id))
  // 수강중 + 예정을 '반영 예정 학점'으로 묶되, 재수강(명시적 retake 또는 같은 코드)은 새 학점이 아니므로 제외.
  const earnedKeys = new Set(earnedCourses.filter((c) => c.code).map((c) => equivalentGroup(c.code!)))
  const allScheduled = courses.filter((c) => c.planned || c.enrolled)
  const scheduledCourses = dedupNewCredit(allScheduled.filter((c) => !c.retaking), new Set(earnedKeys))
  const keptIds = new Set(scheduledCourses.map((c) => c.id))
  const retakeIds = new Set(allScheduled.filter((c) => !keptIds.has(c.id)).map((c) => c.id))

  // 학기 열은 전체 예정/수강중 기준(재수강만 있는 학기도 열은 보이되 학점 변동은 0).
  const terms = [...new Set(allScheduled.map((c) => c.semester || UNSCHEDULED))].sort(compareSem)

  const rows: ProjRow[] = spec.areas.map((a) => {
    const isTotal = a.id === 'total'
    // '총 졸업학점'은 카테고리 무관 모든 학점.
    const earned = isTotal
      ? earnedCourses.reduce((s, c) => s + c.credits, 0)
      : creditsInArea(earnedCourses, a.includes)
    let remaining = Math.max(0, a.minCredits - earned)
    const cells: ProjCell[] = terms.map((term) => {
      const inTerm = scheduledCourses.filter((c) => (c.semester || UNSCHEDULED) === term)
      const planned = isTotal
        ? inTerm.reduce((s, c) => s + c.credits, 0)
        : creditsInArea(inTerm, a.includes)
      remaining = Math.max(0, remaining - planned)
      return { term, planned, remaining }
    })
    return { id: a.id, label: a.label, min: a.minCredits, earned, cells, finalRemaining: remaining }
  })

  const termTotals = terms.map((term) => ({
    term,
    planned: scheduledCourses
      .filter((c) => (c.semester || UNSCHEDULED) === term)
      .reduce((s, c) => s + c.credits, 0),
  }))

  return {
    terms,
    rows,
    termTotals,
    totalPlanned: scheduledCourses.reduce((s, c) => s + c.credits, 0),
    retakeIds,
  }
}
