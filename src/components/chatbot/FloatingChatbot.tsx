// src/components/chatbot/FloatingChatbot.tsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface Message {
  id: string
  role: 'bot' | 'user'
  text: string
  options?: string[]
  timestamp: Date
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

const DEFAULT_CONFIG: ChatbotConfig = {
  is_enabled: true,
  greeting: 'Hi! 👋 Welcome to ATEC Educational Society. How can I help you today?',
  bot_name: 'ATEC Assistant',
  bot_avatar: '🎓',
  whatsapp_number: '+917009933289',
  primary_color: '#1c3d7a',
  accent_color: '#d4f01a',
  quick_replies: [
    'View Courses',
    'Course Fees',
    'Admission Process',
    'Verify Certificate',
    'Contact Us',
    'Talk to Advisor',
  ],
}

// FAQ knowledge base
const FAQ: { patterns: string[]; answer: string; options?: string[] }[] = [
  {
    patterns: ['course', 'courses', 'offer', 'available', 'what course'],
    answer: '📚 We offer the following courses:\n\n• Hardware & Networking (24 weeks, ₹12,000)\n• Web Designing (12 weeks, ₹8,000)\n• Tally ERP 9 / Prime (8 weeks, ₹5,000)\n• Linux Administrator (16 weeks, ₹10,000)\n• Chip-Level Repair (20 weeks, ₹15,000)\n• Desktop Publishing (10 weeks, ₹6,000)\n\nAll courses include a verified certificate! 🎓',
    options: ['Course Fees', 'Admission Process', 'Talk to Advisor'],
  },
  {
    patterns: ['fee', 'fees', 'cost', 'price', 'how much', 'charges'],
    answer: '💰 Our course fees are very affordable:\n\n• Chip-Level Repair: ₹15,000\n• Hardware & Networking: ₹12,000\n• Linux Administrator: ₹10,000\n• Web Designing: ₹8,000\n• Desktop Publishing: ₹6,000\n• Tally ERP: ₹5,000\n\nWe accept UPI, cards, and net banking via Razorpay! 🎉',
    options: ['Admission Process', 'View Courses', 'Talk to Advisor'],
  },
  {
    patterns: ['admission', 'apply', 'enroll', 'join', 'how to', 'register'],
    answer: '✅ Joining ATEC is simple!\n\n1️⃣ Browse our courses at /courses\n2️⃣ Click "Enroll Now"\n3️⃣ Create a free student account\n4️⃣ Pay online via Razorpay\n5️⃣ Get instant access to your course!\n\nNew batches start every month 📅',
    options: ['View Courses', 'Course Fees', 'Talk to Advisor'],
  },
  {
    patterns: ['certificate', 'verify', 'verification', 'valid'],
    answer: '📜 Every ATEC certificate is:\n\n✅ Digitally signed & tamper-proof\n✅ Instantly verifiable by employers online\n✅ ISO 9001:2015 certified quality\n\nVerify any certificate at atecedu.com/verification',
    options: ['View Courses', 'Talk to Advisor'],
  },
  {
    patterns: ['contact', 'phone', 'call', 'number', 'address', 'location', 'gurdaspur'],
    answer: '📞 Contact ATEC Educational Society:\n\n📱 Phone: +91 7009933289\n📧 Email: atecgsp@gmail.com\n📍 Hardochanni Road, Gurdaspur 143521, Punjab\n\n🕐 Monday to Saturday, 9 AM – 6 PM',
    options: ['Talk to Advisor', 'View Courses'],
  },
  {
    patterns: ['online', 'hybrid', 'mode', 'learn', 'how class', 'zoom'],
    answer: '🖥️ We offer flexible learning modes:\n\n• **Online**: 100% virtual, learn from home\n• **Hybrid**: Theory online + Lab practicals at Gurdaspur\n• **Classroom**: In-person at our centre\n\nLive classes are conducted via Zoom 🎥',
    options: ['View Courses', 'Admission Process'],
  },
  {
    patterns: ['placement', 'job', 'career', 'hire', 'work'],
    answer: '💼 ATEC provides 100% placement support!\n\n✅ Dedicated placement cell\n✅ Resume building assistance\n✅ Mock interviews\n✅ Industry connections built over 25 years\n\n96% of our trained students get placed! 🚀',
    options: ['View Courses', 'Talk to Advisor'],
  },
]

function getBotResponse(input: string): { text: string; options?: string[] } {
  const lower = input.toLowerCase()
  for (const faq of FAQ) {
    if (faq.patterns.some(p => lower.includes(p))) {
      return { text: faq.answer, options: faq.options }
    }
  }
  return {
    text: "I'm not sure about that, but our advisors can help! 😊 You can:\n\n• Call us: +91 7009933289\n• WhatsApp us for instant reply\n• Browse our courses at /courses",
    options: ['View Courses', 'Talk to Advisor', 'Contact Us'],
  }
}

export default function FloatingChatbot() {
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CONFIG)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [leadForm, setLeadForm] = useState({ name: '', phone: '' })
  const [showLeadForm, setShowLeadForm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConfig()
    // Show greeting after 3 seconds
    const t = setTimeout(() => {
      if (!open) setUnread(1)
    }, 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  async function loadConfig() {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'chatbot_config').single()
    if (data?.value) setConfig({ ...DEFAULT_CONFIG, ...(data.value as ChatbotConfig) })
  }

  function openChat() {
    setOpen(true)
    setUnread(0)
    if (messages.length === 0) {
      setTimeout(() => {
        addBotMessage(config.greeting, config.quick_replies)
      }, 400)
    }
  }

  function addBotMessage(text: string, options?: string[]) {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'bot',
      text,
      options,
      timestamp: new Date(),
    }])
  }

  function addUserMessage(text: string) {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    }])
  }

  function handleSend(text?: string) {
    const msg = text ?? input.trim()
    if (!msg) return
    setInput('')

    if (msg === 'Talk to Advisor') {
      addUserMessage(msg)
      setShowLeadForm(true)
      return
    }
    if (msg === 'View Courses') {
      addUserMessage(msg)
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        addBotMessage('🎓 Visit our courses page to see all available courses with fees and details!', ['Course Fees', 'Admission Process'])
        setTimeout(() => window.open('/courses', '_blank'), 800)
      }, 800)
      return
    }
    if (msg === 'Contact Us') {
      addUserMessage(msg)
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        addBotMessage('📞 You can reach us at:\n\n+91 7009933289\natecgsp@gmail.com\n\nHardochanni Road, Gurdaspur', ['Talk to Advisor', 'View Courses'])
      }, 800)
      return
    }

    addUserMessage(msg)
    setTyping(true)
    const response = getBotResponse(msg)
    setTimeout(() => {
      setTyping(false)
      addBotMessage(response.text, response.options)
    }, 1000 + Math.random() * 500)
  }

  async function submitLead() {
    if (!leadForm.name || !leadForm.phone) return
    await supabase.from('enquiries').insert({
      name: leadForm.name,
      phone: leadForm.phone,
      message: 'Chat enquiry — requested to talk to advisor',
      course_interest: 'General',
    })
    setLeadCaptured(true)
    setShowLeadForm(false)
    addBotMessage(`Thanks ${leadForm.name}! 🎉\n\nOur advisor will call you at ${leadForm.phone} within 2 hours.\n\nYou can also WhatsApp us directly for instant response!`, ['View Courses'])
  }

  if (!config.is_enabled) return null

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '90px', right: '20px',
          width: '340px', height: '520px',
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          zIndex: 9999, overflow: 'hidden',
          border: '1px solid #e2e8f0',
          fontFamily: 'Inter, sans-serif',
        }}>
          {/* Header */}
          <div style={{ background: config.primary_color, padding: '16px 16px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: config.accent_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {config.bot_avatar}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>{config.bot_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                    Online · Typically replies in minutes
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#fff', fontSize: '16px' }}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '6px' }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? config.primary_color : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  fontSize: '13px', lineHeight: '1.55',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: msg.role === 'bot' ? '1px solid #e2e8f0' : 'none',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>
                {/* Quick reply options */}
                {msg.options && msg.role === 'bot' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '90%' }}>
                    {msg.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleSend(opt)}
                        style={{
                          padding: '5px 12px',
                          background: '#fff', color: config.primary_color,
                          border: `1.5px solid ${config.primary_color}`,
                          borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = config.primary_color; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = config.primary_color }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', display: 'flex', gap: '4px' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Lead form */}
            {showLeadForm && !leadCaptured && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#1e293b' }}>
                  📋 Leave your details and we'll call you back:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text" placeholder="Your name" value={leadForm.name}
                    onChange={e => setLeadForm(p => ({ ...p, name: e.target.value }))}
                    style={inputStyle}
                  />
                  <input
                    type="tel" placeholder="+91 phone number" value={leadForm.phone}
                    onChange={e => setLeadForm(p => ({ ...p, phone: e.target.value }))}
                    style={inputStyle}
                  />
                  <button
                    onClick={submitLead}
                    style={{ padding: '9px', background: config.primary_color, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Request Callback 📞
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text" value={input} placeholder="Type your message..."
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                style={{ ...inputStyle, borderRadius: '20px', padding: '9px 14px' }}
              />
              <button
                onClick={() => handleSend()}
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: config.primary_color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px' }}
              >
                ➤
              </button>
            </div>
            {/* WhatsApp button */}
            <a
              href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}?text=Hi! I have a question about ATEC courses.`}
              target="_blank" rel="noopener"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px', background: '#dcfce7', color: '#166534', borderRadius: '10px', fontSize: '12px', fontWeight: '700', textDecoration: 'none', border: '1px solid #bbf7d0' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={openChat}
        style={{
          position: 'fixed', bottom: '20px', right: '20px',
          width: '60px', height: '60px', borderRadius: '50%',
          background: config.primary_color,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(28,61,122,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9998, transition: 'all 0.3s',
          animation: open ? 'none' : 'chatPulse 2.5s ease-in-out infinite',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        aria-label="Open chat"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        )}
        {!open && unread > 0 && (
          <div style={{
            position: 'absolute', top: '-3px', right: '-3px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#ef4444', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '800', color: '#fff',
          }}>
            {unread}
          </div>
        )}
      </button>

      <style>{`
        @keyframes chatPulse {
          0%,100%{box-shadow:0 8px 25px rgba(28,61,122,0.4)}
          50%{box-shadow:0 8px 35px rgba(28,61,122,0.7),0 0 0 8px rgba(28,61,122,0.1)}
        }
        @keyframes bounce {
          0%,80%,100%{transform:translateY(0)}
          40%{transform:translateY(-6px)}
        }
        @media(max-width:480px){
          div[style*="width: 340px"]{width:calc(100vw - 24px)!important;right:12px!important}
        }
      `}</style>
    </>
  )
}
