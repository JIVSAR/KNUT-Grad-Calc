import type { Course } from '../types'

const norm = (s: string): string => s.replace(/\s+/g, '').toLowerCase()

/**
 * 성적표 재업로드 병합:
 * - 성적표가 '포함한 학기'의 이수 과목만 새 성적표로 교체(갱신).
 * - 성적표가 '다루지 않는 학기'의 이수완료는 유지한다(예: 수동으로 수강완료한 현재 학기).
 * - 예정·수강중 중 성적이 나온(=성적표 포함) 학기 것은 정리(이제 이수로 들어옴). 미래/다른 학기는 유지.
 */
export function mergeImportedTranscript(
  existing: Course[],
  imported: Course[],
): { courses: Course[]; plannedRemoved: number } {
  // 성적표가 포함한 학기들(= 이미 성적이 나온 학기)
  const coveredSems = new Set(imported.map((c) => c.semester).filter((x): x is string => !!x))
  const importedCodes = new Set(imported.map((c) => c.code).filter((x): x is string => !!x))
  const importedNames = new Set(imported.map((c) => norm(c.name)))

  let plannedRemoved = 0
  const kept = existing.filter((c) => {
    if (!c.planned && !c.enrolled) {
      // 이수완료: 학기가 있으면 그 학기가 성적표에 포함될 때만 교체(제거), 아니면 유지.
      //          학기가 없으면 성적표가 같은 과목(코드/이름)을 담을 때만 교체.
      if (c.semester) return !coveredSems.has(c.semester)
      return !((c.code && importedCodes.has(c.code)) || importedNames.has(norm(c.name)))
    }
    // 예정·수강중: 성적 나온 학기 것은 정리, 미래/다른 학기는 유지.
    const covered = !!c.semester && coveredSems.has(c.semester)
    if (covered) plannedRemoved++
    return !covered
  })

  return { courses: [...kept, ...imported], plannedRemoved }
}

/**
 * 수강내역(현재 수강중) 재업로드 병합:
 * - 기존 '수강중' 과목은 새 수강내역으로 전부 교체.
 * - 같은 학기의 '예정' 과목은 정리(이제 수강중으로 들어옴).
 * - 같은 학기에 **이미 이수 완료**된 과목(코드/이름 일치)은 수강중으로 다시 넣지 않음(중복 방지).
 *   → 이수완료에서 일부를 지운 뒤 재업로드하면, 지운 과목만 수강중으로 다시 들어온다.
 * - 이수 완료·다른 학기 예정은 유지.
 */
export function mergeImportedEnrollment(
  existing: Course[],
  imported: Course[],
): { courses: Course[]; added: number; plannedRemoved: number } {
  const coveredSems = new Set(imported.map((c) => c.semester).filter((x): x is string => !!x))
  const key = (c: Course) => `${c.semester ?? ''}::${c.code || norm(c.name)}`

  // 같은 학기에 이미 이수 완료된 과목 키 집합
  const completedKeys = new Set(
    existing
      .filter((c) => !c.planned && !c.enrolled && c.semester && coveredSems.has(c.semester))
      .map(key),
  )
  const toAdd = imported.filter((c) => !completedKeys.has(key(c)))

  let plannedRemoved = 0
  const kept = existing.filter((c) => {
    if (c.enrolled) return false // 기존 수강중 전부 교체
    if (c.planned && c.semester && coveredSems.has(c.semester)) {
      plannedRemoved++
      return false
    }
    return true // 이수 완료 + 다른 학기 예정 유지
  })
  return { courses: [...kept, ...toAdd], added: toAdd.length, plannedRemoved }
}
