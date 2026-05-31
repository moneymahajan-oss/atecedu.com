// src/components/auth/SignupForm.tsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SignupForm() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    fatherName: '',
    phone: '',
    city: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: '10px',
    fontSize: '15px', outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: '600' as const,
    color: '#374151', marginBottom: '6px',
  }
  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = '#1c3d7a')
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = '#e5e7eb')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Save profile
    if (authData.user) {
      await supabase.from('student_profiles').upsert({
        id: authData.user.id,
        full_name: form.fullName,
        father_name: form.fatherName,
        phone: form.phone,
        city: form.city,
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>
          Account Created!
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
          Check your email <strong>{form.email}</strong> and click the confirmation link to activate your account.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block', padding: '12px 28px',
            background: '#1c3d7a', color: '#fff', borderRadius: '10px',
            fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Go to Login
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
        {[1, 2].map(s => (
          <div key={s} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: s <= step ? '#1c3d7a' : '#e5e7eb',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '-4px' }}>
        Step {step} of 2 — {step === 1 ? 'Personal Details' : 'Account Setup'}
      </p>

      {step === 1 && (
        <>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              type="text" value={form.fullName} required
              onChange={e => update('fullName', e.target.value)}
              placeholder="As per certificate" style={inputStyle}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Father's Name</label>
            <input
              type="text" value={form.fatherName}
              onChange={e => update('fatherName', e.target.value)}
              placeholder="Optional" style={inputStyle}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="tel" value={form.phone} required
                onChange={e => update('phone', e.target.value)}
                placeholder="+91 XXXXX XXXXX" style={inputStyle}
                onFocus={focusStyle} onBlur={blurStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input
                type="text" value={form.city}
                onChange={e => update('city', e.target.value)}
                placeholder="Your city" style={inputStyle}
                onFocus={focusStyle} onBlur={blurStyle}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!form.fullName || !form.phone) {
                setError('Full name and phone are required')
                return
              }
              setError('')
              setStep(2)
            }}
            style={{
              padding: '14px', background: '#1c3d7a', color: '#fff',
              border: 'none', borderRadius: '10px',
              fontFamily: 'var(--font-display)', fontWeight: '800',
              fontSize: '15px', cursor: 'pointer', marginTop: '4px',
            }}
          >
            Continue →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <label style={labelStyle}>Email Address *</label>
            <input
              type="email" value={form.email} required
              onChange={e => update('email', e.target.value)}
              placeholder="you@example.com" style={inputStyle}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password} required minLength={6}
                onChange={e => update('password', e.target.value)}
                placeholder="Min 6 characters" style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
              <button
                type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px' }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Confirm Password *</label>
            <input
              type="password" value={form.confirmPassword} required
              onChange={e => update('confirmPassword', e.target.value)}
              placeholder="Re-enter password" style={inputStyle}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button" onClick={() => setStep(1)}
              style={{ padding: '14px 20px', border: '1.5px solid #e5e7eb', borderRadius: '10px', background: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
            >
              ← Back
            </button>
            <button
              type="submit" disabled={loading}
              style={{
                flex: 1, padding: '14px',
                background: loading ? '#9ca3af' : '#1c3d7a',
                color: '#fff', border: 'none', borderRadius: '10px',
                fontFamily: 'var(--font-display)', fontWeight: '800',
                fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating Account...' : 'Create My Account 🎓'}
            </button>
          </div>
        </>
      )}

      {step === 1 && error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b' }}>
          ⚠️ {error}
        </div>
      )}
    </form>
  )
}
