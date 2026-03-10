// Example: How to integrate UserSessionsModal into User Management

import { useState } from 'react'
import UserSessionsModal from '@/components/UserSessionsModal'

export default function UserManagementPage() {
  const [selectedUser, setSelectedUser] = useState<{id: string, name: string} | null>(null)
  const [showSessionsModal, setShowSessionsModal] = useState(false)

  const handleViewSessions = (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName })
    setShowSessionsModal(true)
  }

  return (
    <div>
      {/* User table/cards */}
      <div className="user-list">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <h3>{user.first_name} {user.last_name}</h3>
              <p>{user.email}</p>
            </div>
            <div className="user-actions">
              <button onClick={() => handleViewSessions(user.id, `${user.first_name} ${user.last_name}`)}>
                🔒 View Sessions
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions Modal */}
      {showSessionsModal && selectedUser && (
        <UserSessionsModal
          userId={selectedUser.id}
          userName={selectedUser.name}
          onClose={() => {
            setShowSessionsModal(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}