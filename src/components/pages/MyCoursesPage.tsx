'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/loading'
import LessonViewer from '@/components/LessonViewer'

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

export default function MyCoursesPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const role = user?.profile?.role || ''
  const isAdmin = role === 'admin' || role === 'developer'
  const isStudent = ['shs_student', 'jhs_student', 'college_student', 'scholar'].includes(role)

  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [currentView, setCurrentView] = useState<ViewType>('courses')
  const [loading, setLoading] = useState(true)

  // Accordion state
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [subjectModules, setSubjectModules] = useState<Record<string, Module[]>>({})
  const [subjectModulesLoading, setSubjectModulesLoading] = useState<Set<string>>(new Set())

  // Sidebar data
  const [courseEnrolledCount, setCourseEnrolledCount] = useState(0)
  const [courseInstructorCount, setCourseInstructorCount] = useState(0)

  useEffect(() => {
    if (user?.id) fetchEnrolledCourses()
  }, [user])

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true)
      let courseIds: string[] = []

      if (role === 'instructor' || isAdmin) {
        const { data } = await supabase
          .from('subjects')
          .select('course_id')
          .eq('instructor_id', user?.id)
        const ids = new Set<string>((data || []).map((s: { course_id: string }) => s.course_id))
        courseIds = Array.from(ids)
        // admins/devs see all courses
        if (isAdmin) {
          const { data: all } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
          setCourses(all || [])
          setLoading(false)
          return
        }
      } else {
        const { data } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('trainee_id', user?.id)
          .eq('status', 'active')
        courseIds = (data || []).map((e: { course_id: string }) => e.course_id)
      }

      if (courseIds.length === 0) { setCourses([]); setLoading(false); return }

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .in('id', courseIds)
        .order('created_at', { ascending: false })

      setCourses(coursesData || [])
    } catch (e) {
      console.error('Error fetching courses:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async (courseId: string) => {
    let query = supabase
      .from('subjects')
      .select('*, instructor:profiles(first_name, last_name)')
      .eq('course_id', courseId)

    if (isStudent) query = query.eq('status', 'active')

    const { data } = await query.order('order_index', { ascending: true })
    const mapped = (data || []).map((s: Subject) => ({
      ...s,
      instructor_name: s.instructor ? `${s.instructor.first_name} ${s.instructor.last_name}` : 'Unassigned'
    }))
    setSubjects(mapped)
  }

  const fetchAllModulesForCourse = async (courseId: string) => {
    let query = supabase
      .from('modules')
      .select('*, subjects!inner(course_id)')
      .eq('subjects.course_id', courseId)

    if (isStudent) query = (query as any).eq('status', 'active')

    const { data } = await query.order('order_index', { ascending: true })
    const grouped: Record<string, Module[]> = {}
    for (const mod of (data || [])) {
      if (!grouped[mod.subject_id]) grouped[mod.subject_id] = []
      grouped[mod.subject_id].push(mod)
    }
    setSubjectModules(grouped)
  }

  const fetchCourseOverview = async (courseId: string) => {
    const { count } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
    setCourseEnrolledCount(count || 0)

    const { data: subjectData } = await supabase
      .from('subjects')
      .select('instructor_id')
      .eq('course_id', courseId)
      .not('instructor_id', 'is', null)

    const uniqueIds = Array.from(new Set((subjectData || []).map((s: { instructor_id: string }) => s.instructor_id).filter(Boolean)))
    setCourseInstructorCount(uniqueIds.length)
  }

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course)
    setCurrentView('subjects')
    setExpandedSubjects(new Set())
    setSubjectModules({})
    setCourseEnrolledCount(0)
    setCourseInstructorCount(0)
    fetchSubjects(course.id)
    fetchAllModulesForCourse(course.id)
    fetchCourseOverview(course.id)
  }

  const handleBackToCourses = () => {
    setCurrentView('courses')
    setSelectedCourse(null)
    setSelectedModule(null)
  }

  const handleBackToSubjects = () => {
    setCurrentView('subjects')
    setSelectedModule(null)
  }

  const toggleSubjectExpand = async (subject: Subject) => {
    const newExpanded = new Set(expandedSubjects)
    if (newExpanded.has(subject.id)) {
      newExpanded.delete(subject.id)
    } else {
      newExpanded.add(subject.id)
      if (!subjectModules[subject.id]) {
        setSubjectModulesLoading(prev => new Set(prev).add(subject.id))
        let query = supabase.from('modules').select('*').eq('subject_id', subject.id)
        if (isStudent) query = (query as any).eq('status', 'active')
        const { data } = await query.order('order_index', { ascending: true })
        setSubjectModules(prev => ({ ...prev, [subject.id]: data || [] }))
        setSubjectModulesLoading(prev => { const s = new Set(prev); s.delete(subject.id); return s })
      }
    }
    setExpandedSubjects(newExpanded)
  }

  const handleStartLesson = (mod: Module) => {
    setSelectedModule(mod)
    setCurrentView('lesson')
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

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-64"><Loading size="lg" /></div>
  }

  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumb */}
      {currentView !== 'courses' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={handleBackToCourses} className="hover:text-gray-700">My Courses</button>
          {selectedCourse && (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <button
                onClick={handleBackToSubjects}
                className={`hover:text-gray-700 ${currentView === 'subjects' ? 'text-gray-900 font-medium' : ''}`}
              >
                {selectedCourse.title}
              </button>
            </>
          )}
          {currentView === 'lesson' && selectedModule && (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-medium">{selectedModule.title}</span>
            </>
          )}
        </div>
      )}

      {/* Courses View */}
      {currentView === 'courses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">My Courses</h2>
            <p className="text-sm text-gray-500">
              {role === 'instructor' ? 'Courses where you are assigned as instructor' : 'Your enrolled courses'}
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No courses yet</h3>
              <p className="text-sm text-gray-500">Contact your administrator to get enrolled.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div key={course.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  {/* Thumbnail */}
                  <div className="relative h-36 w-full bg-gradient-to-br from-teal-50 to-teal-100 flex-shrink-0">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-2 left-3">
                      <span className="text-xs font-semibold text-white/90 capitalize">{course.course_type}</span>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">{course.title}</h3>
                    {!isStudent && (
                      <span className={`self-start text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${
                        course.status === 'active' ? 'bg-green-100 text-green-700' :
                        course.status === 'inactive' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                      </span>
                    )}
                    <div className="mt-auto pt-3">
                      <button
                        onClick={() => handleCourseSelect(course)}
                        className="w-full px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#1f7a8c' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#196475'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                      >
                        View Subjects
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subjects View */}
      {currentView === 'subjects' && selectedCourse && (
        <div className="space-y-4">
          {/* Course Banner */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="relative h-52 w-full">
              {selectedCourse.thumbnail_url ? (
                <img src={selectedCourse.thumbnail_url} alt={selectedCourse.title} className="w-full h-full object-cover" />
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
          </div>

          {/* 70/30 layout */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
            {/* Left: Subjects accordion (70%) */}
            <div className="w-full lg:flex-[7] lg:min-w-0 lg:flex lg:flex-col">
              <div className="overflow-y-auto border border-gray-200 rounded-xl bg-white p-3 lg:flex-1">
                {subjects.length === 0 ? (
                  <div className="text-center py-16">
                    <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-sm text-gray-500">No subjects available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subjects.map((subject) => {
                      const isExpanded = expandedSubjects.has(subject.id)
                      const mods = subjectModules[subject.id] || []
                      const isLoadingMods = subjectModulesLoading.has(subject.id)
                      return (
                        <div key={subject.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleSubjectExpand(subject)}
                          >
                            <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="flex-shrink-0 text-xs font-bold text-gray-400 w-5 text-center">{subject.order_index}</span>
                            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                              {subject.thumbnail_url ? (
                                <img src={subject.thumbnail_url} alt={subject.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{subject.title}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className={`text-xs ${subject.instructor_name === 'Unassigned' ? 'text-gray-400 italic' : 'text-gray-500'}`}>
                                  {subject.instructor_name}
                                </span>
                                {subject.online_class_link && (
                                  <>
                                    <span className="text-gray-300 mx-1">·</span>
                                    <a href={subject.online_class_link} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                                      Join class
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {isExpanded ? `${mods.length} modules` : '...'}
                            </span>
                            {!isStudent && (
                              <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                                subject.status === 'active' ? 'bg-green-100 text-green-700' :
                                subject.status === 'inactive' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {subject.status.charAt(0).toUpperCase() + subject.status.slice(1)}
                              </span>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Modules</span>
                              {isLoadingMods ? (
                                <div className="py-4 flex justify-center">
                                  <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                </div>
                              ) : mods.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2 text-center">No modules yet.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {mods.map((mod, idx) => (
                                    <div
                                      key={mod.id}
                                      className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                      onClick={() => handleStartLesson(mod)}
                                    >
                                      <span className="text-xs font-bold text-gray-400 w-4 text-center flex-shrink-0">{String.fromCharCode(97 + idx)}</span>
                                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                                        {mod.thumbnail_url ? (
                                          <img src={mod.thumbnail_url} alt={mod.title} className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-sm">{getContentTypeIcon(mod.content_type)}</span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 truncate">{mod.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-gray-400 capitalize">{mod.content_type.replace(/_/g, ' ')}</span>
                                          {mod.duration_minutes ? <span className="text-[10px] text-gray-400">{mod.duration_minutes} min</span> : null}
                                        </div>
                                      </div>
                                      {!isStudent && mod.status && (
                                        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                          mod.status === 'active' ? 'bg-green-100 text-green-700' :
                                          mod.status === 'inactive' ? 'bg-red-100 text-red-700' :
                                          'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {mod.status.charAt(0).toUpperCase() + mod.status.slice(1)}
                                        </span>
                                      )}
                                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Sidebar (30%) */}
            <div className="w-full lg:flex-[3] lg:min-w-0 space-y-4">
              {/* People card */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">People</span>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Enrolled Users</p>
                      <p className="text-sm font-bold text-gray-900">{courseEnrolledCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Assigned Instructors</p>
                      <p className="text-sm font-bold text-gray-900">{courseInstructorCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics card */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Statistics</span>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-sm font-bold text-gray-900">{subjects.length}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-green-600">Active</span>
                    <span className="text-sm font-bold text-green-700">{subjects.filter(s => s.status === 'active').length}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-yellow-600">Draft</span>
                    <span className="text-sm font-bold text-yellow-700">{subjects.filter(s => s.status === 'draft').length}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-red-500">Inactive</span>
                    <span className="text-sm font-bold text-red-600">{subjects.filter(s => s.status === 'inactive').length}</span>
                  </div>
                </div>
              </div>

              {/* This course includes */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">This course includes</span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm text-gray-600">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</span>
                  </div>
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
                        {totalMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg><span className="text-sm text-gray-600">{totalMods} module{totalMods !== 1 ? 's' : ''}</span></div>}
                        {videoMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg><span className="text-sm text-gray-600">{videoMods} video lesson{videoMods !== 1 ? 's' : ''}</span></div>}
                        {articleMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="text-sm text-gray-600">{articleMods} article{articleMods !== 1 ? 's' : ''}</span></div>}
                        {pdfMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg><span className="text-sm text-gray-600">{pdfMods} PDF document{pdfMods !== 1 ? 's' : ''}</span></div>}
                        {slideMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg><span className="text-sm text-gray-600">{slideMods} presentation{slideMods !== 1 ? 's' : ''}</span></div>}
                        {confMods > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg><span className="text-sm text-gray-600">{confMods} online session{confMods !== 1 ? 's' : ''}</span></div>}
                        {totalDuration > 0 && <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-sm text-gray-600">{totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ''} total`.trim() : `${totalDuration} min total`}</span></div>}
                        <div className="flex items-center gap-3"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg><span className="text-sm text-gray-600 capitalize">{selectedCourse.course_type?.replace(/_/g, ' ')} course</span></div>
                        <div className="flex items-center gap-3 opacity-40"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg><span className="text-sm text-gray-400">Activities <span className="text-xs italic">(coming soon)</span></span></div>
                        <div className="flex items-center gap-3 opacity-40"><svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg><span className="text-sm text-gray-400">Badges <span className="text-xs italic">(coming soon)</span></span></div>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedModule.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{selectedModule.content_type.replace(/_/g, ' ')}</p>
            </div>
            <button
              onClick={handleBackToSubjects}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
            <LessonViewer
              module={selectedModule}
              isOpen={true}
              onClose={handleBackToSubjects}
              inline={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
