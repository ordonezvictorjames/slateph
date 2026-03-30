'use client'

import { useState } from 'react'
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
      const src = module.canva_url.includes('/embed')
        ? module.canva_url
        : module.canva_url.replace(/\?.*$/, '') + '?embed'
      return (
        <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-200">
          <iframe src={src} className="w-full h-full" allowFullScreen title={module.title} />
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

export default function LessonViewer({
  module, isOpen, onClose, inline = false, siblingModules = [], onNavigate,
  userId, userRole, subjectId, courseId
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
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">{module.title}</h2>
      </div>

      {/* Two-column layout */}
      <div className={`flex gap-5 items-start ${hasRightPanel ? 'flex-col lg:flex-row' : ''}`}>

        {/* LEFT — content + info cards (60%) */}
        <div className={`space-y-5 ${hasRightPanel ? 'w-full lg:w-[60%]' : 'w-full'}`}>

          {/* Main content embed */}
          <ContentEmbed module={module} textBody={textBody} />
        </div>

        {/* RIGHT — quiz/activity (40%) */}
        <div className="w-full lg:w-[40%] shrink-0 space-y-5">
          {quizConfig && (quizConfig.type === 'quiz' || quizConfig.type === 'exam') ? (
            <QuizPlayer
              config={quizConfig}
              moduleId={module.id}
              subjectId={subjectId ?? module.subject_id}
              courseId={courseId}
              userId={userId}
              userRole={userRole}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center min-h-[120px]">
              <p className="text-sm text-gray-400 italic">No quiz / exam for this module.</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — full-width explanation */}
      {explanation.trim() && (
        <InfoCard label="Explanation / Lesson Body" color="blue">{explanation}</InfoCard>
      )}

      {/* Prev / Next */}
      {siblingModules.length > 1 && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
          <button onClick={() => currentIndex > 0 && onNavigate?.(siblingModules[currentIndex - 1])}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          <span className="text-xs text-gray-400">{currentIndex + 1} / {siblingModules.length}</span>
          <button onClick={() => currentIndex < siblingModules.length - 1 && onNavigate?.(siblingModules[currentIndex + 1])}
            disabled={currentIndex === siblingModules.length - 1}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
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
