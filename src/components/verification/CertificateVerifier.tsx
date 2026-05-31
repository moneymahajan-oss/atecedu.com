import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Certificate } from '@/lib/supabase'
import { Search, CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react'

type Result = Certificate | 'not_found' | null

const clean = (val: string) =>
  val.trim().replace(/[<>'"`;]/g, '').slice(0, 150)

export default function CertificateVerifier() {
  const [fields, setFields] = useState({
    certNo:     '',
    batchId:    '',
    name:       '',
    fatherName: '',
  })
  const [result,  setResult]  = useState<Result>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const hasInput = Object.values(fields).some(v => v.trim().length > 0)

  const handleVerify = async () => {
    if (!hasInput) {
      setError('Please enter at least one field to search.')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)

    try {
      let query = supabase
        .from('certificates')
        .select('*')
        .eq('is_active', true)

      if (fields.certNo)     query = query.ilike('certificate_no', clean(fields.certNo))
      if (fields.batchId)    query = query.ilike('batch_id',       clean(fields.batchId))
      if (fields.name)       query = query.ilike('student_name',   `%${clean(fields.name)}%`)
      if (fields.fatherName) query = query.ilike('father_name',    `%${clean(fields.fatherName)}%`)

      const { data, error: dbError } = await query.limit(1).single()

      if (dbError || !data) {
        setResult('not_found')
      } else {
        setResult(data as Certificate)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify()
  }

  const reset = () => {
    setFields({ certNo: '', batchId: '', name: '', fatherName: '' })
    setResult(null)
    setError('')
  }

  return (
    <div className="w-full max-w-2xl mx-auto">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0D1B3E] mb-4">
          <ShieldCheck className="w-7 h-7 text-[#E8F531]" />
        </div>
        <h1 className="font-display text-3xl font-700 text-[#0D1B3E] mb-2">
          Certificate Verification
        </h1>
        <p className="text-gray-500 text-sm">
          Enter any detail below to instantly verify an ATEC certificate
        </p>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-sans font-500 text-gray-500 mb-1.5 uppercase tracking-wide">
              Certificate Number
            </label>
            <input
              className="input"
              placeholder="e.g. ATEC-2019-001"
              value={fields.certNo}
              onChange={e => setFields(f => ({ ...f, certNo: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <label className="block text-xs font-sans font-500 text-gray-500 mb-1.5 uppercase tracking-wide">
              Batch ID
            </label>
            <input
              className="input"
              placeholder="e.g. B2019-HN"
              value={fields.batchId}
              onChange={e => setFields(f => ({ ...f, batchId: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <label className="block text-xs font-sans font-500 text-gray-500 mb-1.5 uppercase tracking-wide">
              Student Name
            </label>
            <input
              className="input"
              placeholder="Enter student name"
              value={fields.name}
              onChange={e => setFields(f => ({ ...f, name: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <label className="block text-xs font-sans font-500 text-gray-500 mb-1.5 uppercase tracking-wide">
              Father's Name
            </label>
            <input
              className="input"
              placeholder="Enter father's name"
              value={fields.fatherName}
              onChange={e => setFields(f => ({ ...f, fatherName: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || !hasInput}
          className="w-full flex items-center justify-center gap-2 bg-[#0D1B3E] text-white font-display font-600 py-3.5 rounded-xl hover:bg-[#162550] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
            : <><Search className="w-4 h-4" /> Verify Certificate</>
          }
        </button>
      </div>

      {/* Not found */}
      {result === 'not_found' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-600 text-red-700 mb-1">Certificate Not Found</p>
              <p className="text-sm text-red-600 leading-relaxed">
                No matching certificate found. Please check spelling and try again.
                For help, contact ATEC at{' '}
                <a href="tel:+917009933289" className="underline">+91 7009933289</a>.
              </p>
              <button
                onClick={reset}
                className="mt-3 text-sm text-red-600 underline hover:no-underline"
              >
                Search again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {result && result !== 'not_found' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-green-200">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-display font-700 text-green-800 text-lg">Certificate Verified</p>
              <p className="text-xs text-green-600">Issued by ATEC Gurdaspur</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              ['Student Name',    result.student_name],
              ["Father's Name",   result.father_name],
              ['Certificate No',  result.certificate_no],
              ['Batch ID',        result.batch_id ?? '—'],
              ['Course',          result.course_name],
              ['Duration',        result.course_duration ?? '—'],
              ['Issue Date',      result.issue_date
                                    ? new Date(result.issue_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
                                    : '—'],
              ['Grade',           result.grade ?? '—'],
              ['Marks',           result.marks_obtained && result.total_marks
                                    ? `${result.marks_obtained} / ${result.total_marks}`
                                    : '—'],
              ['Centre',          result.center_name],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-green-600 font-500 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-sans font-500 text-green-900">{value}</p>
              </div>
            ))}
          </div>

          <button
            onClick={reset}
            className="mt-5 text-sm text-green-700 underline hover:no-underline"
          >
            Search another certificate
          </button>
        </div>
      )}

      {/* Trust note */}
      <p className="text-center text-xs text-gray-400 mt-6">
        Certificate data secured by Supabase · Verified by ATEC Gurdaspur since 2000
      </p>

    </div>
  )
}
