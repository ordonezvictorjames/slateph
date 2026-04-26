'use client'

import { useState, useEffect } from 'react'
import type { QuizConfig } from './QuizBuilder'
import QuizPlayer from './QuizPlayer'

interface Module {
  id: string
  subject_id: string
  title: string
  description: string
  content_type: 'video' | 'text' | 'canva_presentation' | 'online_conference' | 'online_document' | 'pdf_document' | 'slide_presentation'
  order_index: number
  status?: 'active' | 'inactive' | 'draft'
  duration_minutes?: number
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
  thumbnail_url?: string
  explanation?: string
  key_takeaways?: string
  quiz_activity?: string
  notes_content?: string
  created_at: string
}

interface LessonViewerProps {
  module: Module | null
  isOpen: boolean
  onClose: () => void
  inline?: boolean
  siblingModules?: Module[]
  onNavigate?: (mod: Module) => void
  userId?: string
  userRole?: string
  onQuizPassed?: (moduleId: string) => void
  subjectId?: string
  courseId?: string
}

const TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  canva_presentation: 'Canva Presentation',
  slide_presentation: 'Slide Presentation',
  online_document: 'Online Document',
  pdf_document: 'PDF Document',
  online_conference: 'Online Conference',
  text: 'Text',
}

function embedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  if (url.includes('docs.google.com') && !url.includes('/preview') && !url.includes('/embed'))
    return url.replace(/\/(edit|view).*$/, '/preview')
  return url
}

function ContentEmbed({ module, textBody }: { module: Module; textBody: string }) {
  const [err, setErr] = useState(false)

  switch (module.content_type) {
    case 'video':
      if (!module.video_url) return <Placeholder label="No video URL provided." />
      return (
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
          <iframe src={embedUrl(module.video_url)} className="w-full h-full" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={module.title} />
        </div>
      )

    case 'canva_presentation': {
      if (!module.canva_url) return <Placeholder label="No Canva URL provided." />
      // canva.link short URLs cannot be embedded — show a fallback
      if (module.canva_url.includes('canva.link')) {
        return (
          <div className="flex flex-col items-center gap-4 py-10 bg-orange-50 rounded-xl border border-orange-100">
            <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-orange-800 mb-1">Short link cannot be embedded</p>
              <p className="text-xs text-orange-600 mb-3">Use the full Canva embed URL instead.<br/>In Canva: Share → More → Embed → copy the URL ending in <code className="bg-orange-100 px-1 rounded">/view?embed</code></p>
            </div>
            <a href={module.canva_url} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors">
              Open in Canva
            </a>
          </div>
        )
      }
      // Canva embed requires the URL to end with /view?embed
      let canvaUrl = module.canva_url.trim()
      if (canvaUrl.includes('?embed')) {
        // already correct
      } else if (canvaUrl.includes('/embed')) {
        // old-style embed path — leave as-is
      } else {
        // strip any query string, ensure path ends with /view, then add ?embed
        canvaUrl = canvaUrl.replace(/\?.*$/, '').replace(/\/(edit|present|watch)$/, '/view')
        if (!canvaUrl.endsWith('/view')) canvaUrl = canvaUrl.replace(/\/$/, '') + '/view'
        canvaUrl = canvaUrl + '?embed'
      }
      return (
        <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-200">
          <iframe src={canvaUrl} className="w-full h-full" allowFullScreen
            allow="fullscreen" title={module.title}
            style={{ border: 'none' }} />
        </div>
      )
    }

    case 'online_document':
      if (!module.document_url) return <Placeholder label="No document URL provided." />
      return (
        <div className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: 560 }}>
          <iframe src={embedUrl(module.document_url)} className="w-full h-full" title={module.title} />
        </div>
      )

    case 'pdf_document':
    case 'slide_presentation':
      if (!module.document_url) return <Placeholder label="No file uploaded." />
      if (err) return (
        <div className="w-full bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-gray-500">Preview unavailable.</p>
          <a href={module.document_url} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Open file</a>
        </div>
      )
      return (
        <div className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: 560 }}>
          <iframe src={module.document_url} className="w-full h-full" title={module.title}
            onError={() => setErr(true)} />
        </div>
      )

    case 'online_conference':
      if (!module.conference_url) return <Placeholder label="No conference link provided." />
      return (
        <div className="w-full bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-4 py-16">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-blue-700">This is a live online class session.</p>
          <a href={module.conference_url} target="_blank" rel="noopener noreferrer"
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            Join Session
          </a>
        </div>
      )

    case 'text': {
      const body = textBody || module.text_content || ''
      if (!body) return <Placeholder label="No text content provided." />
      return (
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
          {body}
        </div>
      )
    }

    default:
      return null
  }
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
      <p className="text-sm text-gray-400 italic">{label}</p>
    </div>
  )
}

function InfoCard({ label, children, color }: {
  label: string; children: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'yellow'
}) {
  const h = {
    blue: 'text-blue-700', green: 'text-green-700',
    purple: 'text-purple-700', yellow: 'text-yellow-700',
  }[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className={`text-sm font-semibold mb-2 ${h}`}>{label}</h3>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{children as string}</p>
    </div>
  )
}

function ModuleTimer({ moduleId, userRole }: { moduleId: string; userRole?: string }) {
  const isPrivileged = userRole === 'developer' || userRole === 'instructor' || userRole === 'admin'
  const DURATION = 2 * 60 * 60
  const storageKey = `module_timer_remaining_${moduleId}`

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return Math.max(0, parseInt(saved, 10))
    } catch {}
    return DURATION
  })

  const [isActive, setIsActive] = useState(!document.hidden)
  const [countdown, setCountdown] = useState<number | null>(null) // 3→2→1→null

  // Visibility change — pause on hide, start 3s countdown on show
  useEffect(() => {
    if (isPrivileged) return // no tab restriction for developer/instructor/admin
    const handleVisibility = () => {
      if (document.hidden) {
        setIsActive(false)
        setCountdown(null)
      } else {
        // Tab came back — start 3s countdown before resuming
        setCountdown(3)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Countdown 3→2→1→resume
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      setCountdown(null)
      setIsActive(true)
      return
    }
    const id = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  // Main countdown — only ticks when active and no countdown running
  useEffect(() => {
    if (isPrivileged || !isActive || countdown !== null || secondsLeft <= 0) return
    const id = setInterval(() => {
      setSecondsLeft(s => {
        const next = Math.max(0, s - 1)
        try { localStorage.setItem(storageKey, String(next)) } catch {}
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isActive, countdown, secondsLeft])

  const h = Math.floor(secondsLeft / 3600)
  const m = Math.floor((secondsLeft % 3600) / 60)
  const s = secondsLeft % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const urgent = secondsLeft <= 300
  const expired = secondsLeft === 0

  // No timer for privileged roles
  if (isPrivileged) return null

  // Countdown overlay — full-screen centered
  if (countdown !== null) {
    return (
      <>
        {/* Timer badge — paused */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold shrink-0 bg-gray-100 border-gray-200 text-gray-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pad(h)}:{pad(m)}:{pad(s)} ⏸
        </div>
        {/* Full-screen countdown overlay */}
        <div className="fixed inset-0 z-[60] bg-black/70 flex flex-col items-center justify-center gap-4">
          <p className="text-white text-lg font-semibold">Resuming in</p>
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl font-bold text-white border-4 border-white/40"
            style={{ background: 'linear-gradient(135deg, #0f4c5c, #1f7a8c)' }}>
            {countdown}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold shrink-0 ${
      expired ? 'bg-red-50 border-red-200 text-red-600'
      : urgent ? 'bg-amber-50 border-amber-200 text-amber-700'
      : !isActive ? 'bg-gray-100 border-gray-200 text-gray-400'
      : 'bg-gray-50 border-gray-200 text-gray-700'
    }`}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {expired ? 'Time up' : !isActive ? `${pad(h)}:${pad(m)}:${pad(s)} ⏸` : `${pad(h)}:${pad(m)}:${pad(s)}`}
    </div>
  )
}

export default function LessonViewer({
  module, isOpen, onClose, inline = false, siblingModules = [], onNavigate,
  userId, userRole, onQuizPassed, subjectId, courseId
}: LessonViewerProps) {
  if (!module) return null

  let parsed: { body?: string; explanation?: string; key_takeaways?: string; quiz_activity?: string; notes_content?: string; quiz_config?: QuizConfig | null } = {}
  try { parsed = module.text_content ? JSON.parse(module.text_content) : {} } catch { parsed = { body: module.text_content || '' } }

  const textBody      = parsed.body || ''
  const explanation   = module.explanation   || parsed.explanation   || ''
  const key_takeaways = module.key_takeaways || parsed.key_takeaways || ''
  const quiz_activity = module.quiz_activity || parsed.quiz_activity || ''
  const notes_content = module.notes_content || parsed.notes_content || ''
  const quizConfig: QuizConfig | null = parsed.quiz_config ?? null
  const currentIndex  = siblingModules.findIndex(m => m.id === module.id)

  const hasRightPanel = true // always two columns

  const body = (
    <div className="p-5">
      {/* Title row */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">{module.title}</h2>
      </div>

      {/* Two-column layout */}
      <div className={`flex gap-5 items-start ${hasRightPanel ? 'flex-col lg:flex-row' : ''}`}>

        {/* LEFT — content + info cards (60%) */}
        <div className={`space-y-5 ${hasRightPanel ? 'w-full lg:w-[70%]' : 'w-full'}`}>

          {/* Main content embed */}
          <ContentEmbed module={module} textBody={textBody} />
        </div>

        {/* RIGHT — quiz/activity (40%) */}
        <div className="w-full lg:w-[30%] shrink-0 space-y-5">
          {quizConfig && (quizConfig.type === 'quiz' || quizConfig.type === 'exam') ? (
            <QuizPlayer
              key={module.id}
              config={quizConfig}
              moduleId={module.id}
              subjectId={subjectId ?? module.subject_id}
              courseId={courseId}
              userId={userId}
              userRole={userRole}
              onQuizPassed={onQuizPassed}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center min-h-[120px]">
              <p className="text-sm text-gray-400 italic">No quiz / exam for this module.</p>
            </div>
          )}
        </div>
      </div>



    </div>
  )

  if (inline) return <div className="overflow-y-auto">{body}</div>

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">{module.title}</h2>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-3 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{body}</div>
      </div>
    </div>
  )
}
