// src/components/certificate/CertificatesPage.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface CertData {
  id: string
  certificate_no: string
  course_name: string
  issue_date: string
  grade: string
  student_name: string
  father_name: string | null
}

interface CompletedCourse {
  course_id: string
  course_title: string
  completed_at: string
  hasCert: boolean
  certData: CertData | null
}

export default function CertificatesPage() {
  const [completed, setCompleted] = useState<CompletedCourse[]>([])
  const [profile, setProfile] = useState<{ full_name: string; father_name: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUserId(user.id)

    const [{ data: enrollData }, { data: profileData }, { data: certData }] = await Promise.all([
      supabase.from('enrollments').select('course_id,completed_at,courses(title)').eq('student_id', user.id).eq('payment_status', 'paid').not('completed_at', 'is', null),
      supabase.from('student_profiles').select('full_name,father_name').eq('id', user.id).single(),
      supabase.from('generated_certificates').select('*').eq('student_id', user.id).eq('is_active', true),
    ])

    setProfile(profileData)

    const certMap: Record<string, CertData> = {}
    for (const c of certData ?? []) certMap[c.course_id] = c

    setCompleted((enrollData ?? []).map((e: any) => ({
      course_id: e.course_id,
      course_title: e.courses?.title ?? '',
      completed_at: e.completed_at,
      hasCert: !!certMap[e.course_id],
      certData: certMap[e.course_id] ?? null,
    })))

    setLoading(false)
  }

  async function generateCertificate(courseId: string, courseTitle: string) {
    if (!userId || !profile) return
    setGenerating(courseId)

    // Generate certificate number: ATEC-YYYY-NNNN
    const yr = new Date().getFullYear()
    const { count } = await supabase
      .from('generated_certificates')
      .select('*', { count: 'exact', head: true })
      .like('certificate_no', `ATEC-${yr}-%`)

    const seq = String((count ?? 0) + 1).padStart(4, '0')
    const certNo = `ATEC-${yr}-${seq}`

    const { data: cert } = await supabase
      .from('generated_certificates')
      .insert({
        certificate_no: certNo,
        student_id: userId,
        course_id: courseId,
        student_name: profile.full_name,
        father_name: profile.father_name,
        course_name: courseTitle,
        issue_date: new Date().toISOString().split('T')[0],
        grade: 'A',
        is_active: true,
      })
      .select()
      .single()

    if (cert) {
      setCompleted(prev => prev.map(c =>
        c.course_id === courseId
          ? { ...c, hasCert: true, certData: cert }
          : c
      ))
    }
    setGenerating(null)
  }

  function downloadCertificate(cert: CertData) {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Certificate — ${cert.certificate_no}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,700;1,400&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .cert {
    width: 900px; min-height: 640px;
    border: 12px solid #1c3d7a;
    padding: 60px 80px;
    position: relative;
    font-family: 'Sora', sans-serif;
    background: #fff;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  }
  .cert-corner {
    position: absolute; width: 60px; height: 60px;
    border-color: #d4f01a; border-style: solid;
  }
  .cert-corner.tl { top: 12px; left: 12px; border-width: 4px 0 0 4px; }
  .cert-corner.tr { top: 12px; right: 12px; border-width: 4px 4px 0 0; }
  .cert-corner.bl { bottom: 12px; left: 12px; border-width: 0 0 4px 4px; }
  .cert-corner.br { bottom: 12px; right: 12px; border-width: 0 4px 4px 0; }
  .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 32px; }
  .org { font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #1c3d7a; margin-bottom: 8px; }
  .cert-title { font-family: 'Playfair Display', serif; font-size: 42px; font-style: italic; color: #0f2347; line-height: 1.1; }
  .cert-sub { font-size: 12px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; }
  .body { text-align: center; }
  .presented { font-size: 15px; color: #6b7280; margin-bottom: 12px; }
  .student-name { font-family: 'Playfair Display', serif; font-size: 40px; color: #1c3d7a; font-weight: 700; border-bottom: 2px solid #d4f01a; display: inline-block; padding-bottom: 4px; margin-bottom: 8px; }
  .father { font-size: 14px; color: #6b7280; margin-bottom: 20px; }
  .completed { font-size: 15px; color: #374151; margin-bottom: 10px; }
  .course-name { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 800; color: #0f2347; margin-bottom: 24px; }
  .meta-row { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
  .meta-item { text-align: center; }
  .meta-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .meta-value { font-size: 14px; font-weight: 700; color: #0f2347; }
  .signature-box { text-align: center; }
  .sig-line { width: 120px; height: 2px; background: #374151; margin: 0 auto 4px; }
  .sig-label { font-size: 11px; color: #6b7280; }
  .iso-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #eff6ff; border: 1px solid #bfdbfe;
    border-radius: 6px; padding: 5px 12px;
    font-size: 12px; font-weight: 700; color: #1c3d7a;
    margin-top: 20px;
  }
  @media print {
    body { background: #fff; }
    .cert { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="cert">
  <div class="cert-corner tl"></div>
  <div class="cert-corner tr"></div>
  <div class="cert-corner bl"></div>
  <div class="cert-corner br"></div>

  <div class="header">
    <div class="org">ATEC Educational Society</div>
    <div class="cert-title">Certificate of Completion</div>
    <div class="cert-sub">ISO 9001:2015 Certified · Est. 2000</div>
  </div>

  <div class="body">
    <div class="presented">This is to certify that</div>
    <div class="student-name">${cert.student_name}</div>
    ${cert.father_name ? `<div class="father">S/o or D/o ${cert.father_name}</div>` : ''}
    <div class="completed">has successfully completed the course</div>
    <div class="course-name">${cert.course_name}</div>
    <div class="iso-badge">✓ Verified Certificate</div>
  </div>

  <div class="meta-row">
    <div class="meta-item">
      <div class="meta-label">Certificate No.</div>
      <div class="meta-value">${cert.certificate_no}</div>
    </div>
    <div class="signature-box">
      <div class="sig-line"></div>
      <div class="meta-label">Director, ATEC</div>
      <div class="sig-label">Hardochanni Road, Gurdaspur</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Grade</div>
      <div class="meta-value">${cert.grade}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Issue Date</div>
      <div class="meta-value">${new Date(cert.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print()<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading certificates...
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '800' }}>📜 My Certificates</h1>
        <p style={{ color: '#6b7280', marginTop: '4px' }}>{completed.length} course{completed.length !== 1 ? 's' : ''} completed</p>
      </div>

      {completed.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1.3rem', marginBottom: '8px' }}>No certificates yet</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>Complete a course to earn your certificate</p>
          <a href="/dashboard/my-courses" style={{ padding: '12px 28px', background: '#1c3d7a', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '700' }}>
            Go to My Courses
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '20px' }}>
          {completed.map(c => (
            <div key={c.course_id} style={{ background: '#fff', borderRadius: '16px', border: `2px solid ${c.hasCert ? '#d4f01a' : '#e2e8f0'}`, overflow: 'hidden' }}>
              {/* Certificate preview header */}
              <div style={{ background: 'linear-gradient(135deg,#0f2347 0%,#1c3d7a 100%)', padding: '28px', textAlign: 'center', position: 'relative' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>📜</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '14px', color: '#d4f01a', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Certificate of Completion
                </div>
                {c.hasCert && c.certData && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#d4f01a', color: '#0f2347', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
                    ✓ ISSUED
                  </div>
                )}
              </div>

              <div style={{ padding: '20px 24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>{c.course_title}</h3>

                {c.certData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      📋 Cert No: <strong style={{ color: '#1c3d7a' }}>{c.certData.certificate_no}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      📅 Issued: {new Date(c.certData.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      🏅 Grade: <strong style={{ color: '#166534' }}>{c.certData.grade}</strong>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
                  {!c.hasCert ? (
                    <button
                      onClick={() => generateCertificate(c.course_id, c.course_title)}
                      disabled={generating === c.course_id}
                      style={{ flex: 1, padding: '10px', background: generating === c.course_id ? '#9ca3af' : '#1c3d7a', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', cursor: generating === c.course_id ? 'not-allowed' : 'pointer' }}
                    >
                      {generating === c.course_id ? '⏳ Generating...' : '🎓 Generate Certificate'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => c.certData && downloadCertificate(c.certData)}
                        style={{ flex: 1, padding: '10px', background: '#d4f01a', color: '#0f2347', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                      >
                        ⬇️ Download
                      </button>
                      <a
                        href={`/verification?cert=${c.certData?.certificate_no}`}
                        style={{ padding: '10px 14px', background: '#eff6ff', color: '#1c3d7a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}
                      >
                        🔗 Verify
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
