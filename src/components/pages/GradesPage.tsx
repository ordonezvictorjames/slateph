'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GradeRow {
  id: string
  user_id: string
  module_id: string
  subject_id: string
  course_id: string
  quiz_type: string
  quiz_title: string
  score: number
  total: number
  percentage: number
  passed: boolean
  try_number: number
  submitted_at: string
  // joined
  first_name: string
  last_name: string
  module_title: string
  subject_title: string
  course_title: string
}

export default function GradesPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<GradeRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filterCourse, setFilterCourse] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchGrades() }, [])

  const fetchGrades = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('quiz_grades')
        .select('*, profiles(first_name, last_name)')
        .order('submitted_at', { ascending: false })

      if (error || !data) return

      const base: GradeRow[] = data.map((g: any) => ({
        ...g,
        first_name: g.profiles?.first_name || '',
        last_name: g.profiles?.last_name || '',
        module_title: '',
        subject_title: '',
        course_title: '',
      }))

      // Fetch module + subject + course titles
      const moduleIds = Array.from(new Set(base.map(r => r.module_id)))
      if (moduleIds.length > 0) {
        const { data: mods } = await supabase
          .from('modules')
          .select('id, title, subject_id, subjects(id, title, course_id, courses(id, title))')
          .in('id', moduleIds)

        const modMap: Record<string, { moduleTitle: string; subjectTitle: string; courseTitle: string }> = {}
        for (const m of (mods || [])) {
          const subj = (m.subjects as any)
          const course = subj?.courses
          modMap[m.id] = {
            moduleTitle: m.title || '',
            subjectTitle: subj?.title || '',
            courseTitle: course?.title || '',
          }
        }
        base.forEach(r => {
          const info = modMap[r.module_id]
          if (info) {
            r.module_title = info.moduleTitle
            r.subject_title = info.subjectTitle
            r.course_title = info.courseTitle
          }
        })
      }

      setRows(base)
    } finally {
      setLoading(false)
    }
  }

  // Unique values for dropdowns
  const courses = useMemo(() => Array.from(new Set(rows.map(r => r.course_title).filter(Boolean))).sort(), [rows])
  const subjects = useMemo(() => Array.from(new Set(
    rows.filter(r => !filterCourse || r.course_title === filterCourse).map(r => r.subject_title).filter(Boolean)
  )).sort(), [rows, filterCourse])
  const modules = useMemo(() => Array.from(new Set(
    rows.filter(r => (!filterCourse || r.course_title === filterCourse) && (!filterSubject || r.subject_title === filterSubject))
      .map(r => r.module_title).filter(Boolean)
  )).sort(), [rows, filterCourse, filterSubject])

  const filtered = useMemo(() => rows.filter(r => {
    if (filterCourse && r.course_title !== filterCourse) return false
    if (filterSubject && r.subject_title !== filterSubject) return false
    if (filterModule && r.module_title !== filterModule) return false
    if (search) {
      const q = search.toLowerCase()
      if (!`${r.first_name} ${r.last_name}`.toLowerCase().includes(q) &&
          !r.module_title.toLowerCase().includes(q) &&
          !r.course_title.toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, filterCourse, filterSubject, filterModule, search])

  const clearFilters = () => { setFilterCourse(''); setFilterSubject(''); setFilterModule(''); setSearch('') }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Grades</h1>
        <p className="text-xs text-gray-500 mt-0.5">All quiz and exam submissions</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Course</label>
          <select value={filterCourse} onChange={e => { setFilterCourse(e.target.value); setFilterSubject(''); setFilterModule('') }}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1f7a8c]">
            <option value="">All Courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
          <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setFilterModule('') }}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1f7a8c]">
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Module</label>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1f7a8c]">
            <option value="">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Search student</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name..."
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1f7a8c]" />
        </div>
        {(filterCourse || filterSubject || filterModule || search) && (
          <button onClick={clearFilters} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">No grades found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Student</th>
                  <th className="text-left px-3 py-3 text-gray-500 font-semibold">Course</th>
                  <th className="text-left px-3 py-3 text-gray-500 font-semibold">Subject</th>
                  <th className="text-left px-3 py-3 text-gray-500 font-semibold">Module</th>
                  <th className="text-center px-3 py-3 text-gray-500 font-semibold">Type</th>
                  <th className="text-center px-3 py-3 text-gray-500 font-semibold">Score</th>
                  <th className="text-center px-3 py-3 text-gray-500 font-semibold">%</th>
                  <th className="text-center px-3 py-3 text-gray-500 font-semibold">Status</th>
                  <th className="text-center px-3 py-3 text-gray-500 font-semibold">Try</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{r.first_name} {r.last_name}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[140px] truncate">{r.course_title || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[140px] truncate">{r.subject_title || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 font-medium max-w-[160px] truncate">{r.module_title || r.module_id}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${r.quiz_type === 'exam' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {r.quiz_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{r.score}/{r.total}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-800">{r.percentage}%</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${r.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {r.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500">#{r.try_number}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400 whitespace-nowrap">
                      {new Date(r.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
