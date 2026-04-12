'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/loading'

interface Course {
  id: string
  title: string
  course_type: 'academic' | 'tesda' | 'upskill'
  enrollment_type: string
  status: string
  thumbnail_url?: string
}

export default function CoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, course_type, enrollment_type, status, thumbnail_url')
        .order('title')

      if (error) {
        console.error('CoursesPage fetch error:', error.message || JSON.stringify(error))
        setLoading(false)
        return
      }
      setCourses((data || []).filter(c => c.status !== 'inactive' && c.status !== 'draft'))
      setLoading(false)
    }
    fetchCourses()
  }, [user?.id])

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const typeLabel: Record<string, string> = {
    academic: 'Academic',
    tesda: 'TESDA',
    upskill: 'Upskill',
  }

  if (loading) return <Loading />

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">Browse available courses</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No courses available.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(course => (
            <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="h-36 flex items-center justify-center overflow-hidden" style={{ background: course.thumbnail_url ? undefined : 'linear-gradient(135deg, #0f4c5c 0%, #1f7a8c 100%)' }}>
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
              </div>
              {/* Info */}
              <div className="p-4 flex flex-col flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 mb-1" style={{ color: '#0f4c5c' }}>
                  {typeLabel[course.course_type] ?? course.course_type}
                </span>
                <h3 className="text-sm font-bold text-gray-900 line-clamp-2 flex-1">{course.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
