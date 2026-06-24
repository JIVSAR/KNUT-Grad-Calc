import { describe, it, expect } from 'vitest'
import { evaluate } from './calc'
import { computeGpa, buildGradeMap } from './gpa'
import { getSuperseded, gradeScore, bestGradeId } from './dedup'
import { cs2024 } from '../data/requirements/cs2024'
import type { Course } from '../types'

const major = (r: ReturnType<typeof evaluate>) => r.areas.find((a) => a.id === 'majorTotal')!

describe('재수강/동일교과목 중복 처리', () => {
  it('같은 코드 재수강 → 높은 학점만 인정, 학점 1회', () => {
    const courses: Course[] = [
      { id: '1', name: '자료구조', code: '259068', credits: 3, categoryId: 'majorElec', grade: 'C0' },
      { id: '2', name: '자료구조', code: '259068', credits: 3, categoryId: 'majorElec', grade: 'A0' },
    ]
    expect(major(evaluate(courses, cs2024)).earned).toBe(3) // 두 번 들었어도 3학점만
    expect(computeGpa(courses, cs2024).gpa).toBeCloseTo(4.0, 5) // A0만 반영
    expect(computeGpa(courses, cs2024).gpaCredits).toBe(3)
  })

  it('동일교과목(다른 코드) C프로그래밍259064 ≡ C언어259096 → 묶임', () => {
    const courses: Course[] = [
      { id: '1', name: 'C프로그래밍', code: '259064', credits: 3, categoryId: 'majorElec', grade: 'B0' },
      { id: '2', name: 'C언어', code: '259096', credits: 3, categoryId: 'majorElec', grade: 'A+' },
    ]
    const sup = getSuperseded(courses, buildGradeMap(cs2024))
    expect(sup.has('1')).toBe(true)
    expect(major(evaluate(courses, cs2024)).earned).toBe(3)
  })

  it('F 후 재수강 합격 → 합격분만 인정', () => {
    const courses: Course[] = [
      { id: '1', name: '운영체제', code: '252071', credits: 3, categoryId: 'majorReq', grade: 'F' },
      { id: '2', name: '운영체제', code: '252071', credits: 3, categoryId: 'majorReq', grade: 'B0' },
    ]
    expect(evaluate(courses, cs2024).areas.find((a) => a.id === 'majorReq')!.earned).toBe(3)
  })

  it('코드 없는 같은 이름 과목은 자동으로 묶지 않음(수동 추가는 UI 재수강 모달로 처리)', () => {
    const courses: Course[] = [
      { id: '1', name: '자료구조', credits: 3, categoryId: 'majorElec', grade: 'C0' },
      { id: '2', name: '자료구조', credits: 3, categoryId: 'majorElec', grade: 'A0' },
    ]
    expect(getSuperseded(courses, buildGradeMap(cs2024)).size).toBe(0) // 자동 대체 없음
    expect(major(evaluate(courses, cs2024)).earned).toBe(6) // 둘 다 인정
  })

  it('명시적 재수강(retake) 표시 시 그 과목은 제외(모달 확인 결과)', () => {
    const courses: Course[] = [
      // 기존 자료구조를 재수강으로 표시(모달 '재수강 처리' 결과)
      { id: '1', name: '자료구조', code: '259068', credits: 3, categoryId: 'majorElec', grade: 'C0', semester: '2-1', retake: true },
      { id: '2', name: '자료구조', credits: 3, categoryId: 'majorElec', grade: 'A0', semester: '3-2' },
    ]
    expect(major(evaluate(courses, cs2024)).earned).toBe(3) // 재수강 표시된 1은 제외, 1회만
    expect(computeGpa(courses, cs2024).gpa).toBeCloseTo(4.0, 5) // A0만 반영
  })

  it('명시적 재수강(retake) 표시 과목은 그룹 계산에서 빠지고 항상 제외', () => {
    const courses: Course[] = [
      { id: '1', name: '알고리즘', code: '254048', credits: 3, categoryId: 'majorElec', grade: 'C0', retake: true },
      { id: '2', name: '알고리즘', code: '254048', credits: 3, categoryId: 'majorElec', grade: 'A+' },
    ]
    expect(major(evaluate(courses, cs2024)).earned).toBe(3)
  })
})

describe('재수강 최고 성적 판정 (gradeScore / bestGradeId)', () => {
  const gm = buildGradeMap(cs2024)
  const c = (id: string, grade: string): Course => ({
    id,
    name: '자료구조',
    credits: 3,
    categoryId: 'majorElec',
    grade,
  })

  it('gradeScore: C+ > C0, F는 최하(-1), 미입력은 0', () => {
    expect(gradeScore('C+', gm)).toBeGreaterThan(gradeScore('C0', gm))
    expect(gradeScore('A0', gm)).toBe(4.0)
    expect(gradeScore('F', gm)).toBe(-1)
    expect(gradeScore('', gm)).toBe(0)
  })

  it('원 C+ vs 재수강 C0 → 원(C+)이 유효 (낮은 재수강 미반영)', () => {
    expect(bestGradeId([c('orig', 'C+'), c('retake', 'C0')], gm)).toBe('orig')
  })

  it('원 C+ vs 재수강 A0 → 재수강(A0)이 유효 (성적 향상)', () => {
    expect(bestGradeId([c('orig', 'C+'), c('retake', 'A0')], gm)).toBe('retake')
  })

  it('원 F vs 재수강 C0 → 재수강(C0)이 유효 (낙제 후 합격)', () => {
    expect(bestGradeId([c('orig', 'F'), c('retake', 'C0')], gm)).toBe('retake')
  })

  it('원 C+ vs 재수강 F → 원(C+) 유효 (재수강 낙제해도 원 성적 보존)', () => {
    expect(bestGradeId([c('orig', 'C+'), c('retake', 'F')], gm)).toBe('orig')
  })

  it('빈 그룹 → undefined', () => {
    expect(bestGradeId([], gm)).toBeUndefined()
  })

  it('낮은 성적을 retake로 표시하면 GPA·학점은 높은 성적(C+) 기준', () => {
    // 수동 재수강 해소 후 상태: 낮은 재수강(C0)을 retake로 표시 → C+만 반영
    const courses: Course[] = [
      { id: 'orig', name: '자료구조', credits: 3, categoryId: 'majorElec', grade: 'C+', semester: '2-1' },
      { id: 'retake', name: '자료구조', credits: 3, categoryId: 'majorElec', grade: 'C0', semester: '3-1', retake: true },
    ]
    expect(computeGpa(courses, cs2024).gpa).toBeCloseTo(2.5, 5) // C+
    expect(computeGpa(courses, cs2024).gpaCredits).toBe(3) // 1회만
    expect(major(evaluate(courses, cs2024)).earned).toBe(3) // 학점 1회
  })
})
