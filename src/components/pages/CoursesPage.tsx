'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/loading'

interface Course {
  id: string
  title: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: string
  thumbnail_url?: string
  total_enrollments?: number
  subject_count?: number
  module_count?: number
  quiz_count?: number
  exam_count?: number
  is_user_enrolled?: boolean
}

interface CourseColor {
  course_id: string
  color_hex: string
}

export default function CoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [colors, setColors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user?.id) return
    fetchCourses()
  }, [user?.id])

  const fetchCourses = async () => {
    const supabase = createClient()

    const [
      { data: coursesData, error },
      { data: colorsData },
      { data: enrollmentsData },
      { data: subjectsData },
      { data: modulesData },
      { data: userEnrollments },
    ] = await Promise.all([
      supabase.from('courses').select('id, title, course_type, status, thumbnail_url').order('title'),
      supabase.from('course_colors').select('course_id, color_hex'),
      supabase.from('course_enrollments').select('course_id'),
      supabase.from('subjects').select('id, course_id'),
      supabase.from('modules').select('subject_id, content_type, quiz_type, subjects!inner(course_id)'),
      supabase.from('course_enrollments').select('course_id').eq('trainee_id', user!.id).eq('status', 'active'),
    ])

    if (error) {
      console.error('CoursesPage fetch error:', error.message)
      setLoading(false)
      return
    }

    // Color map
    const colorMap: Record<string, string> = {}
    for (const c of (colorsData || []) as CourseColor[]) colorMap[c.course_id] = c.color_hex
    setColors(colorMap)

    // Enrollment count per course
    const enrollCount: Record<string, number> = {}
    for (const e of (enrollmentsData || []) as { course_id: string }[])
      enrollCount[e.course_id] = (enrollCount[e.course_id] ?? 0) + 1

    // Subject count per course
    const subjectCount: Record<string, number> = {}
    for (const s of (subjectsData || []) as { id: string; course_id: string }[])
      subjectCount[s.course_id] = (subjectCount[s.course_id] ?? 0) + 1

    // Module / quiz / exam counts per course (via subjects join)
    const moduleCount: Record<string, number> = {}
    const quizCount: Record<string, number> = {}
    const examCount: Record<string, number> = {}
    for (const m of (modulesData || []) as { content_type: string; quiz_type?: string; subjects: { course_id: string } }[]) {
      const cid = m.subjects.course_id
      if (m.content_type === 'quiz') {
        if (m.quiz_type === 'exam') examCount[cid] = (examCount[cid] ?? 0) + 1
        else quizCount[cid] = (quizCount[cid] ?? 0) + 1
      } else {
        moduleCount[cid] = (moduleCount[cid] ?? 0) + 1
      }
    }

    // User enrolled ids
    const enrolledIds = new Set((userEnrollments || []).map((e: { course_id: string }) => e.course_id))

    const result = ((coursesData || []) as Course[])
      .filter(c => c.status !== 'inactive' && c.status !== 'draft')
      .map(c => ({
        ...c,
        total_enrollments: enrollCount[c.id] ?? 0,
        subject_count: subjectCount[c.id] ?? 0,
        module_count: moduleCount[c.id] ?? 0,
        quiz_count: quizCount[c.id] ?? 0,
        exam_count: examCount[c.id] ?? 0,
        is_user_enrolled: enrolledIds.has(c.id),
      }))

    setCourses(result)
    setLoading(false)
  }

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  const typeLabel: Record<string, string> = {
    academic: 'Academic',
    tesda: 'TESDA',
    upskill: 'Upskill',
  }

  if (loading) return <Loading />

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">Browse available courses</p>
      </div>

      <div className="relative mb-5 max-w-sm">
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No courses available.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(course => {
            const colorHex = colors[course.id]
            return (
              <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                {/* Thumbnail */}
                <div className="relative h-32 flex-shrink-0 overflow-hidden bg-gray-100">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full" style={{ objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: colorHex ? `linear-gradient(135deg, ${colorHex} 0%, ${colorHex}99 100%)` : 'linear-gradient(135deg, #0f4c5c 0%, #1f7a8c 100%)' }}>
                      <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                  {/* Enrolled status badge on thumbnail */}
                  {course.is_user_enrolled ? (
                    <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-[10px] font-semibold">Enrolled</span>
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 bg-gray-900/60 text-white px-2 py-0.5 rounded-full">
                      <span className="text-[10px] font-semibold">Not Enrolled</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1 gap-2">
                  {/* Course type + title */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug flex-1">{course.title}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200" style={{ color: '#0f4c5c' }}>
                      {typeLabel[course.course_type] ?? course.course_type}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="mt-auto pt-2 border-t border-gray-100 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{course.subject_count} subject{course.subject_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                      <span>{course.module_count} module{course.module_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{course.quiz_count} quiz{course.quiz_count !== 1 ? 'zes' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span>{course.exam_count} exam{course.exam_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{course.total_enrollments} enrolled</span>
                    </div>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
