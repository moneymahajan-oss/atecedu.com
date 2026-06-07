// src/components/dashboard/PaymentsPage.tsx
// Student payment history + printable receipts
// Uses DashboardLayout for shared sidebar

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import DashboardLayout from './DashboardLayout'

interface PaymentOrder {
  id: string
  razorpay_payment_id: string | null
  amount_paise: number
  status: string
  paid_at: string
  course_ids: string[]
  courses: { title: string; slug: string; thumbnail_url: string | null }[]
}

interface Enrollment {
  course_id: string
  payment_status: string
  amount_paid: number | null
  enrolled_at: string
  courses: { title: string; slug: string; thumbnail_url: string | null }
}

export default function PaymentsPage() {
  const [orders, setOrders]       = useState<PaymentOrder[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [profile, setProfile]     = useState<{ full_name: string; email: string } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState<Enrollment | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return }
      loadPayments(data.user.id, data.user.email ?? '')
    })
  }, [])

  async function loadPayments(uid: string, email: string) {
    const [{ data: profileData }, { data: enrollData }] = await Promise.all([
      supabase.from('student_profiles').select('full_name').eq('id', uid).single(),
      supabase.from('enrollments')
        .select('course_id, payment_status, amount_paid, enrolled_at, courses(title, slug, thumbnail_url)')
        .eq('student_id', uid)
        .in('payment_status', ['paid', 'free'])
        .order('enrolled_at', { ascending: false }),
    ])

    setProfile({ full_name: profileData?.full_name ?? '', email })
    setEnrollments((enrollData ?? []).map((e: any) => ({
      course_id: e.course_id,
      payment_status: e.payment_status,
      amount_paid: e.amount_paid,
      enrolled_at: e.enrolled_at,
      courses: e.courses ?? { title: 'Unknown Course', slug: '', thumbnail_url: null },
    })))
    setLoading(false)
  }

  function printReceipt(e: Enrollment) {
    const receiptNum = `ATEC-${new Date(e.enrolled_at).getFullYear()}-${e.course_id.slice(0,6).toUpperCase()}`
    const date = new Date(e.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const amount = e.amount_paid ? `₹${e.amount_paid.toLocaleString('en-IN')}` : 'Free Enrollment'
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Receipt — ${e.courses.title}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #1e293b; }
        .header { background: #0b1525; color: white; padding: 24px; border-radius: 12px 12px 0 0; }
        .logo { font-size: 24px; font-weight: 900; color: #d4f01a; }
        .sub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; }
        .body { border: 1px solid #e5e7eb; border-top: none; padding: 28px; border-radius: 0 0 12px 12px; }
        .receipt-num { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .row:last-child { border: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; text-align: right; }
        .total-row { background: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-top: 16px; display: flex; justify-content: space-between; }
        .total-label { font-weight: 700; font-size: 15px; }
        .total-value { font-weight: 900; font-size: 18px; color: #0b1525; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
          background: ${e.payment_status === 'paid' ? '#dcfce7' : '#f3e8ff'}; color: ${e.payment_status === 'paid' ? '#166534' : '#6b21a8'}; }
        .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <div class="header">
        <div class="logo">ATEC</div>
        <div class="sub">ATEC Educational Society, Gurdaspur, Punjab</div>
        <div class="sub">ISO 9001:2015 Certified · atecgsp@gmail.com</div>
      </div>
      <div class="body">
        <div class="receipt-num">Receipt No: <strong>${receiptNum}</strong></div>
        <h2 style="font-size:18px;margin-bottom:20px">Enrollment Receipt</h2>
        <div class="row"><span class="label">Student Name</span><span class="value">${profile?.full_name || 'Student'}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${profile?.email}</span></div>
        <div class="row"><span class="label">Course</span><span class="value">${e.courses.title}</span></div>
        <div class="row"><span class="label">Enrollment Date</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Payment Status</span><span class="value"><span class="status-badge">${e.payment_status.toUpperCase()}</span></span></div>
        <div class="total-row">
          <span class="total-label">Amount Paid</span>
          <span class="total-value">${amount}</span>
        </div>
        <div class="footer">
          Thank you for enrolling with ATEC Educational Society.<br>
          For support: atecgsp@gmail.com · +91 89685 02441<br>
          This is a computer-generated receipt and does not require a signature.
        </div>
      </div>
      <script>window.onload = () => window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  const totalPaid = enrollments.reduce((sum, e) => sum + (e.amount_paid ?? 0), 0)

  if (loading) return (
    <DashboardLayout activeSection="payments">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16, color: '#6b7280' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#0b1525', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout activeSection="payments">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: 'clamp(1.3rem,3vw,1.7rem)', fontWeight: 800, color: '#0b1525' }}>
            💳 Payments & Receipts
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''} · Total paid: ₹{totalPaid.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
          {[
            { icon: '🎓', label: 'Total Enrollments', value: enrollments.length, bg: '#dbeafe', color: '#1e40af' },
            { icon: '💰', label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN')}`, bg: '#dcfce7', color: '#166534' },
            { icon: '🎁', label: 'Free Enrollments', value: enrollments.filter(e => e.payment_status === 'free').length, bg: '#f3e8ff', color: '#6b21a8' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Enrollments list */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: '1rem' }}>
              📋 Enrollment History
            </h2>
          </div>

          {enrollments.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p>No enrollments yet. <a href="/courses" style={{ color: '#0b1525', fontWeight: 600 }}>Browse courses →</a></p>
            </div>
          ) : (
            enrollments.map(e => (
              <div key={e.course_id}
                style={{ padding: '16px 24px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={ev => (ev.currentTarget.style.background = '#fafbfc')}
                onMouseLeave={ev => (ev.currentTarget.style.background = '')}
              >
                {/* Thumbnail */}
                <div style={{ width: 52, height: 40, borderRadius: 8, background: '#dbeafe', flexShrink: 0, overflow: 'hidden' }}>
                  {e.courses.thumbnail_url
                    ? <img src={e.courses.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📚</div>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.courses.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Enrolled {new Date(e.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 16 }}>
                  <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 800, fontSize: 15, color: '#0b1525' }}>
                    {e.amount_paid ? `₹${e.amount_paid.toLocaleString('en-IN')}` : '—'}
                  </div>
                  <span style={{ display: 'inline-block', marginTop: 3, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: e.payment_status === 'paid' ? '#dcfce7' : '#f3e8ff',
                    color: e.payment_status === 'paid' ? '#166534' : '#6b21a8'
                  }}>
                    {e.payment_status === 'free' ? '🎁 FREE' : '✅ PAID'}
                  </span>
                </div>

                {/* Receipt button */}
                <button
                  onClick={() => printReceipt(e)}
                  style={{ padding: '8px 16px', background: '#0b1525', color: '#d4f01a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                >
                  🖨️ Receipt
                </button>
              </div>
            ))
          )}
        </div>

        {/* Info note */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#1e40af' }}>
          💡 Need a formal invoice or GST receipt? Email us at <strong>atecgsp@gmail.com</strong> with your enrollment details.
        </div>

      </div>
    </DashboardLayout>
  )
}
