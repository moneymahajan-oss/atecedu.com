// src/components/admin/CoursesManager.tsx
// UPDATED: Added "Lessons" tab — manage chapters + YouTube lessons per course
// Existing course add/edit functionality UNCHANGED

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Course {
  id: string
  title: string
  slug: string
  mode: string
  fee_inr: number
  original_fee_inr: number | null
  duration_weeks: number
  is_active: boolean
  is_featured: boolean
  category: string | null
  level: string | null
  total_enrolled: number
  thumbnail_url: string | null
  short_description: string | null
  one_line_syllabus: string | null
  description_3line: string | null
  brochure_url: string | null
  demo_video_url: string | null
  rating: number | null
}

interface Chapter {
  id: string
  title: string
  sort_order: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  chapter_id: string
  title: string
  description: string | null
  youtube_video_id: string | null
  duration_seconds: number
  sort_order: number
  is_free_preview: boolean
  unlock_after_days: number
  pdf_url: string | null
  is_active: boolean
}

const EMPTY_FORM = {
  title: '', slug: '', short_description: '', mode: 'hybrid',
  fee_inr: 0, original_fee_inr: 0, duration_weeks: 8,
  category: '', level: 'Beginner', language: 'Hindi/English',
  certificate_offered: true, is_active: true, is_featured: false,
  thumbnail_url: '', promo_video_url: '', demo_zoom_url: '', one_line_syllabus: '', description_3line: '', brochure_url: '', demo_video_url: '',
  prerequisites: '', sort_order: 0,
}

const EMPTY_LESSON = {
  title: '', description: '', youtube_video_id: '', duration_seconds: 0,
  sort_order: 0, is_free_preview: false, unlock_after_days: 0,
  pdf_url: '', is_active: true,
}

type MainTab = 'courses' | 'lessons'

export default function CoursesManager() {
  const [mainTab, setMainTab] = useState<MainTab>('courses')

  // ── Courses tab state ────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // ── Lessons tab state ────────────────────────────────────
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [lessonForm, setLessonForm] = useState<any>(EMPTY_LESSON)
  const [editLessonId, setEditLessonId] = useState<string | null>(null)
  const [editChapterId, setEditChapterId] = useState<string | null>(null)
  const [lessonSaving, setLessonSaving] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [addingChapter, setAddingChapter] = useState(false)

  useEffect(() => { loadCourses() }, [])

  // ════════════════════════════════════════════════════════
  // COURSES FUNCTIONS
  // ════════════════════════════════════════════════════════

  async function loadCourses() {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })
    setCourses(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setForm(EMPTY_FORM); setEditId(null); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEdit(course: Course) {
    setForm({ ...EMPTY_FORM, ...course }); setEditId(course.id); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveCourse() {
    setSaving(true)
    // Spread form then override numeric fields; strip read-only DB columns
    const { id, total_enrolled, rating, created_at, updated_at, ...rest } = form
    const payload = {
      ...rest,
      fee_inr:           parseInt(rest.fee_inr) || 0,
      original_fee_inr:  parseInt(rest.original_fee_inr) || null,
      duration_weeks:    parseInt(rest.duration_weeks) || 0,
      sort_order:        parseInt(rest.sort_order) || 0,
      // Ensure empty strings are saved as NULL for optional fields
      one_line_syllabus: rest.one_line_syllabus?.trim()   || null,
      description_3line: rest.description_3line?.trim()   || null,
      brochure_url:      rest.brochure_url?.trim()        || null,
      demo_video_url:    rest.demo_video_url?.trim()      || null,
      promo_video_url:   rest.promo_video_url?.trim()     || null,
      demo_zoom_url:     rest.demo_zoom_url?.trim()       || null,
      prerequisites:     rest.prerequisites?.trim()       || null,
    }
    if (!payload.slug && payload.title) {
      payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }
    if (editId) {
      await supabase.from('courses').update(payload).eq('id', editId)
    } else {
      await supabase.from('courses').insert(payload)
    }
    setSaving(false); setShowForm(false); loadCourses()
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('courses').update({ is_active: !current }).eq('id', id)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from('courses').update({ is_featured: !current }).eq('id', id)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, is_featured: !current } : c))
  }

  // ════════════════════════════════════════════════════════
  // LESSONS FUNCTIONS
  // ════════════════════════════════════════════════════════

  async function loadLessons(course: Course) {
    setSelectedCourse(course)
    setLessonsLoading(true)

    const { data: chaptersData, error: chapErr } = await supabase
      .from('course_chapters')
      .select('id,title,sort_order')
      .eq('course_id', course.id)
      .order('sort_order')

    if (chapErr) console.error('Chapters error:', chapErr)

    const { data: lessonsData, error: lesErr } = await supabase
      .from('course_lessons')
      .select('id,chapter_id,title,description,youtube_video_id,duration_seconds,sort_order,is_free_preview,unlock_after_days,pdf_url,is_active')
      .eq('course_id', course.id)
      .eq('is_active', true)
      .order('sort_order')

    if (lesErr) console.error('Lessons error:', lesErr)

    const mapped: Chapter[] = (chaptersData ?? []).map((ch: any) => ({
      id: ch.id,
      title: ch.title,
      sort_order: ch.sort_order,
      lessons: (lessonsData ?? []).filter((l: any) => l.chapter_id === ch.id),
    }))

    setChapters(mapped)
    setLessonsLoading(false)
  }

  async function addChapter() {
    if (!selectedCourse || !newChapterTitle.trim()) return
    setAddingChapter(true)
    const maxOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.sort_order)) + 1 : 0
    await supabase.from('course_chapters').insert({
      course_id: selectedCourse.id,
      title: newChapterTitle.trim(),
      sort_order: maxOrder,
    })
    setNewChapterTitle('')
    setAddingChapter(false)
    await loadLessons(selectedCourse)
  }

  async function deleteChapter(chapterId: string) {
    if (!confirm('Delete this chapter and ALL its lessons?')) return
    await supabase.from('course_chapters').delete().eq('id', chapterId)
    setChapters(prev => prev.filter(c => c.id !== chapterId))
  }

  function openAddLesson(chapter: Chapter) {
    setLessonForm({ ...EMPTY_LESSON, sort_order: chapter.lessons.length })
    setEditLessonId(null)
    setEditChapterId(chapter.id)
    setShowLessonForm(true)
  }

  function openEditLesson(lesson: Lesson) {
    setLessonForm({ ...lesson })
    setEditLessonId(lesson.id)
    setEditChapterId(lesson.chapter_id)
    setShowLessonForm(true)
  }

  async function saveLesson() {
    if (!selectedCourse) { alert('No course selected'); return }
    if (!editChapterId) { alert('No chapter selected — please click + Add Lesson from a chapter'); return }
    if (!lessonForm.title?.trim()) { alert('Lesson title is required'); return }
    setLessonSaving(true)
    const payload = {
      course_id: selectedCourse.id,
      chapter_id: editChapterId,
      title: lessonForm.title.trim(),
      description: lessonForm.description?.trim() || null,
      youtube_video_id: lessonForm.youtube_video_id?.trim() || null,
      duration_seconds: parseInt(lessonForm.duration_seconds) || 0,
      sort_order: parseInt(lessonForm.sort_order) || 0,
      is_free_preview: !!lessonForm.is_free_preview,
      unlock_after_days: parseInt(lessonForm.unlock_after_days) || 0,
      pdf_url: lessonForm.pdf_url?.trim() || null,
      is_active: true,
    }
    console.log('Saving lesson payload:', JSON.stringify(payload))
    let saveError = null
    if (editLessonId) {
      const { error } = await supabase.from('course_lessons').update(payload).eq('id', editLessonId)
      saveError = error
    } else {
      const { error } = await supabase.from('course_lessons').insert(payload)
      saveError = error
    }
    if (saveError) {
      console.error('Lesson save error:', saveError)
      alert('Save failed: ' + saveError.message)
      setLessonSaving(false)
      return
    }
    setLessonSaving(false)
    setShowLessonForm(false)
    await loadLessons(selectedCourse)
  }
  async function deleteLesson(lessonId: string) {
    if (!confirm('Delete this lesson?')) return
    await supabase.from('course_lessons').delete().eq('id', lessonId)
    if (selectedCourse) loadLessons(selectedCourse)
  }

  function formatDuration(seconds: number) {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s > 0 ? s + 's' : ''}`.trim() : `${s}s`
  }

  // ════════════════════════════════════════════════════════
  // STYLES
  // ════════════════════════════════════════════════════════

  const update = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }))
  const lUpdate = (field: string, value: any) => setLessonForm((p: any) => ({ ...p, [field]: value }))
  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.5rem', fontWeight: '800' }}>📚 Courses Manager</h1>
        {mainTab === 'courses' && (
          <button onClick={openAdd} style={{ padding: '10px 22px', background: '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            + Add New Course
          </button>
        )}
        {mainTab === 'lessons' && selectedCourse && (
          <button onClick={() => { setSelectedCourse(null); setChapters([]) }} style={{ padding: '8px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            ← Back to Courses
          </button>
        )}
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['courses', 'lessons'] as MainTab[]).map(tab => (
          <button key={tab} onClick={() => setMainTab(tab)} style={{
            padding: '8px 20px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            background: mainTab === tab ? '#fff' : 'transparent',
            color: mainTab === tab ? '#1c3d7a' : '#64748b',
            fontWeight: mainTab === tab ? '700' : '500',
            fontSize: '13px',
            boxShadow: mainTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
            {tab === 'courses' ? '📚 Courses' : '🎬 Lessons'}
          </button>
        ))}
      </div>

      {/* ════════════ COURSES TAB ════════════ */}
      {mainTab === 'courses' && (
        <>
          {/* Add/Edit Form */}
          {showForm && (
            <div style={{ background: '#fff', borderRadius: '16px', border: '2px solid #1c3d7a', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '16px' }}>
                  {editId ? '✏️ Edit Course' : '➕ Add New Course'}
                </h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { label: 'Course Title *', field: 'title', type: 'text', span: 2 },
                  { label: 'Slug (URL)', field: 'slug', type: 'text', placeholder: 'auto-generated from title' },
                  { label: 'Category', field: 'category', type: 'text', placeholder: 'hardware, web, accounting...' },
                  { label: 'Short Description', field: 'short_description', type: 'text', span: 2 },
                  { label: 'Fee (₹)', field: 'fee_inr', type: 'number' },
                  { label: 'Original Fee (₹) — for strikethrough', field: 'original_fee_inr', type: 'number' },
                  { label: 'Duration (weeks)', field: 'duration_weeks', type: 'number' },
                  { label: 'Sort Order', field: 'sort_order', type: 'number' },
                  { label: 'Thumbnail URL', field: 'thumbnail_url', type: 'text', span: 2 },
                  { label: 'YouTube Promo Video ID', field: 'promo_video_url', type: 'text', placeholder: 'e.g. dQw4w9WgXcQ' },
                  { label: 'Demo Zoom URL', field: 'demo_zoom_url', type: 'text' },
                  { label: '🎯 One-Line Syllabus  (shown as heading on course page)', field: 'one_line_syllabus', type: 'text', span: 2, placeholder: 'e.g. Master Python from basics to AI in 8 weeks' },
                  { label: '📥 Brochure / Syllabus PDF URL (Google Drive or direct link)', field: 'brochure_url', type: 'text', span: 2, placeholder: 'https://drive.google.com/file/...' },
                  { label: '▶ Demo Video URL (YouTube or direct, shown as Watch button)', field: 'demo_video_url', type: 'text', span: 2, placeholder: 'https://youtu.be/...' },
                  { label: 'Prerequisites', field: 'prerequisites', type: 'text', span: 2 },
                ].map((f: any) => (
                  <div key={f.field} style={{ gridColumn: f.span === 2 ? '1 / -1' : 'auto' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                    <input type={f.type} value={form[f.field] ?? ''} placeholder={f.placeholder}
                      onChange={e => update(f.field, e.target.value)} style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>
                    📖 3-Line Description (shown on course page — 2 to 3 sentences about what students will get)
                  </label>
                  <textarea
                    value={form.description_3line ?? ''}
                    onChange={e => update('description_3line', e.target.value)}
                    placeholder={'Line 1: What the course covers.\nLine 2: What students will be able to do.\nLine 3: Certificate + key benefit.'}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.65', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Mode</label>
                  <select value={form.mode} onChange={e => update('mode', e.target.value)} style={{ ...inputStyle }}>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="classroom">Classroom</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Level</label>
                  <select value={form.level} onChange={e => update('level', e.target.value)} style={{ ...inputStyle }}>
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                  </select>
                </div>
                {[
                  { label: 'Active (visible on website)', field: 'is_active' },
                  { label: 'Featured (shown first)', field: 'is_featured' },
                  { label: 'Certificate Offered', field: 'certificate_offered' },
                ].map(t => (
                  <div key={t.field} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={!!form[t.field]} onChange={e => update(t.field, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1c3d7a' }} />
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{t.label}</label>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={saveCourse} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? '#94a3b8' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : editId ? '✅ Update Course' : '✅ Add Course'}
                </button>
                <button onClick={() => setShowForm(false)} style={{ padding: '12px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input type="text" placeholder="🔍 Search courses..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{filtered.length} courses</span>
          </div>

          {/* Courses table */}
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No courses found</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Course', 'Mode', 'Fee', 'Duration', 'Enrolled', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(course => (
                      <tr key={course.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                          <div style={{ fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{course.slug}</div>
                          {course.is_featured && <span style={{ background: '#fef9c3', color: '#713f12', fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', marginTop: '3px', display: 'inline-block' }}>⭐ Featured</span>}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: course.mode === 'online' ? '#dcfce7' : course.mode === 'hybrid' ? '#dbeafe' : '#fff7ed', color: course.mode === 'online' ? '#166534' : course.mode === 'hybrid' ? '#1e40af' : '#9a3412', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', textTransform: 'capitalize', fontSize: '11px' }}>
                            {course.mode}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '700', color: '#1c3d7a' }}>₹{course.fee_inr?.toLocaleString('en-IN')}</div>
                          {course.original_fee_inr && <div style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through' }}>₹{course.original_fee_inr.toLocaleString('en-IN')}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{course.duration_weeks}w</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{course.total_enrolled ?? 0}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => toggleActive(course.id, course.is_active)}
                            style={{ background: course.is_active ? '#dcfce7' : '#fee2e2', color: course.is_active ? '#166534' : '#991b1b', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                            {course.is_active ? '✅ Active' : '⭕ Inactive'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => openEdit(course)} style={{ padding: '5px 12px', background: '#eff6ff', color: '#1c3d7a', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>✏️ Edit</button>
                            <button onClick={() => { setMainTab('lessons'); loadLessons(course) }} style={{ padding: '5px 12px', background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🎬 Lessons</button>
                            <button onClick={() => toggleFeatured(course.id, course.is_featured)} style={{ padding: '5px 8px', background: course.is_featured ? '#fef9c3' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }} title={course.is_featured ? 'Unfeature' : 'Feature'}>⭐</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════ LESSONS TAB ════════════ */}
      {mainTab === 'lessons' && (
        <>
          {/* Course selector */}
          {!selectedCourse ? (
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px', marginBottom: '16px' }}>
                🎬 Select a Course to Manage Lessons
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {courses.filter(c => c.is_active).map(course => (
                  <button key={course.id} onClick={() => loadLessons(course)}
                    style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#1c3d7a'; e.currentTarget.style.background = '#eff6ff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{course.title}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{course.mode} · {course.duration_weeks}w</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Course header */}
              <div style={{ background: '#1c3d7a', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: '800', fontSize: '16px', color: '#fff' }}>
                    🎬 {selectedCourse.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                    {chapters.length} chapters · {chapters.reduce((s, c) => s + c.lessons.length, 0)} lessons total
                  </div>
                </div>
                <button onClick={() => { setSelectedCourse(null); setChapters([]) }}
                  style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  ← Change Course
                </button>
              </div>

              {/* Lesson form modal */}
              {showLessonForm && (
                <div style={{ background: '#fff', borderRadius: '16px', border: '2px solid #1c3d7a', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px' }}>
                      {editLessonId ? '✏️ Edit Lesson' : '➕ Add Lesson'}
                    </h3>
                    <button onClick={() => setShowLessonForm(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Lesson Title *</label>
                      <input value={lessonForm.title} onChange={e => lUpdate('title', e.target.value)} placeholder="e.g. Introduction to HTML"
                        style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Description (optional)</label>
                      <input value={lessonForm.description ?? ''} onChange={e => lUpdate('description', e.target.value)} placeholder="Brief description of this lesson"
                        style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>YouTube Video ID</label>
                      <input value={lessonForm.youtube_video_id ?? ''} onChange={e => lUpdate('youtube_video_id', e.target.value)} placeholder="dQw4w9WgXcQ (just the ID)"
                        style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                        From: youtube.com/watch?v=<strong>THIS_PART</strong>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Duration (seconds)</label>
                      <input type="number" value={lessonForm.duration_seconds} onChange={e => lUpdate('duration_seconds', e.target.value)} placeholder="600 = 10 minutes"
                        style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Sort Order</label>
                      <input type="number" value={lessonForm.sort_order} onChange={e => lUpdate('sort_order', e.target.value)}
                        style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Unlock After Days (drip)</label>
                      <input type="number" value={lessonForm.unlock_after_days} onChange={e => lUpdate('unlock_after_days', e.target.value)} placeholder="0 = immediate"
                        style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>PDF Resource URL (optional)</label>
                      <input value={lessonForm.pdf_url ?? ''} onChange={e => lUpdate('pdf_url', e.target.value)} placeholder="https://... (Supabase Storage or direct URL)"
                        style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" checked={!!lessonForm.is_free_preview} onChange={e => lUpdate('is_free_preview', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#1c3d7a' }} />
                      <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>Free Preview (non-enrolled can watch)</label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={saveLesson} disabled={lessonSaving}
                      style={{ flex: 1, padding: '11px', background: lessonSaving ? '#94a3b8' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: lessonSaving ? 'not-allowed' : 'pointer' }}>
                      {lessonSaving ? 'Saving...' : editLessonId ? '✅ Update Lesson' : '✅ Add Lesson'}
                    </button>
                    <button onClick={() => setShowLessonForm(false)}
                      style={{ padding: '11px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Add chapter */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)}
                  placeholder="New chapter title (e.g. Week 1: HTML Basics)"
                  style={{ flex: 1, padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && addChapter()}
                />
                <button onClick={addChapter} disabled={addingChapter || !newChapterTitle.trim()}
                  style={{ padding: '9px 20px', background: addingChapter ? '#94a3b8' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: addingChapter ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {addingChapter ? '...' : '+ Add Chapter'}
                </button>
              </div>

              {/* Chapters + lessons */}
              {lessonsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading lessons...</div>
              ) : chapters.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
                  <p>No chapters yet. Add your first chapter above.</p>
                </div>
              ) : (
                chapters.map((chapter, ci) => (
                  <div key={chapter.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {/* Chapter header */}
                    <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: '#1c3d7a', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{ci + 1}</span>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{chapter.title}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{chapter.lessons.length} lessons</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openAddLesson(chapter)}
                          style={{ padding: '5px 12px', background: '#eff6ff', color: '#1c3d7a', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          + Add Lesson
                        </button>
                        <button onClick={() => deleteChapter(chapter.id)}
                          style={{ padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Lessons list */}
                    {chapter.lessons.length === 0 ? (
                      <div style={{ padding: '16px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No lessons yet — click "+ Add Lesson" above
                      </div>
                    ) : (
                      chapter.lessons.map((lesson, li) => (
                        <div key={lesson.id} style={{ padding: '12px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', gap: '14px' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          {/* Lesson number */}
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: lesson.is_free_preview ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: lesson.is_free_preview ? '#166534' : '#64748b', flexShrink: 0 }}>
                            {li + 1}
                          </div>

                          {/* Video thumbnail indicator */}
                          <div style={{ width: '36px', height: '26px', borderRadius: '4px', background: lesson.youtube_video_id ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                            {lesson.youtube_video_id ? '▶' : '—'}
                          </div>

                          {/* Lesson info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {lesson.title}
                              {lesson.is_free_preview && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: '700', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '3px' }}>FREE</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
                              {lesson.youtube_video_id && <span style={{ fontSize: '11px', color: '#94a3b8' }}>YT: {lesson.youtube_video_id}</span>}
                              {lesson.duration_seconds > 0 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>⏱ {formatDuration(lesson.duration_seconds)}</span>}
                              {lesson.unlock_after_days > 0 && <span style={{ fontSize: '11px', color: '#f59e0b' }}>🔒 Day {lesson.unlock_after_days}</span>}
                              {lesson.pdf_url && <span style={{ fontSize: '11px', color: '#94a3b8' }}>📄 PDF</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button onClick={() => openEditLesson(lesson)}
                              style={{ padding: '4px 10px', background: '#eff6ff', color: '#1c3d7a', border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => deleteLesson(lesson.id)}
                              style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>
                              🗑
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
