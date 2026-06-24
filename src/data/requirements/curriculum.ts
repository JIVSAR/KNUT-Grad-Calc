import type { RequiredCourse } from './types'

// 컴퓨터공학(전공) 현재 교육과정의 전공필수(전필) 과목 목록.
// 출처: 2025학년도 교육과정 편성표(컴퓨터공학전공, 적용학년 1).
//
// ※ 중요: 전필/전선 과목은 '입학년도'가 아니라 '재학 중 최신 교육과정 편성표'를 따른다.
//    (예: 휴학 후 복학하면 복학 시점의 편성표가 적용되고, 전필은 매년 바뀔 수 있음.)
//    따라서 이 목록은 입학년도별 스펙(cs2022/cs2024…)이 모두 공유한다.
//    편성표가 개정되면 이 파일 하나만 갱신하면 전 학번에 반영된다.
//    (졸업요건의 '학점 수치·다전공 의무' 등은 입학년도별로 다르므로 각 스펙에서 관리.)
export const currentCurriculumYear = 2025

export const currentRequiredCourses: RequiredCourse[] = [
  { code: '259082', name: '정보통신개론', categoryId: 'majorReq', credits: 3 },
  { code: '252071', name: '운영체제', categoryId: 'majorReq', credits: 3 },
  { code: '252069', name: '전자회로', categoryId: 'majorReq', credits: 3 },
  { code: '253063', name: '컴퓨터구조', categoryId: 'majorReq', credits: 3 },
  { code: '259070', name: '회로패턴설계', categoryId: 'majorReq', credits: 2 },
  { code: '259072', name: '데이터베이스', categoryId: 'majorReq', credits: 2 },
  { code: '253100', name: '리눅스프로그래밍', categoryId: 'majorReq', credits: 2 },
  { code: '253011', name: '마이크로프로세서', categoryId: 'majorReq', credits: 3 },
  { code: '259094', name: '캡스톤디자인I', categoryId: 'majorReq', credits: 2 },
]
