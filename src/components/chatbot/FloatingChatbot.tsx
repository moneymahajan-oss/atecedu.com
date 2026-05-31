// src/components/chatbot/FloatingChatbot.tsx
// FIXED: reads Supabase config from window globals set by BaseLayout
import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  role: 'bot' | 'user'
  text: string
  options?: string[]
}

interface ChatbotConfig {
  is_enabled: boolean
  greeting: string
  bot_name: string
  bot_avatar: string
  whatsapp_number: string
  primary_color: string
  accent_color: string
  quick_replies: string[]
}

const DEFAULT: ChatbotConfig = {
  is_enabled: true,
  greeting: 'Hi! 👋 Welcome to ATEC Educational Society. How can I help you today?',
  bot_name: 'ATEC Assistant',
  bot_avatar: '🎓',
  whatsapp_number: '+917009933289',
  primary_color: '#1c3d7a',
  accent_color: '#d4f01a',
  quick_replies: ['View Courses', 'Course Fees', 'Admission Process', 'Verify Certificate', 'Contact Us', 'Talk to Advisor'],
}

const FAQ = [
  { patterns: ['course', 'courses', 'available', 'what course'], answer: '📚 We offer:\n\n• Hardware & Networking (24w) — ₹12,000\n• Web Designing (12w) — ₹8,000\n• Tally ERP 9/Prime (8w) — ₹5,000\n• Linux Administrator (16w) — ₹10,000\n• Chip-Level Repair (20w) — ₹15,000\n• Desktop Publishing (10w) — ₹6,000\n\nAll include a verified certificate! 🎓', options: ['Course Fees', 'Admission Process', 'Talk to Advisor'] },
  { patterns: ['fee', 'fees', 'cost', 'price', 'how much'], answer: '💰 Our fees:\n\n• Chip-Level Repair — ₹15,000\n• Hardware & Networking — ₹12,000\n• Linux Administrator — ₹10,000\n• Web Designing — ₹8,000\n• Desktop Publishing — ₹6,000\n• Tally ERP — ₹5,000\n\nPay via UPI, cards or net banking! 🎉', options: ['Admission Process', 'View Courses', 'Talk to Advisor'] },
  { patterns: ['admission', 'apply', 'enroll', 'join', 'register'], answer: '✅ Joining is simple!\n\n1️⃣ Browse courses at /courses\n2️⃣ Click Enroll Now\n3️⃣ Create free account\n4️⃣ Pay online via Razorpay\n5️⃣ Instant access!\n\nNew batches every month 📅', options: ['View Courses', 'Course Fees', 'Talk to Advisor'] },
  { patterns: ['certificate', 'verify', 'verification'], answer: '📜 Every ATEC certificate is:\n\n✅ Digitally signed\n✅ Employer-verifiable online\n✅ ISO 9001:2015 certified\n\nVerify at atecedu.com/verification', options: ['View Courses', 'Talk to Advisor'] },
  { patterns: ['contact', 'phone', 'call', 'address', 'location'], answer: '📞 Contact us:\n\n📱 +91 7009933289\n📧 atecgsp@gmail.com\n📍 Hardochanni Road, Gurdaspur 143521\n\n🕐 Mon–Sat, 9AM–6PM', options: ['Talk to Advisor', 'View Courses'] },
  { patterns: ['zoom', 'online', 'live', 'class', 'mode'], answer: '🎥 We offer 3 modes:\n\n• Online — 100% from home\n• Hybrid — Online theory + lab practicals\n• Classroom — In-person at Gurdaspur\n\nLive classes via Zoom!', options: ['View Courses', 'Admission Process'] },
  { patterns: ['placement', 'job', 'career', 'hire'], answer: '💼 100% Placement Support!\n\n✅ Dedicated placement cell\n✅ Resume & interview prep\n✅ 96% placement rate\n✅ 25 years of industry connections 🚀', options: ['View Courses', 'Talk to Advisor'] },
]

function getBotResponse(input: string) {
  const lower = input.toLowerCase()
  for (const faq of FAQ) {
    if (faq.patterns.some(p => lower.includes(p))) return { text: faq.answer, options: faq.options }
  }
  return { text: "I'm not sure, but our advisors can help! 😊\n\n• Call: +91 7009933289\n• WhatsApp us below\n• Browse /courses", options: ['View Courses', 'Talk to Advisor', 'Contact Us'] }
}

export default function FloatingChatbot() {
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const [showLead, setShowLead] = useState(false)
  const [leadForm, setLeadForm] = useState({ name: '', phone: '' })
  const [leadSent, setLeadSent] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConfig()
    // Show unread badge after 4s
    const t = setTimeout(() => { if (!open) setUnread(1) }, 4000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  async function loadConfig() {
    try {
      // Use window globals set by BaseLayout
      const url = (window as any).__SB_URL
      const key = (window as any).__SB_KEY
      if (!url || !key) return

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2' as any)
      const sb = createClient(url, key)
      const { data } = await sb.from('site_settings').select('value').eq('key', 'chatbot_config').single()
      if (data?.value) setConfig({ ...DEFAULT, ...data.value })
    } catch (e) {
      // Use defaults silently
    }
  }

  function openChat() {
    setOpen(true)
    setUnread(0)
    if (messages.length === 0) {
      setTimeout(() => {
        setMessages([{ id: '1', role: 'bot', text: config.greeting, options: config.quick_replies }])
      }, 300)
    }
  }

  function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg }
    setMessages(prev => [...prev, userMsg])

    if (msg === 'Talk to Advisor') { setShowLead(true); return }
    if (msg === 'View Courses') {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: '🎓 Opening courses page for you!', options: ['Course Fees', 'Admission Process'] }])
        setTimeout(() => window.open('/courses', '_blank'), 600)
      }, 700)
      return
    }
    if (msg === 'Contact Us') {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: '📞 +91 7009933289\n📧 atecgsp@gmail.com\n📍 Hardochanni Road, Gurdaspur', options: ['Talk to Advisor', 'View Courses'] }])
      }, 700)
      return
    }

    setTyping(true)
    const resp = getBotResponse(msg)
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: resp.text, options: resp.options }])
    }, 900 + Math.random() * 400)
  }

  async function submitLead() {
    if (!leadForm.name || !leadForm.phone) return
    try {
      const url = (window as any).__SB_URL
      const key = (window as any).__SB_KEY
      if (url && key) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2' as any)
        const sb = createClient(url, key)
        await sb.from('enquiries').insert({ name: leadForm.name, phone: leadForm.phone, message: 'Chat enquiry', course_interest: 'General' })
      }
    } catch (e) {}
    setLeadSent(true)
    setShowLead(false)
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: `Thanks ${leadForm.name}! 🎉\nOur advisor will call you at ${leadForm.phone} within 2 hours.`, options: ['View Courses'] }])
  }

  if (!config.is_enabled) return null

  const pc = config.primary_color
  const ac = config.accent_color

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{ position:'fixed', bottom:'90px', right:'20px', width:'330px', height:'500px', background:'#fff', borderRadius:'18px', boxShadow:'0 16px 48px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column', zIndex:9999, overflow:'hidden', border:'1px solid #e2e8f0', fontFamily:'Inter,sans-serif' }}>
          {/* Header */}
          <div style={{ background:pc, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:ac, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>{config.bot_avatar}</div>
              <div>
                <div style={{ fontWeight:'700', fontSize:'14px', color:'#fff' }}>{config.bot_name}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:'4px' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80', display:'inline-block' }}></span> Online
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'7px', padding:'5px 8px', cursor:'pointer', color:'#fff', fontSize:'15px' }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:'10px', background:'#f8fafc' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap:'6px' }}>
                <div style={{ maxWidth:'85%', padding:'10px 13px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? pc : '#fff', color: msg.role === 'user' ? '#fff' : '#1e293b', fontSize:'13px', lineHeight:'1.55', boxShadow:'0 1px 3px rgba(0,0,0,0.07)', border: msg.role === 'bot' ? '1px solid #e2e8f0' : 'none', whiteSpace:'pre-wrap' }}>
                  {msg.text}
                </div>
                {msg.options && msg.role === 'bot' && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', maxWidth:'90%' }}>
                    {msg.options.map(opt => (
                      <button key={opt} onClick={() => send(opt)} style={{ padding:'4px 11px', background:'#fff', color:pc, border:`1.5px solid ${pc}`, borderRadius:'20px', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px 12px 12px 4px', padding:'10px 14px', display:'flex', gap:'4px' }}>
                  {[0,1,2].map(i => <span key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#94a3b8', display:'inline-block', animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                </div>
              </div>
            )}

            {showLead && !leadSent && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px' }}>
                <div style={{ fontSize:'12px', fontWeight:'600', marginBottom:'8px', color:'#1e293b' }}>📋 Leave details for callback:</div>
                <input placeholder="Your name" value={leadForm.name} onChange={e => setLeadForm(p => ({...p, name:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:'7px', fontSize:'13px', marginBottom:'6px', outline:'none', boxSizing:'border-box' as const }} />
                <input placeholder="+91 phone" value={leadForm.phone} onChange={e => setLeadForm(p => ({...p, phone:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:'7px', fontSize:'13px', marginBottom:'8px', outline:'none', boxSizing:'border-box' as const }} />
                <button onClick={submitLead} style={{ width:'100%', padding:'8px', background:pc, color:'#fff', border:'none', borderRadius:'7px', fontWeight:'700', fontSize:'12px', cursor:'pointer' }}>Request Callback 📞</button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'10px', borderTop:'1px solid #e2e8f0', background:'#fff', flexShrink:0 }}>
            <div style={{ display:'flex', gap:'7px', marginBottom:'7px' }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..." style={{ flex:1, padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'20px', fontSize:'13px', outline:'none', fontFamily:'Inter,sans-serif' }} />
              <button onClick={() => send()} style={{ width:'34px', height:'34px', borderRadius:'50%', background:pc, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'14px', flexShrink:0 }}>➤</button>
            </div>
            <a href={`https://wa.me/${config.whatsapp_number.replace(/\D/g,'')}?text=Hi! I have a question about ATEC courses.`} target="_blank" rel="noopener" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'7px', background:'#dcfce7', color:'#166534', borderRadius:'8px', fontSize:'12px', fontWeight:'700', textDecoration:'none', border:'1px solid #bbf7d0' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button onClick={openChat} style={{ position:'fixed', bottom:'20px', right:'20px', width:'58px', height:'58px', borderRadius:'50%', background:pc, border:'none', cursor:'pointer', boxShadow:'0 6px 20px rgba(28,61,122,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9998 }} aria-label="Open chat">
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        }
        {!open && unread > 0 && (
          <div style={{ position:'absolute', top:'-3px', right:'-3px', width:'18px', height:'18px', borderRadius:'50%', background:'#ef4444', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'800', color:'#fff' }}>{unread}</div>
        )}
      </button>

      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </>
  )
}
