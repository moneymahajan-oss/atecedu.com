// src/components/courses/CoursePricingCard.tsx
// Live pricing card — fetches current fee_inr, original_fee_inr, syllabus from Supabase
// at runtime so price changes in admin reflect immediately without a rebuild.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AddToCartButton from './AddToCartButton'

interface Props {
  courseSlug: string
  courseId: string       // static build-time value as fallback
  courseTitle: string
  // Static SSG values shown immediately before live data loads (prevents layout shift)
  initialFee: number
  initialOriginalFee: number | null
  initialShortDesc: string | null
  initialOneLine: string | null
  initialSyllabus: { week: number; topic: string }[]
  compact?: boolean      // for floating mobile CTA
}

export default function CoursePricingCard({
  courseSlug,
  courseId,
  courseTitle,
  initialFee,
  initialOriginalFee,
  initialShortDesc,
  initialOneLine,
  initialSyllabus,
  compact = false,
}: Props) {
  const [fee, setFee]           = useState(initialFee)
  const [origFee, setOrigFee]   = useState(initialOriginalFee)
  const [oneLine, setOneLine]   = useState(initialOneLine)
  const [shortDesc, setShortDesc] = useState(initialShortDesc)
  const [syllabus, setSyllabus] = useState(initialSyllabus)
  const [liveId, setLiveId]     = useState(courseId)
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => {
    supabase
      .from('courses')
      .select('id,fee_inr,original_fee_inr,short_description,one_line_syllabus,syllabus')
      .eq('slug', courseSlug)
      .eq('is_active', true)
      .single()
      .then(({ data }) => {
        if (!data) return
        setFee(data.fee_inr ?? initialFee)
        setOrigFee(data.original_fee_inr ?? null)
        setOneLine((data as any).one_line_syllabus ?? null)
        setShortDesc(data.short_description ?? null)
        setLiveId(data.id)
        const syl = Array.isArray(data.syllabus)
          ? data.syllabus
          : (typeof data.syllabus === 'string'
              ? (() => { try { return JSON.parse(data.syllabus) } catch { return [] } })()
              : [])
        setSyllabus(syl)
        setLoaded(true)
      })
  }, [courseSlug])

  const discount = origFee && fee
    ? Math.round((1 - fee / origFee) * 100)
    : null

  // ── Mobile floating CTA (compact mode) ──
  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>
          ₹{fee?.toLocaleString('en-IN')}
        </div>
        <AddToCartButton courseId={liveId} courseTitle={courseTitle} courseSlug={courseSlug} compact />
      </div>
    )
  }

  // ── Desktop sidebar card ──
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '24px' }}>
        {/* Price row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '800', color: 'var(--navy)' }}>
            ₹{fee?.toLocaleString('en-IN')}
          </span>
          {origFee && (
            <>
              <span style={{ fontSize: '15px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                ₹{origFee?.toLocaleString('en-IN')}
              </span>
              {discount && (
                <span style={{ fontSize: '13px', fontWeight: '700', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px' }}>
                  {discount}% off
                </span>
              )}
            </>
          )}
        </div>

        {/* One-line or short desc */}
        {(oneLine || shortDesc) && (
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px', lineHeight: '1.5' }}>
            {oneLine || shortDesc}
          </p>
        )}

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <AddToCartButton courseId={liveId} courseTitle={courseTitle} courseSlug={courseSlug} />
        </div>

        {/* Quick syllabus bullets */}
        {syllabus.length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>📋 Course Highlights</div>
            <ul style={{ margin: '0', padding: '0 0 0 16px', fontSize: '12px', color: '#6b7280', lineHeight: '1.7' }}>
              {syllabus.slice(0, 5).map((w: any, i: number) => (
                <li key={i}>{w.topic}</li>
              ))}
              {syllabus.length > 5 && (
                <li style={{ color: '#0b1525', fontWeight: '600' }}>+{syllabus.length - 5} more weeks...</li>
              )}
            </ul>
          </div>
        )}

        {/* Guarantee */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '13px', color: 'var(--text-muted)',
          paddingTop: '14px', borderTop: '1px solid var(--gray-200)',
          marginTop: '14px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          7-day money-back guarantee
        </div>
      </div>
    </div>
  )
}
