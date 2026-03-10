// Session Management Permissions by Role

import { useAuth } from '@/contexts/AuthContext'
import UserSessionsModal from '@/components/UserSessionsModal'

export default function SessionManagementExample() {
  const { user } = useAuth()

  // Check if user can view other users' sessions
  const canViewOtherSessions = user?.role === 'admin' || user?.role === 'developer'

  return (
    <div>
      {/* EVERY USER: Can view their own sessions */}
      <div className="my-sessions-section">
        <h3>My Sessions</h3>
        <button onClick={() => openMySessionsModal()}>
          🔒 View My Sessions
        </button>
        <p>Manage your active devices and sessions</p>
      </div>

      {/* ADMIN & DEVELOPER ONLY: Can view other users' sessions */}
      {canViewOtherSessions && (
        <div className="admin-sessions-section">
          <h3>User Session Management</h3>
          <div className="user-list">
            {users.map(user => (
              <div key={user.id} className="user-card">
                <span>{user.name}</span>
                <button onClick={() => openUserSessionsModal(user.id, user.name)}>
                  👁️ View Sessions
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Usage Examples by Role:

// 👤 STUDENT/SCHOLAR/INSTRUCTOR/GUEST:
// - "My Sessions" button in profile/settings
// - Can only see and manage their own sessions

// 👨‍💻 DEVELOPER:
// - "My Sessions" button (own sessions)
// - "User Sessions" section in admin area (all users)
// - Can view and manage any user's sessions

// 👑 ADMIN:
// - "My Sessions" button (own sessions)  
// - "User Sessions" section in admin area (all users)
// - Can view and manage any user's sessions