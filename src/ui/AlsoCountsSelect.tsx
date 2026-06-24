import { Select } from './Select'

/** 한 과목이 동시에 인정되는 추가 영역 1개를 고르는 선택칸 (예: 전공이면서 K-융합). */
export function AlsoCountsSelect({
  categories,
  primary,
  value,
  onChange,
}: {
  categories: { id: string; label: string }[]
  primary: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  const opts = categories.filter((c) => c.id !== primary)
  return (
    <div className="field-label">
      동시 인정 영역 (선택 — 예: 전공이면서 K-융합)
      <Select
        ariaLabel="동시 인정 영역 선택"
        value={value[0] ?? ''}
        onChange={(v) => onChange(v ? [v] : [])}
        options={[{ value: '', label: '없음' }, ...opts.map((c) => ({ value: c.id, label: c.label }))]}
      />
    </div>
  )
}
