// src/components/admin/LiveSessionsManager.tsx
// NEW FILE — replaces the vanilla JS in zoom.astro
// Full DB-driven live session management — writes to live_sessions table

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Course {
  id: string
  title: string
}

interface Session {
  id: string
  course_id: string | null
  title: string
  platform: 'zoom' | 'meet' | 'teams' | 'other'
  zoom_link: string
  meeting_id: string | null
  passcode: string | null
  scheduled_at: string
  duration_minutes: number
  instructor_name: string | null
  recording_url: string | null
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  is_active: boolean
}

const EMPTY_SESSION: Partial<Session> = {
  course_id: null,
  title: '',
  platform: 'zoom',
  zoom_link: '',
  meeting_id: '',
  passcode: '',
  scheduled_at: '',
  duration_minutes: 60,
  instructor_name: '',
  recording_url: '',
  status: 'scheduled',
  is_active: true,
}

const PLAT_LABELS = { zoom: '🔵 Zoom', meet: '🟢 Google Meet', teams: '🟣 Teams', other: '🎥 Other' }
const STATUS_LABELS = { scheduled: '📅 Scheduled', live: '🔴 Live Now', ended: '✓ Ended', cancelled: '✕ Cancelled' }

export default function LiveSessionsManager() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(EMPTY_SESSION)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ended'>('upcoming')
  const [toast, setToast] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: sessData }, { data: courseData }] = await Promise.all([
      supabase.from('live_sessions').select('*').order('scheduled_at', { ascending: false }),
      supabase.from('courses').select('id,title').eq('is_active', true).order('title'),
    ])
    setSessions(sessData ?? [])
    setCourses(courseData ?? [])
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function openAdd() {
    // Default scheduled_at to tomorrow 7 PM
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(19, 0, 0, 0)
    setForm({ ...EMPTY_SESSION, scheduled_at: tomorrow.toISOString().slice(0, 16) })
    setEditId(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEdit(session: Session) {
    setForm({
      ...session,
      scheduled_at: session.scheduled_at ? new Date(session.scheduled_at).toISOString().slice(0, 16) : '',
    })
    setEditId(session.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveSession() {
    if (!form.title?.trim() || !form.zoom_link?.trim() || !form.scheduled_at) {
      showToast('❌ Title, Link, and Date/Time are required')
      return
    }
    setSaving(true)
    const payload = {
      course_id: form.course_id || null,
      title: form.title.trim(),
      platform: form.platform || 'zoom',
      zoom_link: form.zoom_link.trim(),
      meeting_id: form.meeting_id?.trim() || null,
      passcode: form.passcode?.trim() || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: parseInt(form.duration_minutes) || 60,
      instructor_name: form.instructor_name?.trim() || null,
      recording_url: form.recording_url?.trim() || null,
      status: form.status || 'scheduled',
      is_active: true,
    }
    if (editId) {
      await supabase.from('live_sessions').update(payload).eq('id', editId)
      showToast('✅ Session updated')
    } else {
      await supabase.from('live_sessions').insert(payload)
      showToast('✅ Session created')
    }
    setSaving(false)
    setShowForm(false)
    loadAll()
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this session?')) return
    await supabase.from('live_sessions').update({ is_active: false }).eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    showToast('🗑 Session deleted')
  }

  async function markStatus(id: string, status: Session['status']) {
    await supabase.from('live_sessions').update({ status }).eq('id', id)
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    showToast(`✅ Marked as ${status}`)
  }

  const upd = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }))

  const now = new Date()
  const filtered = sessions.filter(s => {
    if (!s.is_active) return false
    const dt = new Date(s.scheduled_at)
    if (filter === 'upcoming') return s.status !== 'ended' && s.status !== 'cancelled' && dt >= new Date(now.getTime() - 3 * 60 * 60 * 1000)
    if (filter === 'ended') return s.status === 'ended' || s.status === 'cancelled'
    return true
  })

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }

  function formatDateTime(iso: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function getCourseName(courseId: string | null) {
    if (!courseId) return '(Platform-wide)'
    return courses.find(c => c.id === courseId)?.title ?? courseId
  }

  function getStatusBadge(status: Session['status']) {
    const styles: Record<string, React.CSSProperties> = {
      scheduled: { background: '#fef3c7', color: '#92400e' },
      live: { background: '#dcfce7', color: '#15803d' },
      ended: { background: '#f1f5f9', color: '#94a3b8' },
      cancelled: { background: '#fee2e2', color: '#991b1b' },
    }
    return (
      <span style={{ ...styles[status], padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
        {STATUS_LABELS[status]}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#0f1724', color: '#d4f01a', padding: '12px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.5rem', fontWeight: '800' }}>🎥 Live Sessions</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Manage Zoom, Google Meet & Teams links. Students see these in their dashboard.</p>
        </div>
        <button onClick={openAdd} style={{ padding: '10px 22px', background: '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
          + Schedule Session
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '2px solid #1c3d7a', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '16px' }}>
              {editId ? '✏️ Edit Session' : '📅 Schedule New Session'}
            </h2>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Title */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Session Title *</label>
              <input value={form.title ?? ''} onChange={e => upd('title', e.target.value)} placeholder="e.g. Hardware Networking — Week 3 Live Class"
                style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>

            {/* Course */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Course (optional)</label>
              <select value={form.course_id ?? ''} onChange={e => upd('course_id', e.target.value || null)} style={inputStyle}>
                <option value="">— Platform-wide (all enrolled students) —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            {/* Platform */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Platform</label>
              <select value={form.platform ?? 'zoom'} onChange={e => upd('platform', e.target.value)} style={inputStyle}>
                <option value="zoom">🔵 Zoom</option>
                <option value="meet">🟢 Google Meet</option>
                <option value="teams">🟣 Microsoft Teams</option>
                <option value="other">🎥 Other</option>
              </select>
            </div>

            {/* Join Link */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Join Link (full URL) *</label>
              <input value={form.zoom_link ?? ''} onChange={e => upd('zoom_link', e.target.value)} placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>Paste the full invite link. Students click this to join.</div>
            </div>

            {/* Meeting ID + Passcode */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Meeting ID (optional)</label>
              <input value={form.meeting_id ?? ''} onChange={e => upd('meeting_id', e.target.value)} placeholder="123 456 7890"
                style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Passcode (optional)</label>
              <input value={form.passcode ?? ''} onChange={e => upd('passcode', e.target.value)} placeholder="abc123"
                style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>

            {/* Date/Time + Duration */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Date & Time *</label>
              <input type="datetime-local" value={form.scheduled_at ?? ''} onChange={e => upd('scheduled_at', e.target.value)}
                style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Duration (minutes)</label>
              <input type="number" value={form.duration_minutes ?? 60} onChange={e => upd('duration_minutes', e.target.value)}
                style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>

            {/* Instructor + Status */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Instructor Name (optional)</label>
              <input value={form.instructor_name ?? ''} onChange={e => upd('instructor_name', e.target.value)} placeholder="e.g. Manav Sir"
                style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Status</label>
              <select value={form.status ?? 'scheduled'} onChange={e => upd('status', e.target.value)} style={inputStyle}>
                <option value="scheduled">📅 Scheduled</option>
                <option value="live">🔴 Live Now</option>
                <option value="ended">✓ Ended</option>
                <option value="cancelled">✕ Cancelled</option>
              </select>
            </div>

            {/* Recording URL */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Recording URL (add after class)</label>
              <input value={form.recording_url ?? ''} onChange={e => upd('recording_url', e.target.value)} placeholder="YouTube or Drive link to class recording"
                style={inputStyle} onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={saveSession} disabled={saving}
              style={{ flex: 1, padding: '12px', background: saving ? '#94a3b8' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : editId ? '✅ Update Session' : '✅ Schedule Session'}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ padding: '12px 20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['upcoming', 'ended', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            background: filter === f ? '#fff' : 'transparent',
            color: filter === f ? '#1c3d7a' : '#64748b',
            fontWeight: filter === f ? '700' : '500',
            fontSize: '13px',
            boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
            {f === 'upcoming' ? '📅 Upcoming' : f === 'ended' ? '✓ Past' : '🗂 All'}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
          <p>No sessions found. Schedule your first session above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(session => (
            <div key={session.id} style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${session.status === 'live' ? '#86efac' : '#e2e8f0'}`, overflow: 'hidden', transition: 'all 0.15s' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>

                {/* Platform icon */}
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: session.platform === 'zoom' ? '#e8f4ff' : session.platform === 'meet' ? '#e8f5e9' : '#ede7f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {session.platform === 'zoom' ? '🔵' : session.platform === 'meet' ? '🟢' : session.platform === 'teams' ? '🟣' : '🎥'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session.title}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>📅 {formatDateTime(session.scheduled_at)}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>⏱ {session.duration_minutes}min</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>🎓 {getCourseName(session.course_id)}</span>
                    {session.instructor_name && <span style={{ fontSize: '12px', color: '#94a3b8' }}>👤 {session.instructor_name}</span>}
                  </div>
                </div>

                {/* Status badge */}
                {getStatusBadge(session.status)}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                  <a href={session.zoom_link} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '5px 12px', background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'none' }}>
                    🔗 Link
                  </a>
                  {session.status === 'scheduled' && (
                    <button onClick={() => markStatus(session.id, 'live')}
                      style={{ padding: '5px 12px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      🔴 Go Live
                    </button>
                  )}
                  {session.status === 'live' && (
                    <button onClick={() => markStatus(session.id, 'ended')}
                      style={{ padding: '5px 12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      ✓ End
                    </button>
                  )}
                  <button onClick={() => openEdit(session)}
                    style={{ padding: '5px 12px', background: '#eff6ff', color: '#1c3d7a', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => deleteSession(session.id)}
                    style={{ padding: '5px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>

              {/* Recording row */}
              {session.recording_url && (
                <div style={{ padding: '10px 20px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>🎬 Recording available:</span>
                  <a href={session.recording_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#1c3d7a', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                    {session.recording_url}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
