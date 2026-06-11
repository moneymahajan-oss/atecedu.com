// src/components/courses/CourseDetailContent.tsx
// ONE shared, runtime-live body for ALL course pages.
// Renders: What You'll Learn, Highlights, Promo Video, One-Line Banner,
// About, Syllabus accordion, Course Resources (Brochure + Demo Video),
// Prerequisites, FAQ — fetched fresh from Supabase at page load, so admin
// changes appear immediately without a Cloudflare rebuild (same pattern as
// CoursePricingCard). Build-time data is used as the initial paint for SEO.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface SyllabusWeek { week: number; topic: string; subtopics?: string[] }
interface FaqItem { q: string; a: string }

interface Props {
  slug: string
  initialCourse: any   // build-time snapshot of the course row (may be partial/stale)
}

// ── helpers ──────────────────────────────────────────────

function extractYouTubeId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (short) return short[1]
  const long = s.match(/(?:v=|\/embed\/|\/shorts\/|\/v\/)([A-Za-z0-9_-]{11})/)
  if (long) return long[1]
  return null
}

// Supabase JSONB can arrive as a real array OR a JSON string — handle both
function parseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      return Array.isArray(p) ? (p as T[]) : []
    } catch { return [] }
  }
  return []
}

// ── component ────────────────────────────────────────────

export default function CourseDetailContent({ slug, initialCourse }: Props) {
  const [course, setCourse] = useState<any>(initialCourse ?? {})
  const [openWeek, setOpenWeek] = useState<number>(0)     // first week open by default
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Runtime refresh — identical pattern to CoursePricingCard
  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (error) { console.warn('CourseDetailContent fetch error:', error.message); return }
        if (data) setCourse(data)
      })
  }, [slug])

  const whatYouLearn = parseJsonArray<string>(course.what_you_learn)
  const highlights   = parseJsonArray<string>(course.highlights)
  const syllabus     = parseJsonArray<SyllabusWeek>(course.syllabus)
  const faq          = parseJsonArray<FaqItem>(course.faq)
  const promoVideoId = extractYouTubeId(course.promo_video_url)

  const demoWatchUrl = (() => {
    const raw: string = (course.demo_video_url || course.promo_video_url || '').trim()
    if (!raw) return null
    return raw.startsWith('http') ? raw : `https://www.youtube.com/watch?v=${raw}`
  })()

  const totalTopics = syllabus.reduce((acc, w) => acc + (w.subtopics?.length ?? 1), 0)

  return (
    <div className="course-details">

      {/* What you'll learn */}
      {whatYouLearn.length > 0 && (
        <section className="detail-section">
          <h2>What You'll Learn</h2>
          <div className="learn-grid">
            {whatYouLearn.map((item, i) => (
              <div className="learn-item" key={i}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--lemon)', flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="detail-section">
          <h2>Course Highlights</h2>
          <div className="highlights-grid">
            {highlights.map((item, i) => (
              <div className="highlight-pill" key={i}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--navy)' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                {item}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Promo Video */}
      {promoVideoId && (
        <div style={{ marginBottom: '24px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
            <iframe
              src={`https://www.youtube.com/embed/${promoVideoId}?rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`${course.title ?? 'Course'} demo`}
              loading="lazy"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}

      {/* TIER 1: One-line syllabus banner */}
      {course.one_line_syllabus && (
        <div style={{ background: 'linear-gradient(135deg,#0b1525,#1c3d7a)', borderRadius: '14px', padding: '18px 22px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🎯</span>
          <p style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: '1.05rem', fontWeight: 700, color: '#d4f01a', margin: 0, lineHeight: 1.4 }}>
            {course.one_line_syllabus}
          </p>
        </div>
      )}

      {/* TIER 2: 3-line description */}
      {course.description_3line && (
        <section className="detail-section">
          <h2>About This Course</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary,#475569)', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
            {course.description_3line}
          </p>
        </section>
      )}

      {/* Rich-text description fallback when no description_3line */}
      {!course.description_3line && course.description && (
        <section className="detail-section">
          <h2>About This Course</h2>
          <div className="course-description" dangerouslySetInnerHTML={{ __html: course.description }} />
        </section>
      )}

      {/* TIER 3: Full syllabus accordion */}
      {syllabus.length > 0 && (
        <section className="detail-section">
          <h2>📋 Course Syllabus</h2>
          <div className="syllabus-summary">
            {syllabus.length} weeks · {totalTopics} topics
          </div>
          <div className="accordion">
            {syllabus.map((week, i) => {
              const isOpen = openWeek === i
              return (
                <div className="accordion-item" key={i}>
                  <button
                    type="button"
                    className="accordion-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenWeek(isOpen ? -1 : i)}
                  >
                    <span>
                      <span className="week-badge">Week {week.week}</span>
                      {week.topic}
                    </span>
                    <svg className="acc-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={isOpen ? { transform: 'rotate(180deg)' } : undefined}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <div className="accordion-content" style={isOpen ? undefined : { display: 'none' }}>
                    {week.subtopics && week.subtopics.length > 0 ? (
                      <ul className="subtopic-list">
                        {week.subtopics.map((sub, j) => (
                          <li key={j}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: '-1px', marginRight: '6px', color: 'var(--navy)' }}><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                            {sub}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Practical sessions and assessments</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Course Resources: Brochure + Demo Video */}
      {(course.brochure_url || demoWatchUrl) && (
        <section className="detail-section">
          <h2>📥 Course Resources</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {course.brochure_url && (
              <a href={course.brochure_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 22px', background: '#0b1525', color: '#d4f01a', borderRadius: '10px', fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                📄 Download Brochure / Syllabus PDF
              </a>
            )}
            {demoWatchUrl && (
              <a href={demoWatchUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 22px', background: '#dc2626', color: '#fff', borderRadius: '10px', fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                ▶ Watch Demo Video
              </a>
            )}
          </div>
        </section>
      )}

      {/* Prerequisites */}
      {course.prerequisites && (
        <section className="detail-section">
          <h2>Prerequisites</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7 }}>{course.prerequisites}</p>
        </section>
      )}

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="detail-section">
          <h2>Frequently Asked Questions</h2>
          <div className="accordion">
            {faq.map((item, i) => {
              const isOpen = openFaq === i
              return (
                <div className="accordion-item" key={i}>
                  <button
                    type="button"
                    className="accordion-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span>{item.q}</span>
                    <svg className="acc-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={isOpen ? { transform: 'rotate(180deg)' } : undefined}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <div className="accordion-content" style={isOpen ? undefined : { display: 'none' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>{item.a}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
