import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY
)

interface Faculty {
  id: string
  name: string
  designation: string
  expert_field: string
  photo_url: string | null
  sort_order: number
  is_active: boolean
}

export default function FacultySection() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchFaculty()
  }, [])

  async function fetchFaculty() {
    const { data } = await supabase
      .from('faculty')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    setFaculty(data ?? [])
    setLoading(false)
  }

  // Auto scroll
  useEffect(() => {
    if (faculty.length <= 3) return
    autoRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % faculty.length)
    }, 3500)
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [faculty.length])

  function goTo(i: number) {
    if (autoRef.current) clearInterval(autoRef.current)
    setActiveIndex(i)
  }

  function prev() {
    goTo((activeIndex - 1 + faculty.length) % faculty.length)
  }

  function next() {
    goTo((activeIndex + 1) % faculty.length)
  }

  const visibleCount = faculty.length < 4 ? faculty.length : 4
  // Get 4 cards starting from activeIndex (circular)
  const visibleFaculty = Array.from({ length: visibleCount }, (_, i) =>
    faculty[(activeIndex + i) % faculty.length]
  )

  if (loading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    )
  }

  if (faculty.length === 0) return null

  return (
    <section className="py-20 bg-gray-50" id="faculty">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 text-center mb-14">
        <h2 className="text-4xl font-bold text-gray-900 mb-3">
          Meet Our Faculty
        </h2>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Learn from experienced trainers who blend industry exposure with classroom mastery.
        </p>
      </div>

      {/* Cards Row */}
      <div className="relative max-w-7xl mx-auto px-4">
        {/* Left arrow */}
        {faculty.length > 4 && (
          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition-colors -translate-x-2"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Cards */}
        <div
          ref={trackRef}
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${Math.min(faculty.length, 4)}, 1fr)` }}
        >
          {visibleFaculty.map((member, i) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
              style={{
                animation: `fadeSlideIn 0.4s ease both`,
                animationDelay: `${i * 60}ms`
              }}
            >
              {/* Photo */}
              <div className="relative overflow-hidden bg-gray-100" style={{ height: '260px' }}>
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50">
                    <span className="text-6xl font-bold text-orange-300">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {member.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{member.designation}</p>
                <p className="text-sm font-semibold text-orange-600">
                  {member.expert_field}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right arrow */}
        {faculty.length > 4 && (
          <button
            onClick={next}
            aria-label="Next"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition-colors translate-x-2"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Dots */}
      {faculty.length > 4 && (
        <div className="flex justify-center gap-2 mt-8">
          {faculty.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to faculty ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-6 h-2 bg-orange-500'
                  : 'w-2 h-2 bg-gray-300 hover:bg-orange-300'
              }`}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
