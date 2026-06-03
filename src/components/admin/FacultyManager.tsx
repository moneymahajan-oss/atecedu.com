// src/components/admin/FacultyManager.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Faculty {
  id: string
  name: string
  designation: string
  expert_field: string
  photo_url: string
  sort_order: number
  is_active: boolean
}

const EMPTY: Omit<Faculty, 'id'> = {
  name: '', designation: '', expert_field: '',
  photo_url: '', sort_order: 0, is_active: true,
}

export default function FacultyManager() {
  const [list, setList]         = useState<Faculty[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState<Omit<Faculty, 'id'>>(EMPTY)
  const [msg, setMsg]           = useState('')
  const [success, setSuccess]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('faculty').select('*').order('sort_order')
    setList(data ?? [])
    setLoading(false)
  }

  function startAdd() {
    setEditId(null)
    setForm(EMPTY)
    setMsg('')
    setSuccess('')
    setShowForm(true)
  }

  function startEdit(f: Faculty) {
    setEditId(f.id)
    setForm({
      name: f.name, designation: f.designation,
      expert_field: f.expert_field, photo_url: f.photo_url ?? '',
      sort_order: f.sort_order, is_active: f.is_active,
    })
    setMsg('')
    setSuccess('')
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim())         { setMsg('Name is required'); return }
    if (!form.designation.trim())  { setMsg('Designation is required'); return }
    if (!form.expert_field.trim()) { setMsg('Expert Field is required'); return }
    setSaving(true); setMsg('')
    let error: any
    if (editId) {
      ;({ error } = await supabase.from('faculty').update(form).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('faculty').insert(form))
    }
    setSaving(false)
    if (error) { setMsg('Save failed: ' + error.message); return }
    setSuccess(editId ? 'Faculty updated!' : 'Faculty added!')
    setShowForm(false)
    load()
  }

  async function toggleActive(f: Faculty) {
    await supabase.from('faculty').update({ is_active: !f.is_active }).eq('id', f.id)
    setList(prev => prev.map(x => x.id === f.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function remove(f: Faculty) {
    if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return
    await supabase.from('faculty').delete().eq('id', f.id)
    setList(prev => prev.filter(x => x.id !== f.id))
  }

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
    overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Faculty Management
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Manage faculty shown in the "Meet Our Faculty" section on the homepage.
          </p>
        </div>
        <button
          onClick={startAdd}
          style={{ background: '#1c3d7a', color: '#d4f01a', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          + Add Faculty
        </button>
      </div>

      {success && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', marginBottom: 20 }}>
              {editId ? 'Edit Faculty Member' : 'Add New Faculty Member'}
            </h2>

            {msg && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 14px', borderRadius: 7, marginBottom: 14, fontSize: 13 }}>
                {msg}
              </div>
            )}

            {/* Photo preview */}
            {form.photo_url && (
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={form.photo_url}
                  alt="Preview"
                  style={{ width: 56, height: 70, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span style={{ fontSize: 12, color: '#64748b' }}>Photo preview</span>
              </div>
            )}

            {(
              [
                { label: 'Name *', key: 'name', placeholder: 'e.g. Manav Mahajan' },
                { label: 'Designation *', key: 'designation', placeholder: 'e.g. Senior Faculty' },
                { label: 'Expert Field *', key: 'expert_field', placeholder: 'e.g. Coding & Agentic AI Expert' },
                { label: 'Photo URL', key: 'photo_url', placeholder: 'https://... (Supabase Storage or any public URL)' },
              ] as const
            ).map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  {f.label}
                </label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => { e.target.style.borderColor = '#1c3d7a' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 13px', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4, gap: 10 }}>
                <input
                  type="checkbox"
                  id="fm-active"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#1c3d7a', cursor: 'pointer' }}
                />
                <label htmlFor="fm-active" style={{ fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  Active (visible on site)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{ flex: 1, background: saving ? '#94a3b8' : '#1c3d7a', color: '#d4f01a', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving…' : (editId ? 'Update Faculty' : 'Add Faculty')}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1c3d7a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading faculty...
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : list.length === 0 ? (
        <div style={{ ...card, padding: '64px 32px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎓</div>
          <p style={{ fontWeight: 600, fontSize: 15 }}>No faculty members yet.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Click "+ Add Faculty" to get started.</p>
        </div>
      ) : (
        <>
          {/* Cards grid — shows preview like the homepage */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {list.map(f => (
              <div key={f.id} style={{ ...card, opacity: f.is_active ? 1 : 0.55 }}>
                <div style={{ height: 180, background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                  {f.photo_url ? (
                    <img
                      src={f.photo_url}
                      alt={f.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', fontSize: '3.5rem', fontWeight: 900, color: '#93c5fd', fontFamily: 'Sora, sans-serif' }}>
                      {f.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!f.is_active && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                      Hidden
                    </div>
                  )}
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{f.designation}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1c3d7a' }}>{f.expert_field}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      onClick={() => startEdit(f)}
                      style={{ flex: 1, background: '#eff6ff', color: '#1c3d7a', border: 'none', borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => toggleActive(f)}
                      style={{ flex: 1, background: f.is_active ? '#dcfce7' : '#f1f5f9', color: f.is_active ? '#166534' : '#64748b', border: 'none', borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {f.is_active ? '✓ Live' : '○ Off'}
                    </button>
                    <button
                      onClick={() => remove(f)}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full table below cards */}
          <div style={card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14 }}>All Faculty ({list.length})</h3>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Sort order controls display order on homepage</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['#', 'Photo', 'Name', 'Designation', 'Expert Field', 'Order', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((f, i) => (
                    <tr key={f.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {f.photo_url ? (
                          <img src={f.photo_url} alt={f.name} style={{ width: 36, height: 44, objectFit: 'cover', objectPosition: 'top', borderRadius: 6, border: '1px solid #e2e8f0' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div style={{ width: 36, height: 44, borderRadius: 6, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#93c5fd', fontSize: 16 }}>
                            {f.name.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{f.name}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{f.designation}</td>
                      <td style={{ padding: '12px 16px', color: '#1c3d7a', fontWeight: 600 }}>{f.expert_field}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>{f.sort_order}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => toggleActive(f)}
                          style={{ padding: '3px 12px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: f.is_active ? '#dcfce7' : '#f1f5f9', color: f.is_active ? '#166534' : '#64748b' }}
                        >
                          {f.is_active ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => startEdit(f)} style={{ background: '#eff6ff', color: '#1c3d7a', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => remove(f)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
