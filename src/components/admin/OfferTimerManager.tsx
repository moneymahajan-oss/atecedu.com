// src/components/admin/OfferTimerManager.tsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface Strip {
  text: string
  link: string
  link_text: string
  is_active: boolean
  bg_color: string
  text_color: string
  ends_at: string
  show_timer: boolean
}

const DEFAULT: Strip = {
  text: '🎓 New Batch Starting — Hardware & Networking | Limited Seats!',
  link: '/courses/hardware-networking',
  link_text: 'Enroll Now',
  is_active: true,
  bg_color: '#0f2347',
  text_color: '#ffffff',
  ends_at: '',
  show_timer: true,
}

export default function OfferTimerManager() {
  const [strip, setStrip] = useState<Strip>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [countdown, setCountdown] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadStrip()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (strip.ends_at && strip.show_timer) {
      const tick = () => {
        const diff = new Date(strip.ends_at).getTime() - Date.now()
        if (diff <= 0) { setCountdown('EXPIRED'); return }
        const d = Math.floor(diff / 86400000)
        const h = Math.floor((diff % 86400000) / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        const pad = (n: number) => String(n).padStart(2, '0')
        setCountdown(d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s` : `${pad(h)}:${pad(m)}:${pad(s)}`)
      }
      tick()
      timerRef.current = setInterval(tick, 1000)
    } else {
      setCountdown('')
    }
  }, [strip.ends_at, strip.show_timer])

  async function loadStrip() {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'announcement_strip').single()
    if (data?.value) setStrip({ ...DEFAULT, ...(data.value as Strip) })
  }

  async function save() {
    setSaving(true)
    await supabase.from('site_settings').upsert({ key: 'announcement_strip', value: strip })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  function setQuickTimer(hours: number) {
    const d = new Date(Date.now() + hours * 3600000)
    // Format as datetime-local value
    const pad = (n: number) => String(n).padStart(2, '0')
    const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    setStrip(prev => ({ ...prev, ends_at: local }))
  }

  const update = (field: keyof Strip, value: any) =>
    setStrip(prev => ({ ...prev, [field]: value }))

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.5rem', fontWeight: '800' }}>⏱️ Offer Timer & Announcement Strip</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Manage the top announcement bar with countdown timer like Edureka</p>
        </div>
        <button
          onClick={save} disabled={saving}
          style={{ padding: '11px 28px', background: saving ? '#94a3b8' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving...' : saved ? '✅ Saved!' : '💾 Save & Publish'}
        </button>
      </div>

      {/* Live preview */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
          👁️ Live Preview
        </div>
        <div style={{ background: strip.is_active ? strip.bg_color : '#94a3b8', padding: '10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: strip.text_color }}>
              {strip.text || 'Your announcement text here...'}
            </span>
            {strip.show_timer && strip.ends_at && countdown && (
              <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '4px', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#d4f01a' }}>
                ⏱ {countdown}
              </span>
            )}
            {strip.link_text && strip.link && (
              <span style={{ color: '#d4f01a', fontSize: '13px', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer' }}>
                {strip.link_text} →
              </span>
            )}
          </div>
        </div>
        {!strip.is_active && (
          <div style={{ padding: '8px 16px', background: '#fef9c3', fontSize: '12px', color: '#713f12', textAlign: 'center' }}>
            ⚠️ Strip is currently DISABLED — enable it below to show on website
          </div>
        )}
      </div>

      {/* Settings */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Active toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: strip.is_active ? '#dcfce7' : '#f8fafc', borderRadius: '10px', border: `1px solid ${strip.is_active ? '#bbf7d0' : '#e2e8f0'}` }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: strip.is_active ? '#166534' : '#64748b' }}>
              {strip.is_active ? '✅ Strip is ACTIVE' : '⭕ Strip is DISABLED'}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Toggle to show/hide announcement bar on website</div>
          </div>
          <button
            onClick={() => update('is_active', !strip.is_active)}
            style={{
              width: '52px', height: '28px', borderRadius: '14px',
              background: strip.is_active ? '#22c55e' : '#d1d5db',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: '3px',
              left: strip.is_active ? '27px' : '3px',
              width: '22px', height: '22px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        {/* Text */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
            📝 Announcement Text
          </label>
          <input
            type="text" value={strip.text}
            onChange={e => update('text', e.target.value)}
            placeholder="🎓 New Batch Starting — Limited Seats!" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
          />
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Use emojis to make it eye-catching 🎓🔥⚡</div>
        </div>

        {/* Link */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>🔗 Link URL</label>
            <input type="text" value={strip.link} onChange={e => update('link', e.target.value)} placeholder="/courses/hardware-networking" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>🏷️ Link Button Text</label>
            <input type="text" value={strip.link_text} onChange={e => update('link_text', e.target.value)} placeholder="Enroll Now" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
        </div>

        {/* Colors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>🎨 Background Color</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="color" value={strip.bg_color} onChange={e => update('bg_color', e.target.value)} style={{ width: '40px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
              <input type="text" value={strip.bg_color} onChange={e => update('bg_color', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }}
                onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>✏️ Text Color</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="color" value={strip.text_color} onChange={e => update('text_color', e.target.value)} style={{ width: '40px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
              <input type="text" value={strip.text_color} onChange={e => update('text_color', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }}
                onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
          </div>
        </div>

        {/* Countdown timer */}
        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>⏱️ Countdown Timer</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Shows live timer in the strip — like Edureka's "Ends in"</div>
            </div>
            <button
              onClick={() => update('show_timer', !strip.show_timer)}
              style={{ width: '48px', height: '26px', borderRadius: '13px', background: strip.show_timer ? '#22c55e' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
            >
              <span style={{ position: 'absolute', top: '3px', left: strip.show_timer ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>

          {strip.show_timer && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Offer Ends At</label>
                <input
                  type="datetime-local"
                  value={strip.ends_at}
                  onChange={e => update('ends_at', e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                  onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', alignSelf: 'center' }}>Quick set:</span>
                {[
                  { label: '6 hours', h: 6 },
                  { label: '12 hours', h: 12 },
                  { label: '24 hours', h: 24 },
                  { label: '3 days', h: 72 },
                  { label: '7 days', h: 168 },
                ].map(q => (
                  <button
                    key={q.h}
                    onClick={() => setQuickTimer(q.h)}
                    style={{ padding: '5px 12px', background: '#eff6ff', color: '#1c3d7a', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {q.label}
                  </button>
                ))}
                <button
                  onClick={() => update('ends_at', '')}
                  style={{ padding: '5px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>
              {countdown && (
                <div style={{ marginTop: '12px', padding: '10px 16px', background: '#0f2347', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '800', color: '#d4f01a' }}>
                    ⏱ {countdown}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
