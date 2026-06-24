// 졸업요건 데이터 모델. 학과별 요건은 이 타입을 만족하는 모듈 하나로 표현하고
// index.ts에 등록만 하면 추가된다(엔진/UI 수정 불필요).

export type Confidence = 'high' | 'medium' | 'low'

/** 사용자가 과목을 입력할 때 고르는 말단 영역(이 중 하나로 분류) */
export interface CourseCategory {
  id: string
  label: string
}

/** 졸업 판정에 쓰는 학점 게이트. 포함된 CourseCategory들의 학점 합으로 계산한다. */
export interface AreaRequirement {
  id: string
  label: string
  minCredits: number
  /** 이 영역에 합산되는 CourseCategory id 목록 */
  includes: string[]
  confidence: Confidence
  source?: string
}

/** 학점 외 졸업요건(졸업자격인증제 등). exempt=true면 해당 학과 면제. */
export interface NonCreditRequirement {
  id: string
  label: string
  detail: string
  exempt?: boolean
  confidence: Confidence
  source?: string
}

/** 반드시 이수해야 하는 지정 과목(전공필수·교양필수 등) */
export interface RequiredCourse {
  code?: string
  name: string
  /** 어느 CourseCategory에 속하는 필수과목인지 */
  categoryId: string
  credits?: number
}

/** 성적 등급 → 평점 환산 */
export interface GradePoint {
  grade: string
  points: number
  /** GPA(평점평균) 계산에서 제외(P/NP 등) */
  excludedFromGpa?: boolean
  /** 불합격(학점 미취득). F, NP 등 */
  fail?: boolean
}

/** 다전공(부전공·복수·K-융합·소단위 등) 선택지. 선택 시 해당 영역/카테고리가 요건에 합쳐진다. */
export interface MultiMajorOption {
  id: string
  label: string
  categories: CourseCategory[]
  areas: AreaRequirement[]
  /**
   * 이 다전공을 선택하면 '전공 계'(majorTotal) 영역의 최소학점을 이 값으로 바꾼다.
   * 예: 2022 컴공은 전공심화 90 / 다전공 이수 시 전공 69. 미지정이면 기본 전공 계 유지(2024식).
   */
  majorTotalOverride?: number
  note?: string
}

export interface RequirementSpec {
  id: string
  program: string
  campus: string
  college: string
  admissionYear: number

  /** 다전공 의무 학과/학번이면 true */
  multiMajorRequired?: boolean
  /** 선택 가능한 다전공 목록 */
  multiMajors?: MultiMajorOption[]
  /** 이 스펙의 기본 다전공 선택 id(미지정이면 전역 기본값) */
  defaultMultiMajorId?: string

  totalMinCredits: number
  gpaMin: number
  minSemesters: number

  categories: CourseCategory[]
  areas: AreaRequirement[]
  nonCredit: NonCreditRequirement[]

  requiredCourses: RequiredCourse[]
  /** requiredCourses가 공식 전체 목록인지 여부(부분이면 false) */
  requiredCoursesComplete: boolean

  gradeScale: GradePoint[]
  sources: string[]
  notes?: string[]
}
