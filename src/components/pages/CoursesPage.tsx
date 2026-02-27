'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading, ButtonLoading } from '@/components/ui/loading'
import LessonViewer from '@/components/LessonViewer'

interface Course {
  id: string
  title: string
  description: string
  course_group?: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'student' | 'tesda_scholar' | 'both'
  created_at: string
  subjects?: Subject[]
  student_enrollments?: number
  total_modules?: number
}

interface Subject {
  id: string
  title: string
  description?: string
  status?: 'active' | 'inactive' | 'draft'
  instructor?: {
    first_name: string
    last_name: string
  }
  instructor_name?: string
  modules?: CourseModule[]
}

interface CourseModule {
  id: string
  title: string
  description: string
  content_type: 'video' | 'text' | 'online_conference' | 'online_document' | 'pdf_document' | 'canva_presentation'
  status: 'active' | 'inactive' | 'draft'
  duration_minutes?: number
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
  order_index: number
  subject_id: string
  created_at: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null)
  const [viewMode, setViewMode] = useState<'courses' | 'subjects' | 'modules'>('courses')
  const [modules, setModules] = useState<CourseModule[]>([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [isLessonViewerOpen, setIsLessonViewerOpen] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const userRole = user?.profile?.role || 'student'

      let coursesQuery = supabase.from('courses').select('*')

      // Role-based filtering
      if (userRole === 'student') {
        // Students only see courses they can enroll in (student or both)
        coursesQuery = coursesQuery.in('enrollment_type', ['student', 'both'])
      }
      // Instructors, admins, and developers see all courses (no filtering)

      const { data: coursesData, error: coursesError } = await coursesQuery.order('created_at', { ascending: false })

      if (coursesError) {
        console.error('Error fetching courses:', coursesError)
        return
      }

      // For each course, fetch subjects, modules, and enrollment counts
      const coursesWithDetails = await Promise.all(
        (coursesData || []).map(async (course: Course) => {
          // Fetch subjects for this course
          const { data: subjects, error: subjectsError } = await supabase
            .from('subjects')
            .select(`
              id, 
              title, 
              description, 
              status, 
              instructor:profiles!subjects_instructor_id_fkey(first_name, last_name)
            `)
            .eq('course_id', course.id)
            .order('order_index', { ascending: true })

          if (subjectsError) {
            console.error('Error fetching subjects:', subjectsError)
          }

          // Fetch modules count for this course
          let totalModules = 0
          if (subjects && subjects.length > 0) {
            const { data: modules, error: modulesError } = await supabase
              .from('modules')
              .select('id')
              .in('subject_id', subjects.map((s: Subject) => s.id))

            if (!modulesError && modules) {
              totalModules = modules.length
            }
          }

          // Fetch enrollment counts for this course
          let studentEnrollments = 0
          
          // Get all enrollments for this course
          const { data: allEnrollments, error: enrollmentError } = await supabase
            .from('course_enrollments')
            .select(`
              id,
              student:profiles!course_enrollments_student_id_fkey(role)
            `)
            .eq('course_id', course.id)
            .eq('status', 'active')
          
          if (!enrollmentError && allEnrollments) {
            // Count enrollments by student role
            interface EnrollmentWithRole {
              student: { role: string }
            }
            allEnrollments.forEach((enrollment: EnrollmentWithRole) => {
              const role = enrollment.student.role
              if (role === 'student') {
                studentEnrollments++
              }
            })
          }

          // Process subjects to add instructor_name
          const processedSubjects = (subjects || []).map((subject: any) => ({
            ...subject,
            instructor_name: subject.instructor 
              ? `${subject.instructor.first_name} ${subject.instructor.last_name}`
              : undefined
          }))

          return {
            ...course,
            subjects: processedSubjects,
            total_modules: totalModules,
            student_enrollments: studentEnrollments || 0
          }
        })
      )

      setCourses(coursesWithDetails)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchModules = async (subjectId: string) => {
    try {
      setLoadingModules(true)
      const { data: modulesData, error } = await supabase
        .from('modules')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching modules:', error)
        return
      }

      setModules(modulesData || [])
    } catch (error) {
      console.error('Error fetching modules:', error)
    } finally {
      setLoadingModules(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      draft: 'bg-yellow-100 text-yellow-800'
    }
    
    const dotStyles = {
      active: 'bg-green-600',
      inactive: 'bg-red-600',
      draft: 'bg-yellow-600'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotStyles[status as keyof typeof dotStyles] || dotStyles.draft}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getEnrollmentTypeDisplay = (enrollmentType: string) => {
    const badges = []
    if (enrollmentType === 'student' || enrollmentType === 'both') {
      badges.push({ text: 'Students', color: 'bg-blue-100 text-blue-800' })
    }
    if (enrollmentType === 'tesda_scholar' || enrollmentType === 'both') {
      badges.push({ text: 'TESDA Scholars', color: 'bg-purple-100 text-purple-800' })
    }
    return badges
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
              <div className="h-36 bg-gray-200"></div>
              <div className="p-6 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Modules View
  if (viewMode === 'modules' && selectedSubject) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Back Button and Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => {
              setViewMode('subjects')
              setSelectedSubject(null)
              setModules([])
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Subjects</span>
          </button>

          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{selectedSubject.title} - Modules</h2>
          <p className="text-sm text-gray-500 mt-1">
            {modules.length} module{modules.length !== 1 ? 's' : ''} in this subject
          </p>
        </div>

        {/* Modules List */}
        {loadingModules ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                <div className="h-32 bg-gray-200"></div>
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : modules.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module, index) => (
              <div
                key={module.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Module Header */}
                <div className="relative bg-white p-4 sm:p-6">
                  {/* Decorative Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
                      <defs>
                        <pattern id={`pattern-module-${module.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <circle cx="20" cy="20" r="2" fill="black" opacity="0.5"/>
                          <circle cx="0" cy="0" r="1" fill="black" opacity="0.3"/>
                          <circle cx="40" cy="40" r="1" fill="black" opacity="0.3"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#pattern-module-${module.id})`}/>
                    </svg>
                  </div>
                  
                  {/* Module Number Badge */}
                  <div className="relative flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-black/10 backdrop-blur-sm rounded-xl">
                      <span className="text-2xl font-bold text-black">{index + 1}</span>
                    </div>
                    {module.status && (
                      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full backdrop-blur-md ${
                        module.status === 'active' ? 'bg-green-500 text-white' :
                        module.status === 'inactive' ? 'bg-red-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {module.status.charAt(0).toUpperCase() + module.status.slice(1)}
                      </span>
                    )}
                  </div>
                  
                  {/* Module Title */}
                  <h3 className="relative text-xl font-bold text-black line-clamp-2">
                    {module.title}
                  </h3>
                </div>
                
                {/* Module Content */}
                <div className="p-4 sm:p-6 flex flex-col flex-1">
                  {/* Description */}
                  {module.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {module.description}
                    </p>
                  )}
                  
                  {/* Module Info */}
                  <div className="mt-auto space-y-3">
                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-semibold text-gray-900 capitalize">
                          {module.content_type.replace('_', ' ')}
                        </span>
                      </div>
                      {module.duration_minutes && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-semibold text-gray-900">
                            {module.duration_minutes} min
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Start Lesson Button */}
                    <button
                      onClick={() => {
                        setSelectedModule(module)
                        setIsLessonViewerOpen(true)
                      }}
                      className="w-full px-4 py-2.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2"
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
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No modules found</h3>
            <p className="text-gray-500">This subject doesn't have any modules yet.</p>
          </div>
        )}

        {/* Lesson Viewer */}
        {selectedModule && (
          <LessonViewer
            module={selectedModule}
            isOpen={isLessonViewerOpen}
            onClose={() => {
              setIsLessonViewerOpen(false)
              setSelectedModule(null)
            }}
          />
        )}
      </div>
    )
  }

  // Subjects View
  if (viewMode === 'subjects' && selectedCourse) {
    return (
      <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Back Button and Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => {
              setViewMode('courses')
              setSelectedCourse(null)
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Courses</span>
          </button>

          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Course Subjects</h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedCourse.subjects?.length || 0} subject{(selectedCourse.subjects?.length || 0) !== 1 ? 's' : ''} in this course
          </p>
        </div>

        {/* Subjects List */}
        {selectedCourse.subjects && selectedCourse.subjects.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {selectedCourse.subjects.map((subject, index) => (
              <div
                key={subject.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Subject Header */}
                <div className="relative bg-white p-4 sm:p-6">
                  {/* Decorative Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
                      <defs>
                        <pattern id={`pattern-subject-${subject.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <circle cx="20" cy="20" r="2" fill="black" opacity="0.5"/>
                          <circle cx="0" cy="0" r="1" fill="black" opacity="0.3"/>
                          <circle cx="40" cy="40" r="1" fill="black" opacity="0.3"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#pattern-subject-${subject.id})`}/>
                    </svg>
                  </div>
                  
                  {/* Subject Number Badge */}
                  <div className="relative flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-black/10 backdrop-blur-sm rounded-xl">
                      <span className="text-2xl font-bold text-black">{index + 1}</span>
                    </div>
                    {subject.status && (
                      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full backdrop-blur-md ${
                        subject.status === 'active' ? 'bg-green-500 text-white' :
                        subject.status === 'inactive' ? 'bg-red-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {subject.status.charAt(0).toUpperCase() + subject.status.slice(1)}
                      </span>
                    )}
                  </div>
                  
                  {/* Subject Title */}
                  <h3 className="relative text-xl font-bold text-black line-clamp-2">
                    {subject.title}
                  </h3>
                </div>
                
                {/* Subject Content */}
                <div className="p-4 sm:p-6 flex flex-col flex-1">
                  {/* Description */}
                  {subject.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {subject.description}
                    </p>
                  )}
                  
                  {/* Instructor Info */}
                  {subject.instructor_name && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2 mb-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm text-gray-500">Instructor:</span>
                        <span className="text-sm font-semibold text-gray-900">{subject.instructor_name}</span>
                      </div>
                    </div>
                  )}

                  {/* View Modules Button */}
                  <div className="mt-auto pt-4">
                    <button
                      onClick={() => {
                        setSelectedSubject(subject)
                        fetchModules(subject.id)
                        setViewMode('modules')
                      }}
                      className="w-full px-4 py-2.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>View Modules</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No subjects found</h3>
            <p className="text-gray-500">This course doesn't have any subjects yet.</p>
          </div>
        )}
      </div>

      {/* Lesson Viewer */}
      {selectedModule && (
        <LessonViewer
          module={selectedModule}
          isOpen={isLessonViewerOpen}
          onClose={() => {
            setIsLessonViewerOpen(false)
            setSelectedModule(null)
          }}
        />
      )}
    </>
    )
  }

  // Courses View (default)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {user?.profile?.role === 'admin' ? 'All Courses' : 'My Courses'}
              </h1>
              <div className="relative group">
                <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {user?.profile?.role === 'admin' ? 'View and manage all courses in the system' :
                   'View your assigned courses and content'}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {courses.length} course{courses.length !== 1 ? 's' : ''} 
              {user?.profile?.role === 'admin' ? ' total' : ' assigned'}
            </p>
          </div>
        </div>
      </div>

      {/* Course Display - Table View for All Users */}
      {courses.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Group</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Enrollment</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Subjects</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Modules</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {courses.map((course, index) => (
                      <tr 
                        key={course.id} 
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 group"
                      >
                        <td className="px-6 py-3">
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {course.title}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{course.course_group || 'General'}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {getEnrollmentTypeDisplay(course.enrollment_type).map((badge, idx) => (
                              <span key={idx} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                                {badge.text}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {getStatusBadge(course.status)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-blue-600">{course.subjects?.length || 0}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-purple-600">{course.total_modules || 0}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-green-600">{course.student_enrollments || 0}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(course.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden p-4 space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{course.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* All Badges in One Row */}
                    <div className="flex items-center flex-wrap gap-2 mb-3">
                      {getStatusBadge(course.status)}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}
                      </span>
                      {getEnrollmentTypeDisplay(course.enrollment_type).map((badge, idx) => (
                        <span key={idx} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                          {badge.text}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-end text-sm text-gray-600 mb-3">
                      <span className="text-xs text-gray-500">{formatDate(course.created_at)}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{course.subjects?.length || 0}</div>
                        <div className="text-xs text-gray-500">Subjects</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{course.total_modules || 0}</div>
                        <div className="text-xs text-gray-500">Modules</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{course.student_enrollments || 0}</div>
                        <div className="text-xs text-gray-500">Students</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500">
            {user?.profile?.role === 'admin' ? 'Create your first course to get started.' :
             user?.profile?.role === 'instructor' ? 'You have not been assigned to any courses yet.' :
             'No courses are available for enrollment at this time.'}
          </p>
        </div>
      )}

      {/* Lesson Viewer */}
      {selectedModule && (
        <LessonViewer
          module={selectedModule}
          isOpen={isLessonViewerOpen}
          onClose={() => {
            setIsLessonViewerOpen(false)
            setSelectedModule(null)
          }}
        />
      )}
    </div>
  )
}