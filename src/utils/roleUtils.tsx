// Utility functions for user role badges
// Provides consistent styling across all pages

export type UserRole = 'admin' | 'developer' | 'guest' | 'instructor' | 'scholar' | 'shs_student' | 'jhs_student' | 'college_student'

export const getRoleColor = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'bg-primary-700 text-white'
    case 'instructor':
      return 'bg-primary-700 text-white'
    case 'scholar':
      return 'bg-primary-700 text-white'
    case 'shs_student':
      return 'bg-primary-700 text-white'
    case 'jhs_student':
      return 'bg-primary-700 text-white'
    case 'college_student':
      return 'bg-primary-700 text-white'
    case 'guest':
      return 'bg-primary-700 text-white'
    case 'developer':
      return 'bg-primary-700 text-white'
    default:
      return 'bg-primary-700 text-white'
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
