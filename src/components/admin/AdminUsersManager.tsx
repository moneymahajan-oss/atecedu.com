// src/components/admin/AdminUsersManager.tsx
// Superadmin-only: create, view, activate/deactivate admin accounts
// atecgsp@gmail.com is the only superadmin — can create admin/instructor/support roles
// DOES NOT change any other file

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface AdminUser {
  id: string
  user_id: string
  email: string
  role: string
  full_name: string | null
  created_by: string | null
  created_at: string
  is_active: boolean
}

const ROLES = [
  { value: 'admin',      label: '🔧 Admin',      desc: 'Full access except creating other admins' },
  { value: 'instructor', label: '👨‍🏫 Instructor', desc: 'Access to courses, students, sessions' },
  { value: 'support',    label: '💬 Support',     desc: 'Access to enquiries and student profiles' },
]

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  superadmin: { bg: '#d4f01a', text: '#0b1525' },
  admin:      { bg: '#e0e7ff', text: '#3730a3' },
  instructor: { bg: '#dbeafe', text: '#1e40af' },
  support:    { bg: '#dcfce7', text: '#166534' },
}

export default function AdminUsersManager() {
  const [admins, setAdmins]       = useState<AdminUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState<{ type: 'ok'|'err'; text: string } | null>(null)

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'admin',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/admin/login'; return }
      if (data.user.email !== 'atecgsp@gmail.com') {
        // Only superadmin can access this page
        setMsg({ type: 'err', text: 'Only superadmin can manage admin users.' })
        setLoading(false)
        return
      }
      setCurrentUser({ id: data.user.id, email: data.user.email })
      loadAdmins()
    })
  }, [])

  async function loadAdmins() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setMsg({ type: 'err', text: 'Load failed: ' + error.message })
    else setAdmins(data ?? [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.email || !form.password || !form.full_name) {
      setMsg({ type: 'err', text: 'Email, password and full name are required.' })
      return
    }
    if (form.password.length < 6) {
      setMsg({ type: 'err', text: 'Password must be at least 6 characters.' })
      return
    }

    setSaving(true)
    setMsg(null)

    try {
      // Create the user in Supabase Auth
      // Note: This uses admin signup — the new user can then log in
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } }
      })

      if (signupErr) throw new Error(signupErr.message)
      if (!signupData.user) throw new Error('User creation failed')

      // Insert role into user_roles
      const { error: roleErr } = await supabase.from('user_roles').upsert({
        user_id:    signupData.user.id,
        email:      form.email,
        role:       form.role,
        full_name:  form.full_name,
        created_by: currentUser?.email,
        is_active:  true,
      }, { onConflict: 'user_id' })

      if (roleErr) throw new Error(roleErr.message)

      setMsg({ type: 'ok', text: `✅ Admin "${form.full_name}" created with role "${form.role}". They can now log in at /admin/login` })
      setShowAdd(false)
      setForm({ email: '', password: '', full_name: '', role: 'admin' })
      await loadAdmins()

    } catch (e: any) {
      setMsg({ type: 'err', text: 'Error: ' + e.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(admin: AdminUser) {
    if (admin.role === 'superadmin') {
      setMsg({ type: 'err', text: 'Cannot deactivate the superadmin account.' })
      return
    }
    const newVal = !admin.is_active
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: newVal })
      .eq('id', admin.id)

    if (!error) {
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, is_active: newVal } : a))
    }
  }

  async function changeRole(admin: AdminUser, newRole: string) {
    if (admin.role === 'superadmin') {
      setMsg({ type: 'err', text: 'Cannot change the superadmin role.' })
      return
    }
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('id', admin.id)

    if (!error) {
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, role: newRole } : a))
    }
  }

  const S = {
    page: { display: 'flex', flexDirection: 'column' as const, gap: 24 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 },
    h1: { fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#0f1724' },
    addBtn: { padding: '10px 20px', background: '#0b1525', color: '#d4f01a', border: 'none', borderRadius: 10, fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
    card: { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '10px 16px', background: '#f8fafc', textAlign: 'left' as const, fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, borderBottom: '1px solid #e5e7eb' },
    td: { padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14, verticalAlign: 'middle' as const },
    badge: (role: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: ROLE_COLORS[role]?.bg ?? '#f1f5f9', color: ROLE_COLORS[role]?.text ?? '#374151' }),
    // Modal
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' },
    mh2: { fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0f1724', marginBottom: 20 },
    field: { marginBottom: 14 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
    input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' },
    select: { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, background: '#fff' },
    saveBtn: { width: '100%', padding: 13, background: '#0b1525', color: '#d4f01a', border: 'none', borderRadius: 10, fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 8 },
    cancelBtn: { width: '100%', padding: 11, background: 'none', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, color: '#6b7280' },
    msg: (t: 'ok'|'err') => ({ padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: t === 'ok' ? '#dcfce7' : '#fee2e2', color: t === 'ok' ? '#166534' : '#991b1b' }),
    infoBox: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#92400e', marginBottom: 16 },
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Loading admin users...
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>🔐 Admin Users</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {admins.length} admin accounts · Superadmin only
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={S.addBtn}>
          ➕ Create Admin Account
        </button>
      </div>

      {msg && <div style={S.msg(msg.type)}>{msg.text}</div>}

      {/* Role descriptions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
        {ROLES.map(r => (
          <div key={r.value} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={S.card}>
        {admins.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p>No admin users yet. Create the first one above.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Name / Email</th>
                  <th style={S.th}>Role</th>
                  <th style={S.th}>Created By</th>
                  <th style={S.th}>Created</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#fafbfc')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                  >
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{admin.full_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{admin.email}</div>
                    </td>
                    <td style={S.td}>
                      {admin.role === 'superadmin' ? (
                        <span style={S.badge(admin.role)}>👑 SUPERADMIN</span>
                      ) : (
                        <select
                          value={admin.role}
                          onChange={ev => changeRole(admin, ev.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, background: ROLE_COLORS[admin.role]?.bg ?? '#f1f5f9', color: ROLE_COLORS[admin.role]?.text ?? '#374151' }}
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>{admin.created_by || 'system'}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {new Date(admin.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: admin.is_active ? '#dcfce7' : '#fee2e2', color: admin.is_active ? '#166534' : '#991b1b' }}>
                        {admin.is_active ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </td>
                    <td style={S.td}>
                      {admin.role !== 'superadmin' && (
                        <button
                          onClick={() => toggleActive(admin)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: admin.is_active ? '#ef4444' : '#166534' }}
                        >
                          {admin.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={S.modal}>
            <h2 style={S.mh2}>➕ Create Admin Account</h2>

            <div style={S.infoBox}>
              <strong>Note:</strong> This creates a new Supabase Auth user + assigns admin role. The new admin can immediately log in at <code>/admin/login</code> with the password you set here.
            </div>

            {msg?.type === 'err' && <div style={{ ...S.msg('err'), marginBottom: 14 }}>{msg.text}</div>}

            <div style={S.field}>
              <label style={S.label}>Full Name *</label>
              <input style={S.input} type="text" placeholder="e.g. Rajesh Kumar" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Email Address *</label>
              <input style={S.input} type="email" placeholder="admin@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Password *</label>
              <input style={S.input} type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Share this password with the admin securely. They can change it later.</div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Role *</label>
              <select style={S.select} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
              </select>
            </div>

            <button onClick={handleCreate} disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Creating...' : '✅ Create Admin'}
            </button>
            <button onClick={() => { setShowAdd(false); setMsg(null) }} style={S.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
