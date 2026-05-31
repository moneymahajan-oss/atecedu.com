// src/components/auth/ForgotPasswordForm.tsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <div style={{ fontSize: '40px', marginBottom: '14px' }}>📧</div>
      <p style={{ fontSize: '15px', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
        Reset link sent!
      </p>
      <p style={{ fontSize: '13px', color: '#6b7280' }}>
        Check <strong>{email}</strong> for the password reset link.
      </p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
          Email Address
        </label>
        <input
          type="email" value={email} required
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
        />
      </div>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b' }}>
          ⚠️ {error}
        </div>
      )}
      <button
        type="submit" disabled={loading}
        style={{ padding: '14px', background: loading ? '#9ca3af' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  )
}
