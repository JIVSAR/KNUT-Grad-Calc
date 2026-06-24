// 학기 표기: `${학년}-${term}` (term: 1=1학기, S=여름, 2=2학기, W=겨울)
// 정렬 순서: 1학기 → 여름학기 → 2학기 → 겨울학기

export type Term = '1' | 'S' | '2' | 'W'

export const TERMS: Term[] = ['1', 'S', '2', 'W']
const ORDER: Record<Term, number> = { '1': 1, S: 2, '2': 3, W: 4 }
const SHORT: Record<Term, string> = { '1': '1', S: '여름', '2': '2', W: '겨울' }
const LONG: Record<Term, string> = { '1': '1학기', S: '여름학기', '2': '2학기', W: '겨울학기' }

export function semCode(year: number, term: Term): string {
  return `${year}-${term}`
}

export function parseSem(code: string): { year: number; term: Term } | null {
  const m = /^(\d+)-(1|S|2|W)$/.exec(code)
  return m ? { year: Number(m[1]), term: m[2] as Term } : null
}

export function semSortKey(code: string): number {
  const s = parseSem(code)
  return s ? s.year * 10 + ORDER[s.term] : Number.MAX_SAFE_INTEGER
}

export function compareSem(a: string, b: string): number {
  return semSortKey(a) - semSortKey(b)
}

/** 짧은 표기: 3-1, 3-여름, 3-2, 3-겨울 */
export function semLabel(code: string): string {
  const s = parseSem(code)
  return s ? `${s.year}-${SHORT[s.term]}` : code
}

/** 긴 표기: 3학년 1학기 */
export function semLabelLong(code: string): string {
  const s = parseSem(code)
  return s ? `${s.year}학년 ${LONG[s.term]}` : code
}

export function termLabel(term: Term): string {
  return LONG[term]
}

/** 입학연도 기준 캘린더연도+학기 → 학년-학기 코드 */
export function calendarToSem(calYear: number, term: Term, admissionYear: number): string {
  return semCode(calYear - admissionYear + 1, term)
}

/** 입학연도 → 짧은 표기. 예: 2024 → '24학번' */
export function shortYearLabel(admissionYear: number): string {
  return `${String(admissionYear).slice(-2)}학번`
}
