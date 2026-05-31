// src/components/dashboard/MyCourses.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

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

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/login?redirect=/dashboard/my-courses'
        return
      }
      loadCourses(data.user.id)
    })
  }, [])

  async function loadCourses(userId: string) {
    const { data: enrollData } = await supabase
      .from('enrollments')
      .select(`
        id, course_id, enrolled_at, progress_percent,
        courses (title, slug, thumbnail_url, mode, duration_weeks)
      `)
      .eq('student_id', userId)
      .eq('payment_status', 'paid')
      .order('enrolled_at', { ascending: false })

    const enrollments: Enrollment[] = []
    for (const e of enrollData ?? []) {
      const { data: zoomData } = await supabase
        .from('zoom_links')
        .select('title, zoom_url, schedule_text')
        .eq('course_id', (e as any).course_id)
        .eq('is_active', true)

      enrollments.push({
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

    setEnrollments(enrollments)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading your courses...
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '800' }}>
          📚 My Courses
        </h1>
        <p style={{ color: '#6b7280', marginTop: '4px' }}>
          {enrollments.length} course{enrollments.length !== 1 ? 's' : ''} enrolled
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1.3rem', marginBottom: '8px' }}>No courses yet</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>Enroll in a course to get started</p>
          <a href="/courses" style={{ padding: '12px 28px', background: '#1c3d7a', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '700' }}>
            Browse Courses
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {enrollments.map(e => (
            <div key={e.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '0' }}>
                {/* Thumbnail */}
                <div style={{ width: '180px', flexShrink: 0, background: '#dbeafe', overflow: 'hidden' }}>
                  {e.course_thumb
                    ? <img src={e.course_thumb} alt={e.course_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>📚</div>
                  }
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '700', marginBottom: '6px' }}>
                        {e.course_title}
                      </h3>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                        <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', textTransform: 'capitalize' }}>
                          {e.course_mode}
                        </span>
                        <span>⏱ {e.course_duration} weeks</span>
                        <span>📅 Enrolled {new Date(e.enrolled_at).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <a href={`/courses/${e.course_slug}`} style={{ padding: '8px 18px', background: '#1c3d7a', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', flexShrink: 0 }}>
                      Continue Learning →
                    </a>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: '600', color: '#1c3d7a' }}>{e.progress_percent}%</span>
                    </div>
                    <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '7px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg,#1c3d7a,#d4f01a)', borderRadius: '4px', width: `${e.progress_percent}%`, transition: 'width 0.5s' }} />
                    </div>
                  </div>

                  {/* Zoom links */}
                  {e.zoom_links.length > 0 && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                        🎥 Live Classes:
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {e.zoom_links.map(z => (
                          <a
                            key={z.zoom_url}
                            href={z.zoom_url}
                            target="_blank"
                            rel="noopener"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              padding: '6px 14px',
                              background: '#eff6ff', color: '#1e40af',
                              borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                              textDecoration: 'none',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            📹 {z.title || 'Join Zoom Class'}
                            {z.schedule_text && <span style={{ fontWeight: '400', color: '#6b7280' }}>· {z.schedule_text}</span>}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
