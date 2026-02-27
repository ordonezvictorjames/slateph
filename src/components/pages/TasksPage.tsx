'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
}

interface Instructor {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
}

interface Course {
  id: string
  title: string
  status: string
}

interface FeatureRequest {
  id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  user?: {
    first_name: string
    last_name: string
  }
}

interface PasswordResetRequest {
  id: string
  title: string
  message: string
  created_at: string
  user_email: string
  user_name: string
}

interface BugReport {
  id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  user?: {
    first_name: string
    last_name: string
  }
}

export default function TasksPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [unenrolledStudents, setUnenrolledStudents] = useState<Student[]>([])
  const [unassignedInstructors, setUnassignedInstructors] = useState<Instructor[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([])
  const [passwordResets, setPasswordResets] = useState<PasswordResetRequest[]>([])
  const [bugReports, setBugReports] = useState<BugReport[]>([])
  const [selectedTab, setSelectedTab] = useState<'students' | 'instructors' | 'features' | 'passwords' | 'bugs'>('students')
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const supabase = createClient()

  const userRole = user?.profile?.role || 'student'

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'developer') {
      fetchTasks()
    }
  }, [userRole])

  const fetchTasks = async () => {
    try {
      setLoading(true)

      // Fetch all students
      const { data: allStudents } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      // Fetch enrolled students
      const { data: enrolledStudents } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('status', 'active')

      const enrolledStudentIds = new Set(enrolledStudents?.map((e: { student_id: string }) => e.student_id) || [])
      const unenrolled = (allStudents || []).filter((s: Student) => !enrolledStudentIds.has(s.id))
      setUnenrolledStudents(unenrolled)

      // Fetch all instructors
      const { data: allInstructors } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at')
        .eq('role', 'instructor')
        .order('created_at', { ascending: false })

      // Fetch assigned instructors
      const { data: assignedInstructors } = await supabase
        .from('subjects')
        .select('instructor_id')
        .not('instructor_id', 'is', null)

      const assignedInstructorIds = new Set(assignedInstructors?.map((s: { instructor_id: string }) => s.instructor_id) || [])
      const unassigned = (allInstructors || []).filter((i: Instructor) => !assignedInstructorIds.has(i.id))
      setUnassignedInstructors(unassigned)

      // Fetch active courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, status')
        .eq('status', 'active')
        .order('title', { ascending: true })

      setCourses(coursesData || [])

      // Fetch pending and in-progress feature requests (for developers)
      if (userRole === 'developer' || userRole === 'admin') {
        // Fetch feature requests (category = 'feature')
        const { data: requests } = await supabase
          .from('feature_requests')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            created_at,
            user_id,
            category
          `)
          .eq('category', 'feature')
          .in('status', ['pending', 'ongoing'])
          .order('created_at', { ascending: false })

        // Fetch user details for each request
        const requestsWithUsers = await Promise.all(
          (requests || []).map(async (req: any) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', req.user_id)
              .single()

            return {
              ...req,
              user: userData
            }
          })
        )

        setFeatureRequests(requestsWithUsers)

        // Fetch bug reports (category = 'bug')
        const { data: bugs } = await supabase
          .from('feature_requests')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            created_at,
            user_id,
            category
          `)
          .eq('category', 'bug')
          .in('status', ['pending', 'ongoing'])
          .order('created_at', { ascending: false })

        // Fetch user details for each bug
        const bugsWithUsers = await Promise.all(
          (bugs || []).map(async (bug: any) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', bug.user_id)
              .single()

            return {
              ...bug,
              user: userData
            }
          })
        )

        setBugReports(bugsWithUsers)

        // Fetch password reset requests from notifications
        const { data: passwordNotifications } = await supabase
          .from('notifications')
          .select('id, title, message, created_at')
          .eq('type', 'system_alert')
          .ilike('title', '%Password Reset%')
          .eq('is_read', false)
          .order('created_at', { ascending: false })

        // Parse password reset requests
        const passwordRequests = (passwordNotifications || []).map((notif: any) => {
          // Extract email from message using regex
          const emailMatch = notif.message.match(/\(([^)]+)\)/)
          const nameMatch = notif.message.match(/^([^(]+)/)
          
          return {
            id: notif.id,
            title: notif.title,
            message: notif.message,
            created_at: notif.created_at,
            user_email: emailMatch ? emailMatch[1] : 'Unknown',
            user_name: nameMatch ? nameMatch[1].trim() : 'Unknown User'
          }
        })

        setPasswordResets(passwordRequests)
      }

    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollStudent = async () => {
    if (!selectedStudent || !selectedCourse) return

    try {
      setProcessing(true)

      // Get course title first
      const { data: courseData } = await supabase
        .from('courses')
        .select('title')
        .eq('id', selectedCourse)
        .single()

      // Insert enrollment
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({
          course_id: selectedCourse,
          student_id: selectedStudent.id,
          status: 'active',
          enrolled_at: new Date().toISOString()
        })

      if (enrollError) throw enrollError

      // Manually create notification as backup (in case trigger doesn't work)
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedStudent.id,
          type: 'course_enrollment',
          title: 'Enrolled in Course',
          message: `You have been enrolled in ${courseData?.title || 'a course'}`,
          link: '/student/my-courses',
          metadata: {
            course_id: selectedCourse,
            course_title: courseData?.title
          }
        })
        .select()

      if (notifError) {
        console.error('Error creating notification:', notifError)
      }

      // Refresh tasks
      await fetchTasks()
      setShowEnrollModal(false)
      setSelectedStudent(null)
      setSelectedCourse('')
      
      alert(`${selectedStudent.first_name} ${selectedStudent.last_name} has been enrolled in ${courseData?.title || 'the course'}. A notification has been sent to the student.`)
    } catch (error) {
      console.error('Error enrolling student:', error)
      alert('Failed to enroll student')
    } finally {
      setProcessing(false)
    }
  }

  const handleAssignInstructor = async () => {
    if (!selectedInstructor || !selectedCourse) return

    try {
      setProcessing(true)

      // Get the first subject of the selected course
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, title')
        .eq('course_id', selectedCourse)
        .limit(1)

      if (!subjects || subjects.length === 0) {
        alert('This course has no subjects. Please create subjects first.')
        setProcessing(false)
        return
      }

      // Get course title
      const { data: courseData } = await supabase
        .from('courses')
        .select('title')
        .eq('id', selectedCourse)
        .single()

      // Assign instructor to the first subject
      const { error: assignError } = await supabase
        .from('subjects')
        .update({ instructor_id: selectedInstructor.id })
        .eq('id', subjects[0].id)

      if (assignError) throw assignError

      // Manually create notification as backup (in case trigger doesn't work)
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedInstructor.id,
          type: 'course_assignment',
          title: 'Assigned to Subject',
          message: `You have been assigned to teach ${subjects[0].title} in ${courseData?.title || 'a course'}`,
          link: '/instructor/courses',
          metadata: {
            subject_id: subjects[0].id,
            subject_title: subjects[0].title,
            course_title: courseData?.title
          }
        })
        .select()

      if (notifError) {
        console.error('Error creating notification:', notifError)
      }

      // Refresh tasks
      await fetchTasks()
      setShowAssignModal(false)
      setSelectedInstructor(null)
      setSelectedCourse('')
      
      alert(`${selectedInstructor.first_name} ${selectedInstructor.last_name} has been assigned to ${subjects[0].title} in ${courseData?.title || 'the course'}. A notification has been sent to the instructor.`)
    } catch (error) {
      console.error('Error assigning instructor:', error)
      alert('Failed to assign instructor')
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdateFeatureStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', requestId)

      if (error) {
        console.error('Error updating feature request:', error)
        alert(`Failed to update feature request: ${error.message || 'Unknown error'}`)
        return
      }

      // Refresh tasks
      await fetchTasks()
    } catch (error) {
      console.error('Error updating feature request:', error)
      alert('Failed to update feature request')
    }
  }

  const handleResolvePasswordReset = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error resolving password reset:', error)
        alert(`Failed to resolve password reset request: ${error.message || 'Unknown error'}`)
        return
      }

      // Refresh tasks
      await fetchTasks()
      alert('Password reset request marked as resolved')
    } catch (error) {
      console.error('Error resolving password reset:', error)
      alert('Failed to resolve password reset request')
    }
  }

  const handleUpdateBugStatus = async (bugId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', bugId)

      if (error) {
        console.error('Error updating bug report:', error)
        alert(`Failed to update bug report: ${error.message || 'Unknown error'}`)
        return
      }

      // Refresh tasks
      await fetchTasks()
    } catch (error) {
      console.error('Error updating bug report:', error)
      alert('Failed to update bug report')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700'
      case 'ongoing': return 'bg-blue-100 text-blue-700'
      case 'finished': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (userRole !== 'admin' && userRole !== 'developer') {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <Loading size="lg" className="h-64" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-600 mt-1">Manage and resolve pending tasks</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('students')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'students'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unenrolled Students
            {unenrolledStudents.length > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {unenrolledStudents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSelectedTab('instructors')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'instructors'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unassigned Instructors
            {unassignedInstructors.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {unassignedInstructors.length}
              </span>
            )}
          </button>
          {userRole === 'developer' && (
            <button
              onClick={() => setSelectedTab('features')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'features'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Feature Requests
              {featureRequests.length > 0 && (
                <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {featureRequests.length}
                </span>
              )}
            </button>
          )}
          {(userRole === 'admin' || userRole === 'developer') && (
            <button
              onClick={() => setSelectedTab('passwords')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'passwords'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Password Resets
              {passwordResets.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {passwordResets.length}
                </span>
              )}
            </button>
          )}
          {(userRole === 'admin' || userRole === 'developer') && (
            <button
              onClick={() => setSelectedTab('bugs')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'bugs'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bug Reports
              {bugReports.length > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {bugReports.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {selectedTab === 'students' && (
          <div className="overflow-x-auto">
            {unenrolledStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">All students enrolled</h3>
                <p className="text-gray-600 mt-1">There are no unenrolled students at the moment.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unenrolledStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{student.email}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(student.created_at)}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedStudent(student)
                            setShowEnrollModal(true)
                          }}
                          className="text-black hover:text-gray-700 font-semibold"
                        >
                          Enroll
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {selectedTab === 'instructors' && (
          <div className="overflow-x-auto">
            {unassignedInstructors.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">All instructors assigned</h3>
                <p className="text-gray-600 mt-1">There are no unassigned instructors at the moment.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unassignedInstructors.map((instructor) => (
                    <tr key={instructor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {instructor.first_name} {instructor.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{instructor.email}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(instructor.created_at)}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedInstructor(instructor)
                            setShowAssignModal(true)
                          }}
                          className="text-black hover:text-gray-700 font-semibold"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {selectedTab === 'features' && userRole === 'developer' && (
          <div className="overflow-x-auto">
            {featureRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No pending requests</h3>
                <p className="text-gray-600 mt-1">All feature requests have been processed.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {featureRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{request.description}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {request.user ? `${request.user.first_name} ${request.user.last_name}` : 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(request.created_at)}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateFeatureStatus(request.id, 'ongoing')}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              Start
                            </button>
                          )}
                          {request.status === 'ongoing' && (
                            <button
                              onClick={() => handleUpdateFeatureStatus(request.id, 'finished')}
                              className="text-green-600 hover:text-green-800 font-semibold"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {selectedTab === 'passwords' && (userRole === 'admin' || userRole === 'developer') && (
          <div className="overflow-x-auto">
            {passwordResets.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No pending password resets</h3>
                <p className="text-gray-600 mt-1">All password reset requests have been processed.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {passwordResets.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.user_name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{request.user_email}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(request.created_at)}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleResolvePasswordReset(request.id)}
                          className="text-green-600 hover:text-green-800 font-semibold"
                        >
                          Mark Resolved
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {selectedTab === 'bugs' && (userRole === 'admin' || userRole === 'developer') && (
          <div className="overflow-x-auto">
            {bugReports.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No bug reports</h3>
                <p className="text-gray-600 mt-1">No bugs have been reported. System running smoothly!</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bugReports.map((bug) => (
                    <tr key={bug.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="text-sm font-medium text-gray-900">{bug.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{bug.description}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {bug.user ? `${bug.user.first_name} ${bug.user.last_name}` : 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(bug.priority)}`}>
                          {bug.priority}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bug.status)}`}>
                          {bug.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(bug.created_at)}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {bug.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateBugStatus(bug.id, 'ongoing')}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              Start
                            </button>
                          )}
                          {bug.status === 'ongoing' && (
                            <button
                              onClick={() => handleUpdateBugStatus(bug.id, 'finished')}
                              className="text-green-600 hover:text-green-800 font-semibold"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Enroll Student Modal */}
      {showEnrollModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Enroll Student</h3>
            <p className="text-gray-600 mb-4">
              Enroll <span className="font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</span> to a course:
            </p>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent mb-6"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowEnrollModal(false)
                  setSelectedStudent(null)
                  setSelectedCourse('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleEnrollStudent}
                disabled={!selectedCourse || processing}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Enrolling...' : 'Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Instructor Modal */}
      {showAssignModal && selectedInstructor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Instructor</h3>
            <p className="text-gray-600 mb-4">
              Assign <span className="font-semibold">{selectedInstructor.first_name} {selectedInstructor.last_name}</span> to a course:
            </p>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent mb-6"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedInstructor(null)
                  setSelectedCourse('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignInstructor}
                disabled={!selectedCourse || processing}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
