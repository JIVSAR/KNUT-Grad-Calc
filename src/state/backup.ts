import type { Course } from '../types'
import type { Overrides } from '../data/requirements/overrides'

export interface BackupData {
  version: 1
  specId: string
  multiMajorId: string
  courses: Course[]
  completedNonCredit: string[]
  overrides: Overrides
}

export function serializeBackup(d: BackupData): string {
  return JSON.stringify(d, null, 2)
}

/** JSON 문자열을 검증·정규화하여 BackupData로. 형식 오류 시 throw. */
export function parseBackup(json: string): BackupData {
  const raw: unknown = JSON.parse(json)
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('백업 형식이 올바르지 않습니다.')
  }
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.courses)) {
    throw new Error('과목(courses) 데이터를 찾을 수 없습니다.')
  }
  const courses: Course[] = r.courses.map((x, i) => {
    const c = (x ?? {}) as Record<string, unknown>
    const course: Course = {
      id: c.id != null ? String(c.id) : `imp-${i}`,
      name: String(c.name ?? ''),
      credits: Number(c.credits ?? 0),
      categoryId: String(c.categoryId ?? 'free'),
      grade: String(c.grade ?? ''),
    }
    if (c.code) course.code = String(c.code)
    if (Array.isArray(c.alsoCounts)) course.alsoCounts = c.alsoCounts.map(String)
    if (c.semester) course.semester = String(c.semester)
    if (c.retake) course.retake = true
    if (c.retaking) course.retaking = true
    if (c.planned) course.planned = true
    if (c.enrolled) course.enrolled = true // 상태 플래그 추가 시 여기도 갱신할 것
    return course
  })
  return {
    version: 1,
    specId: r.specId != null ? String(r.specId) : 'cs-2024',
    multiMajorId: r.multiMajorId != null ? String(r.multiMajorId) : 'kConverge',
    courses,
    completedNonCredit: Array.isArray(r.completedNonCredit)
      ? r.completedNonCredit.map(String)
      : [],
    overrides:
      r.overrides && typeof r.overrides === 'object'
        ? (r.overrides as Overrides)
        : {},
  }
}
