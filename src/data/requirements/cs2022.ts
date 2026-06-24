import type { RequirementSpec } from './types'
import { currentRequiredCourses } from './curriculum'

// 충주캠퍼스 컴퓨터공학(전공) 2022학번 졸업요건.
// 출처: 학사운영규정 [별표3] (2022학년도 이후 입학생) '컴퓨터공학전공' 행
//      + 학칙 제74조(졸업학점/평점) + 졸업자격인증제 운영지침(2019학년도 신입생부터 적용).
// 2024와 핵심 차이: ① 다전공 비의무(전공심화 90 / 다전공시 전공 69) ② 학과명 '컴퓨터공학전공'.
// 전공필수 23학점의 '과목 목록'은 공식 자료에 없어 미정(requiredCoursesComplete=false). 추후 학과 교육과정으로 확정.

const SRC = {
  byeolpyo3: 'https://www.ut.ac.kr/cop/bbs/BBSMSTR_000000000352/selectBoardArticle.do', // 학사운영규정 [별표3]
  grad: 'https://www.ut.ac.kr/kor/sub05_08_01_02_01.do', // 졸업 안내
  cert: 'https://www.ut.ac.kr/kor/sub05_08_01_02_06.do', // 졸업자격인증제
  exam: 'https://www.ut.ac.kr/kor/sub05_08_01_02_04.do', // 졸업시험
}

export const cs2022: RequirementSpec = {
  id: 'cs-2022',
  program: '컴퓨터공학전공',
  campus: '충주',
  college: '융합기술대학(2022 입학 당시) / AI융합대학(현행)',
  admissionYear: 2022,

  totalMinCredits: 140,
  gpaMin: 1.75,
  minSemesters: 8,
  multiMajorRequired: false, // 2022 컴공은 다전공 선택(전공심화 가능)
  defaultMultiMajorId: 'none', // 기본은 전공심화

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
      // 기본(전공심화) = 90. 다전공 선택 시 composeSpec이 69로 교체.
      id: 'majorTotal',
      label: '전공 합계',
      minCredits: 90,
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

  // 다전공: 선택 시 전공 계가 69로 줄고(majorTotalOverride) 해당 다전공 영역이 합쳐진다.
  multiMajors: [
    {
      id: 'none',
      label: '전공심화 (다전공 안 함)',
      categories: [],
      areas: [],
      note: '다전공 없이 전공 90학점 이수(2022학번은 다전공 비의무).',
    },
    {
      id: 'kConverge',
      label: 'K-융합전공',
      categories: [
        { id: 'kConvergeReq', label: 'K-융합필수' },
        { id: 'kConvergeElec', label: 'K-융합선택' },
      ],
      areas: [
        { id: 'kConvergeReq', label: 'K-융합필수', minCredits: 9, includes: ['kConvergeReq'], confidence: 'medium', source: SRC.grad },
        { id: 'kConvergeElec', label: 'K-융합선택', minCredits: 12, includes: ['kConvergeElec'], confidence: 'medium', source: SRC.grad },
      ],
      majorTotalOverride: 69,
      note: '필수 9 + 선택 12 = 21학점. ※별표3 각주상 K-융합은 2023학번 도입 정황 — 2022 신청 가능 여부는 사용자 확인 기준 포함.',
    },
    {
      id: 'minor',
      label: '부전공',
      categories: [{ id: 'minor', label: '부전공' }],
      areas: [{ id: 'minor', label: '부전공', minCredits: 21, includes: ['minor'], confidence: 'high', source: SRC.grad }],
      majorTotalOverride: 69,
      note: '부전공 학과 전공과목 21학점 이상 (2016이전 신청 24).',
    },
    {
      id: 'double',
      label: '복수·연계전공',
      categories: [{ id: 'double', label: '복수·연계전공' }],
      areas: [{ id: 'double', label: '복수·연계전공', minCredits: 36, includes: ['double'], confidence: 'high', source: SRC.grad }],
      majorTotalOverride: 69,
      note: '복수(연계)전공 36학점 이상 (2023이전 신청 40).',
    },
    {
      id: 'micro',
      label: '소단위(마이크로)전공',
      categories: [{ id: 'micro', label: '소단위전공' }],
      areas: [{ id: 'micro', label: '소단위전공', minCredits: 9, includes: ['micro'], confidence: 'high', source: SRC.grad }],
      majorTotalOverride: 69,
      note: '마이크로전공 9학점 이상.',
    },
    {
      id: 'convergence',
      label: '융합전공',
      categories: [{ id: 'conv', label: '융합전공' }],
      areas: [{ id: 'conv', label: '융합전공', minCredits: 21, includes: ['conv'], confidence: 'high', source: SRC.grad }],
      majorTotalOverride: 69,
      note: '융합전공 21학점 이상 (2023이전 신청 24).',
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
      confidence: 'medium',
      source: SRC.exam,
    },
  ],

  // 전공필수(전필) = 최신 교육과정 편성표 기준 공유 목록(curriculum.ts). 전필은 입학년도가 아닌
  // 재학 중 최신 편성표를 따르므로 2024와 동일 목록을 공유한다.
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

  sources: [SRC.byeolpyo3, SRC.grad, SRC.cert, SRC.exam],

  notes: [
    '별표3 (2022학년도 이후 입학생) 컴퓨터공학전공: 졸업 140 · 교양 28(대학필수6·핵심역량9~15·지정필수9) · 전공필수 23 · 다전공시 전공 69 · 전공심화시 전공 90.',
    '다전공은 의무가 아님 — 전공심화(전공 90) 또는 다전공(전공 69 + 다전공 학점) 선택. 요건 탭에서 트랙 선택.',
    'K-융합전공은 별표3 각주상 2023학번 도입 정황이 있으나 사용자 확인에 따라 옵션에 포함함 — 실제 신청 가능 여부는 학과 확인 권장.',
    '전공필수(전필) 과목은 입학년도가 아니라 재학 중 최신 교육과정 편성표(2025)를 따른다 — 전 학번 공유(curriculum.ts). 전필 9과목 합 23학점.',
    'GPA 1.75·8학기는 학칙 기준. 비학점 인증은 졸업자격인증제(2019 신입생부터 적용)로 2024와 동일.',
  ],
}
