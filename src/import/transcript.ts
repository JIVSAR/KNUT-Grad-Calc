import type { Course } from '../types'
import { calendarToSem, type Term } from '../semester'

// 통합정보시스템 졸업자가진단 > 성적 탭 엑셀(개인성적.xlsx) 파서.
// I/O(XLSX 읽기)와 행 파싱(parseTranscriptRows)을 분리해 파싱 로직을 테스트 가능하게 둠.

// 성적표 이수구분 → 앱 카테고리 id 매핑.
// 주의: 'K융필/K융선'(K-융합전공)과 '융필/융선'(융합전공)은 서로 다른 다전공이다.
const CAT: Record<string, string> = {
  전필: 'majorReq',
  전공필수: 'majorReq',
  전선: 'majorElec',
  전공선택: 'majorElec',
  교양: 'ge',
  교필: 'ge',
  교선: 'ge',
  균형교양: 'ge',
  핵심교양: 'ge',
  산학: 'free',
  자선: 'free',
  자유선택: 'free',
  일선: 'free',
  일반선택: 'free',
  기타: 'free',
  교직: 'free',
  // K-융합전공
  K융필: 'kConvergeReq',
  'K-융필': 'kConvergeReq',
  K융합필수: 'kConvergeReq',
  K융선: 'kConvergeElec',
  'K-융선': 'kConvergeElec',
  K융합선택: 'kConvergeElec',
  // 융합전공(별개 다전공)
  융필: 'conv',
  융선: 'conv',
  융합필수: 'conv',
  융합선택: 'conv',
  // 소단위(마이크로)전공
  소전: 'micro',
  소단위전공: 'micro',
  마이크로전공: 'micro',
}

const GUBUN = new Set(Object.keys(CAT))

const cell = (v: unknown): string => (v == null ? '' : String(v))

function parseSemHeader(text: string): { year: number; term: Term } | null {
  const m = /(\d{4})\s*년도/.exec(text)
  if (!m || !/학기/.test(text)) return null
  const year = Number(m[1])
  let term: Term
  if (/여름/.test(text)) term = 'S'
  else if (/겨울/.test(text)) term = 'W'
  else if (/2\s*학기/.test(text)) term = '2'
  else if (/1\s*학기/.test(text)) term = '1'
  else return null
  return { year, term }
}

export function parseTranscriptRows(
  rows: unknown[][],
  admissionYear: number,
): { courses: Course[]; warnings: string[] } {
  const courses: Course[] = []
  const warnings: string[] = []
  const unknownGubun = new Set<string>()
  let currentSem: string | undefined
  let n = 0

  for (const row of rows) {
    const first = cell(row[0]).trim()
    const key = first.replace(/\s/g, '')

    const hdr = parseSemHeader(row.map(cell).join(' '))
    if (hdr) {
      currentSem = calendarToSem(hdr.year, hdr.term, admissionYear)
      continue
    }

    const name = cell(row[2]).trim()
    const code = cell(row[1]).trim()
    const credits = Number(cell(row[3]))
    const grade = cell(row[6]).trim().toUpperCase()
    if (!name || !Number.isFinite(credits) || credits <= 0) continue

    const known = GUBUN.has(key)
    // 모르는 이수구분이어도 과목 형태(이수구분 + 코드 + 이름 + 학점)면 버리지 않고 살려서 표면화한다.
    if (!known && !(first && code)) continue
    if (!known) unknownGubun.add(first)

    courses.push({
      id: `t${n++}`,
      name,
      code: code || undefined,
      credits,
      categoryId: known ? CAT[key] : first, // 모르는 이수구분은 원본 표기를 분류로 보존(영역 미집계 + 경고)
      grade,
      semester: currentSem,
      planned: false,
    })
  }

  if (unknownGubun.size) {
    warnings.push(
      `처음 보는 이수구분 ${[...unknownGubun].map((g) => `'${g}'`).join(', ')} 과목은 자동 분류를 못 했어요. 과목 탭에서 영역을 직접 지정하세요.`,
    )
  }
  if (courses.length === 0) {
    warnings.push('인식된 과목이 없습니다. 성적 탭에서 받은 엑셀(개인성적.xlsx)이 맞는지 확인하세요.')
  }
  return { courses, warnings }
}

export async function parseTranscriptFile(
  data: ArrayBuffer,
  admissionYear: number,
): Promise<{ courses: Course[]; warnings: string[] }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(new Uint8Array(data), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true })
  return parseTranscriptRows(rows, admissionYear)
}

// ── 수강내역 리스트(현재 수강중) 파서 ──────────────────────────────
// 통합정보시스템 > 수강내역조회 > '학생 수강내역 리스트' 엑셀(성적 미정, 현재 수강중).
// 컬럼: [0]년도 [1]학기 [3]교과목코드 [4]교과목명 [10]이수구분 [11]학점.

function parseTermCol(s: string): Term | null {
  if (/여름/.test(s)) return 'S'
  if (/겨울/.test(s)) return 'W'
  if (/2/.test(s)) return '2'
  if (/1/.test(s)) return '1'
  return null
}

export function parseEnrollmentRows(
  rows: unknown[][],
  admissionYear: number,
): { courses: Course[]; warnings: string[] } {
  const courses: Course[] = []
  const warnings: string[] = []
  const unknownGubun = new Set<string>()
  let n = 0

  for (const row of rows) {
    const year = cell(row[0]).trim()
    if (!/^\d{4}$/.test(year)) continue // 헤더/빈 행 건너뜀
    const term = parseTermCol(cell(row[1]))
    const code = cell(row[3]).trim()
    const name = cell(row[4]).trim()
    const gubun = cell(row[10]).replace(/\s/g, '')
    const rawGubun = cell(row[10]).trim()
    const credits = Number(cell(row[11]))
    if (!name || !Number.isFinite(credits) || credits <= 0) continue

    const mapped = CAT[gubun]
    if (!mapped && rawGubun) unknownGubun.add(rawGubun)

    courses.push({
      id: `e${n++}`,
      name,
      code: code || undefined,
      credits,
      // 모르는 이수구분은 원본 표기를 분류로 보존(영역 미집계 + 경고). 표기 자체가 없으면 전공선택으로.
      categoryId: mapped ?? (rawGubun || 'majorElec'),
      grade: '',
      semester: term ? calendarToSem(Number(year), term, admissionYear) : undefined,
      enrolled: true,
    })
  }

  if (unknownGubun.size) {
    warnings.push(
      `처음 보는 이수구분 ${[...unknownGubun].map((g) => `'${g}'`).join(', ')} 과목은 자동 분류를 못 했어요. 과목 탭에서 영역을 직접 지정하세요.`,
    )
  }
  if (courses.length === 0) {
    warnings.push(
      '인식된 수강 과목이 없습니다. 수강내역조회 > 학생 수강내역 리스트 엑셀이 맞는지 확인하세요.',
    )
  }
  return { courses, warnings }
}

export async function parseEnrollmentFile(
  data: ArrayBuffer,
  admissionYear: number,
): Promise<{ courses: Course[]; warnings: string[] }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(new Uint8Array(data), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true })
  return parseEnrollmentRows(rows, admissionYear)
}
