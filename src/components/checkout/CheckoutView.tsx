// src/components/checkout/CheckoutView.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Course {
  id: string
  title: string
  slug: string
  fee_inr: number
  thumbnail_url: string | null
  mode: string
  duration_weeks: number
}

interface Profile {
  full_name: string
  phone: string
  city: string
}

declare global {
  interface Window {
    Razorpay: any
  }
}

// ⚠️  IMPORTANT: Replace with your actual Razorpay Key ID from Razorpay Dashboard
const RAZORPAY_KEY_ID = 'rzp_test_REPLACE_WITH_YOUR_KEY'

export default function CheckoutView() {
  const [courses, setCourses] = useState<Course[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/login?redirect=/checkout'
        return
      }
      setUser({ id: data.user.id, email: data.user.email ?? '' })
      loadData(data.user.id)
    })
  }, [])

  async function loadData(userId: string) {
    // Get course IDs from URL params
    const params = new URLSearchParams(window.location.search)
    const courseIds = params.get('courses')?.split(',').filter(Boolean) ?? []
    const singleCourse = params.get('course')

    const ids = singleCourse ? [singleCourse] : courseIds
    if (ids.length === 0) {
      // Fall back to cart items
      const { data: cartData } = await supabase
        .from('cart_items')
        .select('course_id')
        .eq('student_id', userId)
      ids.push(...(cartData ?? []).map((c: any) => c.course_id))
    }

    if (ids.length === 0) {
      window.location.href = '/cart'
      return
    }

    const [{ data: coursesData }, { data: profileData }] = await Promise.all([
      supabase.from('courses').select('id,title,slug,fee_inr,thumbnail_url,mode,duration_weeks').in('id', ids),
      supabase.from('student_profiles').select('full_name,phone,city').eq('id', userId).single(),
    ])

    setCourses(coursesData ?? [])
    setProfile(profileData)
    setLoading(false)
  }

  const total = courses.reduce((sum, c) => sum + c.fee_inr, 0)

  async function handlePayment() {
    if (!user) return
    setPaying(true)
    setError('')

    try {
      // Create a Razorpay order
      // NOTE: In production you need a backend/edge function to create orders securely.
      // For now we use the client-side approach for testing.
      // Replace with your actual Razorpay Key ID above.

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: total * 100, // in paise
        currency: 'INR',
        name: 'ATEC Educational Society',
        description: courses.map(c => c.title).join(', '),
        image: '/logo.png',
        prefill: {
          name: profile?.full_name ?? '',
          email: user.email,
          contact: profile?.phone ?? '',
        },
        theme: { color: '#1c3d7a' },
        handler: async function (response: any) {
          await onPaymentSuccess(response)
        },
        modal: {
          ondismiss: () => {
            setPaying(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response: any) => {
        setError(`Payment failed: ${response.error.description}`)
        setPaying(false)
      })
      rzp.open()

    } catch (err) {
      setError('Could not initialise payment. Please try again.')
      setPaying(false)
    }
  }

  async function onPaymentSuccess(response: {
    razorpay_payment_id: string
    razorpay_order_id?: string
    razorpay_signature?: string
  }) {
    if (!user) return

    // Create enrollments for each course
    for (const course of courses) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .insert({
          student_id: user.id,
          course_id: course.id,
          payment_status: 'paid',
          payment_id: response.razorpay_payment_id,
          amount_paid: course.fee_inr,
        })
        .select('id')
        .single()

      // Log payment
      await supabase.from('payments').insert({
        student_id: user.id,
        course_id: course.id,
        enrollment_id: enrollment?.id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id ?? '',
        razorpay_signature: response.razorpay_signature ?? '',
        amount_paise: course.fee_inr * 100,
        status: 'captured',
      })
    }

    // Remove purchased courses from cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('student_id', user.id)
      .in('course_id', courses.map(c => c.id))

    setSuccess(true)
    setPaying(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading checkout...
    </div>
  )

  if (success) return (
    <div style={{
      background: '#fff', borderRadius: '20px',
      border: '1px solid #e5e7eb', padding: '60px 40px',
      maxWidth: '520px', margin: '0 auto', textAlign: 'center',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '800', color: '#0f1724', marginBottom: '12px' }}>
        Enrollment Confirmed!
      </h2>
      <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '8px' }}>
        You are now enrolled in:
      </p>
      {courses.map(c => (
        <div key={c.id} style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: '#1c3d7a', marginBottom: '4px' }}>
          ✓ {c.title}
        </div>
      ))}
      <p style={{ fontSize: '13px', color: '#9ca3af', margin: '16px 0 28px' }}>
        A confirmation email has been sent to {user?.email}
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="/dashboard/my-courses"
          style={{
            padding: '14px 28px', background: '#1c3d7a', color: '#fff',
            borderRadius: '10px', textDecoration: 'none',
            fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px',
          }}
        >
          Go to My Courses →
        </a>
        <a
          href="/dashboard"
          style={{
            padding: '14px 28px', border: '1.5px solid #e5e7eb',
            borderRadius: '10px', textDecoration: 'none',
            fontSize: '14px', color: '#4b5563', fontWeight: '600',
          }}
        >
          Dashboard
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px', alignItems: 'start' }}>

      {/* Left: student details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Student info */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
            📋 Student Details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            {[
              { label: 'Name', value: profile?.full_name ?? 'Not set' },
              { label: 'Email', value: user?.email ?? '' },
              { label: 'Phone', value: profile?.phone ?? 'Not set' },
              { label: 'City', value: profile?.city ?? 'Not set' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontWeight: '600', color: '#0f1724' }}>{item.value}</div>
              </div>
            ))}
          </div>
          <a href="/dashboard/profile" style={{ fontSize: '13px', color: '#1c3d7a', fontWeight: '600', marginTop: '12px', display: 'inline-block' }}>
            Edit Profile →
          </a>
        </div>

        {/* Courses being purchased */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '700' }}>
              🎓 Enrolling In
            </h2>
          </div>
          {courses.map(course => (
            <div key={course.id} style={{ display: 'flex', gap: '14px', padding: '16px 24px', borderBottom: '1px solid #f9fafb', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '44px', borderRadius: '8px', background: '#dbeafe', flexShrink: 0, overflow: 'hidden' }}>
                {course.thumbnail_url
                  ? <img src={course.thumbnail_url} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📚</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px' }}>{course.title}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{course.duration_weeks} weeks · {course.mode}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '16px', color: '#1c3d7a', flexShrink: 0 }}>
                ₹{course.fee_inr.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>

        {/* What happens after payment */}
        <div style={{ background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', padding: '20px 24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: '700', color: '#166534', marginBottom: '12px' }}>
            ✅ After Payment You Get:
          </h3>
          {[
            'Instant access to your course materials',
            'Zoom class join links in your dashboard',
            'Certificate upon course completion',
            'Direct WhatsApp support from instructors',
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#166534', marginBottom: '6px' }}>
              <span>→</span><span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: payment summary */}
      <div style={{ position: 'sticky', top: '80px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>
            💳 Payment Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {courses.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#4b5563' }}>{c.title}</span>
                <span style={{ fontWeight: '600' }}>₹{c.fee_inr.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: '#e5e7eb' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
              <span>Total</span>
              <span style={{ fontFamily: 'var(--font-display)', color: '#1c3d7a' }}>
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', marginBottom: '14px' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={paying}
            style={{
              width: '100%', padding: '16px',
              background: paying ? '#9ca3af' : '#d4f01a',
              color: paying ? '#fff' : '#0f2347',
              border: 'none', borderRadius: '10px',
              fontFamily: 'var(--font-display)', fontWeight: '800',
              fontSize: '16px', cursor: paying ? 'not-allowed' : 'pointer',
              marginBottom: '12px', transition: 'all 0.2s',
            }}
          >
            {paying ? '⏳ Processing...' : `Pay ₹${total.toLocaleString('en-IN')} →`}
          </button>

          <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
            🔒 Secured by Razorpay<br />
            UPI · Cards · Net Banking · Wallets accepted<br />
            7-day money-back guarantee
          </div>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <img
              src="https://razorpay.com/assets/razorpay-glyph.svg"
              alt="Razorpay"
              style={{ height: '20px', opacity: 0.5, display: 'block', margin: '0 auto' }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 360px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
