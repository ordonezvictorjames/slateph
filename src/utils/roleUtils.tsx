// Utility functions for user role badges
// Provides consistent styling across all pages

export type UserRole = 'admin' | 'developer' | 'guest' | 'instructor' | 'scholar' | 'shs_student' | 'jhs_student' | 'college_student'

export const getRoleColor = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-800'
    case 'instructor':
      return 'bg-green-100 text-green-800'
    case 'scholar':
      return 'bg-amber-100 text-amber-800'
    case 'shs_student':
      return 'bg-blue-100 text-blue-800'
    case 'jhs_student':
      return 'bg-cyan-100 text-cyan-800'
    case 'college_student':
      return 'bg-indigo-100 text-indigo-800'
    case 'guest':
      return 'bg-gray-100 text-gray-800'
    case 'developer':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'instructor':
      return 'Instructor'
    case 'scholar':
      return 'TESDA Scholar'
    case 'shs_student':
      return 'SHS Student'
    case 'jhs_student':
      return 'JHS Student'
    case 'college_student':
      return 'College Student'
    case 'guest':
      return 'Guest'
    case 'developer':
      return 'Developer'
    default:
      return role.charAt(0).toUpperCase() + role.slice(1)
  }
}

interface RoleBadgeProps {
  role: string
  className?: string
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '' }) => {
  return (
    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(role)} ${className}`}>
      {getRoleLabel(role)}
    </span>
  )
}
