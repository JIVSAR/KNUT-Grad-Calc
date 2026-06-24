import type { RequirementSpec } from './types'
import { cs2024 } from './cs2024'
import { cs2022 } from './cs2022'

// 학과-학번 요건 레지스트리. 학과/학번 추가 = 스펙 모듈 import 후 아래 배열에 한 줄 추가.
export const requirementSpecs: RequirementSpec[] = [cs2024, cs2022]

export const specsById: Record<string, RequirementSpec> = Object.fromEntries(
  requirementSpecs.map((s) => [s.id, s]),
)

export const defaultSpecId = cs2024.id
export const defaultMultiMajorId = cs2024.defaultMultiMajorId ?? 'kConverge'

export function getSpec(id: string): RequirementSpec | undefined {
  return specsById[id]
}

/** 해당 스펙의 기본 다전공 선택 id(스펙에 지정이 없으면 전역 기본값). */
export function defaultMultiMajorIdFor(specId: string): string {
  return getSpec(specId)?.defaultMultiMajorId ?? defaultMultiMajorId
}

/**
 * 기본 요건에 선택한 다전공(부전공·복수·K-융합 등)의 카테고리·영역을 합쳐 활성 스펙을 만든다.
 * 다전공에 majorTotalOverride가 있으면 '전공 계'(majorTotal) 최소학점을 그 값으로 바꾼다
 * (예: 2022 컴공 전공심화 90 ↔ 다전공 이수 시 69).
 */
export function composeSpec(
  base: RequirementSpec,
  multiMajorId: string | undefined,
): RequirementSpec {
  const mm = base.multiMajors?.find((m) => m.id === multiMajorId)
  if (!mm) return base

  // 전공 계 영역 최소학점 교체(다전공 트랙)
  let areas =
    mm.majorTotalOverride != null
      ? base.areas.map((a) =>
          a.id === 'majorTotal' ? { ...a, minCredits: mm.majorTotalOverride! } : a,
        )
      : base.areas

  // 카테고리·영역이 없는 옵션(전공심화/없음)은 override만 반영하고 종료
  if (mm.categories.length === 0 && mm.areas.length === 0) {
    return areas === base.areas ? base : { ...base, areas }
  }

  const extraCatIds = mm.categories.map((c) => c.id)
  const totalArea = areas.find((a) => a.id === 'total')
  areas = totalArea
    ? [
        ...areas.filter((a) => a.id !== 'total'),
        ...mm.areas,
        { ...totalArea, includes: [...totalArea.includes, ...extraCatIds] },
      ]
    : [...areas, ...mm.areas]

  return { ...base, categories: [...base.categories, ...mm.categories], areas }
}

export type { RequirementSpec } from './types'
