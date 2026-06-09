// src/components/admin/CertificateAdmin.tsx
// Admin panel for certificate management
// Password-gated, CSV upload, single-entry form, edit/delete with second password

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY
)

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Certificate {
  id: string
  certificate_no: string
  batch_id: string
  student_name: string
  father_name: string
  mother_name: string
  course_name: string
  course_duration: string
  grade: string
  marks_obtained: number | null
  total_marks: number | null
  from_date: string | null
  issue_date: string
  center_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type Tab = 'list' | 'add' | 'csv'

const EMPTY_FORM: Partial<Certificate> = {
  certificate_no: '',
  batch_id: '',
  student_name: '',
  father_name: '',
  mother_name: '',
  course_name: '',
  course_duration: '',
  grade: '',
  marks_obtained: null,
  total_marks: null,
  from_date: '',
  issue_date: '',
  center_name: 'ATEC Gurdaspur',
}

// ─── CSV column mapping ────────────────────────────────────────────────────────
const CSV_COLUMN_MAP: Record<string, keyof Certificate> = {
  'certificate_no': 'certificate_no',
  'cert_no': 'certificate_no',
  'certificate number': 'certificate_no',
  'batch_id': 'batch_id',
  'batch id': 'batch_id',
  'student_name': 'student_name',
  'name': 'student_name',
  'student name': 'student_name',
  'father_name': 'father_name',
  'father name': 'father_name',
  'fname': 'father_name',
  'mother_name': 'mother_name',
  'mother name': 'mother_name',
  'course_name': 'course_name',
  'course': 'course_name',
  'course name': 'course_name',
  'course_duration': 'course_duration',
  'duration': 'course_duration',
  'grade': 'grade',
  'marks_obtained': 'marks_obtained',
  'marks': 'marks_obtained',
  'obtained marks': 'marks_obtained',
  'total_marks': 'total_marks',
  'total marks': 'total_marks',
  'from_date': 'from_date',
  'from date': 'from_date',
  'issue_date': 'issue_date',
  'date': 'issue_date',
  'issue date': 'issue_date',
  'to_date': 'issue_date',
  'to date': 'issue_date',
  'center_name': 'center_name',
  'center': 'center_name',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function clean(val: string): string {
  return val.trim().replace(/[<>'"`;]/g, '').slice(0, 200)
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = lines.slice(1).map(line => {
    const cols: string[] = []
    let cur = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())
    return cols
  })
  return { headers, rows }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CertificateAdmin() {
  const [authed, setAuthed] = useState(false)
  const [adminPwd, setAdminPwd] = useState('')
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState<Tab>('list')

  // list state
  const [certs, setCerts] = useState<Certificate[]>([])
  const [listLoaded, setListLoaded] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 25

  // add/edit form
  const [form, setForm] = useState<Partial<Certificate>>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // CSV state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [csvMapped, setCsvMapped] = useState<Partial<Certificate>[]>([])
  const [csvPreview, setCsvPreview] = useState(false)
  const [csvError, setCsvError] = useState('')
  const [csvSuccess, setCsvSuccess] = useState('')
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvDuplicates, setCsvDuplicates] = useState<string[]>([])
  const csvRef = useRef<HTMLInputElement>(null)

  // delete/edit confirmation
  const [confirmPwd, setConfirmPwd] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'deactivate'; cert: Certificate } | null>(null)
  const [confirmError, setConfirmError] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  // audit log
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [showAudit, setShowAudit] = useState(false)

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const ADMIN_PASSWORD = 'ATEC@Admin2024' // Change this! Ideally move to PUBLIC_ADMIN_HASH

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (adminPwd === ADMIN_PASSWORD) {
      setAuthed(true)
      setAuthError('')
      loadCerts(1, '')
    } else {
      setAuthError('Wrong password. Try again.')
      setAdminPwd('')
    }
  }

  // ── Load Certs ────────────────────────────────────────────────────────────────
  async function loadCerts(pg: number, q: string) {
    setListLoading(true)
    const from = (pg - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('certificates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (q.trim()) {
      query = query.or(
        `certificate_no.ilike.%${q}%,student_name.ilike.%${q}%,batch_id.ilike.%${q}%,father_name.ilike.%${q}%`
      )
    }

    const { data, count, error } = await query
    if (!error && data) {
      setCerts(data as Certificate[])
      setTotalCount(count ?? 0)
      setListLoaded(true)
    }
    setListLoading(false)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    loadCerts(1, search)
  }

  // ── Form handlers ─────────────────────────────────────────────────────────────
  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
    setFormSuccess('')
  }

  function startEdit(cert: Certificate) {
    setForm({
      certificate_no: cert.certificate_no,
      batch_id: cert.batch_id,
      student_name: cert.student_name,
      father_name: cert.father_name,
      mother_name: cert.mother_name || '',
      course_name: cert.course_name,
      course_duration: cert.course_duration || '',
      grade: cert.grade || '',
      marks_obtained: cert.marks_obtained,
      total_marks: cert.total_marks,
      from_date: cert.from_date ? cert.from_date.split('T')[0] : '',
      issue_date: cert.issue_date ? cert.issue_date.split('T')[0] : '',
      center_name: cert.center_name || 'ATEC Gurdaspur',
    })
    setEditingId(cert.id)
    setTab('add')
    setFormError('')
    setFormSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!form.certificate_no?.trim()) return setFormError('Certificate Number is required.')
    if (!form.student_name?.trim()) return setFormError('Student Name is required.')
    if (!form.father_name?.trim()) return setFormError("Father's Name is required.")
    if (!form.course_name?.trim()) return setFormError('Course Name is required.')

    const payload: Partial<Certificate> = {
      certificate_no: clean(form.certificate_no || ''),
      batch_id: clean(form.batch_id || ''),
      student_name: clean(form.student_name || ''),
      father_name: clean(form.father_name || ''),
      mother_name: clean(form.mother_name || ''),
      course_name: clean(form.course_name || ''),
      course_duration: clean(form.course_duration || ''),
      grade: clean(form.grade || ''),
      marks_obtained: form.marks_obtained ? Number(form.marks_obtained) : null,
      total_marks: form.total_marks ? Number(form.total_marks) : null,
      from_date: form.from_date || null,
      issue_date: form.issue_date || null,
      center_name: clean(form.center_name || 'ATEC Gurdaspur'),
      is_active: true,
    }

    setFormLoading(true)

    if (editingId) {
      // UPDATE
      const { error } = await supabase
        .from('certificates')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        setFormError('Update failed: ' + error.message)
      } else {
        await logAudit('UPDATE', payload.certificate_no!, form.student_name!, null, payload)
        setFormSuccess(`✓ Certificate ${payload.certificate_no} updated.`)
        resetForm()
        loadCerts(page, search)
        setTab('list')
      }
    } else {
      // INSERT
      const { error } = await supabase
        .from('certificates')
        .insert([payload])

      if (error) {
        if (error.code === '23505') {
          setFormError(`Certificate number "${payload.certificate_no}" already exists.`)
        } else {
          setFormError('Insert failed: ' + error.message)
        }
      } else {
        await logAudit('INSERT', payload.certificate_no!, form.student_name!, null, payload)
        setFormSuccess(`✓ Certificate ${payload.certificate_no} added.`)
        resetForm()
        loadCerts(1, search)
        setTab('list')
      }
    }
    setFormLoading(false)
  }

  // ── Delete / Deactivate ───────────────────────────────────────────────────────
  const CONFIRM_PASSWORD = 'DELETE@ATEC' // separate from admin login

  function openConfirm(cert: Certificate) {
    setConfirmAction({ type: 'deactivate', cert })
    setConfirmPwd('')
    setConfirmError('')
  }

  async function handleConfirmAction() {
    if (confirmPwd !== CONFIRM_PASSWORD) {
      setConfirmError('Wrong confirmation password.')
      return
    }
    if (!confirmAction) return
    setConfirmLoading(true)

    // We never hard-delete. We set is_active = false.
    const { error } = await supabase
      .from('certificates')
      .update({ is_active: false })
      .eq('id', confirmAction.cert.id)

    if (error) {
      setConfirmError('Failed: ' + error.message)
    } else {
      await logAudit('DELETE', confirmAction.cert.certificate_no, confirmAction.cert.student_name, confirmAction.cert, null)
      setConfirmAction(null)
      setConfirmPwd('')
      loadCerts(page, search)
    }
    setConfirmLoading(false)
  }

  // ── Audit log ─────────────────────────────────────────────────────────────────
  async function logAudit(
    action: string,
    certNo: string,
    studentName: string,
    oldData: any,
    newData: any,
    count = 1
  ) {
    await supabase.from('certificate_audit_log').insert([{
      action,
      certificate_no: certNo,
      student_name: studentName,
      old_data: oldData,
      new_data: newData,
      records_count: count,
    }])
  }

  async function loadAuditLog() {
    const { data } = await supabase
      .from('certificate_audit_log')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(50)
    if (data) setAuditLog(data)
    setShowAudit(true)
  }

  // ── CSV ───────────────────────────────────────────────────────────────────────
  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    setCsvError('')
    setCsvSuccess('')
    setCsvPreview(false)
    setCsvDuplicates([])
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(csv|CSV)$/)) {
      setCsvError('Only .csv files allowed. Export your Excel as CSV first.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCSV(text)
      if (!headers.length) {
        setCsvError('Could not parse CSV. Ensure first row has column headers.')
        return
      }
      setCsvHeaders(headers)
      setCsvRows(rows.filter(r => r.some(c => c.trim())))
      mapAndPreview(headers, rows.filter(r => r.some(c => c.trim())))
    }
    reader.readAsText(file)
  }

  function mapAndPreview(headers: string[], rows: string[][]) {
    const mapped: Partial<Certificate>[] = rows.map(row => {
      const obj: Partial<Certificate> = { center_name: 'ATEC Gurdaspur', is_active: true }
      headers.forEach((h, i) => {
        const dbCol = CSV_COLUMN_MAP[h]
        if (dbCol && row[i] !== undefined) {
          const val = row[i].trim()
          if (dbCol === 'marks_obtained' || dbCol === 'total_marks') {
            (obj as any)[dbCol] = val ? Number(val) : null
          } else {
            (obj as any)[dbCol] = val
          }
        }
      })
      return obj
    })

    const missingCertNo = mapped.filter(r => !r.certificate_no?.trim())
    if (missingCertNo.length > 5) {
      setCsvError(`${missingCertNo.length} rows are missing Certificate Number. Check your CSV column headers.`)
      return
    }

    setCsvMapped(mapped)
    setCsvPreview(true)
  }

  async function handleCSVUpload() {
    setCsvLoading(true)
    setCsvError('')
    setCsvSuccess('')
    setCsvDuplicates([])

    const valid = csvMapped.filter(r => r.certificate_no?.trim() && r.student_name?.trim())
    if (!valid.length) {
      setCsvError('No valid rows found. Ensure certificate_no and student_name columns exist.')
      setCsvLoading(false)
      return
    }

    // Check for duplicates before insert
    const certNos = valid.map(r => r.certificate_no!)
    const { data: existing } = await supabase
      .from('certificates')
      .select('certificate_no')
      .in('certificate_no', certNos)

    const existingNos = (existing || []).map((e: any) => e.certificate_no)
    if (existingNos.length > 0) {
      setCsvDuplicates(existingNos)
      setCsvLoading(false)
      return
    }

    // Insert in batches of 100
    const BATCH = 100
    let inserted = 0
    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH)
      const { error } = await supabase.from('certificates').insert(batch)
      if (error) {
        setCsvError(`Batch insert failed at row ~${i + 1}: ${error.message}`)
        setCsvLoading(false)
        return
      }
      inserted += batch.length
    }

    await logAudit('CSV_IMPORT', `${inserted} records`, 'bulk import', null, { count: inserted }, inserted)
    setCsvSuccess(`✓ ${inserted} certificates imported successfully.`)
    setCsvPreview(false)
    setCsvMapped([])
    setCsvHeaders([])
    setCsvRows([])
    if (csvRef.current) csvRef.current.value = ''
    loadCerts(1, search)
    setCsvLoading(false)
  }

  function handleSkipDuplicates() {
    const filtered = csvMapped.filter(r => !csvDuplicates.includes(r.certificate_no || ''))
    setCsvMapped(filtered)
    setCsvDuplicates([])
  }

  // ── Render: Login gate ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              marginBottom: 16,
            }}>🔐</div>
            <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Admin Panel</h1>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>ATEC Certificate Management</p>
          </div>
          <form onSubmit={handleLogin}>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Admin Password
            </label>
            <input
              type="password"
              value={adminPwd}
              onChange={e => setAdminPwd(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              style={inputStyle}
            />
            {authError && (
              <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: '#450a0a', borderRadius: 6 }}>
                {authError}
              </div>
            )}
            <button type="submit" style={primaryBtnStyle}>
              Login to Admin Panel
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Render: Main Admin Panel ───────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🎓</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Certificate Admin</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>ATEC Gurdaspur · {totalCount} certificates in database</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadAuditLog} style={ghostBtnStyle}>📋 Audit Log</button>
          <button onClick={() => setAuthed(false)} style={{ ...ghostBtnStyle, color: '#f87171' }}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 24px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', gap: 4 }}>
        {([
          { id: 'list', label: '📋 Certificates' },
          { id: 'add', label: editingId ? '✏️ Edit Certificate' : '➕ Add Certificate' },
          { id: 'csv', label: '📊 CSV Upload' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id !== 'add') { resetForm(); } }}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.id ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── LIST TAB ── */}
        {tab === 'list' && (
          <div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by cert no, name, batch, father's name..."
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              />
              <button type="submit" style={{ ...primaryBtnStyle, width: 'auto', padding: '0 20px', marginBottom: 0 }}>
                Search
              </button>
              {search && (
                <button type="button" onClick={() => { setSearch(''); loadCerts(1, '') }} style={{ ...ghostBtnStyle }}>
                  Clear
                </button>
              )}
            </form>

            {listLoading && <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading...</div>}

            {!listLoading && certs.length === 0 && (
              <div style={{ color: '#64748b', padding: '40px', textAlign: 'center', background: '#1e293b', borderRadius: 12 }}>
                No certificates found. Try a different search or add certificates.
              </div>
            )}

            {certs.length > 0 && (
              <>
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #334155' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1e293b' }}>
                        {['Cert No', 'Student Name', "Father's Name", 'Course', 'Student ID', 'Grade', 'Issue Date', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #334155', whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {certs.map((cert, i) => (
                        <tr key={cert.id} style={{ background: i % 2 === 0 ? '#0f172a' : '#111827', transition: 'background 0.15s' }}>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontSize: 12 }}>{cert.certificate_no}</span>
                          </td>
                          <td style={tdStyle}>{cert.student_name}</td>
                          <td style={tdStyle}>{cert.father_name}</td>
                          <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cert.course_name}</td>
                          <td style={tdStyle}>{cert.batch_id || '—'}</td>
                          <td style={tdStyle}>
                            {cert.grade ? (
                              <span style={{ padding: '2px 8px', borderRadius: 4, background: gradeColor(cert.grade), color: '#fff', fontSize: 11, fontWeight: 700 }}>
                                {cert.grade}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={tdStyle}>{cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-IN') : '—'}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                              background: cert.is_active ? '#064e3b' : '#450a0a',
                              color: cert.is_active ? '#34d399' : '#f87171',
                            }}>
                              {cert.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => startEdit(cert)}
                                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#60a5fa', cursor: 'pointer', fontSize: 12 }}
                              >
                                Edit
                              </button>
                              {cert.is_active && (
                                <button
                                  onClick={() => openConfirm(cert)}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #450a0a', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12 }}
                                >
                                  Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      disabled={page === 1}
                      onClick={() => { const p = page - 1; setPage(p); loadCerts(p, search) }}
                      style={{ ...ghostBtnStyle, opacity: page === 1 ? 0.4 : 1 }}
                    >
                      ← Prev
                    </button>
                    <span style={{ padding: '6px 12px', color: '#94a3b8', fontSize: 13 }}>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => { const p = page + 1; setPage(p); loadCerts(p, search) }}
                      style={{ ...ghostBtnStyle, opacity: page >= totalPages ? 0.4 : 1 }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ADD / EDIT TAB ── */}
        {tab === 'add' && (
          <div style={{ maxWidth: 700 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
              {editingId ? `Edit Certificate: ${form.certificate_no}` : 'Add New Certificate'}
            </h2>
            <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Certificate Number *" required>
                <input
                  type="text"
                  value={form.certificate_no || ''}
                  onChange={e => setForm(f => ({ ...f, certificate_no: e.target.value }))}
                  placeholder="e.g. ATEC-2024-001"
                  style={inputStyle}
                  disabled={!!editingId}
                />
              </FormField>
              <FormField label="Student ID">
                <input
                  type="text"
                  value={form.batch_id || ''}
                  onChange={e => setForm(f => ({ ...f, batch_id: e.target.value }))}
                  placeholder="e.g. S-241476"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Student Name *" required>
                <input
                  type="text"
                  value={form.student_name || ''}
                  onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                  placeholder="Full name"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Father's Name *" required>
                <input
                  type="text"
                  value={form.father_name || ''}
                  onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))}
                  placeholder="Father's full name"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Mother's Name">
                <input
                  type="text"
                  value={form.mother_name || ''}
                  onChange={e => setForm(f => ({ ...f, mother_name: e.target.value }))}
                  placeholder="Mother's name (optional)"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Course Name *" required>
                <input
                  type="text"
                  value={form.course_name || ''}
                  onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))}
                  placeholder="e.g. Hardware & Networking"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Course Duration">
                <input
                  type="text"
                  value={form.course_duration || ''}
                  onChange={e => setForm(f => ({ ...f, course_duration: e.target.value }))}
                  placeholder="e.g. 6 Months"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Grade">
                <select
                  value={form.grade || ''}
                  onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Select grade</option>
                  {['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'Pass', 'Distinction'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Marks Obtained">
                <input
                  type="number"
                  value={form.marks_obtained ?? ''}
                  onChange={e => setForm(f => ({ ...f, marks_obtained: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="e.g. 85"
                  style={inputStyle}
                  min={0} max={1000}
                />
              </FormField>
              <FormField label="Total Marks">
                <input
                  type="number"
                  value={form.total_marks ?? ''}
                  onChange={e => setForm(f => ({ ...f, total_marks: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="e.g. 100"
                  style={inputStyle}
                  min={0} max={1000}
                />
              </FormField>
              <FormField label="From Date">
                <input
                  type="date"
                  value={form.from_date || ''}
                  onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>
              <FormField label="To Date (Issue Date)">
                <input
                  type="date"
                  value={form.issue_date || ''}
                  onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Center Name">
                <input
                  type="text"
                  value={form.center_name || 'ATEC Gurdaspur'}
                  onChange={e => setForm(f => ({ ...f, center_name: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>

              {/* Full width actions */}
              <div style={{ gridColumn: '1 / -1' }}>
                {formError && <div style={errorBox}>{formError}</div>}
                {formSuccess && <div style={successBox}>{formSuccess}</div>}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="submit" disabled={formLoading} style={primaryBtnStyle}>
                    {formLoading ? 'Saving...' : editingId ? '✓ Update Certificate' : '➕ Add Certificate'}
                  </button>
                  <button type="button" onClick={() => { resetForm(); setTab('list') }} style={ghostBtnStyle}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── CSV TAB ── */}
        {tab === 'csv' && (
          <div style={{ maxWidth: 900 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              CSV / Excel Bulk Upload
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              Export your Excel file as CSV (File → Save As → CSV UTF-8) and upload here.
              The system auto-detects column names. Required columns: <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, color: '#60a5fa' }}>certificate_no</code>, <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, color: '#60a5fa' }}>student_name</code>, <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, color: '#60a5fa' }}>father_name</code>, <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, color: '#60a5fa' }}>course_name</code>.
            </p>

            {/* Column reference */}
            <div style={{ background: '#1e293b', borderRadius: 10, padding: 16, marginBottom: 24, border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Accepted Column Names (any of these work)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                {[
                  ['certificate_no / cert_no', 'Certificate Number'],
                  ['batch_id', 'Student ID'],
                  ['student_name / name', 'Student Name'],
                  ['father_name / fname', "Father's Name"],
                  ['mother_name', "Mother's Name"],
                  ['course_name / course', 'Course'],
                  ['course_duration / duration', 'Duration'],
                  ['grade', 'Grade'],
                  ['marks_obtained / marks', 'Marks Obtained'],
                  ['total_marks', 'Total Marks'],
                  ['from_date / from date', 'From Date'],
                  ['issue_date / to_date / date', 'To Date (Issue Date)'],
                  ['center_name / center', 'Center Name'],
                ].map(([col, label]) => (
                  <div key={col} style={{ fontSize: 11 }}>
                    <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{col}</span>
                    <span style={{ color: '#64748b' }}> → {label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* File picker */}
            <div
              onClick={() => csvRef.current?.click()}
              style={{
                border: '2px dashed #334155',
                borderRadius: 12,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: 20,
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>Click to upload CSV file</div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                {csvHeaders.length > 0
                  ? `✓ File loaded: ${csvRows.length} rows, ${csvHeaders.length} columns`
                  : 'Only .csv files. Max ~10,000 rows.'}
              </div>
              <input ref={csvRef} type="file" accept=".csv" onChange={handleCSVFile} style={{ display: 'none' }} />
            </div>

            {csvError && <div style={errorBox}>{csvError}</div>}
            {csvSuccess && <div style={successBox}>{csvSuccess}</div>}

            {/* Duplicate warning */}
            {csvDuplicates.length > 0 && (
              <div style={{ background: '#431407', border: '1px solid #c2410c', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ color: '#fb923c', fontWeight: 700, marginBottom: 8 }}>
                  ⚠️ {csvDuplicates.length} duplicate certificate numbers found
                </div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12, maxHeight: 80, overflow: 'auto' }}>
                  {csvDuplicates.slice(0, 10).join(', ')}{csvDuplicates.length > 10 ? ` ...and ${csvDuplicates.length - 10} more` : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSkipDuplicates} style={{ ...primaryBtnStyle, background: '#c2410c', width: 'auto', padding: '8px 16px' }}>
                    Skip Duplicates & Upload Rest ({csvMapped.length - csvDuplicates.length} rows)
                  </button>
                  <button onClick={() => { setCsvDuplicates([]); setCsvPreview(false); if (csvRef.current) csvRef.current.value = '' }} style={ghostBtnStyle}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Preview table */}
            {csvPreview && csvMapped.length > 0 && csvDuplicates.length === 0 && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
                  Preview: showing first 5 rows of {csvMapped.length} total
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #334155', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#1e293b' }}>
                        {['Cert No', 'Student Name', "Father's Name", 'Course', 'Grade', 'Issue Date'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #334155' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvMapped.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#111827' }}>
                          <td style={{ ...tdStyle, color: '#60a5fa', fontFamily: 'monospace' }}>{row.certificate_no || <span style={{ color: '#f87171' }}>MISSING</span>}</td>
                          <td style={tdStyle}>{row.student_name || <span style={{ color: '#f87171' }}>MISSING</span>}</td>
                          <td style={tdStyle}>{row.father_name || '—'}</td>
                          <td style={tdStyle}>{row.course_name || '—'}</td>
                          <td style={tdStyle}>{row.grade || '—'}</td>
                          <td style={tdStyle}>{row.issue_date || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleCSVUpload}
                    disabled={csvLoading}
                    style={primaryBtnStyle}
                  >
                    {csvLoading ? `Uploading... please wait` : `✓ Upload All ${csvMapped.length} Certificates`}
                  </button>
                  <button
                    onClick={() => { setCsvPreview(false); setCsvMapped([]); if (csvRef.current) csvRef.current.value = '' }}
                    style={ghostBtnStyle}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm / Delete Modal ── */}
      {confirmAction && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 16, padding: 32, width: '100%', maxWidth: 420,
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <h3 style={{ color: '#f1f5f9', textAlign: 'center', marginBottom: 8, fontSize: 16 }}>Confirm Deactivation</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              This will deactivate certificate <strong style={{ color: '#f1f5f9' }}>{confirmAction.cert.certificate_no}</strong> for <strong style={{ color: '#f1f5f9' }}>{confirmAction.cert.student_name}</strong>.
              It will no longer appear in public verification.
              <br /><br />
              <span style={{ color: '#fb923c' }}>This action is logged and reversible by editing the record.</span>
            </p>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Enter confirmation password to proceed:
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Confirmation password"
              autoFocus
              style={inputStyle}
            />
            {confirmError && <div style={errorBox}>{confirmError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleConfirmAction}
                disabled={confirmLoading}
                style={{ ...primaryBtnStyle, background: '#dc2626' }}
              >
                {confirmLoading ? 'Processing...' : 'Deactivate'}
              </button>
              <button onClick={() => { setConfirmAction(null); setConfirmPwd('') }} style={ghostBtnStyle}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Log Modal ── */}
      {showAudit && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 1000, overflowY: 'auto', padding: '40px 16px',
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 800,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#f1f5f9', margin: 0 }}>📋 Audit Log (Last 50 actions)</h3>
              <button onClick={() => setShowAudit(false)} style={{ ...ghostBtnStyle, fontSize: 18 }}>✕</button>
            </div>
            {auditLog.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No audit entries yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      {['Time', 'Action', 'Cert No', 'Student', 'Count'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #334155' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((log, i) => (
                      <tr key={log.id} style={{ background: i % 2 === 0 ? '#1e293b' : '#111827' }}>
                        <td style={tdStyle}>{new Date(log.performed_at).toLocaleString('en-IN')}</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            background: log.action === 'INSERT' || log.action === 'CSV_IMPORT' ? '#064e3b' : log.action === 'DELETE' ? '#450a0a' : '#1e3a5f',
                            color: log.action === 'INSERT' || log.action === 'CSV_IMPORT' ? '#34d399' : log.action === 'DELETE' ? '#f87171' : '#60a5fa',
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#60a5fa' }}>{log.certificate_no}</td>
                        <td style={tdStyle}>{log.student_name}</td>
                        <td style={tdStyle}>{log.records_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function gradeColor(grade: string): string {
  const g = grade.toUpperCase()
  if (g === 'A+' || g === 'DISTINCTION') return '#065f46'
  if (g === 'A') return '#064e3b'
  if (g.startsWith('B')) return '#1e3a5f'
  if (g.startsWith('C')) return '#3b2a05'
  return '#374151'
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: 12,
  fontFamily: 'inherit',
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 20px',
  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  marginBottom: 0,
  fontFamily: 'inherit',
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #334155',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
  fontSize: 13,
}

const errorBox: React.CSSProperties = {
  background: '#450a0a',
  border: '1px solid #dc2626',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#f87171',
  fontSize: 13,
  marginBottom: 12,
}

const successBox: React.CSSProperties = {
  background: '#064e3b',
  border: '1px solid #059669',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#34d399',
  fontSize: 13,
  marginBottom: 12,
}
