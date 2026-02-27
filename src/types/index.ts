// Database types
export interface Profile {
  id: string
  first_name: string
  last_name: string
  role: 'admin' | 'instructor' | 'trainee' | 'developer'
  email: string
  avatar_url?: string
  banner_url?: string
  spotify_url?: string
  strand?: string
  section?: string
  grade?: number
  status?: string
  theme_sidebar_bg?: string
  theme_sidebar_text?: string
  theme_primary_color?: string
  theme_button_color?: string
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  description: string
  instructor_id: string
  course_code: string
  course_type: 'academic' | 'tesda' | 'upskill'
  semester: string
  year: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  course_id: string
  title: string
  description: string
  assignment_type: 'essay' | 'quiz' | 'project' | 'file_upload'
  due_date: string
  max_points: number
  allow_late_submission: boolean
  late_penalty_percent: number
  instructions: string
  created_at: string
  updated_at: string
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'instructor' | 'trainee' | 'developer'
  profile: Profile
}
