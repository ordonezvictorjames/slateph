'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loading, ButtonLoading } from '@/components/ui/loading'

interface UsedCode {
  id: string
  code: string
  created_at: string
  used_at: string
  used_by: string
  user_name: string
  user_email: string
  user_role: string
}

export default function CodeGeneratorPage() {
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [usedCodes, setUsedCodes] = useState<UsedCode[]>([])
  const [filteredCodes, setFilteredCodes] = useState<UsedCode[]>([])
  const [loadingUsedCodes, setLoadingUsedCodes] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchUsedCodes()
  }, [])

  useEffect(() => {
    filterCodes()
  }, [searchQuery, filterRole, usedCodes])

  const fetchUsedCodes = async () => {
    try {
      setLoadingUsedCodes(true)
      const { data, error } = await supabase
        .from('registration_codes')
        .select(`
          id,
          code,
          created_at,
          used_at,
          used_by,
          user:profiles!registration_codes_used_by_fkey(
            first_name,
            last_name,
            email,
            role
          )
        `)
        .eq('is_used', true)
        .order('used_at', { ascending: false })

      if (error) {
        console.error('Error fetching used codes:', error)
        return
      }

      const formattedCodes = (data || []).map((item: any) => ({
        id: item.id,
        code: item.code,
        created_at: item.created_at,
        used_at: item.used_at,
        used_by: item.used_by,
        user_name: item.user ? `${item.user.first_name} ${item.user.last_name}` : 'Unknown',
        user_email: item.user?.email || 'N/A',
        user_role: item.user?.role || 'N/A'
      }))

      setUsedCodes(formattedCodes)
    } catch (err) {
      console.error('Error fetching used codes:', err)
    } finally {
      setLoadingUsedCodes(false)
    }
  }

  const filterCodes = () => {
    let filtered = [...usedCodes]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(code => 
        code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.user_email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(code => code.user_role === filterRole)
    }

    setFilteredCodes(filtered)
  }

  const generateCode = async () => {
    if (!user?.id) {
      showError('Error', 'You must be logged in to generate codes')
      return
    }

    setGenerating(true)
    
    try {
      const { data, error } = await supabase.rpc('generate_registration_code', {
        p_created_by: user.id
      }) as { data: any, error: any }

      if (error) {
        console.error('Error generating code:', error)
        showError('Error', 'Failed to generate code')
        setGenerating(false)
        return
      }

      if (data && data.success) {
        setGeneratedCode(data.code)
        setShowModal(true)
        showSuccess('Code Generated!', 'Registration code created successfully')
        fetchUsedCodes()
      } else {
        showError('Error', 'Failed to generate code')
      }
      
      setGenerating(false)
    } catch (err) {
      console.error('Error generating code:', err)
      showError('Error', 'Failed to generate code')
      setGenerating(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    showSuccess('Copied!', 'Code copied to clipboard')
  }

  return (
    <div className="space-y-6">
      {/* Modal for Generated Code */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Code Generated Successfully!</h3>
              <p className="text-sm text-gray-600 mb-6">Share this code with the new user for registration</p>
              
              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-6">
                <p className="text-4xl font-bold font-mono text-gray-900 tracking-wider">{generatedCode}</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => copyToClipboard(generatedCode)}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Code
                </Button>
                <Button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Code Generator</h2>
        <p className="text-gray-600">
          Generate unique 6-character codes for new user registrations.
        </p>
      </div>

      {/* Used Codes Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Filter Bar and Generate Button */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search Input */}
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by code, name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="trainee">Trainee</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
              </select>
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateCode}
              disabled={generating}
              className="bg-black hover:bg-primary-700 text-white px-6 py-2"
            >
              {generating ? (
                <div className="flex items-center gap-2">
                  <ButtonLoading />
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Generate Code</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <>
          {loadingUsedCodes ? (
            <div className="p-12 text-center">
              <Loading size="lg" />
              <p className="mt-4 text-gray-600">Loading used codes...</p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600 font-medium">
                {searchQuery || filterRole !== 'all' ? 'No codes match your filters' : 'No codes have been used yet'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery || filterRole !== 'all' ? 'Try adjusting your search or filter' : 'Used codes will appear here once users register'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Used At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCodes.map((codeData) => (
                  <tr key={codeData.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-lg">{codeData.code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                          {codeData.user_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{codeData.user_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {codeData.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        codeData.user_role === 'admin' ? 'bg-red-100 text-red-800' :
                        codeData.user_role === 'shs_student' || codeData.user_role === 'jhs_student' || codeData.user_role === 'college_student' ? 'bg-blue-100 text-blue-800' :
                        codeData.user_role === 'instructor' ? 'bg-green-100 text-green-800' :
                        codeData.user_role === 'developer' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {codeData.user_role.charAt(0).toUpperCase() + codeData.user_role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(codeData.used_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden p-4 space-y-4">
                {filteredCodes.map((codeData) => (
                  <div key={codeData.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <span className="font-mono font-bold text-lg bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {codeData.code}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(codeData.used_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                        {codeData.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{codeData.user_name}</div>
                        <div className="text-sm text-gray-600">{codeData.user_email}</div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        codeData.user_role === 'admin' ? 'bg-red-100 text-red-800' :
                        codeData.user_role === 'developer' ? 'bg-purple-100 text-purple-800' :
                        codeData.user_role === 'instructor' ? 'bg-blue-100 text-blue-800' :
                        codeData.user_role === 'scholar' ? 'bg-green-100 text-green-800' :
                        codeData.user_role === 'shs_student' || codeData.user_role === 'jhs_student' || codeData.user_role === 'college_student' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {codeData.user_role.charAt(0).toUpperCase() + codeData.user_role.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>

        {/* Results Count */}
        {!loadingUsedCodes && filteredCodes.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredCodes.length} of {usedCodes.length} used codes
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
