'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'

interface DownloadLink {
  id: string
  title: string
  file_url: string
  file_type: string
}

const FILE_TYPES = [
  { value: 'link',      label: 'Link',       accept: '' },
  { value: 'pdf',       label: 'PDF',        accept: '.pdf,application/pdf' },
  { value: 'word',      label: 'Word',       accept: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { value: 'excel',     label: 'Excel',      accept: '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { value: 'ppt',       label: 'PowerPoint', accept: '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { value: 'text',      label: 'Text File',  accept: '.txt,text/plain' },
  { value: 'video',     label: 'Video',      accept: '.mp4,.mov,.avi,.mkv,video/*' },
  { value: 'music',     label: 'Music',      accept: '.mp3,.wav,.flac,.aac,audio/*' },
  { value: 'software',  label: 'Software',   accept: '.exe,.dmg,.zip,.rar,.7z,.msi' },
  { value: 'others',    label: 'Others',     accept: '' },
]

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  word: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  excel: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18M3 3h18v18H3z" />
    </svg>
  ),
  ppt: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3h16.5M3.75 21h16.5M3.75 12h16.5M8.25 3v18M15.75 3v18" />
    </svg>
  ),
  text: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
    </svg>
  ),
  video: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  music: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
    </svg>
  ),
  software: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  link: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  others: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
}

export default function DownloadCenterPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [links, setLinks] = useState<DownloadLink[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')

  // Add / Edit modal
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', file_url: '', file_type: 'link' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const role = user?.profile?.role || ''
  const canManage = role === 'admin' || role === 'developer'

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('download_center')
        .select('id, title, file_url, file_type')
        .order('created_at', { ascending: false })
      if (error) console.error('[DownloadCenter]', error.code, error.message)
      setLinks((data as DownloadLink[]) || [])
    } catch (e) {
      console.error('[DownloadCenter] exception:', e)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditingId(null)
    setForm({ title: '', file_url: '', file_type: 'link' })
    setFormError('')
    setShowModal(true)
  }

  function openEdit(link: DownloadLink) {
    setEditingId(link.id)
    setForm({ title: link.title, file_url: link.file_url, file_type: link.file_type || 'link' })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.file_url.startsWith('http')) {
      setFormError('URL must start with http:// or https://')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('download_center')
          .update({ title: form.title.trim(), file_url: form.file_url.trim(), file_type: form.file_type })
          .eq('id', editingId)
        if (error) { setFormError(error.message); return }
      } else {
        const { error } = await supabase.from('download_center').insert({
          title: form.title.trim(),
          file_url: form.file_url.trim(),
          file_type: form.file_type,
        })
        if (error) { setFormError(error.message); return }
      }
      setShowModal(false)
      load()
    } catch (err: any) {
      setFormError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    setDeleting(true)
    try {
      await supabase.from('download_center').delete().eq('id', deletingId)
      setDeletingId(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  const filtered = filterType === 'all' ? links : links.filter(l => l.file_type === filterType)
  const usedTypes = Array.from(new Set(links.map(l => l.file_type).filter(Boolean)))

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
          <h1 className="text-2xl font-bold text-gray-900">Download Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">Access learning materials and resources</p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
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

      {/* Filter tabs */}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterType === 'all' ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            style={filterType === 'all' ? { backgroundColor: '#1f7a8c' } : {}}
          >
            All ({links.length})
          </button>
          {usedTypes.map(type => {
            const ft = FILE_TYPES.find(f => f.value === type)
            const count = links.filter(l => l.file_type === type).length
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterType === type ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                style={filterType === type ? { backgroundColor: '#1f7a8c' } : {}}
              >
                {ft?.label || type} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
          </svg>
          <p className="text-gray-500 font-medium">{filterType !== 'all' ? 'No files of this type' : 'No links uploaded yet'}</p>
          {canManage && filterType === 'all' && <p className="text-sm text-gray-400 mt-1">Click "Upload Link" to add the first resource.</p>}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {filtered.map(link => (
            <div
              key={link.id}
              className="relative group cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-200"
              style={{ width: '100px', height: '100px', flexShrink: 0 }}
              onClick={() => window.open(link.file_url, '_blank')}
            >
              {/* Background */}
              <div className="absolute inset-0 bg-white" />

              {/* File type icon — center */}
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: '#1f7a8c' }}>
                {TYPE_ICONS[link.file_type] || TYPE_ICONS['others']}
              </div>

              {/* Title overlay — bottom */}
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-white/90">
                <p className="text-gray-800 text-[9px] font-semibold leading-tight line-clamp-2 text-center">{link.title}</p>
              </div>

              {/* Edit / Delete — top-right on hover */}
              {canManage && (
                <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(link) }}
                    className="p-1 rounded-md bg-white/90 hover:bg-white text-gray-500 shadow-sm"
                    title="Edit"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeletingId(link.id) }}
                    className="p-1 rounded-md bg-white/90 hover:bg-white text-red-500 shadow-sm"
                    title="Delete"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">{editingId ? 'Edit Link' : 'Upload Link'}</h2>
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
                  placeholder="e.g. Module 1 Handout"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#1f7a8c' } as React.CSSProperties} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Type <span className="text-red-500">*</span></label>
                <select
                  value={form.file_type}
                  onChange={e => setForm(p => ({ ...p, file_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#1f7a8c' } as React.CSSProperties}
                >
                  {FILE_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL <span className="text-red-500">*</span></label>
                <input
                  required
                  type="url"
                  value={form.file_url}
                  onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#1f7a8c' } as React.CSSProperties}
                />
                {form.file_type !== 'link' && form.file_type !== 'others' && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Expected: {FILE_TYPES.find(f => f.value === form.file_type)?.accept || ''}
                  </p>
                )}
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowModal(false); setFormError('') }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#1f7a8c' }}>
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Link</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} disabled={deleting}
                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
