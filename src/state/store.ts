import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Course } from '../types'
import type { RequirementSpec } from '../data/requirements/types'
import {
  composeSpec,
  defaultMultiMajorId,
  defaultMultiMajorIdFor,
  defaultSpecId,
  getSpec,
} from '../data/requirements'
import { applyOverrides, type Overrides } from '../data/requirements/overrides'
import { serializeBackup, parseBackup } from './backup'
import { mergeImportedTranscript, mergeImportedEnrollment } from '../import/merge'
import { buildGradeMap } from '../engine/gpa'
import { bestGradeId } from '../engine/dedup'

const newId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.round(Math.random() * 1e9)}`

interface AppState {
  specId: string
  courses: Course[]
  completedNonCredit: string[]
  overrides: Overrides
  multiMajorId: string
  /** 접힌 학기 그룹 키 목록(예: '이수 과목::2-2'). 새로고침해도 유지. */
  collapsedGroups: string[]
  /** 온보딩(첫 시작 학과/학번·다전공 선택) 완료 여부 */
  onboarded: boolean

  activeSpec: () => RequirementSpec
  setSpec: (id: string) => void
  setMultiMajor: (id: string) => void
  setOnboarded: (v: boolean) => void
  toggleGroup: (key: string) => void
  addCourse: (c: Omit<Course, 'id'>) => void
  /** 기존 과목들(retakeIds)을 재수강 대체로 표시하고 새 과목을 추가 */
  addCourseRetaking: (c: Omit<Course, 'id'>, retakeIds: string[]) => void
  updateCourse: (id: string, patch: Partial<Course>) => void
  removeCourse: (id: string) => void
  toggleNonCredit: (id: string) => void
  setOverrides: (patch: Overrides) => void
  setAreaMin: (areaId: string, min: number | undefined) => void
  resetOverrides: () => void
  exportData: () => string
  importData: (json: string) => void
  importTranscript: (courses: Course[]) => { added: number; plannedRemoved: number }
  importEnrollment: (courses: Course[]) => { added: number; plannedRemoved: number }
  /** 예정 → 수강중: 해당 학기 예정 과목을 통째로 수강중으로 전환 */
  startSemester: (semester: string) => void
  /** 수강중/예정 → 이수: 과목별 성적 입력하며 이수로 전환 */
  completeCourses: (updates: { id: string; grade: string }[]) => void
  resetAll: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      specId: defaultSpecId,
      courses: [],
      completedNonCredit: [],
      overrides: {},
      multiMajorId: defaultMultiMajorId,
      collapsedGroups: [],
      onboarded: false,

      activeSpec: () => {
        const base = getSpec(get().specId) ?? getSpec(defaultSpecId)!
        return applyOverrides(composeSpec(base, get().multiMajorId), get().overrides)
      },

      setSpec: (id) =>
        set({ specId: id, multiMajorId: defaultMultiMajorIdFor(id), overrides: {} }),

      setMultiMajor: (id) =>
        set((s) => {
          // 전공 합계(majorTotal)는 다전공 트랙이 결정(majorTotalOverride)하므로, 트랙을 바꾸면
          // 그에 대한 사용자 override는 정리한다(stale 값이 트랙 변경을 가리는 것 방지).
          if (s.overrides.areaMin?.majorTotal == null) return { multiMajorId: id }
          const areaMin = { ...s.overrides.areaMin }
          delete areaMin.majorTotal
          return { multiMajorId: id, overrides: { ...s.overrides, areaMin } }
        }),

      setOnboarded: (v) => set({ onboarded: v }),

      toggleGroup: (key) =>
        set((s) => ({
          collapsedGroups: s.collapsedGroups.includes(key)
            ? s.collapsedGroups.filter((k) => k !== key)
            : [...s.collapsedGroups, key],
        })),

      addCourse: (c) => set((s) => ({ courses: [...s.courses, { ...c, id: newId() }] })),

      addCourseRetaking: (c, retakeIds) =>
        set((s) => {
          // 재수강: 원 과목과 새 과목 중 '더 높은 성적'만 유효, 나머지는 대체(retake)로 표시.
          const gradeMap = buildGradeMap(get().activeSpec())
          const added = { ...c, id: newId() }
          const group = [added, ...s.courses.filter((x) => retakeIds.includes(x.id))]
          const topId = bestGradeId(group, gradeMap)
          const superseded = new Set(group.filter((x) => x.id !== topId).map((x) => x.id))
          return {
            courses: [
              ...s.courses.map((x) => (superseded.has(x.id) ? { ...x, retake: true } : x)),
              superseded.has(added.id) ? { ...added, retake: true } : added,
            ],
          }
        }),

      updateCourse: (id, patch) =>
        set((s) => ({
          courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      removeCourse: (id) =>
        set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),

      toggleNonCredit: (id) =>
        set((s) => ({
          completedNonCredit: s.completedNonCredit.includes(id)
            ? s.completedNonCredit.filter((x) => x !== id)
            : [...s.completedNonCredit, id],
        })),

      setOverrides: (patch) => set((s) => ({ overrides: { ...s.overrides, ...patch } })),

      setAreaMin: (areaId, min) =>
        set((s) => {
          const areaMin = { ...(s.overrides.areaMin ?? {}) }
          if (min == null) delete areaMin[areaId]
          else areaMin[areaId] = min
          return { overrides: { ...s.overrides, areaMin } }
        }),

      resetOverrides: () => set({ overrides: {} }),

      exportData: () =>
        serializeBackup({
          version: 1,
          specId: get().specId,
          multiMajorId: get().multiMajorId,
          courses: get().courses,
          completedNonCredit: get().completedNonCredit,
          overrides: get().overrides,
        }),

      importData: (json) => {
        const data = parseBackup(json)
        set({
          specId: data.specId,
          multiMajorId: data.multiMajorId,
          courses: data.courses,
          completedNonCredit: data.completedNonCredit,
          overrides: data.overrides,
        })
      },

      importTranscript: (imported) => {
        // 가져온 과목엔 새 고유 ID 부여(파서 ID 충돌 방지 → 삭제/키 버그 예방)
        const reIded = imported.map((c) => ({ ...c, id: newId() }))
        const { courses, plannedRemoved } = mergeImportedTranscript(get().courses, reIded)
        set({ courses })
        return { added: reIded.length, plannedRemoved }
      },

      importEnrollment: (imported) => {
        const reIded = imported.map((c) => ({ ...c, id: newId() }))
        const { courses, added, plannedRemoved } = mergeImportedEnrollment(get().courses, reIded)
        set({ courses })
        return { added, plannedRemoved }
      },

      startSemester: (semester) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.planned && (c.semester || '미정') === semester
              ? { ...c, planned: false, enrolled: true }
              : c,
          ),
        })),

      completeCourses: (updates) =>
        set((s) => {
          const g = new Map(updates.map((u) => [u.id, u.grade]))
          const norm = (str: string) => str.replace(/\s+/g, '').toLowerCase()
          // 1) 완료 처리: 예정/수강중 해제 + 성적 입력 + retaking 해제(이제 정식 이수 과목)
          let courses = s.courses.map((c) =>
            g.has(c.id)
              ? { ...c, planned: false, enrolled: false, retaking: false, grade: g.get(c.id) ?? '' }
              : c,
          )
          // 2) 이번에 완료된 '재수강' 과목의 이름 그룹은 '최고 성적만 유효, 나머지는 대체(retake)'로 재계산.
          //    재수강 규칙: 원 성적과 재수강 성적 중 더 높은 쪽이 GPA·학점에 반영된다.
          const retakingNames = new Set(
            s.courses.filter((c) => g.has(c.id) && c.retaking).map((c) => norm(c.name)),
          )
          if (retakingNames.size > 0) {
            const gradeMap = buildGradeMap(get().activeSpec())
            const completed = courses.filter((c) => !c.planned && !c.enrolled)
            const superseded = new Set<string>()
            const best = new Set<string>()
            for (const name of retakingNames) {
              const group = completed.filter((c) => norm(c.name) === name)
              if (group.length < 2) continue
              const topId = bestGradeId(group, gradeMap)
              for (const c of group) (c.id === topId ? best : superseded).add(c.id)
            }
            courses = courses.map((c) =>
              superseded.has(c.id)
                ? { ...c, retake: true }
                : best.has(c.id)
                  ? { ...c, retake: false }
                  : c,
            )
          }
          return { courses }
        }),

      resetAll: () =>
        set({
          specId: defaultSpecId,
          multiMajorId: defaultMultiMajorId,
          courses: [],
          completedNonCredit: [],
          overrides: {},
          collapsedGroups: [],
          onboarded: false,
        }),
    }),
    {
      name: 'knut-grad-calc',
      partialize: (s) => ({
        specId: s.specId,
        multiMajorId: s.multiMajorId,
        courses: s.courses,
        completedNonCredit: s.completedNonCredit,
        overrides: s.overrides,
        collapsedGroups: s.collapsedGroups,
        onboarded: s.onboarded,
      }),
    },
  ),
)
