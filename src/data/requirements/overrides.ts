import type { RequirementSpec } from './types'

/** 사용자가 요건 설정 화면에서 덮어쓸 수 있는 숫자들. 미지정이면 기본 스펙 값 사용. */
export interface Overrides {
  totalMinCredits?: number
  gpaMin?: number
  minSemesters?: number
  /** areaId → 최소학점 */
  areaMin?: Record<string, number>
}

export function applyOverrides(spec: RequirementSpec, ov: Overrides): RequirementSpec {
  // 총 졸업학점은 최상위 totalMinCredits와 'total' 영역 minCredits 두 곳에 있다.
  // 둘은 항상 같은 값이어야 하므로(화면은 'total' 영역을 읽음) 유효값을 함께 맞춘다.
  const totalMinCredits = ov.totalMinCredits ?? spec.totalMinCredits
  return {
    ...spec,
    totalMinCredits,
    gpaMin: ov.gpaMin ?? spec.gpaMin,
    minSemesters: ov.minSemesters ?? spec.minSemesters,
    areas: spec.areas.map((a) => {
      // '총 졸업학점'(total)은 항상 totalMinCredits 단일 출처를 따른다(areaMin['total']로 갈라지지 않게).
      if (a.id === 'total') return { ...a, minCredits: totalMinCredits }
      if (ov.areaMin && ov.areaMin[a.id] != null) return { ...a, minCredits: ov.areaMin[a.id] }
      return a
    }),
  }
}
