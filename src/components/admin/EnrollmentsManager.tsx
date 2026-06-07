// src/components/admin/EnrollmentsManager.tsx
// Admin tool to view ALL enrollments + manually enroll any student into any course
// This is how admin (atecgsp@gmail.com) gets enrolled without going through checkout

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Enrollment {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
  payment_status: string
  payment_id: string | null
  amount_paid: number | null
  progress_percent: number
  student_name: string
  student_email: string
  course_title: string
  course_slug: string
}

interface Course {
  id: string
  title: string
  slug: string
  fee_inr: number
  is_active: boolean
}

interface StudentProfile {
  id: string
  full_name: string
  phone: string | null
  email?: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid:     { bg: '#dcfce7', text: '#166534' },
  pending:  { bg: '#fef9c3', text: '#713f12' },
  failed:   { bg: '#fee2e2', text: '#991b1b' },
  refunded: { bg: '#e0e7ff', text: '#3730a3' },
  free:     { bg: '#f3e8ff', text: '#6b21a8' },
}

export default function EnrollmentsManager() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Add enrollment form state
  const [addForm, setAddForm] = useState({
    student_id: '',
    course_id: '',
    payment_status: 'paid',
    amount_paid: '',
    payment_id: '',
    note: '',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      // Load enrollments + courses (no student_profiles join — no FK in schema cache)
      const { data: enData, error } = await supabase
        .from('enrollments')
        .select('id, student_id, course_id, enrolled_at, payment_status, payment_id, amount_paid, progress_percent, courses ( title, slug )')
        .order('enrolled_at', { ascending: false })
        .limit(300)

      if (error) throw error

      // Load student profiles separately — match by student_id in JS
      const { data: authData } = await supabase
        .from('student_profiles')
        .select('id, full_name, phone')
        .order('full_name')

      setStudents(authData ?? [])

      // Build profile lookup map
      const profileMap: Record<string, { full_name: string; phone: string }> = {}
      for (const p of authData ?? []) {
        profileMap[p.id] = { full_name: p.full_name ?? '', phone: p.phone ?? '' }
      }

      const mapped: Enrollment[] = (enData ?? []).map((e: any) => ({
        id: e.id,
        student_id: e.student_id,
        course_id: e.course_id,
        enrolled_at: e.enrolled_at,
        payment_status: e.payment_status,
        payment_id: e.payment_id,
        amount_paid: e.amount_paid,
        progress_percent: e.progress_percent ?? 0,
        student_name: profileMap[e.student_id]?.full_name || '(no profile)',
        student_email: '',
        course_title: e.courses?.title ?? '(unknown course)',
        course_slug: e.courses?.slug ?? '',
      }))

      setEnrollments(mapped)

      // Load all active courses for the add-enrollment dropdown
      const { data: cData } = await supabase
        .from('courses')
        .select('id, title, slug, fee_inr, is_active')
        .eq('is_active', true)
        .order('title')

      setCourses(cData ?? [])
    } catch (e: any) {
      setMsg({ type: 'err', text: 'Load failed: ' + (e.message ?? e) })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddEnrollment() {
    if (!addForm.student_id || !addForm.course_id) {
      setMsg({ type: 'err', text: 'Please select both a student and a course.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const payload: any = {
        student_id: addForm.student_id,
        course_id: addForm.course_id,
        payment_status: addForm.payment_status,
        enrolled_at: new Date().toISOString(),
        progress_percent: 0,
      }
      if (addForm.amount_paid) payload.amount_paid = parseInt(addForm.amount_paid)
      if (addForm.payment_id) payload.payment_id = addForm.payment_id

      const { error } = await supabase
        .from('enrollments')
        .upsert([payload], { onConflict: 'student_id,course_id' })

      if (error) throw error

      setMsg({ type: 'ok', text: '✅ Enrollment added successfully!' })
      setShowAddModal(false)
      setAddForm({ student_id: '', course_id: '', payment_status: 'paid', amount_paid: '', payment_id: '', note: '' })
      await loadAll()
    } catch (e: any) {
      setMsg({ type: 'err', text: 'Save failed: ' + (e.message ?? e) })
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(enrollmentId: string, newStatus: string) {
    const { error } = await supabase
      .from('enrollments')
      .update({ payment_status: newStatus })
      .eq('id', enrollmentId)

    if (!error) {
      setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, payment_status: newStatus } : e))
    }
  }

  async function handleDelete(enrollmentId: string, studentName: string, courseTitle: string) {
    if (!confirm(`Delete enrollment of "${studentName}" in "${courseTitle}"?\n\nThis cannot be undone.`)) return
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId)
    if (!error) {
      setEnrollments(prev => prev.filter(e => e.id !== enrollmentId))
      setMsg({ type: 'ok', text: 'Enrollment deleted.' })
    } else {
      setMsg({ type: 'err', text: 'Delete failed: ' + error.message })
    }
  }

  // Filter
  const filtered = enrollments.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      e.student_name.toLowerCase().includes(q) ||
      e.course_title.toLowerCase().includes(q) ||
      (e.payment_id ?? '').toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || e.payment_status === filterStatus
    return matchSearch && matchStatus
  })

  const statusCounts = enrollments.reduce<Record<string, number>>((acc, e) => {
    acc[e.payment_status] = (acc[e.payment_status] ?? 0) + 1
    return acc
  }, {})

  // ── UI ──────────────────────────────────────────────────────────────────

  const S = {
    page: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '12px' },
    h1: { fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#0f1724' },
    addBtn: { padding: '10px 20px', background: '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    statsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' as const },
    statCard: (active: boolean) => ({ padding: '10px 18px', background: active ? '#1c3d7a' : '#fff', color: active ? '#d4f01a' : '#374151', border: '1px solid', borderColor: active ? '#1c3d7a' : '#e5e7eb', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }),
    toolbar: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' as const },
    searchInput: { flex: 1, minWidth: '220px', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '10px 14px', background: '#f8fafc', textAlign: 'left' as const, fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, borderBottom: '1px solid #e5e7eb' },
    td: { padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', verticalAlign: 'middle' as const },
    badge: (status: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: STATUS_COLORS[status]?.bg ?? '#f1f5f9', color: STATUS_COLORS[status]?.text ?? '#374151' }),
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '4px 8px', borderRadius: '6px' },
    // Modal
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    modal: { background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' },
    mh2: { fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0f1724', marginBottom: '20px' },
    field: { marginBottom: '14px' },
    label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' },
    select: { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', background: '#fff' },
    input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'Inter,sans-serif' },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    saveBtn: { width: '100%', padding: '13px', background: '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '15px', cursor: 'pointer', marginTop: '8px' },
    cancelBtn: { width: '100%', padding: '11px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px', color: '#6b7280' },
    msg: (t: 'ok' | 'err') => ({ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: t === 'ok' ? '#dcfce7' : '#fee2e2', color: t === 'ok' ? '#166534' : '#991b1b' }),
    infoBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: '#1e40af', marginBottom: '20px', lineHeight: 1.6 },
  }

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>📋 Enrollments Manager</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>
            {enrollments.length} total enrollments · Manually enroll any student into any course
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={S.addBtn}>
          ➕ Enroll a Student
        </button>
      </div>

      {/* Message */}
      {msg && <div style={S.msg(msg.type)}>{msg.text}</div>}

      {/* Status filter tabs */}
      <div style={S.statsRow}>
        {[
          { key: 'all', label: `All (${enrollments.length})` },
          { key: 'paid', label: `✅ Paid (${statusCounts.paid ?? 0})` },
          { key: 'pending', label: `⏳ Pending (${statusCounts.pending ?? 0})` },
          { key: 'free', label: `🎁 Free (${statusCounts.free ?? 0})` },
          { key: 'refunded', label: `↩️ Refunded (${statusCounts.refunded ?? 0})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilterStatus(tab.key)} style={S.statCard(filterStatus === tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={S.toolbar}>
        <input
          style={S.searchInput}
          placeholder="🔍 Search by student name, course, or payment ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>⏳ Loading enrollments...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <p>{search || filterStatus !== 'all' ? 'No enrollments match your filter.' : 'No enrollments yet. Click "Enroll a Student" to add one.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Student</th>
                  <th style={S.th}>Course</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Amount</th>
                  <th style={S.th}>Progress</th>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} onMouseEnter={ev => (ev.currentTarget.style.background = '#fafbfc')} onMouseLeave={ev => (ev.currentTarget.style.background = '')}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600, color: '#0f1724' }}>{e.student_name}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', fontFamily: 'monospace' }}>{e.student_id.slice(0, 8)}…</div>
                    </td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 500 }}>{e.course_title}</div>
                      {e.course_slug && (
                        <a href={`/courses/${e.course_slug}`} target="_blank" style={{ fontSize: '11px', color: '#1c3d7a' }}>/{e.course_slug}</a>
                      )}
                    </td>
                    <td style={S.td}>
                      <select
                        value={e.payment_status}
                        onChange={ev => handleStatusChange(e.id, ev.target.value)}
                        style={{ ...S.select, width: 'auto', padding: '5px 8px', fontSize: '12px', fontWeight: 700, background: STATUS_COLORS[e.payment_status]?.bg ?? '#f1f5f9', color: STATUS_COLORS[e.payment_status]?.text ?? '#374151', border: 'none', borderRadius: '20px' }}
                      >
                        <option value="paid">✅ paid</option>
                        <option value="pending">⏳ pending</option>
                        <option value="free">🎁 free</option>
                        <option value="failed">❌ failed</option>
                        <option value="refunded">↩️ refunded</option>
                      </select>
                    </td>
                    <td style={S.td}>
                      {e.amount_paid ? `₹${e.amount_paid.toLocaleString('en-IN')}` : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '6px', width: '60px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg,#1c3d7a,#d4f01a)', width: `${e.progress_percent}%` }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{e.progress_percent}%</span>
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {new Date(e.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={S.td}>
                      <button
                        onClick={() => handleDelete(e.id, e.student_name, e.course_title)}
                        style={S.deleteBtn}
                        title="Delete enrollment"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD ENROLLMENT MODAL ── */}
      {showAddModal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div style={S.modal}>
            <h2 style={S.mh2}>➕ Manually Enroll a Student</h2>

            {/* Info box */}
            <div style={S.infoBox}>
              <strong>💡 Use this to:</strong><br />
              • Enroll admin / staff into courses for testing<br />
              • Add students who paid by cash/UPI outside Razorpay<br />
              • Grant free access to specific students<br />
              • The student must have a profile (must have signed up first)
            </div>

            {msg && <div style={{ ...S.msg(msg.type), marginBottom: '16px' }}>{msg.text}</div>}

            {/* Student selector */}
            <div style={S.field}>
              <label style={S.label}>Student *</label>
              <select
                style={S.select}
                value={addForm.student_id}
                onChange={e => setAddForm(f => ({ ...f, student_id: e.target.value }))}
              >
                <option value="">— Select a student —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || '(no name)'} {s.phone ? `· ${s.phone}` : ''} · {s.id.slice(0,8)}…
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Don't see the student? They must sign up at /signup first, then come back here.
              </div>
            </div>

            {/* Course selector */}
            <div style={S.field}>
              <label style={S.label}>Course *</label>
              <select
                style={S.select}
                value={addForm.course_id}
                onChange={e => setAddForm(f => ({ ...f, course_id: e.target.value }))}
              >
                <option value="">— Select a course —</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.fee_inr ? `(₹${c.fee_inr.toLocaleString('en-IN')})` : '(free)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Status + Amount */}
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Payment Status *</label>
                <select
                  style={S.select}
                  value={addForm.payment_status}
                  onChange={e => setAddForm(f => ({ ...f, payment_status: e.target.value }))}
                >
                  <option value="paid">✅ Paid</option>
                  <option value="free">🎁 Free (scholarship/staff)</option>
                  <option value="pending">⏳ Pending</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Amount Paid (₹)</label>
                <input
                  style={S.input}
                  type="number"
                  placeholder="e.g. 4999"
                  value={addForm.amount_paid}
                  onChange={e => setAddForm(f => ({ ...f, amount_paid: e.target.value }))}
                />
              </div>
            </div>

            {/* Payment ID (optional) */}
            <div style={S.field}>
              <label style={S.label}>Payment Reference / Note (optional)</label>
              <input
                style={S.input}
                type="text"
                placeholder="e.g. UPI-ref-12345 or 'Admin test access'"
                value={addForm.payment_id}
                onChange={e => setAddForm(f => ({ ...f, payment_id: e.target.value }))}
              />
            </div>

            <button onClick={handleAddEnrollment} disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Saving...' : '✅ Enroll Now'}
            </button>
            <button onClick={() => { setShowAddModal(false); setMsg(null) }} style={S.cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
