import { useMemo } from 'react'
import { useStore } from './store'
import { composeSpec, defaultSpecId, getSpec } from '../data/requirements'
import { applyOverrides } from '../data/requirements/overrides'
import { evaluate, project } from '../engine/calc'
import { getSuperseded } from '../engine/dedup'
import { buildGradeMap } from '../engine/gpa'

export function useActiveSpec() {
  const specId = useStore((s) => s.specId)
  const overrides = useStore((s) => s.overrides)
  const multiMajorId = useStore((s) => s.multiMajorId)
  return useMemo(
    () =>
      applyOverrides(
        composeSpec(getSpec(specId) ?? getSpec(defaultSpecId)!, multiMajorId),
        overrides,
      ),
    [specId, overrides, multiMajorId],
  )
}

export function useEvaluation() {
  const courses = useStore((s) => s.courses)
  const completed = useStore((s) => s.completedNonCredit)
  const spec = useActiveSpec()
  return useMemo(
    () => evaluate(courses, spec, new Set(completed)),
    [courses, spec, completed],
  )
}

export function useProjection() {
  const courses = useStore((s) => s.courses)
  const spec = useActiveSpec()
  return useMemo(() => project(courses, spec), [courses, spec])
}

/** 재수강/동일교과목으로 대체된(취득 미반영) 과목 id 집합 */
export function useSuperseded() {
  const courses = useStore((s) => s.courses)
  const spec = useActiveSpec()
  return useMemo(() => getSuperseded(courses, buildGradeMap(spec)), [courses, spec])
}
