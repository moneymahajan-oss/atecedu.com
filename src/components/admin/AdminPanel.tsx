// src/components/admin/AdminPanel.tsx
// Full admin panel — all public-facing content manageable here
// Tabs: Certificates | Faculty | Courses | Testimonials | Instructors | News | Blog | YouTube | Podcasts | Enquiries | Settings

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY
)

// ────────────────────────── TYPES ──────────────────────────
interface Certificate {
  id: string; certificate_no: string; student_name: string; father_name: string
  course_name: string; issue_date: string; grade: string; is_active: boolean; batch_id?: string
}
interface Course {
  id: string; title: string; slug: string; short_description: string; fee_inr: number
  original_fee_inr: number; mode: string; is_active: boolean; is_featured: boolean
  duration_weeks: number; category: string; thumbnail_url: string
}
interface Enquiry {
  id: string; name: string; phone: string; email: string; course_interest: string
  message: string; is_contacted: boolean; created_at: string
}
interface Testimonial {
  id: string; student_name: string; course: string; company_placed: string; review: string
  rating: number; photo_url: string; video_url: string; is_active: boolean
}
interface Faculty {
  id: string; name: string; designation: string; expert_field: string; photo_url: string
  sort_order: number; is_active: boolean
}
interface Instructor {
  id: string; name: string; specialization: string; photo_url: string
  sort_order: number; is_active: boolean
}
interface NewsItem {
  id: string; title: string; summary: string; image_url: string; link_url: string
  is_active: boolean; sort_order: number; published_at: string
}
interface BlogPost {
  id: string; title: string; slug: string; excerpt: string; content: string
  thumbnail_url: string; author: string; is_published: boolean; published_at: string
}
interface YoutubeVideo {
  id: string; title: string; youtube_id: string; category: string
  is_active: boolean; sort_order: number
}
interface PodcastEpisode {
  id: string; title: string; description: string; audio_url: string
  thumbnail_url: string; duration_mins: number; is_active: boolean; sort_order: number
}

type Tab = 'certificates' | 'faculty' | 'courses' | 'testimonials' | 'instructors'
         | 'news' | 'blog' | 'youtube' | 'podcasts' | 'enquiries' | 'settings'

// ────────────────────────── MAIN COMPONENT ──────────────────────────
export default function AdminPanel() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab]   = useState<Tab>('certificates')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError(error.message)
  }
  async function handleLogout() { await supabase.auth.signOut() }

  if (!session) return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:40, width:380, boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#0b1525', margin:0 }}>ATEC Admin Panel</h1>
          <p style={{ color:'#64748b', fontSize:14, marginTop:4 }}>Sign in to manage your website</p>
        </div>
        {loginError && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'#dc2626', fontSize:14 }}>{loginError}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
          style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:14, marginBottom:12, boxSizing:'border-box' }} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleLogin()}
          style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:14, marginBottom:20, boxSizing:'border-box' }} />
        <button onClick={handleLogin}
          style={{ width:'100%', padding:'12px', background:'#0b1525', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer' }}>
          Sign In
        </button>
      </div>
    </div>
  )

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key:'certificates', label:'Certificates',  icon:'🎓' },
    { key:'faculty',      label:'Faculty',        icon:'👨‍🏫' },
    { key:'instructors',  label:'Instructors',    icon:'🧑‍💻' },
    { key:'courses',      label:'Courses',        icon:'📚' },
    { key:'testimonials', label:'Testimonials',   icon:'⭐' },
    { key:'news',         label:'News',           icon:'📰' },
    { key:'blog',         label:'Blog',           icon:'✍️' },
    { key:'youtube',      label:'YouTube',        icon:'▶️' },
    { key:'podcasts',     label:'Podcasts',       icon:'🎙️' },
    { key:'enquiries',    label:'Enquiries',      icon:'📩' },
    { key:'settings',     label:'Settings',       icon:'⚙️' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Inter',sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background:'#0b1525', color:'#fff', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer', padding:4 }}>☰</button>
          <span style={{ fontWeight:700, fontSize:16 }}>ATEC Admin</span>
          <span style={{ background:'#d4f01a', color:'#0b1525', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
            {tabs.find(t=>t.key===activeTab)?.label}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href="/" target="_blank" style={{ color:'#94a3b8', fontSize:13, textDecoration:'none' }}>View Site ↗</a>
          <button onClick={handleLogout} style={{ background:'#1e293b', color:'#94a3b8', border:'none', borderRadius:8, padding:'6px 14px', fontSize:13, cursor:'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ display:'flex', minHeight:'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        <aside style={{
          width: sidebarOpen ? 220 : 56, background:'#fff', borderRight:'1px solid #e2e8f0',
          transition:'width 0.2s ease', overflow:'hidden', flexShrink:0, position:'sticky', top:56, height:'calc(100vh - 56px)'
        }}>
          <nav style={{ padding:'12px 0' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={()=>{ setActiveTab(t.key); setSidebarOpen(false) }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                  background: activeTab===t.key ? '#f0f9ff' : 'none',
                  border:'none', borderLeft: activeTab===t.key ? '3px solid #0b1525' : '3px solid transparent',
                  color: activeTab===t.key ? '#0b1525' : '#64748b', cursor:'pointer',
                  fontSize:14, fontWeight: activeTab===t.key ? 600 : 400, textAlign:'left',
                  whiteSpace:'nowrap', transition:'all 0.15s'
                }}>
                <span style={{ fontSize:18, flexShrink:0, width:24, textAlign:'center' }}>{t.icon}</span>
                {sidebarOpen && t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex:1, padding:28, minWidth:0, overflowX:'hidden' }}>
          {activeTab === 'certificates'  && <CertificatesTab />}
          {activeTab === 'faculty'       && <FacultyTab />}
          {activeTab === 'instructors'   && <InstructorsTab />}
          {activeTab === 'courses'       && <CoursesTab />}
          {activeTab === 'testimonials'  && <TestimonialsTab />}
          {activeTab === 'news'          && <NewsTab />}
          {activeTab === 'blog'          && <BlogTab />}
          {activeTab === 'youtube'       && <YoutubeTab />}
          {activeTab === 'podcasts'      && <PodcastsTab />}
          {activeTab === 'enquiries'     && <EnquiriesTab />}
          {activeTab === 'settings'      && <SettingsTab />}
        </main>
      </div>
    </div>
  )
}

// ────────────────────────── SHARED HELPERS ──────────────────────────
function Msg({ text }: { text: string }) {
  if (!text) return null
  const ok = text.startsWith('✅')
  return <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:14, fontWeight:500,
    background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#15803d' : '#dc2626',
    border: `1px solid ${ok ? '#bbf7d0' : '#fca5a5'}` }}>{text}</div>
}

function PageHeader({ title, onAdd, addLabel='+ Add New' }: { title:string; onAdd?:()=>void; addLabel?:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
      <h2 style={{ fontSize:22, fontWeight:700, color:'#0b1525', margin:0 }}>{title}</h2>
      {onAdd && <button onClick={onAdd} style={{ background:'#0b1525', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{addLabel}</button>}
    </div>
  )
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead>
          <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
            {headers.map(h => <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontWeight:600, color:'#64748b', fontSize:12, textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <td style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', verticalAlign:'middle', textAlign: center ? 'center' : 'left' }}>{children}</td>
}

function ActiveBadge({ active }: { active: boolean }) {
  return <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background: active ? '#dcfce7' : '#f1f5f9', color: active ? '#16a34a' : '#94a3b8' }}>{active ? 'Active' : 'Hidden'}</span>
}

function ActionBtn({ onClick, danger, children }: { onClick: ()=>void; danger?:boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, marginRight:6, background: danger ? '#fef2f2' : '#f1f5f9', color: danger ? '#dc2626' : '#374151' }}>
      {children}
    </button>
  )
}

function Input({ label, value, onChange, type='text', placeholder='', fullWidth=false }: any) {
  return (
    <div style={{ marginBottom:16, width: fullWidth ? '100%' : 'auto' }}>
      {label && <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{label}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:14, boxSizing:'border-box' }} />
    </div>
  )
}

function Textarea({ label, value, onChange, rows=4 }: any) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{label}</label>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:14, boxSizing:'border-box', resize:'vertical' }} />
    </div>
  )
}

function Select({ label, value, onChange, options }: { label:string; value:string; onChange:(v:string)=>void; options:{value:string;label:string}[] }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:14 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function FormPanel({ title, onClose, onSave, saving, msg, children }: any) {
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:24, marginBottom:24, border:'1.5px solid #e2e8f0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:'#0b1525' }}>{title}</h3>
        <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:13 }}>✕ Cancel</button>
      </div>
      <Msg text={msg} />
      {children}
      <button onClick={onSave} disabled={saving}
        style={{ background:'#0b1525', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : '💾 Save'}
      </button>
    </div>
  )
}

// ────────────────────────── CERTIFICATES TAB ──────────────────────────
function CertificatesTab() {
  const [list, setList]     = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg]       = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('certificates').select('*').order('created_at', { ascending: false }).limit(50)
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function doSearch() {
    if (!search.trim()) { load(); return }
    setLoading(true)
    const q = search.trim()
    const { data } = await supabase.from('certificates').select('*')
      .or(`certificate_no.ilike.%${q}%,student_name.ilike.%${q}%,batch_id.ilike.%${q}%,father_name.ilike.%${q}%`)
      .limit(50)
    setList(data ?? [])
    setLoading(false)
  }

  async function toggleActive(c: Certificate) {
    await supabase.from('certificates').update({ is_active: !c.is_active }).eq('id', c.id)
    setList(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x))
  }

  return (
    <div>
      <PageHeader title="Certificates" />
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
          placeholder="Search by cert no, name, batch, father's name…"
          style={{ flex:1, padding:'10px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:14 }} />
        <button onClick={doSearch} style={{ background:'#0b1525', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Search</button>
        <button onClick={()=>{ setSearch(''); load() }} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'10px 16px', fontSize:13, cursor:'pointer' }}>Reset</button>
      </div>
      <Msg text={msg} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <Table headers={['Cert No','Student Name','Father Name','Course','Batch','Grade','Date','Status','Actions']}>
          {list.map(c => (
            <tr key={c.id} style={{ opacity: c.is_active ? 1 : 0.5 }}>
              <Td><span style={{ color:'#0b1525', fontWeight:600, fontFamily:'monospace', fontSize:13 }}>{c.certificate_no}</span></Td>
              <Td><span style={{ fontWeight:600 }}>{c.student_name}</span></Td>
              <Td>{c.father_name}</Td>
              <Td><span style={{ maxWidth:160, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.course_name}</span></Td>
              <Td>{c.batch_id || '—'}</Td>
              <Td><span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'2px 8px', borderRadius:12, fontWeight:700, fontSize:13 }}>{c.grade || '—'}</span></Td>
              <Td>{c.issue_date ? new Date(c.issue_date).toLocaleDateString('en-IN') : '—'}</Td>
              <Td center><ActiveBadge active={c.is_active} /></Td>
              <Td>
                <ActionBtn danger={c.is_active} onClick={()=>toggleActive(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</ActionBtn>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <p style={{ color:'#94a3b8', fontSize:13, marginTop:12 }}>Showing latest 50. Use search to find specific certificates. To add/import certificates, use <a href="/admin/" style={{ color:'#0b1525' }}>Certificate Admin</a>.</p>
    </div>
  )
}

// ────────────────────────── FACULTY TAB ──────────────────────────
function FacultyTab() {
  const [list, setList]     = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]       = useState('')
  const empty = { name:'', designation:'', expert_field:'', photo_url:'', sort_order:0, is_active:true }
  const [form, setForm]     = useState<Omit<Faculty,'id'>>(empty)
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('faculty').select('*').order('sort_order')
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startAdd() { setForm(empty); setEditId(null); setShowForm(true); setMsg('') }
  function startEdit(item: Faculty) { setForm({ name:item.name, designation:item.designation, expert_field:item.expert_field, photo_url:item.photo_url, sort_order:item.sort_order, is_active:item.is_active }); setEditId(item.id); setShowForm(true); setMsg('') }

  async function save() {
    setSaving(true); setMsg('')
    try {
      if (editId) {
        const { error } = await supabase.from('faculty').update(form).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('faculty').insert(form)
        if (error) throw error
      }
      setMsg('✅ Saved!'); setShowForm(false); load()
    } catch(e:any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(item: Faculty) {
    await supabase.from('faculty').update({ is_active: !item.is_active }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_active: !x.is_active } : x))
  }
  async function remove(id: string) {
    if (!confirm('Delete this faculty member?')) return
    await supabase.from('faculty').delete().eq('id', id)
    setList(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div>
      <PageHeader title="Faculty Members" onAdd={startAdd} />
      {showForm && (
        <FormPanel title={editId ? 'Edit Faculty' : 'Add Faculty'} onClose={()=>setShowForm(false)} onSave={save} saving={saving} msg={msg}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Name *" value={form.name} onChange={(v:string)=>f('name',v)} placeholder="Er. Rajesh Kumar" />
            <Input label="Designation" value={form.designation} onChange={(v:string)=>f('designation',v)} placeholder="Senior Faculty" />
            <Input label="Expert Field" value={form.expert_field} onChange={(v:string)=>f('expert_field',v)} placeholder="Hardware & Networking" />
            <Input label="Sort Order" type="number" value={form.sort_order} onChange={(v:string)=>f('sort_order',parseInt(v)||0)} />
          </div>
          <Input label="Photo URL" value={form.photo_url} onChange={(v:string)=>f('photo_url',v)} placeholder="https://..." />
          {form.photo_url && <img src={form.photo_url} alt="" style={{ width:80, height:80, objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} />
            <span style={{ fontSize:14 }}>Active (visible on homepage)</span>
          </label>
        </FormPanel>
      )}
      <Msg text={!showForm ? msg : ''} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <Table headers={['Photo','Name','Designation','Expert Field','Order','Status','Actions']}>
          {list.map(item => (
            <tr key={item.id}>
              <Td><img src={item.photo_url||`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=0b1525&color=d4f01a&size=40`} alt="" style={{ width:40, height:40, borderRadius:8, objectFit:'cover' }} /></Td>
              <Td><span style={{ fontWeight:600 }}>{item.name}</span></Td>
              <Td>{item.designation}</Td>
              <Td>{item.expert_field}</Td>
              <Td center>{item.sort_order}</Td>
              <Td center><ActiveBadge active={item.is_active} /></Td>
              <Td>
                <ActionBtn onClick={()=>startEdit(item)}>Edit</ActionBtn>
                <ActionBtn onClick={()=>toggleActive(item)}>{item.is_active ? 'Hide' : 'Show'}</ActionBtn>
                <ActionBtn danger onClick={()=>remove(item.id)}>Delete</ActionBtn>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// ────────────────────────── INSTRUCTORS TAB ──────────────────────────
function InstructorsTab() {
  const [list, setList]     = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]       = useState('')
  const empty = { name:'', specialization:'', photo_url:'', sort_order:0, is_active:true }
  const [form, setForm]     = useState<Omit<Instructor,'id'>>(empty)
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('instructors').select('*').order('sort_order')
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startAdd() { setForm(empty); setEditId(null); setShowForm(true); setMsg('') }
  function startEdit(item: Instructor) { setForm({ name:item.name, specialization:item.specialization, photo_url:item.photo_url, sort_order:item.sort_order, is_active:item.is_active }); setEditId(item.id); setShowForm(true); setMsg('') }

  async function save() {
    setSaving(true); setMsg('')
    try {
      if (editId) {
        const { error } = await supabase.from('instructors').update(form).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('instructors').insert(form)
        if (error) throw error
      }
      setMsg('✅ Saved!'); setShowForm(false); load()
    } catch(e:any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(item: Instructor) {
    await supabase.from('instructors').update({ is_active: !item.is_active }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_active: !x.is_active } : x))
  }
  async function remove(id: string) {
    if (!confirm('Delete this instructor?')) return
    await supabase.from('instructors').delete().eq('id', id)
    setList(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div>
      <PageHeader title="Instructors (Expert Faculty on Homepage)" onAdd={startAdd} />
      {showForm && (
        <FormPanel title={editId ? 'Edit Instructor' : 'Add Instructor'} onClose={()=>setShowForm(false)} onSave={save} saving={saving} msg={msg}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Name *" value={form.name} onChange={(v:string)=>f('name',v)} placeholder="Er. Rajesh Kumar" />
            <Input label="Specialization" value={form.specialization} onChange={(v:string)=>f('specialization',v)} placeholder="Hardware & Networking" />
            <Input label="Sort Order" type="number" value={form.sort_order} onChange={(v:string)=>f('sort_order',parseInt(v)||0)} />
          </div>
          <Input label="Photo URL" value={form.photo_url} onChange={(v:string)=>f('photo_url',v)} placeholder="https://..." />
          {form.photo_url && <img src={form.photo_url} alt="" style={{ width:80, height:80, objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} />
            <span style={{ fontSize:14 }}>Active (visible on homepage)</span>
          </label>
        </FormPanel>
      )}
      <Msg text={!showForm ? msg : ''} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <Table headers={['Photo','Name','Specialization','Order','Status','Actions']}>
          {list.map(item => (
            <tr key={item.id}>
              <Td><img src={item.photo_url||`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=0b1525&color=d4f01a&size=40`} alt="" style={{ width:40, height:40, borderRadius:8, objectFit:'cover' }} /></Td>
              <Td><span style={{ fontWeight:600 }}>{item.name}</span></Td>
              <Td>{item.specialization}</Td>
              <Td center>{item.sort_order}</Td>
              <Td center><ActiveBadge active={item.is_active} /></Td>
              <Td>
                <ActionBtn onClick={()=>startEdit(item)}>Edit</ActionBtn>
                <ActionBtn onClick={()=>toggleActive(item)}>{item.is_active ? 'Hide' : 'Show'}</ActionBtn>
                <ActionBtn danger onClick={()=>remove(item.id)}>Delete</ActionBtn>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// ────────────────────────── COURSES TAB ──────────────────────────
function CoursesTab() {
  const [list, setList]     = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]       = useState('')
  const empty = { title:'', slug:'', short_description:'', fee_inr:0, original_fee_inr:0, mode:'online', is_active:true, is_featured:false, duration_weeks:8, category:'', thumbnail_url:'' }
  const [form, setForm]     = useState<Omit<Course,'id'>>(empty)
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('courses').select('*').order('sort_order')
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startAdd() { setForm(empty); setEditId(null); setShowForm(true); setMsg('') }
  function startEdit(item: Course) {
    setForm({ title:item.title, slug:item.slug, short_description:item.short_description, fee_inr:item.fee_inr, original_fee_inr:item.original_fee_inr, mode:item.mode, is_active:item.is_active, is_featured:item.is_featured, duration_weeks:item.duration_weeks, category:item.category, thumbnail_url:item.thumbnail_url })
    setEditId(item.id); setShowForm(true); setMsg('')
  }

  async function save() {
    setSaving(true); setMsg('')
    try {
      if (editId) {
        const { error } = await supabase.from('courses').update(form).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('courses').insert(form)
        if (error) throw error
      }
      setMsg('✅ Saved!'); setShowForm(false); load()
    } catch(e:any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(item: Course) {
    await supabase.from('courses').update({ is_active: !item.is_active }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_active: !x.is_active } : x))
  }
  async function toggleFeatured(item: Course) {
    await supabase.from('courses').update({ is_featured: !item.is_featured }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_featured: !x.is_featured } : x))
  }

  return (
    <div>
      <PageHeader title="Courses" onAdd={startAdd} />
      {showForm && (
        <FormPanel title={editId ? 'Edit Course' : 'Add Course'} onClose={()=>setShowForm(false)} onSave={save} saving={saving} msg={msg}>
          <Input label="Thumbnail URL" value={form.thumbnail_url} onChange={(v:string)=>f('thumbnail_url',v)} placeholder="https://..." />
          {form.thumbnail_url && <img src={form.thumbnail_url} alt="" style={{ width:120, height:80, objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Title *" value={form.title} onChange={(v:string)=>f('title',v)} placeholder="MERN Stack" />
            <Input label="Slug *" value={form.slug} onChange={(v:string)=>f('slug',v)} placeholder="mern-stack" />
            <Input label="Category" value={form.category} onChange={(v:string)=>f('category',v)} placeholder="web, ai, hardware…" />
            <Select label="Mode" value={form.mode} onChange={(v:string)=>f('mode',v)} options={[{value:'online',label:'Online'},{value:'hybrid',label:'Hybrid'},{value:'offline',label:'Offline'}]} />
            <Input label="Fee (₹)" type="number" value={form.fee_inr} onChange={(v:string)=>f('fee_inr',parseInt(v)||0)} />
            <Input label="Original Fee (₹)" type="number" value={form.original_fee_inr} onChange={(v:string)=>f('original_fee_inr',parseInt(v)||0)} />
            <Input label="Duration (weeks)" type="number" value={form.duration_weeks} onChange={(v:string)=>f('duration_weeks',parseInt(v)||0)} />
          </div>
          <Textarea label="Short Description" value={form.short_description} onChange={(v:string)=>f('short_description',v)} rows={2} />
          <div style={{ display:'flex', gap:24 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} />
              <span style={{ fontSize:14 }}>Active</span>
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={form.is_featured} onChange={e=>f('is_featured',e.target.checked)} />
              <span style={{ fontSize:14 }}>Featured on Homepage</span>
            </label>
          </div>
        </FormPanel>
      )}
      <Msg text={!showForm ? msg : ''} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <Table headers={['Thumbnail','Title','Mode','Fee','Featured','Status','Actions']}>
          {list.map(item => (
            <tr key={item.id}>
              <Td>{item.thumbnail_url ? <img src={item.thumbnail_url} alt="" style={{ width:60, height:40, objectFit:'cover', borderRadius:6 }} /> : <span style={{ color:'#94a3b8', fontSize:12 }}>No image</span>}</Td>
              <Td><span style={{ fontWeight:600 }}>{item.title}</span><br/><span style={{ color:'#94a3b8', fontSize:12 }}>/{item.slug}</span></Td>
              <Td><span style={{ padding:'3px 8px', borderRadius:12, fontSize:12, fontWeight:600, background: item.mode==='online' ? '#eff6ff' : item.mode==='hybrid' ? '#fef3c7' : '#f0fdf4', color: item.mode==='online' ? '#1d4ed8' : item.mode==='hybrid' ? '#92400e' : '#15803d' }}>{item.mode}</span></Td>
              <Td>₹{item.fee_inr?.toLocaleString()}</Td>
              <Td center>
                <button onClick={()=>toggleFeatured(item)} style={{ background: item.is_featured ? '#fef3c7' : '#f1f5f9', border:'none', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, cursor:'pointer', color: item.is_featured ? '#92400e' : '#94a3b8' }}>
                  {item.is_featured ? '⭐ Featured' : '— '}
                </button>
              </Td>
              <Td center><ActiveBadge active={item.is_active} /></Td>
              <Td>
                <ActionBtn onClick={()=>startEdit(item)}>Edit</ActionBtn>
                <ActionBtn onClick={()=>toggleActive(item)}>{item.is_active ? 'Hide' : 'Show'}</ActionBtn>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// ────────────────────────── TESTIMONIALS TAB ──────────────────────────
function TestimonialsTab() {
  const [list, setList]     = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]       = useState('')
  const empty = { student_name:'', course:'', company_placed:'', review:'', rating:5, photo_url:'', video_url:'', is_active:true }
  const [form, setForm]     = useState<Omit<Testimonial,'id'>>(empty)
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false })
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startAdd() { setForm(empty); setEditId(null); setShowForm(true); setMsg('') }
  function startEdit(item: Testimonial) {
    setForm({ student_name:item.student_name, course:item.course, company_placed:item.company_placed, review:item.review, rating:item.rating, photo_url:item.photo_url, video_url:item.video_url, is_active:item.is_active })
    setEditId(item.id); setShowForm(true); setMsg('')
  }

  async function save() {
    setSaving(true); setMsg('')
    try {
      if (editId) {
        const { error } = await supabase.from('testimonials').update(form).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('testimonials').insert(form)
        if (error) throw error
      }
      setMsg('✅ Saved!'); setShowForm(false); load()
    } catch(e:any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(item: Testimonial) {
    await supabase.from('testimonials').update({ is_active: !item.is_active }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_active: !x.is_active } : x))
  }
  async function remove(id: string) {
    if (!confirm('Delete this testimonial?')) return
    await supabase.from('testimonials').delete().eq('id', id)
    setList(prev => prev.filter(x => x.id !== id))
  }

  // Extract YouTube ID from URL
  function extractYTId(url: string): string|null {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([A-Za-z0-9_-]{11})/)
    return m ? m[1] : null
  }

  return (
    <div>
      <PageHeader title="Student Stories / Testimonials" onAdd={startAdd} />
      {showForm && (
        <FormPanel title={editId ? 'Edit Testimonial' : 'Add Testimonial'} onClose={()=>setShowForm(false)} onSave={save} saving={saving} msg={msg}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Student Name *" value={form.student_name} onChange={(v:string)=>f('student_name',v)} placeholder="Roshni Singh" />
            <Input label="Course" value={form.course} onChange={(v:string)=>f('course',v)} placeholder="MERN Stack" />
            <Input label="Company / Placed At" value={form.company_placed} onChange={(v:string)=>f('company_placed',v)} placeholder="Infosys, Chandigarh" />
            <Select label="Rating" value={String(form.rating)} onChange={(v:string)=>f('rating',parseInt(v))} options={[5,4,3,2,1].map(n=>({value:String(n),label:'⭐'.repeat(n)}))} />
          </div>
          <Textarea label="Review" value={form.review} onChange={(v:string)=>f('review',v)} rows={3} />
          <Input label="Photo URL (student photo)" value={form.photo_url} onChange={(v:string)=>f('photo_url',v)} placeholder="https://i.postimg.cc/..." />
          {form.photo_url && <img src={form.photo_url} alt="" style={{ width:80, height:80, objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
          <Input label="Video URL (YouTube link for story card)" value={form.video_url} onChange={(v:string)=>f('video_url',v)} placeholder="https://youtu.be/... or YouTube ID" />
          {form.video_url && extractYTId(form.video_url) && (
            <img src={`https://img.youtube.com/vi/${extractYTId(form.video_url)}/mqdefault.jpg`} alt="thumbnail" style={{ width:160, height:90, objectFit:'cover', borderRadius:8, marginBottom:16 }} />
          )}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} />
            <span style={{ fontSize:14 }}>Active (visible on homepage)</span>
          </label>
        </FormPanel>
      )}
      <Msg text={!showForm ? msg : ''} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {list.map(item => (
            <div key={item.id} style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', opacity: item.is_active ? 1 : 0.5 }}>
              <div style={{ display:'flex', gap:12, marginBottom:10 }}>
                {item.photo_url ? <img src={item.photo_url} alt="" style={{ width:48, height:48, borderRadius:8, objectFit:'cover' }} /> : <div style={{ width:48, height:48, borderRadius:8, background:'#0b1525', display:'flex', alignItems:'center', justifyContent:'center', color:'#d4f01a', fontWeight:700 }}>{item.student_name[0]}</div>}
                <div>
                  <p style={{ margin:0, fontWeight:600, fontSize:14 }}>{item.student_name}</p>
                  <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>{item.course}</p>
                  <span style={{ fontSize:13 }}>{'⭐'.repeat(item.rating)}</span>
                </div>
              </div>
              {item.video_url && extractYTId(item.video_url) && (
                <img src={`https://img.youtube.com/vi/${extractYTId(item.video_url)}/mqdefault.jpg`} alt="" style={{ width:'100%', height:100, objectFit:'cover', borderRadius:6, marginBottom:8 }} />
              )}
              <p style={{ fontSize:13, color:'#64748b', marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.review}</p>
              {item.company_placed && <p style={{ fontSize:12, color:'#16a34a', fontWeight:600, marginBottom:10 }}>📍 {item.company_placed}</p>}
              <div style={{ display:'flex', gap:6 }}>
                <ActionBtn onClick={()=>startEdit(item)}>Edit</ActionBtn>
                <ActionBtn onClick={()=>toggleActive(item)}>{item.is_active ? 'Hide' : 'Show'}</ActionBtn>
                <ActionBtn danger onClick={()=>remove(item.id)}>Delete</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────── NEWS TAB ──────────────────────────
function NewsTab() {
  const [list, setList]     = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]       = useState('')
  const empty = { title:'', summary:'', image_url:'', link_url:'', is_active:true, sort_order:0, published_at:'' }
  const [form, setForm]     = useState<Omit<NewsItem,'id'>>(empty)
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('news_items').select('*').order('sort_order')
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startAdd() { setForm(empty); setEditId(null); setShowForm(true); setMsg('') }
  function startEdit(item: NewsItem) {
    setForm({ title:item.title, summary:item.summary, image_url:item.image_url, link_url:item.link_url, is_active:item.is_active, sort_order:item.sort_order, published_at:item.published_at })
    setEditId(item.id); setShowForm(true); setMsg('')
  }

  async function save() {
    setSaving(true); setMsg('')
    try {
      if (editId) {
        const { error } = await supabase.from('news_items').update(form).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('news_items').insert(form)
        if (error) throw error
      }
      setMsg('✅ Saved!'); setShowForm(false); load()
    } catch(e:any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(item: NewsItem) {
    await supabase.from('news_items').update({ is_active: !item.is_active }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_active: !x.is_active } : x))
  }
  async function remove(id: string) {
    if (!confirm('Delete this news item?')) return
    await supabase.from('news_items').delete().eq('id', id)
    setList(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div>
      <PageHeader title="News & Announcements" onAdd={startAdd} />
      {showForm && (
        <FormPanel title={editId ? 'Edit News Item' : 'Add News Item'} onClose={()=>setShowForm(false)} onSave={save} saving={saving} msg={msg}>
          <Input label="Title *" value={form.title} onChange={(v:string)=>f('title',v)} placeholder="New Batch Starting June 2026" />
          <Textarea label="Summary" value={form.summary} onChange={(v:string)=>f('summary',v)} rows={2} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Image URL" value={form.image_url} onChange={(v:string)=>f('image_url',v)} placeholder="https://..." />
            <Input label="Link URL" value={form.link_url} onChange={(v:string)=>f('link_url',v)} placeholder="/courses/mern-stack" />
            <Input label="Sort Order" type="number" value={form.sort_order} onChange={(v:string)=>f('sort_order',parseInt(v)||0)} />
            <Input label="Published Date" type="date" value={form.published_at?.slice(0,10)||''} onChange={(v:string)=>f('published_at',v)} />
          </div>
          {form.image_url && <img src={form.image_url} alt="" style={{ width:200, height:120, objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} />
            <span style={{ fontSize:14 }}>Active (visible on homepage)</span>
          </label>
        </FormPanel>
      )}
      <Msg text={!showForm ? msg : ''} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <Table headers={['Image','Title','Summary','Order','Status','Actions']}>
          {list.map(item => (
            <tr key={item.id}>
              <Td>{item.image_url ? <img src={item.image_url} alt="" style={{ width:80, height:50, objectFit:'cover', borderRadius:6 }} /> : <span style={{ color:'#94a3b8' }}>—</span>}</Td>
              <Td><span style={{ fontWeight:600 }}>{item.title}</span></Td>
              <Td><span style={{ maxWidth:200, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#64748b', fontSize:13 }}>{item.summary}</span></Td>
              <Td center>{item.sort_order}</Td>
              <Td center><ActiveBadge active={item.is_active} /></Td>
              <Td>
                <ActionBtn onClick={()=>startEdit(item)}>Edit</ActionBtn>
                <ActionBtn onClick={()=>toggleActive(item)}>{item.is_active ? 'Hide' : 'Show'}</ActionBtn>
                <ActionBtn danger onClick={()=>remove(item.id)}>Delete</ActionBtn>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// ────────────────────────── BLOG TAB ──────────────────────────
function BlogTab() {
  const [list, setList]     = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]       = useState('')
  const empty = { title:'', slug:'', excerpt:'', content:'', thumbnail_url:'', author:'ATEC Team', is_published:false, published_at:'' }
  const [form, setForm]     = useState<Omit<BlogPost,'id'>>(empty)
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startAdd() { setForm(empty); setEditId(null); setShowForm(true); setMsg('') }
  function startEdit(item: BlogPost) {
    setForm({ title:item.title, slug:item.slug, excerpt:item.excerpt, content:item.content, thumbnail_url:item.thumbnail_url, author:item.author, is_published:item.is_published, published_at:item.published_at })
    setEditId(item.id); setShowForm(true); setMsg('')
  }

  async function save() {
    setSaving(true); setMsg('')
    try {
      if (editId) {
        const { error } = await supabase.from('blog_posts').update(form).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('blog_posts').insert(form)
        if (error) throw error
      }
      setMsg('✅ Saved!'); setShowForm(false); load()
    } catch(e:any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function togglePublished(item: BlogPost) {
    await supabase.from('blog_posts').update({ is_published: !item.is_published }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_published: !x.is_published } : x))
  }
  async function remove(id: string) {
    if (!confirm('Delete this blog post?')) return
    await supabase.from('blog_posts').delete().eq('id', id)
    setList(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div>
      <PageHeader title="Blog Posts" onAdd={startAdd} />
      {showForm && (
        <FormPanel title={editId ? 'Edit Blog Post' : 'New Blog Post'} onClose={()=>setShowForm(false)} onSave={save} saving={saving} msg={msg}>
          <Input label="Thumbnail URL" value={form.thumbnail_url} onChange={(v:string)=>f('thumbnail_url',v)} placeholder="https://..." />
          {form.thumbnail_url && <img src={form.thumbnail_url} alt="" style={{ width:200, height:120, objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Title *" value={form.title} onChange={(v:string)=>f('title',v)} placeholder="How to learn MERN Stack in 2026" />
            <Input label="Slug *" value={form.slug} onChange={(v:string)=>f('slug',v)} placeholder="how-to-learn-mern-stack-2026" />
            <Input label="Author" value={form.author} onChange={(v:string)=>f('author',v)} placeholder="ATEC Team" />
            <Input label="Publish Date" type="date" value={form.published_at?.slice(0,10)||''} onChange={(v:string)=>f('published_at',v)} />
          </div>
          <Textarea label="Excerpt (shown on blog listing)" value={form.excerpt} onChange={(v:string)=>f('excerpt',v)} rows={2} />
          <Textarea label="Content (full article — supports basic HTML)" value={form.content} onChange={(v:string)=>f('content',v)} rows={8} />
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={form.is_published} onChange={e=>f('is_published',e.target.checked)} />
            <span style={{ fontSize:14 }}>Published (visible to public)</span>
          </label>
        </FormPanel>
      )}
      <Msg text={!showForm ? msg : ''} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <Table headers={['Thumbnail','Title','Author','Status','Actions']}>
          {list.map(item => (
            <tr key={item.id}>
              <Td>{item.thumbnail_url ? <img src={item.thumbnail_url} alt="" style={{ width:80, height:50, objectFit:'cover', borderRadius:6 }} /> : <span style={{ color:'#94a3b8' }}>—</span>}</Td>
              <Td>
                <span style={{ fontWeight:600 }}>{item.title}</span><br/>
                <span style={{ color:'#94a3b8', fontSize:12 }}>/blog/{item.slug}</span>
              </Td>
              <Td>{item.author}</Td>
              <Td center>
                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background: item.is_published ? '#dcfce7' : '#fef3c7', color: item.is_published ? '#16a34a' : '#92400e' }}>
                  {item.is_published ? 'Published' : 'Draft'}
                </span>
              </Td>
              <Td>
                <ActionBtn onClick={()=>startEdit(item)}>Edit</ActionBtn>
                <ActionBtn onClick={()=>togglePublished(item)}>{item.is_published ? 'Unpublish' : 'Publish'}</ActionBtn>
                <ActionBtn danger onClick={()=>remove(item.id)}>Delete</ActionBtn>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// ────────────────────────── YOUTUBE TAB ──────────────────────────
function YoutubeTab() {
  const [list, setList]     = useState<YoutubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]       = useState('')
  const empty = { title:'', youtube_id:'', category:'', is_active:true, sort_order:0 }
  const [form, setForm]     = useState<Omit<YoutubeVideo,'id'>>(empty)
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  function extractYTId(url: string): string {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([A-Za-z0-9_-]{11})/)
    return m ? m[1] : url
  }

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('youtube_videos').select('*').order('sort_order')
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startAdd() { setForm(empty); setEditId(null); setShowForm(true); setMsg('') }
  function startEdit(item: YoutubeVideo) {
    setForm({ title:item.title, youtube_id:item.youtube_id, category:item.category, is_active:item.is_active, sort_order:item.sort_order })
    setEditId(item.id); setShowForm(true); setMsg('')
  }

  async function save() {
    setSaving(true); setMsg('')
    try {
      const data = { ...form, youtube_id: extractYTId(form.youtube_id) }
      if (editId) {
        const { error } = await supabase.from('youtube_videos').update(data).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('youtube_videos').insert(data)
        if (error) throw error
      }
      setMsg('✅ Saved!'); setShowForm(false); load()
    } catch(e:any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(item: YoutubeVideo) {
    await supabase.from('youtube_videos').update({ is_active: !item.is_active }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_active: !x.is_active } : x))
  }
  async function remove(id: string) {
    if (!confirm('Delete this video?')) return
    await supabase.from('youtube_videos').delete().eq('id', id)
    setList(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div>
      <PageHeader title="YouTube Videos" onAdd={startAdd} />
      {showForm && (
        <FormPanel title={editId ? 'Edit Video' : 'Add Video'} onClose={()=>setShowForm(false)} onSave={save} saving={saving} msg={msg}>
          <Input label="Title *" value={form.title} onChange={(v:string)=>f('title',v)} placeholder="How to install Windows 11" />
          <Input label="YouTube URL or Video ID" value={form.youtube_id} onChange={(v:string)=>f('youtube_id',v)} placeholder="https://youtu.be/... or dQw4w9WgXcQ" />
          {form.youtube_id && <img src={`https://img.youtube.com/vi/${extractYTId(form.youtube_id)}/mqdefault.jpg`} alt="thumbnail" style={{ width:200, height:112, objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Category" value={form.category} onChange={(v:string)=>f('category',v)} placeholder="tutorial, hardware, mern…" />
            <Input label="Sort Order" type="number" value={form.sort_order} onChange={(v:string)=>f('sort_order',parseInt(v)||0)} />
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} />
            <span style={{ fontSize:14 }}>Active (visible on homepage)</span>
          </label>
        </FormPanel>
      )}
      <Msg text={!showForm ? msg : ''} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
          {list.map(item => (
            <div key={item.id} style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1px solid #e2e8f0', opacity: item.is_active ? 1 : 0.5 }}>
              <img src={`https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`} alt="" style={{ width:'100%', height:135, objectFit:'cover' }} />
              <div style={{ padding:12 }}>
                <p style={{ margin:'0 0 4px', fontWeight:600, fontSize:14 }}>{item.title}</p>
                {item.category && <p style={{ margin:'0 0 10px', fontSize:12, color:'#94a3b8' }}>{item.category}</p>}
                <div style={{ display:'flex', gap:6 }}>
                  <ActionBtn onClick={()=>startEdit(item)}>Edit</ActionBtn>
                  <ActionBtn onClick={()=>toggleActive(item)}>{item.is_active ? 'Hide' : 'Show'}</ActionBtn>
                  <ActionBtn danger onClick={()=>remove(item.id)}>Del</ActionBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────── PODCASTS TAB ──────────────────────────
function PodcastsTab() {
  const [list, setList]     = useState<PodcastEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]       = useState('')
  const empty = { title:'', description:'', audio_url:'', thumbnail_url:'', duration_mins:0, is_active:true, sort_order:0 }
  const [form, setForm]     = useState<Omit<PodcastEpisode,'id'>>(empty)
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('podcast_episodes').select('*').order('sort_order')
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startAdd() { setForm(empty); setEditId(null); setShowForm(true); setMsg('') }
  function startEdit(item: PodcastEpisode) {
    setForm({ title:item.title, description:item.description, audio_url:item.audio_url, thumbnail_url:item.thumbnail_url, duration_mins:item.duration_mins, is_active:item.is_active, sort_order:item.sort_order })
    setEditId(item.id); setShowForm(true); setMsg('')
  }

  async function save() {
    setSaving(true); setMsg('')
    try {
      if (editId) {
        const { error } = await supabase.from('podcast_episodes').update(form).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('podcast_episodes').insert(form)
        if (error) throw error
      }
      setMsg('✅ Saved!'); setShowForm(false); load()
    } catch(e:any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(item: PodcastEpisode) {
    await supabase.from('podcast_episodes').update({ is_active: !item.is_active }).eq('id', item.id)
    setList(prev => prev.map(x => x.id === item.id ? { ...x, is_active: !x.is_active } : x))
  }
  async function remove(id: string) {
    if (!confirm('Delete this episode?')) return
    await supabase.from('podcast_episodes').delete().eq('id', id)
    setList(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div>
      <PageHeader title="Podcast Episodes" onAdd={startAdd} />
      {showForm && (
        <FormPanel title={editId ? 'Edit Episode' : 'Add Episode'} onClose={()=>setShowForm(false)} onSave={save} saving={saving} msg={msg}>
          <Input label="Title *" value={form.title} onChange={(v:string)=>f('title',v)} placeholder="Ep 1: Career in AI — What You Need to Know" />
          <Textarea label="Description" value={form.description} onChange={(v:string)=>f('description',v)} rows={2} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Input label="Audio URL (MP3 / Spotify / YouTube)" value={form.audio_url} onChange={(v:string)=>f('audio_url',v)} placeholder="https://..." />
            <Input label="Thumbnail URL" value={form.thumbnail_url} onChange={(v:string)=>f('thumbnail_url',v)} placeholder="https://..." />
            <Input label="Duration (minutes)" type="number" value={form.duration_mins} onChange={(v:string)=>f('duration_mins',parseInt(v)||0)} />
            <Input label="Sort Order" type="number" value={form.sort_order} onChange={(v:string)=>f('sort_order',parseInt(v)||0)} />
          </div>
          {form.thumbnail_url && <img src={form.thumbnail_url} alt="" style={{ width:100, height:100, objectFit:'cover', borderRadius:8, marginBottom:16 }} />}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} />
            <span style={{ fontSize:14 }}>Active (visible on homepage)</span>
          </label>
        </FormPanel>
      )}
      <Msg text={!showForm ? msg : ''} />
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <Table headers={['Cover','Title','Duration','Status','Actions']}>
          {list.map(item => (
            <tr key={item.id}>
              <Td>{item.thumbnail_url ? <img src={item.thumbnail_url} alt="" style={{ width:50, height:50, objectFit:'cover', borderRadius:6 }} /> : <div style={{ width:50, height:50, background:'#0b1525', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎙️</div>}</Td>
              <Td>
                <span style={{ fontWeight:600 }}>{item.title}</span>
                {item.description && <p style={{ margin:'2px 0 0', fontSize:12, color:'#94a3b8', maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.description}</p>}
              </Td>
              <Td>{item.duration_mins ? `${item.duration_mins} min` : '—'}</Td>
              <Td center><ActiveBadge active={item.is_active} /></Td>
              <Td>
                <ActionBtn onClick={()=>startEdit(item)}>Edit</ActionBtn>
                <ActionBtn onClick={()=>toggleActive(item)}>{item.is_active ? 'Hide' : 'Show'}</ActionBtn>
                <ActionBtn danger onClick={()=>remove(item.id)}>Delete</ActionBtn>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// ────────────────────────── ENQUIRIES TAB ──────────────────────────
function EnquiriesTab() {
  const [list, setList]     = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setList(data ?? []); setLoading(false) })
  }, [])

  async function markContacted(e: Enquiry) {
    await supabase.from('enquiries').update({ is_contacted: true }).eq('id', e.id)
    setList(prev => prev.map(x => x.id === e.id ? { ...x, is_contacted: true } : x))
  }

  const pending = list.filter(e => !e.is_contacted).length

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:700, color:'#0b1525', margin:0 }}>Enquiries / Leads</h2>
        {pending > 0 && <span style={{ background:'#dc2626', color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:13, fontWeight:700 }}>{pending} new</span>}
      </div>
      {loading ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div> : (
        <Table headers={['Name','Phone','Course Interest','Message','Date','Status']}>
          {list.map(e => (
            <tr key={e.id} style={{ background: !e.is_contacted ? '#fffbeb' : 'transparent' }}>
              <Td><span style={{ fontWeight:600 }}>{e.name}</span></Td>
              <Td><a href={`tel:${e.phone}`} style={{ color:'#0b1525', fontWeight:600, textDecoration:'none' }}>{e.phone}</a></Td>
              <Td>{e.course_interest || '—'}</Td>
              <Td><span style={{ maxWidth:200, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#64748b', fontSize:13 }}>{e.message || '—'}</span></Td>
              <Td style={{ whiteSpace:'nowrap' } as any}>{e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN') : '—'}</Td>
              <Td center>
                {e.is_contacted ? (
                  <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#dcfce7', color:'#16a34a' }}>✓ Done</span>
                ) : (
                  <button onClick={() => markContacted(e)} style={{ padding:'5px 12px', borderRadius:20, border:'none', background:'#fef3c7', color:'#92400e', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Mark Done
                  </button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// ────────────────────────── SETTINGS TAB ──────────────────────────
function SettingsTab() {
  const [heroSettings, setHeroSettings] = useState<any>({})
  const [statsSettings, setStatsSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [savingHero, setSavingHero] = useState(false)
  const [savingStats, setSavingStats] = useState(false)
  const [msgHero, setMsgHero] = useState('')
  const [msgStats, setMsgStats] = useState('')

  async function load() {
    setLoading(true)
    try {
      const { data: hero } = await supabase.from('site_settings').select('value').eq('key', 'hero').single()
      if (hero?.value) setHeroSettings(hero.value)
    } catch(_) {}
    try {
      const { data: stats } = await supabase.from('site_settings').select('value').eq('key', 'stats').single()
      if (stats?.value) setStatsSettings(stats.value)
    } catch(_) {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveHero() {
    setSavingHero(true); setMsgHero('')
    try {
      const { error } = await supabase.from('site_settings').upsert({ key:'hero', value:heroSettings }, { onConflict:'key' })
      if (error) throw error
      setMsgHero('✅ Hero settings saved!')
    } catch(e:any) { setMsgHero('❌ ' + e.message) }
    finally { setSavingHero(false) }
  }

  async function saveStats() {
    setSavingStats(true); setMsgStats('')
    try {
      const { error } = await supabase.from('site_settings').upsert({ key:'stats', value:statsSettings }, { onConflict:'key' })
      if (error) throw error
      setMsgStats('✅ Stats saved!')
    } catch(e:any) { setMsgStats('❌ ' + e.message) }
    finally { setSavingStats(false) }
  }

  function h(k: string, v: any) { setHeroSettings((p: any) => ({ ...p, [k]: v })) }
  function s(k: string, v: any) { setStatsSettings((p: any) => ({ ...p, [k]: v })) }

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading…</div>

  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:700, color:'#0b1525', marginBottom:24 }}>Site Settings</h2>

      {/* Hero Settings */}
      <div style={{ background:'#fff', borderRadius:12, padding:24, marginBottom:24, border:'1px solid #e2e8f0' }}>
        <h3 style={{ fontSize:17, fontWeight:700, color:'#0b1525', marginBottom:20 }}>🎯 Hero Section</h3>
        <Msg text={msgHero} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <Input label="Subheading (below hero title)" value={heroSettings.subheading||''} onChange={(v:string)=>h('subheading',v)} placeholder="GEN AI | MERN STACK | TALLY | KIDS PROGRAMS" />
          </div>
          <Input label="Bottom Bar Text" value={heroSettings.bottom_bar_text||''} onChange={(v:string)=>h('bottom_bar_text',v)} placeholder="Need help? Talk to us at" />
          <Input label="Bottom Bar Phone" value={heroSettings.bottom_bar_phone||''} onChange={(v:string)=>h('bottom_bar_phone',v)} placeholder="+91 7009933289" />
          <Input label="Bottom Bar CTA Button Text" value={heroSettings.bottom_bar_cta||''} onChange={(v:string)=>h('bottom_bar_cta',v)} placeholder="Request a Call" />
          <Input label="Bottom Bar Link" value={heroSettings.bottom_bar_link||''} onChange={(v:string)=>h('bottom_bar_link',v)} placeholder="/contact" />
          <Input label="Video Bar Text" value={heroSettings.video_bar_text||''} onChange={(v:string)=>h('video_bar_text',v)} placeholder="For OFFLINE COURSES : www.ateceducation.in" />
        </div>
        <button onClick={saveHero} disabled={savingHero} style={{ background:'#0b1525', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:600, cursor: savingHero ? 'not-allowed' : 'pointer', opacity: savingHero ? 0.7 : 1 }}>
          {savingHero ? 'Saving…' : '💾 Save Hero Settings'}
        </button>
      </div>

      {/* Stats Settings */}
      <div style={{ background:'#fff', borderRadius:12, padding:24, border:'1px solid #e2e8f0' }}>
        <h3 style={{ fontSize:17, fontWeight:700, color:'#0b1525', marginBottom:20 }}>📊 Homepage Stats Counter</h3>
        <Msg text={msgStats} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Input label="Years of Excellence" type="number" value={statsSettings.years||25} onChange={(v:string)=>s('years',parseInt(v)||25)} />
          <Input label="Students Trained" type="number" value={statsSettings.students||5000} onChange={(v:string)=>s('students',parseInt(v)||5000)} />
          <Input label="Courses Offered" type="number" value={statsSettings.courses||30} onChange={(v:string)=>s('courses',parseInt(v)||30)} />
          <Input label="Placement %" type="number" value={statsSettings.placement||95} onChange={(v:string)=>s('placement',parseInt(v)||95)} />
        </div>
        <button onClick={saveStats} disabled={savingStats} style={{ background:'#0b1525', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:600, cursor: savingStats ? 'not-allowed' : 'pointer', opacity: savingStats ? 0.7 : 1 }}>
          {savingStats ? 'Saving…' : '💾 Save Stats'}
        </button>
      </div>
    </div>
  )
}
