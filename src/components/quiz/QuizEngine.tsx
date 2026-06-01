// src/components/quiz/QuizEngine.tsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface Question {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string | null
  option_d: string | null
  correct_option: string
  explanation: string | null
}

interface Quiz {
  id: string
  title: string
  description: string | null
  pass_percent: number
  time_limit_minutes: number
  course_id: string
}

type Phase = 'loading' | 'intro' | 'playing' | 'result'

export default function QuizEngine() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [score, setScore] = useState(0)
  const [passed, setPassed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadQuiz()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function loadQuiz() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUserId(user.id)

    const params = new URLSearchParams(window.location.search)
    const courseId = params.get('course')
    const quizId = params.get('quiz')

    let quizData: Quiz | null = null

    if (quizId) {
      const { data } = await supabase.from('quizzes').select('*').eq('id', quizId).single()
      quizData = data
    } else if (courseId) {
      const { data } = await supabase.from('quizzes').select('*').eq('course_id', courseId).eq('is_active', true).order('sort_order').limit(1).single()
      quizData = data
    }

    if (!quizData) {
      setPhase('intro')
      return
    }

    const { data: qs } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizData.id)
      .order('sort_order')

    setQuiz(quizData)
    setQuestions(qs ?? [])
    setTimeLeft((quizData.time_limit_minutes ?? 0) * 60)
    setPhase('intro')
  }

  function startQuiz() {
    setPhase('playing')
    setCurrentIdx(0)
    setAnswers({})
    setSelected(null)
    setRevealed(false)

    if (quiz && quiz.time_limit_minutes > 0) {
      setTimeLeft(quiz.time_limit_minutes * 60)
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            submitQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  function selectAnswer(opt: string) {
    if (revealed) return
    setSelected(opt)
  }

  function confirmAnswer() {
    if (!selected || !questions[currentIdx]) return
    const q = questions[currentIdx]
    setAnswers(prev => ({ ...prev, [q.id]: selected }))
    setRevealed(true)
  }

  function nextQuestion() {
    setRevealed(false)
    setSelected(null)
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1)
    } else {
      submitQuiz()
    }
  }

  async function submitQuiz() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!quiz || !userId) return

    const finalAnswers = { ...answers }
    if (selected && questions[currentIdx]) {
      finalAnswers[questions[currentIdx].id] = selected
    }

    let correct = 0
    for (const q of questions) {
      if (finalAnswers[q.id] === q.correct_option) correct++
    }

    const scorePct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
    const didPass = scorePct >= (quiz.pass_percent ?? 60)

    setScore(scorePct)
    setPassed(didPass)

    // Save attempt
    await supabase.from('quiz_attempts').insert({
      student_id: userId,
      quiz_id: quiz.id,
      course_id: quiz.course_id,
      score_percent: scorePct,
      total_questions: questions.length,
      correct_answers: correct,
      passed: didPass,
      answers: finalAnswers,
      completed_at: new Date().toISOString(),
    })

    setPhase('result')
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const timerDisplay = `${pad(Math.floor(timeLeft / 60))}:${pad(timeLeft % 60)}`
  const currentQ = questions[currentIdx]

  const optionLabels: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D' }

  function optionStyle(opt: string) {
    const base: React.CSSProperties = {
      width: '100%', padding: '14px 18px',
      border: '2px solid #e2e8f0', borderRadius: '10px',
      background: '#fff', cursor: revealed ? 'default' : 'pointer',
      fontSize: '15px', textAlign: 'left', fontFamily: 'Inter, sans-serif',
      transition: 'all 0.15s', marginBottom: '10px',
      display: 'flex', alignItems: 'center', gap: '12px',
    }
    if (!revealed) {
      if (selected === opt) return { ...base, borderColor: '#1c3d7a', background: '#eff6ff', color: '#1c3d7a', fontWeight: '600' }
      return base
    }
    if (opt === currentQ?.correct_option) return { ...base, borderColor: '#22c55e', background: '#dcfce7', color: '#166534', fontWeight: '700' }
    if (selected === opt && opt !== currentQ?.correct_option) return { ...base, borderColor: '#ef4444', background: '#fee2e2', color: '#991b1b', fontWeight: '600' }
    return { ...base, opacity: 0.5 }
  }

  // ── LOADING ──
  if (phase === 'loading') return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#6b7280' }}>
      <div style={{ fontSize: '32px' }}>⏳</div>
      <p>Loading quiz...</p>
    </div>
  )

  // ── NO QUIZ ──
  if (!quiz || questions.length === 0) return (
    <div style={{ maxWidth: '540px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '60px 40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '700', marginBottom: '12px' }}>No quiz available yet</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>The quiz for this course hasn't been set up yet. Check back soon!</p>
        <a href="/dashboard/my-courses" style={{ padding: '12px 28px', background: '#1c3d7a', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '700' }}>← My Courses</a>
      </div>
    </div>
  )

  // ── INTRO ──
  if (phase === 'intro') return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '48px 40px' }}>
        <div style={{ width: '64px', height: '64px', background: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '24px' }}>📝</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '800', marginBottom: '8px' }}>{quiz.title}</h1>
        {quiz.description && <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '24px' }}>{quiz.description}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
          {[
            { icon: '❓', label: 'Questions', value: `${questions.length}` },
            { icon: '🎯', label: 'Pass Mark', value: `${quiz.pass_percent}%` },
            { icon: '⏱', label: 'Time Limit', value: quiz.time_limit_minutes > 0 ? `${quiz.time_limit_minutes} min` : 'No limit' },
            { icon: '🔄', label: 'Attempts', value: 'Unlimited' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{stat.icon}</span>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{stat.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: '#1c3d7a' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={startQuiz}
          style={{ width: '100%', padding: '16px', background: '#1c3d7a', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '16px', cursor: 'pointer' }}
        >
          Start Quiz →
        </button>
      </div>
    </div>
  )

  // ── PLAYING ──
  if (phase === 'playing' && currentQ) return (
    <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1c3d7a', borderRadius: '4px', width: `${((currentIdx + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', whiteSpace: 'nowrap' }}>
          {currentIdx + 1} / {questions.length}
        </span>
        {quiz.time_limit_minutes > 0 && (
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', color: timeLeft < 60 ? '#ef4444' : '#1c3d7a', background: timeLeft < 60 ? '#fee2e2' : '#eff6ff', padding: '4px 12px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
            ⏱ {timerDisplay}
          </span>
        )}
      </div>

      {/* Question card */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Question {currentIdx + 1}
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: '700', lineHeight: '1.5', marginBottom: '24px', color: '#0f172a' }}>
          {currentQ.question}
        </h2>

        {/* Options */}
        {(['a', 'b', 'c', 'd'] as const).map(opt => {
          const text = currentQ[`option_${opt}` as keyof Question] as string | null
          if (!text) return null
          return (
            <button key={opt} onClick={() => selectAnswer(opt)} style={optionStyle(opt)}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: selected === opt && !revealed ? '#1c3d7a' : '#f1f5f9', color: selected === opt && !revealed ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                {optionLabels[opt]}
              </span>
              {text}
            </button>
          )
        })}

        {/* Explanation */}
        {revealed && currentQ.explanation && (
          <div style={{ marginTop: '16px', padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '14px', color: '#166534' }}>
            💡 <strong>Explanation:</strong> {currentQ.explanation}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {!revealed ? (
          <button
            onClick={confirmAnswer}
            disabled={!selected}
            style={{ flex: 1, padding: '14px', background: selected ? '#1c3d7a' : '#e2e8f0', color: selected ? '#fff' : '#94a3b8', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', cursor: selected ? 'pointer' : 'not-allowed' }}
          >
            Confirm Answer
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            style={{ flex: 1, padding: '14px', background: '#d4f01a', color: '#0f2347', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}
          >
            {currentIdx < questions.length - 1 ? 'Next Question →' : 'Submit Quiz →'}
          </button>
        )}
      </div>
    </div>
  )

  // ── RESULT ──
  if (phase === 'result') return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '48px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{passed ? '🎉' : '😔'}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '800', color: passed ? '#166534' : '#991b1b', marginBottom: '8px' }}>
          {passed ? 'You Passed!' : 'Not Passed'}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '32px' }}>
          {passed ? 'Excellent work! You can now download your certificate.' : `You need ${quiz?.pass_percent}% to pass. Keep studying and try again!`}
        </p>

        {/* Score display */}
        <div style={{ background: passed ? '#f0fdf4' : '#fef2f2', borderRadius: '16px', padding: '28px', marginBottom: '28px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', fontWeight: '800', color: passed ? '#166534' : '#991b1b', lineHeight: 1 }}>
            {score}%
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Your Score</div>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '20px', color: '#166534' }}>
                {Math.round((score / 100) * questions.length)}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Correct</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '20px', color: '#991b1b' }}>
                {questions.length - Math.round((score / 100) * questions.length)}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Wrong</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '20px', color: '#1c3d7a' }}>
                {questions.length}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {passed && (
            <a href="/dashboard/certificates" style={{ padding: '12px 24px', background: '#d4f01a', color: '#0f2347', borderRadius: '10px', textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '14px' }}>
              📜 Get Certificate
            </a>
          )}
          <button onClick={startQuiz} style={{ padding: '12px 24px', background: '#1c3d7a', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            🔄 Try Again
          </button>
          <a href="/dashboard/my-courses" style={{ padding: '12px 20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', color: '#4b5563', fontWeight: '600' }}>
            ← My Courses
          </a>
        </div>
      </div>
    </div>
  )

  return null
}
