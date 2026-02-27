import { createClient } from '@/lib/supabase/client'

export type ActivityType = 
  | 'login' 
  | 'logout' 
  | 'user_created' 
  | 'user_updated' 
  | 'user_deleted'
  | 'course_created' 
  | 'course_updated' 
  | 'course_deleted'
  | 'subject_created' 
  | 'subject_updated' 
  | 'subject_deleted'
  | 'module_created' 
  | 'module_updated' 
  | 'module_deleted'
  | 'enrollment_created' 
  | 'enrollment_updated' 
  | 'enrollment_deleted'
  | 'schedule_created' 
  | 'schedule_updated' 
  | 'schedule_deleted'

interface LogActivityParams {
  userId: string
  activityType: ActivityType
  description: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function logActivity({
  userId,
  activityType,
  description,
  metadata = {},
  ipAddress,
  userAgent
}: LogActivityParams): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        activity_type: activityType,
        description,
        metadata,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error logging activity:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Error logging activity:', error)
    return null
  }
}

// Helper functions for common activities
export async function logLogin(userId: string, userEmail: string, metadata?: Record<string, any>) {
  return logActivity({
    userId,
    activityType: 'login',
    description: `User logged in: ${userEmail}`,
    metadata: {
      email: userEmail,
      ...metadata
    },
    ipAddress: await getClientIP(),
    userAgent: navigator.userAgent
  })
}

export async function logLogout(userId: string, userEmail: string, metadata?: Record<string, any>) {
  return logActivity({
    userId,
    activityType: 'logout',
    description: `User logged out: ${userEmail}`,
    metadata: {
      email: userEmail,
      ...metadata
    },
    ipAddress: await getClientIP(),
    userAgent: navigator.userAgent
  })
}

export async function logUserCreation(
  creatorId: string, 
  newUserId: string, 
  newUserEmail: string, 
  newUserName: string,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId: creatorId,
    activityType: 'user_created',
    description: `Created new user: ${newUserName} (${newUserEmail})`,
    metadata: {
      new_user_id: newUserId,
      new_user_email: newUserEmail,
      new_user_name: newUserName,
      ...metadata
    }
  })
}

export async function logCourseCreation(
  instructorId: string, 
  courseId: string, 
  courseTitle: string,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId: instructorId,
    activityType: 'course_created',
    description: `Created new course: ${courseTitle}`,
    metadata: {
      course_id: courseId,
      course_title: courseTitle,
      ...metadata
    }
  })
}

export async function logEnrollment(
  userId: string, 
  subjectTitle: string, 
  courseTitle: string,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId,
    activityType: 'enrollment_created',
    description: `Enrolled in: ${subjectTitle} (${courseTitle})`,
    metadata: {
      subject_title: subjectTitle,
      course_title: courseTitle,
      ...metadata
    }
  })
}

// Helper function to get client IP (simplified version)
async function getClientIP(): Promise<string | undefined> {
  try {
    // In a real application, you might want to use a service to get the client IP
    // For now, we'll return undefined and let the server handle it
    return undefined
  } catch (error) {
    return undefined
  }
}

// Function to get recent activities for dashboard
export async function getRecentActivities(limit: number = 10) {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:profiles(
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent activities:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return []
  }
}