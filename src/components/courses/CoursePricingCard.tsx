// src/components/courses/CoursePricingCard.tsx
// Live pricing card — fetches current fee_inr, original_fee_inr, syllabus, thumbnail from Supabase
// at runtime so price/thumbnail changes in admin reflect immediately without a rebuild.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AddToCartButton from './AddToCartButton'

interface Props {
  courseSlug: string
  courseId: string
  courseTitle: string
  initialFee: number
  initialOriginalFee: number | null
  initialShortDesc: string | null
  initialOneLine: string | null
  initialSyllabus: { week: number; topic: string }[]
  initialThumbnail: string | null
  initialPromoVideoId: string | null   // bare YouTube ID or null
  compact?: boolean
}

function extractYouTubeId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (short) return short[1]
  const long = s.match(/(?:v=|\/embed\/|\/shorts\/|\/v\/)([A-Za-z0-9_-]{11})/)
  if (long) return long[1]
  return null
}

export default function CoursePricingCard({
  courseSlug, courseId, courseTitle,
  initialFee, initialOriginalFee, initialShortDesc, initialOneLine,
  initialSyllabus, initialThumbnail, initialPromoVideoId,
  compact = false,
}: Props) {
  const [fee, setFee]         = useState(initialFee)
  const [origFee, setOrigFee] = useState(initialOriginalFee)
  const [oneLine, setOneLine] = useState(initialOneLine)
  const [shortDesc, setShortDesc] = useState(initialShortDesc)
  const [syllabus, setSyllabus]   = useState(initialSyllabus)
  const [liveId, setLiveId]       = useState(courseId)
  const [thumbnail, setThumbnail] = useState(initialThumbnail)
  const [promoId, setPromoId]     = useState(initialPromoVideoId)

  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .eq('slug', courseSlug)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (error) { console.warn('CoursePricingCard fetch error:', error.message); return }
        if (!data) return
        setFee((data as any).fee_inr ?? initialFee)
        setOrigFee((data as any).original_fee_inr ?? null)
        setOneLine((data as any).one_line_syllabus ?? null)
        setShortDesc((data as any).short_description ?? null)
        setLiveId((data as any).id)
        setThumbnail((data as any).thumbnail_url ?? null)
        setPromoId(extractYouTubeId((data as any).promo_video_url ?? null))
        const rawSyl = (data as any).syllabus
        const syl = Array.isArray(rawSyl)
          ? rawSyl
          : (typeof rawSyl === 'string'
              ? (() => { try { return JSON.parse(rawSyl) } catch { return [] } })()
              : [])
        setSyllabus(syl)
      })
  }, [courseSlug])

  const discount = origFee && fee ? Math.round((1 - fee / origFee) * 100) : null

  // YouTube auto-thumbnail as fallback when no thumbnail_url
  const ytThumb = promoId ? `https://img.youtube.com/vi/${promoId}/mqdefault.jpg` : null
  const displayThumb = thumbnail || ytThumb

  // ── Mobile floating CTA ──
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
    <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', overflow: 'hidden' }}>

      {/* Thumbnail / YouTube preview at top */}
      {displayThumb ? (
        <div style={{ position: 'relative', width: '100%', height: '190px', overflow: 'hidden', background: '#0b1525' }}>
          <img
            src={displayThumb}
            alt={courseTitle}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {/* Play button overlay when it's a video thumbnail */}
          {promoId && (
            <a
              href={`https://www.youtube.com/watch?v=${promoId}`}
              target="_blank"
              rel="noopener"
              style={{
                position: 'absolute', inset: '0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)',
                textDecoration: 'none',
              }}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: '#dc2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                  <polygon points="8,5 20,12 8,19"/>
                </svg>
              </div>
            </a>
          )}
        </div>
      ) : (
        /* Fallback: navy placeholder with course initials */
        <div style={{
          width: '100%', height: '190px',
          background: 'linear-gradient(135deg,#0b1525,#1c3d7a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '2.5rem',
            fontWeight: '900', color: '#d4f01a', letterSpacing: '-0.02em',
          }}>
            {courseTitle.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
          </span>
        </div>
      )}

      <div style={{ padding: '24px' }}>
        {/* Price row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <AddToCartButton courseId={liveId} courseTitle={courseTitle} courseSlug={courseSlug} />
        </div>

        {/* Quick syllabus bullets */}
        {syllabus.length > 0 && (
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
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
