import { describe, it, expect } from 'vitest'
import { serializeBackup, parseBackup, type BackupData } from './backup'
import { applyOverrides } from '../data/requirements/overrides'
import { cs2024 } from '../data/requirements/cs2024'

describe('백업 직렬화/복원', () => {
  const data: BackupData = {
    version: 1,
    specId: 'cs-2024',
    multiMajorId: 'kConverge',
    courses: [
      { id: 'a', name: '자료구조', credits: 3, categoryId: 'majorReq', grade: 'A+', semester: '2024-1' },
      { id: 'b', name: '교양과목', credits: 2, categoryId: 'ge', grade: 'P' },
    ],
    completedNonCredit: ['engCert'],
    overrides: { gpaMin: 2.0, areaMin: { total: 130 } },
  }

  it('직렬화 후 복원하면 동일', () => {
    const round = parseBackup(serializeBackup(data))
    expect(round).toEqual(data)
  })

  it('수강중(enrolled)·재수강(retake)·예정(planned) 상태 플래그가 라운드트립에서 보존된다', () => {
    const withFlags: BackupData = {
      ...data,
      courses: [
        { id: 'e', name: '알고리즘', credits: 3, categoryId: 'majorElec', grade: '', semester: '2025-1', enrolled: true },
        { id: 'r', name: '운영체제', credits: 3, categoryId: 'majorReq', grade: '', code: '252071', retake: true },
        { id: 'p', name: '캡스톤디자인I', credits: 2, categoryId: 'majorReq', grade: '', planned: true, semester: '2025-2' },
        { id: 'rt', name: '자료구조', credits: 3, categoryId: 'majorElec', grade: '', planned: true, retaking: true, semester: '2025-2' },
      ],
    }
    const round = parseBackup(serializeBackup(withFlags))
    expect(round).toEqual(withFlags)
    expect(round.courses[0].enrolled).toBe(true)
    expect(round.courses[1].retake).toBe(true)
    expect(round.courses[2].planned).toBe(true)
    expect(round.courses[3].retaking).toBe(true)
  })

  it('과목 배열이 없으면 에러', () => {
    expect(() => parseBackup('{"specId":"cs-2024"}')).toThrow()
  })

  it('잘못된 JSON이면 에러', () => {
    expect(() => parseBackup('not json')).toThrow()
  })

  it('누락 필드는 기본값으로 보정', () => {
    const r = parseBackup('{"courses":[{"name":"X","credits":3,"categoryId":"free"}]}')
    expect(r.courses[0].grade).toBe('')
    expect(r.courses[0].retake).toBeUndefined()
    expect(r.completedNonCredit).toEqual([])
  })
})

describe('applyOverrides', () => {
  it('미지정이면 기본값 유지', () => {
    const s = applyOverrides(cs2024, {})
    expect(s.totalMinCredits).toBe(140)
    expect(s.areas.find((a) => a.id === 'majorTotal')!.minCredits).toBe(74)
  })

  it('총학점·GPA·영역 최소를 덮어쓴다', () => {
    const s = applyOverrides(cs2024, { totalMinCredits: 130, gpaMin: 2.0, areaMin: { majorTotal: 80 } })
    expect(s.totalMinCredits).toBe(130)
    expect(s.gpaMin).toBe(2.0)
    expect(s.areas.find((a) => a.id === 'majorTotal')!.minCredits).toBe(80)
    expect(s.areas.find((a) => a.id === 'geTotal')!.minCredits).toBe(28) // 미지정은 그대로
  })
})
