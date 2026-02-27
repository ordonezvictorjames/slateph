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
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [usedCodes, setUsedCodes] = useState<UsedCode[]>([])
  const [loadingUsedCodes, setLoadingUsedCodes] = useState(true)
  const [showUsedCodes, setShowUsedCodes] = useState(false)
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchUsedCodes()
  }, [])

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

  const generateCodes = async () => {
    if (!user?.id) {
      showError('Error', 'You must be logged in to generate codes')
      return
    }

    setGenerating(true)
    const newCodes: string[] = []
    
    try {
      // Generate multiple codes
      for (let i = 0; i < quantity; i++) {
        const { data, error } = await supabase.rpc('generate_registration_code', {
          p_created_by: user.id
        }) as { data: any, error: any }

        if (error) {
          console.error('Error generating code:', error)
          showError('Error', `Failed to generate code ${i + 1}`)
          continue
        }

        if (data && data.success) {
          newCodes.push(data.code)
        }
      }

      if (newCodes.length > 0) {
        setGeneratedCodes(newCodes)
        showSuccess('Codes Generated!', `Successfully generated ${newCodes.length} registration code(s)`)
        // Refresh used codes list in case any were just used
        fetchUsedCodes()
      } else {
        showError('Error', 'Failed to generate any codes')
      }
      
      setGenerating(false)
    } catch (err) {
      console.error('Error generating codes:', err)
      showError('Error', 'Failed to generate codes')
      setGenerating(false)
    }
  }

  const copyToClipboard = () => {
    if (generatedCodes.length > 0) {
      const codesText = generatedCodes.join('\n')
      navigator.clipboard.writeText(codesText)
      showSuccess('Copied!', `${generatedCodes.length} code(s) copied to clipboard`)
    }
  }

  const copyAllFormatted = () => {
    if (generatedCodes.length > 0) {
      const formatted = generatedCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')
      navigator.clipboard.writeText(formatted)
      showSuccess('Copied!', 'Formatted codes copied to clipboard')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Code Generator</h2>
        <p className="text-gray-600">
          Generate unique 6-character codes for new user registrations. These codes are required during the sign-up process.
        </p>
      </div>

      {/* Code Generator Card */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <label className="text-sm font-semibold text-gray-700">Number of codes:</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center border-2 border-black rounded-lg hover:bg-gray-100 transition-colors"
                disabled={generating}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 h-10 text-center border-2 border-black rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-black"
                disabled={generating}
              />
              <button
                onClick={() => setQuantity(Math.min(50, quantity + 1))}
                className="w-10 h-10 flex items-center justify-center border-2 border-black rounded-lg hover:bg-gray-100 transition-colors"
                disabled={generating}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setQuantity(10)}
                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                disabled={generating}
              >
                10
              </button>
              <button
                onClick={() => setQuantity(25)}
                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                disabled={generating}
              >
                25
              </button>
            </div>
          </div>

          {/* Generated Codes Display */}
          {generatedCodes.length > 0 && (
            <div className="bg-gray-50 border-2 border-black rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold">
                  Generated Codes ({generatedCodes.length})
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={copyToClipboard}
                    className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1 h-auto"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy All
                  </Button>
                  <Button
                    onClick={copyAllFormatted}
                    className="bg-black hover:bg-gray-800 text-white text-xs px-3 py-1 h-auto"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Copy Formatted
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
                {generatedCodes.map((code, index) => (
                  <div
                    key={index}
                    className="bg-white border-2 border-black rounded-lg p-3 text-center"
                  >
                    <div className="text-xs text-gray-500 mb-1">#{index + 1}</div>
                    <div className="text-lg font-bold font-mono">{code}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="text-center">
            <Button
              onClick={generateCodes}
              disabled={generating}
              className="bg-black hover:bg-gray-800 text-white px-12 py-6 text-lg rounded-full"
            >
              {generating ? (
                <div className="flex items-center gap-3">
                  <ButtonLoading />
                  <span>Generating {quantity} code(s)...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Generate {quantity} Code{quantity > 1 ? 's' : ''}</span>
                </div>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to use registration codes
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">1.</span>
                <span>Click "Generate New Code" to create a unique 6-character registration code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">2.</span>
                <span>Share the code with the new user who wants to register</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">3.</span>
                <span>The user will enter this code during the sign-up process</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">4.</span>
                <span>Each code can be used once to create a new account</span>
              </li>
            </ul>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">6</p>
              <p className="text-xs text-gray-600 uppercase tracking-wide">Characters</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">A-Z, 0-9</p>
              <p className="text-xs text-gray-600 uppercase tracking-wide">Format</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">Unique</p>
              <p className="text-xs text-gray-600 uppercase tracking-wide">Each Code</p>
            </div>
          </div>
        </div>
      </div>

      {/* Used Codes Section */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setShowUsedCodes(!showUsedCodes)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-900">Used Registration Codes</h3>
              <p className="text-sm text-gray-600">View codes that have been used for registration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
              {usedCodes.length} used
            </span>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${showUsedCodes ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showUsedCodes && (
          <div className="border-t border-gray-200">
            {loadingUsedCodes ? (
              <div className="p-8 text-center">
                <Loading size="md" />
                <p className="mt-4 text-gray-600">Loading used codes...</p>
              </div>
            ) : usedCodes.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-600 font-medium">No codes have been used yet</p>
                <p className="text-sm text-gray-500 mt-1">Used codes will appear here once users register</p>
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
                      {usedCodes.map((codeData) => (
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
                              codeData.user_role === 'trainee' ? 'bg-blue-100 text-blue-800' :
                              codeData.user_role === 'trainee' ? 'bg-green-100 text-green-800' :
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
                  {usedCodes.map((codeData) => (
                    <div key={codeData.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono font-bold text-xl">{codeData.code}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          codeData.user_role === 'admin' ? 'bg-red-100 text-red-800' :
                          codeData.user_role === 'trainee' ? 'bg-blue-100 text-blue-800' :
                          codeData.user_role === 'trainee' ? 'bg-green-100 text-green-800' :
                          codeData.user_role === 'developer' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {codeData.user_role.charAt(0).toUpperCase() + codeData.user_role.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                          {codeData.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{codeData.user_name}</div>
                          <div className="text-sm text-gray-600">{codeData.user_email}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                        Used: {new Date(codeData.used_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
