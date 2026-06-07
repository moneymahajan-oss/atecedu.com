// src/components/dashboard/DashboardLayout.tsx
// Shared sidebar + layout shell for ALL student dashboard pages
// Usage: wrap any page content with <DashboardLayout activeSection="...">...</DashboardLayout>
// DOES NOT touch: CoursePlayer, CertificatesPage, ProfileEditor, any admin pages

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  activeSection: 'home' | 'my-courses' | 'certificates' | 'profile' | 'cart' | 'payments' | 'webinars'
  children: React.ReactNode
}

interface Profile {
  full_name: string
  photo_url: string | null
}

const NAV = [
  { key: 'home',         href: '/dashboard',              icon: '🏠', label: 'Dashboard' },
  { key: 'my-courses',   href: '/dashboard/my-courses',   icon: '📚', label: 'My Courses' },
  { key: 'webinars',     href: '/dashboard/webinars',     icon: '🎥', label: 'Live Sessions' },
  { key: 'certificates', href: '/dashboard/certificates', icon: '📜', label: 'Certificates' },
  { key: 'payments',     href: '/dashboard/payments',     icon: '💳', label: 'Payments' },
  { key: 'profile',      href: '/dashboard/profile',      icon: '👤', label: 'Edit Profile' },
  { key: 'cart',         href: '/cart',                   icon: '🛒', label: 'My Cart' },
]

export default function DashboardLayout({ activeSection, children }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      supabase.from('student_profiles').select('full_name,photo_url').eq('id', data.user.id).single()
        .then(({ data: p }) => { if (p) setProfile(p) })
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student'
  const initial = (profile?.full_name?.[0] ?? email[0] ?? 'S').toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--nav-height,64px))', background: '#f4f6fb', fontFamily: 'var(--font-body,Inter,sans-serif)' }}>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: 256,
        flexShrink: 0,
        background: '#0b1525',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 'var(--nav-height,64px)',
        height: 'calc(100vh - var(--nav-height,64px))',
        overflowY: 'auto',
        zIndex: 201,
        // Mobile: fixed + off-screen until open
        ...({} as any),
      }}
      className="db-sidebar"
      >
        {/* Profile card */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%',
              background: '#d4f01a', flexShrink: 0, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 800,
              fontSize: 18, color: '#0b1525',
            }}>
              {profile?.photo_url
                ? <img src={profile.photo_url} alt={firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display,Sora,sans-serif)', fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name ?? firstName}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', padding: '0 10px 8px', textTransform: 'uppercase' }}>
            Student Portal
          </div>
          {NAV.map(item => {
            const isActive = item.key === activeSection
            return (
              <a
                key={item.key}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  marginBottom: 2,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#d4f01a' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(212,240,26,0.12)' : 'transparent',
                  textDecoration: 'none',
                  borderLeft: isActive ? '3px solid #d4f01a' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </a>
            )
          })}

          {/* Browse more courses */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
          <a
            href="/courses"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 2, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: 16 }}>🔍</span>
            Browse Courses
          </a>
          <a
            href="/verification"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 2, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: 16 }}>✅</span>
            Verify Certificate
          </a>
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)' }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile hamburger ── */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        className="db-hamburger"
        style={{ display: 'none', position: 'fixed', bottom: 20, right: 20, zIndex: 300, width: 48, height: 48, background: '#0b1525', border: 'none', borderRadius: '50%', color: '#d4f01a', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* ── Main content ── */}
      <main style={{ flex: 1, minWidth: 0, padding: '32px 28px 60px' }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 900px) {
          .db-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: ${mobileOpen ? '0' : '-260px'} !important;
            height: 100vh !important;
            transition: left 0.3s ease;
          }
          .db-hamburger { display: flex !important; }
          main { padding: 20px 16px 80px !important; }
        }
      `}</style>
    </div>
  )
}
