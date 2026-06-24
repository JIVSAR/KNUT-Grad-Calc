import type { RequirementSpec } from './types'
import { currentRequiredCourses } from './curriculum'

// 충주캠퍼스 컴퓨터공학과 2024학번 졸업요건.
// 출처: 학사운영규정 [별표3] 2024학년도 이후 입학생 컴퓨터공학과 행
//      + 통합정보시스템 졸업자가진단 화면 + 졸업자격인증제 운영지침(2024.9.26 제573호).
// 수치는 모두 공식 자료로 확정됨. requiredCourses(전공필수 과목 목록)만 부분 — 23건 전체 목록 반영 예정.

const SRC = {
  byeolpyo3: 'https://www.ut.ac.kr/cop/bbs/BBSMSTR_000000000352/selectBoardArticle.do', // 학과 졸업요건/관련규정(별표3)
  grad: 'https://www.ut.ac.kr/kor/sub05_08_01_02_01.do', // 졸업 안내
  cert: 'https://www.ut.ac.kr/kor/sub05_08_01_02_06.do', // 졸업자격인증제
  exam: 'https://www.ut.ac.kr/kor/sub05_08_01_02_04.do', // 졸업시험
  tis: 'https://tis.ut.ac.kr/main.do', // 통합정보시스템 졸업자가진단
}

export const cs2024: RequirementSpec = {
  id: 'cs-2024',
  program: '컴퓨터공학과',
  campus: '충주',
  college: '융합기술대학(2024 입학 당시) / AI융합대학(현행)',
  admissionYear: 2024,

  totalMinCredits: 140,
  gpaMin: 1.75,
  minSemesters: 8,
  multiMajorRequired: true,
  defaultMultiMajorId: 'kConverge',

  categories: [
    { id: 'majorReq', label: '전공필수' },
    { id: 'majorElec', label: '전공선택' },
    { id: 'ge', label: '교양' },
    { id: 'free', label: '산학' },
  ],

  areas: [
    {
      id: 'majorReq',
      label: '전공필수',
      minCredits: 23,
      includes: ['majorReq'],
      confidence: 'high',
      source: SRC.byeolpyo3,
    },
    {
      id: 'majorTotal',
      label: '전공 합계',
      minCredits: 74,
      includes: ['majorReq', 'majorElec'],
      confidence: 'high',
      source: SRC.byeolpyo3,
    },
    {
      id: 'geTotal',
      label: '교양',
      minCredits: 28,
      includes: ['ge'],
      confidence: 'high',
      source: SRC.byeolpyo3,
    },
    {
      id: 'total',
      label: '총 졸업학점',
      minCredits: 140,
      includes: ['majorReq', 'majorElec', 'ge', 'free'],
      confidence: 'high',
      source: SRC.byeolpyo3,
    },
  ],

  // 다전공: 종류를 선택하면 해당 카테고리/영역이 요건에 합쳐진다(composeSpec).
  multiMajors: [
    {
      id: 'kConverge',
      label: 'K-융합전공',
      categories: [
        { id: 'kConvergeReq', label: 'K-융합필수' },
        { id: 'kConvergeElec', label: 'K-융합선택' },
      ],
      areas: [
        { id: 'kConvergeReq', label: 'K-융합필수', minCredits: 9, includes: ['kConvergeReq'], confidence: 'high', source: SRC.grad },
        { id: 'kConvergeElec', label: 'K-융합선택', minCredits: 12, includes: ['kConvergeElec'], confidence: 'high', source: SRC.grad },
      ],
      note: '필수 9 + 선택 12 = 21학점',
    },
    {
      id: 'minor',
      label: '부전공',
      categories: [{ id: 'minor', label: '부전공' }],
      areas: [{ id: 'minor', label: '부전공', minCredits: 21, includes: ['minor'], confidence: 'high', source: SRC.grad }],
      note: '부전공 학과 전공과목 21학점 이상 (2016이전 신청 24)',
    },
    {
      id: 'double',
      label: '복수·연계전공',
      categories: [{ id: 'double', label: '복수·연계전공' }],
      areas: [{ id: 'double', label: '복수·연계전공', minCredits: 36, includes: ['double'], confidence: 'high', source: SRC.grad }],
      note: '복수(연계)전공 36학점 이상 (2023이전 신청 40)',
    },
    {
      id: 'micro',
      label: '소단위(마이크로)전공',
      categories: [{ id: 'micro', label: '소단위전공' }],
      areas: [{ id: 'micro', label: '소단위전공', minCredits: 9, includes: ['micro'], confidence: 'high', source: SRC.grad }],
      note: '마이크로전공 9학점 이상',
    },
    {
      id: 'convergence',
      label: '융합전공',
      categories: [{ id: 'conv', label: '융합전공' }],
      areas: [{ id: 'conv', label: '융합전공', minCredits: 21, includes: ['conv'], confidence: 'high', source: SRC.grad }],
      note: '융합전공 21학점 이상 (2023이전 신청 24)',
    },
    {
      id: 'none',
      label: '안 함 / 미정',
      categories: [],
      areas: [],
      note: '2024학번 컴퓨터공학과는 다전공이 졸업 필수요건입니다.',
    },
  ],

  nonCredit: [
    {
      id: 'engCert',
      label: '글로컬 인증(영어)',
      detail:
        '공과계열 기준 택1: TOEIC 550 / TOEFL iBT 63 / TEPS 211 / TOEIC-S 100 / OPIc IM1 / 신HSK 3급 / JLPT N3 / JPT 500. 대체: 교환학생 1학기↑·해외어학연수 3주↑·외국어과정 40시간↑',
      confidence: 'high',
      source: SRC.cert,
    },
    {
      id: 'volunteer',
      label: '전인적 인증(비교과)',
      detail: '비교과 프로그램 40시간 이수(신입생 기준)',
      confidence: 'high',
      source: SRC.cert,
    },
    {
      id: 'creativeCert',
      label: '창의 인증',
      detail: '컴퓨터공학과는 해당없음(면제) — 운영지침 별표2',
      exempt: true,
      confidence: 'high',
      source: SRC.cert,
    },
    {
      id: 'gradExam',
      label: '졸업평가(전공종합시험)',
      detail: '전공종합시험 통과(응시자격: 4학년 + 105학점 이상, 과목 40점·평균 60점 이상)',
      confidence: 'high',
      source: SRC.exam,
    },
  ],

  // 전공필수(전필) = 최신 교육과정 편성표 기준 공유 목록(curriculum.ts). 전 학번 공통.
  requiredCourses: currentRequiredCourses,
  requiredCoursesComplete: true,

  gradeScale: [
    { grade: 'A+', points: 4.5 },
    { grade: 'A0', points: 4.0 },
    { grade: 'B+', points: 3.5 },
    { grade: 'B0', points: 3.0 },
    { grade: 'C+', points: 2.5 },
    { grade: 'C0', points: 2.0 },
    { grade: 'D+', points: 1.5 },
    { grade: 'D0', points: 1.0 },
    { grade: 'F', points: 0.0, fail: true },
    { grade: 'P', points: 0.0, excludedFromGpa: true },
    { grade: 'NP', points: 0.0, excludedFromGpa: true, fail: true },
  ],

  sources: [SRC.byeolpyo3, SRC.grad, SRC.cert, SRC.exam, SRC.tis],

  notes: [
    '전공필수 9과목은 졸업자가진단(필수과목 이수현황+미이수내역) 기준 전체 목록. 과목 추가 시 같은 이름으로 입력하면 자동으로 체크됩니다.',
    '교양 28학점은 대학필수(U)·영역필수(F/G 중 택1)·지정필수(D)의 영역별 선택 구조라, 앱은 교양 28학점으로 판정(개별 과목 체크는 전공필수만).',
    '다전공(부전공·복수·K-융합·소단위·융합)은 종류를 선택하면 그 요건이 적용됩니다. 2024학번 컴퓨터공학과는 다전공 필수.',
    'GPA 환산표는 KNUT 4.5 만점 표준값 — 본인 성적표로 확인 권장.',
  ],
}
