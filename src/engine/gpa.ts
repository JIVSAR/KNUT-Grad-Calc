import type { Course } from '../types'
import type { GradePoint, RequirementSpec } from '../data/requirements/types'
import { getSuperseded } from './dedup'

export function buildGradeMap(spec: RequirementSpec): Map<string, GradePoint> {
  return new Map(spec.gradeScale.map((g) => [g.grade, g]))
}

export interface GpaResult {
  gpa: number
  gpaCredits: number
}

/** 평점평균(GPA). 재수강 대체 과목·GPA 제외 등급(P/NP)은 빼고, F(0.0)는 포함. */
export function computeGpa(
  courses: Course[],
  spec: RequirementSpec,
  gradeMap: Map<string, GradePoint> = buildGradeMap(spec),
): GpaResult {
  const superseded = getSuperseded(courses, gradeMap)
  let totalPoints = 0
  let credits = 0
  for (const c of courses) {
    if (c.retake || c.planned || superseded.has(c.id)) continue
    const g = gradeMap.get(c.grade)
    if (!g || g.excludedFromGpa) continue
    totalPoints += g.points * c.credits
    credits += c.credits
  }
  return { gpa: credits > 0 ? totalPoints / credits : 0, gpaCredits: credits }
}
