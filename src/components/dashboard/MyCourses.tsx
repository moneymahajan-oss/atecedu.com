// src/components/dashboard/MyCourses.tsx
// Full My Courses page — card grid, progress bars, zoom links, resume/start/certificate buttons
// Uses DashboardLayout for shared sidebar
// UNCHANGED: CoursePlayer, DashboardHome, ProfileEditor, CertificatesPage, all admin

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
  zoom_links: { title: string; zoom_url: string; schedule_text: string | null }[]
}

type FilterType = 'all' | 'in-progress' | 'completed' | 'not-started'

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login?redirect=/dashboard/my-courses'; return }
      loadCourses(data.user.id)
    })
  }, [])

  async function loadCourses(userId: string) {
    const { data: enrollData } = await supabase
      .from('enrollments')
      .select('id,course_id,enrolled_at,progress_percent,courses(title,slug,thumbnail_url,mode,duration_weeks)')
      .eq('student_id', userId)
      .in('payment_status', ['paid', 'free'])
      .order('enrolled_at', { ascending: false })

    const result: Enrollment[] = []
    for (const e of enrollData ?? []) {
      const { data: zoomData } = await supabase
        .from('zoom_links')
        .select('title,zoom_url,schedule_text')
        .eq('course_id', (e as any).course_id)
        .eq('is_active', true)

      result.push({
        id: (e as any).id,
        course_id: (e as any).course_id,
        enrolled_at: (e as any).enrolled_at,
        progress_percent: (e as any).progress_percent ?? 0,
        course_title: (e as any).courses?.title ?? '',
        course_slug: (e as any).courses?.slug ?? '',
        course_thumb: (e as any).courses?.thumbnail_url ?? null,
        course_mode: (e as any).courses?.mode ?? '',
        course_duration: (e as any).courses?.duration_weeks ?? 0,
        zoom_links: zoomData ?? [],
      })
    }
    setEnrollments(result)
    setLoading(false)
  }

  const filtered = enrollments.filter(e => {
    const matchSearch = !search || e.course_title.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'in-progress' ? (e.progress_percent > 0 && e.progress_percent < 100) :
      filter === 'completed' ? e.progress_percent >= 100 :
      filter === 'not-started' ? e.progress_percent === 0 : true
    return matchSearch && matchFilter
  })

  const counts = {
    all: enrollments.length,
    'in-progress': enrollments.filter(e => e.progress_percent > 0 && e.progress_percent < 100).length,
    completed: enrollments.filter(e => e.progress_percent >= 100).length,
    'not-started': enrollments.filter(e => e.progress_percent === 0).length,
  }

  if (loading) return (
    <DashboardLayout activeSection="my-courses">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16, color: '#6b7280' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0b1525', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ fontSize: 14 }}>Loading your courses…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout activeSection="my-courses">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: 'clamp(1.3rem,3vw,1.7rem)', fontWeight: 800, color: '#0b1525' }}>
              📚 My Courses
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              {enrollments.length} course{enrollments.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
          <a href="/courses" style={{ padding: '10px 20px', background: '#0b1525', color: '#d4f01a', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-display,Sora,sans-serif)' }}>
            + Explore Courses
          </a>
        </div>

        {/* Filters + Search */}
        {enrollments.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'in-progress', 'completed', 'not-started'] as FilterType[]).map(f => {
              const labels: Record<FilterType, string> = {
                'all': `All (${counts.all})`,
                'in-progress': `▶ In Progress (${counts['in-progress']})`,
                'completed': `✅ Completed (${counts.completed})`,
                'not-started': `🆕 Not Started (${counts['not-started']})`,
              }
              const active = filter === f
              return (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid', borderColor: active ? '#0b1525' : '#e5e7eb', background: active ? '#0b1525' : '#fff', color: active ? '#d4f01a' : '#374151', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {labels[f]}
                </button>
              )
            })}
            <input
              type="text"
              placeholder="🔍 Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginLeft: 'auto', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 200 }}
            />
          </div>
        )}

        {/* Empty state */}
        {enrollments.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎓</div>
            <h2 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>No courses yet</h2>
            <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>Enroll in a course to start your learning journey</p>
            <a href="/courses" style={{ padding: '12px 28px', background: '#0b1525', color: '#d4f01a', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontFamily: 'var(--font-display,Sora,sans-serif)' }}>
              Browse Courses
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '60px 24px', textAlign: 'center', color: '#6b7280' }}>
            No courses match your filter.
          </div>
        ) : (
          <div className="courses-grid">
            {filtered.map(e => <CourseCard key={e.id} enrollment={e} />)}
          </div>
        )}

      </div>

      <style>{`
        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        @media(max-width:600px){
          .courses-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </DashboardLayout>
  )
}

function CourseCard({ enrollment: e }: { enrollment: Enrollment }) {
  const pct = e.progress_percent
  const isComplete = pct >= 100
  const isStarted = pct > 0

  const modeColors: Record<string, { bg: string; text: string }> = {
    online:  { bg: '#dbeafe', text: '#1e40af' },
    offline: { bg: '#fce7f3', text: '#9d174d' },
    hybrid:  { bg: '#d1fae5', text: '#065f46' },
  }
  const modeStyle = modeColors[e.course_mode] ?? { bg: '#f1f5f9', text: '#475569' }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${isComplete ? '#d4f01a' : '#e5e7eb'}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(11,21,37,0.1)'; (ev.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.boxShadow = 'none'; (ev.currentTarget as HTMLElement).style.transform = 'none' }}
    >
      {/* Thumbnail */}
      <div style={{ height: 160, background: 'linear-gradient(135deg,#0b1525,#1c3d7a)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {e.course_thumb
          ? <img src={e.course_thumb} alt={e.course_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📚</div>
        }
        {/* Completion ribbon */}
        {isComplete && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#d4f01a', color: '#0b1525', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6 }}>
            ✓ COMPLETED
          </div>
        )}
        {/* Progress overlay bar */}
        {!isComplete && isStarted && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.2)' }}>
            <div style={{ height: '100%', background: '#d4f01a', width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Mode + duration badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {e.course_mode && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: modeStyle.bg, color: modeStyle.text, textTransform: 'capitalize' }}>
              {e.course_mode}
            </span>
          )}
          {e.course_duration > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280' }}>
              ⏱ {e.course_duration} weeks
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: '1rem', lineHeight: 1.3, color: '#0b1525' }}>
          {e.course_title}
        </h3>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 5 }}>
            <span>Progress</span>
            <span style={{ fontWeight: 700, color: isComplete ? '#166534' : '#0b1525' }}>{pct}%</span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: 4, height: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: isComplete ? '#22c55e' : 'linear-gradient(90deg,#0b1525,#d4f01a)', width: `${pct}%`, transition: 'width 0.5s', borderRadius: 4 }} />
          </div>
        </div>

        {/* Enroll date */}
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          📅 Enrolled {new Date(e.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {/* Zoom links */}
        {e.zoom_links.length > 0 && (
          <div style={{ paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>🎥 Live Classes:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {e.zoom_links.map(z => (
                <a key={z.zoom_url} href={z.zoom_url} target="_blank" rel="noopener"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#eff6ff', color: '#1e40af', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid #bfdbfe' }}>
                  📹 {z.title || 'Join Live Class'}
                  {z.schedule_text && <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>· {z.schedule_text}</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CTA button */}
        <div style={{ marginTop: 'auto', paddingTop: 4 }}>
          {isComplete ? (
            <a href="/dashboard/certificates"
              style={{ display: 'block', textAlign: 'center', padding: '11px', background: '#d4f01a', color: '#0b1525', borderRadius: 10, fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
              📜 View Certificate
            </a>
          ) : (
            <a href={`/dashboard/course/${e.course_slug}`}
              style={{ display: 'block', textAlign: 'center', padding: '11px', background: '#0b1525', color: '#d4f01a', borderRadius: 10, fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
              {isStarted ? '▶ Continue Learning' : '🚀 Start Course'}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
