import type { ReactNode } from 'react'
import { useStore } from '../state/store'
import { useActiveSpec } from '../state/hooks'
import { requirementSpecs } from '../data/requirements'
import { shortYearLabel } from '../semester'
import { Select } from './Select'

export default function Requirements() {
  const spec = useActiveSpec()
  const specId = useStore((s) => s.specId)
  const setSpec = useStore((s) => s.setSpec)
  const overrides = useStore((s) => s.overrides)
  const setOverrides = useStore((s) => s.setOverrides)
  const setAreaMin = useStore((s) => s.setAreaMin)
  const resetOverrides = useStore((s) => s.resetOverrides)
  const multiMajorId = useStore((s) => s.multiMajorId)
  const setMultiMajor = useStore((s) => s.setMultiMajor)
  const selectedMm = spec.multiMajors?.find((m) => m.id === multiMajorId)

  const hasOverrides =
    overrides.totalMinCredits != null ||
    overrides.gpaMin != null ||
    overrides.minSemesters != null ||
    (overrides.areaMin && Object.keys(overrides.areaMin).length > 0)

  const numCls = 'field'

  return (
    <div className="stack">
      <section className="glass-card">
        <h2 className="card-title mb-1">학과 · 학번</h2>
        {requirementSpecs.length > 1 && (
          <Select
            ariaLabel="학과·학번 선택"
            value={specId}
            onChange={setSpec}
            options={requirementSpecs.map((s) => ({
              value: s.id,
              label: `${s.program} · ${shortYearLabel(s.admissionYear)}`,
            }))}
          />
        )}
        <p className="card-sub mt-2">
          {spec.campus}캠퍼스 · {spec.college}
        </p>
        <p className="note mt-2">
          학번을 바꾸면 그 학번 공식 요건으로 판정합니다. 값을 직접 수정하면 그 값이 우선합니다.
        </p>
      </section>

      {spec.multiMajors && (
        <section className="glass-card">
          <h2 className="card-title mb-1">다전공</h2>
          {spec.multiMajorRequired && (
            <p className="banner warn mb-2">
              이 학과·학번은 다전공이 졸업 필수요건입니다.
            </p>
          )}
          <Select
            ariaLabel="다전공 선택"
            value={multiMajorId}
            onChange={setMultiMajor}
            options={spec.multiMajors.map((m) => ({ value: m.id, label: m.label }))}
          />
          {selectedMm?.note && <p className="card-sub mt-2">{selectedMm.note}</p>}
        </section>
      )}

      <section className="glass-card">
        <h2 className="card-title mb-3">학점 기준</h2>
        <div className="space-y-2">
          <Row
            label="총 졸업학점"
            onReset={
              overrides.totalMinCredits != null
                ? () => setOverrides({ totalMinCredits: undefined })
                : undefined
            }
          >
            <input
              type="number"
              className={numCls}
              style={{ width: '5rem', textAlign: 'right' }}
              value={spec.totalMinCredits}
              onChange={(e) => setOverrides({ totalMinCredits: Number(e.target.value) })}
            />
          </Row>
          {spec.areas
            .filter((a) => a.id !== 'total')
            .map((a) => (
              <Row
                key={a.id}
                label={a.label}
                onReset={
                  overrides.areaMin?.[a.id] != null
                    ? () => setAreaMin(a.id, undefined)
                    : undefined
                }
              >
                <input
                  type="number"
                  className={numCls}
                  style={{ width: '5rem', textAlign: 'right' }}
                  value={a.minCredits}
                  onChange={(e) => setAreaMin(a.id, Number(e.target.value))}
                />
              </Row>
            ))}
          <Row
            label="졸업 평점평균"
            onReset={
              overrides.gpaMin != null ? () => setOverrides({ gpaMin: undefined }) : undefined
            }
          >
            <input
              type="number"
              step={0.05}
              className={numCls}
              style={{ width: '5rem', textAlign: 'right' }}
              value={spec.gpaMin}
              onChange={(e) => setOverrides({ gpaMin: Number(e.target.value) })}
            />
          </Row>
          <Row
            label="최소 이수학기"
            onReset={
              overrides.minSemesters != null
                ? () => setOverrides({ minSemesters: undefined })
                : undefined
            }
          >
            <input
              type="number"
              className={numCls}
              style={{ width: '5rem', textAlign: 'right' }}
              value={spec.minSemesters}
              onChange={(e) => setOverrides({ minSemesters: Number(e.target.value) })}
            />
          </Row>
        </div>
        {hasOverrides && (
          <button
            onClick={resetOverrides}
            className="btn btn-ghost btn-block mt-3"
          >
            공식 기본값으로 되돌리기
          </button>
        )}
      </section>

      <section className="glass-card">
        <h2 className="card-title mb-2">비학점 졸업요건</h2>
        <ul className="space-y-2">
          {spec.nonCredit.map((n) => (
            <li key={n.id}>
              <p className="row-title">
                {n.label}
                {n.exempt && <span className="tag mute ml-2">(면제)</span>}
              </p>
              <p className="card-sub">{n.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {spec.notes && spec.notes.length > 0 && (
        <section className="glass-card">
          <h2 className="card-title mb-2">참고</h2>
          <ul className="space-y-1">
            {spec.notes.map((n, i) => (
              <li key={i} className="card-sub">• {n}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="glass-card">
        <h2 className="card-title mb-2">출처</h2>
        <ul className="space-y-1">
          {spec.sources.map((s) => (
            <li key={s}>
              <a href={s} target="_blank" rel="noreferrer" className="link break-all">
                {s}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Row({
  label,
  onReset,
  children,
}: {
  label: string
  /** 지정되면 라벨 옆에 '공식값으로' 되돌리기 버튼을 보여준다(이 항목이 override된 경우만). */
  onReset?: () => void
  children: ReactNode
}) {
  return (
    <div className="kv-row">
      <span className="k">
        {label}
        {onReset && (
          <button type="button" className="reset-mini" onClick={onReset} title="공식 기본값으로">
            ↺
          </button>
        )}
      </span>
      {children}
    </div>
  )
}
