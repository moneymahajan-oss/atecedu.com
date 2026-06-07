// src/components/courses/AddToCartButton.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  courseId: string
  courseTitle: string
  courseSlug?: string
  compact?: boolean
}

export default function AddToCartButton({ courseId, courseTitle, courseSlug, compact = false }: Props) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [inCart, setInCart] = useState(false)
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        checkStatus(data.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) checkStatus(session.user.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [courseId])

  async function checkStatus(userId: string) {
    const [{ data: cartData }, { data: enrollData }] = await Promise.all([
      supabase.from('cart_items').select('id').eq('student_id', userId).eq('course_id', courseId).maybeSingle(),
      supabase.from('enrollments').select('id').eq('student_id', userId).eq('course_id', courseId).in('payment_status', ['paid','free']).maybeSingle(),
    ])
    setInCart(!!cartData)
    setEnrolled(!!enrollData)
    setLoading(false)
  }

  async function addToCart() {
    if (!user) {
      window.location.href = `/login?redirect=/courses/${courseId}`
      return
    }
    setLoading(true)
    await supabase.from('cart_items').insert({ student_id: user.id, course_id: courseId })
    setInCart(true)
    setLoading(false)
  }

  async function removeFromCart() {
    if (!user) return
    setLoading(true)
    await supabase.from('cart_items').delete().eq('student_id', user.id).eq('course_id', courseId)
    setInCart(false)
    setLoading(false)
  }

  if (enrolled) {
    return (
      <a
        href={courseSlug ? `/dashboard/course/${courseSlug}` : '/dashboard/my-courses'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', width: '100%',
          background: '#dcfce7', color: '#166534',
          padding: compact ? '10px 18px' : '14px',
          borderRadius: '10px',
          fontFamily: 'var(--font-display)', fontWeight: '700',
          fontSize: compact ? '13px' : '15px',
          textDecoration: 'none',
        }}
      >
        ▶ Start Learning →
      </a>
    )
  }

  if (inCart) {
    return (
      <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: '8px' }}>
        <a
          href="/cart"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flex: 1, background: 'var(--navy)', color: '#fff',
            padding: compact ? '10px 18px' : '14px',
            borderRadius: '10px',
            fontFamily: 'var(--font-display)', fontWeight: '700',
            fontSize: compact ? '13px' : '15px',
            textDecoration: 'none',
          }}
        >
          Go to Cart →
        </a>
        <button
          onClick={removeFromCart}
          disabled={loading}
          style={{
            padding: compact ? '10px 14px' : '12px',
            border: '1px solid var(--gray-200)',
            borderRadius: '10px',
            fontSize: '13px', color: 'var(--text-muted)',
            background: 'transparent', cursor: 'pointer',
          }}
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: '8px', width: '100%' }}>
      <button
        onClick={addToCart}
        disabled={loading}
        style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px',
          background: 'var(--lemon)', color: 'var(--navy-dark)',
          padding: compact ? '10px 18px' : '14px',
          borderRadius: '10px', border: 'none',
          fontFamily: 'var(--font-display)', fontWeight: '800',
          fontSize: compact ? '13px' : '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
      >
        {loading ? '...' : '🛒 Add to Cart'}
      </button>
      <a
        href={`/checkout?course=${courseId}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flex: 1,
          background: 'var(--navy)', color: '#fff',
          padding: compact ? '10px 18px' : '14px',
          borderRadius: '10px',
          fontFamily: 'var(--font-display)', fontWeight: '700',
          fontSize: compact ? '13px' : '15px',
          textDecoration: 'none',
        }}
      >
        Enroll Now
      </a>
    </div>
  )
}
