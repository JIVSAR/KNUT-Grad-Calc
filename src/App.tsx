import { useState, type ReactNode } from 'react'
import Dashboard from './ui/Dashboard'
import Courses from './ui/Courses'
import Planner from './ui/Planner'
import Requirements from './ui/Requirements'
import Backup from './ui/Backup'
import { ThemeToggle } from './ui/ThemeToggle'
import { Onboarding } from './ui/Onboarding'
import { useActiveSpec } from './state/hooks'
import { useStore } from './state/store'
import { shortYearLabel } from './semester'

type Tab = 'dash' | 'courses' | 'plan' | 'req' | 'backup'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'dash',
    label: '대시보드',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 12l9-8 9 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v10h14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'courses',
    label: '과목',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 5h16M4 12h16M4 19h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'plan',
    label: '계획',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'req',
    label: '요건',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'backup',
    label: '백업',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="12" cy="7" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
]

export default function App() {
  const onboarded = useStore((s) => s.onboarded)
  if (!onboarded) return <Onboarding />
  return <MainShell />
}

function MainShell() {
  const [tab, setTab] = useState<Tab>('dash')
  const spec = useActiveSpec()

  return (
    <div className="app-shell">
      <div className="blobs" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
      </div>

      <header className="app-header">
        <div>
          <span className="eyebrow">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 10L12 5 2 10l10 5 10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path
                d="M6 12v4c0 1.1 2.7 3 6 3s6-1.9 6-3v-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            졸업까지 함께
          </span>
          <h1>국립한국교통대학교 졸업학점 계산기</h1>
          <p className="app-sub">
            {spec.program} · {shortYearLabel(spec.admissionYear)}
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="content">
        <div key={tab} className="tab-page">
          {tab === 'dash' && <Dashboard />}
          {tab === 'courses' && <Courses />}
          {tab === 'plan' && <Planner />}
          {tab === 'req' && <Requirements />}
          {tab === 'backup' && <Backup />}
        </div>
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab${tab === t.id ? ' active' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="ti">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
