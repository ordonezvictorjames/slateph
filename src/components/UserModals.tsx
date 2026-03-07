'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { ButtonLoading } from '@/components/ui/loading'

export interface NewUser {
  first_name: string
  last_name: string
  email: string
  password: string
  role: 'admin' | 'developer' | 'instructor' | 'student'
  status: 'active' | 'inactive' | 'pending'
  bio: string
  avatar_url: string | null
  strand: string | null
  section: string | null
  grade: number | null
  batch_number: number | null
}

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  user: NewUser
  onInputChange: (field: keyof NewUser, value: string | number | null) => void
  submitting: boolean
  selectedAvatar: string
  onAvatarSelect: (id: string) => void
  isEditMode?: boolean
}

const animalAvatars = [
  { id: 'cat', name: 'Cat', emoji: '🐱' },
  { id: 'dog', name: 'Dog', emoji: '🐶' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰' },
  { id: 'fox', name: 'Fox', emoji: '🦊' },
  { id: 'bear', name: 'Bear', emoji: '🐻' },
  { id: 'panda', name: 'Panda', emoji: '🐼' },
  { id: 'koala', name: 'Koala', emoji: '🐨' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯' },
  { id: 'lion', name: 'Lion', emoji: '🦁' },
  { id: 'monkey', name: 'Monkey', emoji: '🐵' },
  { id: 'pig', name: 'Pig', emoji: '🐷' },
  { id: 'frog', name: 'Frog', emoji: '🐸' },
]

const scientistSections = [
  'Einstein',
  'Newton',
  'Curie',
  'Darwin',
  'Tesla',
  'Galileo',
  'Hawking',
  'Pasteur',
  'Edison',
  'Franklin'
]

export function UserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  onInputChange,
  submitting,
  selectedAvatar,
  onAvatarSelect,
  isEditMode = false
}: UserModalProps) {
  const { showError } = useToast()
  const [currentIndex, setCurrentIndex] = useState(0)
  const totalAvatars = animalAvatars.length

  const nextAvatar = () => {
    const newIndex = (currentIndex + 1) % totalAvatars
    setCurrentIndex(newIndex)
    onAvatarSelect(animalAvatars[newIndex].id)
  }

  const prevAvatar = () => {
    const newIndex = (currentIndex - 1 + totalAvatars) % totalAvatars
    setCurrentIndex(newIndex)
    onAvatarSelect(animalAvatars[newIndex].id)
  }

  const currentAvatar = animalAvatars[currentIndex]

  // Check if form is valid
  const isFormValid = true

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ maxWidth: '95vw' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit User' : 'Add New User'}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-6">
            {/* Avatar Selection - Top Center */}
            <div className="flex justify-center">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={prevAvatar}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-all flex items-center justify-center text-gray-700 hover:text-indigo-600 border border-gray-300 hover:border-indigo-400 hover:scale-110"
                  aria-label="Previous avatar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-400 shadow-lg flex items-center justify-center text-7xl transition-all hover:scale-105">
                    {currentAvatar.emoji}
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-2">{currentAvatar.name}</p>
                  <p className="text-xs text-gray-500">{currentIndex + 1} of {totalAvatars}</p>
                </div>

                <button
                  type="button"
                  onClick={nextAvatar}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-all flex items-center justify-center text-gray-700 hover:text-indigo-600 border border-gray-300 hover:border-indigo-400 hover:scale-110"
                  aria-label="Next avatar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {/* Personal Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Personal Info</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={user.first_name}
                      onChange={(e) => onInputChange('first_name', e.target.value)}
                      placeholder="John"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={user.last_name}
                      onChange={(e) => onInputChange('last_name', e.target.value)}
                      placeholder="Doe"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Account Details Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Account Details</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={user.email}
                      onChange={(e) => onInputChange('email', e.target.value)}
                      placeholder="john.doe@example.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={user.role}
                      onChange={(e) => onInputChange('role', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                      <option value="developer">Developer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Security Section - Always in third column */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Security</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isEditMode ? 'Password' : 'Default Password'}
                  </label>
                  {isEditMode ? (
                    <input
                      type="password"
                      value={user.password}
                      onChange={(e) => onInputChange('password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value="Slate2026!"
                        readOnly
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {!isEditMode && <p className="text-xs text-gray-500 mt-2">User can change after login</p>}
                  {isEditMode && <p className="text-xs text-gray-500 mt-2">Leave blank to keep current</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              {submitting && <ButtonLoading />}
              <span>{submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update User' : 'Create User')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
