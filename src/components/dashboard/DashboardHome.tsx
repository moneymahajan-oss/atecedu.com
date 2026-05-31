// src/components/dashboard/DashboardHome.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Enrollment {
  id: string
  course_id: string
  enrolled_at: string
  payment_status: string
  progress_percent: number
  course_title: string
  course_slug: string
  course_thumb: string | null
  course_mode: string
  course_duration: number
}

interface Profile {
  full_name: string
  phone: string
  city: string
  photo_url: string | null
}

interface Stats {
  enrolledCount: number
  completedCount: number
  certCount: number
}

export default function DashboardHome() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [stats, setStats] = useState<Stats>({ enrolledCount: 0, completedCount: 0, certCount: 0 })
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/login?redirect=/dashboard'
        return
      }
      setUser({ id: data.user.id, email: data.user.email ?? '' })
      loadDashboard(data.user.id)
    })
  }, [])

  async function loadDashboard(userId: string) {
    const [{ data: profileData }, { data: enrollData }, { data: certData }] = await Promise.all([
      supabase.from('student_profiles').select('*').eq('id', userId).single(),
      supabase.from('enrollments')
        .select('id,course_id,enrolled_at,payment_status,progress_percent,courses(title,slug,thumbnail_url,mode,duration_weeks)')
        .eq('student_id', userId)
        .eq('payment_status', 'paid')
        .order('enrolled_at', { ascending: false }),
      supabase.from('certificates').select('id').eq('student_id', userId).eq('is_active', true),
    ])

    setProfile(profileData)

    const mapped = (enrollData ?? []).map((e: any) => ({
      id: e.id,
      course_id: e.course_id,
      enrolled_at: e.enrolled_at,
      payment_status: e.payment_status,
      progress_percent: e.progress_percent ?? 0,
      course_title: e.courses?.title ?? '',
      course_slug: e.courses?.slug ?? '',
      course_thumb: e.courses?.thumbnail_url ?? null,
      course_mode: e.courses?.mode ?? '',
      course_duration: e.courses?.duration_weeks ?? 0,
    }))

    setEnrollments(mapped)
    setStats({
      enrolledCount: mapped.length,
      completedCount: mapped.filter(e => e.progress_percent === 100).length,
      certCount: (certData ?? []).length,
    })
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading your dashboard...
    </div>
  )

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '28px', alignItems: 'start' }}>

      {/* Sidebar */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #e5e7eb', overflow: 'hidden',
        position: 'sticky', top: '80px',
      }}>
        {/* Profile mini */}
        <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: '#1c3d7a', margin: '0 auto 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: '800',
            fontSize: '22px', color: '#d4f01a', overflow: 'hidden',
          }}>
            {profile?.photo_url
              ? <img src={profile.photo_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : firstName[0]
            }
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px' }}>
            {profile?.full_name ?? 'Student'}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{user?.email}</div>
        </div>

        {/* Nav links */}
        <nav style={{ padding: '12px 8px' }}>
          {[
            { href: '/dashboard', icon: '🏠', label: 'Dashboard', active: true },
            { href: '/dashboard/my-courses', icon: '📚', label: 'My Courses' },
            { href: '/dashboard/certificates', icon: '📜', label: 'My Certificates' },
            { href: '/dashboard/profile', icon: '👤', label: 'Edit Profile' },
            { href: '/cart', icon: '🛒', label: 'My Cart' },
          ].map(item => (
            <a key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 16px', borderRadius: '10px',
              fontSize: '14px', fontWeight: item.active ? '700' : '500',
              color: item.active ? '#1c3d7a' : '#4b5563',
              background: item.active ? '#eff6ff' : 'transparent',
              textDecoration: 'none', marginBottom: '2px',
              transition: 'all 0.15s',
            }}>
              <span>{item.icon}</span> {item.label}
            </a>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '10px', background: 'none',
              border: '1px solid #fecaca', borderRadius: '8px',
              fontSize: '13px', color: '#ef4444', fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Greeting */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '800', color: '#0f1724' }}>
            Welcome back, {firstName}! 👋
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {[
            { icon: '📚', label: 'Enrolled Courses', value: stats.enrolledCount, color: '#dbeafe', textColor: '#1e40af' },
            { icon: '✅', label: 'Completed', value: stats.completedCount, color: '#dcfce7', textColor: '#166534' },
            { icon: '📜', label: 'Certificates', value: stats.certCount, color: '#fef9c3', textColor: '#713f12' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: '14px',
              border: '1px solid #e5e7eb', padding: '20px',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: s.color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '20px', flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '800', color: s.textColor, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* My Courses */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '700' }}>
              📚 My Courses
            </h2>
            <a href="/dashboard/my-courses" style={{ fontSize: '13px', color: '#1c3d7a', fontWeight: '600' }}>
              View all →
            </a>
          </div>

          {enrollments.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎓</div>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>You haven't enrolled in any courses yet</p>
              <a href="/courses" style={{ padding: '10px 24px', background: '#1c3d7a', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
                Browse Courses
              </a>
            </div>
          ) : (
            enrollments.slice(0, 3).map(e => (
              <div key={e.id} style={{ padding: '16px 24px', borderBottom: '1px solid #f9fafb', display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '40px', borderRadius: '8px', background: '#dbeafe', flexShrink: 0, overflow: 'hidden' }}>
                  {e.course_thumb
                    ? <img src={e.course_thumb} alt={e.course_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📚</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {e.course_title}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg,#1c3d7a,#d4f01a)', borderRadius: '4px', width: `${e.progress_percent}%` }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>
                      {e.progress_percent}% complete
                    </div>
                  </div>
                </div>
                <a href={`/courses/${e.course_slug}`} style={{ padding: '7px 14px', background: '#eff6ff', color: '#1c3d7a', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textDecoration: 'none', flexShrink: 0 }}>
                  Continue →
                </a>
              </div>
            ))
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <a href="/courses" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '20px', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '28px' }}>🔍</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px' }}>Browse Courses</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Explore new courses</div>
            </div>
          </a>
          <a href="/verification" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '20px', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '28px' }}>✅</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px' }}>Verify Certificate</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Check certificate validity</div>
            </div>
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 240px 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="position: sticky; top: 80px"] {
            position: static !important;
          }
          div[style*="grid-template-columns: repeat(3,1fr)"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
