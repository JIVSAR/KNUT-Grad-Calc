import { useTheme } from '../state/theme'

/** 헤더용 라이트/다크 즉시 전환 토글 (설정 탭엔 3종 선택이 따로 있음) */
export function ThemeToggle() {
  const resolved = useTheme((s) => s.resolved)
  const setPref = useTheme((s) => s.setPref)
  const next = resolved === 'dark' ? 'light' : 'dark'

  return (
    <button
      className="theme-toggle"
      aria-label={resolved === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      onClick={() => setPref(next)}
    >
      {resolved === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
