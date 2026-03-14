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
  }
}

type FilterType = 'all' | 'link' | 'file' | 'document'
type ViewMode = 'card' | 'table'

export default function LibraryPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  useEffect(() => {
    fetchResources()
  }, [])

  useEffect(() => {
    filterResources()
  }, [resources, searchQuery, filterType])

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
          creator:profiles!subject_resources_created_by_fkey(first_name, last_name)
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
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Library</h1>
            <p className="text-sm md:text-base text-gray-600">Browse and access learning resources</p>
          </div>
          <div className="hidden md:block">
            <svg className="w-16 h-16 text-fern-600 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 mb-4 md:mb-6">
        <div className="flex flex-col gap-3 md:gap-4 mb-3 md:mb-4">
          {/* Search */}
          <div className="w-full">
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

          {/* Type Filter - Scrollable on mobile */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-2 min-w-max md:min-w-0">
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
        </div>

        {/* View Toggle and Results count */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs md:text-sm text-gray-600">
            <span className="md:hidden">{filteredResources.length} / {resources.length}</span>
            <span className="hidden md:inline">{filteredResources.length} of {resources.length} resources</span>
          </div>
          
          {/* View Mode Toggle - Hidden on mobile */}
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'card'
                  ? 'bg-fern-500'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Card View"
            >
              <svg className={`w-5 h-5 ${viewMode === 'card' ? 'text-white' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-fern-500'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Table View"
            >
              <svg className={`w-5 h-5 ${viewMode === 'table' ? 'text-white' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Resources Display */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
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
            {/* Card View - Always shown on mobile, conditionally on desktop */}
            <div className={`divide-y divide-gray-100 ${viewMode === 'table' ? 'hidden md:hidden' : 'block'}`}>
              {filteredResources.map((resource) => (
                <div key={resource.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg ${getResourceTypeColor(resource.resource_type)} flex items-center justify-center`}>
                      {getResourceIcon(resource.resource_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 md:gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                            {resource.title}
                          </h3>
                          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-600 mb-2">
                            <span className="truncate">{resource.subject.course.title}</span>
                            <span className="hidden md:inline">•</span>
                            <span className="truncate">{resource.subject.title}</span>
                          </div>
                        </div>
                        <Badge variant="leaf" size="sm" className="flex-shrink-0">
                          {resource.resource_type}
                        </Badge>
                      </div>

                      {resource.description && (
                        <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">
                          {resource.description}
                        </p>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span className="truncate max-w-[150px] md:max-w-none">By {resource.creator.first_name} {resource.creator.last_name}</span>
                          <span className="hidden md:inline">•</span>
                          <span className="whitespace-nowrap">{formatDate(resource.created_at)}</span>
                          {resource.file_size && (
                            <>
                              <span className="hidden md:inline">•</span>
                              <span className="whitespace-nowrap">{formatFileSize(resource.file_size)}</span>
                            </>
                          )}
                        </div>

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
                          className="w-full md:w-auto min-h-[44px] md:min-h-0"
                        >
                          Open
                        </NatureButton>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table View - Only shown on desktop when selected */}
            <div className={`hidden md:block ${viewMode === 'card' ? 'md:hidden' : ''}`}>
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
                    {filteredResources.map((resource) => (
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
                          {resource.creator.first_name} {resource.creator.last_name}
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}
