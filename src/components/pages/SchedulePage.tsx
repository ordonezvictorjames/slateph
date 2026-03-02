'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading, ButtonLoading } from '@/components/ui/loading'

interface CourseSchedule {
  id: string
  course_id: string
  title: string
  description: string | null
  batch_number: number
  start_date: string
  end_date: string
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
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
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null)
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
    enrollment_type: 'trainee' as 'trainee' | 'tesda_scholar' | 'both',
  })

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
    const { data, error } = await supabase
      .from('course_schedules_with_details')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching schedules:', error)
      return
    }

    setSchedules(data || [])
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
      // Get next batch number for this course
      const { data: existingSchedules } = await supabase
        .from('course_schedules')
        .select('batch_number')
        .eq('course_id', newSchedule.course_id)
        .order('batch_number', { ascending: false })
        .limit(1)

      const nextBatchNumber = existingSchedules && existingSchedules.length > 0 
        ? existingSchedules[0].batch_number + 1 
        : 1

      // Generate title based on enrollment type
      let generatedTitle = ''
      if (newSchedule.enrollment_type === 'trainee') {
        // For trainees, use grade level as title
        if (newSchedule.selected_grade) {
          generatedTitle = `Grade ${newSchedule.selected_grade}`
        } else {
          generatedTitle = 'All Grades'
        }
      } else if (newSchedule.enrollment_type === 'tesda_scholar') {
        // For TESDA scholars, use batch number as title
        if (newSchedule.selected_batch) {
          generatedTitle = `Batch ${newSchedule.selected_batch}`
        } else {
          generatedTitle = `Batch ${nextBatchNumber}`
        }
      }

      // Combine date and time into ISO timestamp
      const startDateTime = `${newSchedule.start_date}T${newSchedule.start_time}:00`
      const endDateTime = `${newSchedule.end_date}T${newSchedule.end_time}:00`

      const scheduleData = {
        course_id: newSchedule.course_id,
        title: generatedTitle,
        description: newSchedule.description || null,
        batch_number: nextBatchNumber,
        start_date: startDateTime,
        end_date: endDateTime,
        enrollment_type: newSchedule.enrollment_type,
        status: 'scheduled',
        created_by: user?.id
      }

      const { error } = await supabase
        .from('course_schedules')
        .insert([scheduleData])

      if (error) {
        console.error('Error creating schedule:', error)
        alert('Error creating course schedule')
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
        enrollment_type: 'trainee',
      })
      setShowAddModal(false)
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
      enrollment_type: schedule.enrollment_type,
    })
    setScheduleToEdit(schedule)
    setShowEditModal(true)
  }

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleToEdit) return
    
    setSubmitting(true)

    try {
      // Generate title based on enrollment type
      let generatedTitle = ''
      if (newSchedule.enrollment_type === 'trainee') {
        if (newSchedule.selected_grade) {
          generatedTitle = `Grade ${newSchedule.selected_grade}`
        } else {
          generatedTitle = 'All Grades'
        }
      } else if (newSchedule.enrollment_type === 'tesda_scholar') {
        if (newSchedule.selected_batch) {
          generatedTitle = `Batch ${newSchedule.selected_batch}`
        }
      }

      // Combine date and time into ISO timestamp
      const startDateTime = `${newSchedule.start_date}T${newSchedule.start_time}:00`
      const endDateTime = `${newSchedule.end_date}T${newSchedule.end_time}:00`

      const scheduleData = {
        course_id: newSchedule.course_id,
        title: generatedTitle,
        description: newSchedule.description || null,
        start_date: startDateTime,
        end_date: endDateTime,
        enrollment_type: newSchedule.enrollment_type,
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

  const formatTimeRange = (startDate: string, endDate: string) => {
    return `${formatTime(startDate)} - ${formatTime(endDate)}`
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Course Schedule
              </h1>
              <p className="text-gray-500 mt-1 text-sm">Manage and organize your course schedules</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                style={{ backgroundColor: '#588157' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3A5A40'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#588157'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Schedule</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Modern Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Calendar (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <h2 className="text-xl font-bold text-gray-900">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {getMonthDates().map((date, index) => {
                  const daySchedules = getSchedulesForDate(date)
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth()
                  const isToday = date.toDateString() === new Date().toDateString()
                  
                  return (
                    <div 
                      key={index} 
                      className={`bg-gray-50 rounded-xl min-h-[110px] p-3 transition-all duration-200 hover:shadow-md cursor-pointer ${
                        !isCurrentMonth ? 'opacity-40' : 'hover:bg-white'
                      }`}
                      onClick={() => {
                        if (daySchedules.length > 0) {
                          setSelectedDateSchedules(daySchedules)
                          setSelectedDateString(date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
                          setShowDateModal(true)
                        }
                      }}
                    >
                      {/* Date */}
                      <div className={`text-sm font-bold mb-2 ${
                        isToday 
                          ? 'bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md' 
                          : 'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </div>

                      {/* Schedules as Circles */}
                      <div className="flex flex-wrap gap-1.5">
                        {daySchedules.map((schedule) => {
                          const color = getCourseColor(schedule.course_id)
                          return (
                            <div
                              key={schedule.id}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm hover:scale-110 transition-transform duration-200"
                              style={{ backgroundColor: color }}
                              title={`${schedule.title} - ${schedule.course_title}`}
                            >
                              {schedule.batch_number}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Scheduled Courses (1/3 width) */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Scheduled Courses</h3>
              <p className="text-sm text-gray-500 mt-1">
                {schedules.length} course{schedules.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar">
                {schedules.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No schedules yet</h3>
                    <p className="text-gray-500 mb-6 text-sm">Create your first course schedule to get started</p>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="px-5 py-2.5 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                      style={{ backgroundColor: '#588157' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3A5A40'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#588157'}
                    >
                      Create Schedule
                    </button>
                  </div>
                ) : (
                  schedules.map((schedule) => {
                    const color = getCourseColor(schedule.course_id)
                    const isExpanded = expandedScheduleId === schedule.id
                    
                    return (
                      <div key={schedule.id} className="group rounded-2xl transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-lg bg-white overflow-hidden">
                        {/* Compact View */}
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-1 h-14 rounded-full shadow-sm flex-shrink-0"
                              style={{ backgroundColor: color }}
                            ></div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 truncate">{schedule.title}</h4>
                              <p className="text-sm text-gray-600 truncate">{schedule.course_title}</p>
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatTimeRange(schedule.start_date, schedule.end_date)}
                              </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => setExpandedScheduleId(isExpanded ? null : schedule.id)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                <svg 
                                  className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="p-2 text-gray-400 hover:text-[#588157] hover:bg-[#588157]/10 rounded-lg transition-all duration-200"
                                title="Edit schedule"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleDeleteSchedule(schedule)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Delete schedule"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                            <div className="space-y-3 ml-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Batch</span>
                                <span className="px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                  Batch {schedule.batch_number}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Status</span>
                                <span className={`px-3 py-1 text-xs rounded-full font-bold ${
                                  schedule.status === 'active' ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700' :
                                  schedule.status === 'completed' ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700' :
                                  schedule.status === 'cancelled' ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700' :
                                  'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700'
                                }`}>
                                  {schedule.status}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Duration</span>
                                <span className="font-bold text-gray-900 text-xs">
                                  {formatDateRange(schedule.start_date, schedule.end_date)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Time</span>
                                <span className="font-bold text-gray-900 text-xs flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {formatTimeRange(schedule.start_date, schedule.end_date)}
                                </span>
                              </div>

                              {/* Filters Applied */}
                              {(schedule.sections || schedule.grade_levels || schedule.strands || schedule.batch_numbers) && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs font-bold text-gray-700 mb-2">Target trainees</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {schedule.sections && schedule.sections.map(section => (
                                      <span key={section} className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-lg font-semibold">
                                        {section}
                                      </span>
                                    ))}
                                    {schedule.grade_levels && schedule.grade_levels.map(grade => (
                                      <span key={grade} className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-lg font-semibold">
                                        Grade {grade}
                                      </span>
                                    ))}
                                    {schedule.strands && schedule.strands.map(strand => (
                                      <span key={strand} className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs rounded-lg font-semibold">
                                        {strand}
                                      </span>
                                    ))}
                                    {schedule.batch_numbers && schedule.batch_numbers.map(batch => (
                                      <span key={batch} className="px-2.5 py-1 bg-orange-100 text-orange-800 text-xs rounded-lg font-semibold">
                                        Batch {batch}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {schedule.description && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-sm text-gray-600">{schedule.description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, enrollment_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="trainee">trainees</option>
                    <option value="tesda_scholar">TESDA Scholars</option>
                  </select>
                </div>

                {newSchedule.enrollment_type === 'trainee' && (<></>)}

                {newSchedule.enrollment_type === 'tesda_scholar' && (<></>)}
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
                  className="px-6 py-2 bg-[#588157] text-white rounded-lg hover:bg-[#3a5a40] transition-colors disabled:opacity-50 flex items-center space-x-2"
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
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, enrollment_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="trainee">trainees</option>
                    <option value="tesda_scholar">TESDA Scholars</option>
                  </select>
                </div>

                {newSchedule.enrollment_type === 'trainee' && (<></>)}

                {newSchedule.enrollment_type === 'tesda_scholar' && (<></>)}
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
                  className="px-6 py-2 bg-[#588157] text-white rounded-lg hover:bg-[#3a5a40] transition-colors disabled:opacity-50 flex items-center space-x-2"
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
          <div className="bg-white rounded-2xl max-w-md w-full">
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
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
                          <span className="capitalize">{schedule.enrollment_type.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
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
