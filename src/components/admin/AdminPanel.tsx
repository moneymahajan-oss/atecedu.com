import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY
)

// ────────────────────────── TYPES ──────────────────────────
interface Certificate {
  id: string
  certificate_no: string
  student_name: string
  father_name: string
  course_name: string
  issue_date: string
  grade: string
  is_active: boolean
}

interface Course {
  id: string
  title: string
  slug: string
  short_description: string
  fee_inr: number
  mode: string
  is_active: boolean
  is_featured: boolean
  duration_weeks: number
}

interface Enquiry {
  id: string
  name: string
  phone: string
  email: string
  course_interest: string
  message: string
  is_contacted: boolean
  created_at: string
}

interface Testimonial {
  id: string
  student_name: string
  course: string
  company_placed: string
  review: string
  rating: number
  is_active: boolean
}

interface Faculty {
  id: string
  name: string
  designation: string
  expert_field: string
  photo_url: string
  sort_order: number
  is_active: boolean
}

type Tab = 'faculty' | 'certificates' | 'courses' | 'enquiries' | 'testimonials'

// ────────────────────────── MAIN ADMIN PANEL ──────────────────────────
export default function AdminPanel() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('faculty')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogin() {
    setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError(error.message)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Login</h1>
          {loginError && (
            <p className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{loginError}</p>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'faculty',       label: '🎓 Faculty'       },
    { key: 'certificates',  label: '📜 Certificates'  },
    { key: 'courses',       label: '📚 Courses'        },
    { key: 'enquiries',     label: '📩 Enquiries'      },
    { key: 'testimonials',  label: '⭐ Testimonials'   },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ATEC Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <main className="p-6 max-w-7xl mx-auto">
        {activeTab === 'faculty'      && <FacultyTab />}
        {activeTab === 'certificates' && <CertificatesTab />}
        {activeTab === 'courses'      && <CoursesTab />}
        {activeTab === 'enquiries'    && <EnquiriesTab />}
        {activeTab === 'testimonials' && <TestimonialsTab />}
      </main>
    </div>
  )
}

// ────────────────────────── FACULTY TAB ──────────────────────────
function FacultyTab() {
  const [list, setList]       = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const empty: Omit<Faculty, 'id'> = {
    name: '', designation: '', expert_field: '',
    photo_url: '', sort_order: 0, is_active: true,
  }
  const [form, setForm] = useState<Omit<Faculty, 'id'>>(empty)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('faculty').select('*').order('sort_order')
    setList(data ?? [])
    setLoading(false)
  }

  function startAdd() {
    setEditId(null)
    setForm(empty)
    setMsg('')
    setShowForm(true)
  }

  function startEdit(f: Faculty) {
    setEditId(f.id)
    setForm({ name: f.name, designation: f.designation, expert_field: f.expert_field,
              photo_url: f.photo_url ?? '', sort_order: f.sort_order, is_active: f.is_active })
    setMsg('')
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) { setMsg('Name is required'); return }
    if (!form.designation.trim()) { setMsg('Designation is required'); return }
    if (!form.expert_field.trim()) { setMsg('Expert field is required'); return }
    setSaving(true)
    if (editId) {
      await supabase.from('faculty').update(form).eq('id', editId)
    } else {
      await supabase.from('faculty').insert(form)
    }
    setSaving(false)
    setShowForm(false)
    setMsg('')
    load()
  }

  async function toggleActive(f: Faculty) {
    await supabase.from('faculty').update({ is_active: !f.is_active }).eq('id', f.id)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this faculty member? This cannot be undone.')) return
    await supabase.from('faculty').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Faculty Management</h2>
        <button
          onClick={startAdd}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          + Add Faculty
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              {editId ? 'Edit Faculty' : 'Add Faculty'}
            </h3>
            {msg && <p className="text-red-500 text-sm mb-3">{msg}</p>}

            <div className="grid grid-cols-1 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Name *</span>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Manav Mahajan"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Designation *</span>
                <input
                  value={form.designation}
                  onChange={e => setForm({ ...form, designation: e.target.value })}
                  placeholder="e.g. Senior Faculty"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Expert Field *</span>
                <input
                  value={form.expert_field}
                  onChange={e => setForm({ ...form, expert_field: e.target.value })}
                  placeholder="e.g. Coding & Agentic AI Expert"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Photo URL</span>
                <input
                  value={form.photo_url}
                  onChange={e => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="https://... (Supabase storage or any public URL)"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {form.photo_url && (
                  <img src={form.photo_url} alt="preview"
                    className="mt-2 h-20 w-16 object-cover rounded-lg border border-gray-200" />
                )}
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Sort Order</span>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </label>
                <label className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active (visible)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No faculty members yet. Click + Add Faculty to begin.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-4 text-left">Photo</th>
                <th className="px-5 py-4 text-left">Name</th>
                <th className="px-5 py-4 text-left">Designation</th>
                <th className="px-5 py-4 text-left">Expert Field</th>
                <th className="px-5 py-4 text-center">Order</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(f => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    {f.photo_url ? (
                      <img src={f.photo_url} alt={f.name}
                        className="w-10 h-12 object-cover object-top rounded-lg border border-gray-100" />
                    ) : (
                      <div className="w-10 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-400 font-bold text-lg">
                        {f.name.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900">{f.name}</td>
                  <td className="px-5 py-4 text-gray-500">{f.designation}</td>
                  <td className="px-5 py-4 text-orange-600 font-medium">{f.expert_field}</td>
                  <td className="px-5 py-4 text-center text-gray-500">{f.sort_order}</td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => toggleActive(f)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        f.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      } transition-colors`}
                    >
                      {f.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => startEdit(f)}
                        className="text-blue-500 hover:text-blue-700 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => remove(f.id)}
                        className="text-red-400 hover:text-red-600 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ────────────────────────── CERTIFICATES TAB ──────────────────────────
function CertificatesTab() {
  const [list, setList]       = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('certificates').select('*').order('created_at', { ascending: false }).limit(100)
    setList(data ?? [])
    setLoading(false)
  }

  async function doSearch() {
    if (!search.trim()) { load(); return }
    setLoading(true)
    const { data } = await supabase
      .from('certificates').select('*')
      .or(`certificate_no.ilike.%${search}%,student_name.ilike.%${search}%`)
      .limit(50)
    setList(data ?? [])
    setLoading(false)
  }

  async function toggleActive(c: Certificate) {
    await supabase.from('certificates').update({ is_active: !c.is_active }).eq('id', c.id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Certificates</h2>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Search cert no or name…"
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-64"
          />
          <button
            onClick={doSearch}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-4 text-left">Cert No</th>
                <th className="px-5 py-4 text-left">Student</th>
                <th className="px-5 py-4 text-left">Course</th>
                <th className="px-5 py-4 text-left">Issue Date</th>
                <th className="px-5 py-4 text-center">Grade</th>
                <th className="px-5 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-600">{c.certificate_no}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900">{c.student_name}</td>
                  <td className="px-5 py-4 text-gray-500">{c.course_name}</td>
                  <td className="px-5 py-4 text-gray-500">{c.issue_date}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{c.grade}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        c.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-400 hover:bg-red-200'
                      } transition-colors`}
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ────────────────────────── COURSES TAB ──────────────────────────
function CoursesTab() {
  const [list, setList]       = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('courses').select('*').order('sort_order')
      .then(({ data }) => { setList(data ?? []); setLoading(false) })
  }, [])

  async function toggleFeatured(c: Course) {
    await supabase.from('courses').update({ is_featured: !c.is_featured }).eq('id', c.id)
    setList(prev => prev.map(x => x.id === c.id ? { ...x, is_featured: !x.is_featured } : x))
  }

  async function toggleActive(c: Course) {
    await supabase.from('courses').update({ is_active: !c.is_active }).eq('id', c.id)
    setList(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x))
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Courses</h2>
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-4 text-left">Title</th>
                <th className="px-5 py-4 text-left">Mode</th>
                <th className="px-5 py-4 text-center">Duration</th>
                <th className="px-5 py-4 text-center">Fee (₹)</th>
                <th className="px-5 py-4 text-center">Featured</th>
                <th className="px-5 py-4 text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-gray-900">{c.title}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                      c.mode === 'online' ? 'bg-blue-50 text-blue-700'
                      : c.mode === 'hybrid' ? 'bg-purple-50 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>{c.mode}</span>
                  </td>
                  <td className="px-5 py-4 text-center text-gray-500">{c.duration_weeks}w</td>
                  <td className="px-5 py-4 text-center font-semibold text-gray-900">
                    {c.fee_inr?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => toggleFeatured(c)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        c.is_featured ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                      {c.is_featured ? '★ Featured' : 'No'}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => toggleActive(c)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        c.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                      {c.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ────────────────────────── ENQUIRIES TAB ──────────────────────────
function EnquiriesTab() {
  const [list, setList]       = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setList(data ?? []); setLoading(false) })
  }, [])

  async function markContacted(e: Enquiry) {
    await supabase.from('enquiries').update({ is_contacted: true }).eq('id', e.id)
    setList(prev => prev.map(x => x.id === e.id ? { ...x, is_contacted: true } : x))
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Enquiries / Leads</h2>
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-4 text-left">Name</th>
                <th className="px-5 py-4 text-left">Phone</th>
                <th className="px-5 py-4 text-left">Course Interest</th>
                <th className="px-5 py-4 text-left">Message</th>
                <th className="px-5 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(e => (
                <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${!e.is_contacted ? 'bg-orange-50/40' : ''}`}>
                  <td className="px-5 py-4 font-semibold text-gray-900">{e.name}</td>
                  <td className="px-5 py-4">
                    <a href={`tel:${e.phone}`} className="text-orange-600 hover:underline font-medium">{e.phone}</a>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{e.course_interest || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 max-w-xs truncate">{e.message || '—'}</td>
                  <td className="px-5 py-4 text-center">
                    {e.is_contacted ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Contacted</span>
                    ) : (
                      <button
                        onClick={() => markContacted(e)}
                        className="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-full text-xs font-semibold transition-colors"
                      >
                        Mark Done
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
  )
}

// ────────────────────────── TESTIMONIALS TAB ──────────────────────────
function TestimonialsTab() {
  const [list, setList]       = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('testimonials').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setList(data ?? []); setLoading(false) })
  }, [])

  async function toggleActive(t: Testimonial) {
    await supabase.from('testimonials').update({ is_active: !t.is_active }).eq('id', t.id)
    setList(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Testimonials</h2>
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(t => (
            <div key={t.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${t.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.student_name}</p>
                  <p className="text-xs text-gray-500">{t.course}</p>
                </div>
                <span className="text-yellow-400 text-sm">{'★'.repeat(t.rating)}</span>
              </div>
              <p className="text-gray-600 text-sm line-clamp-3 mb-4">{t.review}</p>
              {t.company_placed && (
                <p className="text-xs text-green-600 font-semibold mb-3">📍 {t.company_placed}</p>
              )}
              <button
                onClick={() => toggleActive(t)}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  t.is_active
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t.is_active ? 'Visible' : 'Hidden — Click to Show'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
