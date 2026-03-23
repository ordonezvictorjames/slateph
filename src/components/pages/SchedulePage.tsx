'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading, ButtonLoading } from '@/components/ui/loading'

// ── Class info constants (mirrors UserModals.tsx) ──────────────────────────
const SHS_ACADEMIC_STRANDS = [
  'Arts, Social Sciences, and Humanities',
  'Business and Entrepreneurship',
  'Science, Technology, Engineering, and Mathematics (STEM)',
  'Sports, Health, and Wellness',
  'Field Experience',
]
const SHS_TECHNICAL_STRANDS = [
  'Aesthetic, Wellness, and Human Care',
  'Agri-Fishery Business and Food Innovation',
  'Artisanry and Creative Enterprise',
  'Automotive and Small Engine Technologies',
  'Construction and Building Technologies',
  'Creative Arts and Design Technologies',
  'Hospitality and Tourism',
  'ICT Support and Computer Programming Technologies',
  'Industrial Technologies',
  'Maritime Transport',
]
const GRADE_JHS = [7, 8, 9, 10].map(g => `Grade ${g}`)
const GRADE_SHS = ['Grade 11', 'Grade 12']
const SECTIONS = Array.from({ length: 10 }, (_, i) => `Section ${i + 1}`)
const BATCHES = Array.from({ length: 10 }, (_, i) => `Batch ${i + 1}`)
const CLUSTERS = [
  { value: 'academic', label: 'Academic Cluster' },
  { value: 'technical', label: 'Technical Professional Cluster' },
]
// ──────────────────────────────────────────────────────────────────────────

interface CourseSchedule {
  id: string
  course_id: string
  title: string
  description: string | null
  batch_number: number
  start_date: string
  end_date: string
  enrollment_type: 'jhs_student' | 'shs_student' | 'college_student' | 'tesda_scholar' | 'trainee' | 'both'
  grade: string | null
  section: string | null
  cluster: string | null
  strand: string | null
  batch: string | null
  sections: string[] | null
  grade_levels: number[] | null
  strands: string[] | null
  batch_numbers: number[] | null
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  created_at: string
  course_title?: string
  course_type?: string
}

interface Course {
  id: string
  title: string
  course_type: string
}

export default function SchedulePage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [schedules, setSchedules] = useState<CourseSchedule[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [scheduleToDelete, setScheduleToDelete] = useState<CourseSchedule | null>(null)
  const [scheduleToEdit, setScheduleToEdit] = useState<CourseSchedule | null>(null)
  const [selectedDateSchedules, setSelectedDateSchedules] = useState<CourseSchedule[]>([])
  const [showDateModal, setShowDateModal] = useState(false)
  const [selectedDateString, setSelectedDateString] = useState('')
  
  const [newSchedule, setNewSchedule] = useState({
    course_id: '',
    title: '',
    description: '',
    batch_number: 1,
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    enrollment_type: 'jhs_student' as 'jhs_student' | 'shs_student' | 'college_student' | 'tesda_scholar',
    grade: '',
    section: '',
    cluster: '',
    strand: '',
    batch: '',
  })
  const [shsCluster, setShsCluster] = useState<'academic' | 'technical' | ''>('')

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchSchedules(),
        fetchCourses()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedules = async () => {
    const role = user?.profile?.role
    const isAdminOrDev = role === 'admin' || role === 'developer'

    if (isAdminOrDev) {
      // Admins and developers see all schedules
      const { data, error } = await supabase
        .from('course_schedules')
        .select('*, course:courses(title, course_type)')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Error fetching schedules:', error.message, error.code, error.details)
        return
      }
      setSchedules(data || [])
    } else {
      // Students and instructors: get their enrolled schedule IDs first
      const { data: enrollments, error: enrollError } = await supabase
        .from('schedule_enrollments')
        .select('schedule_id')
        .eq('user_id', user?.id)

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError.message, enrollError.code)
        // Table may not exist yet — show empty
        setSchedules([])
        return
      }

      const scheduleIds = (enrollments || []).map((e: { schedule_id: string }) => e.schedule_id)

      if (scheduleIds.length === 0) {
        setSchedules([])
        return
      }

      const { data, error } = await supabase
        .from('course_schedules')
        .select('*, course:courses(title, course_type)')
        .in('id', scheduleIds)
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Error fetching schedules:', error.message, error.code, error.details)
        return
      }
      setSchedules(data || [])
    }
  }

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, course_type')
      .eq('status', 'active')
      .order('title')

    if (error) {
      console.error('Error fetching courses:', error)
      return
    }

    setCourses(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Combine date and time into ISO timestamp
      const startDateTime = `${newSchedule.start_date}T${newSchedule.start_time}:00`
      const endDateTime = `${newSchedule.end_date}T${newSchedule.end_time}:00`

      const selectedCourse = courses.find(c => c.id === newSchedule.course_id)

      // Build title from class info
      let classTitle = ''
      if (newSchedule.enrollment_type === 'jhs_student') {
        classTitle = [newSchedule.grade, newSchedule.section].filter(Boolean).join(' - ')
      } else if (newSchedule.enrollment_type === 'shs_student') {
        const clusterLabel = CLUSTERS.find(c => c.value === shsCluster)?.label || ''
        classTitle = [clusterLabel, newSchedule.strand, newSchedule.grade, newSchedule.section].filter(Boolean).join(' - ')
      } else if (newSchedule.enrollment_type === 'college_student') {
        classTitle = newSchedule.section
      } else if (newSchedule.enrollment_type === 'tesda_scholar') {
        classTitle = newSchedule.batch || ''
      }

      const scheduleData = {
        course_id: newSchedule.course_id,
        title: classTitle || selectedCourse?.title || '',
        description: newSchedule.description || null,
        start_date: startDateTime,
        end_date: endDateTime,
        enrollment_type: newSchedule.enrollment_type,
        grade: newSchedule.grade || null,
        section: newSchedule.section || null,
        cluster: shsCluster || null,
        strand: newSchedule.strand || null,
        batch: newSchedule.batch || null,
        batch_number: 1,
        status: 'scheduled',
        created_by: user?.id
      }

      const { error } = await supabase
        .from('course_schedules')
        .insert([scheduleData])

      if (error) {
        console.error('Error creating schedule - message:', error.message)
        console.error('Error creating schedule - code:', error.code)
        console.error('Error creating schedule - details:', error.details)
        console.error('Error creating schedule - hint:', error.hint)
        console.error('Full error:', JSON.stringify(error))
        alert(`Error creating course schedule: ${error.message || error.code || 'Unknown error'}`)
        return
      }

      setNewSchedule({
        course_id: '',
        title: '',
        description: '',
        batch_number: 1,
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        enrollment_type: 'jhs_student',
        grade: '',
        section: '',
        cluster: '',
        strand: '',
        batch: '',
      })
      setShsCluster('')
      setShowAddModal(false)
      // Navigate calendar to the new schedule's start date so it's immediately visible
      setSelectedDate(new Date(startDateTime))
      await fetchData()

    } catch (error) {
      console.error('Error creating schedule:', error)
      alert('Error creating course schedule')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSchedule = (schedule: CourseSchedule) => {
    // Extract date and time from timestamps using local timezone
    const startDate = new Date(schedule.start_date)
    const endDate = new Date(schedule.end_date)
    
    // Format dates in local timezone (YYYY-MM-DD)
    const startDateStr = startDate.getFullYear() + '-' + 
      String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(startDate.getDate()).padStart(2, '0')
    const endDateStr = endDate.getFullYear() + '-' + 
      String(endDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(endDate.getDate()).padStart(2, '0')
    
    // Format times in local timezone (HH:MM)
    const startTimeStr = String(startDate.getHours()).padStart(2, '0') + ':' + 
      String(startDate.getMinutes()).padStart(2, '0')
    const endTimeStr = String(endDate.getHours()).padStart(2, '0') + ':' + 
      String(endDate.getMinutes()).padStart(2, '0')
    
    // Pre-populate the form with schedule data
    setNewSchedule({
      course_id: schedule.course_id,
      title: schedule.title,
      description: schedule.description || '',
      batch_number: schedule.batch_number,
      start_date: startDateStr,
      end_date: endDateStr,
      start_time: startTimeStr,
      end_time: endTimeStr,
      enrollment_type: schedule.enrollment_type as any,
      grade: '',
      section: '',
      cluster: '',
      strand: '',
      batch: '',
    })
    setScheduleToEdit(schedule)
    setShowEditModal(true)
  }

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleToEdit) return
    
    setSubmitting(true)

    try {
      // Build title from class info
      let classTitle = ''
      if (newSchedule.enrollment_type === 'jhs_student') {
        classTitle = [newSchedule.grade, newSchedule.section].filter(Boolean).join(' - ')
      } else if (newSchedule.enrollment_type === 'shs_student') {
        const clusterLabel = CLUSTERS.find(c => c.value === shsCluster)?.label || ''
        classTitle = [clusterLabel, newSchedule.strand, newSchedule.grade, newSchedule.section].filter(Boolean).join(' - ')
      } else if (newSchedule.enrollment_type === 'college_student') {
        classTitle = newSchedule.section
      } else if (newSchedule.enrollment_type === 'tesda_scholar') {
        classTitle = newSchedule.batch || ''
      }

      // Combine date and time into ISO timestamp
      const startDateTime = `${newSchedule.start_date}T${newSchedule.start_time}:00`
      const endDateTime = `${newSchedule.end_date}T${newSchedule.end_time}:00`

      const scheduleData = {
        course_id: newSchedule.course_id,
        title: classTitle || newSchedule.title,
        description: newSchedule.description || null,
        start_date: startDateTime,
        end_date: endDateTime,
        enrollment_type: newSchedule.enrollment_type,
        grade: newSchedule.grade || null,
        section: newSchedule.section || null,
        cluster: shsCluster || null,
        strand: newSchedule.strand || null,
        batch: newSchedule.batch || null,
      }

      const { error } = await supabase
        .from('course_schedules')
        .update(scheduleData)
        .eq('id', scheduleToEdit.id)

      if (error) {
        console.error('Error updating schedule:', error)
        alert('Error updating schedule')
        return
      }

      // Close modal and refresh data
      setScheduleToEdit(null)
      setShowEditModal(false)
      await fetchData()

    } catch (error) {
      console.error('Error updating schedule:', error)
      alert('Error updating schedule')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSchedule = (schedule: CourseSchedule) => {
    setScheduleToDelete(schedule)
    setShowDeleteModal(true)
  }

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return
    
    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('course_schedules')
        .delete()
        .eq('id', scheduleToDelete.id)

      if (error) {
        console.error('Error deleting schedule:', error)
        alert('Error deleting schedule')
        return
      }

      setScheduleToDelete(null)
      setShowDeleteModal(false)
      await fetchData()

    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Error deleting schedule')
    } finally {
      setSubmitting(false)
    }
  }

  const getMonthDates = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const dates = []
    const currentDate = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates
  }

  const getSchedulesForDate = (date: Date) => {
    // Create date strings in local timezone for comparison
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    return schedules.filter(schedule => {
      const startDate = new Date(schedule.start_date)
      const endDate = new Date(schedule.end_date)
      
      // Format schedule dates in local timezone
      const startDateString = startDate.getFullYear() + '-' + 
        String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(startDate.getDate()).padStart(2, '0')
      const endDateString = endDate.getFullYear() + '-' + 
        String(endDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(endDate.getDate()).padStart(2, '0')
      
      return dateString >= startDateString && dateString <= endDateString
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1))
    setSelectedDate(newDate)
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const formatTime = (dateString: string) => {
    // Parse the datetime string and ensure it's treated as local time
    const date = new Date(dateString)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const displayMinutes = String(minutes).padStart(2, '0')
    return `${displayHours}:${displayMinutes} ${ampm}`
  }

  const getEnrollmentLabel = (type: string) => {
    if (type === 'trainee') return 'Student'
    if (type === 'tesda_scholar') return 'Scholar'
    return 'Both'
  }

  const getCourseColor = (courseId: string) => {
    // Generate a consistent color based on course ID
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#F97316', // orange
    ]
    const index = courseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  if (loading) {
    return (
      <div className="p-8">
        <Loading size="lg" className="h-64" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Course Schedule
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                {(user?.profile?.role === 'admin' || user?.profile?.role === 'developer')
                  ? 'Manage and organize your course schedules'
                  : 'Your assigned class schedules'}
              </p>
            </div>
            
            {(user?.profile?.role === 'admin' || user?.profile?.role === 'developer') && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-2.5 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                  style={{ backgroundColor: '#1f7a8c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#155f6e'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Schedule</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Modern Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Calendar (50%) */}
          <div className="flex flex-col gap-6">
            {/* Dashboard-style Calendar */}
            <div className="rounded-xl p-4 shadow-sm border-2 border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Calendar</h3>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h4 className="font-semibold text-gray-800">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={`day-${index}`} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {getMonthDates().map((date, index) => {
                  const daySchedules = getSchedulesForDate(date)
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth()
                  const isToday = date.toDateString() === new Date().toDateString()
                  const hasEvent = daySchedules.length > 0

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (hasEvent) {
                          setSelectedDateSchedules(daySchedules)
                          setSelectedDateString(date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
                          setShowDateModal(true)
                        }
                      }}
                      className={`text-center text-sm py-2 relative cursor-pointer transition-colors ${
                        isToday
                          ? 'text-white rounded-lg font-bold'
                          : isCurrentMonth
                          ? 'text-gray-700 hover:bg-gray-100 rounded-lg'
                          : 'text-gray-300'
                      }`}
                      style={isToday ? { backgroundColor: '#1f7a8c' } : {}}
                    >
                      {date.getDate()}
                      {hasEvent && (
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                          <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-green-500'}`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Today's Events */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0]
              const todaysEvents = schedules.filter(s => {
                const sd = new Date(s.start_date).toISOString().split('T')[0]
                const ed = new Date(s.end_date).toISOString().split('T')[0]
                return todayStr >= sd && todayStr <= ed
              }).slice(0, 3)
              return (
                <div className="rounded-xl p-4 shadow-sm border-2 border-gray-200 bg-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-black">Today's Events</h3>
                      <p className="text-xs text-black/70">{todaysEvents.length} scheduled</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {todaysEvents.length > 0 ? todaysEvents.map(s => {
                      const color = getCourseColor(s.course_id)
                      const start = new Date(s.start_date)
                      const end = new Date(s.end_date)
                      const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                      return (
                        <div key={s.id} className="flex items-start space-x-2 p-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-black line-clamp-1">{s.title}</div>
                            <div className="text-xs text-gray-600 mt-0.5">{s.course_title}</div>
                            <div className="text-xs text-gray-500 mt-1">{timeStr}</div>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-black">No events today</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Upcoming Schedule */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0]
              const upcoming = schedules
                .filter(s => new Date(s.start_date).toISOString().split('T')[0] >= todayStr && (s.status === 'scheduled' || s.status === 'active'))
                .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, 5)
              const getDaysUntil = (dateStr: string) => {
                const diff = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                if (diff === 0) return 'Today'
                if (diff === 1) return 'Tomorrow'
                if (diff < 7) return `${diff} days`
                if (diff < 30) return `${Math.ceil(diff / 7)} weeks`
                return `${Math.ceil(diff / 30)} months`
              }
              const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              return (
                <div className="rounded-xl p-4 shadow-sm border-2 border-gray-200 bg-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-black">Upcoming Schedule</h3>
                      <p className="text-xs text-black/70">Next events</p>
                    </div>
                  </div>
                  {upcoming.length > 0 ? (
                    <div className="space-y-2.5">
                      {upcoming.map(s => {
                        const color = getCourseColor(s.course_id)
                        return (
                          <div key={s.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all">
                            <div className="w-8 h-8 rounded-lg mt-0.5 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-black truncate">{s.title}</h4>
                                  <p className="text-xs text-gray-600 mt-0.5">{s.course_title} • Batch {s.batch_number}</p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500">{fmtDate(s.start_date)} - {fmtDate(s.end_date)}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">{fmtTime(s.start_date)}</span>
                                  </div>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ml-2 flex-shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                                  {getDaysUntil(s.start_date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-black">No upcoming schedules</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Right Column - Day Schedule View */}
          <div className="rounded-xl overflow-hidden flex flex-col shadow-sm border-2 border-gray-200">
            {/* Blue Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#1f7a8c' }}>
              <span className="text-white font-semibold text-sm">Day</span>
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-white text-sm font-medium">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d) }}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d) }}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Time Grid */}
            <div className="bg-white flex-1 pt-3">
              {(() => {
                const SLOT_HEIGHT = 64 // px per hour
                const START_HOUR = 8
                const END_HOUR = 23 // 10 PM last label
                const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

                // Get schedules active on selectedDate
                const yr = selectedDate.getFullYear()
                const mo = String(selectedDate.getMonth() + 1).padStart(2, '0')
                const dy = String(selectedDate.getDate()).padStart(2, '0')
                const dateStr = `${yr}-${mo}-${dy}`
                const daySchedules = schedules.filter(s => {
                  const sd = new Date(s.start_date)
                  const ed = new Date(s.end_date)
                  const sdStr = sd.getFullYear() + '-' + String(sd.getMonth()+1).padStart(2,'0') + '-' + String(sd.getDate()).padStart(2,'0')
                  const edStr = ed.getFullYear() + '-' + String(ed.getMonth()+1).padStart(2,'0') + '-' + String(ed.getDate()).padStart(2,'0')
                  return dateStr >= sdStr && dateStr <= edStr
                })


                const totalHeight = (END_HOUR - START_HOUR) * SLOT_HEIGHT

                return (
                  <div className="relative" style={{ height: `${totalHeight}px` }}>
                    {/* Hour rows */}
                    {hours.map((hour) => {
                      const ampm = hour >= 12 ? 'PM' : 'AM'
                      const display = `${hour % 12 || 12}:00 ${ampm}`
                      const top = (hour - START_HOUR) * SLOT_HEIGHT
                      return (
                        <div key={hour} className="absolute left-0 right-0 flex" style={{ top: `${top}px`, height: `${SLOT_HEIGHT}px` }}>
                          {/* Time label */}
                          <div className="w-20 flex-shrink-0 text-right pr-3 pt-1">
                            <span className="text-xs text-gray-400 font-medium">{display}</span>
                          </div>
                          {/* Row divider */}
                          <div className="flex-1 border-t border-gray-100" />
                        </div>
                      )
                    })}

                    {/* Event blocks — overlap-aware column layout */}
                    {(() => {
                      const LEFT_OFFSET = 84
                      const RIGHT_MARGIN = 12
                      const GAP = 4

                      // 1. Compute time bounds for every schedule on this day
                      const events = daySchedules.map(s => {
                        const sd = new Date(s.start_date)
                        const ed = new Date(s.end_date)
                        let sMins = sd.getHours() * 60 + sd.getMinutes()
                        let eMins = ed.getHours() * 60 + ed.getMinutes()
                        // fallback for date-only records → 8 AM–9 AM
                        if (sMins === 0 && eMins === 0) { sMins = START_HOUR * 60; eMins = sMins + 60 }
                        // ensure at least 1 min duration so overlap detection works
                        if (eMins <= sMins) eMins = sMins + 60
                        return { s, sMins, eMins, col: 0, numCols: 1 }
                      })

                      // 2. Build overlap groups (connected components)
                      // Two events overlap if their time ranges intersect (strict)
                      const n = events.length
                      const parent = Array.from({ length: n }, (_, i) => i)
                      const find = (x: number): number => parent[x] === x ? x : (parent[x] = find(parent[x]))
                      const union = (a: number, b: number) => { parent[find(a)] = find(b) }

                      for (let i = 0; i < n; i++) {
                        for (let j = i + 1; j < n; j++) {
                          if (events[i].sMins < events[j].eMins && events[j].sMins < events[i].eMins) {
                            union(i, j)
                          }
                        }
                      }

                      // 3. For each group, assign columns greedily (sorted by start time)
                      const groups: Record<number, number[]> = {}
                      for (let i = 0; i < n; i++) {
                        const root = find(i)
                        if (!groups[root]) groups[root] = []
                        groups[root].push(i)
                      }

                      Object.values(groups).forEach(indices => {
                        // sort by start time within group
                        indices.sort((a, b) => events[a].sMins - events[b].sMins)
                        // colEnd[c] = end minute of last event placed in column c
                        const colEnd: number[] = []
                        indices.forEach(idx => {
                          let placed = false
                          for (let c = 0; c < colEnd.length; c++) {
                            if (colEnd[c] <= events[idx].sMins) {
                              colEnd[c] = events[idx].eMins
                              events[idx].col = c
                              placed = true
                              break
                            }
                          }
                          if (!placed) {
                            events[idx].col = colEnd.length
                            colEnd.push(events[idx].eMins)
                          }
                        })
                        // all events in this group share the same numCols = total columns used
                        const groupNumCols = colEnd.length
                        indices.forEach(idx => { events[idx].numCols = groupNumCols })
                      })

                      // 4. Render
                      return events.map(({ s, sMins, eMins, col, numCols }) => {
                        const topPx = ((sMins - START_HOUR * 60) / 60) * SLOT_HEIGHT
                        const heightPx = Math.max(((eMins - sMins) / 60) * SLOT_HEIGHT, 32)
                        const color = getCourseColor(s.course_id)
                        const sd = new Date(s.start_date)
                        const startLabel = `${sd.getHours() % 12 || 12}:${String(sd.getMinutes()).padStart(2,'0')} ${sd.getHours() >= 12 ? 'pm' : 'am'}`

                        // pixel-based positioning inside the event area
                        // left = LEFT_OFFSET + col * slotWidth + col * GAP
                        // width = slotWidth = (available - (numCols-1)*GAP) / numCols
                        const slotWidthExpr = `(100% - ${LEFT_OFFSET + RIGHT_MARGIN + (numCols - 1) * GAP}px) / ${numCols}`
                        const leftExpr = `${LEFT_OFFSET}px + ${col} * (${slotWidthExpr} + ${GAP}px)`

                        return (
                          <div
                            key={s.id}
                            className="absolute rounded-md px-3 py-2 overflow-hidden group transition-all border-l-4"
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              left: `calc(${leftExpr})`,
                              width: `calc(${slotWidthExpr})`,
                              backgroundColor: '#ffffff',
                              borderLeftColor: color,
                              borderTopColor: '#e5e7eb',
                              borderRightColor: '#e5e7eb',
                              borderBottomColor: '#e5e7eb',
                              borderTopWidth: '1px',
                              borderRightWidth: '1px',
                              borderBottomWidth: '1px',
                            }}
                          >
                            <div className="flex items-start justify-between gap-2 h-full">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium" style={{ color }}>{startLabel}</div>
                                <div className="text-sm font-bold truncate text-gray-800">{s.title}</div>
                                {s.course_title && <div className="text-xs text-gray-500 truncate">{s.course_title}</div>}
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-xs font-semibold" style={{ color }}>Batch {s.batch_number}</span>
                                {(user?.profile?.role === 'admin' || user?.profile?.role === 'developer') && (
                                <div className="hidden group-hover:flex items-center gap-1 mt-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditSchedule(s) }}
                                    className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                                    title="Edit"
                                  >
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(s) }}
                                    className="p-1 rounded-md hover:bg-red-50 transition-colors"
                                    title="Delete"
                                  >
                                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}


                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Schedule Course</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course
                  </label>
                  <select
                    required
                    value={newSchedule.course_id}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, course_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.course_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newSchedule.start_date}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newSchedule.end_date}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, end_date: e.target.value }))}
                    min={newSchedule.start_date}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                {/* Date Range Preview */}
                {newSchedule.start_date && newSchedule.end_date && (
                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Schedule Preview</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Duration:</span> {
                          Math.ceil((new Date(newSchedule.end_date).getTime() - new Date(newSchedule.start_date).getTime()) / (1000 * 60 * 60 * 24) + 1)
                        } days
                      </div>
                      <div>
                        <span className="font-medium">Date Range:</span> {formatDateRange(newSchedule.start_date, newSchedule.end_date)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enrollment Type
                  </label>
                  <select
                    required
                    value={newSchedule.enrollment_type}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, enrollment_type: e.target.value as any, grade: '', section: '', cluster: '', strand: '', batch: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="jhs_student">JHS Student</option>
                    <option value="shs_student">SHS Student</option>
                    <option value="college_student">College Student</option>
                    <option value="tesda_scholar">TESDA Scholar</option>
                  </select>
                </div>

                {/* JHS: Grade + Section */}
                {newSchedule.enrollment_type === 'jhs_student' && (<>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                    <select required value={newSchedule.grade} onChange={(e) => setNewSchedule(prev => ({ ...prev, grade: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select grade</option>
                      {GRADE_JHS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select required value={newSchedule.section} onChange={(e) => setNewSchedule(prev => ({ ...prev, section: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select section</option>
                      {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </>)}

                {/* SHS: Cluster + Strand + Grade + Section */}
                {newSchedule.enrollment_type === 'shs_student' && (<>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                    <select required value={newSchedule.grade} onChange={(e) => setNewSchedule(prev => ({ ...prev, grade: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select grade</option>
                      {GRADE_SHS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select required value={newSchedule.section} onChange={(e) => setNewSchedule(prev => ({ ...prev, section: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select section</option>
                      {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cluster</label>
                    <select required value={shsCluster} onChange={(e) => { setShsCluster(e.target.value as any); setNewSchedule(prev => ({ ...prev, strand: '' })) }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select cluster</option>
                      {CLUSTERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  {shsCluster && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Strand</label>
                      <select required value={newSchedule.strand} onChange={(e) => setNewSchedule(prev => ({ ...prev, strand: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                        <option value="">Select strand</option>
                        {(shsCluster === 'academic' ? SHS_ACADEMIC_STRANDS : SHS_TECHNICAL_STRANDS).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </>)}

                {/* College: Section */}
                {newSchedule.enrollment_type === 'college_student' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select required value={newSchedule.section} onChange={(e) => setNewSchedule(prev => ({ ...prev, section: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select section</option>
                      {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {/* TESDA Scholar: Batch */}
                {newSchedule.enrollment_type === 'tesda_scholar' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
                    <select required value={newSchedule.batch} onChange={(e) => setNewSchedule(prev => ({ ...prev, batch: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select batch</option>
                      {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#1f7a8c] text-white rounded-lg hover:bg-[#155f6e] transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Creating...' : 'Create Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Schedule Modal */}
      {showEditModal && scheduleToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Edit Schedule</h2>
                <button 
                  onClick={() => {
                    setShowEditModal(false)
                    setScheduleToEdit(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateSchedule} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course
                  </label>
                  <select
                    required
                    value={newSchedule.course_id}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, course_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.course_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newSchedule.start_date}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newSchedule.end_date}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, end_date: e.target.value }))}
                    min={newSchedule.start_date}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                {newSchedule.start_date && newSchedule.end_date && (
                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Schedule Preview</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Duration:</span> {
                          Math.ceil((new Date(newSchedule.end_date).getTime() - new Date(newSchedule.start_date).getTime()) / (1000 * 60 * 60 * 24) + 1)
                        } days
                      </div>
                      <div>
                        <span className="font-medium">Date Range:</span> {formatDateRange(newSchedule.start_date, newSchedule.end_date)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enrollment Type
                  </label>
                  <select
                    required
                    value={newSchedule.enrollment_type}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, enrollment_type: e.target.value as any, grade: '', section: '', cluster: '', strand: '', batch: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="jhs_student">JHS Student</option>
                    <option value="shs_student">SHS Student</option>
                    <option value="college_student">College Student</option>
                    <option value="tesda_scholar">TESDA Scholar</option>
                  </select>
                </div>

                {newSchedule.enrollment_type === 'jhs_student' && (<>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                    <select required value={newSchedule.grade} onChange={(e) => setNewSchedule(prev => ({ ...prev, grade: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select grade</option>
                      {GRADE_JHS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select required value={newSchedule.section} onChange={(e) => setNewSchedule(prev => ({ ...prev, section: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select section</option>
                      {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </>)}

                {newSchedule.enrollment_type === 'shs_student' && (<>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                    <select required value={newSchedule.grade} onChange={(e) => setNewSchedule(prev => ({ ...prev, grade: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select grade</option>
                      {GRADE_SHS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select required value={newSchedule.section} onChange={(e) => setNewSchedule(prev => ({ ...prev, section: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select section</option>
                      {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cluster</label>
                    <select required value={shsCluster} onChange={(e) => { setShsCluster(e.target.value as any); setNewSchedule(prev => ({ ...prev, strand: '' })) }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select cluster</option>
                      {CLUSTERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  {shsCluster && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Strand</label>
                      <select required value={newSchedule.strand} onChange={(e) => setNewSchedule(prev => ({ ...prev, strand: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                        <option value="">Select strand</option>
                        {(shsCluster === 'academic' ? SHS_ACADEMIC_STRANDS : SHS_TECHNICAL_STRANDS).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </>)}

                {newSchedule.enrollment_type === 'college_student' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select required value={newSchedule.section} onChange={(e) => setNewSchedule(prev => ({ ...prev, section: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select section</option>
                      {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {newSchedule.enrollment_type === 'tesda_scholar' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
                    <select required value={newSchedule.batch} onChange={(e) => setNewSchedule(prev => ({ ...prev, batch: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
                      <option value="">Select batch</option>
                      {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setScheduleToEdit(null)
                  }}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#1f7a8c] text-white rounded-lg hover:bg-[#155f6e] transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Updating...' : 'Update Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && scheduleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-black text-center mb-2">Delete Schedule</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <span className="font-medium">"{scheduleToDelete.title}"</span>? This action cannot be undone.
              </p>
              
              <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Course:</span>
                  <span className="font-medium">{scheduleToDelete.course_title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Batch:</span>
                  <span className="font-medium">Batch {scheduleToDelete.batch_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{formatDateRange(scheduleToDelete.start_date, scheduleToDelete.end_date)}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setScheduleToDelete(null)
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSchedule}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Deleting...' : 'Delete Schedule'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Date Details Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedDateString}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDateSchedules.length} schedule{selectedDateSchedules.length !== 1 ? 's' : ''} on this day
                  </p>
                </div>
                <button 
                  onClick={() => setShowDateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-4">
                {selectedDateSchedules.map((schedule) => {
                  const color = getCourseColor(schedule.course_id)
                  return (
                    <div
                      key={schedule.id}
                      className="border-2 rounded-xl p-4 hover:shadow-lg transition-all duration-200"
                      style={{ borderColor: color }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md"
                            style={{ backgroundColor: color }}
                          >
                            {schedule.batch_number}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{schedule.title}</h3>
                            <p className="text-sm text-gray-600">{schedule.course_title}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          schedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          schedule.status === 'active' ? 'bg-green-100 text-green-800' :
                          schedule.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                        </span>
                      </div>

                      {schedule.description && (
                        <p className="text-sm text-gray-600 mb-3">{schedule.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(schedule.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{getEnrollmentLabel(schedule.enrollment_type)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        {(user?.profile?.role === 'admin' || user?.profile?.role === 'developer') && (<>
                        <button
                          onClick={() => {
                            setShowDateModal(false)
                            handleEditSchedule(schedule)
                          }}
                          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setShowDateModal(false)
                            handleDeleteSchedule(schedule)
                          }}
                          className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                        </>)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
