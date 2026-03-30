'use client'

import { useState } from 'react'

export type QuizType = 'quiz' | 'exam'

export interface Choice {
  id: string
  text: string
  isCorrect: boolean
}

export interface Question {
  id: string
  text: string
  choices: Choice[]
}

export interface QuizConfig {
  type: QuizType
  title: string
  time_minutes: number
  questions: Question[]
  is_open: boolean
  available_from?: string
  available_until?: string
  instructions?: string
}

export const emptyQuizConfig = (): QuizConfig => ({
  type: 'quiz',
  title: '',
  time_minutes: 30,
  questions: [],
  is_open: true,
  available_from: '',
  instructions: '',
  available_until: '',
})

function newQuestion(): Question {
  return {
    id: crypto.randomUUID(),
    text: '',
    choices: [
      { id: crypto.randomUUID(), text: '', isCorrect: true },
      { id: crypto.randomUUID(), text: '', isCorrect: false },
      { id: crypto.randomUUID(), text: '', isCorrect: false },
      { id: crypto.randomUUID(), text: '', isCorrect: false },
    ],
  }
}

interface Props {
  value: QuizConfig | null
  onChange: (v: QuizConfig | null) => void
}

export default function QuizBuilder({ value, onChange }: Props) {
  const [enabled, setEnabled] = useState(!!value)
  const [scheduleEnabled, setScheduleEnabled] = useState(
    !!(value?.available_from || value?.available_until)
  )

  const cfg = value ?? emptyQuizConfig()

  function update(patch: Partial<QuizConfig>) {
    onChange({ ...cfg, ...patch })
  }

  function toggleEnabled(on: boolean) {
    setEnabled(on)
    onChange(on ? emptyQuizConfig() : null)
  }

  function addQuestion() {
    update({ questions: [...cfg.questions, newQuestion()] })
  }

  function removeQuestion(qid: string) {
    update({ questions: cfg.questions.filter(q => q.id !== qid) })
  }

  function updateQuestion(qid: string, patch: Partial<Question>) {
    update({
      questions: cfg.questions.map(q => q.id === qid ? { ...q, ...patch } : q),
    })
  }

  function updateChoice(qid: string, cid: string, patch: Partial<Choice>) {
    updateQuestion(qid, {
      choices: cfg.questions.find(q => q.id === qid)!.choices.map(c =>
        c.id === cid ? { ...c, ...patch } : c
      ),
    })
  }

  function setCorrect(qid: string, cid: string) {
    updateQuestion(qid, {
      choices: cfg.questions.find(q => q.id === qid)!.choices.map(c => ({
        ...c, isCorrect: c.id === cid,
      })),
    })
  }

  function addChoice(qid: string) {
    updateQuestion(qid, {
      choices: [
        ...cfg.questions.find(q => q.id === qid)!.choices,
        { id: crypto.randomUUID(), text: '', isCorrect: false },
      ],
    })
  }

  function removeChoice(qid: string, cid: string) {
    const q = cfg.questions.find(q => q.id === qid)!
    if (q.choices.length <= 2) return
    updateQuestion(qid, { choices: q.choices.filter(c => c.id !== cid) })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🧪 Quiz / Activity</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-500">{enabled ? 'Enabled' : 'Disabled'}</span>
          <div
            onClick={() => toggleEnabled(!enabled)}
            className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${enabled ? 'bg-[#1f7a8c]' : 'bg-gray-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {!enabled && (
        <p className="text-xs text-gray-400 italic">No quiz or exam attached to this module.</p>
      )}

      {enabled && (
        <div className="space-y-4">
          {/* Type + title row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-black mb-1">Type *</label>
              <select value={cfg.type} onChange={e => update({ type: e.target.value as QuizType })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]">
                <option value="quiz">Quiz</option>
                <option value="exam">Exam</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-black mb-1">Title</label>
              <input type="text" value={cfg.title}
                onChange={e => update({ title: e.target.value })}
                placeholder={cfg.type === 'quiz' ? 'e.g. Lesson Quiz' : 'e.g. Midterm Exam'}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" />
            </div>
          </div>

          {/* Settings row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-black mb-1">Time limit (min)</label>
              <input type="number" min={1} value={cfg.time_minutes}
                onChange={e => update({ time_minutes: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-black mb-1">Questions</label>
              <div className="px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                {cfg.questions.length} added
              </div>
            </div>
          </div>

          {/* Schedule — with toggle */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">📅 Schedule</p>
                <p className="text-xs text-gray-400">
                  {scheduleEnabled ? 'Set when students can access this.' : 'Always available to students.'}
                </p>
              </div>
              <div
                onClick={() => {
                  const next = !scheduleEnabled
                  setScheduleEnabled(next)
                  if (!next) update({ available_from: '', available_until: '' })
                }}
                className={`w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${scheduleEnabled ? 'bg-[#1f7a8c]' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${scheduleEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>

            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Available from</label>
                  <input type="datetime-local" value={cfg.available_from || ''}
                    onChange={e => update({ available_from: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Available until</label>
                  <input type="datetime-local" value={cfg.available_until || ''}
                    onChange={e => update({ available_until: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" />
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-medium text-black mb-1">Instructions</label>
            <textarea
              rows={3}
              value={cfg.instructions || ''}
              onChange={e => update({ instructions: e.target.value })}
              placeholder="Enter test instructions for students..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none"
            />
          </div>

          {/* Questions */}
          <div className="space-y-3">
            {cfg.questions.map((q, qi) => (
              <div key={q.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-500 mt-2 shrink-0">Q{qi + 1}.</span>
                  <input
                    type="text"
                    value={q.text}
                    onChange={e => updateQuestion(q.id, { text: e.target.value })}
                    placeholder="Enter question..."
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] bg-white"
                  />
                  <button type="button" onClick={() => removeQuestion(q.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Choices */}
                <div className="space-y-1.5 pl-6">
                  {q.choices.map((c, ci) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={c.isCorrect}
                        onChange={() => setCorrect(q.id, c.id)}
                        className="accent-[#1f7a8c] shrink-0"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={c.text}
                        onChange={e => updateChoice(q.id, c.id, { text: e.target.value })}
                        placeholder={`Choice ${ci + 1}`}
                        className={`flex-1 px-2 py-1 text-xs border rounded-md focus:ring-1 focus:ring-[#1f7a8c] bg-white ${c.isCorrect ? 'border-green-400' : 'border-gray-300'}`}
                      />
                      <button type="button" onClick={() => removeChoice(q.id, c.id)}
                        disabled={q.choices.length <= 2}
                        className="p-0.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addChoice(q.id)}
                    className="text-xs text-[#1f7a8c] hover:underline mt-1">
                    + Add choice
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={addQuestion}
              className="w-full py-2 text-xs font-medium text-[#1f7a8c] border border-dashed border-[#1f7a8c] rounded-lg hover:bg-[#1f7a8c]/5 transition-colors">
              + Add question
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
