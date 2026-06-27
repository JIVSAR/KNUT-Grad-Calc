import { useState } from 'react'
import { useStore } from '../state/store'
import { useActiveSpec, useEvaluation } from '../state/hooks'
import { ProgressBar } from './ProgressBar'
import { Ring } from './Ring'
import { useCountUp } from '../lib/useCountUp'
import { computeGpa } from '../engine/gpa'
import { currentCurriculumYear } from '../data/requirements/curriculum'

const IcCheck = (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IcWarn = (
  <svg viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8v5M12 16.5v.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)
const IcMinus = (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)
const IcX = (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
)
const IcClock = (
  <svg viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IcCalendar = (
  <svg viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
const IcStar = (
  <svg viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18l.9-5.4L4.2 8.7l5.4-.8L12 3z"
      fill="currentColor"
    />
  </svg>
)

const DOT = ['var(--p1)', 'var(--p2)', 'var(--p4)', 'var(--p3)', 'var(--p1)', 'var(--p2)']
const VAR = ['g1', 'g3', 'g3', 'g2', 'g1', 'g3'] as const

export default function Dashboard() {
  const spec = useActiveSpec()
  const r = useEvaluation()
  const toggleNonCredit = useStore((s) => s.toggleNonCredit)
  const completed = useStore((s) => s.completedNonCredit)
  const courses = useStore((s) => s.courses)

  const total = r.areas.find((a) => a.id === 'total')
  const otherAreas = r.areas.filter((a) => a.id !== 'total')
  const reqTaken = r.requiredCourses.filter((c) => c.taken).length
  const reqTotal = r.requiredCourses.length

  const totalEarned = total?.earned ?? 0
  const totalMin = total?.min ?? 0
  const overall = r.overallProgress
  const reqPct = reqTotal > 0 ? Math.round((reqTaken / reqTotal) * 100) : 0
  const nonCreditDone = r.nonCredit.filter((n) => n.satisfied).length

  // 평점평균 카드: 탭하면 전체 ↔ 전공(전공필수·선택) GPA 전환
  const [gpaMode, setGpaMode] = useState<'all' | 'major'>('all')
  const majorCats = new Set(spec.areas.find((a) => a.id === 'majorTotal')?.includes ?? [])
  const majorGpa = computeGpa(
    courses.filter((c) => majorCats.has(c.categoryId)),
    spec,
  )
  const isMajor = gpaMode === 'major'
  const shownGpa = isMajor ? majorGpa.gpa : r.gpa
  const shownCredits = isMajor ? majorGpa.gpaCredits : r.gpaCredits

  const heroPct = useCountUp(overall)
  const earnedNum = useCountUp(totalEarned)
  const gpaNum = useCountUp(shownGpa, 900, 2)

  let d = 0
  const delay = () => ({ animationDelay: `${(d++ * 70)}ms` })

  return (
    <div className="stack">
      {/* 히어로 */}
      <section className="hero reveal" style={delay()}>
        {r.canGraduate ? (
          <>
            <div className="hero-top">
              <span className="cap-cheer">축하해요 ✦</span>
            </div>
            <div className="hero-grid">
              <Ring pct={100}>
                <div className="pct grad-text">100%</div>
                <div className="pct-lab">전체 진행률</div>
              </Ring>
              <div className="hero-right">
                <div className="big">
                  졸업요건을 <b>모두 충족</b>했어요!
                </div>
                <div className="small">총 {totalEarned} / {totalMin}학점 이수</div>
              </div>
            </div>
            <div className="cheer">
              {IcStar}
              정말 고생했어요. 졸업을 축하합니다! 🎓
            </div>
          </>
        ) : (
          <>
            <div className="hero-top">
              <span className="cap-cheer">{overall >= 80 ? '거의 다 왔어요 ✦' : '한 걸음씩 ✦'}</span>
            </div>
            <div className="hero-grid">
              <Ring pct={overall}>
                <div className="pct grad-text">{heroPct}%</div>
                <div className="pct-lab">전체 진행률</div>
              </Ring>
              <div className="hero-right">
                <div className="big">
                  졸업까지 <b>{r.unmet.length}개 항목</b>
                  <br />
                  남았어요
                </div>
                <div className="small">총 {totalEarned} / {totalMin}학점 이수</div>
                <div className="miss">
                  {r.unmet.slice(0, 4).map((u, i) => (
                    <span key={i}>
                      <i className="d" />
                      {u}
                    </span>
                  ))}
                  {r.unmet.length > 4 && <span>외 {r.unmet.length - 4}개</span>}
                </div>
              </div>
            </div>
            <div className="cheer">
              {IcStar}
              조금만 더 힘내요! 남은 항목을 하나씩 채우면 졸업이에요.
            </div>
          </>
        )}
      </section>

      {/* 총 졸업학점 */}
      {total && (
        <section className="glass-card reveal" style={delay()}>
          <div className="sec-head">
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 7h18M3 12h18M3 17h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <h2>총 졸업학점</h2>
          </div>
          <div className="big-num">
            <span className="n grad-text">{earnedNum}</span>
            <span className="of">/ {totalMin}학점</span>
            <span className="tag">
              {total.remaining > 0 ? `${total.remaining}학점 남음` : '충족 완료 ✓'}
            </span>
          </div>
          <ProgressBar value={total.earned} max={total.min} satisfied={total.satisfied} />
          {total.enrolled + total.planned > 0 && (
            <p className="crs-prog" style={{ margin: '10px 0 0', fontSize: 12 }}>
              <span className="txt">
                {total.enrolled > 0 && total.planned > 0
                  ? '수강중·계획'
                  : total.enrolled > 0
                    ? '수강중'
                    : '계획'}{' '}
                <b>{total.enrolled + total.planned}학점</b> 반영 시 남은 학점{' '}
                <b>{Math.max(0, total.min - total.earned - total.enrolled - total.planned)}</b>
              </span>
            </p>
          )}
        </section>
      )}

      {/* 현재 학과·다전공 설정에 없는 분류 과목 경고 */}
      {r.unclassified.length > 0 && (
        <section className="glass-card reveal" style={delay()}>
          <p className="note-warn">
            ⚠ 현재 학과·다전공 설정에 없는 분류의 과목 {r.unclassified.length}개(
            {r.unclassified.reduce((s, c) => s + c.credits, 0)}학점)가 있어요. 총 졸업학점엔 포함되지만
            영역별 합계에는 안 잡힙니다. 다전공/학번을 바꿨다면 과목 탭에서 분류를 확인하세요.
          </p>
        </section>
      )}

      {/* 영역별 이수 현황 */}
      <section className="glass-card reveal" style={delay()}>
        <div className="sec-head">
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 21V9l7-5 7 5v12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>
          <h2>영역별 이수 현황</h2>
        </div>
        {otherAreas.map((a, i) => (
          <div className="area-row" key={a.id}>
            <div className="top">
              <div className="name">
                <span className="dot" style={{ background: DOT[i % DOT.length] }} />
                {a.label}
                {a.satisfied && (
                  <span className="done-chip">
                    {IcCheck}
                    충족
                  </span>
                )}
              </div>
              <div className="val">
                <b>{a.earned}</b>/{a.min}
              </div>
            </div>
            <ProgressBar value={a.earned} max={a.min} satisfied={a.satisfied} variant={VAR[i % VAR.length]} />
          </div>
        ))}
      </section>

      {/* GPA — 탭하면 전체 ↔ 전공 평점 전환 (gpa-press: 눌림 효과) */}
      <section
        className="glass-card reveal gpa-press"
        style={{ ...delay(), cursor: 'pointer' }}
        onClick={() => setGpaMode((m) => (m === 'all' ? 'major' : 'all'))}
        role="button"
        tabIndex={0}
        aria-label={`평점평균 ${isMajor ? '전공' : '전체'} 보기 — 탭하면 전환`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setGpaMode((m) => (m === 'all' ? 'major' : 'all'))
          }
        }}
      >
        <div className="sec-head">
          <span className="ic">{IcStar}</span>
          <h2>{isMajor ? '전공' : '전체'} 평점평균 (GPA)</h2>
        </div>
        <div className="gpa">
          <div className="score grad-text teal">{gpaNum.toFixed(2)}</div>
          <div className="info">
            <div className="l1">{isMajor ? '전공필수·전공선택 과목' : `졸업 기준 ${spec.gpaMin} 이상`}</div>
            <div className="l2">
              반영 {shownCredits}학점{!isMajor && ` · ${r.gpaSatisfied ? '기준 충족' : '기준 미달'}`}
            </div>
          </div>
          {!isMajor && (
            <span className={`pill-ok${r.gpaSatisfied ? '' : ' warn'}`}>
              {r.gpaSatisfied ? IcCheck : IcWarn}
              {r.gpaSatisfied ? '충족' : '미달'}
            </span>
          )}
        </div>
      </section>

      {/* 비학점 졸업요건 */}
      <section className="glass-card reveal" style={delay()}>
        <div className="sec-head">
          <span className="ic">
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
          </span>
          <h2>비학점 졸업요건</h2>
          <span className="meta">{nonCreditDone} / {r.nonCredit.length}</span>
        </div>
        {r.nonCredit.map((n) => {
          const state = n.exempt ? 'mute' : n.satisfied ? 'ok' : 'warn'
          const badge = n.exempt ? '면제' : n.satisfied ? '완료' : completed.includes(n.id) ? '완료' : '미완료'
          const inner = (
            <>
              <span className={`st ${state}`}>{n.exempt ? IcMinus : n.satisfied ? IcCheck : IcWarn}</span>
              <div className="ct">
                <div className="t">{n.label}</div>
                <div className="d">{n.detail}</div>
              </div>
              <span className={`badge ${state}`}>{badge}</span>
            </>
          )
          return n.exempt ? (
            <div className="check-item" key={n.id}>
              {inner}
            </div>
          ) : (
            <button className="check-item" key={n.id} onClick={() => toggleNonCredit(n.id)}>
              {inner}
            </button>
          )
        })}
      </section>

      {/* 필수과목 이수 */}
      <section className="glass-card reveal" style={delay()}>
        <div className="sec-head">
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>
          <h2>필수과목 이수</h2>
          <span className="meta">{reqTaken} / {reqTotal}</span>
        </div>
        <p className="card-sub" style={{ marginTop: -2 }}>{currentCurriculumYear} 교육과정 편성표 기준</p>
        {!spec.requiredCoursesComplete && (
          <p className="note-warn">
            {reqTotal === 0
              ? '⚠ 이 학번의 필수과목 목록을 준비 중이에요. 지금은 전공필수 학점 기준으로만 판정해요.'
              : '⚠ 필수과목 목록이 아직 일부예요. 학교 자료 반영 후 완성됩니다.'}
          </p>
        )}
        {reqTotal > 0 && (
          <>
            <div className="crs-prog">
              <Ring pct={reqPct} size={48} stroke={6} glow={false}>
                {reqPct}%
              </Ring>
              <div className="txt">
                <b>{reqTaken}개</b> 이수 완료 · <b>{reqTotal - reqTaken}개</b> 남음
              </div>
            </div>
            <div className="course-chips">
              {r.requiredCourses.map((c) => {
                const cls = c.taken ? 'on' : c.enrolled ? 'enrolled' : c.planned ? 'planned' : 'off'
                return (
                  <span className={cls} key={c.name}>
                    {c.taken ? IcCheck : c.enrolled ? IcClock : c.planned ? IcCalendar : IcX}
                    {c.name}
                  </span>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
