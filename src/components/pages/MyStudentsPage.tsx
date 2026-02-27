'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/loading'
import type { Course } from '@/types'

interface trainee {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  status: string
  avatar_url?: string
  enrolled_courses: string[]
}

export default function MytraineesPage() {
  const [trainees, settrainees] = useState<trainee[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (user?.profile?.role === 'trainee') {
      fetchMytrainees()
    }
  }, [user])

  const fetchMytrainees = async () => {
    try {
      setLoading(true)

      // Get courses taught by this trainee
      const { data: traineeCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('trainee_id', user?.id)

      if (coursesError) {
        console.error('Error fetching trainee courses:', coursesError)
        return
      }

      if (!traineeCourses || traineeCourses.length === 0) {
        settrainees([])
        return
      }

      const courseIds = traineeCourses.map((course: Pick<Course, 'id' | 'title'>) => course.id)

      // Get trainees enrolled in these courses
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select(`
          trainee_id,
          course_id,
          trainee:profiles!course_enrollments_trainee_id_fkey(
            id,
            first_name,
            last_name,
            email,
            role,
            status,
            avatar_url
          ),
          course:courses!course_enrollments_course_id_fkey(title)
        `)
        .in('course_id', courseIds)
        .eq('status', 'active')

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError)
        return
      }

      // Group trainees and their enrolled courses
      const traineeMap = new Map<string, trainee>()

      enrollments?.forEach((enrollment: any) => {
        const trainee = enrollment.trainee
        if (!trainee) return

        if (traineeMap.has(trainee.id)) {
          const existingtrainee = traineeMap.get(trainee.id)!
          existingtrainee.enrolled_courses.push(enrollment.course.title)
        } else {
          traineeMap.set(trainee.id, {
            id: trainee.id,
            first_name: trainee.first_name,
            last_name: trainee.last_name,
            email: trainee.email,
            role: trainee.role,
            status: trainee.status,
            avatar_url: trainee.avatar_url,
            enrolled_courses: [enrollment.course.title]
          })
        }
      })

      settrainees(Array.from(traineeMap.values()))
    } catch (error) {
      console.error('Error fetching trainees:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getRoleBadge = (role: string) => {
    const roleStyles = {
      admin: 'bg-purple-100 text-purple-800',
      instructor: 'bg-green-100 text-green-800',
      trainee: 'bg-blue-100 text-blue-800',
      developer: 'bg-orange-100 text-orange-800'
    }
    
    const roleNames: Record<string, string> = {
      admin: 'Admin',
      instructor: 'Instructor',
      trainee: 'Trainee',
      developer: 'Developer'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleStyles[role as keyof typeof roleStyles] || roleStyles.trainee}`}>
        {roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My trainees</h1>
              <p className="text-gray-600 mt-1">trainees enrolled in your courses</p>
            </div>
            <div className="text-sm text-gray-500">
              {trainees.length} trainee{trainees.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  trainee
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled Courses
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trainees.length > 0 ? (
                trainees.map((trainee) => (
                  <tr key={trainee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {trainee.avatar_url ? (
                            trainee.avatar_url.length <= 2 ? (
                              <span className="text-lg">{trainee.avatar_url}</span>
                            ) : (
                              <img src={trainee.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <span className="text-gray-600 font-medium text-sm">
                              {trainee.first_name.charAt(0).toUpperCase()}{trainee.last_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {trainee.first_name} {trainee.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{trainee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(trainee.role)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {trainee.enrolled_courses.map((course, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                            {course}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(trainee.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No trainees found</h3>
                    <p className="text-gray-500">You don't have any trainees enrolled in your courses yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-4 space-y-4">
          {trainees.length > 0 ? (
            trainees.map((trainee) => (
              <div key={trainee.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {trainee.avatar_url ? (
                      trainee.avatar_url.length <= 2 ? (
                        <span className="text-xl">{trainee.avatar_url}</span>
                      ) : (
                        <img src={trainee.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <span className="text-gray-600 font-medium">
                        {trainee.first_name.charAt(0).toUpperCase()}{trainee.last_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900">
                      {trainee.first_name} {trainee.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{trainee.email}</div>
                  </div>
                  {getStatusBadge(trainee.status)}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    {getRoleBadge(trainee.role)}
                  </div>
                </div>
                
                {trainee.enrolled_courses.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-2">Enrolled Courses:</div>
                    <div className="flex flex-wrap gap-1">
                      {trainee.enrolled_courses.map((course, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trainees found</h3>
              <p className="text-gray-500">You don't have any trainees enrolled in your courses yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}