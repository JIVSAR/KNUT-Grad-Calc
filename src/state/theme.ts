import { create } from 'zustand'

export type ThemePref = 'light' | 'dark' | 'system'
export type Resolved = 'light' | 'dark'

const KEY = 'knut-theme'

function systemDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function resolve(pref: ThemePref): Resolved {
  return pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref
}

function persistPref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    /* ignore */
  }
}

/** 테마 적용을 화면 전체 크로스페이드로 감싼다(지원 시). 미지원·모션축소 시 즉시 적용. */
function applyResolved(r: Resolved) {
  const set = () => {
    document.documentElement.dataset.theme = r
  }
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown
  }
  if (!reduce && typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(set)
  } else {
    set()
  }
}

function initialPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

interface ThemeState {
  pref: ThemePref
  resolved: Resolved
  setPref: (pref: ThemePref) => void
}

const init = initialPref()

export const useTheme = create<ThemeState>((set) => ({
  pref: init,
  resolved: resolve(init),
  setPref: (pref) => {
    persistPref(pref)
    const r = resolve(pref)
    applyResolved(r)
    set({ pref, resolved: r })
  },
}))

// 시스템 테마 변경 시(설정이 'system'일 때만) 자동 반영
if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const { pref } = useTheme.getState()
      if (pref === 'system') {
        const r = resolve('system')
        applyResolved(r)
        useTheme.setState({ resolved: r })
      }
    })
}
