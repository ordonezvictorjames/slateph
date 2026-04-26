'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { QuizConfig, Question } from './QuizBuilder'

interface Props {
  config: QuizConfig
  moduleId: string
  subjectId?: string
  courseId?: string
  userId?: string
  userRole?: string
}

interface GradeRow {
  id: string
  user_id: string
  score: number
  total: number
  percentage: number
  passed: boolean
  try_number: number
  time_taken_seconds: number | null
  submitted_at: string
  quiz_type: string
  profiles?: { id: string; first_name: string; last_name: string; email: string }
}

type Phase = 'loading' | 'intro' | 'taking' | 'result'

const STUDENT_ROLES = ['shs_student', 'jhs_student', 'college_student', 'scholar']
const STAFF_ROLES   = ['admin', 'developer', 'instructor']

function pad(n: number) { return String(n).padStart(2, '0') }

function formatDT(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function scheduleStatus(cfg: QuizConfig): 'before' | 'open' | 'after' | 'always' {
  const now   = Date.now()
  const from  = cfg.available_from  ? new Date(cfg.available_from).getTime()  : null
  const until = cfg.available_until ? new Date(cfg.available_until).getTime() : null
  if (!from && !until) return 'always'
  if (from && now < from) return 'before'
  if (until && now > until) return 'after'
  return 'open'
}

export default function QuizPlayer({
  config, moduleId, subjectId, courseId, userId, userRole
}: Props) {
  const supabase  = createClient()
  const isStudent = STUDENT_ROLES.includes(userRole ?? '')
  const isStaff   = STAFF_ROLES.includes(userRole ?? '')

  const [phase, setPhase]             = useState<Phase>('loading')
  const [alreadyTaken, setAlreadyTaken] = useState(false)
  const [answers, setAnswers]         = useState<Record<string, string>>({})
  const [secondsLeft, setSecondsLeft] = useState(config.time_minutes * 60)
  const [startedAt, setStartedAt]     = useState(0)
  const [score, setScore]             = useState<{ correct: number; total: number } | null>(null)
  const [saving, setSaving]           = useState(false)
  const [reviewIdx, setReviewIdx]     = useState(0)
  const [watermarkName, setWatermarkName] = useState('')
  const [grades, setGrades]           = useState<GradeRow[]>([])
  const [loadingGrades, setLoadingGrades] = useState(false)
  const [gradesError, setGradesError] = useState<string | null>(null)
  const [currentQ, setCurrentQ]       = useState(0)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Shuffle questions randomly once on mount (stable for the duration of the quiz)
  const [questions] = useState<Question[]>(() => {
    const qs = [...(config.questions ?? [])]
    if (qs.length <= 1) return qs
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qs[i], qs[j]] = [qs[j], qs[i]]
    }
    return qs
  })
  const sched       = scheduleStatus(config)
  const withinSched = sched === 'always' || sched === 'open'
  // Student can start only if: open, within schedule, not already taken
  const canStart    = isStudent && config.is_open && withinSched && !alreadyTaken

  // Check if student already submitted this quiz/exam (respects max_tries)
  useEffect(() => {
    if (!isStudent || !userId) { setPhase('intro'); return }
    // Fetch student name for watermark
    supabase.from('profiles').select('first_name, last_name').eq('id', userId).single()
      .then(({ data }) => { if (data) setWatermarkName(`${data.first_name} ${data.last_name}`) })
    supabase
      .from('quiz_grades')
      .select('id, score, total, percentage, answers')
      .eq('module_id', moduleId)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .then(({ data }: { data: { id: string; score: number; total: number; percentage: number; answers: any }[] | null }) => {
        const tries = data?.length ?? 0
        const maxTries = config.max_tries ?? 1
        if (maxTries !== 0 && tries >= maxTries) {
          setAlreadyTaken(true)
          const last = data?.[0]
          if (last) {
            setScore({ correct: last.score, total: last.total })
            if (last.answers) setAnswers(last.answers)
            setPhase('result') // always show result screen, even if answers are null
            return
          }
        }
        setPhase('intro')
      })
  }, [isStudent, userId, moduleId])

  // Load grades for staff with real-time subscription
  useEffect(() => {
    if (!isStaff) return
    fetchGrades()
    const sub = supabase
      .channel(`quiz_grades_${moduleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quiz_grades',
        filter: `module_id=eq.${moduleId}`
      }, () => fetchGrades())
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [isStaff, moduleId])

  async function fetchGrades() {
    setLoadingGrades(true)
    setGradesError(null)
    const { data: gradeData, error } = await supabase
      .from('quiz_grades')
      .select('id, user_id, score, total, percentage, passed, try_number, time_taken_seconds, submitted_at, quiz_type')
      .eq('module_id', moduleId)
      .order('submitted_at', { ascending: false })

    if (error) { setGradesError(error.message); setLoadingGrades(false); return }
    if (!gradeData) { setLoadingGrades(false); return }

    const userIds = Array.from(new Set<string>(gradeData.map((g: { user_id: string }) => g.user_id)))
    const { data: profileData } = await supabase
      .from('profiles').select('id, first_name, last_name, email').in('id', userIds)

    const profileMap: Record<string, { id: string; first_name: string; last_name: string; email: string }> =
      Object.fromEntries((profileData ?? []).map((p: { id: string; first_name: string; last_name: string; email: string }) => [p.id, p]))

    setGrades(gradeData.map((g: GradeRow) => ({ ...g, profiles: profileMap[g.user_id] ?? undefined })))
    setLoadingGrades(false)
  }

  // Tab switch detection — auto-fail if student leaves during exam
  // Note: we use pagehide to distinguish tab-switch from page refresh
  useEffect(() => {
    if (phase !== 'taking') return
    let didUnload = false
    function handlePageHide() { didUnload = true }
    function handleVisibilityChange() {
      if (document.hidden && !didUnload && mountedRef.current && phase === 'taking') {
        submitQuiz()
      }
    }
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [phase, answers])

  // Timer
  useEffect(() => {
    if (phase !== 'taking') return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { submitQuiz(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  function startQuiz() {
    setAnswers({})
    setSecondsLeft(config.time_minutes * 60)
    setScore(null)
    setStartedAt(Date.now())
    setCurrentQ(0)
    setPhase('taking')
  }

  function pick(qid: string, cid: string) {
    setAnswers(prev => ({ ...prev, [qid]: cid }))
  }

  async function submitQuiz() {
    if (timerRef.current) clearInterval(timerRef.current)
    let correct = 0
    for (const q of questions) {
      const chosen = answers[q.id]
      const correctChoice = q.choices.find(c => c.isCorrect)
      if (chosen && correctChoice && chosen === correctChoice.id) correct++
    }
    const total      = questions.length
    const percentage = total > 0 ? Math.round((correct / total) * 100 * 100) / 100 : 0
    const passed     = percentage >= 60
    const timeTaken  = Math.round((Date.now() - startedAt) / 1000)

    setScore({ correct, total })
    setAlreadyTaken(true)
    setPhase('result')

    if (userId && isStudent) {
      setSaving(true)
      try {
        await supabase.from('quiz_grades').insert({
          user_id: userId,
          module_id: moduleId,
          subject_id: subjectId ?? null,
          course_id: courseId ?? null,
          quiz_type: config.type,
          quiz_title: config.title || config.type,
          score: correct,
          total,
          percentage,
          passed,
          time_taken_seconds: timeTaken,
          try_number: 1,
          answers,
        })
      } catch (e) {
        console.error('Failed to save grade:', e)
      } finally {
        setSaving(false)
      }
    }
  }

  const pct    = score ? Math.round((score.correct / score.total) * 100) : 0
  const passed = pct >= 60

  // ── STAFF VIEW ─────────────────────────────────────────────
  if (isStaff) return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#0f4c5c] uppercase tracking-wide">
              {config.type === 'exam' ? 'Exam' : 'Quiz'} Preview
            </p>
            <h3 className="text-sm font-bold text-gray-900">{config.title || config.type}</h3>
          </div>
          <span className={`px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 ${config.is_open ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {config.is_open ? 'Open' : 'Closed'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          {[
            { val: questions.length, label: 'Questions' },
            { val: config.time_minutes, label: 'Minutes' },
          ].map(({ val, label }) => (
            <div key={label} className="bg-white rounded-lg p-2 border border-gray-200">
              <p className="text-lg font-bold text-[#0f4c5c]">{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {(config.available_from || config.available_until) && (
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 space-y-0.5">
            {config.available_from && <p className="text-xs text-gray-600">Opens: <span className="font-medium">{formatDT(config.available_from)}</span></p>}
            {config.available_until && <p className="text-xs text-gray-600">Closes: <span className="font-medium">{formatDT(config.available_until)}</span></p>}
            <p className={`text-xs font-medium mt-1 ${sched === 'open' || sched === 'always' ? 'text-green-600' : sched === 'before' ? 'text-amber-600' : 'text-red-600'}`}>
              {sched === 'before' ? 'Not yet available' : sched === 'after' ? 'Schedule ended' : 'Within schedule'}
            </p>
          </div>
        )}

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {questions.map((q, qi) => (
            <div key={q.id} className="bg-white rounded-lg border border-gray-100 p-2">
              <p className="text-xs font-medium text-gray-800">{qi + 1}. {q.text}</p>
              <div className="mt-1 space-y-0.5">
                {q.choices.map((c, ci) => (
                  <p key={c.id} className={`text-xs pl-3 ${c.isCorrect ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                    {String.fromCharCode(65 + ci)}. {c.text} {c.isCorrect ? '✓' : ''}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student submissions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Student Submissions</p>
            {grades.length > 0 && (
              <span className="bg-purple-100 text-[#0f4c5c] text-xs font-medium px-2 py-0.5 rounded-full">{grades.length}</span>
            )}
          </div>
          <button onClick={fetchGrades} className="text-xs text-[#1f7a8c] hover:underline">Refresh</button>
        </div>

        {loadingGrades ? (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-xs">Loading...</span>
          </div>
        ) : gradesError ? (
          <div className="px-4 py-6 text-center space-y-2">
            <p className="text-xs text-red-500 font-medium">Failed to load submissions</p>
            <p className="text-xs text-gray-400">{gradesError}</p>
            <button onClick={fetchGrades} className="text-xs text-[#1f7a8c] underline">Try again</button>
          </div>
        ) : grades.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">No submissions yet.</p>
            <p className="text-xs text-gray-300 mt-1">Students who complete this {config.type} will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Student</th>
                  <th className="text-center px-3 py-2 text-gray-500 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grades.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800 font-medium">
                      {g.profiles ? `${g.profiles.first_name} ${g.profiles.last_name}` : g.user_id.slice(0, 8) + '…'}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-800">{g.score}/{g.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  // ── LOADING ────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center">
      <svg className="animate-spin w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  )

  // ── INTRO ──────────────────────────────────────────────────
  if (phase === 'intro') return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-[#0f4c5c] uppercase tracking-wide">
          {config.type === 'exam' ? 'Exam' : 'Quiz'}
        </p>
        <h3 className="text-sm font-bold text-gray-900">{config.title || config.type}</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        {[
          { val: questions.length, label: 'Questions' },
          { val: config.time_minutes, label: 'Minutes' },
        ].map(({ val, label }) => (
          <div key={label} className="rounded-lg p-2 border border-gray-200">
            <p className="text-lg font-bold text-[#0f4c5c]">{val}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {(config.available_from || config.available_until) && (
        <div className="border border-gray-200 rounded-lg px-3 py-2 space-y-0.5 text-xs text-gray-600">
          {config.available_from && <p>Opens: <span className="font-medium">{formatDT(config.available_from)}</span></p>}
          {config.available_until && <p>Closes: <span className="font-medium">{formatDT(config.available_until)}</span></p>}
        </div>
      )}

      {/* Blocked states */}
      {sched === 'before' && (
        <p className="text-xs text-amber-600 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
          Not available yet. Opens on {formatDT(config.available_from!)}.
        </p>
      )}
      {sched === 'after' && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-2">
          The schedule for this {config.type} has ended.
        </p>
      )}
      {!config.is_open && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-2">
          This {config.type} is currently closed.
        </p>
      )}
      {alreadyTaken && (
        <p className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 text-center">
          {(config.max_tries ?? 1) === 0
            ? 'You have already submitted this ' + config.type + '.'
            : `You have used all ${config.max_tries ?? 1} attempt${(config.max_tries ?? 1) !== 1 ? 's' : ''} for this ${config.type}.`}
        </p>
      )}
      {!isStudent && !isStaff && (
        <p className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 text-center">
          Only enrolled students can take this {config.type}.
        </p>
      )}

      {canStart && questions.length > 0 && (
        <button onClick={startQuiz}
          className="w-full py-2.5 bg-[#0f4c5c] text-white text-sm font-medium rounded-lg hover:bg-[#0f4c5c]/90 transition-colors">
          Start {config.type === 'exam' ? 'Exam' : 'Quiz'}
        </button>
      )}
      {questions.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center">No questions added yet.</p>
      )}
    </div>
  )

  // ── TAKING — redesigned layout matching reference design ──
  if (phase === 'taking') {
    const mins   = Math.floor(secondsLeft / 60)
    const secs   = secondsLeft % 60
    const urgent = secondsLeft <= 60
    const q      = questions[currentQ]
    const progressPct = questions.length > 0 ? Math.round(((currentQ + 1) / questions.length) * 100) : 0
    const answeredCount = Object.keys(answers).length

    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-2xl w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl overflow-hidden select-none relative"
          onCopy={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Watermark overlay */}
          {watermarkName && (
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, row) =>
                Array.from({ length: 4 }).map((_, col) => (
                  <div
                    key={`${row}-${col}`}
                    className="absolute text-[11px] font-semibold text-gray-400/25 whitespace-nowrap"
                    style={{
                      top: `${row * 18 + 5}%`,
                      left: `${col * 28 - 5}%`,
                      transform: 'rotate(-30deg)',
                      userSelect: 'none',
                    }}
                  >
                    {watermarkName}
                  </div>
                ))
              )}
            </div>
          )}
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${urgent ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
            <h2 className="text-base font-bold text-gray-900">{config.title || (config.type === 'exam' ? 'Exam' : 'Quiz')}</h2>
            <div className="flex items-center gap-4">
              <div className={`font-mono font-bold text-lg ${urgent ? 'text-red-600' : 'text-gray-700'}`}>
                {pad(mins)}:{pad(secs)}
              </div>
              <span className="text-xs text-gray-400">{answeredCount}/{questions.length} answered</span>
            </div>
          </div>

          {/* Anti-cheat */}
          <div className="px-5 py-1.5 bg-amber-50 border-b border-amber-100 shrink-0">
            <p className="text-xs text-amber-700">Switching tabs or windows will automatically submit your {config.type}.</p>
          </div>

          {/* Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: question area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Progress bar */}
              <div className="px-6 pt-4 pb-2 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%`, backgroundColor: '#0f4c5c' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{progressPct}%</span>
                </div>
              </div>

              {/* Question */}
              <div className="flex-1 overflow-y-auto px-6 py-4 select-none"
                onCopy={e => e.preventDefault()}
                onCut={e => e.preventDefault()}
                onContextMenu={e => e.preventDefault()}
              >
                <p className="text-sm font-semibold text-gray-900 mb-4">
                  <span className="font-bold" style={{ color: '#0f4c5c' }}>Question {currentQ + 1}/{questions.length}: </span>
                  {q.text || <span className="italic text-gray-400">No question text</span>}
                </p>

                <div className="space-y-2">
                  {q.choices.map((c) => {
                    const selected = answers[q.id] === c.id
                    return (
                      <button key={c.id} type="button" onClick={() => pick(q.id, c.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                          selected
                            ? 'border-[#0f4c5c] bg-[#e6f4f7] text-[#0f4c5c] font-medium'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}>
                        {c.text || <span className="italic text-gray-400">Choice</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Prev / Next / Submit */}
              <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                  disabled={currentQ === 0}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {currentQ < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: '#0f4c5c' }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={submitQuiz}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: '#0f4c5c' }}
                  >
                    Submit {config.type === 'exam' ? 'Exam' : 'Quiz'}
                  </button>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-52 shrink-0 border-l border-gray-100 flex flex-col overflow-hidden bg-gray-50">
              {/* Score summary */}
              <div className="p-4 border-b border-gray-100 text-center bg-white">
                <p className="text-2xl font-bold text-gray-900">
                  {answeredCount > 0 ? Math.round((answeredCount / questions.length) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{answeredCount} of {questions.length} answered</p>
              </div>

              {/* Question navigator */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {questions.map((qn, idx) => {
                  const isAnswered = !!answers[qn.id]
                  const isCurrent  = idx === currentQ
                  return (
                    <button
                      key={qn.id}
                      onClick={() => setCurrentQ(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                        isCurrent
                          ? 'border-[#0f4c5c] bg-white text-[#0f4c5c]'
                          : isAnswered
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-500'
                      }`}
                    >
                      {isAnswered && !isCurrent && (
                        <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      )}
                      <span className="truncate">Question {idx + 1}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {(() => {
        const getRating = (p: number) => {
          if (p < 60) return 'Failed'
          if (p < 75) return 'Good'
          if (p < 90) return 'Very Good'
          return 'Excellent'
        }
        const rating = getRating(pct)
        const isFailed = pct < 60
        const accent = isFailed ? '#e74c3c' : '#0f4c5c'
        const radius = 54
        const circumference = 2 * Math.PI * radius
        const dashOffset = circumference - (pct / 100) * circumference

        return (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            {/* Circular progress */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle cx="64" cy="64" r={radius} fill="none" stroke={accent} strokeWidth="10"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{score!.correct}<span className="text-sm font-medium text-gray-400">/{score!.total}</span></span>
                  <span className="text-xs font-semibold mt-0.5" style={{ color: accent }}>Your Score</span>
                </div>
              </div>
            </div>

            {!isFailed && (
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">Quiz Done!</h2>
            )}
            {!isFailed && (
              <p className="text-sm text-gray-400 mb-3">Well done, you've completed the quiz!</p>
            )}

            {/* Rating pill */}
            <div className="inline-block px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: accent }}>
              {pct}% — {rating}
            </div>

            {saving && <p className="text-xs text-gray-400 mt-2">Saving grade...</p>}
          </div>
        )
      })()}

      {/* Single question review with Next/Prev navigation */}
      {questions.length > 0 && (() => {
        const qi = reviewIdx
        const q = questions[qi]
        const chosen = answers[q.id]
        const isRight = chosen === q.choices.find(c => c.isCorrect)?.id
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Question {qi + 1} of {questions.length}</span>
              <span className={isRight ? 'font-semibold' : 'text-red-500 font-semibold'}
                style={isRight ? { color: '#0f4c5c' } : {}}>
                {isRight ? '✓ Correct' : '✗ Incorrect'}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-800">{q.text}</p>
            <div className="space-y-2">
              {q.choices.map((c, ci) => {
                const isChosen  = c.id === chosen
                const isCorrect = c.isCorrect
                const isRight   = isChosen && isCorrect
                const isWrong   = isChosen && !isCorrect
                return (
                  <div key={c.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-full text-sm"
                    style={
                      isRight
                        ? { background: 'linear-gradient(135deg, #0f4c5c, #1f7a8c)', color: '#fff' }
                        : isWrong
                        ? { backgroundColor: '#fee2e2', color: '#b91c1c' }
                        : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                    }
                  >
                    <span className="font-medium">{String.fromCharCode(65 + ci)}.&nbsp;&nbsp;{c.text}</span>
                    {isRight && (
                      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    {isWrong && <span className="text-xs font-semibold text-red-500 flex-shrink-0">✗</span>}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setReviewIdx(i => Math.max(0, i - 1))} disabled={qi === 0}
                className="px-4 py-2 text-xs font-semibold rounded-full border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-colors">
                ← Prev
              </button>
              {qi < questions.length - 1 ? (
                <button onClick={() => setReviewIdx(i => i + 1)}
                  className="px-5 py-2 text-xs font-semibold rounded-full text-white transition-colors"
                  style={{ backgroundColor: '#0f4c5c' }}>
                  Next →
                </button>
              ) : (
                <span className="px-4 py-2 text-xs text-gray-400">End of review</span>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
