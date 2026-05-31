// src/components/admin/CoursesManager.tsx
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
  rating: number | null
}

const EMPTY_FORM = {
  title: '', slug: '', short_description: '', mode: 'hybrid',
  fee_inr: 0, original_fee_inr: 0, duration_weeks: 8,
  category: '', level: 'Beginner', language: 'Hindi/English',
  certificate_offered: true, is_active: true, is_featured: false,
  thumbnail_url: '', promo_video_url: '', demo_zoom_url: '',
  prerequisites: '', sort_order: 0,
}

export default function CoursesManager() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    const { data } = await supabase.from('courses').select('id,title,slug,mode,fee_inr,original_fee_inr,duration_weeks,is_active,is_featured,category,level,total_enrolled,thumbnail_url,short_description,rating').order('sort_order').order('created_at', { ascending: false })
    setCourses(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEdit(course: Course) {
    setForm({ ...EMPTY_FORM, ...course })
    setEditId(course.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveCourse() {
    setSaving(true)
    const payload = {
      ...form,
      fee_inr: parseInt(form.fee_inr) || 0,
      original_fee_inr: parseInt(form.original_fee_inr) || null,
      duration_weeks: parseInt(form.duration_weeks) || 0,
      sort_order: parseInt(form.sort_order) || 0,
    }
    if (!payload.slug && payload.title) {
      payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }
    if (editId) {
      await supabase.from('courses').update(payload).eq('id', editId)
    } else {
      await supabase.from('courses').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    loadCourses()
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('courses').update({ is_active: !current }).eq('id', id)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from('courses').update({ is_featured: !current }).eq('id', id)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, is_featured: !current } : c))
  }

  const update = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }))
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }

  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.5rem', fontWeight: '800' }}>📚 Courses Manager</h1>
        <button onClick={openAdd} style={{ padding: '10px 22px', background: '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
          + Add New Course
        </button>
      </div>

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
              { label: 'Prerequisites', field: 'prerequisites', type: 'text', span: 2 },
            ].map((f: any) => (
              <div key={f.field} style={{ gridColumn: f.span === 2 ? '1 / -1' : 'auto' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                <input
                  type={f.type} value={form[f.field] ?? ''} placeholder={f.placeholder}
                  onChange={e => update(f.field, e.target.value)} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            ))}

            {/* Selects */}
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
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>

            {/* Toggles */}
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
        <input
          type="text" placeholder="🔍 Search courses..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
        />
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
                      <button
                        onClick={() => toggleActive(course.id, course.is_active)}
                        style={{ background: course.is_active ? '#dcfce7' : '#fee2e2', color: course.is_active ? '#166534' : '#991b1b', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        {course.is_active ? '✅ Active' : '⭕ Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEdit(course)} style={{ padding: '5px 12px', background: '#eff6ff', color: '#1c3d7a', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>✏️ Edit</button>
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
    </div>
  )
}
