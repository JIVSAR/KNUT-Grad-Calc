import { describe, it, expect } from 'vitest'
import { mergeImportedTranscript, mergeImportedEnrollment } from './merge'
import type { Course } from '../types'

describe('mergeImportedTranscript', () => {
  it('같은 코드면 이수 과목은 새 성적표로 교체(성적 갱신)', () => {
    const existing: Course[] = [
      { id: 'x', name: '자료구조', code: '259068', credits: 3, categoryId: 'majorElec', grade: 'C0' },
    ]
    const imported: Course[] = [
      { id: 't0', name: '자료구조', code: '259068', credits: 3, categoryId: 'majorElec', grade: 'A0', planned: false },
    ]
    const { courses, plannedRemoved } = mergeImportedTranscript(existing, imported)
    expect(courses).toHaveLength(1)
    expect(courses[0].grade).toBe('A0') // 새 성적 반영
    expect(plannedRemoved).toBe(0)
  })

  it('성적표가 포함한 학기의 계획은 정리(이름 달라도), 미래 학기 계획은 유지', () => {
    const existing: Course[] = [
      // 3-2 계획 (이름은 성적표와 다름)
      { id: 'p1', name: '빅데이터와 경영개론', credits: 3, categoryId: 'kConvergeReq', grade: '', planned: true, semester: '3-2' },
      // 4-1 계획 (미래)
      { id: 'p2', name: '캡스톤디자인I', credits: 2, categoryId: 'majorReq', grade: '', planned: true, semester: '4-1' },
      // 학기 미입력 계획
      { id: 'p3', name: '미정과목', credits: 3, categoryId: 'free', grade: '', planned: true },
    ]
    const imported: Course[] = [
      { id: 't0', name: '운영체제', code: '252071', credits: 3, categoryId: 'majorReq', grade: 'B0', semester: '3-2', planned: false },
    ]
    const { courses, plannedRemoved } = mergeImportedTranscript(existing, imported)
    expect(plannedRemoved).toBe(1) // 3-2가 성적표에 포함 → 3-2 계획 제거(이름 무관)
    expect(courses.some((c) => c.planned && c.semester === '3-2')).toBe(false)
    expect(courses.some((c) => c.planned && c.semester === '4-1')).toBe(true)
    expect(courses.some((c) => c.planned && c.name === '미정과목')).toBe(true)
  })

  it('기존 이수 과목은 중복되지 않고 교체된다', () => {
    const existing: Course[] = [
      { id: 'old', name: '운영체제', code: '252071', credits: 3, categoryId: 'majorReq', grade: 'C+' },
    ]
    const imported: Course[] = [
      { id: 't0', name: '운영체제', code: '252071', credits: 3, categoryId: 'majorReq', grade: 'B0', planned: false },
    ]
    const { courses } = mergeImportedTranscript(existing, imported)
    expect(courses).toHaveLength(1)
    expect(courses[0].grade).toBe('B0')
  })

  it('성적표가 다루지 않는 학기의 이수완료는 유지(수동 완료한 현재 학기 보존)', () => {
    const existing: Course[] = [
      { id: 'a', name: '운영체제', code: '252071', credits: 3, categoryId: 'majorReq', grade: 'B0', semester: '2-2' },
      // 3-1은 수강내역→수강완료로 수동 이수 처리한 상태
      { id: 'b', name: '데이터베이스', code: '259072', credits: 2, categoryId: 'majorReq', grade: 'A0', semester: '3-1' },
      { id: 'c', name: '컴퓨터구조', code: '253063', credits: 3, categoryId: 'majorReq', grade: 'A0', semester: '3-1' },
    ]
    // 2-2까지만 담긴 성적표 재업로드(3-1 미포함)
    const imported: Course[] = [
      { id: 't0', name: '운영체제', code: '252071', credits: 3, categoryId: 'majorReq', grade: 'B0', semester: '2-2', planned: false },
    ]
    const { courses } = mergeImportedTranscript(existing, imported)
    expect(courses.some((c) => c.name === '데이터베이스' && c.semester === '3-1')).toBe(true)
    expect(courses.some((c) => c.name === '컴퓨터구조' && c.semester === '3-1')).toBe(true)
    expect(courses.filter((c) => c.name === '운영체제')).toHaveLength(1) // 2-2는 갱신(중복 없음)
  })
})

describe('mergeImportedEnrollment', () => {
  it('같은 학기 이수완료 과목은 수강중으로 중복 추가 안 함(지운 것만 다시 들어옴)', () => {
    const existing: Course[] = [
      { id: 'a', name: '회로패턴설계', code: '259070', credits: 2, categoryId: 'majorReq', grade: 'A0', semester: '3-1' },
      { id: 'b', name: '기계학습', code: '259113', credits: 3, categoryId: 'majorElec', grade: 'B+', semester: '3-1' },
      { id: 'p', name: '미래과목', credits: 3, categoryId: 'free', grade: '', planned: true, semester: '4-1' },
    ]
    const imported: Course[] = [
      { id: 'e0', name: '회로패턴설계', code: '259070', credits: 2, categoryId: 'majorReq', grade: '', enrolled: true, semester: '3-1' },
      { id: 'e1', name: '기계학습', code: '259113', credits: 3, categoryId: 'majorElec', grade: '', enrolled: true, semester: '3-1' },
      { id: 'e2', name: '데이터베이스', code: '259072', credits: 2, categoryId: 'majorReq', grade: '', enrolled: true, semester: '3-1' },
    ]
    const { courses, added } = mergeImportedEnrollment(existing, imported)
    expect(added).toBe(1) // 이미 완료된 2개는 건너뛰고 데이터베이스만
    expect(courses.filter((c) => c.enrolled).map((c) => c.name)).toEqual(['데이터베이스'])
    expect(courses.filter((c) => !c.planned && !c.enrolled)).toHaveLength(2) // 이수완료 유지(중복 없음)
    expect(courses.filter((c) => c.planned)).toHaveLength(1) // 4-1 계획 유지
  })

  it('같은 학기 이수완료를 전부 지운 뒤 재업로드하면 전부 다시 수강중으로 들어옴', () => {
    const existing: Course[] = [
      // 3-1 이수완료는 모두 삭제된 상태 — 다른 학기 이수만 남음
      { id: 'x', name: '운영체제', code: '252071', credits: 3, categoryId: 'majorReq', grade: 'A0', semester: '2-2' },
    ]
    const imported: Course[] = [
      { id: 'e0', name: '데이터베이스', code: '259072', credits: 2, categoryId: 'majorReq', grade: '', enrolled: true, semester: '3-1' },
      { id: 'e1', name: '컴퓨터구조', code: '253063', credits: 3, categoryId: 'majorReq', grade: '', enrolled: true, semester: '3-1' },
    ]
    const { courses, added } = mergeImportedEnrollment(existing, imported)
    expect(added).toBe(2) // 이수완료가 없으니 전부 추가
    expect(courses.filter((c) => c.enrolled)).toHaveLength(2)
  })

  it('기존 수강중은 전부 교체, 같은 학기 예정은 정리', () => {
    const existing: Course[] = [
      { id: 'old', name: '옛수강중', credits: 3, categoryId: 'majorElec', grade: '', enrolled: true, semester: '3-1' },
      { id: 'pl', name: '예정과목', credits: 3, categoryId: 'majorElec', grade: '', planned: true, semester: '3-1' },
    ]
    const imported: Course[] = [
      { id: 'e0', name: '새수강중', credits: 3, categoryId: 'majorElec', grade: '', enrolled: true, semester: '3-1' },
    ]
    const { courses, added, plannedRemoved } = mergeImportedEnrollment(existing, imported)
    expect(added).toBe(1)
    expect(plannedRemoved).toBe(1)
    expect(courses.map((c) => c.name)).toEqual(['새수강중'])
  })
})
