'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading, ButtonLoading } from '@/components/ui/loading'

// -- Class info constants (mirrors UserModals.tsx) --------------------------
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
// --------------------------------------------------------------------------

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
  const [scheduleSubjects, setScheduleSubjects] = useState<{ id: string; title: string }[]>([])
  const [scheduleModules, setScheduleModules] = useState<{ id: string; title: string }[]>([])
  const [editSubjects, setEditSubjects] = useState<{ id: string; title: string }[]>([])
  const [editModules, setEditModules] = useState<{ id: string; title: string }[]>([])
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
    subject_id: '',
    module_id: '',
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
    modality: 'synchronous' as 'synchronous' | 'asynchronous',
  })
  const [shsCluster, setShsCluster] = useState<'academic' | 'technical' | ''>('')

  // Fetch subjects when course changes (add modal)
  useEffect(() => {
    if (!newSchedule.course_id || showEditModal) { if (!showEditModal) { setScheduleSubjects([]); setScheduleModules([]) } return }
    supabase.from('subjects').select('id, title').eq('course_id', newSchedule.course_id).order('order_index', { ascending: true })
      .then(({ data }: { data: { id: string; title: string }[] | null }) => setScheduleSubjects(data || []))
    setNewSchedule(prev => ({ ...prev, subject_id: '', module_id: '' }))
    setScheduleModules([])
  }, [newSchedule.course_id, showEditModal])

  // Fetch modules when subject changes (add modal)
  useEffect(() => {
    if (!newSchedule.subject_id || showEditModal) { if (!showEditModal) setScheduleModules([]); return }
    supabase.from('modules').select('id, title').eq('subject_id', newSchedule.subject_id).order('order_index', { ascending: true })
      .then(({ data }: { data: { id: string; title: string }[] | null }) => setScheduleModules(data || []))
    setNewSchedule(prev => ({ ...prev, module_id: '' }))
  }, [newSchedule.subject_id, showEditModal])

  // Fetch subjects when course changes (edit modal)
  useEffect(() => {
    if (!showEditModal || !newSchedule.course_id) { setEditSubjects([]); setEditModules([]); return }
    supabase.from('subjects').select('id, title').eq('course_id', newSchedule.course_id).order('order_index', { ascending: true })
      .then(({ data }: { data: { id: string; title: string }[] | null }) => setEditSubjects(data || []))
  }, [newSchedule.course_id, showEditModal])

  // Fetch modules when subject changes (edit modal)
  useEffect(() => {
    if (!showEditModal || !newSchedule.subject_id) { setEditModules([]); return }
    supabase.from('modules').select('id, title').eq('subject_id', newSchedule.subject_id).order('order_index', { ascending: true })
      .then(({ data }: { data: { id: string; title: string }[] | null }) => setEditModules(data || []))
  }, [newSchedule.subject_id, showEditModal])

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
        .select('*, course:courses(title, course_type), subject:subjects(title), module:modules(title)')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Error fetching schedules:', error.message, error.code, error.details)
        return
      }
      setSchedules((data || []).map((s: any) => ({ ...s, course_title: s.course?.title ?? '', course_type: s.course?.course_type ?? '', subject_title: s.subject?.title ?? '', module_title: s.module?.title ?? '' })))
    } else {
      const { data: enrollments, error: enrollError } = await supabase
        .from('schedule_enrollments')
        .select('schedule_id')
        .eq('user_id', user?.id)

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError.message, enrollError.code)
        setSchedules([])
        return
      }

      const enrolledIds = new Set((enrollments || []).map((e: { schedule_id: string }) => e.schedule_id))
      const profile = user?.profile as any
      const role = profile?.role
      const roleToEnrollmentType: Record<string, string> = {
        jhs_student: 'jhs_student',
        shs_student: 'shs_student',
        college_student: 'college_student',
        scholar: 'tesda_scholar',
        instructor: 'instructor',
      }
      const enrollmentType = roleToEnrollmentType[role] ?? role

      // Fetch all schedules for this enrollment_type, then filter client-side
      const { data: allTypeSchedules } = await supabase
        .from('course_schedules')
        .select('*, course:courses(title, course_type), subject:subjects(title), module:modules(title)')
        .eq('enrollment_type', enrollmentType)
        .in('status', ['scheduled', 'active'])
        .order('start_date', { ascending: true })

      const profileMatches = (allTypeSchedules || []).filter((s: any) => {
        if (role === 'jhs_student' || role === 'shs_student') {
          const gradeMatch = !profile?.grade || !s.grade || s.grade === String(profile.grade) ||
            (s.grade_levels && s.grade_levels.includes(Number(profile.grade)))
          const sectionMatch = !profile?.section || !s.section || s.section === profile.section ||
            (s.sections && s.sections.includes(profile.section))
          const strandMatch = role !== 'shs_student' || !profile?.strand || !s.strand || s.strand === profile.strand ||
            (s.strands && s.strands.includes(profile.strand))
          return gradeMatch && sectionMatch && strandMatch
        } else if (role === 'college_student') {
          return !profile?.section || !s.section || s.section === profile.section ||
            (s.sections && s.sections.includes(profile.section))
        } else if (role === 'scholar') {
          const batchLabel = profile?.batch_number ? `Batch ${profile.batch_number}` : null
          return !batchLabel || !s.batch || s.batch === batchLabel ||
            (s.batch_numbers && s.batch_numbers.includes(Number(profile.batch_number)))
        }
        return true
      })

      // Fetch explicitly enrolled schedules
      let enrolledData: any[] = []
      if (enrolledIds.size > 0) {
        const { data } = await supabase
          .from('course_schedules')
          .select('*, course:courses(title, course_type), subject:subjects(title), module:modules(title)')
          .in('id', Array.from(enrolledIds))
          .order('start_date', { ascending: true })
        enrolledData = data || []
      }

      // Merge and deduplicate
      const seen = new Set<string>()
      const merged: any[] = []
      for (const s of [...enrolledData, ...profileMatches]) {
        if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
      }
      merged.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      setSchedules(merged.map((s: any) => ({ ...s, course_title: s.course?.title ?? '', course_type: s.course?.course_type ?? '', subject_title: s.subject?.title ?? '', module_title: s.module?.title ?? '' })))
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
      // Combine date and time with local timezone offset so Supabase stores correct UTC
      const toLocalISO = (date: string, time: string) => {
        const d = new Date(`${date}T${time}:00`)
        const off = -d.getTimezoneOffset()
        const sign = off >= 0 ? '+' : '-'
        const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
        const mm = String(Math.abs(off) % 60).padStart(2, '0')
        return `${date}T${time}:00${sign}${hh}:${mm}`
      }
      const startDateTime = toLocalISO(newSchedule.start_date, newSchedule.start_time)
      const endDateTime = toLocalISO(newSchedule.end_date, newSchedule.end_time)

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
        subject_id: newSchedule.subject_id || null,
        module_id: newSchedule.module_id || null,
        title: classTitle || selectedCourse?.title || '',
        description: newSchedule.description || null,
        start_date: startDateTime,
        end_date: endDateTime,
        enrollment_type: newSchedule.enrollment_type,
        grade: newSchedule.grade || null,
        section: newSchedule.section || null,
        cluster: shsCluster || null,
        strand: newSchedule.strand || null,
        modality: newSchedule.modality,
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
        subject_id: '',
        module_id: '',
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
        modality: 'synchronous',
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
    
    const startDateStr = startDate.getFullYear() + '-' + 
      String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(startDate.getDate()).padStart(2, '0')
    const endDateStr = endDate.getFullYear() + '-' + 
      String(endDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(endDate.getDate()).padStart(2, '0')
    const startTimeStr = String(startDate.getHours()).padStart(2, '0') + ':' + 
      String(startDate.getMinutes()).padStart(2, '0')
    const endTimeStr = String(endDate.getHours()).padStart(2, '0') + ':' + 
      String(endDate.getMinutes()).padStart(2, '0')
    
    setNewSchedule({
      course_id: schedule.course_id,
      subject_id: (schedule as any).subject_id || '',
      module_id: (schedule as any).module_id || '',
      title: schedule.title,
      description: schedule.description || '',
      batch_number: schedule.batch_number,
      start_date: startDateStr,
      end_date: endDateStr,
      start_time: startTimeStr,
      end_time: endTimeStr,
      enrollment_type: schedule.enrollment_type as any,
      grade: schedule.grade || '',
      section: schedule.section || '',
      cluster: schedule.cluster || '',
      strand: schedule.strand || '',
      batch: schedule.batch || '',
      modality: ((schedule as any).modality || 'synchronous') as 'synchronous' | 'asynchronous',
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

      // Combine date and time with local timezone offset so Supabase stores correct UTC
      const toLocalISO2 = (date: string, time: string) => {
        const d = new Date(`${date}T${time}:00`)
        const off = -d.getTimezoneOffset()
        const sign = off >= 0 ? '+' : '-'
        const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
        const mm = String(Math.abs(off) % 60).padStart(2, '0')
        return `${date}T${time}:00${sign}${hh}:${mm}`
      }
      const startDateTime = toLocalISO2(newSchedule.start_date, newSchedule.start_time)
      const endDateTime = toLocalISO2(newSchedule.end_date, newSchedule.end_time)

      const scheduleData = {
        course_id: newSchedule.course_id,
        subject_id: newSchedule.subject_id || null,
        module_id: newSchedule.module_id || null,
        title: classTitle || newSchedule.title,
        description: newSchedule.description || null,
        start_date: startDateTime,
        end_date: endDateTime,
        enrollment_type: newSchedule.enrollment_type,
        grade: newSchedule.grade || null,
        section: newSchedule.section || null,
        cluster: shsCluster || null,
        strand: newSchedule.strand || null,
        modality: newSchedule.modality,
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

  // Strip timezone suffix so all date/time parsing treats stored values as local time
  const stripTZ = (str: string) => str.replace(/([+-]\d{2}:\d{2}|Z)$/, '')

  const getSchedulesForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`

    return schedules.filter(schedule => {
      const startDate = new Date(stripTZ(schedule.start_date))
      const endDate = new Date(stripTZ(schedule.end_date))

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
    const date = new Date(stripTZ(dateString))
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

  const getEnrollmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      jhs_student: 'JHS Student',
      shs_student: 'SHS Student',
      college_student: 'College Student',
      tesda_scholar: 'TESDA Scholar',
      trainee: 'Trainee',
      both: 'All Students',
    }
    return labels[type] ?? type
  }

  const SUBJECT_COLORS = ['#40916C', '#52B788', '#74C69D']

  const getSubjectColor = (subjectId: string | null | undefined, fallbackId: string) => {
    const key = subjectId || fallbackId
    // Build a stable index from the id string
    const index = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % SUBJECT_COLORS.length
    return SUBJECT_COLORS[index]
  }

  if (loading) {
    return (
      <div className="p-8">
        <Loading size="lg" className="h-64" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#dff0f3' }}>
      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 p-4">

        {/* ── Left sidebar ──────────────────────────────────────────── */}
        <div className="w-[30%] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pb-4">
          <div className="flex flex-col gap-3">

            {/* Mini calendar */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-800">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => navigateMonth('prev')} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <button onClick={() => navigateMonth('next')} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {getMonthDates().map((date, idx) => {
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth()
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isSelected = date.toDateString() === selectedDate.toDateString()
                  const hasEvent = getSchedulesForDate(date).length > 0
                  return (
                    <button key={idx} onClick={() => setSelectedDate(new Date(date))}
                      className={`relative flex items-center justify-center h-7 w-7 mx-auto rounded-full text-[11px] font-medium transition-all
                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                        ${isCurrentMonth && !isToday && !isSelected ? 'text-gray-700 hover:bg-gray-100' : ''}
                        ${isSelected && !isToday ? 'bg-gray-800 text-white' : ''}
                        ${isToday ? 'text-white' : ''}
                      `}
                      style={isToday ? { backgroundColor: '#52B788' } : {}}>
                      {date.getDate()}
                      {hasEvent && isCurrentMonth && !isToday && !isSelected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Today's featured event */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0]
              const todaysEvents = schedules.filter(s => {
                const sd = new Date(s.start_date).toISOString().split('T')[0]
                const ed = new Date(s.end_date).toISOString().split('T')[0]
                return todayStr >= sd && todayStr <= ed
              })
              if (todaysEvents.length === 0) return null
              const featured = todaysEvents[0]
              const color = getSubjectColor((featured as any).subject_id, featured.course_id)
              return (
                <div className="rounded-2xl p-4 text-white" style={{ backgroundColor: '#0f4c5c' }}>
                  <p className="text-xs font-medium text-white/60 mb-1">Today's class</p>
                  <p className="text-base font-bold leading-tight mb-2">{featured.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-white/80">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {formatTime(featured.start_date)} – {formatTime(featured.end_date)}
                  </div>
                  {featured.course_title && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white/90">{featured.course_title}</span>
                    </div>
                  )}
                  {todaysEvents.length > 1 && (
                    <p className="mt-2 text-[10px] text-white/50">+{todaysEvents.length - 1} more today</p>
                  )}
                </div>
              )
            })()}

            {/* Today's Events */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0]
              const todaysEvents = schedules.filter(s => {
                const sd = stripTZ(s.start_date).substring(0, 10)
                const ed = stripTZ(s.end_date).substring(0, 10)
                return todayStr >= sd && todayStr <= ed
              })
              return (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Today's Events</p>
                      <p className="text-[10px] text-gray-400">{todaysEvents.length} scheduled</p>
                    </div>
                  </div>
                  {todaysEvents.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No events today</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {todaysEvents.map(s => {
                        const color = getSubjectColor((s as any).subject_id, s.course_id)
                        return (
                          <div key={s.id} className="flex items-start gap-2 p-2 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{s.course_title || s.title}</p>
                              {(s as any).subject_title && (
                                <p className="text-[10px] text-gray-500 truncate">{(s as any).subject_title}</p>
                              )}
                              {(s as any).module_title && (
                                <p className="text-[10px] text-gray-400 truncate">{(s as any).module_title}</p>
                              )}
                              {s.batch && (
                                <p className="text-[10px] text-gray-400 truncate">{s.batch}</p>
                              )}
                              <p className="text-[10px] font-medium mt-0.5" style={{ color }}>{formatTime(s.start_date)} – {formatTime(s.end_date)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Upcoming */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0]
              const upcoming = schedules
                .filter(s => new Date(s.start_date).toISOString().split('T')[0] >= todayStr && (s.status === 'scheduled' || s.status === 'active'))
                .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, 4)
              const getDaysUntil = (dateStr: string) => {
                const diff = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                if (diff === 0) return 'Today'
                if (diff === 1) return 'Tomorrow'
                if (diff < 7) return `${diff}d`
                return `${Math.ceil(diff / 7)}w`
              }
              return (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upcoming</p>
                  <div className="flex flex-col gap-2">
                    {upcoming.length === 0 && <p className="text-xs text-gray-400">No upcoming events</p>}
                    {upcoming.map(s => {
                      const color = getSubjectColor((s as any).subject_id, s.course_id)
                      return (
                        <div key={s.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedDate(new Date(stripTZ(s.start_date)))}>
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{s.course_title || s.title}</p>
                            {(s as any).subject_title && (
                              <p className="text-[10px] text-gray-500 truncate">{(s as any).subject_title}</p>
                            )}
                            {(s as any).module_title && (
                              <p className="text-[10px] text-gray-400 truncate">{(s as any).module_title}</p>
                            )}
                            {s.batch && (
                              <p className="text-[10px] text-gray-400 truncate">{s.batch}</p>
                            )}
                            <p className="text-[10px] font-medium mt-0.5" style={{ color }}>{formatTime(s.start_date)} – {formatTime(s.end_date)}</p>
                          </div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                            {getDaysUntil(s.start_date)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

          </div>
        </div>

        {/* ── Week grid ─────────────────────────────────────────────── */}
        <div className="w-[70%] flex flex-col gap-3 pb-4">

          {/* Top bar card */}
          <div className="bg-white rounded-2xl shadow-sm flex items-center justify-between px-5 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 7); setSelectedDate(d) }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
              </button>
              <span className="text-lg font-bold text-gray-900">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 7); setSelectedDate(d) }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-1 py-1">
              {['Daily', 'Weekly', 'Monthly'].map(v => (
                <span key={v} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-default
                  ${v === 'Weekly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>
                  {v}
                </span>
              ))}
            </div>

            {(user?.profile?.role === 'admin' || user?.profile?.role === 'developer') && (
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 transition-colors"
                style={{ backgroundColor: '#FFD166' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0c050')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFD166')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                Create Event
              </button>
            )}
          </div>

          {/* Calendar card */}
          <div className="bg-white rounded-2xl shadow-sm flex flex-col">
          {(() => {
            // Build full 7-day week starting from Sunday of selectedDate's week
            const weekStart = new Date(selectedDate)
            weekStart.setDate(selectedDate.getDate() - selectedDate.getDay())
            const weekDays = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart)
              d.setDate(weekStart.getDate() + i)
              return d
            })

            const SLOT_HEIGHT = 44  // px per hour
            const START_HOUR = 7
            const END_HOUR = 22
            // One slot per hour: 7:00, 8:00 … 22:00
            const slots = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR * 60 + i * 60)
            const totalHeight = slots.length * SLOT_HEIGHT
            const TIME_COL_W = 64

            const fmtDateStr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
            // Extract date portion directly from ISO string to avoid timezone shifts
            const isoDateStr = (dateStr: string) => dateStr.substring(0, 10)

            return (
              <>
                {/* Day header row */}
                <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
                  {/* Time gutter */}
                  <div style={{ width: TIME_COL_W }} className="flex-shrink-0 border-r border-gray-100" />
                  {weekDays.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString()
                    const isSelected = day.toDateString() === selectedDate.toDateString()
                    return (
                      <div key={i} onClick={() => setSelectedDate(new Date(day))}
                        className="flex-1 flex flex-col items-center py-3 cursor-pointer hover:bg-gray-50 transition-colors border-r border-gray-100 last:border-r-0">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className={`mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors
                          ${isToday ? 'text-white' : isSelected ? 'bg-gray-100 text-gray-800' : 'text-gray-800'}`}
                          style={isToday ? { backgroundColor: '#52B788' } : {}}>
                          {day.getDate()}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Time grid */}
                <div className="flex-1">
                  <div className="flex" style={{ minHeight: `${totalHeight}px`, position: 'relative' }}>
                    {/* Time labels column */}
                    <div style={{ width: TIME_COL_W, height: `${totalHeight}px` }} className="flex-shrink-0 relative border-r border-gray-100">
                      {slots.map((mins, idx) => {
                        const h = Math.floor(mins / 60)
                        const label = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`
                        return (
                          <div key={mins} className="absolute right-0 pr-3 flex items-start justify-end"
                            style={{ top: `${idx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px`, width: TIME_COL_W }}>
                            <span className="text-[10px] font-medium text-gray-400 mt-1">{label}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Day columns — grid lines + single-day events only */}
                    {weekDays.map((day, dayIdx) => {
                      const dateStr = fmtDateStr(day)
                      const isToday = day.toDateString() === new Date().toDateString()
                      // Only render single-day schedules per column
                      const daySchedules = schedules.filter(s => {
                        const sd = fmtDateStr(new Date(stripTZ(s.start_date)))
                        const ed = fmtDateStr(new Date(stripTZ(s.end_date)))
                        return sd === ed && dateStr === sd
                      })

                      // Overlap layout
                      const events = daySchedules.map(s => {
                        const sd = new Date(stripTZ(s.start_date))
                        const ed = new Date(stripTZ(s.end_date))
                        let sMins = sd.getHours() * 60 + sd.getMinutes()
                        let eMins = ed.getHours() * 60 + ed.getMinutes()
                        if (sMins === 0 && eMins === 0) { sMins = START_HOUR * 60; eMins = sMins + 60 }
                        if (eMins <= sMins) eMins = sMins + 60
                        return { s, sMins, eMins, col: 0, numCols: 1 }
                      })
                      const n = events.length
                      const parent = Array.from({ length: n }, (_, i) => i)
                      const find = (x: number): number => parent[x] === x ? x : (parent[x] = find(parent[x]))
                      const union = (a: number, b: number) => { parent[find(a)] = find(b) }
                      for (let i = 0; i < n; i++)
                        for (let j = i+1; j < n; j++)
                          if (events[i].sMins < events[j].eMins && events[j].sMins < events[i].eMins) union(i, j)
                      const groups: Record<number, number[]> = {}
                      for (let i = 0; i < n; i++) { const r = find(i); if (!groups[r]) groups[r] = []; groups[r].push(i) }
                      Object.values(groups).forEach(indices => {
                        indices.sort((a, b) => events[a].sMins - events[b].sMins)
                        const colEnd: number[] = []
                        indices.forEach(idx => {
                          let placed = false
                          for (let c = 0; c < colEnd.length; c++) {
                            if (colEnd[c] <= events[idx].sMins) { colEnd[c] = events[idx].eMins; events[idx].col = c; placed = true; break }
                          }
                          if (!placed) { events[idx].col = colEnd.length; colEnd.push(events[idx].eMins) }
                        })
                        const gc = colEnd.length
                        indices.forEach(idx => { events[idx].numCols = gc })
                      })

                      return (
                        <div key={dayIdx} className={`flex-1 relative border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-green-50/30' : ''}`} style={{ height: `${totalHeight}px` }}>
                          {/* Slot rows */}
                          {slots.map((mins, idx) => (
                            <div key={mins} className="absolute left-0 right-0 border-t border-gray-100"
                              style={{
                                top: `${idx * SLOT_HEIGHT}px`,
                                height: `${SLOT_HEIGHT}px`,
                                backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.008)',
                              }} />
                          ))}

                          {/* Single-day event blocks */}
                          {events.map(({ s, sMins, eMins, col, numCols }) => {
                            const topPx = ((sMins - START_HOUR * 60) / 60) * SLOT_HEIGHT
                            const heightPx = Math.max(((eMins - sMins) / 60) * SLOT_HEIGHT, 28)
                            const sd = new Date(stripTZ(s.start_date)), ed = new Date(stripTZ(s.end_date))
                            const tStart = `${sd.getHours() % 12 || 12}:${String(sd.getMinutes()).padStart(2,'0')} ${sd.getHours() >= 12 ? 'PM' : 'AM'}`
                            const tEnd = `${ed.getHours() % 12 || 12}:${String(ed.getMinutes()).padStart(2,'0')} ${ed.getHours() >= 12 ? 'PM' : 'AM'}`
                            const GAP = 3
                            const widthPct = (1 / numCols) * 100
                            const leftPct = (col / numCols) * 100
                            const isAdminDev = user?.profile?.role === 'admin' || user?.profile?.role === 'developer'
                            return (
                              <div key={s.id}
                                className="absolute overflow-hidden group rounded-xl transition-shadow hover:shadow-md cursor-pointer"
                                style={{
                                  top: `${topPx + 1}px`,
                                  height: `${heightPx - 2}px`,
                                  left: `calc(${leftPct}% + ${GAP}px)`,
                                  width: `calc(${widthPct}% - ${GAP * 2}px)`,
                                  backgroundColor: '#0f4c5c',
                                  border: '1px solid #0a3540',
                                }}
                                onClick={() => {
                                  setSelectedDateSchedules([s])
                                  setSelectedDateString(day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
                                  setShowDateModal(true)
                                }}
                              >
                                <div className="flex flex-col h-full px-2 py-1.5 overflow-hidden">
                                  {heightPx < 48 ? (
                                    <p className="text-xs font-semibold truncate leading-tight text-white">
                                      {(s as any).module_title || s.course_title || s.title}
                                    </p>
                                  ) : (
                                    <>
                                      {(s as any).module_title && (
                                        <p className="text-xs font-bold truncate leading-tight text-white">{(s as any).module_title}</p>
                                      )}
                                      <p className="text-[11px] font-bold leading-tight text-white truncate">{s.course_title || s.title}</p>
                                      {heightPx >= 64 && (
                                        <p className="text-[10px] mt-0.5 whitespace-nowrap truncate text-red-400 font-medium">{tStart} – {tEnd}</p>
                                      )}
                                    </>
                                  )}
                                </div>
                                {isAdminDev && (
                                  <div className="hidden group-hover:flex absolute top-1 right-1 items-center gap-0.5 bg-white/90 rounded-lg px-1 py-0.5 shadow-sm">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditSchedule(s) }} className="p-0.5 rounded hover:bg-gray-100 transition-colors" title="Edit">
                                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(s) }} className="p-0.5 rounded hover:bg-red-50 transition-colors" title="Delete">
                                      <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}

                    {/* Multi-day spanning events — rendered as one block across columns */}
                    {schedules
                      .filter(s => {
                        const sd = fmtDateStr(new Date(stripTZ(s.start_date)))
                        const ed = fmtDateStr(new Date(stripTZ(s.end_date)))
                        return sd !== ed
                      })
                      .map(s => {
                        const sdStr = fmtDateStr(new Date(stripTZ(s.start_date)))
                        const edStr = fmtDateStr(new Date(stripTZ(s.end_date)))
                        const weekStrs = weekDays.map(d => fmtDateStr(d))
                        const firstCol = weekStrs.findIndex(d => d >= sdStr && d <= edStr)
                        if (firstCol === -1) return null
                        const lastCol = weekStrs.reduce((acc, d, i) => (d >= sdStr && d <= edStr ? i : acc), -1)
                        if (lastCol === -1) return null

                        const sd = new Date(stripTZ(s.start_date))
                        const ed = new Date(stripTZ(s.end_date))
                        let sMins = sd.getHours() * 60 + sd.getMinutes()
                        let eMins = ed.getHours() * 60 + ed.getMinutes()
                        if (sMins === 0 && eMins === 0) { sMins = START_HOUR * 60; eMins = sMins + 60 }
                        if (eMins <= sMins) eMins = sMins + 60

                        const topPx = ((sMins - START_HOUR * 60) / 60) * SLOT_HEIGHT
                        const heightPx = Math.max(((eMins - sMins) / 60) * SLOT_HEIGHT, 28)
                        const tStart = `${sd.getHours() % 12 || 12}:${String(sd.getMinutes()).padStart(2,'0')} ${sd.getHours() >= 12 ? 'PM' : 'AM'}`
                        const tEnd = `${ed.getHours() % 12 || 12}:${String(ed.getMinutes()).padStart(2,'0')} ${ed.getHours() >= 12 ? 'PM' : 'AM'}`
                        const isAdminDev = user?.profile?.role === 'admin' || user?.profile?.role === 'developer'
                        const GAP = 3
                        const numCols = weekDays.length
                        // left = TIME_COL_W + firstCol * colWidth, width = spanCols * colWidth
                        const colWidthExpr = `(100% - ${TIME_COL_W}px) / ${numCols}`
                        const leftExpr = `${TIME_COL_W}px + ${firstCol} * (${colWidthExpr})`
                        const widthExpr = `${lastCol - firstCol + 1} * (${colWidthExpr})`
                        const day = weekDays[firstCol]

                        return (
                          <div key={`span-${s.id}`}
                            className="absolute overflow-hidden group rounded-xl transition-shadow hover:shadow-md cursor-pointer z-10"
                            style={{
                              top: `${topPx + 1}px`,
                              height: `${heightPx - 2}px`,
                              left: `calc(${leftExpr} + ${GAP}px)`,
                              width: `calc(${widthExpr} - ${GAP * 2}px)`,
                              backgroundColor: '#0f4c5c',
                              border: '1px solid #0a3540',
                            }}
                            onClick={() => {
                              setSelectedDateSchedules([s])
                              setSelectedDateString(day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
                              setShowDateModal(true)
                            }}
                          >
                            <div className="flex flex-col h-full px-2 py-1.5 overflow-hidden">
                              {heightPx < 48 ? (
                                <p className="text-xs font-semibold truncate leading-tight text-white">
                                  {(s as any).module_title || s.course_title || s.title}
                                </p>
                              ) : (
                                <>
                                  {(s as any).module_title && (
                                    <p className="text-xs font-bold truncate leading-tight text-white">{(s as any).module_title}</p>
                                  )}
                                  <p className="text-[11px] font-bold leading-tight text-white truncate">{s.course_title || s.title}</p>
                                  {heightPx >= 64 && (
                                    <p className="text-[10px] mt-0.5 whitespace-nowrap truncate text-red-400 font-medium">{tStart} – {tEnd}</p>
                                  )}
                                </>
                              )}
                            </div>
                            {isAdminDev && (
                              <div className="hidden group-hover:flex absolute top-1 right-1 items-center gap-0.5 bg-white/90 rounded-lg px-1 py-0.5 shadow-sm">
                                <button onClick={(e) => { e.stopPropagation(); handleEditSchedule(s) }} className="p-0.5 rounded hover:bg-gray-100 transition-colors" title="Edit">
                                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(s) }} className="p-0.5 rounded hover:bg-red-50 transition-colors" title="Delete">
                                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              </>
            )
          })()}
          </div>{/* end calendar card */}
        </div>{/* end week grid column */}
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

                {/* Subject dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={newSchedule.subject_id}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, subject_id: e.target.value, module_id: '' }))}
                    disabled={!newSchedule.course_id || scheduleSubjects.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">{!newSchedule.course_id ? 'Select a course first' : scheduleSubjects.length === 0 ? 'No subjects available' : 'All subjects'}</option>
                    {scheduleSubjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>

                {/* Module dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={newSchedule.module_id}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, module_id: e.target.value }))}
                    disabled={!newSchedule.subject_id || scheduleModules.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">{!newSchedule.subject_id ? 'Select a subject first' : scheduleModules.length === 0 ? 'No modules available' : 'All modules'}</option>
                    {scheduleModules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Modality</label>
                  <select
                    required
                    value={newSchedule.modality}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, modality: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="synchronous">Synchronous</option>
                    <option value="asynchronous">Asynchronous</option>
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

                {/* Subject dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={newSchedule.subject_id}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, subject_id: e.target.value, module_id: '' }))}
                    disabled={!newSchedule.course_id || editSubjects.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">{!newSchedule.course_id ? 'Select a course first' : editSubjects.length === 0 ? 'No subjects available' : 'All subjects'}</option>
                    {editSubjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>

                {/* Module dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={newSchedule.module_id}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, module_id: e.target.value }))}
                    disabled={!newSchedule.subject_id || editModules.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">{!newSchedule.subject_id ? 'Select a subject first' : editModules.length === 0 ? 'No modules available' : 'All modules'}</option>
                    {editModules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Modality</label>
                  <select
                    required
                    value={newSchedule.modality}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, modality: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="synchronous">Synchronous</option>
                    <option value="asynchronous">Asynchronous</option>
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
                  const color = getSubjectColor((schedule as any).subject_id, schedule.course_id)
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

                      <div className="grid grid-cols-2 gap-2 text-sm mb-1">
                        {/* Course */}
                        <div className="flex items-center gap-2 text-gray-600 col-span-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span className="font-medium text-gray-800">{schedule.course_title}</span>
                        </div>
                        {/* Subject */}
                        {(schedule as any).subject_title && (
                          <div className="flex items-center gap-2 text-gray-600 col-span-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>{(schedule as any).subject_title}</span>
                          </div>
                        )}
                        {/* Module */}
                        {(schedule as any).module_title && (
                          <div className="flex items-center gap-2 text-gray-600 col-span-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>{(schedule as any).module_title}</span>
                          </div>
                        )}
                        {/* Time */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTime(schedule.start_date)} � {formatTime(schedule.end_date)}</span>
                        </div>
                        {/* Date range */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDateRange(schedule.start_date, schedule.end_date)}</span>
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
