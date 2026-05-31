// src/components/admin/ThemeManager.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Theme {
  primary: string
  primary_dark: string
  primary_mid: string
  accent: string
  accent_dark: string
  text_primary: string
  text_secondary: string
  background: string
  off_white: string
  font_heading: string
  font_body: string
  border_radius: string
}

const PRESETS: { name: string; emoji: string; theme: Theme }[] = [
  {
    name: 'Navy & Lemon (Default)',
    emoji: '🔵',
    theme: {
      primary: '#1c3d7a', primary_dark: '#0f2347', primary_mid: '#1e4694',
      accent: '#d4f01a', accent_dark: '#b8d400',
      text_primary: '#0f1724', text_secondary: '#3d4f6b',
      background: '#ffffff', off_white: '#f6f8ff',
      font_heading: 'Sora', font_body: 'Inter', border_radius: '10',
    }
  },
  {
    name: 'Royal Purple & Gold',
    emoji: '💜',
    theme: {
      primary: '#5b21b6', primary_dark: '#3b0764', primary_mid: '#7c3aed',
      accent: '#f59e0b', accent_dark: '#d97706',
      text_primary: '#1e1b4b', text_secondary: '#4c1d95',
      background: '#ffffff', off_white: '#faf5ff',
      font_heading: 'Sora', font_body: 'Inter', border_radius: '10',
    }
  },
  {
    name: 'Deep Green & Orange',
    emoji: '💚',
    theme: {
      primary: '#065f46', primary_dark: '#022c22', primary_mid: '#047857',
      accent: '#f97316', accent_dark: '#ea580c',
      text_primary: '#022c22', text_secondary: '#064e3b',
      background: '#ffffff', off_white: '#f0fdf4',
      font_heading: 'Sora', font_body: 'Inter', border_radius: '10',
    }
  },
  {
    name: 'Crimson & Teal',
    emoji: '❤️',
    theme: {
      primary: '#991b1b', primary_dark: '#7f1d1d', primary_mid: '#b91c1c',
      accent: '#0d9488', accent_dark: '#0f766e',
      text_primary: '#1c1917', text_secondary: '#44403c',
      background: '#ffffff', off_white: '#fff1f2',
      font_heading: 'Sora', font_body: 'Inter', border_radius: '10',
    }
  },
  {
    name: 'Midnight Black & Cyan',
    emoji: '🖤',
    theme: {
      primary: '#0f172a', primary_dark: '#020617', primary_mid: '#1e293b',
      accent: '#06b6d4', accent_dark: '#0891b2',
      text_primary: '#0f172a', text_secondary: '#334155',
      background: '#ffffff', off_white: '#f0f9ff',
      font_heading: 'Sora', font_body: 'Inter', border_radius: '10',
    }
  },
  {
    name: 'Saffron & Navy (Indian)',
    emoji: '🇮🇳',
    theme: {
      primary: '#1d4ed8', primary_dark: '#1e3a8a', primary_mid: '#2563eb',
      accent: '#f97316', accent_dark: '#ea580c',
      text_primary: '#1e1b4b', text_secondary: '#1e40af',
      background: '#ffffff', off_white: '#fff7ed',
      font_heading: 'Sora', font_body: 'Inter', border_radius: '10',
    }
  },
]

const FONT_OPTIONS = ['Sora', 'Inter', 'Poppins', 'Nunito', 'Raleway', 'Outfit', 'Plus Jakarta Sans']

export default function ThemeManager() {
  const [theme, setTheme] = useState<Theme>(PRESETS[0].theme)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activePreset, setActivePreset] = useState(0)

  useEffect(() => { loadTheme() }, [])

  async function loadTheme() {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'theme')
      .single()
    if (data?.value) setTheme(data.value as Theme)
  }

  async function saveTheme() {
    setSaving(true)
    await supabase.from('site_settings').upsert({ key: 'theme', value: theme })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  function applyPreset(index: number) {
    setActivePreset(index)
    setTheme(PRESETS[index].theme)
  }

  function updateField(field: keyof Theme, value: string) {
    setTheme(prev => ({ ...prev, [field]: value }))
  }

  const ColorPicker = ({ label, field }: { label: string; field: keyof Theme }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="color"
          value={theme[field] as string}
          onChange={e => updateField(field, e.target.value)}
          style={{ width: '40px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
        />
        <input
          type="text"
          value={theme[field] as string}
          onChange={e => updateField(field, e.target.value)}
          style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
          onFocus={e => (e.target.style.borderColor = '#1c3d7a')}
          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
        />
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: theme[field] as string, border: '1px solid #e2e8f0', flexShrink: 0 }} />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.5rem', fontWeight: '800' }}>🎨 Theme & Colors</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Choose a preset or customize every color on your website</p>
        </div>
        <button
          onClick={saveTheme} disabled={saving}
          style={{ padding: '11px 28px', background: saving ? '#94a3b8' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving...' : saved ? '✅ Saved!' : '💾 Save Theme'}
        </button>
      </div>

      {/* Presets */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px', marginBottom: '16px' }}>
          🎯 Quick Presets
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              style={{
                padding: '14px', border: `2px solid ${activePreset === i ? preset.theme.primary : '#e2e8f0'}`,
                borderRadius: '12px', background: activePreset === i ? '#eff6ff' : '#fff',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: preset.theme.primary }} />
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: preset.theme.accent }} />
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: preset.theme.primary_mid }} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: activePreset === i ? '700' : '600', color: '#1e293b' }}>
                {preset.emoji} {preset.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom colors */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px', marginBottom: '20px' }}>
          🖌️ Custom Colors
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Primary (Navy) Colors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ColorPicker label="Primary Color (Main)" field="primary" />
              <ColorPicker label="Primary Dark (Darkest)" field="primary_dark" />
              <ColorPicker label="Primary Mid (Buttons)" field="primary_mid" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Accent (Lemon) Colors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ColorPicker label="Accent Color (CTA buttons)" field="accent" />
              <ColorPicker label="Accent Dark (Hover)" field="accent_dark" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Text Colors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ColorPicker label="Text Primary (Headings)" field="text_primary" />
              <ColorPicker label="Text Secondary (Body)" field="text_secondary" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Background Colors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ColorPicker label="Background (White)" field="background" />
              <ColorPicker label="Off White (Sections)" field="off_white" />
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px', marginBottom: '20px' }}>
          🔤 Typography
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Heading Font</label>
            <select
              value={theme.font_heading}
              onChange={e => updateField('font_heading', e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            >
              {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Body Font</label>
            <select
              value={theme.font_body}
              onChange={e => updateField('font_body', e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            >
              {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Border Radius (px)</label>
            <input
              type="range" min="0" max="24" value={theme.border_radius}
              onChange={e => updateField('border_radius', e.target.value)}
              style={{ width: '100%', marginTop: '8px' }}
            />
            <div style={{ fontSize: '13px', color: '#1c3d7a', fontWeight: '700', marginTop: '4px' }}>{theme.border_radius}px</div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px', marginBottom: '20px' }}>
          👁️ Live Preview
        </h2>
        <div style={{ background: theme.primary, borderRadius: `${theme.border_radius}px`, padding: '32px', marginBottom: '16px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', fontFamily: `${theme.font_heading}, sans-serif`, marginBottom: '8px' }}>
            ATEC Educational Society
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginBottom: '20px' }}>
            Turning Students Into Professionals Since 2000
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button style={{ padding: '10px 22px', background: theme.accent, color: theme.primary_dark, border: 'none', borderRadius: `${theme.border_radius}px`, fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: `${theme.font_heading}, sans-serif` }}>
              Enroll Now
            </button>
            <button style={{ padding: '10px 22px', background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.5)', borderRadius: `${theme.border_radius}px`, fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
              View Courses
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          {['Hardware & Networking', 'Web Designing', 'Tally ERP'].map(title => (
            <div key={title} style={{ background: theme.off_white, borderRadius: `${theme.border_radius}px`, border: '1px solid #e2e8f0', padding: '16px' }}>
              <div style={{ fontFamily: `${theme.font_heading}, sans-serif`, fontWeight: '700', fontSize: '13px', color: theme.text_primary, marginBottom: '8px' }}>{title}</div>
              <div style={{ fontFamily: `${theme.font_heading}, sans-serif`, fontSize: '16px', fontWeight: '800', color: theme.primary }}>₹12,000</div>
            </div>
          ))}
        </div>
      </div>

      {/* How to apply note */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', fontSize: '13px', color: '#78350f' }}>
        <strong>📌 Note:</strong> After saving, the theme is stored in Supabase. Your <code>global.css</code> reads it on next site build. Push to GitHub → Cloudflare rebuilds → theme goes live in ~2 minutes.
      </div>

    </div>
  )
}
