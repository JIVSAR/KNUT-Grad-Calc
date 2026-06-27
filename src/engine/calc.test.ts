import { describe, it, expect } from 'vitest'
import { cs2024 } from '../data/requirements/cs2024'
import { cs2022 } from '../data/requirements/cs2022'
import { composeSpec } from '../data/requirements'
import { applyOverrides } from '../data/requirements/overrides'
import { evaluate, project } from './calc'
import { computeGpa } from './gpa'
import type { Course } from '../types'

// 기본 요건 + K-융합전공 다전공으로 합성한 활성 스펙
const SPEC = composeSpec(cs2024, 'kConverge')

let seq = 0
function course(
  name: string,
  credits: number,
  categoryId: string,
  grade = 'A0',
  extra: Partial<Course> = {},
): Course {
  return { id: `c${seq++}`, name, credits, categoryId, grade, ...extra }
}

/** 모든 졸업요건을 충족하는 과목 집합 (전공필수23·전공계74·교양28·K융합필9·선12·총140) */
function fullySatisfyingCourses(): Course[] {
  const courses: Course[] = SPEC.requiredCourses.map((rc) => course(rc.name, 3, rc.categoryId))
  // 전공필수 9과목 × 3 = 27
  courses.push(course('전공선택채움', 47, 'majorElec')) // 전공계 27+47=74
  courses.push(course('교양채움', 28, 'ge')) // 교양 28
  courses.push(course('K융합필수채움', 9, 'kConvergeReq')) // K-융합필수 9
  courses.push(course('K융합선택채움', 12, 'kConvergeElec')) // K-융합선택 12
  courses.push(course('일반선택채움', 17, 'free')) // 총 140 (27+47+28+9+12+17)
  return courses
}

const ALL_NONCREDIT = new Set(['engCert', 'volunteer', 'gradExam'])
const area = (r: ReturnType<typeof evaluate>, id: string) => r.areas.find((a) => a.id === id)!

describe('합성된 요건 수치', () => {
  it('기본 140/74/23/28 + K-융합 9/12', () => {
    expect(SPEC.totalMinCredits).toBe(140)
    expect(SPEC.areas.find((a) => a.id === 'majorTotal')!.minCredits).toBe(74)
    expect(SPEC.areas.find((a) => a.id === 'majorReq')!.minCredits).toBe(23)
    expect(SPEC.areas.find((a) => a.id === 'geTotal')!.minCredits).toBe(28)
    expect(SPEC.areas.find((a) => a.id === 'kConvergeReq')!.minCredits).toBe(9)
    expect(SPEC.areas.find((a) => a.id === 'kConvergeElec')!.minCredits).toBe(12)
  })

  it('부전공 선택 시 K-융합 대신 부전공 21이 적용', () => {
    const minor = composeSpec(cs2024, 'minor')
    expect(minor.areas.find((a) => a.id === 'minor')!.minCredits).toBe(21)
    expect(minor.areas.find((a) => a.id === 'kConvergeReq')).toBeUndefined()
    expect(minor.areas.find((a) => a.id === 'total')!.includes).toContain('minor')
  })

  it('다전공 안 함 → 기본 요건만', () => {
    const none = composeSpec(cs2024, 'none')
    expect(none.areas.find((a) => a.id === 'kConvergeReq')).toBeUndefined()
    expect(none.areas.find((a) => a.id === 'minor')).toBeUndefined()
  })
})

describe('evaluate', () => {
  it('빈 과목 → 졸업 불가', () => {
    const r = evaluate([], SPEC)
    expect(r.totalEarned).toBe(0)
    expect(r.canGraduate).toBe(false)
    expect(area(r, 'total').remaining).toBe(140)
  })

  it('모든 요건 충족 → 졸업 가능', () => {
    const r = evaluate(fullySatisfyingCourses(), SPEC, ALL_NONCREDIT)
    expect(r.totalEarned).toBe(140)
    expect(area(r, 'majorTotal').earned).toBe(74)
    expect(area(r, 'geTotal').earned).toBe(28)
    expect(area(r, 'kConvergeReq').earned).toBe(9)
    expect(area(r, 'kConvergeElec').earned).toBe(12)
    expect(r.requiredCoursesSatisfied).toBe(true)
    expect(r.unmet).toHaveLength(0)
    expect(r.canGraduate).toBe(true)
  })

  it('필수과목 하나 빠지면 졸업 불가', () => {
    const courses = fullySatisfyingCourses().filter((c) => c.name !== '데이터베이스')
    courses.push(course('전공보충DB', 3, 'majorReq'))
    const r = evaluate(courses, SPEC, ALL_NONCREDIT)
    expect(r.requiredCoursesSatisfied).toBe(false)
    expect(r.canGraduate).toBe(false)
    expect(r.requiredCourses.find((c) => c.name === '데이터베이스')!.taken).toBe(false)
    expect(r.unmet.join()).toContain('필수과목 1개 미이수')
  })

  it("'총 졸업학점'은 다전공 트랙과 무관하게 모든 학점을 센다", () => {
    // cs2022 + 전공심화('none'): 총 영역 includes에 K-융합 카테고리가 없음
    const spec = composeSpec(cs2022, 'none')
    const courses = [course('전공A', 10, 'majorReq'), course('K융합과목', 6, 'kConvergeReq')]
    const total = evaluate(courses, spec).areas.find((a) => a.id === 'total')!
    expect(total.earned).toBe(16) // 10 + 6 모두 총학점에 카운트

    const withPlan = [...courses, course('계획K', 3, 'kConvergeReq', '', { planned: true })]
    const r = evaluate(withPlan, spec)
    expect(r.areas.find((a) => a.id === 'total')!.planned).toBe(3)
    // project()의 총 행도 동일하게 모든 계획학점을 반영
    const totalRow = project(withPlan, spec).rows.find((row) => row.id === 'total')!
    expect(totalRow.earned).toBe(16)
  })

  it('수강중(enrolled) 학점이 totalEnrolled·area.enrolled에 집계되고 이수에는 안 들어감', () => {
    const courses: Course[] = [
      course('이수A', 10, 'majorElec'),
      course('수강중B', 3, 'majorElec', '', { enrolled: true }),
    ]
    const r = evaluate(courses, SPEC)
    expect(r.totalEnrolled).toBe(3)
    const total = r.areas.find((a) => a.id === 'total')!
    expect(total.earned).toBe(10) // 수강중은 이수 아님
    expect(total.enrolled).toBe(3)
  })

  it('이미 이수한 과목의 재수강(수강중)은 반영 학점에 안 들어감(중복 카운트 방지)', () => {
    const courses: Course[] = [
      course('자료구조', 3, 'majorElec', 'A0', { code: '259068', semester: '2-1' }),
      course('자료구조', 3, 'majorElec', '', { code: '259068', enrolled: true, semester: '3-1' }), // 재수강
    ]
    const r = evaluate(courses, SPEC)
    expect(r.totalEnrolled).toBe(0) // 재수강은 새 학점이 아님
    const totalRow = project(courses, SPEC).rows.find((row) => row.id === 'total')!
    expect(totalRow.finalRemaining).toBe(SPEC.totalMinCredits - 3) // 이수 3만 반영
  })

  it('낙제(F) 과목의 재수강(수강중)은 새 학점으로 반영됨', () => {
    const courses: Course[] = [
      course('자료구조', 3, 'majorElec', 'F', { code: '259068', semester: '2-1' }), // 낙제 → 이수 아님
      course('자료구조', 3, 'majorElec', '', { code: '259068', enrolled: true, semester: '3-1' }),
    ]
    expect(evaluate(courses, SPEC).totalEnrolled).toBe(3)
  })

  it('비학점 인증 미충족 시 졸업 불가, 창의는 면제', () => {
    const r = evaluate(fullySatisfyingCourses(), SPEC, new Set(['engCert']))
    expect(r.canGraduate).toBe(false)
    expect(r.nonCredit.find((n) => n.id === 'creativeCert')!.satisfied).toBe(true)
    expect(r.nonCredit.find((n) => n.id === 'volunteer')!.satisfied).toBe(false)
  })
})

describe('이수/예정(planned) 구분', () => {
  it('예정 과목은 취득 미반영, remainingAfterPlan만 줄어듦', () => {
    const courses: Course[] = [
      course('운영체제', 3, 'majorReq', 'A0'),
      course('마이크로프로세서', 3, 'majorReq', '', { planned: true, semester: '3-2' }),
    ]
    const mr = area(evaluate(courses, SPEC), 'majorReq')
    expect(mr.earned).toBe(3)
    expect(mr.planned).toBe(3)
    expect(mr.remaining).toBe(20)
    expect(mr.remainingAfterPlan).toBe(17)
    const req = evaluate(courses, SPEC).requiredCourses.find((c) => c.name === '마이크로프로세서')!
    expect(req.planned).toBe(true)
  })

  it('등급 미입력 이수 과목도 취득 인정(GPA 미반영)', () => {
    const r = evaluate([course('정보통신개론', 3, 'majorReq', '')], SPEC)
    expect(area(r, 'majorReq').earned).toBe(3)
    expect(r.gpaCredits).toBe(0)
  })
})

describe('project (학기별 남은학점)', () => {
  it('예정 과목을 학기 순서대로 반영하면 남은학점이 줄어든다', () => {
    const courses: Course[] = [
      course('전공이수', 10, 'majorElec', 'A0'),
      course('가', 6, 'majorElec', '', { planned: true, semester: '3-2' }),
      course('나', 8, 'majorElec', '', { planned: true, semester: '4-1' }),
    ]
    const p = project(courses, SPEC)
    expect(p.terms).toEqual(['3-2', '4-1'])
    const major = p.rows.find((r) => r.id === 'majorTotal')!
    expect(major.cells.map((c) => c.remaining)).toEqual([58, 50])
    expect(p.totalPlanned).toBe(14)
  })

  it('학기 정렬: 1학기→여름→2학기→겨울', () => {
    const mk = (sem: string) => course('x' + sem, 1, 'free', '', { planned: true, semester: sem })
    expect(project([mk('3-W'), mk('3-1'), mk('3-2'), mk('3-S')], SPEC).terms).toEqual([
      '3-1',
      '3-S',
      '3-2',
      '3-W',
    ])
  })
})

describe('총 졸업학점 override 반영', () => {
  it('totalMinCredits override가 total 영역 minCredits까지 동기화된다', () => {
    const spec = applyOverrides(SPEC, { totalMinCredits: 100 })
    expect(spec.totalMinCredits).toBe(100)
    expect(spec.areas.find((a) => a.id === 'total')!.minCredits).toBe(100)
  })

  it('evaluate의 total 영역과 project의 total 행이 override를 반영한다', () => {
    const spec = applyOverrides(SPEC, { totalMinCredits: 100 })
    const courses: Course[] = [
      course('이수A', 80, 'majorElec'),
      course('계획A', 18, 'majorElec', '', { planned: true, semester: '3-1' }),
    ]
    // 대시보드 총 졸업학점 카드가 읽는 값
    expect(evaluate(courses, spec).areas.find((a) => a.id === 'total')!.remaining).toBe(20)
    // 플래너 '학기별 남은 학점' 총합 행
    const totalRow = project(courses, spec).rows.find((r) => r.id === 'total')!
    expect(totalRow.min).toBe(100)
    expect(totalRow.finalRemaining).toBe(2) // 100 - 80 - 18
  })
})

describe('일관성 수정 (예정 중복제거·고아 과목)', () => {
  it('같은 동일교과목 그룹을 예정으로 두 번 넣어도 새 학점은 1회만 인정 (#15)', () => {
    const courses: Course[] = [
      course('자료구조', 3, 'majorElec', '', { code: '259068', planned: true, semester: '3-1' }),
      course('자료구조', 3, 'majorElec', '', { code: '259068', planned: true, semester: '3-2' }), // 중복
    ]
    expect(evaluate(courses, SPEC).totalPlanned).toBe(3) // 6이 아니라 3
    const totalRow = project(courses, SPEC).rows.find((row) => row.id === 'total')!
    expect(totalRow.finalRemaining).toBe(SPEC.totalMinCredits - 3) // 이중 차감 방지
  })

  it('현재 트랙에 없는 분류(categoryId) 과목은 unclassified로 잡히고 영역엔 안 들어간다 (#5)', () => {
    const courses: Course[] = [
      course('전공선택A', 30, 'majorElec'),
      course('부전공과목', 9, 'minor'), // K-융합 트랙엔 'minor' 카테고리가 없음
    ]
    const r = evaluate(courses, SPEC) // SPEC = cs2024 + K-융합
    expect(r.unclassified.map((u) => u.name)).toContain('부전공과목')
    expect(r.unclassified.reduce((s, u) => s + u.credits, 0)).toBe(9)
    expect(r.areas.find((a) => a.id === 'total')!.earned).toBe(39) // 총학점엔 포함
    expect(r.areas.find((a) => a.id === 'majorTotal')!.earned).toBe(30) // 영역엔 미포함
  })
})

describe('재수강 계획/수강중 — 명시적 retake 플래그는 새 학점 미반영', () => {
  it('재수강 표시(retaking)한 계획 과목은 학점 변동 없음, 학기 열은 보임', () => {
    const courses: Course[] = [
      course('자료구조', 3, 'majorElec', 'C+', { semester: '2-1' }), // 이수
      course('자료구조', 3, 'majorElec', '', { planned: true, retaking: true, semester: '3-1' }), // 재수강 계획
    ]
    expect(evaluate(courses, SPEC).totalPlanned).toBe(0)
    const p = project(courses, SPEC)
    expect(p.totalPlanned).toBe(0)
    expect(p.rows.find((r) => r.id === 'total')!.finalRemaining).toBe(SPEC.totalMinCredits - 3)
    expect(p.retakeIds.size).toBe(1)
    expect(p.terms).toContain('3-1') // 학기 열은 보이되
    expect(p.rows.find((r) => r.id === 'total')!.cells[0].planned).toBe(0) // 학점 변동 0
  })

  it("재수강 표시 안 한('그냥 추가') 계획 과목은 새 학점으로 반영", () => {
    const courses: Course[] = [
      course('자료구조', 3, 'majorElec', 'C+', { semester: '2-1' }),
      course('자료구조', 3, 'majorElec', '', { planned: true, semester: '3-1' }), // retake 플래그 없음
    ]
    expect(evaluate(courses, SPEC).totalPlanned).toBe(3)
    expect(project(courses, SPEC).retakeIds.size).toBe(0)
  })

  it('재수강(retaking) 계획은 전공 영역 변동 없음', () => {
    const courses: Course[] = [
      course('자료구조', 3, 'majorElec', 'C+', { semester: '2-1' }),
      course('자료구조', 3, 'majorElec', '', { planned: true, retaking: true, semester: '3-1' }),
    ]
    const p = project(courses, SPEC)
    expect(p.rows.find((r) => r.id === 'majorTotal')!.cells[0].planned).toBe(0)
  })
})

describe('computeGpa', () => {
  it('A+(3)과 B0(3) → 3.75', () => {
    expect(
      computeGpa([course('가', 3, 'majorElec', 'A+'), course('나', 3, 'majorElec', 'B0')], SPEC).gpa,
    ).toBeCloseTo(3.75, 5)
  })

  it('P는 GPA 제외, F는 0점 포함', () => {
    expect(
      computeGpa([course('가', 3, 'ge', 'A0'), course('패스', 3, 'ge', 'P')], SPEC).gpa,
    ).toBeCloseTo(4.0, 5)
    expect(
      computeGpa([course('가', 3, 'majorElec', 'A0'), course('에프', 3, 'majorElec', 'F')], SPEC).gpa,
    ).toBeCloseTo(2.0, 5)
  })
})
