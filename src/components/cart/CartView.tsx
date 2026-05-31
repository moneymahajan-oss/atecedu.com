// src/components/cart/CartView.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface CartCourse {
  cart_id: string
  course_id: string
  title: string
  slug: string
  thumbnail_url: string | null
  mode: string
  duration_weeks: number
  fee_inr: number
  original_fee_inr: number | null
}

export default function CartView() {
  const [items, setItems] = useState<CartCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/login?redirect=/cart'
        return
      }
      setUser(data.user)
      fetchCart(data.user.id)
    })
  }, [])

  async function fetchCart(userId: string) {
    const { data } = await supabase
      .from('cart_items')
      .select(`
        id,
        course_id,
        courses (
          title, slug, thumbnail_url, mode, duration_weeks, fee_inr, original_fee_inr
        )
      `)
      .eq('student_id', userId)

    const mapped = (data ?? []).map((item: any) => ({
      cart_id: item.id,
      course_id: item.course_id,
      title: item.courses?.title ?? '',
      slug: item.courses?.slug ?? '',
      thumbnail_url: item.courses?.thumbnail_url ?? null,
      mode: item.courses?.mode ?? '',
      duration_weeks: item.courses?.duration_weeks ?? 0,
      fee_inr: item.courses?.fee_inr ?? 0,
      original_fee_inr: item.courses?.original_fee_inr ?? null,
    }))
    setItems(mapped)
    setLoading(false)
  }

  async function removeItem(cartId: string) {
    setRemoving(cartId)
    await supabase.from('cart_items').delete().eq('id', cartId)
    setItems(prev => prev.filter(i => i.cart_id !== cartId))
    setRemoving(null)
  }

  const total = items.reduce((sum, i) => sum + i.fee_inr, 0)
  const originalTotal = items.reduce((sum, i) => sum + (i.original_fee_inr ?? i.fee_inr), 0)
  const savings = originalTotal - total

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading your cart...
    </div>
  )

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛒</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '700', marginBottom: '10px' }}>
        Your cart is empty
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '28px', fontSize: '15px' }}>
        Browse our courses and add something to get started
      </p>
      <a
        href="/courses"
        style={{
          display: 'inline-block', padding: '14px 32px',
          background: '#1c3d7a', color: '#fff', borderRadius: '10px',
          fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px',
          textDecoration: 'none',
        }}
      >
        Browse Courses
      </a>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>

      {/* Cart items */}
      <div>
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '700' }}>
              {items.length} Course{items.length !== 1 ? 's' : ''} in Cart
            </h2>
          </div>

          {items.map(item => (
            <div key={item.cart_id} style={{
              display: 'flex', gap: '16px', padding: '20px 24px',
              borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start',
            }}>
              {/* Thumbnail */}
              <div style={{
                width: '100px', height: '68px', borderRadius: '8px',
                background: '#dbeafe', flexShrink: 0, overflow: 'hidden',
              }}>
                {item.thumbnail_url
                  ? <img src={item.thumbnail_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>📚</div>
                }
              </div>

              {/* Details */}
              <div style={{ flex: 1 }}>
                <a href={`/courses/${item.slug}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700',
                    color: '#0f1724', marginBottom: '6px', lineHeight: '1.3',
                  }}>
                    {item.title}
                  </h3>
                </a>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  <span style={{
                    background: '#dbeafe', color: '#1e40af',
                    padding: '2px 8px', borderRadius: '4px',
                    fontWeight: '600', textTransform: 'capitalize',
                  }}>
                    {item.mode}
                  </span>
                  <span>⏱ {item.duration_weeks} weeks</span>
                </div>
                <button
                  onClick={() => removeItem(item.cart_id)}
                  disabled={removing === item.cart_id}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', color: '#ef4444', fontWeight: '600',
                    padding: '0', opacity: removing === item.cart_id ? 0.5 : 1,
                  }}
                >
                  {removing === item.cart_id ? 'Removing...' : '🗑 Remove'}
                </button>
              </div>

              {/* Price */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', color: '#1c3d7a' }}>
                  ₹{item.fee_inr.toLocaleString('en-IN')}
                </div>
                {item.original_fee_inr && (
                  <div style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through' }}>
                    ₹{item.original_fee_inr.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order summary */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #e5e7eb', padding: '24px',
        position: 'sticky', top: '80px',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>
          Order Summary
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
            <span>Original Price</span>
            <span>₹{originalTotal.toLocaleString('en-IN')}</span>
          </div>
          {savings > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#166534' }}>
              <span>You Save</span>
              <span>-₹{savings.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div style={{ height: '1px', background: '#e5e7eb' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
            <span>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', color: '#1c3d7a' }}>
              ₹{total.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {savings > 0 && (
          <div style={{
            background: '#dcfce7', borderRadius: '8px', padding: '10px 14px',
            fontSize: '13px', color: '#166534', fontWeight: '600',
            marginBottom: '16px', textAlign: 'center',
          }}>
            🎉 You're saving ₹{savings.toLocaleString('en-IN')}!
          </div>
        )}

        <a
          href={`/checkout?courses=${items.map(i => i.course_id).join(',')}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '15px',
            background: '#d4f01a', color: '#0f2347',
            borderRadius: '10px', textDecoration: 'none',
            fontFamily: 'var(--font-display)', fontWeight: '800',
            fontSize: '16px', marginBottom: '10px',
          }}
        >
          Proceed to Checkout →
        </a>

        <a
          href="/courses"
          style={{
            display: 'block', textAlign: 'center', padding: '12px',
            border: '1.5px solid #e5e7eb', borderRadius: '10px',
            fontSize: '14px', color: '#4b5563', fontWeight: '600',
            textDecoration: 'none',
          }}
        >
          Continue Shopping
        </a>

        <div style={{
          marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', color: '#9ca3af', justifyContent: 'center',
        }}>
          🔒 Secure checkout · 7-day money-back guarantee
        </div>
      </div>

      {/* Mobile: full width at bottom on small screens */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 340px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
