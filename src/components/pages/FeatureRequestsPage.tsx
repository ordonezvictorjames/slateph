'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'

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

  const isDeveloper = user?.profile?.role === 'developer'
  const canEdit = isDeveloper
  const canSubmit = !isDeveloper

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'feature',
    priority: 'medium'
  })

  const categories = [
    { value: 'feature', label: 'Feature' },
    { value: 'bug', label: 'Bug' }
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
        .select(`*, user_profile:profiles!feature_requests_user_id_fkey(first_name, last_name, role)`)

      if (filterStatus !== 'all') query = query.eq('status', filterStatus)
      if (filterCategory !== 'all') query = query.eq('category', filterCategory)
      if (sortBy === 'recent') query = query.order('created_at', { ascending: false })
      else if (sortBy === 'oldest') query = query.order('created_at', { ascending: true })

      const { data, error } = await query

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          setRequests([]); setTableExists(false); setLoading(false); return
        }
        setRequests([]); setLoading(false); return
      }

      setTableExists(true)
      setRequests(data || [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    if (!isDeveloper) return
    try {
      await supabase.from('feature_requests').update({ status: newStatus }).eq('id', requestId)
      fetchRequests()
    } catch { alert('Failed to update status.') }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || isDeveloper) return
    try {
      const { error } = await supabase.from('feature_requests').insert({ user_id: user.id, ...formData })
      if (error) { alert('Failed to create request.'); return }
      setShowCreateModal(false)
      setFormData({ title: '', description: '', category: 'feature', priority: 'medium' })
      fetchRequests()
    } catch { alert('Failed to create request.') }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      ongoing: 'bg-teal-50 text-teal-700',
      finished: 'bg-green-100 text-green-700',
    }
    const label = statuses.find(s => s.value === status)?.label || status
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>
        {label}
      </span>
    )
  }

  const selectCls = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white'
  const focusTeal = 'focus:ring-[#0f4c5c]'

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bugs and Request</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isDeveloper ? 'View and manage bug reports and feature requests' : 'Report bugs or suggest new features'}
              </p>
            </div>
            {canSubmit && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors"
                style={{ backgroundColor: '#0f4c5c' }}
              >
                Submit Request
              </button>
            )}
          </div>

          {!tableExists && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              Feature requests table not set up. Run migration <code className="px-1.5 py-0.5 bg-amber-100 rounded">028_create_feature_requests.sql</code>.
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${selectCls} ${focusTeal}`}>
              <option value="all">All Status</option>
              {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={`${selectCls} ${focusTeal}`}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={`${selectCls} ${focusTeal}`}>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loading size="lg" /></div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests yet</h3>
            <p className="text-sm text-gray-500 mb-5">
              {isDeveloper ? 'No requests submitted yet.' : 'Be the first to submit a request!'}
            </p>
            {canSubmit && (
              <button onClick={() => setShowCreateModal(true)} className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold" style={{ backgroundColor: '#0f4c5c' }}>
                Submit Request
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Title', 'Description', 'Category', 'Status', 'Submitted By', 'Date'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-sm text-gray-900 w-48">{req.title}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <p className={`text-sm text-gray-600 flex-1 ${expandedDescriptions.has(req.id) ? '' : 'line-clamp-3'}`}>{req.description}</p>
                          <button onClick={() => toggleDescription(req.id)} className="flex-shrink-0 p-1 hover:bg-gray-100 rounded text-gray-400 text-xs">
                            {expandedDescriptions.has(req.id) ? '−' : '+'}
                          </button>
                        </div>
                        {req.admin_notes && (
                          <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: '#e6f4f7', color: '#0f4c5c' }}>
                            <span className="font-semibold">Note: </span>{req.admin_notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{req.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        {canEdit ? (
                          <select value={req.status} onChange={e => handleStatusChange(req.id, e.target.value)} className={`${selectCls} ${focusTeal}`}>
                            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        ) : getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{req.user_profile?.first_name} {req.user_profile?.last_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{req.user_profile?.role}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden p-4 space-y-3">
              {requests.map(req => (
                <div key={req.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 flex-1 pr-2">{req.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 flex-shrink-0">{req.category}</span>
                  </div>
                  <div className="flex items-start gap-2 mb-3">
                    <p className={`text-xs text-gray-600 flex-1 ${expandedDescriptions.has(req.id) ? '' : 'line-clamp-3'}`}>{req.description}</p>
                    <button onClick={() => toggleDescription(req.id)} className="text-gray-400 text-xs p-1 hover:bg-gray-100 rounded">
                      {expandedDescriptions.has(req.id) ? '−' : '+'}
                    </button>
                  </div>
                  {req.admin_notes && (
                    <div className="mb-3 p-2 rounded text-xs" style={{ backgroundColor: '#e6f4f7', color: '#0f4c5c' }}>
                      <span className="font-semibold">Note: </span>{req.admin_notes}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{req.user_profile?.first_name} {req.user_profile?.last_name}</p>
                      <p className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    {canEdit ? (
                      <select value={req.status} onChange={e => handleStatusChange(req.id, e.target.value)} className={`${selectCls} ${focusTeal} text-xs`}>
                        {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    ) : getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#0f4c5c' }}>
              <h2 className="text-base font-bold text-white">Submit Request</h2>
              <p className="text-xs text-white/70 mt-0.5">Report a bug or suggest a feature</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title" className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${focusTeal}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe in detail..." rows={5}
                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${focusTeal} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${focusTeal}`}>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${focusTeal}`}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors" style={{ backgroundColor: '#0f4c5c' }}>
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
