// src/components/home/HomepageDynamic.tsx
// This React island fetches ALL dynamic homepage content directly from Supabase
// at runtime in the browser — no rebuild needed when admin changes data.

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const FALLBACK_STATS = [
  { value: '25+', label: 'Years of Excellence' },
  { value: '5000+', label: 'Students Trained' },
  { value: '15+', label: 'Courses Offered' },
  { value: '100%', label: 'Placement Support' },
]
const FALLBACK_INSTRUCTORS = [
  { id:'1', name:'Rajinder Singh',  designation:'Hardware & Networking Expert' },
  { id:'2', name:'Gurpreet Kaur',   designation:'Web Design Instructor' },
  { id:'3', name:'Sukhwinder Mann', designation:'Chip-Level Repair Specialist' },
  { id:'4', name:'Harpreet Singh',  designation:'Tally & Accounting Trainer' },
  { id:'5', name:'Mandeep Kaur',    designation:'Linux Administrator Trainer' },
  { id:'6', name:'Davinder Singh',  designation:'Desktop Publishing Expert' },
]
const FALLBACK_TESTIMONIALS = [
  { id:'1', student_name:'Amrit Singh',    course:'Hardware & Networking', review:'ATEC completely changed my life. I got placed at a Chandigarh IT company within 3 months of completing my course.', rating:5, company_placed:'IT Firm, Chandigarh' },
  { id:'2', student_name:'Priya Sharma',   course:'Web Designing',         review:'The best decision I made was joining ATEC. The instructors are excellent and the practical training is world-class.', rating:5, company_placed:null },
  { id:'3', student_name:'Gurjot Kaur',    course:'Tally ERP 9',           review:'I now run my own accounts office. The ATEC certificate is recognized by employers everywhere.', rating:5, company_placed:'Own Business' },
  { id:'4', student_name:'Ranjit Kumar',   course:'Chip-Level Repair',     review:'I earn 3x what I used to before ATEC. Chip-level repair skills are extremely valuable in the market.', rating:5, company_placed:'Laptop Repair Shop, Amritsar' },
  { id:'5', student_name:'Simran Bajwa',   course:'Linux Administrator',   review:'Got a government IT job. The ATEC Linux certificate was specifically required.', rating:5, company_placed:'Govt. Department, Punjab' },
  { id:'6', student_name:'Harjinder Gill', course:'Desktop Publishing',    review:'Started my own DTP studio right after graduating. ATEC gave me everything I needed.', rating:5, company_placed:'Own DTP Studio' },
]
const FALLBACK_CENTRES = [
  { id:'1', name:'ATEC Gurdaspur — Main Centre', city:'Gurdaspur', state:'Punjab', address:'Hardochanni Road, Near Bus Stand, Gurdaspur 143521', phone:'+91 7009933289', email:'atecgsp@gmail.com', map_url:'https://maps.google.com/?q=Gurdaspur+Punjab' },
]
const FALLBACK_NEWS = [
  { id:'1', title:'ATEC Celebrates 25 Years of Excellence in Computer Education', source:'Punjab Tribune', url:'#', published_date:'2025-01-15' },
  { id:'2', title:'100% Placement Record: ATEC Students Hired Across Punjab IT Sector', source:'Dainik Bhaskar', url:'#', published_date:'2025-03-20' },
  { id:'3', title:'ISO 9001:2015 Certified: ATEC Sets New Standard for Computer Training', source:'Tribune India', url:'#', published_date:'2024-11-10' },
  { id:'4', title:'ATEC Launches New Online & Hybrid Course Mode for Remote Students', source:'India Education Diary', url:'#', published_date:'2024-09-05' },
]
const CAT_COLORS: Record<string, string> = {
  hardware:'#dbeafe', networking:'#dcfce7', web:'#fef9c3',
  accounting:'#fce7f3', linux:'#e0e7ff', repair:'#fff7ed', design:'#f0fdf4',
}

export default function HomepageDynamic() {
  const [courses, setCourses]           = useState<any[]>([])
  const [instructors, setInstructors]   = useState<any[]>(FALLBACK_INSTRUCTORS)
  const [testimonials, setTestimonials] = useState<any[]>(FALLBACK_TESTIMONIALS)
  const [centres, setCentres]           = useState<any[]>(FALLBACK_CENTRES)
  const [news, setNews]                 = useState<any[]>(FALLBACK_NEWS)
  const [hero, setHero]                 = useState<any>(null)
  const [stats, setStats]               = useState(FALLBACK_STATS)
  const [activeFilter, setActiveFilter] = useState('all')
  const [slideIdx, setSlideIdx]         = useState(0)
  const [studentPhotos, setStudentPhotos] = useState<any[]>([])

  useEffect(() => {
    const url = (window as any).__SB_URL
    const key = (window as any).__SB_KEY
    if (!url || !key) return
    const sb = createClient(url, key)

    // All fetches fire in parallel — page shows fallbacks instantly, then updates
    Promise.allSettled([
      sb.from('courses').select('id,title,slug,mode,duration_weeks,fee_inr,original_fee_inr,thumbnail_url,short_description,is_featured,category,rating,total_enrolled').eq('is_active',true).order('is_featured',{ascending:false}).order('sort_order').limit(8).then(({data})=>{ if(data?.length) setCourses(data) }),
      sb.from('instructors').select('*').eq('is_active',true).order('sort_order').then(({data})=>{ if(data?.length) setInstructors(data) }),
      sb.from('testimonials').select('*').eq('is_active',true).order('created_at',{ascending:false}).limit(6).then(({data})=>{ if(data?.length) setTestimonials(data) }),
      sb.from('centres').select('*').eq('is_active',true).order('sort_order').then(({data})=>{ if(data?.length) setCentres(data) }),
      sb.from('news_items').select('*').eq('is_active',true).order('sort_order').limit(4).then(({data})=>{ if(data?.length) setNews(data) }),
      sb.from('student_photos').select('*').eq('is_active',true).order('sort_order').limit(12).then(({data})=>{ if(data?.length) setStudentPhotos(data) }),
      sb.from('site_settings').select('value').eq('key','hero').single().then(({data})=>{
        if(data?.value) {
          setHero(data.value)
          if(data.value.stats?.length) setStats(data.value.stats)
        }
      }),
    ])
  }, [])

  // Auto-advance student slider
  useEffect(() => {
    if (studentPhotos.length < 2) return
    const t = setInterval(() => setSlideIdx(i => (i + 1) % Math.max(1, studentPhotos.length - 2)), 3000)
    return () => clearInterval(t)
  }, [studentPhotos])

  const filteredCourses = activeFilter === 'all' ? courses : courses.filter(c => c.mode === activeFilter)
  const marqueeItems = [...instructors, ...instructors]

  return (
    <>
      {/* ── STATS BAR ───────────────────────────────────────── */}
      <div className="stats-bar-section">
        <div className="container">
          <div className="stats-bar">
            {stats.map((s: any, i: number) => (
              <div key={i} className="stats-item">
                <span className="stats-num">{s.value}</span>
                <span className="stats-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HERO DYNAMIC CONTENT ────────────────────────────── */}
      {hero && (
        <div id="hero-dynamic" style={{display:'none'}} data-heading={hero.heading} data-sub={hero.subheading} data-ytid={hero.youtube_video_id||''} />
      )}

      {/* ── COURSES ─────────────────────────────────────────── */}
      <section className="section" id="courses">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-label">Our Courses</p>
              <h2>Learn At Your Own Pace</h2>
              <p className="section-desc">Online, hybrid & classroom courses designed for real-world jobs</p>
            </div>
            <a href="/courses" className="btn btn-outline btn-sm">View All Courses →</a>
          </div>
          <div className="course-filters">
            {['all','online','hybrid','classroom'].map(m => (
              <button key={m} className={`filter-btn${activeFilter===m?' active':''}`} onClick={() => setActiveFilter(m)}>
                {m.charAt(0).toUpperCase()+m.slice(1)}
              </button>
            ))}
          </div>
          {courses.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px 0',color:'var(--text-muted)'}}>
              <div style={{fontSize:'48px',marginBottom:'16px'}}>📚</div>
              <p>Courses will appear here once added from the Admin panel.</p>
              <a href="/admin/courses" className="btn btn-outline btn-sm" style={{marginTop:'16px',display:'inline-flex'}}>Add Courses →</a>
            </div>
          ) : (
            <div className="courses-grid">
              {filteredCourses.map((course: any) => (
                <a key={course.id} href={`/courses/${course.slug}`} className="course-card">
                  <div className="thumb">
                    {course.thumbnail_url
                      ? <img src={course.thumbnail_url} alt={course.title} loading="lazy" />
                      : <div className="thumb-placeholder" style={{background: CAT_COLORS[course.category??'']??'#dbeafe'}}>
                          <span style={{fontSize:'40px'}}>
                            {course.category==='hardware'?'🖥️':course.category==='web'?'🌐':course.category==='accounting'?'📊':course.category==='repair'?'🔧':course.category==='linux'?'🐧':course.category==='design'?'🎨':'📚'}
                          </span>
                        </div>
                    }
                    <span className={`card-mode-badge badge-${course.mode}`}>{course.mode}</span>
                  </div>
                  <div className="body">
                    <h3 className="title">{course.title}</h3>
                    {course.short_description && <p className="card-desc">{course.short_description}</p>}
                    <div className="card-meta">
                      <span>⏱ {course.duration_weeks}w</span>
                      {course.rating && <span style={{color:'#f59e0b'}}>★ {course.rating}</span>}
                      {course.total_enrolled > 0 && <span>{course.total_enrolled.toLocaleString('en-IN')} enrolled</span>}
                    </div>
                    <div className="price-row">
                      <span className="price">₹{course.fee_inr?.toLocaleString('en-IN')}</span>
                      {course.original_fee_inr && <span className="price-old">₹{course.original_fee_inr?.toLocaleString('en-IN')}</span>}
                      {course.original_fee_inr && course.fee_inr && (
                        <span className="discount-pct">{Math.round((1-course.fee_inr/course.original_fee_inr)*100)}% off</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── INSTRUCTOR MARQUEE ──────────────────────────────── */}
      <section className="marquee-section section-sm">
        <div className="container">
          <p className="section-label">Our Instructors</p>
          <h2 style={{marginBottom:'32px'}}>Learn From Experienced Professionals</h2>
        </div>
        <div className="marquee-wrapper">
          <div className="marquee-track">
            {marqueeItems.map((inst: any, i: number) => (
              <div key={`${inst.id}-${i}`} className="instructor-card">
                <div className="avatar">
                  {inst.photo_url
                    ? <img src={inst.photo_url} alt={inst.name} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                    : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--navy)',color:'var(--lemon)',fontFamily:'var(--font-display)',fontWeight:'700',fontSize:'18px'}}>{inst.name[0]}</div>
                  }
                </div>
                <div>
                  <div className="name">{inst.name}</div>
                  <div className="role">{inst.designation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUCCESS + STUDENT PHOTOS ────────────────────────── */}
      <section className="success-section">
        <div className="container">
          <div className="success-inner">
            <div className="success-text">
              <p className="section-label" style={{color:'rgba(255,255,255,0.7)'}}>Placement Record</p>
              <h2 style={{color:'#fff'}}>In skill-first hiring,<br/> results speak louder</h2>
              <p style={{color:'rgba(255,255,255,0.65)'}}>Our students have been placed in companies across India. Proof matters more than promises.</p>
            </div>
            <div className="success-stats">
              {[{value:'96%',label:'Placement rate'},{value:'5,000+',label:'Students trained'},{value:'25+',label:'Years of excellence'},{value:'100%',label:'Placement assistance'}].map((s,i)=>(
                <div key={i} className="success-stat-item">
                  <span className="success-num">{s.value}</span>
                  <span className="success-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          {studentPhotos.length > 0 && (
            <div className="student-slider-wrap">
              <div className="student-slider">
                <div className="student-track" style={{transform:`translateX(-${slideIdx*236}px)`}}>
                  {studentPhotos.map((p:any) => (
                    <div key={p.id} className="student-slide">
                      <img src={p.photo_url} alt={p.student_name??'ATEC student'} loading="lazy" />
                      {p.student_name && <div className="slide-caption">{p.student_name}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="slider-controls">
                <button className="slider-btn" onClick={()=>setSlideIdx(i=>Math.max(0,i-1))} aria-label="Previous">‹</button>
                <button className="slider-btn" onClick={()=>setSlideIdx(i=>Math.min(studentPhotos.length-3,i+1))} aria-label="Next">›</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section className="testimonials-section section" style={{background:'var(--off-white)'}}>
        <div className="container">
          <div className="section-header center">
            <p className="section-label">Student Reviews</p>
            <h2>What Our Students Say</h2>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t:any) => (
              <div key={t.id} className="testimonial-card">
                <div className="t-stars">{'★'.repeat(t.rating??5)}</div>
                <p className="t-review">{t.review}</p>
                <div className="t-student">
                  <div className="t-avatar">
                    {t.photo_url
                      ? <img src={t.photo_url} alt={t.student_name} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      : <span>{t.student_name[0]}</span>
                    }
                  </div>
                  <div>
                    <div className="t-name">{t.student_name}</div>
                    <div className="t-course">{t.course}</div>
                    {t.company_placed && <div className="t-company">Placed at {t.company_placed}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CENTRES ─────────────────────────────────────────── */}
      <section className="centres-section section">
        <div className="container">
          <div className="section-header center">
            <p className="section-label">Our Centres</p>
            <h2>ATEC Educational Society Network</h2>
            <p className="section-desc">Find an ATEC centre near you for hands-on practical training</p>
          </div>
          <div className="centres-grid">
            {centres.map((c:any) => (
              <div key={c.id} className="centre-card">
                {c.photo_url && <div className="centre-photo"><img src={c.photo_url} alt={c.name} loading="lazy" /></div>}
                <div className="centre-body">
                  <h3 className="centre-name">{c.name}</h3>
                  <p className="centre-city">{c.city}, {c.state}</p>
                  {c.address && <p className="centre-addr">{c.address}</p>}
                  {c.phone && <a href={`tel:${c.phone}`} className="centre-phone">{c.phone}</a>}
                  {c.map_url && <a href={c.map_url} target="_blank" rel="noopener" className="btn btn-outline btn-sm" style={{marginTop:'12px',display:'inline-flex'}}>View on Map →</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWS ────────────────────────────────────────────── */}
      <section className="news-section section" style={{background:'var(--off-white)'}}>
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-label">News</p>
              <h2>Featured In The News</h2>
            </div>
          </div>
          <div className="news-grid">
            {news.map((item:any, i:number) => (
              <a key={item.id} href={item.url??'#'} target="_blank" rel="noopener" className={`news-card${i===0?' featured':''}`}>
                {item.thumbnail_url && <div className="news-thumb"><img src={item.thumbnail_url} alt={item.title} loading="lazy" /></div>}
                <div className="news-body">
                  {item.source && <span className="news-source">{item.source}</span>}
                  <h3 className="news-title">{item.title}</h3>
                  {item.published_date && (
                    <span className="news-date">{new Date(item.published_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
