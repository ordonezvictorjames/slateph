'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'
import { Badge } from '@/components/ui/badge'
import { NatureButton } from '@/components/ui/nature-button'

interface Resource {
  id: string
  subject_id: string
  title: string
  resource_url: string
  resource_type: 'link' | 'file' | 'document'
  description: string | null
  file_size: number | null
  file_type: string | null
  order_index: number
  status: 'active' | 'inactive'
  created_at: string
  subject: {
    title: string
    course: {
      title: string
    }
  }
  creator: {
    first_name: string
    last_name: string
  } | null
}

type FilterType = 'all' | 'link' | 'file' | 'document'

export default function LibraryPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Link upload modal state
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkForm, setLinkForm] = useState({ title: '', url: '', description: '', subject_id: '' })
  const [subjects, setSubjects] = useState<{ id: string; title: string; course_title: string }[]>([])
  const [savingLink, setSavingLink] = useState(false)
  const [linkError, setLinkError] = useState('')

  const role = user?.profile?.role || ''
  const canUpload = role === 'admin' || role === 'developer' || role === 'instructor'

  useEffect(() => {
    fetchResources()
    if (canUpload) fetchSubjects()
  }, [])

  useEffect(() => {
    filterResources()
  }, [resources, searchQuery, filterType])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterType])

  const fetchSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('id, title, course:courses(title)')
      .order('title', { ascending: true })
    setSubjects((data || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      course_title: s.course?.title || ''
    })))
  }

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinkError('')
    if (!linkForm.url.startsWith('http')) {
      setLinkError('URL must start with http:// or https://')
      return
    }
    if (!linkForm.subject_id) {
      setLinkError('Please select a subject')
      return
    }
    setSavingLink(true)
    try {
      const { error } = await supabase.from('subject_resources').insert({
        subject_id: linkForm.subject_id,
        title: linkForm.title.trim(),
        resource_url: linkForm.url.trim(),
        resource_type: 'link',
        description: linkForm.description.trim() || null,
        status: 'active',
        order_index: 0,
      })
      if (error) { setLinkError(error.message); return }
      setShowLinkModal(false)
      setLinkForm({ title: '', url: '', description: '', subject_id: '' })
      fetchResources()
    } catch (err: any) {
      setLinkError(err.message || 'Failed to save link')
    } finally {
      setSavingLink(false)
    }
  }

  const fetchResources = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('subject_resources')
        .select(`
          *,
          subject:subjects(
            title,
            course:courses(title)
          ),
          creator:profiles!subject_resources_created_by_fkey!left(first_name, last_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching resources:', error)
        return
      }

      setResources(data || [])
    } catch (error) {
      console.error('Error fetching resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterResources = () => {
    let filtered = resources

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.resource_type === filterType)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.subject.title.toLowerCase().includes(query) ||
        r.subject.course.title.toLowerCase().includes(query)
      )
    }

    setFilteredResources(filtered)
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'link':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )
      case 'file':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      case 'document':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'link':
        return 'bg-blue-100 text-blue-700'
      case 'file':
        return 'bg-green-100 text-green-700'
      case 'document':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null
    const kb = bytes / 1024
    const mb = kb / 1024
    if (mb >= 1) return `${mb.toFixed(2)} MB`
    return `${kb.toFixed(2)} KB`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentResources = filteredResources.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border border-gray-100 mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Library</h1>
            <p className="text-sm md:text-base text-gray-600">Browse and access learning resources</p>
          </div>
        <div className="flex items-center gap-3">
          {canUpload && (
            <button
              onClick={() => setShowLinkModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
              style={{ backgroundColor: '#1f7a8c' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#155f6e')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1f7a8c')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Upload Link
            </button>
          )}
          <div className="hidden md:block">
            <svg className="w-16 h-16 text-fern-600 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border border-gray-100 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-3 md:mb-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-2.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-fern-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2.5 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors whitespace-nowrap min-h-[44px] md:min-h-0 ${
                filterType === 'all'
                  ? 'bg-fern-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('link')}
              className={`px-4 py-2.5 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors whitespace-nowrap min-h-[44px] md:min-h-0 ${
                filterType === 'link'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Links
            </button>
            <button
              onClick={() => setFilterType('file')}
              className={`px-4 py-2.5 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors whitespace-nowrap min-h-[44px] md:min-h-0 ${
                filterType === 'file'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setFilterType('document')}
              className={`px-4 py-2.5 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors whitespace-nowrap min-h-[44px] md:min-h-0 ${
                filterType === 'document'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Documents
            </button>
          </div>
        </div>

        {/* Pagination info */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs md:text-sm text-gray-600">
            {filteredResources.length === 0 ? (
              <span>No resources found</span>
            ) : (
              <span>
                Showing {startIndex + 1} to {Math.min(endIndex, filteredResources.length)} of {filteredResources.length} resources
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Resources Display - Table View Only */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filteredResources.length === 0 ? (
          <div className="text-center py-8 md:py-12 px-4">
            <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-1 md:mb-2">No resources found</h3>
            <p className="text-sm md:text-base text-gray-600">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'No resources have been uploaded yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Course / Subject
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Uploaded By
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentResources.map((resource) => (
                    <tr key={resource.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${getResourceTypeColor(resource.resource_type)} flex items-center justify-center`}>
                            {getResourceIcon(resource.resource_type)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {resource.title}
                            </div>
                            {resource.description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {resource.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="text-sm text-gray-900">{resource.subject.course.title}</div>
                        <div className="text-xs text-gray-500">{resource.subject.title}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge variant="leaf" size="sm">
                          {resource.resource_type}
                        </Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-900">
                        {resource.creator ? `${resource.creator.first_name} ${resource.creator.last_name}` : '—'}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(resource.created_at)}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatFileSize(resource.file_size) || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <NatureButton
                          size="sm"
                          variant="leaf"
                          onClick={() => window.open(resource.resource_url, '_blank')}
                          icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          }
                          iconPosition="right"
                        >
                          Open
                        </NatureButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              currentPage === pageNum
                                ? 'bg-fern-500 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Upload Link</h2>
              <button onClick={() => { setShowLinkModal(false); setLinkError('') }}
                className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveLink} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input required value={linkForm.title} onChange={e => setLinkForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Google Meet Class Link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL <span className="text-red-500">*</span></label>
                <input required type="url" value={linkForm.url} onChange={e => setLinkForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                <select required value={linkForm.subject_id} onChange={e => setLinkForm(p => ({ ...p, subject_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent">
                  <option value="">Select a subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.course_title} — {s.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={linkForm.description} onChange={e => setLinkForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Brief description of this resource..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent" />
              </div>
              {linkError && <p className="text-sm text-red-500">{linkError}</p>}
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => { setShowLinkModal(false); setLinkError('') }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={savingLink}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#1f7a8c' }}>
                  {savingLink ? 'Saving…' : 'Save Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
