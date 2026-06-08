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

type MainTab = 'courses' | 'lessons' | 'categories'

interface CatStyle {
  key: string       // matches course.category value e.g. "AI"
  label: string     // display name e.g. "AI & Machine Learning"
  color: string     // heading color e.g. "#7c3aed"
  bg_color: string  // row background e.g. "#f5f3ff"
}

const DEFAULT_CAT_STYLES: CatStyle[] = [
  { key: 'AI',          label: 'AI & Machine Learning',   color: '#7c3aed', bg_color: '#f5f3ff' },
  { key: 'web',         label: 'Web & Full-Stack',         color: '#0f2a5c', bg_color: '#eff6ff' },
  { key: 'accounting',  label: 'Commerce & Accounting',    color: '#065f46', bg_color: '#ecfdf5' },
  { key: 'hardware',    label: 'Hardware & Networking',    color: '#be123c', bg_color: '#fff1f2' },
  { key: 'design',      label: 'Design & Multimedia',      color: '#b45309', bg_color: '#fffbeb' },
  { key: 'linux',       label: 'Linux & Cybersecurity',    color: '#0891b2', bg_color: '#ecfeff' },
]

export default function CoursesManager() {
  const [mainTab, setMainTab] = useState<MainTab>('courses')

  // ── Courses tab state ────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploadingBrochure, setUploadingBrochure] = useState(false)
  // Syllabus editor — local working copy; synced to form.syllabus on every change
  const [syllabusWeeks, setSyllabusWeeks] = useState<{ week: number; topic: string; subtopics: string[] }[]>([])
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

  // ── Category Styles tab state ────────────────────────────
  const [catStyles, setCatStyles] = useState<CatStyle[]>(DEFAULT_CAT_STYLES)
  const [catStylesSaving, setCatStylesSaving] = useState(false)
  const [catStylesSaved, setCatStylesSaved] = useState(false)
  const [globalCardColors, setGlobalCardColors] = useState({
    card_bg_color: '#0b1525',
    card_body_bg: '#ffffff',
    card_title_color: '#1c1c1c',
    card_desc_color: '#475569',
    card_fee_color: '#0b1525',
    btn1_bg: '#ea580c',
    btn1_color: '#ffffff',
    btn2_bg: '#0b1525',
    btn2_color: '#ffffff',
    show_fee: true,
    section_title: 'Courses by Category',
    section_sub: 'What We Offer',
  })

  useEffect(() => { loadCourses(); loadCatStyles() }, [])

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
    setSyllabusWeeks([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEdit(course: Course) {
    setForm({ ...EMPTY_FORM, ...course }); setEditId(course.id); setShowForm(true)
    // Load existing syllabus into editor
    const existing = Array.isArray((course as any).syllabus)
      ? (course as any).syllabus
      : (typeof (course as any).syllabus === 'string'
          ? (() => { try { return JSON.parse((course as any).syllabus) } catch { return [] } })()
          : [])
    setSyllabusWeeks(existing.length ? existing : [])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveCourse() {
    setSaving(true)
    // Use syllabusWeeks directly (setState is async so form.syllabus may be stale)
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
      // Syllabus from the visual editor — filter empty weeks/topics
      syllabus: syllabusWeeks
        .filter(w => w.topic.trim())
        .map(w => ({
          week: w.week,
          topic: w.topic.trim(),
          subtopics: w.subtopics.filter(s => s.trim()).map(s => s.trim()),
        })),
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

  async function uploadBrochure(file: File) {
    if (!file) return
    setUploadingBrochure(true)
    try {
      // Sanitise filename
      const ext  = file.name.split('.').pop() || 'pdf'
      const name = 'brochure-' + Date.now() + '.' + ext
      const path = (form.slug || 'course') + '/' + name

      const { error } = await supabase.storage
        .from('course-brochures')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('course-brochures')
        .getPublicUrl(path)

      update('brochure_url', urlData.publicUrl)
    } catch (e: any) {
      alert('Upload failed: ' + (e.message ?? e))
    } finally {
      setUploadingBrochure(false)
    }
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
  // CATEGORY STYLES FUNCTIONS
  // ════════════════════════════════════════════════════════

  async function loadCatStyles() {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'course_categories')
      .single()
    if (data?.value) {
      // Load global card colors
      setGlobalCardColors(prev => ({
        ...prev,
        card_bg_color:    data.value.card_bg_color    || prev.card_bg_color,
        card_body_bg:     data.value.card_body_bg     || prev.card_body_bg,
        card_title_color: data.value.card_title_color || prev.card_title_color,
        card_desc_color:  data.value.card_desc_color  || prev.card_desc_color,
        card_fee_color:   data.value.card_fee_color   || prev.card_fee_color,
        btn1_bg:          data.value.btn1_bg          || prev.btn1_bg,
        btn1_color:       data.value.btn1_color       || prev.btn1_color,
        btn2_bg:          data.value.btn2_bg          || prev.btn2_bg,
        btn2_color:       data.value.btn2_color       || prev.btn2_color,
        show_fee:         data.value.show_fee !== false,
        section_title:    data.value.section_title    || prev.section_title,
        section_sub:      data.value.section_sub      || prev.section_sub,
      }))
      // Load category styles from existing categories if present
      if (data.value.categories?.length) {
        const mapped: CatStyle[] = data.value.categories.map((c: any) => ({
          key:      c.category_key || c.name?.toLowerCase().replace(/[^a-z0-9]+/g, '') || '',
          label:    c.name || '',
          color:    c.color || '#0b1525',
          bg_color: c.bg_color || '#f8fafc',
        }))
        if (mapped.length) setCatStyles(mapped)
      }
      // Also load from category_styles key if it exists (new format)
      const { data: csData } = await supabase.from('site_settings').select('value').eq('key','category_styles').single()
      if (csData?.value?.styles?.length) setCatStyles(csData.value.styles)
    }
  }

  async function saveCatStyles() {
    setCatStylesSaving(true)
    try {
      // 1. Save category styles (new single-source key)
      const stylesPayload = { styles: catStyles }
      await supabase.from('site_settings').upsert(
        { key: 'category_styles', value: stylesPayload },
        { onConflict: 'key' }
      )
      // 2. Update course_categories to preserve card colors + use new categories format
      const { data: existing } = await supabase.from('site_settings').select('value').eq('key','course_categories').single()
      const base = existing?.value || {}
      const updatedPayload = {
        ...base,
        ...globalCardColors,
        // Convert catStyles to the format index.astro expects
        categories: catStyles.map(cs => ({
          category_key: cs.key,
          name: cs.label,
          color: cs.color,
          bg_color: cs.bg_color,
          courses: [],  // courses are now read live from the courses table
        })),
      }
      await supabase.from('site_settings').upsert(
        { key: 'course_categories', value: updatedPayload },
        { onConflict: 'key' }
      )
      setCatStylesSaved(true)
      setTimeout(() => setCatStylesSaved(false), 2500)
    } catch(e) {
      alert('Save failed: ' + String(e))
    } finally {
      setCatStylesSaving(false)
    }
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
        {(['courses', 'categories', 'lessons'] as MainTab[]).map(tab => (
          <button key={tab} onClick={() => setMainTab(tab)} style={{
            padding: '8px 20px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            background: mainTab === tab ? '#fff' : 'transparent',
            color: mainTab === tab ? '#1c3d7a' : '#64748b',
            fontWeight: mainTab === tab ? '700' : '500',
            fontSize: '13px',
            boxShadow: mainTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
            {tab === 'courses' ? '📚 Courses' : tab === 'categories' ? '🎨 Category Styles' : '🎬 Lessons'}
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
                {/* Title — full width */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Course Title *</label>
                  <input type="text" value={form.title ?? ''} onChange={e => update('title', e.target.value)} style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                </div>
                {/* Slug */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Slug (URL)</label>
                  <input type="text" value={form.slug ?? ''} placeholder="auto-generated from title" onChange={e => update('slug', e.target.value)} style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                </div>
                {/* Category — dropdown from catStyles */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>
                    Category
                    {catStyles.length === 0 && (
                      <span style={{ fontSize: '11px', color: '#f59e0b', marginLeft: '8px', fontWeight: '400' }}>
                        ⚠ No categories yet — add them in the 🎨 Category Styles tab first
                      </span>
                    )}
                  </label>
                  <select value={form.category ?? ''} onChange={e => update('category', e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                    <option value="">— Select a category —</option>
                    {catStyles.map(cs => (
                      <option key={cs.key} value={cs.key}>{cs.label} ({cs.key})</option>
                    ))}
                    {/* If current value is not in catStyles list, still show it */}
                    {form.category && !catStyles.find(cs => cs.key === form.category) && (
                      <option value={form.category}>⚠ {form.category} (not in Category Styles)</option>
                    )}
                  </select>
                  {form.category && catStyles.find(cs => cs.key === form.category) && (
                    <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: catStyles.find(cs => cs.key === form.category)?.bg_color || '#fff', border: '1px solid #e2e8f0' }} />
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: catStyles.find(cs => cs.key === form.category)?.color || '#0b1525' }} />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Will show in <strong>{catStyles.find(cs => cs.key === form.category)?.label}</strong> row on homepage
                      </span>
                    </div>
                  )}
                </div>
                {/* Short Description — full width */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Short Description</label>
                  <input type="text" value={form.short_description ?? ''} onChange={e => update('short_description', e.target.value)} style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                </div>
                {/* Remaining fields via map */}
                {[
                  { label: 'Fee (₹)', field: 'fee_inr', type: 'number' },
                  { label: 'Original Fee (₹) — for strikethrough', field: 'original_fee_inr', type: 'number' },
                  { label: 'Duration (weeks)', field: 'duration_weeks', type: 'number' },
                  { label: 'Sort Order', field: 'sort_order', type: 'number' },
                  { label: 'Thumbnail URL', field: 'thumbnail_url', type: 'text', span: 2 },
                  { label: 'YouTube Promo Video ID', field: 'promo_video_url', type: 'text', placeholder: 'e.g. dQw4w9WgXcQ' },
                  { label: 'Demo Zoom URL', field: 'demo_zoom_url', type: 'text' },
                  { label: '🎯 One-Line Syllabus (shown as heading on course page)', field: 'one_line_syllabus', type: 'text', span: 2, placeholder: 'e.g. Master Python from basics to AI in 8 weeks' },
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
                {/* ── Brochure Upload Widget ── */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                    📥 Brochure / Syllabus PDF
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Upload button */}
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#0b1525', color: '#d4f01a', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: uploadingBrochure ? 'not-allowed' : 'pointer', opacity: uploadingBrochure ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {uploadingBrochure ? '⏳ Uploading...' : '📤 Upload PDF'}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        disabled={uploadingBrochure}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadBrochure(f); e.target.value = '' }}
                      />
                    </label>
                    {/* Current file link */}
                    {form.brochure_url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <a href={form.brochure_url} target="_blank" rel="noopener"
                          style={{ fontSize: 12, color: '#0284c7', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                          ✅ {form.brochure_url.split('/').pop()?.split('?')[0] || 'View file'}
                        </a>
                        <button type="button" onClick={() => update('brochure_url', '')}
                          style={{ fontSize: 11, color: '#ef4444', background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>No file uploaded yet</span>
                    )}
                  </div>
                  {/* Fallback: also allow direct URL paste */}
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>or paste URL:</span>
                    <input
                      type="text"
                      value={form.brochure_url ?? ''}
                      placeholder="https://drive.google.com/..."
                      onChange={e => update('brochure_url', e.target.value)}
                      style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '6px 10px' }}
                    />
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
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

              {/* ── SYLLABUS EDITOR ── */}
              <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#0b1525' }}>
                    📋 Course Syllabus (Week-by-Week)
                  </label>
                  <button type="button"
                    onClick={() => {
                      const next = [...syllabusWeeks, { week: syllabusWeeks.length + 1, topic: '', subtopics: [''] }]
                      setSyllabusWeeks(next)
                    }}
                    style={{ padding: '6px 14px', background: '#0b1525', color: '#d4f01a', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    + Add Week
                  </button>
                </div>

                {syllabusWeeks.length === 0 && (
                  <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', fontSize: '13px', color: '#9ca3af', border: '1px dashed #e2e8f0' }}>
                    No syllabus yet. Click "+ Add Week" to start building.
                  </div>
                )}

                {syllabusWeeks.map((week, wi) => (
                  <div key={wi} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', background: '#fafbfc' }}>
                    {/* Week header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ background: '#0b1525', color: '#d4f01a', fontFamily: 'Sora,sans-serif', fontWeight: '800', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', flexShrink: 0 }}>
                        Week {wi + 1}
                      </span>
                      <input
                        type="text"
                        value={week.topic}
                        placeholder="Week topic title (e.g. Introduction to AI)"
                        onChange={e => {
                          const next = syllabusWeeks.map((w, i) => i === wi ? { ...w, topic: e.target.value } : w)
                          setSyllabusWeeks(next)
                        }}
                        style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit' }}
                      />
                      <button type="button"
                        onClick={() => {
                          const next = syllabusWeeks.filter((_, i) => i !== wi).map((w, i) => ({ ...w, week: i + 1 }))
                          setSyllabusWeeks(next)
                        }}
                        style={{ padding: '6px 10px', background: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                        🗑 Remove Week
                      </button>
                    </div>

                    {/* Subtopics */}
                    <div style={{ paddingLeft: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topics / Bullet Points</div>
                      {week.subtopics.map((sub, si) => (
                        <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                          <span style={{ color: '#94a3b8', fontSize: '14px', flexShrink: 0 }}>•</span>
                          <input
                            type="text"
                            value={sub}
                            placeholder={`Topic ${si + 1}`}
                            onChange={e => {
                              const next = syllabusWeeks.map((w, i) => i === wi
                                ? { ...w, subtopics: w.subtopics.map((s, j) => j === si ? e.target.value : s) }
                                : w)
                              setSyllabusWeeks(next)
                            }}
                            onKeyDown={e => {
                              // Press Enter to add new subtopic
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const next = syllabusWeeks.map((w, i) => i === wi
                                  ? { ...w, subtopics: [...w.subtopics.slice(0, si + 1), '', ...w.subtopics.slice(si + 1)] }
                                  : w)
                                setSyllabusWeeks(next)
                              }
                            }}
                            style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', fontFamily: 'inherit' }}
                          />
                          <button type="button"
                            onClick={() => {
                              const next = syllabusWeeks.map((w, i) => i === wi
                                ? { ...w, subtopics: w.subtopics.filter((_, j) => j !== si) }
                                : w)
                              setSyllabusWeeks(next)
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', flexShrink: 0 }}>
                            ✕
                          </button>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => {
                          const next = syllabusWeeks.map((w, i) => i === wi
                            ? { ...w, subtopics: [...w.subtopics, ''] }
                            : w)
                          setSyllabusWeeks(next)
                        }}
                        style={{ marginTop: '4px', padding: '4px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '7px', color: '#1c3d7a', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                        + Add Topic
                      </button>
                    </div>
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
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {course.is_featured && <span style={{ background: '#fef9c3', color: '#713f12', fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', display: 'inline-block' }}>⭐ Featured</span>}
                            {course.category ? (() => {
                              const cs = catStyles.find(s => s.key === course.category)
                              return (
                                <span style={{ background: cs?.bg_color || '#f1f5f9', color: cs?.color || '#475569', fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '4px', display: 'inline-block', border: `1px solid ${cs?.color || '#e2e8f0'}33` }}>
                                  {cs ? cs.label : `⚠ ${course.category}`}
                                </span>
                              )
                            })() : (
                              <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '4px', display: 'inline-block' }}>No category</span>
                            )}
                          </div>
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

      {/* ════════════ CATEGORY STYLES TAB ════════════ */}
      {mainTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Info banner */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>💡</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e40af', marginBottom: '4px' }}>This is the master category list</div>
              <div style={{ fontSize: '12px', color: '#3b82f6', lineHeight: '1.6' }}>
                Categories defined here appear as a <strong>dropdown</strong> in the course edit form — no more free-typing.
                The <strong>Key</strong> is stored with each course and controls which homepage row it appears in.
                The <strong>Label</strong> is the display name shown on the homepage and in the admin dropdown.
              </div>
            </div>
          </div>

          {/* Global section settings */}
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px' }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#1e293b', marginBottom: '16px' }}>🏷️ Section Header</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { label: 'Section Title', field: 'section_title', placeholder: 'Courses by Category' },
                { label: 'Label Above Title', field: 'section_sub', placeholder: 'What We Offer' },
              ].map(f => (
                <div key={f.field}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                  <input type="text" value={(globalCardColors as any)[f.field] ?? ''} placeholder={f.placeholder}
                    onChange={e => setGlobalCardColors(p => ({ ...p, [f.field]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" checked={globalCardColors.show_fee}
                  onChange={e => setGlobalCardColors(p => ({ ...p, show_fee: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#1c3d7a' }} />
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>Show ₹ price on cards</label>
              </div>
            </div>
          </div>

          {/* Global card colors */}
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px' }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#1e293b', marginBottom: '16px' }}>🎨 Global Card Color Scheme</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { label: 'Thumbnail BG Color', field: 'card_bg_color' },
                { label: 'Card Body Background', field: 'card_body_bg' },
                { label: 'Course Title Color', field: 'card_title_color' },
                { label: 'Description Color', field: 'card_desc_color' },
                { label: 'Price Color', field: 'card_fee_color' },
                { label: 'Enquire Button BG', field: 'btn1_bg' },
                { label: 'Enquire Button Text', field: 'btn1_color' },
                { label: 'Syllabus Button BG', field: 'btn2_bg' },
                { label: 'Syllabus Button Text', field: 'btn2_color' },
              ].map(f => (
                <div key={f.field} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: (globalCardColors as any)[f.field] || '#fff', border: '2px solid #e2e8f0', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                    <input type="text" value={(globalCardColors as any)[f.field] ?? ''}
                      onChange={e => setGlobalCardColors(p => ({ ...p, [f.field]: e.target.value }))}
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }}
                      placeholder="#0b1525" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-category styles */}
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>📂 Category Display Settings</div>
              <button onClick={() => setCatStyles(p => [...p, { key: '', label: '', color: '#0b1525', bg_color: '#f8fafc' }])}
                style={{ padding: '7px 16px', background: '#0b1525', color: '#d4f01a', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                + Add Category
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px', background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', lineHeight: '1.6' }}>
              The <strong>Category Key</strong> must exactly match what you type in the <em>Category</em> field of each course (case-sensitive).
              Example: if courses have <code>category = "AI"</code>, set the key to <code>AI</code> here.
            </div>
            {catStyles.map((cs, i) => (
              <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '10px', background: cs.bg_color || '#fafbfc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 100px auto', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Category Key (matches course field)</label>
                    <input type="text" value={cs.key} placeholder="e.g. AI, web, hardware"
                      onChange={e => setCatStyles(p => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Display Name</label>
                    <input type="text" value={cs.label} placeholder="e.g. AI & Machine Learning"
                      onChange={e => setCatStyles(p => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Heading Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: cs.color || '#0b1525', border: '2px solid #e2e8f0', flexShrink: 0 }} />
                      <input type="text" value={cs.color} placeholder="#7c3aed"
                        onChange={e => setCatStyles(p => p.map((x, j) => j === i ? { ...x, color: e.target.value } : x))}
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Row Background</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: cs.bg_color || '#fff', border: '2px solid #e2e8f0', flexShrink: 0 }} />
                      <input type="text" value={cs.bg_color} placeholder="#f5f3ff"
                        onChange={e => setCatStyles(p => p.map((x, j) => j === i ? { ...x, bg_color: e.target.value } : x))}
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} />
                    </div>
                  </div>
                  <button onClick={() => setCatStyles(p => p.filter((_, j) => j !== i))}
                    style={{ padding: '7px 10px', background: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-end' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {catStyles.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '1px dashed #e2e8f0', borderRadius: '10px' }}>
                No categories yet. Click "+ Add Category" above.
              </div>
            )}
          </div>

          {/* Save button */}
          <button onClick={saveCatStyles} disabled={catStylesSaving}
            style={{ padding: '13px', background: catStylesSaved ? '#166534' : catStylesSaving ? '#94a3b8' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: catStylesSaving ? 'not-allowed' : 'pointer' }}>
            {catStylesSaved ? '✅ Saved! Reload homepage to see.' : catStylesSaving ? 'Saving...' : '💾 Save Category Styles'}
          </button>

          {/* Link to courses manager */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', fontSize: '13px', color: '#166534' }}>
            <strong>To add/edit courses:</strong> Switch to the <button onClick={() => setMainTab('courses')} style={{ background: 'none', border: 'none', color: '#166534', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer', padding: '0', fontSize: '13px' }}>📚 Courses tab</button>.
            The Category field there is a <strong>dropdown</strong> — it shows exactly the categories you define above.
            Save categories here first, then they'll appear as selectable options when adding/editing any course.
          </div>
        </div>
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
