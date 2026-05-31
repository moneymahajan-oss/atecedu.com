// src/components/dashboard/ProfileEditor.tsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function ProfileEditor() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '',
    father_name: '',
    phone: '',
    city: '',
    state: 'Punjab',
    photo_url: '',
  })

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/login'
        return
      }
      setUser({ id: data.user.id, email: data.user.email ?? '' })
      loadProfile(data.user.id)
    })
  }, [])

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setForm({
        full_name: data.full_name ?? '',
        father_name: data.father_name ?? '',
        phone: data.phone ?? '',
        city: data.city ?? '',
        state: data.state ?? 'Punjab',
        photo_url: data.photo_url ?? '',
      })
    }
    setLoading(false)
  }

  async function uploadPhoto(file: File) {
    if (!user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('student-photos')
      .upload(path, file, { upsert: true })

    if (!upErr) {
      const { data: urlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(path)
      update('photo_url', urlData.publicUrl)
    }
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')

    const { error: saveErr } = await supabase
      .from('student_profiles')
      .upsert({ id: user.id, ...form })

    if (saveErr) {
      setError('Failed to save. Please try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: '10px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: '600' as const,
    color: '#374151', marginBottom: '6px',
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>⏳ Loading...</div>
  )

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <a href="/dashboard" style={{ fontSize: '13px', color: '#1c3d7a', fontWeight: '600' }}>← Back to Dashboard</a>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '800', marginTop: '8px' }}>
          👤 Edit Profile
        </h1>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '20px' }}>

          {/* Photo upload */}
          <div style={{ padding: '28px 28px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1rem', marginBottom: '16px' }}>
              Profile Photo
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: '#1c3d7a', flexShrink: 0, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '26px', color: '#d4f01a',
              }}>
                {form.photo_url
                  ? <img src={form.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (form.full_name[0] ?? '?')
                }
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{ padding: '8px 18px', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {uploading ? '⏳ Uploading...' : '📷 Upload Photo'}
                </button>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>JPG or PNG, max 2MB</p>
                <input
                  ref={fileRef} type="file" accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                />
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" value={form.full_name} required
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="As per certificate" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>
              <div>
                <label style={labelStyle}>Father's Name</label>
                <input type="text" value={form.father_name}
                  onChange={e => update('father_name', e.target.value)}
                  placeholder="Optional" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="+91 XXXXX XXXXX" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input type="text" value={form.city}
                  onChange={e => update('city', e.target.value)}
                  placeholder="Your city" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>
            </div>

            <div style={{ background: '#f8f9fc', borderRadius: '10px', padding: '14px', fontSize: '13px', color: '#6b7280' }}>
              📧 Email: <strong style={{ color: '#0f1724' }}>{user?.email}</strong>
              <span style={{ marginLeft: '8px', color: '#9ca3af' }}>(cannot be changed)</span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {saved && (
          <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#166534', marginBottom: '16px' }}>
            ✅ Profile saved successfully!
          </div>
        )}

        <button
          type="submit" disabled={saving}
          style={{
            width: '100%', padding: '14px',
            background: saving ? '#9ca3af' : '#1c3d7a',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontFamily: 'var(--font-display)', fontWeight: '800',
            fontSize: '16px', cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
