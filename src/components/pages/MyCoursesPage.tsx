'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/loading'

interface Course {
  id: string
  title: string
  description: string
  course_group?: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  created_at: string
  subjects?: Subject[]
}

interface Subject {
  id: string
  course_id: string
  title: string
  description: string
  order_index: number
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  trainee_id?: string
  created_at: string
  trainee?: {
    first_name: string
    last_name: string
  }
  trainee_name?: string
}

interface Module {
  id: string
  subject_id: string
  title: string
  description: string
  content_type: 'video' | 'text' | 'canva_presentation' | 'online_conference' | 'online_document' | 'pdf_document' | 'slide_presentation'
  content_url?: string
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
  order_index: number
  duration_minutes?: number
  status?: 'active' | 'inactive' | 'draft'
  created_at: string
}

type ViewType = 'courses' | 'subjects' | 'modules'

export default function MyCoursesPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [currentView, setCurrentView] = useState<ViewType>('courses')
  const [loading, setLoading] = useState(true)
  const [showPresentationModal, setShowPresentationModal] = useState(false)
  const [currentPresentationModule, setCurrentPresentationModule] = useState<Module | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchEnrolledCourses()
    }
  }, [user])

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true)
      const userRole = user?.profile?.role || 'trainee'

      let courseIds: string[] = []

      if (userRole === 'trainee') {
        // trainees see courses where they are assigned to at least one subject
        const { data: traineeSubjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('course_id')
          .eq('trainee_id', user?.id)

        if (subjectsError) {
          console.error('Error fetching trainee subjects:', subjectsError)
          setLoading(false)
          return
        }

        // Get unique course IDs
        const courseIdsSet = new Set<string>(traineeSubjects?.map((s: { course_id: string }) => s.course_id) || [])
        courseIds = Array.from(courseIdsSet)
      } else {
        // trainees see courses they are enrolled in
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('trainee_id', user?.id)
          .eq('status', 'active')

        if (enrollmentError) {
          console.error('Error fetching enrollments:', enrollmentError)
          setLoading(false)
          return
        }

        courseIds = enrollments?.map((e: { course_id: string }) => e.course_id) || []
      }

      if (courseIds.length === 0) {
        setCourses([])
        setLoading(false)
        return
      }

      // Fetch the courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .in('id', courseIds)
        .order('created_at', { ascending: false })

      if (coursesError) {
        console.error('Error fetching courses:', coursesError)
        return
      }

      setCourses(coursesData || [])
    } catch (error) {
      console.error('Error fetching enrolled courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          trainee:profiles(first_name, last_name)
        `)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching subjects:', error)
        return
      }

      const subjectsWithtrainee = (data || []).map((subject: Subject) => ({
        ...subject,
        trainee_name: subject.trainee 
          ? `${subject.trainee.first_name} ${subject.trainee.last_name}`
          : 'Unassigned'
      }))

      setSubjects(subjectsWithtrainee)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const fetchModules = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching modules:', error)
        return
      }

      console.log('Fetched modules:', data)
      if (data && data.length > 0) {
        console.log('First module video_url:', data[0].video_url)
        console.log('First module full data:', data[0])
      }
      setModules(data || [])
    } catch (error) {
      console.error('Error fetching modules:', error)
    }
  }

  const handleCourseSelect = async (course: Course) => {
    setSelectedCourse(course)
    setCurrentView('subjects')
    await fetchSubjects(course.id)
  }

  const handleSubjectSelect = async (subject: Subject) => {
    setSelectedSubject(subject)
    setCurrentView('modules')
    await fetchModules(subject.id)
  }

  const handleBackToCourses = () => {
    setCurrentView('courses')
    setSelectedCourse(null)
    setSelectedSubject(null)
  }

  const handleBackToSubjects = () => {
    setCurrentView('subjects')
    setSelectedSubject(null)
  }

  const handleViewPresentation = (module: Module) => {
    setCurrentPresentationModule(module)
    setShowPresentationModal(true)
  }

  const handleStartLesson = (module: Module) => {
    setCurrentPresentationModule(module)
    setShowPresentationModal(true)
  }

  const getCanvaEmbedUrl = (url: string) => {
    if (url.includes('/design/')) {
      const designId = url.split('/design/')[1].split('/')[0]
      return `https://www.canva.com/design/${designId}/view?embed`
    }
    return url
  }

  const renderPresentationContent = (module: Module) => {
    switch (module.content_type) {
      case 'canva_presentation':
        if (module.canva_url) {
          const embedUrl = getCanvaEmbedUrl(module.canva_url)
          return (
            <div className="w-full h-full">
              <iframe
                src={embedUrl}
                className="w-full h-full border-0 rounded-lg"
                allowFullScreen
                title={`${module.title} - Canva Presentation`}
              />
            </div>
          )
        }
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">No Presentation URL</h3>
              <p className="text-gray-600">This Canva presentation module doesn't have a valid URL.</p>
            </div>
          </div>
        )
      
      case 'video':
        if (module.content_url) {
          return (
            <div className="w-full h-full">
              <iframe
                src={module.content_url}
                className="w-full h-full border-0 rounded-lg"
                allowFullScreen
                title={`${module.title} - Video`}
              />
            </div>
          )
        }
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">No Video URL</h3>
              <p className="text-gray-600">This video module doesn't have a valid URL.</p>
            </div>
          </div>
        )
      
      case 'online_document':
      case 'pdf_document':
        if (module.content_url) {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">Document</h3>
                <p className="text-gray-600 mb-4">{module.description}</p>
                <a
                  href={module.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Document</span>
                </a>
              </div>
            </div>
          )
        }
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">No Document URL</h3>
              <p className="text-gray-600">This document module doesn't have a valid URL.</p>
            </div>
          </div>
        )
      
      case 'online_conference':
        // Auto-redirect to conference URL if available
        if (module.conference_url) {
          window.open(module.conference_url, '_blank')
          return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="text-center max-w-md px-6">
                <div className="w-20 h-20 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-black mb-4">Redirecting to Conference...</h3>
                <p className="text-gray-600 mb-6">{module.description}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-700">
                    ✓ A new tab has been opened with your conference link.
                  </p>
                </div>
                <a 
                  href={module.conference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Open Conference Again
                </a>
              </div>
            </div>
          )
        }
        return (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-black mb-4">Online Conference</h3>
              <p className="text-gray-600 mb-6">{module.description}</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  Conference link not available yet. Please check back later.
                </p>
              </div>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Content Type Not Supported</h3>
              <p className="text-gray-600">{module.description}</p>
            </div>
          </div>
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'inactive':
        return 'bg-red-100 text-red-700'
      case 'draft':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getEnrollmentTypeDisplay = (type: string) => {
    return [{ text: 'trainee', color: 'bg-blue-100 text-blue-700' }]
  }

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'online_document':
      case 'pdf_document':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'canva_presentation':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        )
      case 'online_conference':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">My Courses</h1>
          <p className="text-gray-600 mt-1">
            {user?.profile?.role === 'trainee' 
              ? 'View courses where you are assigned as an trainee' 
              : 'View your enrolled courses, subjects, and modules'}
          </p>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {currentView !== 'courses' && (
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={handleBackToCourses}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            My Courses
          </button>
          {currentView === 'subjects' && selectedCourse && (
            <>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{selectedCourse.title}</span>
            </>
          )}
          {currentView === 'modules' && selectedCourse && selectedSubject && (
            <>
              <span className="text-gray-400">/</span>
              <button
                onClick={handleBackToSubjects}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {selectedCourse.title}
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{selectedSubject.title}</span>
            </>
          )}
        </div>
      )}

      {/* Courses View */}
      {currentView === 'courses' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-black">Enrolled Courses</h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                  {courses.length} course{courses.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-black mb-2">
                  {user?.profile?.role === 'trainee' ? 'No assigned courses' : 'No enrolled courses'}
                </h3>
                <p className="text-gray-500">
                  {user?.profile?.role === 'trainee' 
                    ? 'You have not been assigned to any courses yet. Contact your administrator.' 
                    : 'You are not enrolled in any courses yet. Contact your administrator to enroll.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div 
                    key={course.id} 
                    className="group relative bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full"
                  >
                    <div className="h-2 w-full bg-white border-b border-gray-200 flex-shrink-0" />
                    
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-black transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-3 leading-relaxed">
                          {course.description}
                        </p>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs text-gray-500">{course.course_group}</span>
                          <span className="text-gray-300">•</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center flex-wrap gap-2 mb-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(course.status)}`}>
                          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                        </span>
                        {getEnrollmentTypeDisplay(course.enrollment_type).map((display, idx) => (
                          <span key={idx} className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${display.color}`}>
                            {display.text}
                          </span>
                        ))}
                      </div>
                      
                      <div className="mt-auto">
                        <button 
                          onClick={() => handleCourseSelect(course)}
                          className="w-full px-4 py-3 bg-black text-white rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-gray-800 hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                          View Subjects
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subjects View */}
      {currentView === 'subjects' && selectedCourse && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBackToCourses}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to courses"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-black">Subjects in {selectedCourse.title}</h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                  {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {subjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-black mb-2">No subjects yet</h3>
                <p className="text-gray-500">This course doesn't have any subjects yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Subject Number */}
                      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                        <span className="text-xl font-bold text-gray-900">{subject.order_index}</span>
                      </div>
                      
                      {/* Subject Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                          {subject.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {subject.description}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                            subject.status === 'active' ? 'bg-green-100 text-green-700' :
                            subject.status === 'inactive' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {subject.status.charAt(0).toUpperCase() + subject.status.slice(1)}
                          </span>
                          {getEnrollmentTypeDisplay(subject.enrollment_type || 'trainee').map((badge, idx) => (
                            <span key={idx} className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                              {badge.text}
                            </span>
                          ))}
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className={subject.trainee_name === 'Unassigned' ? 'text-gray-400' : 'text-gray-700 font-medium'}>
                              {subject.trainee_name}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        <button 
                          onClick={() => handleSubjectSelect(subject)}
                          className="px-4 py-2 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                          <span>View Modules</span>
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
        </div>
      )}

      {/* Modules View */}
      {currentView === 'modules' && selectedSubject && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBackToSubjects}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to subjects"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-black">Modules in {selectedSubject.title}</h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                  {modules.length} module{modules.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {modules.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-black mb-2">No modules yet</h3>
                <p className="text-gray-500">This subject doesn't have any modules yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Module Number */}
                      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                        <span className="text-xl font-bold text-gray-900">{index + 1}</span>
                      </div>
                      
                      {/* Module Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                          {module.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {module.description}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          {module.status && (
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                              module.status === 'active' ? 'bg-green-100 text-green-700' :
                              module.status === 'inactive' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {module.status.charAt(0).toUpperCase() + module.status.slice(1)}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            {getContentTypeIcon(module.content_type)}
                            <span className="font-medium capitalize">
                              {module.content_type === 'canva_presentation' ? 'Canva' : module.content_type.replace('_', ' ')}
                            </span>
                          </div>
                          {module.duration_minutes && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{module.duration_minutes} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleStartLesson(module)}
                          className="px-4 py-2 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Start Lesson</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Presentation Modal - Full Screen */}
      {showPresentationModal && currentPresentationModule && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
          <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getContentTypeIcon(currentPresentationModule.content_type)}
                  <h2 className="text-xl font-semibold text-white">{currentPresentationModule.title}</h2>
                </div>
                <span className="px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded-full">
                  {currentPresentationModule.content_type === 'canva_presentation' ? 'Canva Presentation' : currentPresentationModule.content_type}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {currentPresentationModule.duration_minutes && (
                  <span className="text-white text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    {currentPresentationModule.duration_minutes} min
                  </span>
                )}
                <button 
                  onClick={() => {
                    setShowPresentationModal(false)
                    setCurrentPresentationModule(null)
                  }}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  title="Close presentation"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <div className="w-full h-full bg-white rounded-lg overflow-hidden">
                {renderPresentationContent(currentPresentationModule)}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="text-white text-sm">
                  <p className="opacity-75">{currentPresentationModule.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      setShowPresentationModal(false)
                      setCurrentPresentationModule(null)
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close Lesson
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
