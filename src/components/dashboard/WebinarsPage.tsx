// src/components/dashboard/WebinarsPage.tsx
// Student view of all live sessions — upcoming (join) + past (recording)
// Uses DashboardLayout for shared sidebar

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import DashboardLayout from './DashboardLayout'

interface Session {
  id: string
  title: string
  platform: string
  zoom_link: string
  meeting_id: string | null
  passcode: string | null
  scheduled_at: string
  duration_minutes: number
  instructor_name: string | null
  recording_url: string | null
  status: string
  course_id: string | null
  course_title: string | null
}

const PLATFORM_ICONS: Record<string, string> = {
  zoom:    '🔵',
  meet:    '🟢',
  teams:   '🟣',
  youtube: '🔴',
}

export default function WebinarsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'upcoming' | 'past'>('upcoming')
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return }
      loadSessions(data.user.id)
    })
  }, [])

  async function loadSessions(uid: string) {
    // Get enrolled course IDs
    const { data: enrollData } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', uid)
      .in('payment_status', ['paid', 'free'])

    const courseIds = (enrollData ?? []).map((e: any) => e.course_id)
    setEnrolledCourseIds(courseIds)

    // Get all active sessions — both course-specific and general (course_id IS NULL)
    const { data: sessionData } = await supabase
      .from('live_sessions')
      .select('id,title,platform,zoom_link,meeting_id,passcode,scheduled_at,duration_minutes,instructor_name,recording_url,status,course_id,courses(title)')
      .eq('is_active', true)
      .order('scheduled_at', { ascending: false })

    setSessions((sessionData ?? []).map((s: any) => ({
      ...s,
      course_title: s.courses?.title ?? null,
    })))
    setLoading(false)
  }

  const now = new Date()

  const upcoming = sessions.filter(s => {
    const dt = new Date(s.scheduled_at)
    return dt > new Date(now.getTime() - 2 * 60 * 60 * 1000) && s.status !== 'cancelled' && s.status !== 'completed'
  }).reverse()

  const past = sessions.filter(s => {
    const dt = new Date(s.scheduled_at)
    return dt <= new Date(now.getTime() - 2 * 60 * 60 * 1000) || s.status === 'completed'
  })

  function isJoinable(iso: string, status: string) {
    const diff = new Date(iso).getTime() - now.getTime()
    return (diff <= 15 * 60 * 1000 && diff >= -2 * 60 * 60 * 1000) || status === 'live'
  }

  function fmtDate(iso: string) {
    const dt = new Date(iso)
    const diff = dt.getTime() - now.getTime()
    const mins = Math.floor(diff / 60000)
    if (Math.abs(mins) < 60) return diff > 0 ? `In ${mins} min` : `${Math.abs(mins)} min ago`
    return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' at ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  function SessionCard({ s }: { s: Session }) {
    const joinable = isJoinable(s.scheduled_at, s.status)
    const isLive   = s.status === 'live'
    const isPast   = tab === 'past'

    return (
      <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${isLive ? '#fca5a5' : '#e5e7eb'}`, overflow: 'hidden', transition: 'box-shadow .15s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
      >
        {/* Top bar */}
        <div style={{ background: isLive ? '#fef2f2' : '#f8fafc', borderBottom: '1px solid #e5e7eb', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{PLATFORM_ICONS[s.platform] ?? '🎥'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.title}
            </div>
            {s.course_title && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>📚 {s.course_title}</div>
            )}
          </div>
          {isLive && (
            <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, animation: 'pulse 1.5s infinite' }}>
              🔴 LIVE
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#6b7280' }}>
            <span>📅 {fmtDate(s.scheduled_at)}</span>
            <span>⏱ {s.duration_minutes} min</span>
            {s.instructor_name && <span>👤 {s.instructor_name}</span>}
          </div>

          {/* Meeting details (only for upcoming/live) */}
          {!isPast && s.meeting_id && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
              <div style={{ color: '#0369a1' }}>
                <strong>Meeting ID:</strong> {s.meeting_id}
                {s.passcode && <> &nbsp;·&nbsp; <strong>Passcode:</strong> {s.passcode}</>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isPast ? (
              s.recording_url ? (
                <a href={s.recording_url} target="_blank" rel="noopener"
                  style={{ padding: '9px 18px', background: '#0b1525', color: '#d4f01a', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  ▶ Watch Recording
                </a>
              ) : (
                <span style={{ padding: '9px 18px', background: '#f1f5f9', color: '#94a3b8', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  Recording coming soon
                </span>
              )
            ) : (
              joinable ? (
                <a href={s.zoom_link} target="_blank" rel="noopener"
                  style={{ padding: '9px 20px', background: isLive ? '#dc2626' : '#0b1525', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  {isLive ? '🔴 Join Now' : '▶ Join Session'}
                </a>
              ) : (
                <div style={{ padding: '9px 18px', background: '#f1f5f9', color: '#64748b', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  🔔 {fmtDate(s.scheduled_at)}
                </div>
              )
            )}

            {/* Add to calendar for upcoming */}
            {!isPast && !isLive && (
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(s.title)}&dates=${new Date(s.scheduled_at).toISOString().replace(/[-:.]/g,'').slice(0,15)}Z/${new Date(new Date(s.scheduled_at).getTime() + s.duration_minutes * 60000).toISOString().replace(/[-:.]/g,'').slice(0,15)}Z&details=${encodeURIComponent('Join: ' + s.zoom_link)}`}
                target="_blank" rel="noopener"
                style={{ padding: '9px 14px', background: '#fff', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                📅 Add to Calendar
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  const displayList = tab === 'upcoming' ? upcoming : past

  if (loading) return (
    <DashboardLayout activeSection="webinars">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16, color: '#6b7280' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#0b1525', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout activeSection="webinars">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: 'clamp(1.3rem,3vw,1.7rem)', fontWeight: 800, color: '#0b1525' }}>
            🎥 Live Sessions & Webinars
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {upcoming.length} upcoming · {past.length} past sessions
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {([['upcoming', `📅 Upcoming (${upcoming.length})`], ['past', `📼 Past & Recordings (${past.length})`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid', borderColor: tab === key ? '#0b1525' : '#e5e7eb', background: tab === key ? '#0b1525' : '#fff', color: tab === key ? '#d4f01a' : '#374151', fontWeight: tab === key ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Sessions */}
        {displayList.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {tab === 'upcoming' ? '📅' : '📼'}
            </div>
            <p style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>
              {tab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions yet'}
            </p>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              {tab === 'upcoming'
                ? 'Check back soon. Sessions are added by your instructors.'
                : 'Past sessions and recordings will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
            {displayList.map(s => <SessionCard key={s.id} s={s} />)}
          </div>
        )}

      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </DashboardLayout>
  )
}
