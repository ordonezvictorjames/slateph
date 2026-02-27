// Utility functions for role handling

export function formatRoleName(role: string): string {
  const roleMap: Record<string, string> = {
    'admin': 'Admin',
    'instructor': 'Instructor',
    'trainee': 'Trainee',
    'developer': 'Developer'
  }
  
  return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1)
}

export function getRoleBadgeColor(role: string): string {
  const colorMap: Record<string, string> = {
    'admin': 'bg-purple-100 text-purple-800',
    'instructor': 'bg-green-100 text-green-800',
    'trainee': 'bg-blue-100 text-blue-800',
    'developer': 'bg-orange-100 text-orange-800'
  }
  
  return colorMap[role] || 'bg-gray-100 text-gray-800'
}
