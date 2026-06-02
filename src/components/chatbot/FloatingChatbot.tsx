// src/components/chatbot/FloatingChatbot.tsx
// SELF-CONTAINED chatbot — zero dependencies, no Supabase, always works
// Loads config from window.__CHATBOT_CONFIG if set, otherwise uses hardcoded defaults

import { useState, useEffect, useRef } from 'react'

interface Msg {
  id: string
  from: 'bot' | 'user'
  text: string
  options?: string[]
}

const FAQ = [
  {
    q: ['course','courses','available','what'],
    a: '📚 We offer these courses:\n\n• Hardware & Networking — 24 weeks ₹12,000\n• Web Designing — 12 weeks ₹8,000\n• Tally ERP — 8 weeks ₹5,000\n• Linux Administrator — 16 weeks ₹10,000\n• Chip-Level Repair — 20 weeks ₹15,000\n• Desktop Publishing — 10 weeks ₹6,000\n\nAll include a verified certificate! 🎓',
    o: ['Course Fees','How to Enroll','Talk to Advisor']
  },
  {
    q: ['fee','fees','cost','price','how much','charges'],
    a: '💰 Our affordable fees:\n\n• Chip-Level Repair — ₹15,000\n• Hardware & Networking — ₹12,000\n• Linux Administrator — ₹10,000\n• Web Designing — ₹8,000\n• Desktop Publishing — ₹6,000\n• Tally ERP — ₹5,000',
    o: ['How to Enroll','View Courses','Talk to Advisor']
  },
  {
    q: ['enroll','admission','join','apply','register','how to'],
    a: '✅ 4 simple steps:\n\n1️⃣ Browse /courses\n2️⃣ Click Enroll Now\n3️⃣ Create free account\n4️⃣ Pay online — instant access!\n\nNew batches every month 📅',
    o: ['View Courses','Course Fees','Talk to Advisor']
  },
  {
    q: ['certificate','verify','verification','valid'],
    a: '📜 Every ATEC certificate:\n\n✅ Digitally signed\n✅ Employer-verifiable online\n✅ ISO 9001:2015 quality\n\nVerify at /verification',
    o: ['View Courses','Talk to Advisor']
  },
  {
    q: ['contact','phone','call','address','location','where'],
    a: '📞 Contact ATEC:\n\n📱 +91 7009933289\n📧 atecgsp@gmail.com\n📍 Hardochanni Road, Gurdaspur 143521\n\n🕐 Mon–Sat, 9AM–6PM',
    o: ['Talk to Advisor','View Courses']
  },
  {
    q: ['online','hybrid','zoom','live','class','mode'],
    a: '🎥 3 learning modes:\n\n• Online — 100% from home\n• Hybrid — Online + lab practicals\n• Classroom — In-person at Gurdaspur\n\nLive classes via Zoom!',
    o: ['View Courses','How to Enroll']
  },
  {
    q: ['placement','job','career','hire','work'],
    a: '💼 100% Placement Support!\n\n✅ Dedicated placement cell\n✅ Resume & interview prep\n✅ 96% placement rate\n✅ 25 years industry network 🚀',
    o: ['View Courses','Talk to Advisor']
  },
]

function getReply(text: string) {
  const t = text.toLowerCase()
  for (const f of FAQ) {
    if (f.q.some(k => t.includes(k))) return { a: f.a, o: f.o }
  }
  return {
    a: '🤔 I can help with:\n\n• Courses & fees\n• How to enroll\n• Certificate verification\n• Online/classroom modes\n• Placements\n• Contact info\n\nWhat would you like to know?',
    o: ['View Courses','Course Fees','How to Enroll','Talk to Advisor']
  }
}

export default function FloatingChatbot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const [showLead, setShowLead] = useState(false)
  const [lead, setLead] = useState({ name:'', phone:'' })
  const [leadOk, setLeadOk] = useState(false)
  const [mounted, setMounted] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Hardcoded defaults — no Supabase needed
  const defaultCfg = {
    is_enabled: true,
    bot_name: 'ATEC Assistant',
    bot_avatar: '🎓',
    greeting: 'Hi! 👋 Welcome to ATEC. How can I help you today?',
    whatsapp: '917009933289',
    primary: '#1c3d7a',
    accent: '#d4f01a',
    quick_replies: ['View Courses','Course Fees','How to Enroll','Verify Certificate','Talk to Advisor']
  }

  // Try to read config from window (set by BaseLayout if available)
  const [cfg, setCfg] = useState(defaultCfg)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const w = (window as any).__CHATBOT_CONFIG
      if (w && typeof w === 'object') {
        setCfg({ ...defaultCfg, ...w })
      }
    }
    const t = setTimeout(() => setUnread(1), 4000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, typing, open])

  function openChat() {
    setOpen(true)
    setUnread(0)
    if (msgs.length === 0) {
      setTimeout(() => addBot(cfg.greeting, cfg.quick_replies), 300)
    }
  }

  function addBot(text: string, options?: string[]) {
    setMsgs(p => [...p, { id: Date.now() + '_b', from: 'bot', text, options }])
  }
  function addUser(text: string) {
    setMsgs(p => [...p, { id: Date.now() + '_u', from: 'user', text }])
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
        addBot('🎓 Opening courses page...', ['Course Fees','How to Enroll'])
        setTimeout(() => window.open('/courses', '_blank'), 600)
      }, 600)
      return
    }

    if (msg === 'Verify Certificate') {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        addBot('📜 Opening certificate verification...', ['View Courses'])
        setTimeout(() => window.open('/verification', '_blank'), 600)
      }, 600)
      return
    }

    setTyping(true)
    const r = getReply(msg)
    setTimeout(() => {
      setTyping(false)
      addBot(r.a, r.o)
    }, 800)
  }

  function submitLead() {
    if (!lead.name || !lead.phone) return
    // Open WhatsApp with prefilled message — no Supabase needed
    const text = `Hi ATEC! My name is ${lead.name}, phone: ${lead.phone}. Please call me back about your courses.`
    window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`, '_blank')
    setLeadOk(true)
    setShowLead(false)
    setTimeout(() => addBot(`Thanks ${lead.name}! 🙏 We've opened WhatsApp for you. An advisor will call you back shortly.`, ['View Courses','Course Fees']), 400)
  }

  // Don't render on server (hydration safety)
  if (!mounted) return null

  const pc = cfg.primary || '#1c3d7a'
  const wa = (cfg.whatsapp || '917009933289').replace(/\D/g, '')

  return (
    <>
      {open && (
        <div style={{ position:'fixed', bottom:'88px', right:'20px', width:'350px', maxWidth:'calc(100vw - 40px)', height:'520px', maxHeight:'calc(100vh - 110px)', background:'#fff', borderRadius:'16px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', display:'flex', flexDirection:'column', zIndex:99999, overflow:'hidden', fontFamily:'Inter,sans-serif' }}>

          {/* Header */}
          <div style={{ background:pc, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
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
                <input value={lead.name} onChange={e => setLead(p => ({...p, name:e.target.value}))} placeholder="Your name" style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:'7px', fontSize:'13px', marginBottom:'6px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }} />
                <input value={lead.phone} onChange={e => setLead(p => ({...p, phone:e.target.value}))} placeholder="+91 phone number" style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:'7px', fontSize:'13px', marginBottom:'8px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }} />
                <button onClick={submitLead} style={{ width:'100%', padding:'8px', background:pc, color:'#fff', border:'none', borderRadius:'7px', fontWeight:'700', fontSize:'12px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                  Request Callback 📞
                </button>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
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
              rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'7px', background:'#dcfce7', color:'#166534', borderRadius:'8px', fontSize:'12px', fontWeight:'700', textDecoration:'none', border:'1px solid #bbf7d0' }}
            >
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openChat}
        aria-label="Open chat"
        style={{ position:'fixed', bottom:'20px', right:'20px', width:'58px', height:'58px', borderRadius:'50%', background:pc, border:'none', cursor:'pointer', boxShadow:'0 6px 24px rgba(28,61,122,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99998, transition:'transform 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        }
        {!open && unread > 0 && (
          <div style={{ position:'absolute', top:'-2px', right:'-2px', width:'18px', height:'18px', borderRadius:'50%', background:'#ef4444', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'800', color:'#fff' }}>
            {unread}
          </div>
        )}
      </button>

      <style>{`@keyframes cb-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </>
  )
}
