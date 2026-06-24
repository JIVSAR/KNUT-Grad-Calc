import { useTheme, type ThemePref } from '../state/theme'

const OPTS: { v: ThemePref; label: string }[] = [
  { v: 'light', label: '라이트' },
  { v: 'dark', label: '다크' },
  { v: 'system', label: '시스템' },
]

/** 설정(백업) 탭의 화면 테마 선택. 라이트/다크/시스템 3종. */
export function ThemeSetting() {
  const pref = useTheme((s) => s.pref)
  const setPref = useTheme((s) => s.setPref)

  return (
    <section className="glass-card">
      <h2 className="card-title">화면 테마</h2>
      <p className="card-sub">라이트·다크 또는 기기 설정을 따르도록 선택할 수 있어요.</p>
      <div className="segmented" style={{ marginTop: 12 }}>
        {OPTS.map((o) => (
          <button
            key={o.v}
            className={pref === o.v ? 'on' : ''}
            onClick={() => setPref(o.v)}
            aria-pressed={pref === o.v}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  )
}
