import { describe, it, expect } from 'vitest'
import { parseTranscriptRows, parseEnrollmentRows } from './transcript'

describe('parseTranscriptRows', () => {
  it('학기 헤더·이수구분·학점·등급 파싱 + 학년-학기 변환', () => {
    const rows: unknown[][] = [
      ['이수', '구분'],
      ['2025년도 2학기 학기종류 : 정규학기'],
      ['전필', '252071', '운영체제', 3, 3, 0, 'C+', '일반강좌', 0],
      ['전선', '254048', '알고리즘', 3, 3, 0, 'B+', '일반강좌', 0],
      ['교양', '018148', '밤하늘별자리여행', 1, 1, 0, 'P', '일반강좌', 0],
      ['산학', '009387', '의사소통향상과정', 2, 2, 0, 'P', '일반강좌', 0],
      ['신청학점 : 19 취득학점 : 19 평점 : 3.47'],
      ['2024년도 1학기 학기종류 : 정규학기'],
      ['전선', '252066', '기초컴퓨터프로그래밍', 3, 3, 0, 'B+', '일반강좌', 0],
    ]
    const { courses } = parseTranscriptRows(rows, 2024)
    expect(courses).toHaveLength(5)

    const os = courses.find((c) => c.name === '운영체제')!
    expect(os.categoryId).toBe('majorReq')
    expect(os.semester).toBe('2-2') // 2025 - 2024 + 1 = 2학년
    expect(os.credits).toBe(3)
    expect(os.grade).toBe('C+')
    expect(os.planned).toBe(false)

    expect(courses.find((c) => c.name === '알고리즘')!.categoryId).toBe('majorElec')
    expect(courses.find((c) => c.name === '밤하늘별자리여행')!.categoryId).toBe('ge')
    expect(courses.find((c) => c.name === '의사소통향상과정')!.categoryId).toBe('free')
    expect(courses.find((c) => c.name === '기초컴퓨터프로그래밍')!.semester).toBe('1-1')
  })

  it('이수구분 매핑: K융필→K-융합필수, 융필→융합전공, 자선→일반, 여름학기', () => {
    const rows: unknown[][] = [
      ['2026년도 여름학기 학기종류 : 계절학기'],
      ['K융필', 'x', '빅데이터와경영개론', 3, 3, 0, 'A0'],
      ['융필', 'y', '융합과목', 3, 3, 0, 'B+'],
      ['자선', 'z', '자유선택과목', 2, 2, 0, 'P'],
    ]
    const { courses } = parseTranscriptRows(rows, 2024)
    expect(courses[0].categoryId).toBe('kConvergeReq') // K융필 = K-융합필수
    expect(courses[0].semester).toBe('3-S') // 2026 - 2024 + 1 = 3학년, 여름
    expect(courses[1].categoryId).toBe('conv') // 융필 = 융합전공(별개)
    expect(courses[2].categoryId).toBe('free') // 자선 = 자유선택
  })

  it('모르는 이수구분도 과목 형태면 원본 표기로 보존하고 경고한다', () => {
    const rows: unknown[][] = [
      ['2025년도 1학기 학기종류 : 정규학기'],
      ['부전공', 'M001', '경영학원론', 3, 3, 0, 'A0', '일반강좌', 0],
    ]
    const { courses, warnings } = parseTranscriptRows(rows, 2024)
    expect(courses).toHaveLength(1)
    expect(courses[0].name).toBe('경영학원론')
    expect(courses[0].categoryId).toBe('부전공') // 원본 이수구분 표기를 분류로 보존(영역 미집계)
    expect(warnings.some((w) => w.includes('부전공'))).toBe(true)
  })

  it('모르는 이수구분이라도 코드가 없으면(요약/합계 행) 과목으로 잡지 않는다', () => {
    const rows: unknown[][] = [['소계', '', '취득학점 합계', 19, 19, 0, '', '', 0]]
    expect(parseTranscriptRows(rows, 2024).courses).toHaveLength(0)
  })

  it('인식 과목 없으면 경고', () => {
    expect(parseTranscriptRows([['머리글만']], 2024).warnings.length).toBeGreaterThan(0)
  })
})

describe('parseEnrollmentRows (수강내역 리스트)', () => {
  // 컬럼: [0]년도 [1]학기 [2]개설학과 [3]교과목코드 [4]교과목명 ... [10]이수구분 [11]학점
  const header = ['년도', '학기', '개설학과', '교과목코드', '교과목명', '분반', '담당교수', '강의교시', '강의실', '강의구분', '이수구분', '학점']
  const rows: unknown[][] = [
    header,
    ['2026', '1학기', '컴퓨터공학과', '259072', '데이터베이스', '2', '석진원', '', '', '일반강좌', '전필', '2'],
    ['2026', '1학기', '컴퓨터공학과', '259113', '기계학습', '1', '박현철', '', '', '일반강좌', '전선', '3'],
    ['2026', '1학기', '스포츠산업학과', '018136', '캠핑교육과인성', '1', '이영직', '', '', '일반강좌', '교양', '1'],
  ]

  it('수강중(enrolled) 과목으로 파싱: 학년-학기·이수구분·성적없음', () => {
    const { courses } = parseEnrollmentRows(rows, 2024)
    expect(courses).toHaveLength(3)
    const db = courses.find((c) => c.name === '데이터베이스')!
    expect(db.categoryId).toBe('majorReq')
    expect(db.semester).toBe('3-1') // 2026 - 2024 + 1 = 3학년 1학기
    expect(db.credits).toBe(2)
    expect(db.enrolled).toBe(true)
    expect(db.grade).toBe('') // 성적 미정
    expect(courses.find((c) => c.name === '기계학습')!.categoryId).toBe('majorElec')
    expect(courses.find((c) => c.name === '캠핑교육과인성')!.categoryId).toBe('ge')
  })

  it('모르는 이수구분은 원본 표기로 보존하고 경고한다', () => {
    const r: unknown[][] = [
      header,
      ['2026', '1학기', '경영학과', 'M001', '회계원리', '1', '김교수', '', '', '일반강좌', '복수전공', '3'],
    ]
    const { courses, warnings } = parseEnrollmentRows(r, 2024)
    expect(courses).toHaveLength(1)
    expect(courses[0].categoryId).toBe('복수전공') // 원본 이수구분 표기 보존
    expect(warnings.some((w) => w.includes('복수전공'))).toBe(true)
  })

  it('헤더 행은 건너뛰고, 인식 없으면 경고', () => {
    expect(parseEnrollmentRows([header], 2024).warnings.length).toBeGreaterThan(0)
  })
})
