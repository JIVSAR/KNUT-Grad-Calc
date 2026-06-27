// 앱 도메인 타입

export interface Course {
  id: string
  name: string
  /** 학수번호(교과목코드). 동일교과목/재수강 판정에 사용. */
  code?: string
  credits: number
  /** RequirementSpec.categories[].id 중 하나 */
  categoryId: string
  /** RequirementSpec.gradeScale[].grade 중 하나. 빈 문자열이면 미입력(수강중/예정) */
  grade: string
  /** 학기 코드. 예: '3-1', '3-여름'은 '3-S' (semester.ts 참고) */
  semester?: string
  /** 재수강으로 대체된 이전 과목(학점·GPA 모두 제외). 보통 옛 학기 과목에 표시되며 취소선으로 흐려진다. */
  retake?: boolean
  /** 이미 이수한 과목을 다시 듣는 '재수강(계획/수강중)'. 새 학점 미반영('재수강' 배지). 옛 과목은 그대로 유효. */
  retaking?: boolean
  /** true면 아직 안 들은 '예정(계획)' 과목. false/없음이면 이수 과목. */
  planned?: boolean
  /** true면 '수강 중'(현재 학기 진행 중, 성적 미정). 학점·GPA 미반영. */
  enrolled?: boolean
}
