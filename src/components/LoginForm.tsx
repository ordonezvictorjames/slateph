'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ButtonLoading } from '@/components/ui/loading'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  
  // Sign up form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Password validation checks
  const passwordChecks = {
    hasUpperCase: /[A-Z]/.test(signUpPassword),
    hasLowerCase: /[a-z]/.test(signUpPassword),
    hasNumber: /[0-9]/.test(signUpPassword),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signUpPassword),
    isLongEnough: signUpPassword.length >= 8
  }
  
  const { signIn } = useAuth()
  const { showSuccess, showError, showInfo } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Handle sign in
      await signIn(email, password)
      // Clear fields after successful login
      setEmail('')
      setPassword('')
      showSuccess('Welcome back!', 'Logging you in...')
      setLoading(false) // Clear loading state immediately
    } catch (err) {
      console.error('Authentication error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      showError('Login Failed', errorMessage)
      setLoading(false) // Only set loading to false on error
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if terms are accepted
      if (!acceptedTerms) {
        showError('Terms Required', 'You must accept the Privacy Statement and Terms and Conditions to sign up')
        setLoading(false)
        return
      }

      // Validate code length
      if (code.length !== 6) {
        showError('Invalid Code', 'Code must be exactly 6 characters')
        setLoading(false)
        return
      }

      const supabase = (await import('@/lib/supabase/client')).createClient()

      // Validate registration code
      const { data: codeValidation, error: codeError } = await supabase.rpc('validate_registration_code', {
        p_code: code
      }) as { data: any, error: any }

      if (codeError) {
        console.error('Code validation error:', codeError)
        showError('Invalid Code', codeError.message || 'Failed to validate code')
        setLoading(false)
        return
      }

      if (!codeValidation || !codeValidation.success) {
        showError('Invalid Code', codeValidation?.message || 'Invalid or expired registration code')
        setLoading(false)
        return
      }

      // Validate password strength
      const hasUpperCase = /[A-Z]/.test(signUpPassword)
      const hasLowerCase = /[a-z]/.test(signUpPassword)
      const hasNumber = /[0-9]/.test(signUpPassword)
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signUpPassword)
      const isLongEnough = signUpPassword.length >= 8

      if (!hasUpperCase) {
        showError('Weak Password', 'Password must contain at least 1 uppercase letter')
        setLoading(false)
        return
      }

      if (!hasLowerCase) {
        showError('Weak Password', 'Password must contain at least 1 lowercase letter')
        setLoading(false)
        return
      }

      if (!hasNumber) {
        showError('Weak Password', 'Password must contain at least 1 number')
        setLoading(false)
        return
      }

      if (!hasSpecialChar) {
        showError('Weak Password', 'Password must contain at least 1 special character (!@#$%^&*...)')
        setLoading(false)
        return
      }

      if (!isLongEnough) {
        showError('Weak Password', 'Password must be at least 8 characters long')
        setLoading(false)
        return
      }
      
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', signUpEmail)
        .single()

      if (existingUser) {
        showError('Email Already Exists', 'An account with this email already exists')
        setLoading(false)
        return
      }

      // Determine role - set as student for new accounts
      const role = 'student'

      // Create user account
      const { data, error } = await supabase.rpc('create_user_account', {
        p_email: signUpEmail,
        p_first_name: firstName,
        p_last_name: lastName,
        p_password: signUpPassword,
        p_role: role
      }) as { data: any, error: any }

      if (error) {
        console.error('Sign up error:', error)
        showError('Sign Up Failed', error.message || 'Failed to create account')
        setLoading(false)
        return
      }

      if (!data || !data.success) {
        showError('Sign Up Failed', data?.message || 'Failed to create account')
        setLoading(false)
        return
      }

      // Mark code as used
      await supabase.rpc('mark_code_as_used', {
        p_code: code,
        p_user_id: data.user.id
      })

      // Success! Clear form and show success message
      showSuccess('Account Created!', 'You can now sign in with your credentials')
      
      // Reset form and switch to sign in
      setFirstName('')
      setLastName('')
      setSignUpEmail('')
      setSignUpPassword('')
      setCode('')
      setAcceptedTerms(false)
      setIsSignUp(false)
      setLoading(false)
    } catch (err) {
      console.error('Sign up error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
      showError('Sign Up Failed', errorMessage)
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordLoading(true)

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()

      // Call the RPC function to handle password reset request
      const { data, error } = await supabase.rpc('request_password_reset', {
        p_email: forgotPasswordEmail
      })

      if (error) {
        console.error('Password reset error:', error)
        showError('Error', 'Failed to process password reset request')
        setForgotPasswordLoading(false)
        return
      }

      if (!data.success) {
        showError('Error', data.message || 'Failed to process password reset request')
        setForgotPasswordLoading(false)
        return
      }

      showSuccess('Request Sent', 'Your password reset request has been sent to the administrators')
      setShowForgotPasswordModal(false)
      setForgotPasswordEmail('')
      setForgotPasswordLoading(false)
    } catch (err) {
      console.error('Forgot password error:', err)
      showError('Error', 'Failed to process password reset request')
      setForgotPasswordLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl min-h-[600px] lg:h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Fixed Background Image - Left Side (shown during Sign Up) - Hidden on mobile/tablet */}
        <div 
          className="hidden lg:block absolute top-0 left-0 h-full w-1/2 z-0"
          style={{
            backgroundImage: 'url(/log_in.jpg)',
            backgroundSize: '200% 100%',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Fixed Background Image - Right Side (shown during Sign In) - Hidden on mobile/tablet */}
        <div 
          className="hidden lg:block absolute top-0 right-0 h-full w-1/2 z-0"
          style={{
            backgroundImage: 'url(/log_in.jpg)',
            backgroundSize: '200% 100%',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Sliding Welcome Card - Hidden on mobile/tablet, shown on laptop+ */}
        <div 
          className={`hidden lg:flex absolute top-0 h-full w-1/2 transition-all duration-700 ease-in-out z-10 items-center justify-center ${
            isSignUp ? 'left-0' : 'left-1/2'
          }`}
        >
          <div className="relative text-center text-white px-12 z-10">
            {!isSignUp ? (
              <>
                <h2 className="text-4xl font-bold mb-4">Hello, Friend!</h2>
                <p className="mb-8 text-white/90">Enter your personal details and start your journey with us</p>
                <button
                  onClick={() => setIsSignUp(true)}
                  className="border-2 border-white text-white px-12 py-3 rounded-full font-semibold hover:bg-white hover:text-gray-800 transition-all duration-300 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                >
                  SIGN UP
                </button>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold mb-4">Welcome Back!</h2>
                <p className="mb-8 text-white/90">To keep connected with us please login with your personal info</p>
                <button
                  onClick={() => setIsSignUp(false)}
                  className="border-2 border-white text-white px-12 py-3 rounded-full font-semibold hover:bg-white hover:text-gray-800 transition-all duration-300 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                >
                  SIGN IN
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sign In Form */}
        <div 
          className={`absolute top-0 left-0 h-full w-full lg:w-1/2 flex items-center justify-center bg-white transition-all duration-700 ease-in-out z-5 ${
            isSignUp ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="w-full max-w-sm px-6 sm:px-8 py-8">
            {/* Logo */}
            <div className="flex items-center justify-center mb-6 sm:mb-8">
              <img src="/logo.png" alt="Slate Logo" className="h-12 sm:h-14 lg:h-16 w-auto" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-black text-center mb-6 sm:mb-8">Sign in to Slate</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-2 font-medium text-black" style={{ fontSize: '10px' }}>
                  EMAIL
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-2 border-black rounded-xl focus:border-black focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 w-full px-4 text-black"
                  required
                />
              </div>
              
              {/* Password Field */}
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-2 font-medium text-black" style={{ fontSize: '10px' }}>
                  PASSWORD
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-2 border-black rounded-xl focus:border-black focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 w-full px-4 text-black"
                  required
                />
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-sm text-gray-600 hover:text-black hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold rounded-full transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <ButtonLoading />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'SIGN IN'
                )}
              </Button>

              {/* Privacy and Terms Links */}
              <div className="text-center text-xs text-gray-600 mt-4">
                <button 
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="hover:text-black hover:underline transition-colors"
                >
                  Privacy Statement & Terms and Conditions
                </button>
              </div>
            </form>

            {/* Mobile/Tablet Toggle Button */}
            <div className="lg:hidden mt-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Don't have an account?</p>
              <button
                onClick={() => setIsSignUp(true)}
                className="text-black font-semibold hover:underline focus:outline-none"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {/* Sign Up Form */}
        <div 
          className={`absolute top-0 right-0 h-full w-full lg:w-1/2 flex items-center justify-center bg-white transition-all duration-700 ease-in-out z-5 ${
            isSignUp ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-full max-w-sm px-6 sm:px-8 py-4 overflow-y-auto max-h-full">
            <h2 className="text-xl sm:text-2xl font-bold text-black text-center mb-3 sm:mb-4">Create Account</h2>

            <form onSubmit={handleSignUp} className="space-y-2 sm:space-y-3">
              {/* First Name */}
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-2 font-medium text-black" style={{ fontSize: '10px' }}>
                  FIRST NAME
                </label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 border-2 border-black rounded-xl focus:border-black focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 w-full px-4 text-black"
                  required
                />
              </div>

              {/* Last Name */}
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-2 font-medium text-black" style={{ fontSize: '10px' }}>
                  LAST NAME
                </label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 border-2 border-black rounded-xl focus:border-black focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 w-full px-4 text-black"
                  required
                />
              </div>

              {/* Email */}
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-2 font-medium text-black" style={{ fontSize: '10px' }}>
                  EMAIL
                </label>
                <Input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="h-12 border-2 border-black rounded-xl focus:border-black focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 w-full px-4 text-black"
                  required
                />
              </div>
              
              {/* Password */}
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-2 font-medium text-black" style={{ fontSize: '10px' }}>
                  PASSWORD
                </label>
                <Input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  onFocus={() => setShowPasswordRequirements(true)}
                  onBlur={() => setShowPasswordRequirements(false)}
                  className="h-12 border-2 border-black rounded-xl focus:border-black focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 w-full px-4 text-black"
                  required
                />
                {/* Password Requirements */}
                {showPasswordRequirements && signUpPassword.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-black rounded-lg p-3 shadow-lg z-20">
                    <p className="text-xs font-semibold text-black mb-2">Password must contain:</p>
                    <div className="space-y-1">
                      <div className={`text-xs flex items-center gap-2 ${passwordChecks.isLongEnough ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{passwordChecks.isLongEnough ? '✓' : '○'}</span>
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${passwordChecks.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{passwordChecks.hasUpperCase ? '✓' : '○'}</span>
                        <span>1 uppercase letter (A-Z)</span>
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${passwordChecks.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{passwordChecks.hasLowerCase ? '✓' : '○'}</span>
                        <span>1 lowercase letter (a-z)</span>
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${passwordChecks.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{passwordChecks.hasNumber ? '✓' : '○'}</span>
                        <span>1 number (0-9)</span>
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${passwordChecks.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{passwordChecks.hasSpecialChar ? '✓' : '○'}</span>
                        <span>1 special character (!@#$%...)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Code - 6 separate boxes */}
              <div className="relative">
                <div className="font-medium text-black mb-2 ml-3" style={{ fontSize: '10px' }}>CODE</div>
                <div className="flex gap-1 sm:gap-2 justify-center">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      value={code[index] || ''}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase()
                        if (value.match(/^[A-Z0-9]?$/)) {
                          const newCode = code.split('')
                          newCode[index] = value
                          setCode(newCode.join(''))
                          
                          // Auto-focus next input
                          if (value && index < 5) {
                            const target = e.target as HTMLInputElement
                            const nextInput = target.parentElement?.children[index + 1] as HTMLInputElement
                            nextInput?.focus()
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        // Handle backspace
                        if (e.key === 'Backspace' && !code[index] && index > 0) {
                          const target = e.target as HTMLInputElement
                          const prevInput = target.parentElement?.children[index - 1] as HTMLInputElement
                          prevInput?.focus()
                        }
                      }}
                      className="w-7 sm:w-8 lg:w-10 h-8 sm:h-9 lg:h-10 text-center text-base sm:text-lg font-semibold border-2 border-black rounded-xl focus:border-black focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors uppercase overflow-hidden"
                      required
                    />
                  ))}
                </div>
              </div>

              {/* Privacy and Terms Checkbox */}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-black text-black focus:ring-2 focus:ring-black cursor-pointer flex-shrink-0"
                  required
                />
                <label htmlFor="acceptTerms" className="text-xs text-gray-700 cursor-pointer text-justify">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-black font-semibold hover:underline"
                  >
                    Privacy Statement and Terms and Conditions
                  </button>
                </label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold rounded-full transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={loading || !acceptedTerms}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <ButtonLoading />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  'SIGN UP'
                )}
              </Button>
            </form>

            {/* Mobile/Tablet Toggle Button */}
            <div className="lg:hidden mt-3 sm:mt-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Already have an account?</p>
              <button
                onClick={() => setIsSignUp(false)}
                className="text-black font-semibold hover:underline focus:outline-none"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-center w-full">
        <p className="text-xs text-gray-400">© 2026 Slate. All rights reserved.</p>
      </div>

      {/* Privacy and Terms Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Privacy & Terms</h2>
                  <p className="text-sm text-gray-500 mt-1">Please read our privacy statement and terms carefully</p>
                </div>
                <button 
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Privacy Statement Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Privacy Statement</h3>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                    <p>
                      Slate Learning Management System is committed to protecting your personal information and upholding your privacy. All data processing activities within the Slate LMS adhere to the guiding principles of legitimate purpose, transparency, and proportionality as prescribed in the Data Privacy Act of 2012 (R.A. 10173), its Implementing Rules and Regulations (IRR), and other issuances of the National Privacy Commission (NPC).
                    </p>
                    <p className="font-semibold text-gray-900 mt-4">What We Collect:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Personal identification information</li>
                      <li>Academic records and progress</li>
                      <li>Course enrollment data</li>
                      <li>System usage information</li>
                    </ul>
                    <p className="font-semibold text-gray-900 mt-4">How We Use Your Data:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>To provide educational services</li>
                      <li>To track academic progress</li>
                      <li>To improve system functionality</li>
                      <li>To communicate important updates</li>
                    </ul>
                    <p className="mt-4">
                      Your data is stored securely and will never be shared with third parties without your explicit consent, except as required by law.
                    </p>
                  </div>
                </div>

                {/* Terms and Conditions Card */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Terms and Conditions</h3>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                    <p>
                      Your access to and use of the Slate Learning Management System is conditioned on your acceptance of and compliance with these Terms and Conditions. These terms serve as the entire agreement between you and Slate LMS in relation to your access to and use of the system. These Terms and Conditions apply to all visitors, registrants, and authorized users of Slate LMS.
                    </p>
                    <p className="font-semibold text-gray-900 mt-4">User Responsibilities:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Maintain confidentiality of your account</li>
                      <li>Use the system for educational purposes only</li>
                      <li>Respect intellectual property rights</li>
                      <li>Follow academic integrity policies</li>
                    </ul>
                    <p className="font-semibold text-gray-900 mt-4">Prohibited Activities:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Sharing account credentials</li>
                      <li>Attempting unauthorized access</li>
                      <li>Uploading malicious content</li>
                      <li>Harassing other users</li>
                    </ul>
                    <p className="mt-4">
                      Violation of these terms may result in suspension or termination of your account. By using Slate LMS, you agree to abide by all terms and conditions outlined herein.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-medium"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Forgot Password</h3>
              <button
                onClick={() => {
                  setShowForgotPasswordModal(false)
                  setForgotPasswordEmail('')
                }}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                Enter your email address and we'll notify the administrators to send you a new password.
              </p>

              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-2 font-medium text-black text-xs">
                  EMAIL ADDRESS
                </label>
                <Input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="h-12 border-2 border-black rounded-xl focus:border-black focus:ring-0 focus:outline-none w-full px-4"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPasswordModal(false)
                    setForgotPasswordEmail('')
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {forgotPasswordLoading ? (
                    <>
                      <ButtonLoading />
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Send Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}