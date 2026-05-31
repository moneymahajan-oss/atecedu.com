// src/components/chatbot/FloatingChatbot.tsx
// REWRITTEN: Zero Supabase dependency - works immediately on every page
// Config is read from window.__CHATBOT_CONFIG set by BaseLayout at build time

import { useState, useEffect, useRef } from 'react'

interface Msg {
  id: string
  from: 'bot' | 'user'
  text: string
  options?: string[]
}

const FAQ = [
  {
    q: ['course', 'courses', 'available', 'what'],
    a: '📚 We offer these courses:\n\n• Hardware & Networking — 24 weeks ₹12,000\n• Web Designing — 12 weeks ₹8,000\n• Tally ERP 9/Prime — 8 weeks ₹5,000\n• Linux Administrator — 16 weeks ₹10,000\n• Chip-Level Repair — 20 weeks ₹15,000\n• Desktop Publishing — 10 weeks ₹6,000\n\nAll include a verified certificate! 🎓',
    o: ['Course Fees', 'How to Enroll', 'Talk to Advisor']
  },
  {
    q: ['fee', 'fees', 'cost', 'price', 'how much', 'charges'],
    a: '💰 Our affordable fees:\n\n• Chip-Level Repair — ₹15,000\n• Hardware & Networking — ₹12,000\n• Linux Administrator — ₹10,000\n• Web Designing — ₹8,000\n• Desktop Publishing — ₹6,000\n• Tally ERP — ₹5,000\n\nPay via UPI, cards or net banking!',
    o: ['How to Enroll', 'View Courses', 'Talk to Advisor']
  },
  {
    q: ['enroll', 'admission', 'join', 'apply', 'register', 'how to'],
    a: '✅ 4 simple steps:\n\n1️⃣ Browse /courses\n2️⃣ Click Enroll Now\n3️⃣ Create free account\n4️⃣ Pay online — instant access!\n\nNew batches every month 📅',
    o: ['View Courses', 'Course Fees', 'Talk to Advisor']
  },
  {
    q: ['certificate', 'verify', 'verification', 'valid'],
    a: '📜 Every ATEC certificate:\n\n✅ Digitally signed\n✅ Employer-verifiable online\n✅ ISO 9001:2015 quality\n\nVerify at /verification',
    o: ['View Courses', 'Talk to Advisor']
  },
  {
    q: ['contact', 'phone', 'call', 'address', 'location', 'where'],
    a: '📞 Contact ATEC:\n\n📱 +91 7009933289\n📧 atecgsp@gmail.com\n📍 Hardochanni Road, Gurdaspur 143521\n\n🕐 Mon–Sat, 9AM–6PM',
    o: ['Talk to Advisor', 'View Courses']
  },
  {
    q: ['online', 'hybrid', 'zoom', 'live', 'class', 'mode'],
    a: '🎥 3 learning modes:\n\n• Online — 100% from home\n• Hybrid — Online + lab practicals\n• Classroom — In-person at Gurdaspur\n\nLive classes via Zoom!',
    o: ['View Courses', 'How to Enroll']
  },
  {
    q: ['placement', 'job', 'career', 'hire', 'work'],
    a: '💼 100% Placement Support!\n\n✅ Dedicated placement cell\n✅ Resume & interview prep\n✅ 96% placement rate\n✅ 25 years industry network 🚀',
    o: ['View Courses', 'Talk to Advisor']
  },
]

function getReply(input: string): { a: string; o?: string[] } {
  const low = input.toLowerCase()
  for (const f of FAQ) {
    if (f.q.some(w => low.includes(w))) return { a: f.a, o: f.o }
  }
  return {
    a: "I'm not sure about that, but our advisors can help! 😊\n\n📱 Call: +91 7009933289\n💬 WhatsApp us below",
    o: ['View Courses', 'Talk to Advisor', 'Contact Us']
  }
}

export default function FloatingChatbot() {
  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const [unread, setUnread]   = useState(0)
  const [showLead, setShowLead] = useState(false)
  const [lead, setLead]       = useState({ name: '', phone: '' })
  const [leadOk, setLeadOk]   = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Config from window (set by BaseLayout) — with fallback defaults
  const cfg = typeof window !== 'undefined' && (window as any).__CHATBOT_CONFIG
    ? (window as any).__CHATBOT_CONFIG
    : {
        is_enabled: true,
        bot_name: 'ATEC Assistant',
        bot_avatar: '🎓',
        greeting: 'Hi! 👋 Welcome to ATEC. How can I help you today?',
        whatsapp: '+917009933289',
        primary: '#1c3d7a',
        accent: '#d4f01a',
        quick_replies: ['View Courses', 'Course Fees', 'How to Enroll', 'Verify Certificate', 'Talk to Advisor']
      }

  useEffect(() => {
    if (!cfg.is_enabled) return
    const t = setTimeout(() => { if (!open) setUnread(1) }, 4000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, typing])

  function openChat() {
    setOpen(true)
    setUnread(0)
    if (msgs.length === 0) {
      setTimeout(() => addBot(cfg.greeting, cfg.quick_replies), 300)
    }
  }

  function addBot(text: string, options?: string[]) {
    setMsgs(p => [...p, { id: Date.now() + '', from: 'bot', text, options }])
  }

  function addUser(text: string) {
    setMsgs(p => [...p, { id: Date.now() + '', from: 'user', text }])
  }

  function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')
    addUser(msg)

    if (msg === 'Talk to Advisor') { setShowLead(true); return }

    if (msg === 'View Courses') {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        addBot('🎓 Opening courses page...', ['Course Fees', 'How to Enroll'])
        setTimeout(() => { window.open('/courses', '_blank') }, 600)
      }, 600)
      return
    }

    if (msg === 'Contact Us') {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        addBot('📞 +91 7009933289\n📧 atecgsp@gmail.com\n📍 Hardochanni Road, Gurdaspur', ['Talk to Advisor'])
      }, 600)
      return
    }

    setTyping(true)
    const r = getReply(msg)
    setTimeout(() => {
      setTyping(false)
      addBot(r.a, r.o)
    }, 800 + Math.random() * 400)
  }

  async function submitLead() {
    if (!lead.name || !lead.phone) return
    // Try saving to Supabase if available
    try {
      const url = (window as any).__SB_URL
      const key = (window as any).__SB_KEY
      if (url && key) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2' as any)
        const sb = createClient(url, key)
        await sb.from('enquiries').insert({ name: lead.name, phone: lead.phone, message: 'Chat enquiry', course_interest: 'General' })
      }
    } catch (e) { /* silent fail */ }
    setLeadOk(true)
    setShowLead(false)
    addBot(`Thanks ${lead.name}! 🎉\nOur advisor will call you at ${lead.phone} within 2 hours!`, ['View Courses'])
  }

  if (cfg.is_enabled === false) return null

  const pc = cfg.primary
  const wa = cfg.whatsapp?.replace(/\D/g, '') || '917009933289'

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{ position:'fixed', bottom:'88px', right:'20px', width:'320px', height:'490px', background:'#fff', borderRadius:'16px', boxShadow:'0 12px 40px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', zIndex:99999, overflow:'hidden', border:'1px solid #e2e8f0', fontFamily:'Inter,sans-serif' }}>

          {/* Header */}
          <div style={{ background:pc, padding:'13px 15px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'9px' }}>
              <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:cfg.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                {cfg.bot_avatar}
              </div>
              <div>
                <div style={{ fontWeight:'700', fontSize:'13px', color:'#fff' }}>{cfg.bot_name}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:'4px' }}>
                  <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#4ade80', display:'inline-block' }} />
                  Online now
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', color:'#fff', fontSize:'14px', lineHeight:1 }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'9px', background:'#f8fafc' }}>
            {msgs.map(m => (
              <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: m.from === 'user' ? 'flex-end' : 'flex-start', gap:'5px' }}>
                <div style={{ maxWidth:'86%', padding:'9px 12px', borderRadius: m.from === 'user' ? '13px 13px 3px 13px' : '13px 13px 13px 3px', background: m.from === 'user' ? pc : '#fff', color: m.from === 'user' ? '#fff' : '#1e293b', fontSize:'13px', lineHeight:'1.5', border: m.from === 'bot' ? '1px solid #e2e8f0' : 'none', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {m.text}
                </div>
                {m.options && m.from === 'bot' && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', maxWidth:'90%' }}>
                    {m.options.map(o => (
                      <button key={o} onClick={() => send(o)} style={{ padding:'4px 10px', background:'#fff', color:pc, border:`1.5px solid ${pc}`, borderRadius:'20px', fontSize:'11px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div style={{ display:'flex', gap:'4px', padding:'10px 12px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'13px 13px 13px 3px', width:'fit-content' }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#94a3b8', display:'inline-block', animation:`cb-bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            )}

            {showLead && !leadOk && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px' }}>
                <p style={{ fontSize:'12px', fontWeight:'600', marginBottom:'8px', color:'#1e293b' }}>📋 We'll call you back:</p>
                <input value={lead.name} onChange={e => setLead(p => ({...p, name:e.target.value}))} placeholder="Your name" style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:'7px', fontSize:'13px', marginBottom:'6px', outline:'none', boxSizing:'border-box' as const, fontFamily:'Inter,sans-serif' }} />
                <input value={lead.phone} onChange={e => setLead(p => ({...p, phone:e.target.value}))} placeholder="+91 phone number" style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:'7px', fontSize:'13px', marginBottom:'8px', outline:'none', boxSizing:'border-box' as const, fontFamily:'Inter,sans-serif' }} />
                <button onClick={submitLead} style={{ width:'100%', padding:'8px', background:pc, color:'#fff', border:'none', borderRadius:'7px', fontWeight:'700', fontSize:'12px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                  Request Callback 📞
                </button>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input row */}
          <div style={{ padding:'10px', borderTop:'1px solid #e2e8f0', background:'#fff', flexShrink:0 }}>
            <div style={{ display:'flex', gap:'7px', marginBottom:'7px' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Type a message..."
                style={{ flex:1, padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'20px', fontSize:'13px', outline:'none', fontFamily:'Inter,sans-serif' }}
              />
              <button onClick={() => send()} style={{ width:'33px', height:'33px', borderRadius:'50%', background:pc, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'14px', flexShrink:0 }}>
                ➤
              </button>
            </div>
            <a
              href={`https://wa.me/${wa}?text=Hi! I have a question about ATEC courses.`}
              target="_blank"
              rel="noopener"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'7px', background:'#dcfce7', color:'#166534', borderRadius:'8px', fontSize:'12px', fontWeight:'700', textDecoration:'none', border:'1px solid #bbf7d0' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={openChat}
        aria-label="Open chat"
        style={{ position:'fixed', bottom:'20px', right:'20px', width:'56px', height:'56px', borderRadius:'50%', background:pc, border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(28,61,122,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99998 }}
      >
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        }
        {!open && unread > 0 && (
          <div style={{ position:'absolute', top:'-2px', right:'-2px', width:'17px', height:'17px', borderRadius:'50%', background:'#ef4444', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:'800', color:'#fff' }}>
            {unread}
          </div>
        )}
      </button>

      <style>{`@keyframes cb-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </>
  )
}
