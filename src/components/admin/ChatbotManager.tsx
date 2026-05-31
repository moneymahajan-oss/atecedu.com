// src/components/admin/ChatbotManager.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Config {
  is_enabled: boolean
  greeting: string
  bot_name: string
  bot_avatar: string
  whatsapp_number: string
  primary_color: string
  accent_color: string
  quick_replies: string[]
}

const DEFAULT: Config = {
  is_enabled: true,
  greeting: 'Hi! 👋 Welcome to ATEC Educational Society. How can I help you today?',
  bot_name: 'ATEC Assistant',
  bot_avatar: '🎓',
  whatsapp_number: '+917009933289',
  primary_color: '#1c3d7a',
  accent_color: '#d4f01a',
  quick_replies: ['View Courses', 'Course Fees', 'Admission Process', 'Verify Certificate', 'Contact Us', 'Talk to Advisor'],
}

export default function ChatbotManager() {
  const [config, setConfig] = useState<Config>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newReply, setNewReply] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'chatbot_config').single()
    if (data?.value) setConfig({ ...DEFAULT, ...(data.value as Config) })
  }

  async function save() {
    setSaving(true)
    await supabase.from('site_settings').upsert({ key: 'chatbot_config', value: config })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const update = (field: keyof Config, value: any) => setConfig(p => ({ ...p, [field]: value }))

  function addReply() {
    if (!newReply.trim()) return
    update('quick_replies', [...config.quick_replies, newReply.trim()])
    setNewReply('')
  }

  function removeReply(i: number) {
    update('quick_replies', config.quick_replies.filter((_, idx) => idx !== i))
  }

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '700px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.5rem', fontWeight: '800' }}>🤖 Chatbot Settings</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Configure the floating chatbot that appears on every page</p>
        </div>
        <button onClick={save} disabled={saving}
          style={{ padding: '11px 28px', background: saving ? '#94a3b8' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </div>

      {/* Enable/disable */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px' }}>Chatbot {config.is_enabled ? '✅ Enabled' : '⭕ Disabled'}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Shows floating chat button on every page of the website</div>
        </div>
        <button onClick={() => update('is_enabled', !config.is_enabled)}
          style={{ width: '52px', height: '28px', borderRadius: '14px', background: config.is_enabled ? '#22c55e' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', top: '3px', left: config.is_enabled ? '27px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </button>
      </div>

      {/* Identity */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px' }}>🪪 Bot Identity</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Bot Name</label>
            <input type="text" value={config.bot_name} onChange={e => update('bot_name', e.target.value)} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Bot Avatar (emoji)</label>
            <input type="text" value={config.bot_avatar} onChange={e => update('bot_avatar', e.target.value)} placeholder="🎓" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>WhatsApp Number</label>
            <input type="text" value={config.whatsapp_number} onChange={e => update('whatsapp_number', e.target.value)} placeholder="+917009933289" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Greeting Message</label>
          <textarea value={config.greeting} onChange={e => update('greeting', e.target.value)} rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
        </div>
      </div>

      {/* Colors */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px' }}>🎨 Chat Colors</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {[{ label: 'Primary Color (header, user bubbles)', field: 'primary_color' as keyof Config }, { label: 'Accent Color (bot avatar)', field: 'accent_color' as keyof Config }].map(c => (
            <div key={c.field}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>{c.label}</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={config[c.field] as string} onChange={e => update(c.field, e.target.value)} style={{ width: '40px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
                <input type="text" value={config[c.field] as string} onChange={e => update(c.field, e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }}
                  onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: config[c.field] as string, border: '1px solid #e2e8f0', flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick replies */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px', marginBottom: '16px' }}>⚡ Quick Reply Buttons</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {config.quick_replies.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '5px 12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1c3d7a' }}>{r}</span>
              <button onClick={() => removeReply(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', padding: '0', lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="text" value={newReply} placeholder="Add quick reply button text..." onChange={e => setNewReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && addReply()}
            style={{ ...inputStyle, flex: 1 }}
            onFocus={e => (e.target.style.borderColor = '#1c3d7a')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
          <button onClick={addReply} style={{ padding: '10px 18px', background: '#1c3d7a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>+ Add</button>
        </div>
      </div>
    </div>
  )
}
