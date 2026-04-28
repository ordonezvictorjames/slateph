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
  course_title: string | null
  subject_title: string | null
  created_at: string
}

export default function LibraryPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [links, setLinks] = useState<LibraryLink[]>([])
  const [filtered, setFiltered] = useState<LibraryLink[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', description: '', course_title: '', subject_title: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const role = user?.profile?.role || ''
  const canUpload = role === 'admin' || role === 'developer'

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q ? links.filter(l =>
        l.title.toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        (l.course_title || '').toLowerCase().includes(q) ||
        (l.subject_title || '').toLowerCase().includes(q)
      ) : links
    )
    setPage(1)
  }, [links, search])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('library_links')
      .select('id, title, url, description, course_title, subject_title, created_at')
      .order('created_at', { ascending: false })
    if (error) console.error('[Library]', error.message)
    setLinks(data || [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.url.startsWith('http')) {
      setFormError('URL must start with http:// or https://')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('library_links').insert({
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim() || null,
      course_title: form.course_title.trim() || null,
      subject_title: form.subject_title.trim() || null,
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowModal(false)
    setForm({ title: '', url: '', description: '', course_title: '', subject_title: '' })
    load()
  }

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">

      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">Browse and access learning resources</p>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl"
            style={{ backgroundColor: '#1f7a8c' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#155f6e')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1f7a8c')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Link
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, course, subject..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f7a8c] focus:border-transparent"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-sm text-gray-500">{search ? 'No results found' : 'No links uploaded yet'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">URL</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageItems.map(link => (
                    <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{link.title}</p>
                        {link.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{link.description}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{link.course_title || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{link.subject_title || '—'}</td>
                      <td className="px-5 py-3 max-w-[180px]">
                        <AutoLinkText text={link.url} className="text-xs truncate block" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => window.open(link.url, '_blank')}
                          className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                          style={{ backgroundColor: '#1f7a8c' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#155f6e')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1f7a8c')}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                    Previous
                  </button>
                  <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                    Next
                  </button>
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
              <h2 className="text-base font-bold text-gray-900">Upload Link</h2>
              <button onClick={() => { setShowModal(false); setFormError('') }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Google Meet Class Link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f7a8c] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL <span className="text-red-500">*</span></label>
                <input required type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f7a8c] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.course_title} onChange={e => setForm(p => ({ ...p, course_title: e.target.value }))}
                  placeholder="e.g. CoBot System Integration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f7a8c] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.subject_title} onChange={e => setForm(p => ({ ...p, subject_title: e.target.value }))}
                  placeholder="e.g. Introduction to Robotics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f7a8c] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Brief description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1f7a8c] focus:border-transparent" />
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowModal(false); setFormError('') }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
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
