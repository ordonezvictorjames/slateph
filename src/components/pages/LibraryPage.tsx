'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'
import AutoLinkText from '@/components/ui/AutoLinkText'

interface LibraryLink {
  id: string
  title: string
  url: string
  description: string | null
  course_id: string | null
  subject_id: string | null
  created_at: string
  course_title?: string
  subject_title?: string
}

export default function LibraryPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [links, setLinks] = useState<LibraryLink[]>([])
  const [filtered, setFiltered] = useState<LibraryLink[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Upload modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', description: '', course_id: '', subject_id: '' })
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; title: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const role = user?.profile?.role || ''
  const canUpload = role === 'admin' || role === 'developer'

  useEffect(() => {
    fetchLinks()
    if (canUpload) fetchCourses()
  }, [])

  // Fetch subjects when course changes in form
  useEffect(() => {
    if (!form.course_id) { setSubjects([]); setForm(p => ({ ...p, subject_id: '' })); return }
    supabase.from('subjects').select('id, title').eq('course_id', form.course_id).order('order_index', { ascending: true })
      .then(({ data }: { data: { id: string; title: string }[] | null }) => setSubjects(data || []))
    setForm(p => ({ ...p, subject_id: '' }))
  }, [form.course_id])

  useEffect(() => {
    const q = searchQuery.toLowerCase()
    setFiltered(q ? links.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q) ||
      l.course_title?.toLowerCase().includes(q) ||
      l.subject_title?.toLowerCase().includes(q)
    ) : links)
    setCurrentPage(1)
  }, [links, searchQuery])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').order('title', { ascending: true })
    setCourses(data || [])
  }

  const fetchLinks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('library_links')
        .select('id, title, url, description, course_id, subject_id, created_at')
        .order('created_at', { ascending: false })

      if (error) { console.error('[Library]', error.message, error.code); setLinks([]); return }
      if (!data || data.length === 0) { setLinks([]); return }

      // Fetch course and subject names
      const courseIds = Array.from(new Set(data.map((l: any) => l.course_id).filter(Boolean)))
      const subjectIds = Array.from(new Set(data.map((l: any) => l.subject_id).filter(Boolean)))

      const [{ data: courseData }, { data: subjectData }] = await Promise.all([
        courseIds.length > 0 ? supabase.from('courses').select('id, title').in('id', courseIds) : Promise.resolve({ data: [] }),
        subjectIds.length > 0 ? supabase.from('subjects').select('id, title').in('id', subjectIds) : Promise.resolve({ data: [] }),
      ])

      const courseMap: Record<string, string> = {}
      for (const c of (courseData || [])) courseMap[c.id] = c.title
      const subjectMap: Record<string, string> = {}
      for (const s of (subjectData || [])) subjectMap[s.id] = s.title

      setLinks(data.map((l: any) => ({
        ...l,
        course_title: l.course_id ? courseMap[l.course_id] || '' : '',
        subject_title: l.subject_id ? subjectMap[l.subject_id] || '' : '',
      })))
    } catch (e) {
      console.error('[Library] exception:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.url.startsWith('http')) { setFormError('URL must start with http:// or https://'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('library_links').insert({
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim() || null,
        course_id: form.course_id || null,
        subject_id: form.subject_id || null,
      })
      if (error) { setFormError(error.message); return }
      setShowModal(false)
      setForm({ title: '', url: '', description: '', course_id: '', subject_id: '' })
      fetchLinks()
    } catch (err: any) {
      setFormError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const pageItems = filtered.slice(startIndex, startIndex + itemsPerPage)

  if (loading) return <div className="p-8 flex items-center justify-center h-64"><Loading size="lg" /></div>

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Library</h1>
            <p className="text-sm text-gray-600">Browse and access learning resources</p>
          </div>
          {canUpload && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
              style={{ backgroundColor: '#1f7a8c' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#155f6e')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1f7a8c')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Upload Link
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, course, subject..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
        </div>
        <p className="text-xs text-gray-500 mt-2">{filtered.length} resource{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="text-base font-medium text-gray-900 mb-1">No links found</h3>
            <p className="text-sm text-gray-500">{searchQuery ? 'Try adjusting your search' : 'No links have been uploaded yet'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">URL</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageItems.map(link => (
                    <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-gray-900">{link.title}</div>
                        {link.description && <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{link.description}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{link.course_title || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{link.subject_title || '—'}</td>
                      <td className="px-6 py-4 max-w-xs">
                        <AutoLinkText text={link.url} className="text-xs truncate block" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => window.open(link.url, '_blank')}
                          className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors"
                          style={{ backgroundColor: '#1f7a8c' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#155f6e')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1f7a8c')}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50">Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Upload Link</h2>
              <button onClick={() => { setShowModal(false); setFormError('') }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Google Meet Class Link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL <span className="text-red-500">*</span></label>
                <input required type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course <span className="text-gray-400 font-normal">(optional)</span></label>
                <select value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent">
                  <option value="">— Select course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              {subjects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent">
                    <option value="">— Select subject —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Brief description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent" />
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowModal(false); setFormError('') }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#1f7a8c' }}>
                  {saving ? 'Saving…' : 'Save Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
