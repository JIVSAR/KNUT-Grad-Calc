import { useEffect, useState } from 'react'
import { TERMS, termLabel, parseSem, semCode, type Term } from '../semester'
import { Select } from './Select'

/** 학년 + 학기(1/여름/2/겨울) 선택 → 'Y-T' 코드. 둘 다 골라야 값이 생긴다. */
export function SemesterSelect({
  value,
  onChange,
  years = [1, 2, 3, 4, 5, 6],
  error,
}: {
  value: string
  onChange: (v: string) => void
  years?: number[]
  /** 필수 미입력 강조 — 비어 있는 학년/학기 칸을 빨갛게 표시. */
  error?: boolean
}) {
  const init = parseSem(value)
  const [year, setYear] = useState(init ? String(init.year) : '')
  const [term, setTerm] = useState<string>(init ? init.term : '')

  useEffect(() => {
    const p = parseSem(value)
    setYear(p ? String(p.year) : '')
    setTerm(p ? p.term : '')
  }, [value])

  const emit = (y: string, t: string) => {
    setYear(y)
    setTerm(t)
    onChange(y && t ? semCode(Number(y), t as Term) : '')
  }

  return (
    <div className="flex gap-2">
      <Select
        style={{ flex: 1 }}
        ariaLabel="학년 선택"
        placeholder="학년"
        error={error && !year}
        value={year}
        onChange={(y) => emit(y, term)}
        options={years.map((y) => ({ value: String(y), label: `${y}학년` }))}
      />
      <Select
        style={{ flex: 1 }}
        ariaLabel="학기 선택"
        placeholder="학기"
        error={error && !term}
        value={term}
        onChange={(t) => emit(year, t)}
        options={TERMS.map((t) => ({ value: t, label: termLabel(t) }))}
      />
    </div>
  )
}
