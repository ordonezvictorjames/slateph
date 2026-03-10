'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import UserSessionsModal from '@/components/UserSessionsModal'

interface SessionManagementProps {
  // For viewing users' sessions (admin/developer only)
  targetUserId: string
  targetUserName: string
}

export default function SessionManagement({ 
  targetUserId, 
  targetUserName
}: SessionManagementProps) {
  const { user } = useAuth()
  const [showSessionsModal, setShowSessionsModal] = useState(false)

  // ONLY Admin and Developer can view user sessions
  const canViewSessions = user?.role === 'admin' || user?.role === 'developer'

  const openUserSessionsModal = () => {
    if (!canViewSessions) {
      alert('Access denied: Only Admin and Developer roles can view user sessions')
      return
    }
    
    setShowSessionsModal(true)
  }

  // Don't render anything if user doesn't have permission
  if (!canViewSessions) {
    return null
  }

  return (
    <>
      {/* View User Sessions - Admin/Developer ONLY */}
      <button
        onClick={openUserSessionsModal}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        title="View user sessions (Admin/Developer only)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Sessions
      </button>

      {/* Sessions Modal */}
      {showSessionsModal && (
        <UserSessionsModal
          userId={targetUserId}
          userName={targetUserName}
          onClose={() => setShowSessionsModal(false)}
        />
      )}
    </>
  )
}

// Usage Examples:

// 1. In User Profile (ALL USERS can see their own):
// <SessionManagement showMySessionsButton={true} />

// 2. In User Management Table (ADMIN/DEVELOPER can see others):
// <SessionManagement 
//   targetUserId={user.id} 
//   targetUserName={user.name} 
// />

// 3. In Settings Page (ALL USERS for own sessions):
// <SessionManagement 
//   targetUserId={currentUser.id} 
//   targetUserName={currentUser.name} 
// />