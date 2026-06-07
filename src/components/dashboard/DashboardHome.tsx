// src/components/dashboard/DashboardHome.tsx
// Full student dashboard home — Graphy-style
// Uses DashboardLayout for shared sidebar
// UNCHANGED: CoursePlayer, ProfileEditor, CertificatesPage, all admin files

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import DashboardLayout from './DashboardLayout'

interface Enrollment {
  id: string
  course_id: string
  enrolled_at: string
  progress_percent: number
  course_title: string
  course_slug: string
  course_thumb: string | null
  course_mode: string
  course_duration: number
}

interface Stats {
  enrolledCount: number
  completedCount: number
  certCount: number
  totalLessons: number
}

interface LiveSession {
  id: string
  title: string
  platform: string
  zoom_link: string
  meeting_id: string | null
  passcode: string | null
  scheduled_at: string
  duration_minutes: number
  instructor_name: string | null
  status: string
}

interface Announcement {
  id: string
  title: string
  body: string | null
  created_at: string
}

export default function DashboardHome() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [stats, setStats] = useState<Stats>({ enrolledCount: 0, completedCount: 0, certCount: 0, totalLessons: 0 })
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [profile, setProfile] = useState<{ full_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login?redirect=/dashboard'; return }
      setUserId(data.user.id)
      loadAll(data.user.id)
    })
  }, [])

  async function loadAll(uid: string) {
    const [
      { data: profileData },
      { data: enrollData },
      { data: certData },
      { data: annData },
    ] = await Promise.all([
      supabase.from('student_profiles').select('full_name').eq('id', uid).single(),
      supabase.from('enrollments')
        .select('id,course_id,enrolled_at,progress_percent,courses(title,slug,thumbnail_url,mode,duration_weeks)')
        .eq('student_id', uid)
        .in('payment_status', ['paid', 'free'])
        .order('enrolled_at', { ascending: false }),
      supabase.from('certificates').select('id').eq('student_id', uid).eq('is_active', true),
      supabase.from('announcements').select('id,title,body,created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(3),
    ])

    setProfile(profileData)
    setAnnouncements(annData ?? [])

    const mapped: Enrollment[] = (enrollData ?? []).map((e: any) => ({
      id: e.id,
      course_id: e.course_id,
      enrolled_at: e.enrolled_at,
      progress_percent: e.progress_percent ?? 0,
      course_title: e.courses?.title ?? '',
      course_slug: e.courses?.slug ?? '',
      course_thumb: e.courses?.thumbnail_url ?? null,
      course_mode: e.courses?.mode ?? '',
      course_duration: e.courses?.duration_weeks ?? 0,
    }))

    setEnrollments(mapped)
    setStats({
      enrolledCount: mapped.length,
      completedCount: mapped.filter(e => e.progress_percent >= 100).length,
      certCount: (certData ?? []).length,
      totalLessons: 0,
    })

    // Load upcoming sessions for enrolled courses
    if (mapped.length > 0) {
      const courseIds = mapped.map(e => e.course_id)
      const { data: sessionData } = await supabase
        .from('live_sessions')
        .select('id,title,platform,zoom_link,meeting_id,passcode,scheduled_at,duration_minutes,instructor_name,status')
        .eq('is_active', true)
        .neq('status', 'cancelled')
        .or(`course_id.in.(${courseIds.map(id => `"${id}"`).join(',')}),course_id.is.null`)
        .gte('scheduled_at', new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at')
        .limit(5)
      setSessions(sessionData ?? [])
    }

    setLoading(false)
  }

  function fmtSession(iso: string) {
    const dt = new Date(iso)
    const diff = dt.getTime() - Date.now()
    const mins = Math.floor(diff / 60000)
    if (mins < 0 && Math.abs(mins) < 180) return '🔴 Live Now'
    if (mins < 60) return `In ${mins} min`
    if (mins < 1440) return `Today ${dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  function isJoinable(iso: string) {
    const diff = new Date(iso).getTime() - Date.now()
    return diff <= 15 * 60 * 1000 && diff >= -3 * 60 * 60 * 1000
  }

  if (loading) return (
    <DashboardLayout activeSection="home">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16, color: '#6b7280' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0b1525', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ fontSize: 14 }}>Loading your dashboard…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </DashboardLayout>
  )

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student'
  const inProgress = enrollments.filter(e => e.progress_percent > 0 && e.progress_percent < 100)
  const notStarted = enrollments.filter(e => e.progress_percent === 0)

  return (
    <DashboardLayout activeSection="home">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Greeting ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 800, color: '#0b1525', lineHeight: 1.2 }}>
              Welcome back, {firstName}! 👋
            </h1>
          </div>
          <a href="/courses" style={{ padding: '10px 20px', background: '#0b1525', color: '#d4f01a', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-display,Sora,sans-serif)', flexShrink: 0 }}>
            + Enroll New Course
          </a>
        </div>

        {/* ── Announcements ── */}
        {announcements.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {announcements.map(ann => (
              <div key={ann.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '13px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>📢</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: 14, color: '#92400e' }}>{ann.title}</div>
                  {ann.body && <div style={{ fontSize: 13, color: '#78350f', marginTop: 3, lineHeight: 1.5 }}>{ann.body}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Stats cards ── */}
        <div className="db-stats-grid">
          {[
            { icon: '📚', label: 'Enrolled Courses', value: stats.enrolledCount, accent: '#dbeafe', textColor: '#1e40af' },
            { icon: '▶️', label: 'In Progress', value: inProgress.length, accent: '#fef3c7', textColor: '#92400e' },
            { icon: '✅', label: 'Completed', value: stats.completedCount, accent: '#dcfce7', textColor: '#166534' },
            { icon: '📜', label: 'Certificates', value: stats.certCount, accent: '#f3e8ff', textColor: '#6b21a8' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: s.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: '1.7rem', fontWeight: 800, color: s.textColor, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Live Sessions ── */}
        {sessions.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', background: '#0b1525', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                🎥 Upcoming Live Classes
              </h2>
            </div>
            {sessions.map(s => {
              const joinable = isJoinable(s.scheduled_at)
              const isLive = s.status === 'live'
              return (
                <div key={s.id} style={{ padding: '14px 24px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', gap: 14 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isLive ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {s.platform === 'zoom' ? '🔵' : s.platform === 'meet' ? '🟢' : '🎥'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>{fmtSession(s.scheduled_at)}</span>
                      <span>⏱ {s.duration_minutes}min</span>
                      {s.instructor_name && <span>👤 {s.instructor_name}</span>}
                      {s.meeting_id && <span>ID: {s.meeting_id}</span>}
                      {s.passcode && <span>🔑 {s.passcode}</span>}
                    </div>
                  </div>
                  {(joinable || isLive) ? (
                    <a href={s.zoom_link} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '8px 16px', background: isLive ? '#dc2626' : '#0b1525', color: isLive ? '#fff' : '#d4f01a', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                      {isLive ? '🔴 Join Live' : '▶ Join'}
                    </a>
                  ) : (
                    <div style={{ padding: '7px 14px', background: '#f1f5f9', color: '#64748b', borderRadius: 8, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {fmtSession(s.scheduled_at)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Continue Learning (in-progress) ── */}
        {inProgress.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: '1rem', fontWeight: 700 }}>▶️ Continue Learning</h2>
              <a href="/dashboard/my-courses" style={{ fontSize: 13, color: '#0b1525', fontWeight: 600 }}>View all →</a>
            </div>
            {inProgress.slice(0, 3).map(e => (
              <CourseRow key={e.id} enrollment={e} />
            ))}
          </div>
        )}

        {/* ── All Enrolled Courses ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: '1rem', fontWeight: 700 }}>📚 My Courses</h2>
            <a href="/dashboard/my-courses" style={{ fontSize: 13, color: '#0b1525', fontWeight: 600 }}>View all →</a>
          </div>

          {enrollments.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
              <p style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No courses yet</p>
              <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Enroll in a course to start learning</p>
              <a href="/courses" style={{ padding: '11px 28px', background: '#0b1525', color: '#d4f01a', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display,Sora,sans-serif)' }}>
                Browse Courses
              </a>
            </div>
          ) : (
            enrollments.slice(0, 4).map(e => <CourseRow key={e.id} enrollment={e} />)
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="db-quick-grid">
          {[
            { href: '/dashboard/certificates', icon: '📜', label: 'My Certificates', sub: 'Download your certificates' },
            { href: '/dashboard/profile', icon: '👤', label: 'Edit Profile', sub: 'Update your details' },
            { href: '/verification', icon: '✅', label: 'Verify Certificate', sub: 'Check any certificate' },
            { href: '/courses', icon: '🔍', label: 'Browse Courses', sub: 'Explore more courses' },
          ].map(q => (
            <a key={q.href} href={q.href} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 20px', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0b1525'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(11,21,37,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: 26, flexShrink: 0 }}>{q.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: 14 }}>{q.label}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{q.sub}</div>
              </div>
            </a>
          ))}
        </div>

      </div>

      <style>{`
        .db-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        .db-quick-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        @media(max-width:1100px){
          .db-stats-grid { grid-template-columns: repeat(2,1fr); }
          .db-quick-grid  { grid-template-columns: repeat(2,1fr); }
        }
        @media(max-width:600px){
          .db-stats-grid { grid-template-columns: 1fr 1fr; }
          .db-quick-grid  { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </DashboardLayout>
  )
}

// ── Shared course row used in both sections ──────────────────
function CourseRow({ enrollment: e }: { enrollment: Enrollment }) {
  const pct = e.progress_percent
  const statusLabel = pct >= 100 ? '✅ Completed' : pct > 0 ? `${pct}% done` : 'Not started'
  const statusColor = pct >= 100 ? '#166534' : pct > 0 ? '#92400e' : '#6b7280'

  return (
    <div style={{ padding: '14px 24px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', gap: 14 }}
      onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Thumbnail */}
      <div style={{ width: 60, height: 44, borderRadius: 8, background: '#dbeafe', flexShrink: 0, overflow: 'hidden' }}>
        {e.course_thumb
          ? <img src={e.course_thumb} alt={e.course_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📚</div>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {e.course_title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <div style={{ flex: 1, maxWidth: 160, background: '#e5e7eb', borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg,#0b1525,#d4f01a)', width: `${pct}%`, transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
        </div>
      </div>

      {/* Mode badge */}
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', textTransform: 'capitalize', flexShrink: 0, display: 'none' }} className="db-mode-badge">
        {e.course_mode}
      </span>

      {/* CTA */}
      <a
        href={`/dashboard/course/${e.course_slug}`}
        style={{ padding: '8px 16px', background: pct >= 100 ? '#dcfce7' : '#0b1525', color: pct >= 100 ? '#166534' : '#d4f01a', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, fontFamily: 'var(--font-display,Sora,sans-serif)' }}
      >
        {pct >= 100 ? '📜 Certificate' : pct > 0 ? 'Continue →' : 'Start →'}
      </a>
    </div>
  )
}

// Make Enrollment type available to CourseRow
type Enrollment = {
  id: string; course_id: string; enrolled_at: string; progress_percent: number
  course_title: string; course_slug: string; course_thumb: string | null
  course_mode: string; course_duration: number
}
