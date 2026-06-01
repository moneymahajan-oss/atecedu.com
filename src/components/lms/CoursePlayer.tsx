// src/components/lms/CoursePlayer.tsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface Lesson {
  id: string
  title: string
  video_url: string | null
  duration_minutes: number
  is_free_preview: boolean
  sort_order: number
  is_completed: boolean
  watch_percent: number
}

interface Chapter {
  id: string
  title: string
  sort_order: number
  lessons: Lesson[]
}

interface Props {
  courseId: string
  courseTitle: string
  courseSlug: string
}

export default function CoursePlayer({ courseId, courseTitle, courseSlug }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    init()
    return () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current) }
  }, [courseId])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = `/login?redirect=/dashboard/course/${courseSlug}`; return }
    setUserId(user.id)

    // Check enrollment
    const { data: enroll } = await supabase
      .from('enrollments')
      .select('id, progress_percent')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .eq('payment_status', 'paid')
      .single()

    if (!enroll) { window.location.href = `/courses/${courseSlug}`; return }
    setEnrolled(true)
    setProgress(enroll.progress_percent ?? 0)
    await loadContent(user.id)
  }

  async function loadContent(uid: string) {
    const [{ data: chaptersData }, { data: progressData }] = await Promise.all([
      supabase.from('course_chapters')
        .select('id,title,sort_order,course_lessons(id,title,video_url,duration_minutes,is_free_preview,sort_order)')
        .eq('course_id', courseId).eq('is_active', true).order('sort_order'),
      supabase.from('lesson_progress')
        .select('lesson_id,is_completed,watch_percent')
        .eq('student_id', uid).eq('course_id', courseId),
    ])

    const progressMap: Record<string, { is_completed: boolean; watch_percent: number }> = {}
    for (const p of progressData ?? []) {
      progressMap[p.lesson_id] = { is_completed: p.is_completed, watch_percent: p.watch_percent }
    }

    const mapped: Chapter[] = (chaptersData ?? []).map((ch: any) => ({
      id: ch.id,
      title: ch.title,
      sort_order: ch.sort_order,
      lessons: (ch.course_lessons ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((l: any) => ({
          ...l,
          is_completed: progressMap[l.id]?.is_completed ?? false,
          watch_percent: progressMap[l.id]?.watch_percent ?? 0,
        })),
    }))

    setChapters(mapped)

    // Open first chapter, set first incomplete lesson as active
    if (mapped.length > 0) {
      setOpenChapters(new Set([mapped[0].id]))
      const firstIncomplete = mapped.flatMap(c => c.lessons).find(l => !l.is_completed)
      setActiveLesson(firstIncomplete ?? mapped[0].lessons[0] ?? null)
    }
    setLoading(false)
  }

  async function markComplete(lesson: Lesson) {
    if (!userId || saving) return
    setSaving(true)
    await supabase.from('lesson_progress').upsert({
      student_id: userId,
      lesson_id: lesson.id,
      course_id: courseId,
      is_completed: true,
      watch_percent: 100,
      completed_at: new Date().toISOString(),
    })

    // Update local state
    setChapters(prev => prev.map(ch => ({
      ...ch,
      lessons: ch.lessons.map(l => l.id === lesson.id ? { ...l, is_completed: true, watch_percent: 100 } : l)
    })))

    // Recalculate progress
    const allLessons = chapters.flatMap(c => c.lessons)
    const completedCount = allLessons.filter(l => l.id === lesson.id || l.is_completed).length
    const newProgress = Math.round((completedCount / allLessons.length) * 100)
    setProgress(newProgress)

    // Move to next lesson
    const flat = chapters.flatMap(c => c.lessons)
    const idx = flat.findIndex(l => l.id === lesson.id)
    if (idx < flat.length - 1) {
      setActiveLesson(flat[idx + 1])
    }
    setSaving(false)
  }

  function toggleChapter(id: string) {
    setOpenChapters(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalLessons = chapters.flatMap(c => c.lessons).length
  const completedLessons = chapters.flatMap(c => c.lessons).filter(l => l.is_completed).length

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#6b7280' }}>
      <div style={{ fontSize: '32px' }}>⏳</div>
      <p>Loading your course...</p>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: '100vh', background: '#0f172a' }}>

      {/* Main player */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ background: '#1e293b', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <a href="/dashboard/my-courses" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← My Courses
          </a>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {courseTitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
              {completedLessons}/{totalLessons} lessons
            </div>
            <div style={{ width: '80px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#d4f01a', borderRadius: '4px', width: `${progress}%`, transition: 'width 0.5s' }} />
            </div>
            <span style={{ fontSize: '12px', color: '#d4f01a', fontWeight: '700' }}>{progress}%</span>
          </div>
        </div>

        {/* Video area */}
        <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', position: 'relative' }}>
          {activeLesson?.video_url ? (
            <div style={{ position: 'absolute', inset: 0 }}>
              <iframe
                key={activeLesson.id}
                src={`https://www.youtube.com/embed/${activeLesson.video_url}?autoplay=1&rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={activeLesson.title}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
              <p style={{ fontSize: '15px' }}>No video for this lesson</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>Watch the Zoom class recording or read the notes below</p>
            </div>
          )}
        </div>

        {/* Lesson info + actions */}
        {activeLesson && (
          <div style={{ background: '#1e293b', padding: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                  {activeLesson.title}
                </h2>
                {activeLesson.duration_minutes > 0 && (
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>⏱ {activeLesson.duration_minutes} minutes</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {activeLesson.is_completed ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#166534', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}>
                    ✅ Completed
                  </div>
                ) : (
                  <button
                    onClick={() => markComplete(activeLesson)}
                    disabled={saving}
                    style={{ padding: '10px 20px', background: '#d4f01a', color: '#0f2347', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}
                  >
                    {saving ? '⏳ Saving...' : '✅ Mark as Complete'}
                  </button>
                )}
                <a href={`/dashboard/quiz?course=${courseId}`} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                  📝 Take Quiz
                </a>
              </div>
            </div>

            {progress === 100 && (
              <div style={{ marginTop: '16px', padding: '14px 20px', background: 'rgba(212,240,26,0.1)', border: '1px solid rgba(212,240,26,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ color: '#d4f01a', fontWeight: '700', fontSize: '14px' }}>
                  🎉 Course Complete! Your certificate is ready.
                </div>
                <a href="/dashboard/certificates" style={{ padding: '8px 18px', background: '#d4f01a', color: '#0f2347', borderRadius: '8px', fontWeight: '800', fontSize: '13px', textDecoration: 'none' }}>
                  Download Certificate →
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chapter/Lesson sidebar */}
      <div style={{ background: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.08)', overflow: 'auto', maxHeight: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px', color: '#fff' }}>
          Course Content
        </div>
        {chapters.map(chapter => (
          <div key={chapter.id}>
            <button
              onClick={() => toggleChapter(chapter.id)}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', color: '#fff' }}>{chapter.title}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {chapter.lessons.filter(l => l.is_completed).length}/{chapter.lessons.length} completed
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px', transition: 'transform 0.2s', transform: openChapters.has(chapter.id) ? 'rotate(180deg)' : '' }}>▾</span>
            </button>

            {openChapters.has(chapter.id) && chapter.lessons.map(lesson => (
              <button
                key={lesson.id}
                onClick={() => setActiveLesson(lesson)}
                style={{
                  width: '100%', padding: '10px 16px 10px 28px',
                  background: activeLesson?.id === lesson.id ? 'rgba(212,240,26,0.1)' : 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', textAlign: 'left',
                  borderLeft: activeLesson?.id === lesson.id ? '3px solid #d4f01a' : '3px solid transparent',
                }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: lesson.is_completed ? '#22c55e' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px' }}>
                  {lesson.is_completed ? '✓' : '▶'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: activeLesson?.id === lesson.id ? '#d4f01a' : lesson.is_completed ? 'rgba(255,255,255,0.6)' : '#fff', fontWeight: activeLesson?.id === lesson.id ? '700' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lesson.title}
                  </div>
                  {lesson.duration_minutes > 0 && (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {lesson.duration_minutes}m
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @media(max-width:900px){
          div[style*="grid-template-columns: 1fr 320px"]{
            grid-template-columns:1fr!important;
          }
          div[style*="position: sticky; top: 0"]{
            position:static!important;max-height:none!important;
          }
        }
      `}</style>
    </div>
  )
}
