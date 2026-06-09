// src/components/verification/CertificateVerifier.tsx
// Shows: Certificate No, Student ID, Name, Father Name, Course Name,
//        From Date, To Date (issue_date), No Of Hours, Grade
// Matches the old atecedu.com PHP site output exactly.

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY
)

interface Certificate {
  certificate_no: string
  batch_id: string
  student_name: string
  father_name: string
  course_name: string
  course_duration: string
  from_date: string | null
  issue_date: string | null
  grade: string
  center_name: string
  is_active: boolean
}

function clean(val: string) {
  return val.trim().replace(/[<>'"`;]/g, '').slice(0, 150)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const day = d.getDate()
    const month = d.toLocaleString('en-IN', { month: 'short' })
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  } catch {
    return dateStr
  }
}

export default function CertificateVerifier() {
  const [certNo, setCertNo]   = useState('')
  const [batchId, setBatchId] = useState('')
  const [name, setName]       = useState('')
  const [father, setFather]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<Certificate | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError]     = useState('')

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    setNotFound(false)
    setError('')

    const hasInput = certNo.trim() || batchId.trim() || name.trim() || father.trim()
    if (!hasInput) {
      setError('Please enter at least one field to search.')
      return
    }

    setLoading(true)

    let query = supabase
      .from('certificates')
      .select('*')
      .eq('is_active', true)

    if (certNo.trim())   query = query.ilike('certificate_no', clean(certNo))
    if (batchId.trim())  query = query.ilike('batch_id', clean(batchId))
    if (name.trim())     query = query.ilike('student_name', `%${clean(name)}%`)
    if (father.trim())   query = query.ilike('father_name', `%${clean(father)}%`)

    query = query.limit(1).single()

    const { data, error: dbErr } = await query

    if (dbErr || !data) {
      setNotFound(true)
    } else {
      setResult(data as Certificate)
    }
    setLoading(false)
  }

  function handleReset() {
    setCertNo('')
    setBatchId('')
    setName('')
    setFather('')
    setResult(null)
    setNotFound(false)
    setError('')
  }

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      maxWidth: 720,
      margin: '0 auto',
      padding: '0 16px',
    }}>

      {/* Icon + heading */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, #1a2744, #2d4a8a)',
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          boxShadow: '0 4px 20px rgba(45,74,138,0.35)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f0c040" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a2744', margin: 0 }}>
          Certificate Verification
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0' }}>
          Enter any detail below to instantly verify an ATEC certificate
        </p>
      </div>

      {/* Search form */}
      {!result && (
        <div style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: '28px 28px 20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}>
          <form onSubmit={handleVerify}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              <div>
                <label style={labelStyle}>CERTIFICATE NUMBER</label>
                <input
                  type="text"
                  value={certNo}
                  onChange={e => setCertNo(e.target.value)}
                  placeholder="e.g. C-1900300146"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>STUDENT ID</label>
                <input
                  type="text"
                  value={batchId}
                  onChange={e => setBatchId(e.target.value)}
                  placeholder="e.g. S-251547"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>STUDENT NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter student name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>FATHER'S NAME</label>
                <input
                  type="text"
                  value={father}
                  onChange={e => setFather(e.target.value)}
                  placeholder="Enter father's name"
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <div style={{ color: '#dc2626', fontSize: 13, margin: '12px 0 0', padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '14px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1a2744, #2d4a8a)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                letterSpacing: 0.3,
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Searching...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Verify Certificate
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 16, marginBottom: 0 }}>
            Certificate data secured by Supabase · Verified by ATEC Gurdaspur since 2000
          </p>
        </div>
      )}

      {/* Not found */}
      {notFound && !result && (
        <div style={{
          background: '#fff',
          border: '1px solid #fecaca',
          borderRadius: 14,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
          <h3 style={{ color: '#dc2626', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>
            Certificate Not Found
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
            No certificate matched your search. Please check the details and try again.
          </p>
          <button onClick={handleReset} style={resetBtnStyle}>
            Try Again
          </button>
        </div>
      )}

      {/* Result — matches old site layout exactly */}
      {result && (
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        }}>
          {/* Success banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1a2744, #2d4a8a)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40, height: 40,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Certificate Verified Successfully</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>This certificate is authentic and issued by ATEC Gurdaspur</div>
            </div>
          </div>

          {/* Detail heading */}
          <div style={{ padding: '20px 24px 0' }}>
            <h2 style={{ color: '#c0392b', fontWeight: 700, fontSize: 18, margin: 0, paddingBottom: 8, borderBottom: '3px solid #c0392b', display: 'inline-block' }}>
              Student Certificate Detail
            </h2>
          </div>

          {/* Fields table — exact order as old site */}
          <div style={{ padding: '12px 24px 24px' }}>
            {[
              { label: 'Certificate No', value: result.certificate_no },
              { label: 'Student ID',     value: result.batch_id || '—' },
              { label: 'Name',           value: result.student_name },
              { label: 'Father Name',    value: result.father_name || '—' },
              { label: 'Course Name',    value: result.course_name },
              { label: 'From Date',      value: formatDate(result.from_date) },
              { label: 'To Date',        value: formatDate(result.issue_date) },
              { label: 'No Of Hours',    value: result.course_duration || '—' },
              { label: 'Grade',          value: result.grade || '—' },
            ].map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '13px 14px',
                  background: i % 2 === 0 ? '#f8fafc' : '#fff',
                  borderRadius: 6,
                  marginBottom: 2,
                }}
              >
                <div style={{
                  width: 160,
                  flexShrink: 0,
                  color: '#475569',
                  fontSize: 14,
                  fontWeight: 500,
                }}>
                  {row.label}
                </div>
                <div style={{ color: '#64748b', fontSize: 14, marginRight: 12 }}>:</div>
                <div style={{
                  color: '#1e293b',
                  fontSize: 14,
                  fontWeight: row.label === 'Name' || row.label === 'Certificate No' ? 600 : 400,
                }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              ATEC Gurdaspur · {result.center_name}
            </div>
            <button onClick={handleReset} style={resetBtnStyle}>
              Verify Another
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { outline: none; border-color: #2d4a8a !important; box-shadow: 0 0 0 3px rgba(45,74,138,0.12); }
      `}</style>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: 0.8,
  marginBottom: 6,
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 7,
  fontSize: 14,
  color: '#1e293b',
  background: '#f8fafc',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
}

const resetBtnStyle: React.CSSProperties = {
  padding: '9px 20px',
  background: 'transparent',
  border: '1px solid #cbd5e1',
  borderRadius: 7,
  color: '#475569',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
