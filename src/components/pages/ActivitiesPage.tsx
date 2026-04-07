'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/loading'

interface PendingQuiz {
  id: string
  title: string
  course_title: string
  quiz_type: 'quiz' | 'exam'
  available_from?: string
  available_until?: string
  time_minutes: number
  questions_count: number
  status: 'open' | 'upcoming' | 'closing_soon' | 'ended'
  score?: number
  total?: number
  percentage?: number
  passed?: boolean
  submitted: boolean
}

export default function ActivitiesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [activities, setActivities] = useState<PendingQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'upcoming' | 'ended'>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')

  useEffect(() => { fetchActivities() }, [user])

  const fetchActivities = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const role = user?.profile?.role
      const roleToEnrollmentType: Record<string, string> = {
        jhs_student: 'jhs_student', shs_student: 'shs_student',
        college_student: 'college_student', scholar: 'tesda_scholar', instructor: 'instructor',
      }
      const enrollmentType = roleToEnrollmentType[role ?? ''] ?? role
      const profile = user?.profile as any

      // Get enrolled course IDs
      const [{ data: schedEnrollments }, { data: courseEnrollments }] = await Promise.all([
        supabase.from('schedule_enrollments').select('schedule_id').eq('user_id', user.id),
        supabase.from('course_enrollments').select('course_id').eq('trainee_id', user.id).eq('status', 'active'),
      ])

      const scheduleIds = (schedEnrollments || []).map((e: any) => e.schedule_id)
      const directCourseIds = (courseEnrollments || []).map((e: any) => e.course_id)

      const courseMap: Record<string, string> = {}

      if (scheduleIds.length > 0) {
        const { data: schedData } = await supabase
          .from('course_schedules').select('course_id, course:courses(title)')
          .in('id', scheduleIds)
        ;(schedData || []).forEach((s: any) => { if (s.course_id) courseMap[s.course_id] = s.course?.title || '' })
      }
      if (directCourseIds.length > 0) {
        const { data: directCourses } = await supabase.from('courses').select('id, title').in('id', directCourseIds)
        ;(directCourses || []).forEach((c: any) => { courseMap[c.id] = c.title })
      }

      // Also match by profile
      if (enrollmentType) {
        const { data: profileSchedules } = await supabase
          .from('course_schedules').select('course_id, course:courses(title)')
          .eq('enrollment_type', enrollmentType).in('status', ['scheduled', 'active'])
        ;(profileSchedules || []).forEach((s: any) => {
          if (s.course_id && !courseMap[s.course_id]) courseMap[s.course_id] = s.course?.title || ''
        })
      }

      const courseIds = Object.keys(courseMap)
      if (courseIds.length === 0) { setActivities([]); setLoading(false); return }

      const { data: subjects } = await supabase.from('subjects').select('id, course_id').in('course_id', courseIds)
      const subjectIds = (subjects || []).map((s: any) => s.id)
      const subjectCourseMap: Record<string, string> = {}
      ;(subjects || []).forEach((s: any) => { subjectCourseMap[s.id] = s.course_id })

      if (subjectIds.length === 0) { setActivities([]); setLoading(false); return }

      const { data: modules } = await supabase
        .from('modules').select('id, title, subject_id, text_content').in('subject_id', subjectIds).eq('status', 'active')

      const { data: submitted } = await supabase.from('quiz_grades').select('module_id, score, total, percentage, passed').eq('user_id', user.id)
      const gradeMap: Record<string, { score: number; total: number; percentage: number; passed: boolean }> = {}
      ;(submitted || []).forEach((g: any) => { gradeMap[g.module_id] = { score: g.score, total: g.total, percentage: g.percentage, passed: g.passed } })

      const now = new Date()
      const pending: PendingQuiz[] = []

      ;(modules || []).forEach((m: any) => {
        try {
          const parsed = m.text_content ? JSON.parse(m.text_content) : {}
          const qc = parsed.quiz_config ? (typeof parsed.quiz_config === 'string' ? JSON.parse(parsed.quiz_config) : parsed.quiz_config) : null
          if (!qc || !qc.questions || qc.questions.length === 0) return

          const from = qc.available_from ? new Date(qc.available_from) : null
          const until = qc.available_until ? new Date(qc.available_until) : null
          const isUpcoming = from && from > now
          const isEnded = until && until < now
          const isOpen = (!from || from <= now) && (!until || until >= now)

          let status: 'open' | 'upcoming' | 'closing_soon' | 'ended'
          if (isEnded) {
            status = 'ended'
          } else if (isUpcoming) {
            status = 'upcoming'
          } else {
            status = 'open'
            if (until) {
              const hoursLeft = (until.getTime() - now.getTime()) / (1000 * 60 * 60)
              if (hoursLeft <= 24) status = 'closing_soon'
            }
          }

          const courseId = subjectCourseMap[m.subject_id]
          const grade = gradeMap[m.id]
          pending.push({
            id: m.id,
            title: qc.title || m.title,
            course_title: courseMap[courseId] || '',
            quiz_type: qc.type || 'quiz',
            available_from: qc.available_from,
            available_until: qc.available_until,
            time_minutes: qc.time_minutes || 30,
            questions_count: qc.questions.length,
            status,
            score: grade?.score,
            total: grade?.total,
            percentage: grade?.percentage,
            passed: grade?.passed,
            submitted: !!grade,
          })
        } catch {}
      })

      pending.sort((a, b) => {
        const aDate = a.available_from ? new Date(a.available_from).getTime() : 0
        const bDate = b.available_from ? new Date(b.available_from).getTime() : 0
        return aDate - bDate
      })
      setActivities(pending)
    } catch (e) {
      console.error('Error fetching activities:', e)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'

  // Unique course titles for the course filter
  const courseOptions = Array.from(new Set(activities.map(a => a.course_title).filter(Boolean)))

  const statusFiltered = filter === 'all' ? activities
    : filter === 'open' ? activities.filter(a => a.status === 'open' || a.status === 'closing_soon')
    : filter === 'upcoming' ? activities.filter(a => a.status === 'upcoming')
    : activities.filter(a => a.status === 'ended')

  const filtered = courseFilter === 'all' ? statusFiltered : statusFiltered.filter(a => a.course_title === courseFilter)

  if (loading) return <Loading />

  return (
    <div className="p-6 md:p-8">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Activities</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your current and upcoming quizzes & exams</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(['all', 'open', 'upcoming', 'ended'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${filter === f ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filter === f ? { background: '#0f4c5c' } : {}}
          >
            {f === 'all' ? `All (${activities.length})`
              : f === 'open' ? `Open (${activities.filter(a => a.status === 'open' || a.status === 'closing_soon').length})`
              : f === 'upcoming' ? `Upcoming (${activities.filter(a => a.status === 'upcoming').length})`
              : `Ended (${activities.filter(a => a.status === 'ended').length})`}
          </button>
        ))}

        {/* Course filter inline */}
        {courseOptions.length > 0 && (
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:outline-none"
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Courses</option>
            {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No activities found</p>
          <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${a.quiz_type === 'exam' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {a.quiz_type}
                    </span>
                    {a.status === 'closing_soon' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Closing Soon</span>
                    )}
                    {a.status === 'upcoming' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Upcoming</span>
                    )}
                    {a.status === 'open' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Open</span>
                    )}
                    {a.status === 'ended' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Ended</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate">{a.title}</h3>
                  <p className="text-xs text-gray-500 truncate">{a.course_title}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Questions</p>
                  <p className="font-semibold text-gray-700">{a.questions_count}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Time Limit</p>
                  <p className="font-semibold text-gray-700">{a.time_minutes} min</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Opens</p>
                  <p className="font-semibold text-gray-700">{fmt(a.available_from)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Closes</p>
                  <p className="font-semibold text-gray-700">{fmt(a.available_until)}</p>
                </div>
              </div>
              {a.submitted && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Score</p>
                    <p className="text-sm font-bold" style={{ color: '#0f4c5c' }}>
                      {a.score}/{a.total} <span className="text-xs font-semibold text-gray-500">({a.percentage?.toFixed(0)}%)</span>
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {a.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
