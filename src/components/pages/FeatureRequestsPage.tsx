'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading, ButtonLoading } from '@/components/ui/loading'

interface FeatureRequest {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  votes: number
  admin_notes?: string
  created_at: string
  updated_at: string
  user_voted?: boolean
  user_profile?: {
    first_name: string
    last_name: string
    role: string
  }
}

export default function FeatureRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [tableExists, setTableExists] = useState(true)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const supabase = createClient()

  // Check if user is developer (can edit)
  const isDeveloper = user?.profile?.role === 'developer'
  const canEdit = isDeveloper // Only developers can edit
  const canSubmit = !isDeveloper // Admin, trainee, trainee can submit

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'feature',
    priority: 'medium'
  })

  const categories = [
    { value: 'feature', label: 'Feature', icon: '' },
    { value: 'bug', label: 'Bug', icon: '' }
  ]

  const statuses = [
    { value: 'pending', label: 'Pending', color: 'gray' },
    { value: 'ongoing', label: 'Ongoing', color: 'blue' },
    { value: 'finished', label: 'Finished', color: 'green' }
  ]

  useEffect(() => {
    fetchRequests()
  }, [filterStatus, filterCategory, sortBy])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('feature_requests')
        .select(`
          *,
          user_profile:profiles!feature_requests_user_id_fkey(first_name, last_name, role)
        `)

      // Apply filters
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory)
      }

      // Apply sorting
      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false })
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true })
      }

      const { data, error } = await query

      if (error) {
        // If table doesn't exist yet, silently fail
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('Feature requests table not created yet. Please run migration 028.')
          setRequests([])
          setTableExists(false)
          setLoading(false)
          return
        }
        console.error('Error fetching feature requests:', error)
        setRequests([])
        setLoading(false)
        return
      }

      setTableExists(true)

      // Set requests directly without checking votes
      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching feature requests:', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (requestId: string, currentlyVoted: boolean) => {
    // Voting removed - no longer needed
  }

  const toggleDescription = (requestId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(requestId)) {
        newSet.delete(requestId)
      } else {
        newSet.add(requestId)
      }
      return newSet
    })
  }

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    if (!isDeveloper) return // Only developers can update status

    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', requestId)

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('Feature requests table not created yet. Please run migration 028.')
          return
        }
        throw error
      }

      fetchRequests()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || isDeveloper) return // Developers can't submit

    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          user_id: user.id,
          ...formData
        })

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          alert('Feature requests table not created yet. Please ask your administrator to run migration 028.')
          return
        }
        throw error
      }

      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        category: 'feature',
        priority: 'medium'
      })
      fetchRequests()
    } catch (error) {
      console.error('Error creating feature request:', error)
      alert('Failed to create feature request. Please try again.')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = statuses.find(s => s.value === status)
    if (!statusInfo) return null

    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700'
    }

    const getStatusIcon = (value: string) => {
      switch (value) {
        case 'pending':
          return (
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        case 'ongoing':
          return (
            <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        case 'finished':
          return (
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        default:
          return null
      }
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClasses[statusInfo.color as keyof typeof colorClasses]}`}>
        {getStatusIcon(statusInfo.value)}
        {statusInfo.label}
      </span>
    )
  }

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[categories.length - 1]
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <svg className="w-8 h-8 mr-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Bugs and Request
              </h1>
              <p className="text-gray-600 mt-2">
                {isDeveloper 
                  ? 'View and manage bug reports and feature requests from users'
                  : 'Report bugs or suggest new features for the LMS'
                }
              </p>
            </div>
            {canSubmit && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Submit Request</span>
              </button>
            )}
          </div>

          {/* Table Not Created Warning */}
          {!tableExists && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-yellow-900">Feature Requests Not Set Up</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    The feature requests database table hasn't been created yet. Please ask your administrator to run migration <code className="px-2 py-1 bg-yellow-100 rounded">028_create_feature_requests.sql</code> in Supabase.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Status</option>
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feature Requests List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loading size="lg" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">💡</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No feature requests yet</h3>
            <p className="text-gray-600 mb-6">
              {isDeveloper 
                ? 'No feature requests have been submitted yet.'
                : 'Be the first to suggest a new feature!'
              }
            </p>
            {canSubmit && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
              >
                Submit Your First Request
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">
                      Submitted By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((request) => {
                    const categoryInfo = getCategoryInfo(request.category)
                    return (
                      <tr 
                        key={request.id} 
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Title Column */}
                        <td className="px-6 py-4">
                          <h3 className="text-base font-semibold text-gray-900">
                            {request.title}
                          </h3>
                        </td>

                        {/* Description Column */}
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-start space-x-2">
                              <p className={`text-sm text-gray-600 flex-1 ${expandedDescriptions.has(request.id) ? '' : 'line-clamp-3'}`}>
                                {request.description}
                              </p>
                              <button
                                onClick={() => toggleDescription(request.id)}
                                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                                title={expandedDescriptions.has(request.id) ? 'Collapse' : 'Expand'}
                              >
                                {expandedDescriptions.has(request.id) ? (
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            {request.admin_notes && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <span className="font-medium text-blue-900">Admin: </span>
                                <span className="text-blue-700">{request.admin_notes}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Category Column */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {categoryInfo.label}
                          </span>
                        </td>

                        {/* Status Column - Dropdown for developers, badge for others */}
                        <td className="px-6 py-4">
                          {canEdit ? (
                            <select
                              value={request.status}
                              onChange={(e) => handleStatusChange(request.id, e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                            >
                              {statuses.map(status => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            getStatusBadge(request.status)
                          )}
                        </td>

                        {/* Submitted By Column */}
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {request.user_profile?.first_name} {request.user_profile?.last_name}
                            </div>
                            <div className="text-gray-500 capitalize text-xs">
                              {request.user_profile?.role}
                            </div>
                          </div>
                        </td>

                        {/* Date Column */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(request.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-4">
              {requests.map((request) => {
                const categoryInfo = getCategoryInfo(request.category)
                return (
                  <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900 flex-1 pr-2">
                        {request.title}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                        {categoryInfo.label}
                      </span>
                    </div>
                    
                    <div className="flex items-start space-x-2 mb-3">
                      <p className={`text-sm text-gray-600 flex-1 ${expandedDescriptions.has(request.id) ? '' : 'line-clamp-3'}`}>
                        {request.description}
                      </p>
                      <button
                        onClick={() => toggleDescription(request.id)}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                        title={expandedDescriptions.has(request.id) ? 'Collapse' : 'Expand'}
                      >
                        {expandedDescriptions.has(request.id) ? (
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {request.admin_notes && (
                      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <span className="font-medium text-blue-900">Admin: </span>
                        <span className="text-blue-700">{request.admin_notes}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {request.user_profile?.first_name} {request.user_profile?.last_name}
                        </div>
                        <div className="text-gray-500 capitalize text-xs">
                          {request.user_profile?.role}
                        </div>
                      </div>
                      <div className="text-right">
                        {canEdit ? (
                          <select
                            value={request.status}
                            onChange={(e) => handleStatusChange(request.id, e.target.value)}
                            className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          >
                            {statuses.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          getStatusBadge(request.status)
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(request.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Feature Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-white">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Submit Feature Request
              </h2>
              <p className="text-gray-600 mt-1">Share your idea to improve the LMS</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for your feature request"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your feature request in detail. What problem does it solve? How would it work?"
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-black text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
