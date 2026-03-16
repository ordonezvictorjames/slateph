// Database types
export type AccountTier = 'visitor' | 'beginner' | 'intermediate' | 'expert' | 'vip'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  role: 'admin' | 'developer' | 'guest' | 'instructor' | 'scholar' | 'shs_student' | 'jhs_student' | 'college_student'
  email: string
  avatar_url?: string
  banner_url?: string
  spotify_url?: string
  account_tier?: AccountTier
  account_duration_days?: number | null
  account_expires_at?: string | null
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
  role: 'admin' | 'developer' | 'guest' | 'instructor' | 'scholar' | 'shs_student' | 'jhs_student' | 'college_student'
  profile: Profile
}
