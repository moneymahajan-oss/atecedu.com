// src/components/admin/AdminDashboard.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Stats {
  totalStudents: number
  totalEnrollments: number
  totalRevenue: number
  totalCourses: number
  pendingEnquiries: number
  newStudentsThisMonth: number
  recentPayments: any[]
  recentEnquiries: any[]
  topCourses: any[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    // Simple admin check — email match
    const adminEmails = ['atecgsp@gmail.com', 'admin@atecedu.com']
    if (!adminEmails.includes(user.email ?? '')) {
      window.location.href = '/dashboard'
      return
    }
    loadStats()
  }

  async function loadStats() {
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const [
      { count: students },
      { count: enrollments },
      { count: courses },
      { count: enquiries },
      { count: newStudents },
      { data: payments },
      { data: recentEnq },
      { data: topCourses },
    ] = await Promise.all([
      supabase.from('student_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('payment_status', 'paid'),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('enquiries').select('*', { count: 'exact', head: true }).eq('is_contacted', false),
      supabase.from('student_profiles').select('*', { count: 'exact', head: true }).gte('created_at', thisMonth.toISOString()),
      supabase.from('payments').select('amount_paise, created_at, student_id, courses(title)').eq('status', 'captured').order('created_at', { ascending: false }).limit(5),
      supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('enrollments').select('course_id, courses(title, thumbnail_url)').eq('payment_status', 'paid').limit(100),
    ])

    // Calculate revenue
    const revenue = (payments ?? []).reduce((sum: number, p: any) => sum + (p.amount_paise ?? 0) / 100, 0)

    // Top courses by enrollment count
    const courseMap: Record<string, { title: string; count: number; thumb: string | null }> = {}
    for (const e of topCourses ?? []) {
      const id = (e as any).course_id
      if (!courseMap[id]) courseMap[id] = { title: (e as any).courses?.title ?? '', count: 0, thumb: (e as any).courses?.thumbnail_url ?? null }
      courseMap[id].count++
    }
    const topCoursesArr = Object.values(courseMap).sort((a, b) => b.count - a.count).slice(0, 5)

    setStats({
      totalStudents: students ?? 0,
      totalEnrollments: enrollments ?? 0,
      totalRevenue: revenue,
      totalCourses: courses ?? 0,
      pendingEnquiries: enquiries ?? 0,
      newStudentsThisMonth: newStudents ?? 0,
      recentPayments: payments ?? [],
      recentEnquiries: recentEnq ?? [],
      topCourses: topCoursesArr,
    })
    setLoading(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading dashboard...
    </div>
  )

  const s = stats!

  const statCards = [
    { icon: '👥', label: 'Total Students', value: s.totalStudents.toLocaleString('en-IN'), color: '#dbeafe', text: '#1e40af' },
    { icon: '🎓', label: 'Total Enrollments', value: s.totalEnrollments.toLocaleString('en-IN'), color: '#dcfce7', text: '#166534' },
    { icon: '💰', label: 'Total Revenue', value: `₹${s.totalRevenue.toLocaleString('en-IN')}`, color: '#fef9c3', text: '#713f12' },
    { icon: '📚', label: 'Active Courses', value: s.totalCourses.toString(), color: '#ede9fe', text: '#5b21b6' },
    { icon: '💬', label: 'Pending Enquiries', value: s.pendingEnquiries.toString(), color: '#fee2e2', text: '#991b1b' },
    { icon: '🆕', label: 'New This Month', value: s.newStudentsThisMonth.toString(), color: '#ccfbf1', text: '#065f46' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
          Dashboard Overview
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' }}>
              {card.icon}
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.6rem', fontWeight: '800', color: card.text, lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Recent payments */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px' }}>💳 Recent Payments</h3>
            <a href="/admin/payments" style={{ fontSize: '12px', color: '#1c3d7a', fontWeight: '600' }}>View all →</a>
          </div>
          {s.recentPayments.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No payments yet</div>
          ) : (
            s.recentPayments.map((p: any, i: number) => (
              <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{(p.courses as any)?.title ?? 'Course'}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#166534' }}>
                  ₹{((p.amount_paise ?? 0) / 100).toLocaleString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent enquiries */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px' }}>💬 Recent Enquiries</h3>
            <a href="/admin/enquiries" style={{ fontSize: '12px', color: '#1c3d7a', fontWeight: '600' }}>View all →</a>
          </div>
          {s.recentEnquiries.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No enquiries yet</div>
          ) : (
            s.recentEnquiries.map((e: any) => (
              <div key={e.id} style={{ padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{e.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{e.phone} · {e.course_interest ?? 'General'}</div>
                  </div>
                  {!e.is_contacted && (
                    <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px' }}>NEW</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top courses */}
      {s.topCourses.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px' }}>🏆 Top Courses by Enrollment</h3>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {s.topCourses.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#1c3d7a', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{c.title}</div>
                  <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '5px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#1c3d7a', borderRadius: '4px', width: `${Math.min(100, (c.count / s.totalEnrollments) * 100)}%` }} />
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1c3d7a', flexShrink: 0 }}>{c.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { href: '/admin/courses', icon: '📚', label: 'Add Course' },
          { href: '/admin/certificates', icon: '📜', label: 'Issue Certificate' },
          { href: '/admin/offer-timer', icon: '⏱️', label: 'Set Offer Timer' },
          { href: '/admin/theme', icon: '🎨', label: 'Change Theme' },
          { href: '/admin/homepage', icon: '🏠', label: 'Edit Homepage' },
          { href: '/admin/zoom', icon: '🎥', label: 'Add Zoom Link' },
        ].map(link => (
          <a key={link.href} href={link.href} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', textDecoration: 'none', color: '#1e293b', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1c3d7a'; (e.currentTarget as HTMLElement).style.background = '#eff6ff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.background = '#fff' }}
          >
            <span style={{ fontSize: '22px' }}>{link.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
