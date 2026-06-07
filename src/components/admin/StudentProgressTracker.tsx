// src/components/admin/StudentProgressTracker.tsx
// Admin LMS view: all students, their enrolled courses, lesson progress,
// session attendance, certificates earned. Full Graphy-style tracking.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Student {
  id: string
  full_name: string | null
  phone: string | null
  city: string | null
  created_at: string
  enrollments: Enrollment[]
  cert_count: number
}

interface Enrollment {
  id: string
  course_id: string
  course_title: string
  course_slug: string
  course_thumb: string | null
  enrolled_at: string
  payment_status: string
  progress_percent: number
  completed_at: string | null
  amount_paid: number | null
  lesson_count: number
  lessons_done: number
}

type Tab = 'overview' | 'student'

export default function StudentProgressTracker() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState<Tab>('overview')
  const [selected, setSelected] = useState<Student | null>(null)
  const [msg, setMsg]           = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      // Get all student profiles
      const { data: profiles } = await supabase
        .from('student_profiles')
        .select('id,full_name,phone,city,created_at')
        .order('created_at', { ascending: false })
        .limit(300)

      if (!profiles) { setLoading(false); return }

      // Get all enrollments with course info
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('id,student_id,course_id,enrolled_at,payment_status,progress_percent,completed_at,amount_paid,courses(title,slug,thumbnail_url)')

      // Get lesson progress summary
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('student_id,course_id,is_completed')

      // Get lesson counts per course
      const { data: lessonData } = await supabase
        .from('course_lessons')
        .select('course_id,id')
        .eq('is_active', true)

      // Get certificates
      const { data: certData } = await supabase
        .from('generated_certificates')
        .select('student_id,id')
        .eq('is_active', true)

      // Build lookup maps
      const lessonCountMap: Record<string, number> = {}
      for (const l of lessonData ?? []) {
        lessonCountMap[l.course_id] = (lessonCountMap[l.course_id] ?? 0) + 1
      }

      const progressMap: Record<string, Record<string, number>> = {}
      for (const p of progressData ?? []) {
        if (!progressMap[p.student_id]) progressMap[p.student_id] = {}
        if (!progressMap[p.student_id][p.course_id]) progressMap[p.student_id][p.course_id] = 0
        if (p.is_completed) progressMap[p.student_id][p.course_id]++
      }

      const certMap: Record<string, number> = {}
      for (const c of certData ?? []) {
        certMap[c.student_id] = (certMap[c.student_id] ?? 0) + 1
      }

      // Map enrollments per student
      const enrollMap: Record<string, Enrollment[]> = {}
      for (const e of enrollData ?? []) {
        const sid = (e as any).student_id
        if (!enrollMap[sid]) enrollMap[sid] = []
        enrollMap[sid].push({
          id:               (e as any).id,
          course_id:        (e as any).course_id,
          course_title:     (e as any).courses?.title ?? '(unknown)',
          course_slug:      (e as any).courses?.slug ?? '',
          course_thumb:     (e as any).courses?.thumbnail_url ?? null,
          enrolled_at:      (e as any).enrolled_at,
          payment_status:   (e as any).payment_status,
          progress_percent: (e as any).progress_percent ?? 0,
          completed_at:     (e as any).completed_at ?? null,
          amount_paid:      (e as any).amount_paid ?? null,
          lesson_count:     lessonCountMap[(e as any).course_id] ?? 0,
          lessons_done:     progressMap[sid]?.[(e as any).course_id] ?? 0,
        })
      }

      setStudents(profiles.map(p => ({
        ...p,
        enrollments: enrollMap[p.id] ?? [],
        cert_count: certMap[p.id] ?? 0,
      })))

    } catch (e: any) {
      setMsg('Load error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = students.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.full_name?.toLowerCase().includes(q) ||
           s.phone?.includes(q) ||
           s.city?.toLowerCase().includes(q) ||
           s.enrollments.some(e => e.course_title.toLowerCase().includes(q))
  })

  const totalEnrolled  = students.reduce((n, s) => n + s.enrollments.filter(e => ['paid','free'].includes(e.payment_status)).length, 0)
  const totalCompleted = students.reduce((n, s) => n + s.enrollments.filter(e => e.progress_percent >= 100).length, 0)
  const totalRevenue   = students.reduce((n, s) => n + s.enrollments.reduce((a, e) => a + (e.amount_paid ?? 0), 0), 0)

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    paid:    { bg: '#dcfce7', text: '#166534' },
    free:    { bg: '#f3e8ff', text: '#6b21a8' },
    pending: { bg: '#fef9c3', text: '#713f12' },
    failed:  { bg: '#fee2e2', text: '#991b1b' },
  }

  function openStudent(s: Student) {
    setSelected(s)
    setTab('student')
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#0b1525', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
      Loading student progress...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#0f1724' }}>
            📈 Student Progress
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {students.length} students · {totalEnrolled} enrollments · {totalCompleted} completions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {tab === 'student' && (
            <button onClick={() => { setTab('overview'); setSelected(null) }}
              style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ← All Students
            </button>
          )}
          <button onClick={load}
            style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {msg && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>{msg}</div>}

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
            {[
              { icon: '👥', label: 'Total Students', value: students.length, accent: '#dbeafe', textColor: '#1e40af' },
              { icon: '🎓', label: 'Total Enrollments', value: totalEnrolled, accent: '#dcfce7', textColor: '#166534' },
              { icon: '✅', label: 'Completions', value: totalCompleted, accent: '#fef3c7', textColor: '#92400e' },
              { icon: '💳', label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, accent: '#f3e8ff', textColor: '#6b21a8' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: '1.4rem', fontWeight: 800, color: s.textColor, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Search by student name, phone, city, or course..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '10px 16px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', width: '100%' }}
          />

          {/* Students table */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>No students found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Student', 'Contact', 'Enrolled', 'Avg Progress', 'Completed', 'Certs', 'Joined', 'Action'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', background: '#f8fafc', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => {
                      const activeEnrolls = s.enrollments.filter(e => ['paid','free'].includes(e.payment_status))
                      const avgProgress = activeEnrolls.length
                        ? Math.round(activeEnrolls.reduce((a, e) => a + e.progress_percent, 0) / activeEnrolls.length)
                        : 0
                      const completed = activeEnrolls.filter(e => e.progress_percent >= 100).length

                      return (
                        <tr key={s.id}
                          onMouseEnter={ev => (ev.currentTarget.style.background = '#fafbfc')}
                          onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                        >
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>
                            <div style={{ fontWeight: 700 }}>{s.full_name || '(no name)'}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{s.id.slice(0,8)}…</div>
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>
                            <div>{s.phone || '—'}</div>
                            <div style={{ fontSize: 11 }}>{s.city || '—'}</div>
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 700 }}>
                            {activeEnrolls.length}
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 60, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: 'linear-gradient(90deg,#0b1525,#d4f01a)', width: `${avgProgress}%` }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{avgProgress}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                            <span style={{ fontWeight: 700, color: completed > 0 ? '#166534' : '#9ca3af' }}>
                              {completed}/{activeEnrolls.length}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                            <span style={{ fontWeight: 700, color: s.cert_count > 0 ? '#6b21a8' : '#9ca3af' }}>
                              {s.cert_count > 0 ? `📜 ${s.cert_count}` : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 12, color: '#9ca3af' }}>
                            {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
                            <button onClick={() => openStudent(s)}
                              style={{ padding: '6px 14px', background: '#0b1525', color: '#d4f01a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              View →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Student detail tab ── */}
      {tab === 'student' && selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Student header */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0b1525', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#d4f01a', flexShrink: 0 }}>
                {(selected.full_name?.[0] ?? 'S').toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '1.2rem' }}>{selected.full_name || '(no name)'}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  📞 {selected.phone || '—'} · 📍 {selected.city || '—'} · Joined {new Date(selected.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                {[
                  { label: 'Enrolled', value: selected.enrollments.filter(e => ['paid','free'].includes(e.payment_status)).length },
                  { label: 'Completed', value: selected.enrollments.filter(e => e.progress_percent >= 100).length },
                  { label: 'Certificates', value: selected.cert_count },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#0b1525' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Courses */}
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: '1rem', color: '#0f1724' }}>📚 Enrolled Courses</div>

          {selected.enrollments.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              This student has no enrollments yet.
            </div>
          ) : (
            selected.enrollments.map(e => {
              const pct = e.progress_percent
              const statusStyle = STATUS_COLORS[e.payment_status] ?? { bg: '#f1f5f9', text: '#475569' }

              return (
                <div key={e.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {/* Thumbnail */}
                    <div style={{ width: 120, background: '#dbeafe', flexShrink: 0, overflow: 'hidden' }}>
                      {e.course_thumb
                        ? <img src={e.course_thumb} alt={e.course_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📚</div>
                      }
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15 }}>{e.course_title}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                            Enrolled {new Date(e.enrolled_at).toLocaleDateString('en-IN')}
                            {e.amount_paid ? ` · ₹${e.amount_paid.toLocaleString('en-IN')}` : ''}
                          </div>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: statusStyle.bg, color: statusStyle.text }}>
                          {e.payment_status}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                          <span>Progress</span>
                          <span style={{ fontWeight: 700, color: pct >= 100 ? '#166534' : '#0b1525' }}>
                            {pct >= 100 ? '✅ Completed' : `${pct}%`}
                          </span>
                        </div>
                        <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg,#0b1525,#d4f01a)', width: `${pct}%`, transition: 'width 0.5s' }} />
                        </div>
                      </div>

                      {/* Lessons completed */}
                      {e.lesson_count > 0 && (
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          📹 {e.lessons_done}/{e.lesson_count} lessons completed
                          {e.completed_at && <span style={{ marginLeft: 10 }}>· 🏁 Completed {new Date(e.completed_at).toLocaleDateString('en-IN')}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
