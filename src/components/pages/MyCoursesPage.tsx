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

      if (userRole === 'instructor') {
        // Instructors see courses where they are assigned to at least one subject
        const { data: instructorSubjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('course_id')
          .eq('instructor_id', user?.id)

        if (subjectsError) {
          console.error('Error fetching instructor subjects:', subjectsError)
          setLoading(false)
          return
        }

        // Get unique course IDs
        const courseIdsSet = new Set<string>(instructorSubjects?.map((s: { course_id: string }) => s.course_id) || [])
        courseIds = Array.from(courseIdsSet)
      } else {
        // Trainees and TESDA scholars see courses they are enrolled in
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
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Breadcrumb Navigation - Above banner for subjects and modules views */}
      {currentView !== 'courses' && (
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          {selectedCourse && (
            <>
              <button 
                onClick={handleBackToCourses}
                className="hover:text-gray-700"
              >
                My Courses
              </button>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <button 
                onClick={handleBackToSubjects}
                className={`hover:text-gray-700 ${currentView === 'subjects' ? 'text-black font-medium' : ''}`}
              >
                {selectedCourse.title}
              </button>
            </>
          )}
          {selectedSubject && (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-black font-medium">{selectedSubject.title}</span>
            </>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Welcome Banner - Show on all views */}
        {currentView === 'courses' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-visible relative min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="z-10 pr-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  My Courses
                </h2>
                <p className="text-gray-600">
                  {user?.profile?.role === 'instructor' 
                    ? 'View courses where you are assigned as an instructor' 
                    : 'View your enrolled courses, subjects, and modules'}
                </p>
              </div>
              
              {/* Book Illustration - Overlapping */}
              <div className="hidden md:block absolute -top-16 w-48 h-48 z-0" style={{ right: '5px' }}>
                <img 
                  src="/book.png" 
                  alt="Book illustration" 
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
            </div>
          </div>
        )}

        {/* Subjects View Banner */}
        {currentView === 'subjects' && selectedCourse && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-visible relative min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="z-10 pr-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Subjects
                </h2>
                <p className="text-gray-600">
                  View subjects in <span className="font-semibold text-gray-900">{selectedCourse.title}</span>
                </p>
              </div>
              
              {/* Book Illustration - Overlapping */}
              <div className="hidden md:block absolute -top-16 w-48 h-48 z-0" style={{ right: '5px' }}>
                <img 
                  src="/book.png" 
                  alt="Book illustration" 
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modules View Banner */}
        {currentView === 'modules' && selectedSubject && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-visible relative min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="z-10 pr-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Modules
                </h2>
                <p className="text-gray-600">
                  Learning modules for <span className="font-semibold text-gray-900">{selectedSubject.title}</span>
                </p>
              </div>
              
              {/* Book Illustration - Overlapping */}
              <div className="hidden md:block absolute -top-16 w-48 h-48 z-0" style={{ right: '5px' }}>
                <img 
                  src="/book.png" 
                  alt="Book illustration" 
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
            </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="group bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {/* Module Header with Gradient Background */}
                    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-5 border-b border-gray-200">
                      {/* Module Number and Status Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Module Number Badge */}
                          <div className="flex items-center justify-center w-10 h-10 bg-white border-2 border-gray-300 rounded-lg shadow-sm">
                            <span className="text-lg font-bold text-gray-700">{index + 1}</span>
                          </div>
                          {/* Content Type Icon */}
                          <div className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-lg">
                            {getContentTypeIcon(module.content_type)}
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        {module.status && (
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md ${
                            module.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' :
                            module.status === 'inactive' ? 'bg-red-100 text-red-700 border border-red-200' :
                            'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}>
                            {module.status.charAt(0).toUpperCase() + module.status.slice(1)}
                          </span>
                        )}
                      </div>
                      
                      {/* Module Title */}
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">
                        {module.title}
                      </h3>
                    </div>

                    {/* Document/Slide Thumbnail Preview */}
                    {(module.content_type === 'pdf_document' || module.content_type === 'slide_presentation' || module.content_type === 'online_document') && module.document_url && (
                      <div className="relative w-full h-32 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-200 overflow-hidden flex items-center justify-center">
                        <div className="text-center">
                          <div className="flex justify-center mb-2">
                            {module.content_type === 'pdf_document' ? (
                              <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                                <path d="M14 2v6h6" />
                                <text x="7" y="17" fontSize="6" fill="white" fontWeight="bold">PDF</text>
                              </svg>
                            ) : module.content_type === 'slide_presentation' ? (
                              <svg className="w-12 h-12 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                                <path d="M14 2v6h6" />
                                <text x="6" y="17" fontSize="6" fill="white" fontWeight="bold">PPT</text>
                              </svg>
                            ) : (
                              <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                                <path d="M14 2v6h6" />
                                <text x="6" y="17" fontSize="6" fill="white" fontWeight="bold">DOC</text>
                              </svg>
                            )}
                          </div>
                          <p className="text-xs font-medium text-gray-600 px-4">
                            {module.content_type === 'pdf_document' ? 'PDF Document' : 
                             module.content_type === 'slide_presentation' ? 'Slide Presentation' : 'Online Document'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">✓ File uploaded</p>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Saved
                        </div>
                      </div>
                    )}
                    
                    {/* Module Content */}
                    <div className="p-5 flex flex-col flex-1">
                      {/* Module Info */}
                      <div className="mt-auto space-y-3">
                        {/* Duration Badge */}
                        {module.duration_minutes && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">{module.duration_minutes} minutes</span>
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleStartLesson(module)}
                            className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:bg-gray-800 hover:shadow-md"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            <span>Start</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lesson Viewer Modal */}
      <LessonViewer
        module={currentPresentationModule!}
        isOpen={showPresentationModal}
        onClose={() => {
          setShowPresentationModal(false)
          setCurrentPresentationModule(null)
        }}
      />
      </div>
    </div>
  )
}
