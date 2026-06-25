import type { Course } from '../types'
import type { GradePoint } from '../data/requirements/types'
import { equivalentGroup } from '../data/equivalence'

/** 등급 점수(대체 판정용): F/NP는 최하(-1), 그 외 points, 등급 미입력/P 등은 0. */
export function gradeScore(grade: string, gradeMap: Map<string, GradePoint>): number {
  const g = gradeMap.get(grade)
  if (g && g.fail) return -1
  return g ? g.points : 0
}

/**
 * 재수강 그룹(같은 과목의 여러 응시)에서 '최고 성적' 과목의 id를 반환.
 * 재수강 규칙: 원 성적과 재수강 성적 중 더 높은 쪽이 유효(GPA·학점에 반영).
 * 동점이면 입력 순서상 첫 번째, 빈 그룹이면 undefined.
 */
export function bestGradeId(
  group: Course[],
  gradeMap: Map<string, GradePoint>,
): string | undefined {
  if (group.length === 0) return undefined
  let best = group[0]
  for (const c of group)
    if (gradeScore(c.grade, gradeMap) > gradeScore(best.grade, gradeMap)) best = c
  return best.id
}

/**
 * 재수강/동일교과목으로 중복된 과목 중 '최고 학점' 1개만 남기고
 * 나머지(대체된 과목)의 id를 반환한다. 학점·GPA 계산에서 제외 대상.
 *
 * 자동 묶음 기준: **같은 교과목코드(동일교과목 그룹 포함)** — 성적표의 재수강(같은 코드 2건),
 *   동일교과목(다른 코드·같은 과목)만 자동 처리한다.
 *   코드가 없는 수동 추가 과목은 자동으로 묶지 않는다(과목 탭에서 '재수강 처리' 모달로 확인).
 * 예정(planned)·수강중(enrolled)·명시적 재수강(retake)은 그룹 계산에서 제외.
 */
export function getSuperseded(
  courses: Course[],
  gradeMap: Map<string, GradePoint>,
): Set<string> {
  const active = courses.filter((c) => !c.planned && !c.enrolled && !c.retake)

  const groups = new Map<string, Course[]>()
  for (const c of active) {
    if (!c.code) continue // 코드 없는 과목은 자동 묶음 대상 아님
    const k = `g:${equivalentGroup(c.code)}`
    const arr = groups.get(k)
    if (arr) arr.push(c)
    else groups.set(k, [c])
  }

  const out = new Set<string>()
  for (const list of groups.values()) {
    if (list.length < 2) continue
    let best = list[0]
    for (const c of list)
      if (gradeScore(c.grade, gradeMap) > gradeScore(best.grade, gradeMap)) best = c
    for (const c of list) if (c.id !== best.id) out.add(c.id)
  }
  return out
}

/** 재수강 규칙(학칙): 자격=원 성적 C+(2.5) 이하, 취득 상한=A0(4.0). */
export const RETAKE_ELIGIBLE_MAX_POINTS = 2.5
export const RETAKE_GRADE_CAP_POINTS = 4.0

/** 재수강 자격: 같은 과목의 기존(유효) 성적 중 최고가 C+ 이하(또는 F)면 재수강 가능. B0 이상이면 대상 아님. */
export function retakeEligible(dupes: Course[], gradeMap: Map<string, GradePoint>): boolean {
  if (dupes.length === 0) return false
  const best = Math.max(...dupes.map((c) => gradeScore(c.grade, gradeMap)))
  return best <= RETAKE_ELIGIBLE_MAX_POINTS
}

/** 재수강 취득 성적 상한(A0). 상한을 넘는 성적(A+)은 4.0 이하 최고 등급(A0)으로 낮춘다. */
export function capRetakeGrade(grade: string, gradeScale: GradePoint[]): string {
  const g = gradeScale.find((x) => x.grade === grade)
  if (!g || g.points <= RETAKE_GRADE_CAP_POINTS) return grade
  const capped = gradeScale
    .filter((x) => x.points <= RETAKE_GRADE_CAP_POINTS)
    .reduce((a, b) => (b.points > a.points ? b : a))
  return capped.grade
}
