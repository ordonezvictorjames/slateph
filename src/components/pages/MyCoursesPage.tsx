'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/loading'
import LessonViewer from '@/components/LessonViewer'
import QuizBuilder, { QuizConfig } from '@/components/QuizBuilder'

interface Course {
  id: string
  title: string
  description: string
  course_group?: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  created_at: string
  thumbnail_url?: string
}

interface Subject {
  id: string
  course_id: string
  title: string
  description: string
  order_index: number
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  instructor_id?: string
  online_class_link?: string
  created_at: string
  instructor?: { first_name: string; last_name: string }
  instructor_name?: string
  thumbnail_url?: string
}

interface Module {
  id: string
  subject_id: string
  title: string
  description: string
  content_type: 'video' | 'text' | 'canva_presentation' | 'online_conference' | 'online_document' | 'pdf_document' | 'slide_presentation'
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
  order_index: number
  duration_minutes?: number
  status?: 'active' | 'inactive' | 'draft'
  created_at: string
  thumbnail_url?: string
}

type ViewType = 'courses' | 'subjects' | 'lesson'

export default function MyCoursesPage({ initialCourseId }: { initialCourseId?: string }) {
  const { user } = useAuth()
  const supabase = createClient()

  const role = user?.profile?.role || ''
  const isAdmin = role === 'admin' || role === 'developer'
  const isDeveloper = role === 'developer'
  const isStudent = ['shs_student', 'jhs_student', 'college_student', 'scholar'].includes(role)

  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [currentView, setCurrentView] = useState<ViewType>('courses')
  const [loading, setLoading] = useState(true)
  const [courseSearch, setCourseSearch] = useState('')
  const [showCourseSearch, setShowCourseSearch] = useState(false)
  const [courseFilter, setCourseFilter] = useState<'all' | 'active' | 'inactive' | 'draft'>('all')

  // Accordion state
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [subjectModules, setSubjectModules] = useState<Record<string, Module[]>>({})
  const [subjectModulesLoading, setSubjectModulesLoading] = useState<Set<string>>(new Set())
  const [highlightedSubjectId, setHighlightedSubjectId] = useState<string | null>(null)
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  const [courseEnrolledCount, setCourseEnrolledCount] = useState(0)
  const [courseInstructorCount, setCourseInstructorCount] = useState(0)
  const [courseRankings, setCourseRankings] = useState<Array<{ user_id: string; first_name: string; last_name: string; total_score: number }>>([])
  const [loadingRankings, setLoadingRankings] = useState(false)
  // Cross-course accumulated badge counts (badge_type → count)
  const [earnedBadgeCounts, setEarnedBadgeCounts] = useState<Record<string, number>>({})
  // Track opened/completed modules per student (persisted in localStorage)
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set())
  // Test modal state (admin/developer/instructor)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testModule, setTestModule] = useState<Module | null>(null)
  const [testQuizConfig, setTestQuizConfig] = useState<QuizConfig | null>(null)
  const [savingTest, setSavingTest] = useState(false)

  // Module progress: { [moduleId]: { timeSpentSeconds: number, quizSubmitted: boolean } }
  const [moduleProgress, setModuleProgress] = useState<Record<string, { timeSpentSeconds: number; quizSubmitted: boolean }>>({})

  const REQUIRED_READ_SECONDS = 2 * 60 * 60 // 2 hours

  // Helper: check if a module has a quiz/exam embedded
  const moduleHasQuiz = (mod: Module): boolean => {
    if (!mod.text_content) return false
    try {
      const parsed = JSON.parse(mod.text_content)
      return parsed.quiz_config?.type === 'quiz' || parsed.quiz_config?.type === 'exam'
    } catch { return false }
  }

  // Helper: check if a module is fully completed
  const isModuleCompleted = (mod: Module): boolean => {
    const prog = moduleProgress[mod.id]
    const timeOk = (prog?.timeSpentSeconds ?? 0) >= REQUIRED_READ_SECONDS
    const quizRequired = moduleHasQuiz(mod)
    const quizOk = !quizRequired || (prog?.quizSubmitted ?? false)
    return timeOk && quizOk
  }

  // Save progress to localStorage
  const saveProgress = (updated: Record<string, { timeSpentSeconds: number; quizSubmitted: boolean }>) => {
    if (!user?.id) return
    try { localStorage.setItem(`module_progress_${user.id}`, JSON.stringify(updated)) } catch {}
  }

  // Called by LessonViewer when active time accumulates
  const handleTimeUpdate = (moduleId: string, seconds: number) => {
    setModuleProgress(prev => {
      const updated = { ...prev, [moduleId]: { ...prev[moduleId], timeSpentSeconds: seconds, quizSubmitted: prev[moduleId]?.quizSubmitted ?? false } }
      saveProgress(updated)
      // If now completed, mark in completedModules
      const mod = Object.values(subjectModules).flat().find(m => m.id === moduleId)
      if (mod) {
        const prog = updated[moduleId]
        const timeOk = prog.timeSpentSeconds >= REQUIRED_READ_SECONDS
        const quizRequired = moduleHasQuiz(mod)
        const quizOk = !quizRequired || prog.quizSubmitted
        if (timeOk && quizOk) {
          setCompletedModules(cp => {
            const next = new Set(cp)
            next.add(moduleId)
            try { localStorage.setItem(`completed_modules_${user!.id}`, JSON.stringify(Array.from(next))) } catch {}
            return next
          })
        }
      }
      return updated
    })
  }

  // Called by QuizPlayer when quiz is submitted
  const handleQuizSubmitted = (moduleId: string) => {
    setModuleProgress(prev => {
      const updated = { ...prev, [moduleId]: { timeSpentSeconds: prev[moduleId]?.timeSpentSeconds ?? 0, quizSubmitted: true } }
      saveProgress(updated)
      const mod = Object.values(subjectModules).flat().find(m => m.id === moduleId)
      if (mod) {
        const prog = updated[moduleId]
        const timeOk = prog.timeSpentSeconds >= REQUIRED_READ_SECONDS
        if (timeOk) {
          setCompletedModules(cp => {
            const next = new Set(cp)
            next.add(moduleId)
            try { localStorage.setItem(`completed_modules_${user!.id}`, JSON.stringify(Array.from(next))) } catch {}
            return next
          })
        }
      }
      return updated
    })
  }

  useEffect(() => {
    if (user?.id) fetchEnrolledCourses()
  }, [user])

  // Load completed modules from localStorage for this student
  useEffect(() => {
    if (!user?.id || !isStudent) return
    const key = `completed_modules_${user.id}`
    try {
      const saved = localStorage.getItem(key)
      if (saved) setCompletedModules(new Set(JSON.parse(saved)))
    } catch {}
    const progKey = `module_progress_${user.id}`
    try {
      const saved = localStorage.getItem(progKey)
      if (saved) setModuleProgress(JSON.parse(saved))
    } catch {}
  }, [user?.id, isStudent])

  // Load accumulated earned badge counts from DB
  useEffect(() => {
    if (!user?.id || (!isStudent && !isAdmin)) return
    if (isAdmin) {
      // Developer/admin: fetch actual totals for modules, subjects, courses
      Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('modules').select('id', { count: 'exact', head: true }),
      ]).then(([c, s, m]) => {
        const nc = c.count || 1
        const ns = s.count || 1
        const nm = m.count || 1
        setEarnedBadgeCounts({ bronze: nc, silver: nc, gold: nc, courses: nc, subjects: ns, modules: nm, cobot: nc })
      })
      return
    }
    supabase.from('user_badges').select('badge_type').eq('user_id', user.id).then(({ data }: { data: { badge_type: string }[] | null }) => {
      if (data) {
        const counts: Record<string, number> = {}
        data.forEach(r => { counts[r.badge_type] = (counts[r.badge_type] || 0) + 1 })
        setEarnedBadgeCounts(counts)
      }
    })
  }, [user?.id, isStudent, isAdmin])

  // Auto-select course when navigated from dashboard
  useEffect(() => {
    if (initialCourseId && courses.length > 0 && !selectedCourse) {
      const course = courses.find(c => c.id === initialCourseId)
      if (course) handleCourseSelect(course)
    }
  }, [initialCourseId, courses])

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true)
      let courseIds: string[] = []
      if (role === 'instructor' || isAdmin) {
        if (isAdmin) {
          const { data: all } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
          const list = all || []
          setCourses(list)
          if (list.length > 0) setPreviewCourse(list[0])
          setLoading(false)
          return
        }
        const { data } = await supabase.from('subjects').select('course_id').eq('instructor_id', user?.id)
        const ids = new Set<string>((data || []).map((s: { course_id: string }) => s.course_id))
        courseIds = Array.from(ids)
      } else {
        const { data } = await supabase.from('course_enrollments').select('course_id').eq('trainee_id', user?.id).eq('status', 'active')
        courseIds = (data || []).map((e: { course_id: string }) => e.course_id)
      }
      if (courseIds.length === 0) { setCourses([]); setLoading(false); return }
      const { data: coursesData } = await supabase.from('courses').select('*').in('id', courseIds).order('created_at', { ascending: false })
      const list = coursesData || []
      setCourses(list)
      if (list.length > 0) setPreviewCourse(list[0])
    } catch (e) {
      console.error('Error fetching courses:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async (courseId: string) => {
    const { data } = await supabase.from('subjects').select('*, instructor:profiles(first_name, last_name)').eq('course_id', courseId).order('order_index', { ascending: true })
    const mapped = (data || []).map((s: Subject) => ({ ...s, instructor_name: s.instructor ? `${s.instructor.first_name} ${s.instructor.last_name}` : 'Unassigned' }))
    setSubjects(mapped)
  }

  const fetchAllModulesForCourse = async (courseId: string) => {
    const { data } = await supabase.from('modules').select('*, subjects!inner(course_id)').eq('subjects.course_id', courseId).order('order_index', { ascending: true })
    const grouped: Record<string, Module[]> = {}
    for (const mod of (data || [])) {
      if (!grouped[mod.subject_id]) grouped[mod.subject_id] = []
      grouped[mod.subject_id].push(mod)
    }
    setSubjectModules(grouped)
  }

  const fetchCourseOverview = async (courseId: string) => {
    const { count } = await supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('course_id', courseId)
    setCourseEnrolledCount(count || 0)
    const { data: subjectData } = await supabase.from('subjects').select('instructor_id').eq('course_id', courseId).not('instructor_id', 'is', null)
    const uniqueIds = Array.from(new Set((subjectData || []).map((s: { instructor_id: string }) => s.instructor_id).filter(Boolean)))
    setCourseInstructorCount(uniqueIds.length)
    // Rankings
    setLoadingRankings(true)
    try {
      const { data: gradesData } = await supabase.from('quiz_grades').select('user_id, percentage').eq('course_id', courseId)
      if (gradesData && gradesData.length > 0) {
        const map: Record<string, number> = {}
        gradesData.forEach((g: { user_id: string; percentage: number }) => { map[g.user_id] = (map[g.user_id] || 0) + g.percentage })
        const userIds = Object.keys(map)
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
        const ranked = userIds.map(uid => {
          const p = (profiles || []).find((x: { id: string }) => x.id === uid)
          return { user_id: uid, first_name: p?.first_name || '', last_name: p?.last_name || '', total_score: Math.round(map[uid]) }
        }).sort((a, b) => b.total_score - a.total_score)
        setCourseRankings(ranked)
      } else { setCourseRankings([]) }
    } catch { setCourseRankings([]) }
    finally { setLoadingRankings(false) }
  }

  const [previewSubjects, setPreviewSubjects] = useState<Subject[]>([])
  const [previewSubjectsLoading, setPreviewSubjectsLoading] = useState(false)

  useEffect(() => {
    if (previewCourse) {
      fetchPreviewSubjects(previewCourse.id)
      fetchAllModulesForCourse(previewCourse.id)
    } else {
      setPreviewSubjects([])
    }
  }, [previewCourse])

  const fetchPreviewSubjects = async (courseId: string) => {
    setPreviewSubjectsLoading(true)
    try {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })
      setPreviewSubjects(data || [])
    } finally {
      setPreviewSubjectsLoading(false)
    }
  }

  const handleOpenSubjectFromPreview = async (course: Course, subjectId: string) => {
    setSelectedCourse(course)
    setCurrentView('subjects')
    setHighlightedSubjectId(subjectId)
    setExpandedSubjects(new Set([subjectId]))
    setSubjectModules({})
    setSubjectModulesLoading(new Set([subjectId]))
    setCourseEnrolledCount(0)
    setCourseInstructorCount(0)
    fetchSubjects(course.id)
    fetchAllModulesForCourse(course.id)
    fetchCourseOverview(course.id)
    try {
      const { data } = await supabase.from('modules').select('*').eq('subject_id', subjectId).order('order_index', { ascending: true })
      if (data) updateSubjectModules(subjectId, data)
    } finally {
      setSubjectModulesLoading(new Set())
    }
  }
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course)
    setCurrentView('subjects')
    setExpandedSubjects(new Set())
    setSubjectModules({})
    setHighlightedSubjectId(null)
    setCourseEnrolledCount(0)
    setCourseInstructorCount(0)
    fetchSubjects(course.id)
    fetchAllModulesForCourse(course.id)
    fetchCourseOverview(course.id)
  }

  const handleBackToCourses = () => { setCurrentView('courses'); setSelectedCourse(null); setSelectedModule(null) }
  const handleBackToSubjects = () => { setCurrentView('subjects'); setSelectedModule(null) }
  const handleStartLesson = (mod: Module) => {
    setSelectedModule(mod)
    setCurrentView('lesson')
    // Module completion is only set via handleTimeUpdate / handleQuizSubmitted — NOT on open
  }

  const handleOpenTest = (mod: Module) => {
    setTestModule(mod)
    let parsed: any = {}
    try { parsed = mod.text_content ? JSON.parse(mod.text_content) : {} } catch { parsed = {} }
    let quizConfig = null
    try { quizConfig = parsed.quiz_config ? (typeof parsed.quiz_config === 'string' ? JSON.parse(parsed.quiz_config) : parsed.quiz_config) : null } catch { quizConfig = null }
    setTestQuizConfig(quizConfig)
    setShowTestModal(true)
  }

  const updateSubjectModules = (subjectId: string, data: Module[]) => {
    setSubjectModules(prev => ({ ...prev, [subjectId]: data }))
  }

  const handleSaveTest = async () => {
    if (!testModule) return
    setSavingTest(true)
    try {
      let parsed: any = {}
      try { parsed = testModule.text_content ? JSON.parse(testModule.text_content) : {} } catch { parsed = {} }
      const updated = { ...parsed, quiz_config: testQuizConfig || null }
      const { error } = await supabase.from('modules').update({ text_content: JSON.stringify(updated) }).eq('id', testModule.id)
      if (error) { alert('Failed to save test: ' + error.message); return }
      if (testModule.subject_id) {
        const { data } = await supabase.from('modules').select('*').eq('subject_id', testModule.subject_id).order('order_index', { ascending: true })
        if (data) updateSubjectModules(testModule.subject_id, data)
      }
      setShowTestModal(false); setTestModule(null); setTestQuizConfig(null)
    } catch { alert('Failed to save test.') }
    finally { setSavingTest(false) }
  }

  const toggleSubjectExpand = async (subject: Subject) => {
    if (!isAdmin && subject.status !== 'active') return
    const isCurrentlyExpanded = expandedSubjects.has(subject.id)
    if (isCurrentlyExpanded) {
      setExpandedSubjects(new Set())
      setHighlightedSubjectId(null)
    } else {
      setExpandedSubjects(new Set([subject.id]))
      setHighlightedSubjectId(subject.id)
      if (!subjectModules[subject.id]) {
        setSubjectModulesLoading(prev => new Set(prev).add(subject.id))
        const { data } = await supabase.from('modules').select('*').eq('subject_id', subject.id).order('order_index', { ascending: true })
        if (data) updateSubjectModules(subject.id, data)
        setSubjectModulesLoading(prev => { const s = new Set(prev); s.delete(subject.id); return s })
      }
    }
  }

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return '▶'
      case 'pdf_document': return '📄'
      case 'slide_presentation': return '📊'
      case 'canva_presentation': return '🎨'
      case 'online_conference': return '📹'
      case 'online_document': return '🔗'
      default: return '📝'
    }
  }

  if (loading) return <div className="p-8 flex items-center justify-center h-64"><Loading size="lg" /></div>

  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumb */}
      {currentView !== 'courses' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={handleBackToCourses} className="hover:text-gray-700">My Courses</button>
          {selectedCourse && (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <button onClick={handleBackToSubjects} className={`hover:text-gray-700 ${currentView === 'subjects' ? 'text-gray-900 font-medium' : ''}`}>{selectedCourse.title}</button>
            </>
          )}
          {currentView === 'lesson' && selectedModule && (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="text-gray-900 font-medium">{selectedModule.title}</span>
            </>
          )}
        </div>
      )}

      {/* Courses View — two-panel layout */}
      {currentView === 'courses' && (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-100px)] gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">

          {/* Left Panel */}
          <div className={`w-full lg:w-[40%] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 ${previewCourse ? 'hidden lg:flex' : 'flex'}`} style={{ minHeight: 0 }}>
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
                <button
                  onClick={() => { setShowCourseSearch(s => !s); if (showCourseSearch) setCourseSearch('') }}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${showCourseSearch ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
                </button>
              </div>
              {!isStudent && (
                <div className="flex items-center gap-4 text-sm">
                  {(['all', 'active', 'draft', 'inactive'] as const).map(f => (
                    <button key={f} onClick={() => setCourseFilter(f)}
                      className={`pb-1 border-b-2 transition-colors capitalize font-medium ${courseFilter === f ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              {showCourseSearch && (
                <div className="relative mt-2">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
                  <input autoFocus type="text" placeholder="Search courses..." value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400" />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <p className="text-sm font-medium text-gray-500 mb-1">No courses yet</p>
                  <p className="text-xs text-gray-400">Contact your administrator to get enrolled.</p>
                </div>
              ) : (
                courses.filter(c => {
                  const matchesFilter = isStudent || courseFilter === 'all' || c.status === courseFilter
                  const matchesSearch = !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase())
                  return matchesFilter && matchesSearch
                }).map((course) => {
                  const isSelected = previewCourse?.id === course.id
                  return (
                    <div key={course.id} onClick={() => setPreviewCourse(course)}
                      className={`flex items-center gap-4 px-4 py-5 cursor-pointer border-b border-gray-100 transition-all shadow-sm hover:shadow-md ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{course.title}</p>
                        {course.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{course.description}</p>}
                        {!isStudent && (
                          <span className={`inline-flex mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                            course.status === 'active' ? 'text-white border-[#1f7a8c]' : 'bg-white text-[#1f7a8c] border-[#1f7a8c]'
                          }`} style={course.status === 'active' ? { backgroundColor: '#1f7a8c' } : {}}>
                            {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className={`w-full lg:w-[60%] flex flex-col overflow-hidden ${previewCourse ? 'flex' : 'hidden lg:flex'}`}>
            {!previewCourse ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <p className="text-gray-400 text-sm">Select a course to view details</p>
              </div>
            ) : (() => {
              const c = previewCourse
              return (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex-shrink-0">
                    <div className="lg:hidden px-4 py-2 border-b border-gray-100">
                      <button onClick={() => setPreviewCourse(null)} className="flex items-center gap-1.5 text-sm text-[#1f7a8c] font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back to courses
                      </button>
                    </div>
                    <div className="relative w-full" style={{ height: '200px' }}>
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt={c.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600" />
                      )}
                    </div>
                    <div className="px-6 pt-4 pb-3 border-b border-gray-100">
                      <h2 className="text-xl font-bold text-gray-900">{c.title}</h2>
                      {c.description && <p className="text-sm text-gray-500 leading-relaxed mt-1 line-clamp-2">{c.description}</p>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 pt-3">
                    {/* Subjects preview */}
                    {previewSubjectsLoading ? (
                      <div className="flex justify-center py-8"><svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg></div>
                    ) : previewSubjects.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                        No subjects yet. <button onClick={() => handleCourseSelect(c)} className="text-[#1f7a8c] hover:underline">Open course</button> to view.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...previewSubjects].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((subj, idx, sortedList) => {
                          const colors = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']
                          const bg = colors[idx % colors.length]

                          // Sequential locking for students
                          const prevSubj = idx > 0 ? sortedList[idx - 1] : null
                          const prevMods = prevSubj ? (subjectModules[prevSubj.id] || []) : []
                          const prevModsLoaded = prevSubj ? (prevSubj.id in subjectModules) : true
                          const prevSubjDone = !prevSubj || (prevModsLoaded && (prevMods.length === 0 || prevMods.every(m => completedModules.has(m.id))))
                          const isPreviewSubjLocked = isStudent && idx > 0 && !prevSubjDone

                          return (
                            <div key={subj.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isPreviewSubjLocked ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:bg-gray-50'}`}>
                              <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                {subj.thumbnail_url ? (
                                  <img src={subj.thumbnail_url} alt={subj.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${bg}20` }}>
                                    <svg className="w-5 h-5" fill="none" stroke={bg} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{subj.title}</p>
                                {isPreviewSubjLocked && prevSubj ? (
                                  <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    Complete &ldquo;{prevSubj.title}&rdquo; first
                                  </p>
                                ) : isStudent && (() => {
                                  const mods = subjectModules[subj.id] || []
                                  if (mods.length === 0) return null
                                  const done = mods.filter(m => completedModules.has(m.id)).length
                                  const pct = Math.round((done / mods.length) * 100)
                                  const isComplete = pct === 100
                                  return (
                                    <span className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold ${isComplete ? 'text-green-600' : 'text-gray-500'}`}>
                                      {isComplete && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                      {pct}% complete
                                    </span>
                                  )
                                })()}
                              </div>
                              {!isPreviewSubjLocked && (!isStudent || subj.status === 'active') && (
                                <button
                                  onClick={() => handleOpenSubjectFromPreview(c, subj.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
                                  style={{ backgroundColor: '#1f7a8c' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                                >
                                  <svg className="w-3.5 h-3.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </button>
                              )}
                              {isPreviewSubjLocked && (
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Subjects View */}
      {currentView === 'subjects' && selectedCourse && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="relative h-32 sm:h-52 w-full">
              {selectedCourse.thumbnail_url ? (
                <img src={selectedCourse.thumbnail_url} alt={selectedCourse.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">{selectedCourse.title}</h2>
                  <p className="text-xs text-white/70 mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            {isAdmin && (
            <div className="bg-white px-4 py-2 flex items-center gap-6 border-t border-gray-100">
              <span className="text-xs text-gray-500">{subjects.length} Total</span>
              <span className="text-xs text-green-600">{subjects.filter(s => s.status === 'active').length} Active</span>
              <span className="text-xs text-yellow-600">{subjects.filter(s => s.status === 'draft').length} Draft</span>
              <span className="text-xs text-red-500">{subjects.filter(s => s.status === 'inactive').length} Inactive</span>
            </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
            <div className="w-full lg:flex-[7] lg:min-w-0 lg:flex lg:flex-col">
              <div className="overflow-y-auto overflow-x-visible border border-gray-200 rounded-xl bg-white p-2 sm:p-3 lg:flex-1">
                <div className="flex items-center gap-1 mb-3 p-1 bg-gray-100 rounded-lg w-fit">
                  <button onClick={() => setShowActiveOnly(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!showActiveOnly ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    style={!showActiveOnly ? { backgroundColor: '#1f7a8c' } : {}}>All Subjects</button>
                  <button onClick={() => setShowActiveOnly(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${showActiveOnly ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    style={showActiveOnly ? { backgroundColor: '#1f7a8c' } : {}}>Active Only</button>
                </div>
                {(() => {
                  const visibleSubjects = showActiveOnly ? subjects.filter(s => s.status === 'active') : subjects
                  return visibleSubjects.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-sm text-gray-500">No subjects available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleSubjects.map((subject, subjectIdx) => {
                        const isExpanded = expandedSubjects.has(subject.id)
                        const mods = subjectModules[subject.id] || []
                        const isLoadingMods = subjectModulesLoading.has(subject.id)

                        // Sequential subject locking for students
                        const prevSubject = subjectIdx > 0 ? visibleSubjects[subjectIdx - 1] : null
                        const prevMods = prevSubject ? (subjectModules[prevSubject.id] || []) : []
                        const prevModsLoaded = prevSubject ? (prevSubject.id in subjectModules) : true
                        // Unlocked only when: no prev subject, OR prev modules loaded AND (zero modules OR all completed)
                        const prevSubjectDone = !prevSubject || (prevModsLoaded && (prevMods.length === 0 || prevMods.every(m => completedModules.has(m.id))))
                        const isSubjectSequentiallyLocked = isStudent && subjectIdx > 0 && !prevSubjectDone

                        const isLocked = isSubjectSequentiallyLocked || (!isAdmin && subject.status !== 'active')
                        const isHighlighted = highlightedSubjectId === subject.id
                        return (
                          <div key={subject.id} className="rounded-xl border border-gray-200 bg-white">
                          <div
                              className={`flex gap-3 p-3 transition-colors ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'}`}
                              onClick={() => !isLocked && toggleSubjectExpand(subject)}
                            >
                              {/* Cover image */}
                              <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-[100px] lg:h-[100px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                                {subject.thumbnail_url ? (
                                  <img src={subject.thumbnail_url} alt={subject.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                  </div>
                                )}
                              </div>
                              {/* Right: title, description, status at bottom */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 leading-snug">{subject.title}</p>
                                    {subject.description && subject.description !== subject.title && (
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-3 leading-relaxed">{subject.description}</p>
                                    )}
                                    {isSubjectSequentiallyLocked && prevSubject && (
                                      <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Complete all modules in <span className="font-semibold">&ldquo;{prevSubject.title}&rdquo;</span> to unlock
                                      </p>
                                    )}
                                  </div>
                                  {isStudent && (() => {
                                    const mods = subjectModules[subject.id] || []
                                    if (mods.length === 0) return null
                                    const done = mods.filter(m => completedModules.has(m.id)).length
                                    const pct = Math.round((done / mods.length) * 100)
                                    const isComplete = pct === 100
                                    return (
                                      <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
                                        <span className={`text-[11px] font-bold ${isComplete ? 'text-green-600' : 'text-gray-500'}`}>{pct}%</span>
                                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{ width: `${pct}%`, backgroundColor: isComplete ? '#22c55e' : '#1f7a8c' }}
                                          />
                                        </div>
                                      </div>
                                    )
                                  })()}
                                </div>
                                <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${
                                      subject.status === 'active' ? 'text-white border-[#1f7a8c]' : 'bg-white text-[#1f7a8c] border-[#1f7a8c]'
                                    }`} style={subject.status === 'active' ? { backgroundColor: '#1f7a8c' } : {}}>
                                      {subject.status.charAt(0).toUpperCase() + subject.status.slice(1)}
                                    </span>
                                    {subject.online_class_link && (
                                      <a
                                        href={subject.online_class_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border border-blue-400 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                                        Join Class
                                      </a>
                                    )}
                                  </div>
                                  {isLocked && (
                                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3 rounded-b-xl">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#006d77' }}>
                                    Modules ({mods.length})
                                  </span>
                                </div>
                                {isLoadingMods ? (
                                  <div className="py-4 flex justify-center">
                                    <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                                  </div>
                                ) : mods.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic py-2 text-center">No modules yet.</p>
                                ) : (
                                  <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: '420px' }}>
                                    {mods.map((mod, idx) => {
                                      // Sequential locking: first module always open, rest locked until previous is completed
                                      const isModLocked = isStudent && idx > 0 && !completedModules.has(mods[idx - 1].id)
                                      return (
                                      <div key={mod.id}
                                        onClick={() => !isModLocked && handleStartLesson(mod)}
                                        className={`flex gap-3 p-3 bg-white border rounded-xl transition-colors ${isModLocked ? 'border-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-200 hover:bg-gray-50 cursor-pointer'}`}>
                                        {/* Module number / lock icon */}
                                        <div className={`flex-shrink-0 self-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg border flex items-center justify-center ${isModLocked ? 'bg-gray-100 border-gray-200' : 'bg-[#e6f4f7] border-[#b3dce5]'}`}>
                                          {isModLocked ? (
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                          ) : completedModules.has(mod.id) ? (
                                            <svg className="w-4 h-4" style={{ color: '#006d77' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                          ) : (
                                            <span className="text-base font-bold" style={{ color: '#006d77' }}>{idx + 1}</span>
                                          )}
                                        </div>
                                        {/* Right: title, description, status at bottom */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                          <div>
                                            <p className="text-sm font-semibold text-gray-900 leading-snug">{mod.title}</p>
                                            {mod.description && mod.description !== mod.title && (
                                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-3 leading-relaxed">{mod.description}</p>
                                            )}
                                            {isModLocked && (
                                              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                                                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Complete 2hr timer {moduleHasQuiz(mods[idx - 1]) ? '& quiz' : ''} in <span className="font-semibold">&ldquo;{mods[idx - 1].title}&rdquo;</span> to unlock
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5">
                                            {!isStudent && mod.status && (
                                              <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                                                mod.status === 'active' ? 'text-white border-[#1f7a8c]' : 'bg-white text-[#1f7a8c] border-[#1f7a8c]'
                                              }`} style={mod.status === 'active' ? { backgroundColor: '#1f7a8c' } : {}}>
                                                {mod.status.charAt(0).toUpperCase() + mod.status.slice(1)}
                                              </span>
                                            )}
                                            {!isStudent && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenTest(mod) }}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7] transition-colors"
                                              >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                                {(() => { try { const p = mod.text_content ? JSON.parse(mod.text_content) : {}; return p.quiz_config ? 'Edit Test' : 'Create Test' } catch { return 'Create Test' } })()}
                                              </button>
                                            )}
                                            {!isModLocked && (
                                              <svg className="w-4 h-4 text-[#1f7a8c] flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="w-full lg:flex-[3] lg:min-w-0 space-y-4">
              {/* Available Badges card — students and developers */}
              {(isStudent || isAdmin) && (() => {
                const allMods = Object.values(subjectModules).flat()
                const totalMods = allMods.length
                const doneMods = allMods.filter(m => completedModules.has(m.id)).length
                const overallPct = totalMods > 0 ? Math.round((doneMods / totalMods) * 100) : 0
                const allQuizzesPassed = totalMods > 0 && allMods.every(m => {
                  const prog = moduleProgress[m.id]
                  const hasQuiz = moduleHasQuiz(m)
                  return !hasQuiz || (prog?.quizSubmitted ?? false)
                })

                // Per-course completion badges
                const hasBronze = isAdmin || overallPct >= 50
                const hasSilver = isAdmin || overallPct >= 75
                const hasGold   = isAdmin || (overallPct === 100 && allQuizzesPassed)

                // Accumulated cross-course badges (from DB)
                const hasModulesBadge  = isAdmin || (earnedBadgeCounts['modules']  || 0) >= 1 || completedModules.size >= 1
                const hasSubjectsBadge = isAdmin || (earnedBadgeCounts['subjects'] || 0) >= 1 || (() => {
                  return Object.values(subjectModules).some(mods => mods.length > 0 && mods.every(m => completedModules.has(m.id)))
                })()
                const hasCoursesBadge  = isAdmin || (earnedBadgeCounts['courses']  || 0) >= 1

                // Course-specific: Cobot badge
                const isCobotCourse = selectedCourse?.title?.toLowerCase().includes('cobot')
                const hasCobotBadge = isAdmin || (isCobotCourse && overallPct === 100 && allQuizzesPassed)

                // Persist newly earned badges to DB
                if (selectedCourse && user?.id) {
                  const toAward: string[] = []
                  if (hasBronze) toAward.push('bronze')
                  if (hasSilver) toAward.push('silver')
                  if (hasGold)   toAward.push('gold')
                  if (hasModulesBadge)  toAward.push('modules')
                  if (hasSubjectsBadge) toAward.push('subjects')
                  if (hasCobotBadge)    toAward.push('cobot')
                  toAward.forEach(badge_type => {
                    supabase.from('user_badges').upsert(
                      { user_id: user.id, course_id: selectedCourse.id, badge_type },
                      { onConflict: 'user_id,course_id,badge_type', ignoreDuplicates: true }
                    ).then(() => {})
                  })
                }

                // All badges for this course context
                const courseBadges = [
                  { key: 'bronze',   label: 'Bronze',   img: '/Bronze.png',   earned: hasBronze,       desc: '50% completion' },
                  { key: 'silver',   label: 'Silver',   img: '/Silver.png',   earned: hasSilver,       desc: '75% completion' },
                  { key: 'gold',     label: 'Gold',     img: '/Gold.png',     earned: hasGold,         desc: '100% + quiz' },
                  { key: 'modules',  label: 'Modules',  img: '/Modules.png',  earned: hasModulesBadge, desc: '1st module done' },
                  { key: 'subjects', label: 'Subjects', img: '/Subjects.png', earned: hasSubjectsBadge,desc: '1st subject done' },
                  { key: 'courses',  label: 'Courses',  img: '/Courses.png',  earned: hasCoursesBadge, desc: '1st course done' },
                  ...(isCobotCourse ? [{ key: 'cobot', label: 'Cobot', img: '/Cobot.png', earned: hasCobotBadge, desc: 'Cobot mastery' }] : []),
                ]

                // Your Badges: merge DB counts with accurate per-type counts
                const mergedCounts: Record<string, number> = { ...earnedBadgeCounts }

                if (isAdmin) {
                  // Developer/admin already has full counts from DB fetch — use as-is
                } else {
                  // Students: compute counts from actual progress
                  // Modules: how many individual modules completed
                  const completedModuleCount = completedModules.size
                  if (completedModuleCount > 0)
                    mergedCounts['modules'] = Math.max(mergedCounts['modules'] || 0, completedModuleCount)

                  // Subjects: how many subjects have ALL their modules completed
                  const completedSubjectCount = Object.values(subjectModules)
                    .filter(mods => mods.length > 0 && mods.every(m => completedModules.has(m.id))).length
                  if (completedSubjectCount > 0)
                    mergedCounts['subjects'] = Math.max(mergedCounts['subjects'] || 0, completedSubjectCount)

                  // Bronze/Silver/Gold: kept from DB (per-course, already counted on award)
                  if (hasBronze) mergedCounts['bronze']   = Math.max(mergedCounts['bronze']   || 0, 1)
                  if (hasSilver) mergedCounts['silver']   = Math.max(mergedCounts['silver']   || 0, 1)
                  if (hasGold)   mergedCounts['gold']     = Math.max(mergedCounts['gold']     || 0, 1)
                  if (hasCoursesBadge) mergedCounts['courses'] = Math.max(mergedCounts['courses'] || 0, 1)
                  if (hasCobotBadge)   mergedCounts['cobot']   = Math.max(mergedCounts['cobot']   || 0, 1)
                }

                const allBadgeDefs: Record<string, { label: string; img: string }> = {
                  bronze:   { label: 'Bronze',   img: '/Bronze.png' },
                  silver:   { label: 'Silver',   img: '/Silver.png' },
                  gold:     { label: 'Gold',     img: '/Gold.png' },
                  modules:  { label: 'Modules',  img: '/Modules.png' },
                  subjects: { label: 'Subjects', img: '/Subjects.png' },
                  courses:  { label: 'Courses',  img: '/Courses.png' },
                  cobot:    { label: 'Cobot',    img: '/Cobot.png' },
                }

                // Build "Your Badges" slots: earned first, then placeholders to fill rows of 6
                const earnedSlots = Object.entries(mergedCounts)
                  .filter(([, count]) => count > 0)
                  .map(([key, count]) => ({ ...allBadgeDefs[key], count }))
                  .filter(b => b.label)
                const totalSlots = Math.ceil(Math.max(earnedSlots.length, 1) / 6) * 6
                const placeholderSlots = totalSlots - earnedSlots.length

                return (
                  <>
                    {/* Your Badges */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Your Badges</span>
                        <span className="text-xs text-gray-400">{earnedSlots.length} earned</span>
                      </div>
                      <div className="px-3 py-3 grid grid-cols-6 gap-1">
                        {earnedSlots.map((b, i) => (
                          <div key={`earned-${i}`} className="flex flex-col items-center gap-0.5">
                            <img src={b.img} alt={b.label} className="w-8 h-8 object-contain" />
                            <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">{b.label}</span>
                            <span className="text-[9px] font-bold text-center leading-tight" style={{ color: '#1f7a8c' }}>×{b.count}</span>
                          </div>
                        ))}
                        {Array.from({ length: placeholderSlots }).map((_, i) => (
                          <div key={`yph-${i}`} className="flex flex-col items-center gap-0.5">
                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-dashed border-gray-200" />
                            <span className="text-[9px] text-gray-300 text-center leading-tight">—</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Available Badges */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Available Badges</span>
                        <span className="text-xs text-gray-400">This course</span>
                      </div>
                      <div className="px-3 py-3 grid grid-cols-6 gap-1">
                        {courseBadges.map(b => (
                          <div key={b.key} className="relative flex flex-col items-center gap-0.5 group cursor-default">
                            <img src={b.img} alt={b.label} className="w-8 h-8 object-contain" />
                            <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">{b.label}</span>
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                              <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap leading-tight">{b.desc}</div>
                              <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5" />
                            </div>
                          </div>
                        ))}
                        {/* Fill remaining slots in the row */}
                        {Array.from({ length: Math.max(0, 6 - (courseBadges.length % 6 || 6)) }).map((_, i) => (
                          <div key={`avph-${i}`} className="flex flex-col items-center gap-0.5 opacity-20">
                            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-dashed border-gray-300" />
                            <span className="text-[9px] text-gray-300 text-center leading-tight">—</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )
              })()}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100"><span className="text-sm font-semibold text-gray-900">People</span></div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="flex-1 text-xs text-gray-500">Enrolled Users</span>
                    <span className="text-sm font-bold text-gray-900">{courseEnrolledCount}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <span className="flex-1 text-xs text-gray-500">Assigned Instructors</span>
                    <span className="text-sm font-bold text-gray-900">{courseInstructorCount}</span>
                  </div>
                </div>
              </div>
              {isAdmin && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100"><span className="text-sm font-semibold text-gray-900">Statistics</span></div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between px-4 py-3"><span className="text-xs text-gray-500">Total</span><span className="text-sm font-bold text-gray-900">{subjects.length}</span></div>
                  <div className="flex items-center justify-between px-4 py-3"><span className="text-xs text-green-600">Active</span><span className="text-sm font-bold text-green-700">{subjects.filter(s => s.status === 'active').length}</span></div>
                  <div className="flex items-center justify-between px-4 py-3"><span className="text-xs text-yellow-600">Draft</span><span className="text-sm font-bold text-yellow-700">{subjects.filter(s => s.status === 'draft').length}</span></div>
                  <div className="flex items-center justify-between px-4 py-3"><span className="text-xs text-red-500">Inactive</span><span className="text-sm font-bold text-red-600">{subjects.filter(s => s.status === 'inactive').length}</span></div>
                </div>
              </div>
              )}
              {/* This course includes — visible to all roles */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100"><span className="text-sm font-semibold text-gray-900">This course includes</span></div>
                <div className="px-4 py-3 space-y-3">
                  {(() => {
                    const allMods = Object.values(subjectModules).flat()
                    const totalMods = allMods.length
                    const videoMods = allMods.filter(m => m.content_type === 'video').length
                    const articleMods = allMods.filter(m => m.content_type === 'text').length
                    const pdfMods = allMods.filter(m => m.content_type === 'pdf_document').length
                    const slideMods = allMods.filter(m => m.content_type === 'slide_presentation' || m.content_type === 'canva_presentation').length
                    const confMods = allMods.filter(m => m.content_type === 'online_conference').length
                    const totalDuration = allMods.reduce((sum, m) => sum + (m.duration_minutes || 0), 0)
                    return (
                      <>
                        <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg><span className="text-xs text-gray-600">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</span></div>
                        {totalMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg><span className="text-xs text-gray-600">{totalMods} module{totalMods !== 1 ? 's' : ''}</span></div>}
                        {videoMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg><span className="text-xs text-gray-600">{videoMods} video lesson{videoMods !== 1 ? 's' : ''}</span></div>}
                        {articleMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="text-xs text-gray-600">{articleMods} article{articleMods !== 1 ? 's' : ''}</span></div>}
                        {pdfMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg><span className="text-xs text-gray-600">{pdfMods} PDF document{pdfMods !== 1 ? 's' : ''}</span></div>}
                        {slideMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg><span className="text-xs text-gray-600">{slideMods} presentation{slideMods !== 1 ? 's' : ''}</span></div>}
                        {confMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg><span className="text-xs text-gray-600">{confMods} online session{confMods !== 1 ? 's' : ''}</span></div>}
                        {totalDuration > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-xs text-gray-600">{totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ''}`.trim() : `${totalDuration} min total`}</span></div>}
                        <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg><span className="text-xs text-gray-600 capitalize">{selectedCourse?.course_type?.replace(/_/g, ' ')} course</span></div>
                        <div className="flex items-center gap-3 opacity-40"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg><span className="text-sm text-gray-400">Activities <span className="text-xs italic">(coming soon)</span></span></div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson View */}
      {currentView === 'lesson' && selectedModule && (
        <LessonViewer
          module={selectedModule}
          isOpen={true}
          onClose={handleBackToSubjects}
          inline={true}
          siblingModules={subjectModules[selectedModule.subject_id] || []}
          onNavigate={(mod) => setSelectedModule(mod)}
          userId={user?.id}
          userRole={user?.profile?.role || role}
          subjectId={selectedModule.subject_id}
          courseId={selectedCourse?.id}
        />
      )}

      {/* Create / Edit Test Modal */}
      {showTestModal && testModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{testQuizConfig ? 'Edit Test' : 'Create Test'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{testModule.title}</p>
              </div>
              <button onClick={() => { setShowTestModal(false); setTestModule(null); setTestQuizConfig(null) }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <QuizBuilder value={testQuizConfig} onChange={setTestQuizConfig} />
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                {testQuizConfig && (
                  <button type="button"
                    onClick={async () => {
                      if (!testModule) return
                      if (!confirm('This will delete all student scores for this test so it can be retaken. Continue?')) return
                      await supabase.from('quiz_grades').delete().eq('module_id', testModule.id)
                      // Re-fetch modules to keep state fresh
                      if (testModule.subject_id) {
                        const { data } = await supabase.from('modules').select('*').eq('subject_id', testModule.subject_id).order('order_index', { ascending: true })
                        if (data) updateSubjectModules(testModule.subject_id, data)
                      }
                      alert('Scores cleared. Students can now retake the test.')
                    }}
                    className="px-4 py-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-sm">
                    Refresh Scores
                  </button>
                )}
                <button type="button" onClick={() => { setShowTestModal(false); setTestModule(null); setTestQuizConfig(null) }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveTest} disabled={savingTest}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#0f4c5c' }}>
                  {savingTest ? 'Saving...' : 'Save Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



