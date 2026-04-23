'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { logCourseCreation, logActivity } from '@/lib/activityLogger'
import { useToast } from '@/contexts/ToastContext'
import { Loading, ButtonLoading } from '@/components/ui/loading'
import LessonViewer from '@/components/LessonViewer'
import QuizBuilder, { QuizConfig, emptyQuizConfig } from '@/components/QuizBuilder'
import { compressImage, validatePDFSize, validatePresentationSize } from '@/lib/imageCompression'
interface Course {
  id: string
  title: string
  description: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  created_at: string
  subjects?: Subject[]
  thumbnail_url?: string
}

interface Subject {
  id: string
  course_id: string
  title: string
  description: string
  instructor_id?: string
  trainee_name?: string
  trainee?: {
    first_name: string
    last_name: string
  }
  order_index: number
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  online_class_link?: string
  created_at: string
  modules?: CourseModule[]
  enrollment_count?: number
  thumbnail_url?: string
}

interface CourseModule {
  id: string
  subject_id: string
  title: string
  description: string
  content_type: 'video' | 'text' | 'canva_presentation' | 'online_conference' | 'online_document' | 'pdf_document' | 'slide_presentation'
  order_index: number
  status?: 'active' | 'inactive' | 'draft'
  duration_minutes?: number
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
  created_at: string
  thumbnail_url?: string
  explanation?: string
  key_takeaways?: string
  quiz_activity?: string
  notes_content?: string
}

interface NewCourse {
  title: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  thumbnail_url?: string
}

interface NewSubject {
  title: string
  description: string
  instructor_id?: string
  order_index: number
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  online_class_link?: string
  thumbnail_url?: string
}

interface NewCourseModule {
  title: string
  description: string
  content_type: 'video' | 'text' | 'canva_presentation' | 'online_conference' | 'online_document' | 'pdf_document' | 'slide_presentation'
  status: 'active' | 'inactive' | 'draft'
  duration_minutes?: number
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
  thumbnail_url?: string
  // Lesson viewer sections
  explanation?: string
  key_takeaways?: string
  quiz_activity?: string
  notes_content?: string
  quiz_config?: QuizConfig | null
}

export default function CourseManagementPage({ initialCourseId }: { initialCourseId?: string }) {
  const { user } = useAuth()
  
  // Permission check: Only admins and developers can access this page
  const userRole = user?.profile?.role
  const hasPermission = userRole === 'admin' || userRole === 'developer'
  
  const [currentView, setCurrentView] = useState<'courses' | 'subjects' | 'modules' | 'lesson'>('courses')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null)
  const [courseFilter, setCourseFilter] = useState<'all' | 'active' | 'inactive' | 'draft'>('all')
  const [courseSearch, setCourseSearch] = useState('')
  const [showCourseSearch, setShowCourseSearch] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null)
  
  // Data states
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [modules, setModules] = useState<CourseModule[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [newResourceTitle, setNewResourceTitle] = useState('')
  const [newResourceUrl, setNewResourceUrl] = useState('')
  const [newResourceDescription, setNewResourceDescription] = useState('')
  const [uploadingResource, setUploadingResource] = useState(false)
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  
  // Early return if user doesn't have permission
  if (!hasPermission) {
    return (
      <div className="p-8">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-gray-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Course Management.</p>
          <p className="text-sm text-gray-500 mt-2">Only administrators and developers can manage courses.</p>
        </div>
      </div>
    )
  }
  const [trainees, settrainees] = useState<Array<{id: string, first_name: string, last_name: string, email: string, role: string}>>([])
  const [instructors, setInstructors] = useState<Array<{id: string, first_name: string, last_name: string, email: string}>>([])
  const [enrolledtrainees, setEnrolledtrainees] = useState<Array<{id: string, first_name: string, last_name: string, email: string, enrollment_id: string, enrolled_at: string, status: string}>>([])
  const [courseEnrolledCount, setCourseEnrolledCount] = useState<number>(0)
  const [courseRankings, setCourseRankings] = useState<Array<{ user_id: string; first_name: string; last_name: string; total_score: number; quiz_count: number }>>([])
  const [loadingRankings, setLoadingRankings] = useState(false)
  const [courseInstructors, setCourseInstructors] = useState<Array<{id: string, first_name: string, last_name: string}>>([])
  const [availabletrainees, setAvailabletrainees] = useState<Array<{id: string, first_name: string, last_name: string, email: string, role: string}>>([])
  const [selectedtrainees, setSelectedtrainees] = useState<string[]>([])
  const [traineeRoleFilter, setTraineeRoleFilter] = useState<string>('all')
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<Course | null>(null)  
  // Modal states
  const [showAddCourseModal, setShowAddCourseModal] = useState(false)
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [showAddModuleModal, setShowAddModuleModal] = useState(false)
  const [showEditCourseModal, setShowEditCourseModal] = useState(false)
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false)
  const [showEditModuleModal, setShowEditModuleModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPresentationModal, setShowPresentationModal] = useState(false)
  const [showEnrolltraineesModal, setShowEnrolltraineesModal] = useState(false)
  const [currentPresentationModule, setCurrentPresentationModule] = useState<CourseModule | null>(null)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testModule, setTestModule] = useState<CourseModule | null>(null)
  const [testQuizConfig, setTestQuizConfig] = useState<QuizConfig | null>(null)
  const [savingTest, setSavingTest] = useState(false)
  
  // View mode state removed - card view only

  // Form states
  const [newCourse, setNewCourse] = useState<NewCourse>({
    title: '',
    course_type: 'academic',
    status: 'draft',
    enrollment_type: 'trainee',
    thumbnail_url: ''
  })
  
  const [newSubject, setNewSubject] = useState<NewSubject>({
    title: '',
    description: '',
    instructor_id: '',
    order_index: 1,
    status: 'draft',
    enrollment_type: 'trainee',
    thumbnail_url: ''
  })

  const [newModule, setNewModule] = useState<NewCourseModule>({
    title: '',
    description: '',
    content_type: 'text',
    status: 'draft',
    duration_minutes: 0,
    canva_url: '',
    conference_url: '',
    text_content: '',
    video_url: '',
    document_url: '',
    thumbnail_url: '',
    explanation: '',
    key_takeaways: '',
    quiz_activity: '',
    notes_content: '',
    quiz_config: null,
  })
  
  // Editing states
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null)
  const [deletingItem, setDeletingItem] = useState<{type: 'course' | 'subject' | 'module', item: Course | Subject | CourseModule} | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [subjectModules, setSubjectModules] = useState<Record<string, CourseModule[]>>({})
  const [subjectModulesLoading, setSubjectModulesLoading] = useState<Set<string>>(new Set())
  const [highlightedSubjectId, setHighlightedSubjectId] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalSubjects: 0,
    totalModules: 0,
    totalStudents: 0,
    totalInstructors: 0
  })
  
  const supabase = createClient()
  const { showSuccess, showError } = useToast()

  // Function to upload PDF file to Supabase Storage
  const uploadPDFFile = async (file: File, oldFileUrl?: string | null): Promise<string | null> => {
    // Validate PDF size before uploading
    const sizeError = validatePDFSize(file)
    if (sizeError) { showError('File Too Large', sizeError); return null }

    try {
      setUploadingFile(true)
      
      // Delete old file if it exists and is from Supabase storage
      if (oldFileUrl && oldFileUrl.includes('supabase.co/storage')) {
        try {
          // Extract file path from URL
          const urlParts = oldFileUrl.split('/documents/')
          if (urlParts.length > 1) {
            const oldFilePath = urlParts[1].split('?')[0] // Remove query params if any
            console.log('Deleting old file:', oldFilePath)
            
            const { error: deleteError } = await supabase.storage
              .from('documents')
              .remove([oldFilePath])
            
            if (deleteError) {
              console.error('Error deleting old file:', deleteError)
              // Continue with upload even if delete fails
            } else {
              console.log('Old file deleted successfully')
            }
          }
        } catch (deleteErr) {
          console.error('Error parsing old file URL:', deleteErr)
          // Continue with upload even if delete fails
        }
      }
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `module-documents/${fileName}`

      // Upload file to Supabase Storage with proper content type
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '86400',
          upsert: false,
          contentType: 'application/pdf'
        })

      if (error) {
        console.error('Error uploading file:', error)
        showError('Upload Error', error.message)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      console.log('File uploaded successfully:', publicUrl)
      return publicUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      showError('Upload Error', 'Failed to upload file')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  // Function to upload Presentation files (PPT, PPTX, PDF)
  const uploadPresentationFile = async (file: File, oldFileUrl?: string | null): Promise<string | null> => {
    // Validate presentation size before uploading
    const sizeError = validatePresentationSize(file)
    if (sizeError) { showError('File Too Large', sizeError); return null }

    try {
      setUploadingFile(true)
      
      // Delete old file if it exists and is from Supabase storage
      if (oldFileUrl && oldFileUrl.includes('supabase.co/storage')) {
        try {
          // Extract file path from URL
          const urlParts = oldFileUrl.split('/documents/')
          if (urlParts.length > 1) {
            const oldFilePath = urlParts[1].split('?')[0] // Remove query params if any
            console.log('Deleting old file:', oldFilePath)
            
            const { error: deleteError } = await supabase.storage
              .from('documents')
              .remove([oldFilePath])
            
            if (deleteError) {
              console.error('Error deleting old file:', deleteError)
              // Continue with upload even if delete fails
            } else {
              console.log('Old file deleted successfully')
            }
          }
        } catch (deleteErr) {
          console.error('Error parsing old file URL:', deleteErr)
          // Continue with upload even if delete fails
        }
      }
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `module-documents/${fileName}`

      // Determine content type
      let contentType = 'application/octet-stream'
      if (fileExt === 'ppt') {
        contentType = 'application/vnd.ms-powerpoint'
      } else if (fileExt === 'pptx') {
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      } else if (fileExt === 'pdf') {
        contentType = 'application/pdf'
      }

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '86400',
          upsert: false,
          contentType
        })

      if (error) {
        console.error('Error uploading presentation:', error)
        showError('Upload Error', error.message)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      console.log('Presentation uploaded successfully:', publicUrl)
      return publicUrl
    } catch (error) {
      console.error('Error uploading presentation:', error)
      showError('Upload Error', 'Failed to upload presentation')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  // Upload thumbnail image for courses, subjects, and modules
  const uploadThumbnail = async (file: File, oldUrl?: string | null): Promise<string | null> => {
    try {
      setUploadingFile(true)
      // Compress image before uploading (resize to max 1200px, convert to WebP)
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 })
      if (oldUrl && oldUrl.includes('supabase.co/storage')) {
        try {
          const urlParts = oldUrl.split('/documents/')
          if (urlParts.length > 1) {
            const oldPath = urlParts[1].split('?')[0]
            await supabase.storage.from('documents').remove([oldPath])
          }
        } catch {}
      }
      const fileExt = compressed.name.split('.').pop()
      const fileName = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const { error } = await supabase.storage.from('documents').upload(fileName, compressed, {
        cacheControl: '86400',
        upsert: false,
        contentType: compressed.type
      })
      if (error) { showError('Upload Error', error.message); return null }
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
      return publicUrl
    } catch {
      showError('Upload Error', 'Failed to upload image')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  // Helper function to get button background color
  const getButtonBg = () => '#1f7a8c' // Primary teal color
  
  // Helper function to get button hover color (slightly darker)
  const getButtonHoverBg = () => '#1a6b7a' // Darker teal color

  // Fetch data functions
  const fetchCourses = async () => {
    try {
      setLoading(true)
      
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*, subjects(*, modules(*))')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching courses:', error)
        return
      }

      setCourses(coursesData || [])
      if (coursesData && coursesData.length > 0) {
        setPreviewCourse(prev => {
          if (!prev) return coursesData[0]
          // Keep the same course selected but with fresh data
          const refreshed = coursesData.find((c: Course) => c.id === prev.id)
          return refreshed || coursesData[0]
        })
      } else {
        setPreviewCourse(null)
      }
      console.log('Courses loaded:', coursesData?.length || 0, coursesData)

    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          trainee:profiles(first_name, last_name)
        `)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching subjects:', error)
        return
      }

      // Fetch enrollment counts for each subject - removed since we now enroll at course level
      const subjectsWithCounts = (data || []).map((subject: Subject) => {
        return {
          ...subject,
          trainee_name: subject.trainee 
            ? `${subject.trainee.first_name} ${subject.trainee.last_name}`
            : 'Unassigned',
          enrollment_count: 0 // No longer tracking subject-level enrollments
        }
      })

      setSubjects(subjectsWithCounts)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const fetchCourseOverview = async (courseId: string) => {
    try {
      // Enrolled count
      const { count } = await supabase
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
      setCourseEnrolledCount(count || 0)

      // Get unique instructor_ids from subjects
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('instructor_id')
        .eq('course_id', courseId)
        .not('instructor_id', 'is', null)

      const uniqueIds = Array.from(new Set((subjectData || []).map((s: { instructor_id: string }) => s.instructor_id).filter(Boolean)))

      setCourseInstructors(uniqueIds.map((id: unknown) => ({ id: id as string, first_name: '', last_name: '' })))

      // Fetch rankings — sum percentage per student for this course
      setLoadingRankings(true)
      try {
        const { data: gradesData } = await supabase
          .from('quiz_grades')
          .select('user_id, percentage')
          .eq('course_id', courseId)

        if (gradesData && gradesData.length > 0) {
          // Aggregate per user
          const map: Record<string, { total: number; count: number }> = {}
          gradesData.forEach((g: { user_id: string; percentage: number }) => {
            if (!map[g.user_id]) map[g.user_id] = { total: 0, count: 0 }
            map[g.user_id].total += g.percentage
            map[g.user_id].count += 1
          })
          const userIds = Object.keys(map)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds)
          const ranked = userIds.map(uid => {
            const p = (profiles || []).find((x: { id: string }) => x.id === uid)
            return {
              user_id: uid,
              first_name: p?.first_name || '',
              last_name: p?.last_name || '',
              total_score: Math.round(map[uid].total),
              quiz_count: map[uid].count,
            }
          }).sort((a, b) => b.total_score - a.total_score)
          setCourseRankings(ranked)
        } else {
          setCourseRankings([])
        }
      } catch { setCourseRankings([]) }
      finally { setLoadingRankings(false) }
    } catch (e) {
      console.error('Error fetching course overview:', e)
    }
  }

  const fetchAllModulesForCourse = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*, subjects!inner(course_id)')
        .eq('subjects.course_id', courseId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching all modules:', error)
        return
      }

      // Group by subject_id and populate the accordion cache
      const grouped: Record<string, CourseModule[]> = {}
      for (const mod of (data || [])) {
        if (!grouped[mod.subject_id]) grouped[mod.subject_id] = []
        grouped[mod.subject_id].push(mod)
      }
      setSubjectModules(grouped)
    } catch (error) {
      console.error('Error fetching all modules:', error)
    }
  }

  const fetchModules = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching modules:', error)
        return
      }

      setModules(data || [])
      // Also keep the accordion cache in sync
      setSubjectModules(prev => ({ ...prev, [subjectId]: data || [] }))
    } catch (error) {
      console.error('Error fetching modules:', error)
    }
  }

  const fetchResources = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('subject_resources')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching resources:', error)
        return
      }

      setResources(data || [])
    } catch (error) {
      console.error('Error fetching resources:', error)
    }
  }

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubject || !newResourceTitle.trim() || !newResourceUrl.trim()) return

    try {
      setUploadingResource(true)
      
      console.log('Attempting to insert resource:', {
        subject_id: selectedSubject.id,
        title: newResourceTitle.trim(),
        resource_url: newResourceUrl.trim(),
        user_id: user?.id
      })
      
      const { data, error } = await supabase
        .from('subject_resources')
        .insert({
          subject_id: selectedSubject.id,
          title: newResourceTitle.trim(),
          resource_url: newResourceUrl.trim(),
          description: newResourceDescription.trim() || null,
          resource_type: 'link',
          order_index: resources.length + 1,
          status: 'active',
          created_by: user?.id
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        console.error('Error message:', error.message)
        console.error('Error code:', error.code)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        throw new Error(error.message || 'Failed to insert resource')
      }

      console.log('Resource added successfully:', data)
      setResources([...resources, data])
      setNewResourceTitle('')
      setNewResourceUrl('')
      setNewResourceDescription('')
      alert('Resource added successfully!')
      
    } catch (error: any) {
      console.error('Caught error:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error))
      const errorMessage = error?.message || 'Unknown error - check console for details'
      alert('Failed to add resource: ' + errorMessage + '\n\nCheck browser console (F12) for more details')
    } finally {
      setUploadingResource(false)
    }
  }

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    try {
      const { error } = await supabase
        .from('subject_resources')
        .delete()
        .eq('id', resourceId)

      if (error) throw error

      setResources(resources.filter(r => r.id !== resourceId))
    } catch (error: any) {
      console.error('Error deleting resource:', error)
      alert('Failed to delete resource: ' + error.message)
    }
  }

  const handleEditResource = (resource: any) => {
    setEditingResourceId(resource.id)
    setNewResourceTitle(resource.title)
    setNewResourceUrl(resource.resource_url)
    setNewResourceDescription(resource.description || '')
  }

  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingResourceId || !newResourceTitle.trim() || !newResourceUrl.trim()) return

    try {
      setUploadingResource(true)
      
      const { data, error } = await supabase
        .from('subject_resources')
        .update({
          title: newResourceTitle.trim(),
          resource_url: newResourceUrl.trim(),
          description: newResourceDescription.trim() || null,
          updated_by: user?.id
        })
        .eq('id', editingResourceId)
        .select()
        .single()

      if (error) throw new Error(error.message || 'Failed to update resource')

      setResources(resources.map(r => r.id === editingResourceId ? data : r))
      setNewResourceTitle('')
      setNewResourceUrl('')
      setNewResourceDescription('')
      setEditingResourceId(null)
      alert('Resource updated successfully!')
      
    } catch (error: any) {
      console.error('Error updating resource:', error)
      alert('Failed to update resource: ' + error.message)
    } finally {
      setUploadingResource(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingResourceId(null)
    setNewResourceTitle('')
    setNewResourceUrl('')
    setNewResourceDescription('')
  }

  const fetchtrainees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('role', ['shs_student', 'jhs_student', 'college_student', 'scholar', 'tesda_scholar'])
        .order('first_name', { ascending: true })

      if (error) {
        settrainees([])
        return
      }

      settrainees(data || [])
    } catch (error) {
      settrainees([])
    }
  }

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('role', ['instructor', 'developer'])
        .order('first_name', { ascending: true })

      if (error) {
        setInstructors([])
        return
      }

      setInstructors(data || [])
    } catch (error) {
      setInstructors([])
    }
  }

  const fetchEnrollments = async (courseId: string) => {
      try {
        // Use RPC to bypass RLS (same as UserManagementPage)
        const { data: allUsers, error: studentsError } = await supabase.rpc('get_all_users')

        if (studentsError) {
          console.error('Error fetching students for enrollment:', studentsError.message)
        }

        const studentRoles = ['shs_student', 'jhs_student', 'college_student', 'scholar', 'tesda_scholar']
        const freshTrainees = (allUsers || []).filter((u: {role: string}) => studentRoles.includes(u.role))
        settrainees(freshTrainees)

        const { data: enrollData, error: enrollError } = await supabase
          .rpc('get_course_enrollments', { p_course_id: courseId })

        if (enrollError) {
          console.error('Error fetching enrollments:', enrollError.message)
          return
        }

        const error = enrollError
        const data = enrollData

        if (error) {
          console.error('Error fetching enrollments:', error)
          console.error('Error details:', error.message, error.details)
          return
        }

        // Map enrolled trainees using freshTrainees (already fetched via RPC)
        type Enrolledtrainee = {
          id: string
          first_name: string
          last_name: string
          email: string
          enrollment_id: string
          enrolled_at: string
          status: string
        }

        const enrolled: Enrolledtrainee[] = (data || []).map((enrollment: { id: string; enrolled_at: string; status: string; trainee_id: string }) => {
          const profile = freshTrainees.find((t: { id: string }) => t.id === enrollment.trainee_id) as any
          return {
            id: enrollment.trainee_id,
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email: profile?.email || '',
            enrollment_id: enrollment.id,
            enrolled_at: enrollment.enrolled_at,
            status: enrollment.status
          }
        }).filter((e: Enrolledtrainee) => e.first_name || e.last_name)

        setEnrolledtrainees(enrolled)

        // Show all students not already enrolled — no enrollment type filtering
        const enrolledtraineeIds = enrolled.map((s: Enrolledtrainee) => s.id)
        const available = freshTrainees.filter((trainee: {id: string}) => !enrolledtraineeIds.includes(trainee.id))
        
        setAvailabletrainees(available)

      } catch (error) {
        console.error('Error fetching enrollments:', error)
      }
    }

  const fetchStatistics = async () => {
    try {
      // Fetch total subjects count
      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })

      // Fetch total modules count
      const { count: modulesCount } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })

      // Fetch total students (trainees + tesda_scholars) count
      const { count: studentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['shs_student', 'jhs_student', 'college_student', 'scholar'])

      // Fetch total instructors count
      const { count: instructorsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'instructor')

      setStatistics({
        totalSubjects: subjectsCount || 0,
        totalModules: modulesCount || 0,
        totalStudents: studentsCount || 0,
        totalInstructors: instructorsCount || 0
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  useEffect(() => {
    console.log('CourseManagementPage mounted, fetching data...')
    fetchCourses()
    fetchtrainees()
    fetchInstructors()
    fetchStatistics()
  }, [])

  // Auto-select course when navigated from dashboard
  useEffect(() => {
    if (initialCourseId && courses.length > 0 && !selectedCourse) {
      const course = courses.find(c => c.id === initialCourseId)
      if (course) handleCourseSelect(course)
    }
  }, [initialCourseId, courses])

  // Refresh trainees when component becomes visible (e.g., when navigating back from User Management)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing trainees...')
        fetchtrainees()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Navigation functions
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course)
    setCurrentView('subjects')
    setExpandedSubjects(new Set())
    setSubjectModules({})
    setHighlightedSubjectId(null)
    setCourseEnrolledCount(0)
    setCourseInstructors([])
    setCourseRankings([])
    fetchSubjects(course.id)
    fetchAllModulesForCourse(course.id)
    fetchCourseOverview(course.id)
  }

  const handleOpenSubjectFromPreview = async (course: Course, subjectId: string) => {
    setSelectedCourse(course)
    setCurrentView('subjects')
    setHighlightedSubjectId(subjectId)
    setExpandedSubjects(new Set([subjectId]))
    setSubjectModules({})
    setSubjectModulesLoading(new Set([subjectId]))
    setCourseEnrolledCount(0)
    setCourseInstructors([])
    fetchSubjects(course.id)
    fetchAllModulesForCourse(course.id)
    fetchCourseOverview(course.id)
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true })
      if (!error) setSubjectModules({ [subjectId]: data || [] })
    } finally {
      setSubjectModulesLoading(new Set())
    }
  }

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject)
    // No longer navigates to modules view — modules are shown inline in the accordion
    // This is kept for setting context when opening add/edit module modals
  }

  const toggleSubjectExpand = async (subject: Subject) => {
    const isCurrentlyExpanded = expandedSubjects.has(subject.id)

    if (isCurrentlyExpanded) {
      // Collapse and clear highlight
      setExpandedSubjects(new Set())
      setHighlightedSubjectId(null)
    } else {
      // Expand this one, close all others, set as highlighted
      setExpandedSubjects(new Set([subject.id]))
      setHighlightedSubjectId(subject.id)
      if (!subjectModules[subject.id]) {
        setSubjectModulesLoading(prev => new Set(prev).add(subject.id))
        try {
          const { data, error } = await supabase
            .from('modules')
            .select('*')
            .eq('subject_id', subject.id)
            .order('order_index', { ascending: true })
          if (!error) {
            setSubjectModules(prev => ({ ...prev, [subject.id]: data || [] }))
          }
        } finally {
          setSubjectModulesLoading(prev => { const s = new Set(prev); s.delete(subject.id); return s })
        }
      }
    }
  }

  const handleBackToCourses = () => {
    setCurrentView('courses')
    setSelectedCourse(null)
    setSelectedSubject(null)
  }

  const handleBackToSubjects = () => {
    setCurrentView('subjects')
    setSelectedSubject(null)
  }

  // CRUD functions for courses
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setSubmitting(true)

    try {
      // Insert the course first
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert([{
          title: newCourse.title,
          course_type: newCourse.course_type,
          status: newCourse.status,
          enrollment_type: newCourse.enrollment_type,
          thumbnail_url: newCourse.thumbnail_url || null
        }])
        .select()
        .single()

      if (courseError) {
        console.error('Error creating course:', courseError)
        showError('Error', 'Error creating course: ' + courseError.message)
        return
      }

      setNewCourse({
        title: '',
        course_type: 'academic',
        status: 'draft',
        enrollment_type: 'trainee',
        thumbnail_url: ''
      })
      setShowAddCourseModal(false)
      await fetchCourses()
      
      // Log the course creation activity
      if (user?.id && courseData) {
        await logCourseCreation(
          user.id,
          courseData.id,
          courseData.title,
          {
            status: courseData.status,
            enrollment_type: courseData.enrollment_type
          }
        )
      }
      
      showSuccess('Success', 'Course created successfully!')
    } catch (error) {
      console.error('Error creating course:', error)
      showError('Error', 'Error creating course. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }


  // CRUD functions for subjects
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse) return
    setSubmitting(true)

    try {
      // Get existing subjects to determine if reordering is needed
      const { data: existingSubjects } = await supabase
        .from('subjects')
        .select('id, order_index')
        .eq('course_id', selectedCourse.id)
        .order('order_index', { ascending: true })

      const targetOrderIndex = newSubject.order_index

      // If the target order index is already taken, we need to reorder existing subjects
      if (existingSubjects && existingSubjects.some((s: Subject) => s.order_index >= targetOrderIndex)) {
        // Update existing subjects to make room for the new subject
        const subjectsToUpdate = existingSubjects.filter((s: Subject) => s.order_index >= targetOrderIndex)
        
        for (const subject of subjectsToUpdate) {
          await supabase
            .from('subjects')
            .update({ order_index: subject.order_index + 1 })
            .eq('id', subject.id)
        }
      }

      // Insert the new subject with the specified order_index
      const { error } = await supabase
        .from('subjects')
        .insert([{
          course_id: selectedCourse.id,
          title: newSubject.title,
          description: newSubject.description || newSubject.title,
          instructor_id: newSubject.instructor_id || null,
          status: newSubject.status,
          enrollment_type: newSubject.enrollment_type,
          online_class_link: newSubject.online_class_link || null,
          order_index: targetOrderIndex,
          thumbnail_url: newSubject.thumbnail_url || null
        }])

      if (error) {
        console.error('Error creating subject:', error)
        showError('Error', 'Error creating subject: ' + error.message)
        return
      }

      setNewSubject({
        title: '',
        description: '',
        instructor_id: '',
        order_index: 1,
        status: 'draft',
        enrollment_type: 'trainee',
        thumbnail_url: ''
      })
      setShowAddSubjectModal(false)
      await fetchSubjects(selectedCourse.id)
      
      // Log the subject creation activity
      if (user?.id && selectedCourse) {
        await logActivity({
          userId: user.id,
          activityType: 'subject_created',
          description: `Created new subject "${newSubject.title}" in course "${selectedCourse.title}"`,
          metadata: {
            course_id: selectedCourse.id,
            course_title: selectedCourse.title,
            subject_title: newSubject.title,
            status: newSubject.status,
            enrollment_type: newSubject.enrollment_type
          }
        })
      }
      
      showSuccess('Success', 'Subject created successfully!')
    } catch (error) {
      console.error('Error creating subject:', error)
      showError('Error', 'Error creating subject. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // CRUD functions for modules
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubject) return
    setSubmitting(true)

    try {
      // Get the next order index
      const { data: existingModules } = await supabase
        .from('modules')
        .select('order_index')
        .eq('subject_id', selectedSubject.id)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrderIndex = existingModules && existingModules.length > 0 
        ? existingModules[0].order_index + 1 
        : 1

      const moduleData = {
        subject_id: selectedSubject.id,
        title: newModule.title,
        description: newModule.description || newModule.title,
        content_type: newModule.content_type,
        status: newModule.status,
        order_index: nextOrderIndex,
        duration_minutes: newModule.duration_minutes || null,
        canva_url: newModule.canva_url || null,
        conference_url: newModule.conference_url || null,
        text_content: JSON.stringify({
          body: newModule.text_content || '',
          explanation: newModule.explanation || '',
          key_takeaways: newModule.key_takeaways || '',
          quiz_activity: newModule.quiz_activity || '',
          notes_content: newModule.notes_content || '',
          quiz_config: newModule.quiz_config || null,
        }),
        video_url: newModule.video_url || null,
        document_url: newModule.document_url || null,
        thumbnail_url: newModule.thumbnail_url || null
      }

      console.log('Creating module with data:', moduleData)

      const { error } = await supabase
        .from('modules')
        .insert([moduleData])

      if (error) {
        console.error('Error creating module:', error)
        showError('Error', 'Error creating module: ' + error.message)
        return
      }

      setNewModule({
        title: '',
        description: '',
        content_type: 'text',
        status: 'draft',
        duration_minutes: 0,
        canva_url: '',
        conference_url: '',
        text_content: '',
        video_url: '',
        document_url: '',
        thumbnail_url: '',
        explanation: '',
        key_takeaways: '',
        quiz_activity: '',
        notes_content: '',
        quiz_config: null,
      })
      setShowAddModuleModal(false)
      await fetchModules(selectedSubject.id)
      
      // Log the module creation activity (non-blocking)
      if (user?.id && selectedSubject && selectedCourse) {
        try {
          await logActivity({
            userId: user.id,
            activityType: 'module_created',
            description: `Created new module "${newModule.title}" in subject "${selectedSubject.title}"`,
            metadata: {
              course_id: selectedCourse.id,
              course_title: selectedCourse.title,
              subject_id: selectedSubject.id,
              subject_title: selectedSubject.title,
              module_title: newModule.title,
              content_type: newModule.content_type,
              status: newModule.status
            }
          })
        } catch (logError) {
          // Silently fail - don't block module creation if logging fails
          console.warn('Activity logging failed:', logError)
        }
      }
      
      showSuccess('Success', 'Module created successfully!')
    } catch (error) {
      console.error('Error creating module:', error)
      showError('Error', 'Error creating module. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit and Delete functions for modules
  const handleEditModule = (module: CourseModule) => {
    setEditingModule(module)
    let parsed: any = {}
    try { parsed = module.text_content ? JSON.parse(module.text_content) : {} } catch { parsed = { body: module.text_content || '' } }
    let quizConfig = null
    try { quizConfig = parsed.quiz_config ? (typeof parsed.quiz_config === 'string' ? JSON.parse(parsed.quiz_config) : parsed.quiz_config) : null } catch { quizConfig = null }
    setNewModule({
      title: module.title,
      description: module.description,
      content_type: module.content_type,
      status: module.status || 'draft',
      duration_minutes: module.duration_minutes || 0,
      canva_url: module.canva_url || '',
      conference_url: module.conference_url || '',
      text_content: parsed.body || '',
      video_url: module.video_url || '',
      document_url: module.document_url || '',
      thumbnail_url: module.thumbnail_url || '',
      explanation: parsed.explanation || '',
      key_takeaways: parsed.key_takeaways || '',
      quiz_activity: parsed.quiz_activity || '',
      notes_content: parsed.notes_content || '',
      quiz_config: quizConfig,
    })
    setShowEditModuleModal(true)
  }

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingModule) return
    setSubmitting(true)

    try {
      const updateData = {
        title: newModule.title,
        description: newModule.description || newModule.title,
        content_type: newModule.content_type,
        status: newModule.status,
        duration_minutes: newModule.duration_minutes || null,
        canva_url: newModule.canva_url || null,
        conference_url: newModule.conference_url || null,
        text_content: JSON.stringify({
          body: newModule.text_content || '',
          explanation: newModule.explanation || '',
          key_takeaways: newModule.key_takeaways || '',
          quiz_activity: newModule.quiz_activity || '',
          notes_content: newModule.notes_content || '',
          quiz_config: newModule.quiz_config || null,
        }),
        video_url: newModule.video_url || null,
        document_url: newModule.document_url || null,
        thumbnail_url: newModule.thumbnail_url || null
      }

      console.log('Updating module with data:', updateData)

      const { error } = await supabase
        .from('modules')
        .update(updateData)
        .eq('id', editingModule.id)

      if (error) {
        console.error('Error updating module:', error)
        showError('Error', 'Error updating module: ' + error.message)
        return
      }

      // Always delete old grades when module is updated — grades belong to the specific quiz config.
      // If the quiz was replaced or removed, old scores are no longer valid.
      let hadQuiz = false
      try {
        const prev = editingModule.text_content ? JSON.parse(editingModule.text_content) : {}
        hadQuiz = !!(prev.quiz_config)
      } catch { hadQuiz = false }

      if (hadQuiz) {
        await supabase.from('quiz_grades').delete().eq('module_id', editingModule.id)
      }

      setNewModule({
        title: '',
        description: '',
        content_type: 'text',
        status: 'draft',
        duration_minutes: 0,
        canva_url: '',
        conference_url: '',
        text_content: '',
        video_url: '',
        document_url: '',
        thumbnail_url: '',
        explanation: '',
        key_takeaways: '',
        quiz_activity: '',
        notes_content: '',
        quiz_config: null,
      })
      setEditingModule(null)
      setShowEditModuleModal(false)
      if (selectedSubject) {
        await fetchModules(selectedSubject.id)
      }
      showSuccess('Success', 'Module updated successfully!')
    } catch (error) {
      console.error('Error updating module:', error)
      showError('Error', 'Error updating module. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteModule = (module: CourseModule) => {
    setDeletingItem({ type: 'module', item: module })
    setShowDeleteModal(true)
  }

  const handleOpenTest = (module: CourseModule) => {
    setTestModule(module)
    let parsed: any = {}
    try { parsed = module.text_content ? JSON.parse(module.text_content) : {} } catch { parsed = {} }
    let quizConfig = null
    try { quizConfig = parsed.quiz_config ? (typeof parsed.quiz_config === 'string' ? JSON.parse(parsed.quiz_config) : parsed.quiz_config) : null } catch { quizConfig = null }
    setTestQuizConfig(quizConfig)
    setShowTestModal(true)
  }

  const handleSaveTest = async () => {
    if (!testModule) return
    setSavingTest(true)
    try {
      let parsed: any = {}
      try { parsed = testModule.text_content ? JSON.parse(testModule.text_content) : {} } catch { parsed = {} }
      const updated = { ...parsed, quiz_config: testQuizConfig || null }
      const { error } = await supabase
        .from('modules')
        .update({ text_content: JSON.stringify(updated) })
        .eq('id', testModule.id)
      if (error) { showError('Error', 'Failed to save test: ' + error.message); return }
      // If quiz was removed, delete old grades
      if (!testQuizConfig && parsed.quiz_config) {
        await supabase.from('quiz_grades').delete().eq('module_id', testModule.id)
      }
      if (selectedSubject) await fetchModules(selectedSubject.id)
      setShowTestModal(false)
      setTestModule(null)
      setTestQuizConfig(null)
      showSuccess('Success', 'Test saved successfully!')
    } catch { showError('Error', 'Failed to save test.') }
    finally { setSavingTest(false) }
  }

  // Edit and Delete functions for courses
  const handleEditCourse = (course: Course) => {
    setEditingCourse(course)
    setNewCourse({
      title: course.title,
      course_type: course.course_type || 'academic',
      status: course.status,
      enrollment_type: course.enrollment_type,
      thumbnail_url: course.thumbnail_url || ''
    })
    setShowEditCourseModal(true)
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return
    
    setSubmitting(true)

    try {
      // Update the course basic info
      const { error } = await supabase
        .from('courses')
        .update({
          title: newCourse.title,
          course_type: newCourse.course_type,
          status: newCourse.status,
          enrollment_type: newCourse.enrollment_type,
          thumbnail_url: newCourse.thumbnail_url || null
        })
        .eq('id', editingCourse.id)

      if (error) {
        console.error('Error updating course:', error)
        showError('Error', 'Error updating course: ' + error.message)
        return
      }

      setNewCourse({
        title: '',
        course_type: 'academic',
        status: 'draft',
        enrollment_type: 'trainee',
        thumbnail_url: ''
      })
      setEditingCourse(null)
      setShowEditCourseModal(false)
      await fetchCourses()
      
      // Log the course update activity
      if (user?.id && editingCourse) {
        await logActivity({
          userId: user.id,
          activityType: 'course_updated',
          description: `Updated course "${newCourse.title}"`,
          metadata: {
            course_id: editingCourse.id,
            course_title: newCourse.title,
            status: newCourse.status,
            enrollment_type: newCourse.enrollment_type
          }
        })
      }
      
      showSuccess('Success', 'Course updated successfully!')
    } catch (error) {
      console.error('Error updating course:', error)
      showError('Error', 'Error updating course. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCourse = (course: Course) => {
    setDeletingItem({ type: 'course', item: course })
    setShowDeleteModal(true)
  }

  // Edit and Delete functions for subjects
  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject)
    setNewSubject({
      title: subject.title,
      description: subject.description,
      instructor_id: subject.instructor_id || '',
      order_index: subject.order_index,
      status: subject.status,
      enrollment_type: subject.enrollment_type,
      online_class_link: subject.online_class_link || '',
      thumbnail_url: subject.thumbnail_url || ''
    })
    setShowEditSubjectModal(true)
  }

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSubject || !selectedCourse) return
    setSubmitting(true)

    try {
      // Check if order_index has changed and handle reordering
      if (editingSubject.order_index !== newSubject.order_index) {
        const { data: existingSubjects } = await supabase
          .from('subjects')
          .select('id, order_index')
          .eq('course_id', selectedCourse.id)
          .neq('id', editingSubject.id) // Exclude the subject being edited
          .order('order_index', { ascending: true })

        const targetOrderIndex = newSubject.order_index
        const currentOrderIndex = editingSubject.order_index

        if (existingSubjects) {
          if (targetOrderIndex < currentOrderIndex) {
            // Moving up - shift subjects down
            const subjectsToUpdate = existingSubjects.filter((s: Subject) => 
              s.order_index >= targetOrderIndex && s.order_index < currentOrderIndex
            )
            for (const subject of subjectsToUpdate) {
              await supabase
                .from('subjects')
                .update({ order_index: subject.order_index + 1 })
                .eq('id', subject.id)
            }
          } else if (targetOrderIndex > currentOrderIndex) {
            // Moving down - shift subjects up
            const subjectsToUpdate = existingSubjects.filter((s: Subject) => 
              s.order_index > currentOrderIndex && s.order_index <= targetOrderIndex
            )
            for (const subject of subjectsToUpdate) {
              await supabase
                .from('subjects')
                .update({ order_index: subject.order_index - 1 })
                .eq('id', subject.id)
            }
          }
        }
      }

      // Update the subject
      const { error } = await supabase
        .from('subjects')
        .update({
          title: newSubject.title,
          description: newSubject.description || newSubject.title,
          instructor_id: newSubject.instructor_id || null,
          status: newSubject.status,
          enrollment_type: newSubject.enrollment_type,
          online_class_link: newSubject.online_class_link || null,
          order_index: newSubject.order_index,
          thumbnail_url: newSubject.thumbnail_url || null
        })
        .eq('id', editingSubject.id)

      if (error) {
        console.error('Error updating subject:', error)
        showError('Error', 'Error updating subject: ' + error.message)
        return
      }

      setNewSubject({
        title: '',
        description: '',
        instructor_id: '',
        order_index: 1,
        status: 'draft',
        enrollment_type: 'trainee',
        thumbnail_url: ''
      })
      setEditingSubject(null)
      setShowEditSubjectModal(false)
      await fetchSubjects(selectedCourse.id)
      showSuccess('Success', 'Subject updated successfully!')
    } catch (error) {
      console.error('Error updating subject:', error)
      showError('Error', 'Error updating subject. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSubject = (subject: Subject) => {
    setDeletingItem({ type: 'subject', item: subject })
    setShowDeleteModal(true)
  }

  // Enrollment functions
  const handleEnrolltrainees = (course: Course) => {
      setSelectedCourseForEnrollment(course)
      setSelectedtrainees([])
      setTraineeRoleFilter('all')
      fetchEnrollments(course.id)
      setShowEnrolltraineesModal(true)
    }

  const handletraineeSelection = (traineeId: string) => {
    setSelectedtrainees(prev => 
      prev.includes(traineeId) 
        ? prev.filter(id => id !== traineeId)
        : [...prev, traineeId]
    )
  }

  const handleEnrollSelectedtrainees = async () => {
      if (!selectedCourseForEnrollment || selectedtrainees.length === 0) return

      setSubmitting(true)

      try {
        const enrollments = selectedtrainees.map(traineeId => ({
          course_id: selectedCourseForEnrollment.id,
          trainee_id: traineeId,
          status: 'active'
        }))

        const { error } = await supabase
          .from('course_enrollments')
          .insert(enrollments)

        if (error) {
          console.error('Error enrolling trainees:', error)
          showError('Error', 'Error enrolling trainees: ' + error.message)
          return
        }

        setSelectedtrainees([])
        await fetchEnrollments(selectedCourseForEnrollment.id)

        showSuccess('Success', `Successfully enrolled ${selectedtrainees.length} trainee${selectedtrainees.length !== 1 ? 's' : ''}`)
      } catch (error) {
        console.error('Error enrolling trainees:', error)
        showError('Error', 'Error enrolling trainees. Please try again.')
      } finally {
        setSubmitting(false)
      }
    }

  const handleUnenrolltrainee = async (enrollmentId: string) => {
      if (!selectedCourseForEnrollment) return

      setSubmitting(true)

      try {
        const { error } = await supabase
          .from('course_enrollments')
          .delete()
          .eq('id', enrollmentId)

        if (error) {
          console.error('Error unenrolling trainee:', error)
          showError('Error', 'Error unenrolling trainee: ' + error.message)
          return
        }

        await fetchEnrollments(selectedCourseForEnrollment.id)

        showSuccess('Success', 'trainee unenrolled successfully')
      } catch (error) {
        console.error('Error unenrolling trainee:', error)
        showError('Error', 'Error unenrolling trainee. Please try again.')
      } finally {
        setSubmitting(false)
      }
    }

  const confirmDelete = async () => {
    if (!deletingItem) return
    setSubmitting(true)

    try {
      let error
      
      switch (deletingItem.type) {
        case 'course':
          // First, delete all related records
          // Delete modules for all subjects in this course
          const { data: courseSubjects } = await supabase
            .from('subjects')
            .select('id')
            .eq('course_id', deletingItem.item.id)
          
          if (courseSubjects && courseSubjects.length > 0) {
            const subjectIds = courseSubjects.map((s: { id: string }) => s.id)
            
            // Delete modules for these subjects
            await supabase
              .from('modules')
              .delete()
              .in('subject_id', subjectIds)
          }
          
          // Delete subjects
          await supabase
            .from('subjects')
            .delete()
            .eq('course_id', deletingItem.item.id)
          
          // Delete enrollments
          await supabase
            .from('course_enrollments')
            .delete()
            .eq('course_id', deletingItem.item.id)
          
          // Finally, delete the course
          const courseDeleteResult = await supabase
            .from('courses')
            .delete()
            .eq('id', deletingItem.item.id)
          
          error = courseDeleteResult.error
          break
        case 'subject':
          // Delete modules first
          await supabase
            .from('modules')
            .delete()
            .eq('subject_id', deletingItem.item.id)
          
          // Then delete the subject
          const subjectDeleteResult = await supabase
            .from('subjects')
            .delete()
            .eq('id', deletingItem.item.id)
          
          error = subjectDeleteResult.error
          break
        case 'module':
          const moduleDeleteResult = await supabase
            .from('modules')
            .delete()
            .eq('id', deletingItem.item.id)
          
          error = moduleDeleteResult.error
          break
        default:
          throw new Error('Invalid delete type')
      }

      // Check if there's a real error (not just an empty object)
      if (error && (error.message || error.code)) {
        console.error(`Error deleting ${deletingItem.type}:`, error)
        showError('Error', `Error deleting ${deletingItem.type}: ${error.message || error.code || 'Unknown error'}`)
        return
      }

      // Store the item data before clearing it
      const itemToLog = deletingItem

      setDeletingItem(null)
      setShowDeleteModal(false)
      
      // Log the deletion activity
      if (user?.id && itemToLog) {
        let activityType: 'course_deleted' | 'subject_deleted' | 'module_deleted'
        let description: string
        
        switch (itemToLog.type) {
          case 'course':
            activityType = 'course_deleted'
            description = `Deleted course "${itemToLog.item.title}"`
            break
          case 'subject':
            activityType = 'subject_deleted'
            description = `Deleted subject "${itemToLog.item.title}"`
            break
          case 'module':
            activityType = 'module_deleted'
            description = `Deleted module "${itemToLog.item.title}"`
            break
        }
        
        await logActivity({
          userId: user.id,
          activityType,
          description,
          metadata: {
            [`${itemToLog.type}_id`]: itemToLog.item.id,
            [`${itemToLog.type}_title`]: itemToLog.item.title
          }
        })
      }
      
      // Refresh appropriate data
      switch (itemToLog.type) {
        case 'course':
          await fetchCourses()
          break
        case 'subject':
          if (selectedCourse) {
            await fetchSubjects(selectedCourse.id)
          }
          break
        case 'module':
          if (selectedSubject) {
            await fetchModules(selectedSubject.id)
          }
          break
      }
      
      showSuccess('Success', `${deletingItem.type.charAt(0).toUpperCase() + deletingItem.type.slice(1)} deleted successfully!`)
    } catch (error) {
      console.error(`Error deleting ${deletingItem?.type}:`, error)
      showError('Error', `Error deleting ${deletingItem?.type}. Please try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBackToModules = () => {
    setCurrentView('subjects')
    setSelectedModule(null)
  }

  // Helper function to start lesson/presentation
  const handleStartLesson = (module: CourseModule) => {
    setSelectedModule(module)
    setCurrentView('lesson')
  }

  // Helper function to get Canva embed URL
  const getCanvaEmbedUrl = (canvaUrl: string) => {
    try {
      // Convert Canva share URL to embed URL
      if (canvaUrl.includes('canva.com/design/')) {
        const designId = canvaUrl.match(/design\/([^\/\?]+)/)?.[1]
        if (designId) {
          return `https://www.canva.com/design/${designId}/view?embed`
        }
      }
      return canvaUrl
    } catch (error) {
      console.error('Error processing Canva URL:', error)
      return canvaUrl
    }
  }

  // Helper function to render presentation content
  const renderPresentationContent = (module: CourseModule) => {
    switch (module.content_type) {
      case 'canva_presentation':
        if (module.canva_url) {
          const embedUrl = getCanvaEmbedUrl(module.canva_url)
          return (
            <div className="w-full h-full">
              <iframe
                src={embedUrl}
                className="w-full h-full border-0 rounded-lg"
                allowFullScreen
                title={`${module.title} - Canva Presentation`}
              />
            </div>
          )
        }
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">No Presentation URL</h3>
              <p className="text-gray-600">This Canva presentation module doesn't have a valid URL.</p>
            </div>
          </div>
        )
      
      case 'video':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Video Content</h3>
              <p className="text-gray-600 mb-4">{module.description}</p>
              <p className="text-sm text-gray-500">Video player integration coming soon!</p>
            </div>
          </div>
        )
      
      case 'text':
        return (
          <div className="w-full h-full p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-8">
                <h1 className="text-3xl font-bold text-black mb-6">{module.title}</h1>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed text-lg">{module.description}</p>
                  <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                    <h3 className="text-xl font-semibold text-black mb-4">Lesson Content</h3>
                    <p className="text-gray-600">This is a text-based lesson. The full content would be displayed here with rich formatting, images, and interactive elements.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'online_conference':
        // Auto-redirect to conference URL if available
        if (module.conference_url) {
          window.open(module.conference_url, '_blank')
          return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-black mb-4">Redirecting to Conference...</h3>
                <p className="text-gray-600 mb-6">{module.description}</p>
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700">
                    A new tab has been opened with your conference link.
                  </p>
                </div>
                <a 
                  href={module.conference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Open Conference Again
                </a>
              </div>
            </div>
          )
        }
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-black mb-4">Online Conference</h3>
              <p className="text-gray-600 mb-6">{module.description}</p>
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  Conference link not available yet. Please check back later.
                </p>
              </div>
            </div>
          </div>
        )
      
      case 'online_document':
      case 'pdf_document':
      case 'slide_presentation':
        if (!module.document_url) {
          return (
            <div className="w-full h-full p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg p-8">
                  <h1 className="text-3xl font-bold text-black mb-6">{module.title}</h1>
                  <div className="flex items-center mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                    <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-red-900">No Document</h3>
                      <p className="text-red-700">This module doesn't have a document attached.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        const isSupabaseStorage = module.document_url.includes('supabase.co/storage')
        
        // Choose viewer based on content type
        let docEmbedUrl = module.document_url
        if (isSupabaseStorage) {
          if (module.content_type === 'slide_presentation') {
            // Use Microsoft Office Online Viewer for PowerPoint files (better slide navigation)
            docEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(module.document_url)}`
          } else {
            // Use Google Docs Viewer for PDFs and other documents
            // view=FitH sets the default view to fit width
            docEmbedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(module.document_url)}&embedded=true&view=FitH`
          }
        }

        return (
          <div className="w-full h-full">
            <iframe
              src={docEmbedUrl}
              className="w-full h-full border-0"
              title={module.title}
              allow="fullscreen"
            />
          </div>
        )
      
      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Content Preview</h3>
              <p className="text-gray-600">{module.description}</p>
            </div>
          </div>
        )
    }
  }

  // Helper function to get enrollment type display
  const getEnrollmentTypeDisplay = (type: string) => {
    if (type === 'both') {
      return [
        { text: 'Trainees', color: 'bg-blue-100 text-blue-800' },
        { text: 'TESDA Scholars', color: 'bg-purple-100 text-purple-800' }
      ]
    } else if (type === 'tesda_scholar') {
      return [{ text: 'TESDA Scholars', color: 'bg-purple-100 text-purple-800' }]
    }
    return [{ text: 'Trainees', color: 'bg-blue-100 text-blue-800' }]
  }

  // Render functions
  const renderBreadcrumb = () => (
    <div className="flex justify-center mb-4">
      <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm">
        {selectedCourse && (
          <>
            <button onClick={handleBackToCourses} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Courses
            </button>
            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            {currentView === 'subjects' ? (
              <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ background: '#0f4c5c' }}>{selectedCourse.title}</span>
            ) : (
              <button onClick={handleBackToSubjects} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">{selectedCourse.title}</button>
            )}
          </>
        )}
        {selectedSubject && currentView === 'lesson' && (
          <>
            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <button onClick={handleBackToModules} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              {selectedSubject.title}
            </button>
          </>
        )}
        {currentView === 'lesson' && selectedModule && (
          <>
            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ background: '#0f4c5c' }}>{selectedModule.title}</span>
          </>
        )}
      </div>
    </div>
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      case 'online_conference':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      case 'online_document':
      case 'pdf_document':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      case 'canva_presentation':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h6V3H9zm-4 3v14h14V6H5zm2 3h10v2H7V9zm0 4h10v2H7v-2z" /></svg>
      default:
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">

      {currentView !== 'courses' && renderBreadcrumb()}

      {/* Courses View */}
      {currentView === 'courses' && (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-100px)] gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">

          {/* Left Panel - Course List: full width on mobile, 40% on desktop */}
          <div className={`w-full lg:w-[40%] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 ${previewCourse ? 'hidden lg:flex' : 'flex'}`} style={{ minHeight: '0' }}>
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Courses</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowCourseSearch(s => !s); if (showCourseSearch) setCourseSearch('') }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${showCourseSearch ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-100 text-gray-500'}`}
                    title="Search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowAddCourseModal(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#1f7a8c' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                    title="Add Course"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
              {showCourseSearch && (
                <div className="relative mb-2">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                  />
                </div>
              )}
              {/* Filter tabs */}
              <div className="flex items-center gap-4 text-sm">
                {(['all', 'active', 'draft', 'inactive'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setCourseFilter(f)}
                    className={`pb-1 border-b-2 transition-colors capitalize font-medium ${courseFilter === f ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Course list */}
            <div className="flex-1 overflow-y-auto">
              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500 mb-1">No courses yet</p>
                  <p className="text-xs text-gray-400 mb-4">Create your first course to get started</p>
                  <button
                    onClick={() => setShowAddCourseModal(true)}
                    className="px-4 py-2 text-white rounded-lg text-sm transition-colors"
                    style={{ backgroundColor: '#1f7a8c' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                  >
                    Create Course
                  </button>
                </div>
              ) : (
                courses
                  .filter(c => {
                    const matchesFilter = courseFilter === 'all' || c.status === courseFilter
                    const matchesSearch = !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase()) || (c.description || '').toLowerCase().includes(courseSearch.toLowerCase())
                    return matchesFilter && matchesSearch
                  })
                  .map((course) => {
                    const isSelected = previewCourse?.id === course.id
                    return (
                      <div
                        key={course.id}
                        onClick={() => setPreviewCourse(course)}
                        className={`flex items-center gap-4 px-4 py-5 cursor-pointer border-b border-gray-100 transition-all shadow-sm hover:shadow-md ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                      >
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                          ) : (
                            <div className="w-full h-full" style={{
                              background: 'linear-gradient(135deg, #1f7a8c20, #1f7a8c08)'
                            }} />
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1 leading-snug">{course.title}</p>
                          {course.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{course.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                              course.status === 'active'
                                ? 'text-white border-[#1f7a8c]'
                                : 'bg-white text-[#1f7a8c] border-[#1f7a8c]'
                            }`} style={course.status === 'active' ? { backgroundColor: '#1f7a8c' } : {}}>
                              {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                              {course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}
                            </span>
                          </div>
                        </div>
                        {/* Action buttons - right side */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEnrolltrainees(course)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7]"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Enroll
                          </button>
                          <button
                            onClick={() => handleEditCourse(course)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7]"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white rounded-full transition-colors"
                            style={{ backgroundColor: '#1f7a8c' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>

          {/* Right Panel - Course Detail: hidden on mobile until course selected */}
          <div className={`w-full lg:w-[60%] flex flex-col overflow-hidden ${previewCourse ? 'flex' : 'hidden lg:flex'}`}>
            {!previewCourse ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-gray-400 text-sm">Select a course to view details</p>
              </div>
            ) : (() => {
              const c = previewCourse
              const enrollmentBadges = getEnrollmentTypeDisplay(c.enrollment_type)
              return (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Sticky: hero + title */}
                  <div className="flex-shrink-0">
                    {/* Mobile back button */}
                    <div className="lg:hidden px-4 py-2 border-b border-gray-100">
                      <button
                        onClick={() => setPreviewCourse(null)}
                        className="flex items-center gap-1.5 text-sm text-[#1f7a8c] font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to courses
                      </button>
                    </div>
                    {/* Hero image */}
                  <div className="relative w-full" style={{ height: '260px' }}>
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                    ) : (
                      <div className="w-full h-full" style={{
                        background: 'linear-gradient(135deg, #1f7a8c30, #1f7a8c10)'
                      }} />
                    )}
                  </div>

                    {/* Title + description */}
                    <div className="px-6 pt-4 pb-3 border-b border-gray-100">
                      <h2 className="text-xl font-bold text-gray-900">{c.title}</h2>
                      {c.description && (
                        <p className="text-sm text-gray-500 leading-relaxed mt-1 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                  </div>{/* end sticky */}

                  {/* Scrollable: subjects */}
                  <div className="flex-1 overflow-y-auto p-6 pt-4">
                    {c.subjects && c.subjects.length > 0 ? (
                      <div className="space-y-2">
                        {[...c.subjects].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((subj, idx) => {
                          const colors = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']
                          const bg = colors[idx % colors.length]
                          return (
                            <div key={subj.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                              <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                {(subj as any).thumbnail_url ? (
                                  <img src={(subj as any).thumbnail_url} alt={subj.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${bg}20` }}>
                                    <svg className="w-5 h-5" fill="none" stroke={bg} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{subj.title}</p>
                                <p className="text-xs text-gray-400">{subj.modules?.length || 0} module{(subj.modules?.length || 0) !== 1 ? 's' : ''}</p>
                              </div>
                              <button
                                onClick={() => handleOpenSubjectFromPreview(c, subj.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
                                style={{ backgroundColor: '#1f7a8c' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                              >
                                <svg className="w-3.5 h-3.5" fill="white" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                        No subjects yet. <button onClick={() => handleCourseSelect(c)} className="text-teal-600 hover:underline">Open course</button> to add some.
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Subjects View */}
      {currentView === 'subjects' && selectedCourse && (
        <div className="space-y-4">
          {/* Course Banner */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="relative h-32 sm:h-52 w-full">
              {selectedCourse.thumbnail_url ? (
                <img src={selectedCourse.thumbnail_url} alt={selectedCourse.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
              ) : (
                <div className="w-full h-full" style={{
                  background: 'linear-gradient(135deg, #1f7a8c30 0%, #1f7a8c10 100%)'
                }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">{selectedCourse.title}</h2>
                  <p className="text-xs text-white/70 mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setShowAddSubjectModal(true)}
                  className="px-3 py-1.5 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                  style={{ backgroundColor: '#1f7a8c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Subject
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
            {/* Left: Subjects list (70%) */}
            <div className="w-full lg:flex-[7] lg:min-w-0 lg:flex lg:flex-col">
              <div className="overflow-y-auto overflow-x-visible border border-gray-200 rounded-xl bg-white p-2 sm:p-3 lg:flex-1" style={{ minHeight: 0 }}>
          {subjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No subjects yet</h3>
              <p className="text-sm text-gray-500 mb-4">Start building your course by adding subjects</p>
              <button
                onClick={() => setShowAddSubjectModal(true)}
                className="px-4 py-2 text-white rounded-lg text-sm transition-colors"
                style={{ backgroundColor: '#1f7a8c' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
              >
                Add Subject
              </button>
            </div>
          ) : (
            <div className="space-y-2">{/* subjects list */}
              {subjects.map((subject, subjectIdx) => {
                const isExpanded = expandedSubjects.has(subject.id)
                const mods = subjectModules[subject.id] || []
                const isLoadingMods = subjectModulesLoading.has(subject.id)
                return (
                  <div key={subject.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                    {/* Subject row */}
                    <div
                      className="flex gap-3 p-3 cursor-pointer transition-all hover:bg-gray-50"
                      onClick={() => toggleSubjectExpand(subject)}
                    >
                      {/* Cover image */}
                      <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-[100px] lg:h-[100px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                        {subject.thumbnail_url ? (
                          <img src={subject.thumbnail_url} alt={subject.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Right: title, description, then badges + actions at bottom */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{subject.title}</p>
                          {subject.description && subject.description !== subject.title && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-3 leading-relaxed">{subject.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Left: status badge + join class */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${
                              subject.status === 'active'
                                ? 'text-white border-[#1f7a8c]'
                                : 'bg-white text-[#1f7a8c] border-[#1f7a8c]'
                            }`} style={subject.status === 'active' ? { backgroundColor: '#1f7a8c' } : {}}>
                              {subject.status.charAt(0).toUpperCase() + subject.status.slice(1)}
                            </span>
                            {subject.online_class_link && (
                              <a
                                href={subject.online_class_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border border-blue-400 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                                Join Class
                              </a>
                            )}
                          </div>
                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setSelectedSubject(subject); fetchResources(subject.id); setShowAddModuleModal(true) }}
                              className="sm:hidden p-1.5 rounded-lg border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7] transition-colors" title="Add Module">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </button>
                            <button onClick={() => handleEditSubject(subject)}
                              className="sm:hidden p-1.5 rounded-lg border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7] transition-colors" title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteSubject(subject)}
                              className="sm:hidden p-1.5 rounded-lg text-white transition-colors" style={{ backgroundColor: '#1f7a8c' }} title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <button onClick={() => { setSelectedSubject(subject); fetchResources(subject.id); setShowAddModuleModal(true) }}
                              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7] transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                              Add Module
                            </button>
                            <button onClick={() => handleEditSubject(subject)}
                              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7] transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Edit
                            </button>
                            <button onClick={() => handleDeleteSubject(subject)}
                              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white rounded-full transition-colors"
                              style={{ backgroundColor: '#1f7a8c' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded modules */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3 rounded-b-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#006d77' }}>
                            Modules ({mods.length})
                          </span>
                        </div>
                        {isLoadingMods ? (
                          <div className="py-4 flex justify-center">
                            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          </div>
                        ) : mods.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-2 text-center">No modules yet.</p>
                        ) : (
                          <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: '420px' }}>
                            {mods.map((mod, idx) => (
                              <div
                                key={mod.id}
                                className="flex gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => { setSelectedSubject(subject); handleStartLesson(mod) }}
                              >
                                {/* Module number */}
                                <div className="flex-shrink-0 self-center w-10 h-10 sm:w-12 sm:h-12 bg-[#e6f4f7] rounded-lg border border-[#b3dce5] flex items-center justify-center">
                                  <span className="text-base font-bold" style={{ color: '#006d77' }}>{idx + 1}</span>
                                </div>
                                {/* Right: title, content type, then status + actions at bottom */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 leading-snug">{mod.title}</p>
                                    {mod.description && mod.description !== mod.title && (
                                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-3 leading-relaxed">{mod.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    {'status' in mod && mod.status && (
                                      <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                                        mod.status === 'active'
                                          ? 'text-white border-[#1f7a8c]'
                                          : 'bg-white text-[#1f7a8c] border-[#1f7a8c]'
                                      }`} style={mod.status === 'active' ? { backgroundColor: '#1f7a8c' } : {}}>
                                        {mod.status.charAt(0).toUpperCase() + mod.status.slice(1)}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => handleOpenTest(mod)}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7] transition-colors" title="Create/Edit Test">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                        {(() => { try { const p = mod.text_content ? JSON.parse(mod.text_content) : {}; return p.quiz_config ? 'Edit Test' : 'Create Test' } catch { return 'Create Test' } })()}
                                      </button>
                                      <button onClick={() => handleEditModule(mod)}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border border-[#1f7a8c] bg-white text-[#1f7a8c] hover:bg-[#e6f4f7] transition-colors" title="Edit">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Edit
                                      </button>
                                      <button onClick={() => handleDeleteModule(mod)}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white rounded-full transition-colors"
                                        style={{ backgroundColor: '#1f7a8c' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b7a'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f7a8c'}
                                        title="Delete">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
              </div>{/* end scrollable container */}
            </div>{/* end left 70% */}

            {/* Right: Stats sidebar (30%) */}
            <div className="w-full lg:flex-[3] lg:min-w-0">
              {/* Your Badges */}
              {(() => {
                const courseCount = courses.length || 1
                const subjectCount = statistics.totalSubjects || courseCount
                const moduleCount = statistics.totalModules || courseCount
                const badgeList = [
                  { label: 'Bronze',   img: '/Bronze.png',  count: courseCount },
                  { label: 'Silver',   img: '/Silver.png',  count: courseCount },
                  { label: 'Gold',     img: '/Gold.png',    count: courseCount },
                  { label: 'Modules',  img: '/Modules.png', count: moduleCount },
                  { label: 'Subjects', img: '/Subjects.png',count: subjectCount },
                  { label: 'Courses',  img: '/Courses.png', count: courseCount },
                ]
                return (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Your Badges</span>
                      <span className="text-xs text-gray-400">All unlocked</span>
                    </div>
                    <div className="px-3 py-3 grid grid-cols-6 gap-1">
                      {badgeList.map(b => (
                        <div key={b.label} className="flex flex-col items-center gap-0.5">
                          <img src={b.img} alt={b.label} className="w-8 h-8 object-contain" />
                          <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">{b.label}</span>
                          <span className="text-[9px] font-bold text-center leading-tight" style={{ color: '#1f7a8c' }}>×{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Available Badges */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Available Badges</span>
                  <span className="text-xs text-gray-400">This course</span>
                </div>
                <div className="px-3 py-3 grid grid-cols-6 gap-1">
                  {[
                    { label: 'Bronze',   img: '/Bronze.png',   desc: '50% completion' },
                    { label: 'Silver',   img: '/Silver.png',   desc: '75% completion' },
                    { label: 'Gold',     img: '/Gold.png',     desc: '100% + quiz' },
                    { label: 'Modules',  img: '/Modules.png',  desc: '1st module done' },
                    { label: 'Subjects', img: '/Subjects.png', desc: '1st subject done' },
                    { label: 'Courses',  img: '/Courses.png',  desc: '1st course done' },
                    ...(selectedCourse?.title?.toLowerCase().includes('cobot')
                      ? [{ label: 'Cobot', img: '/Cobot.png', desc: 'Cobot mastery' }]
                      : []),
                  ].map(b => (
                    <div key={b.label} className="relative flex flex-col items-center gap-0.5 group cursor-default">
                      <img src={b.img} alt={b.label} className="w-8 h-8 object-contain" />
                      <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">{b.label}</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                        <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap leading-tight">{b.desc}</div>
                        <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrolled Users & Instructors Card */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">People</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {/* Enrolled users */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="flex-1 text-xs text-gray-500">Enrolled Users</span>
                    <span className="text-sm font-bold text-gray-900">{courseEnrolledCount}</span>
                  </div>
                  {/* Instructors */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="flex-1 text-xs text-gray-500">Assigned Instructors</span>
                    <span className="text-sm font-bold text-gray-900">{courseInstructors.length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Statistics</span>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-gray-500">Total</span>
                    <span className="text-sm font-bold text-gray-900">{subjects.length}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-green-600">Active</span>
                    <span className="text-sm font-bold text-green-700">{subjects.filter(s => s.status === 'active').length}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-yellow-600">Draft</span>
                    <span className="text-sm font-bold text-yellow-700">{subjects.filter(s => s.status === 'draft').length}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-red-500">Inactive</span>
                    <span className="text-sm font-bold text-red-600">{subjects.filter(s => s.status === 'inactive').length}</span>
                  </div>
                </div>
              </div>
              {/* Course Info Card */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-4">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">This course includes</span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {/* Subjects count */}
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm text-gray-600">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</span>
                  </div>
                  {/* Total modules loaded */}
                  {(() => {
                    const allMods = Object.values(subjectModules).flat()
                    const totalMods = allMods.length
                    const videoMods = allMods.filter(m => m.content_type === 'video').length
                    const articleMods = allMods.filter(m => m.content_type === 'text').length
                    const pdfMods = allMods.filter(m => m.content_type === 'pdf_document').length
                    const slideMods = allMods.filter(m => m.content_type === 'slide_presentation' || m.content_type === 'canva_presentation').length
                    const confMods = allMods.filter(m => m.content_type === 'online_conference').length
                    const totalDuration = allMods.reduce((sum, m) => sum + (m.duration_minutes || 0), 0)
                    return (
                      <>
                        {totalMods > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-sm text-gray-600">{totalMods} module{totalMods !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {videoMods > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                            </svg>
                            <span className="text-sm text-gray-600">{videoMods} video lesson{videoMods !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {articleMods > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-600">{articleMods} article{articleMods !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {pdfMods > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-600">{pdfMods} PDF document{pdfMods !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {slideMods > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                            </svg>
                            <span className="text-sm text-gray-600">{slideMods} presentation{slideMods !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {confMods > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                            </svg>
                            <span className="text-sm text-gray-600">{confMods} online session{confMods !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {totalDuration > 0 && (
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-gray-600">
                              {totalDuration >= 60
                                ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ''} total duration`.trim()
                                : `${totalDuration} min total duration`}
                            </span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                  {/* Course type */}
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-sm text-gray-600 capitalize">{selectedCourse?.course_type?.replace(/_/g, ' ')} course</span>
                  </div>
                  {/* Enrollment type */}
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-gray-600 capitalize">{selectedCourse?.enrollment_type?.replace(/_/g, ' ')} enrollment</span>
                  </div>
                  {/* Activities — coming soon */}
                  <div className="flex items-center gap-3 opacity-40">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className="text-sm text-gray-400">Activities <span className="text-xs italic">(coming soon)</span></span>
                  </div>
                  {/* Badges — coming soon */}
                  <div className="flex items-center gap-3 opacity-40">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span className="text-sm text-gray-400">Badges <span className="text-xs italic">(coming soon)</span></span>
                  </div>
                </div>
              </div>
            </div>{/* end right 30% */}
          </div>{/* end flex container */}
        </div>
      )}

      {/* Lesson View */}
      {currentView === 'lesson' && selectedModule && (
        <LessonViewer
          module={selectedModule}
          isOpen={true}
          onClose={handleBackToModules}
          inline={true}
          siblingModules={selectedSubject?.modules ?? []}
          onNavigate={(mod) => setSelectedModule(mod)}
          userId={user?.id}
          userRole={userRole}
          subjectId={selectedModule.subject_id}
          courseId={selectedCourse?.id}
        />
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Add New Course</h2>
                <button 
                  onClick={() => setShowAddCourseModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddCourse} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-black mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={newCourse.title}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  placeholder="Enter course title"
                />
              </div>


              <div>
                <label className="block text-xs font-medium text-black mb-1">Course Type *</label>
                <select
                  required
                  value={newCourse.course_type}
                  onChange={(e) => {
                    const ct = e.target.value as 'academic' | 'tesda' | 'upskill'
                    setNewCourse(prev => ({
                      ...prev,
                      course_type: ct,
                      enrollment_type: ct === 'tesda' ? 'tesda_scholar' : 'trainee'
                    }))
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]">
                  <option value="academic">Academic Course</option>
                  <option value="tesda">TESDA Course</option>
                  <option value="upskill">UpSkill Course</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Status *</label>
                  <select
                    required
                    value={newCourse.status}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'draft' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

              </div>

              {/* Thumbnail Image */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">Cover Image</label>
                {newCourse.thumbnail_url && (
                  <div className="mb-2 relative w-full h-28 rounded-lg overflow-hidden border border-gray-200">
                    <img src={newCourse.thumbnail_url} alt="thumbnail" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                    <button type="button" onClick={() => setNewCourse(prev => ({ ...prev, thumbnail_url: '' }))}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-500 hover:text-red-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <input type="file" accept="image/*" disabled={uploadingFile}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = await uploadThumbnail(file, newCourse.thumbnail_url)
                      if (url) setNewCourse(prev => ({ ...prev, thumbnail_url: url }))
                    }
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 disabled:opacity-50"
                />
                {uploadingFile && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonBg())}
                >
                  {(submitting || uploadingFile) && <ButtonLoading />}
                  <span>{uploadingFile ? 'Uploading...' : submitting ? 'Creating...' : 'Create Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Add New Subject</h2>
                <button 
                  onClick={() => setShowAddSubjectModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddSubject} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-black mb-1">Subject Title *</label>
                <input
                  type="text"
                  required
                  value={newSubject.title}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  placeholder="Enter subject title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newSubject.description}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none"
                  placeholder="Brief description of this subject..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Online Class Link</label>
                <input
                  type="url"
                  value={newSubject.online_class_link || ''}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, online_class_link: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  placeholder="https://meet.google.com/... or https://zoom.us/..."
                />
                <p className="mt-1 text-xs text-gray-500">Add Google Meet, Zoom, or other online class link</p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Order *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newSubject.order_index}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Status *</label>
                  <select
                    required
                    value={newSubject.status}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'draft' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Assign Instructor</label>
                  <select
                    value={newSubject.instructor_id}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, instructor_id: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  >
                    <option value="">Select Instructor</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.first_name} {instructor.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thumbnail Image */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">Cover Image</label>
                {newSubject.thumbnail_url && (
                  <div className="mb-2 relative w-full h-28 rounded-lg overflow-hidden border border-gray-200">
                    <img src={newSubject.thumbnail_url} alt="thumbnail" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                    <button type="button" onClick={() => setNewSubject(prev => ({ ...prev, thumbnail_url: '' }))}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-500 hover:text-red-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <input type="file" accept="image/*" disabled={uploadingFile}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = await uploadThumbnail(file, newSubject.thumbnail_url)
                      if (url) setNewSubject(prev => ({ ...prev, thumbnail_url: url }))
                    }
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 disabled:opacity-50"
                />
                {uploadingFile && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonBg())}
                >
                  {(submitting || uploadingFile) && <ButtonLoading />}
                  <span>{uploadingFile ? 'Uploading...' : submitting ? 'Creating...' : 'Create Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Edit Subject</h2>
                <button 
                  onClick={() => setShowEditSubjectModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateSubject} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-black mb-1">Subject Title *</label>
                <input
                  type="text"
                  required
                  value={newSubject.title}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  placeholder="Enter subject title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newSubject.description}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none"
                  placeholder="Brief description of this subject..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Online Class Link</label>
                <input
                  type="url"
                  value={newSubject.online_class_link || ''}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, online_class_link: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  placeholder="https://meet.google.com/... or https://zoom.us/..."
                />
                <p className="mt-1 text-xs text-gray-500">Add Google Meet, Zoom, or other online class link</p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Order *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newSubject.order_index}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Status *</label>
                  <select
                    required
                    value={newSubject.status}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'draft' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Assign Instructor</label>
                  <select
                    value={newSubject.instructor_id}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, instructor_id: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  >
                    <option value="">Select Instructor</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.first_name} {instructor.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thumbnail Image */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">Cover Image</label>
                {newSubject.thumbnail_url && (
                  <div className="mb-2 relative w-full h-28 rounded-lg overflow-hidden border border-gray-200">
                    <img src={newSubject.thumbnail_url} alt="thumbnail" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                    <button type="button" onClick={() => setNewSubject(prev => ({ ...prev, thumbnail_url: '' }))}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-500 hover:text-red-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <input type="file" accept="image/*" disabled={uploadingFile}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = await uploadThumbnail(file, newSubject.thumbnail_url)
                      if (url) setNewSubject(prev => ({ ...prev, thumbnail_url: url }))
                    }
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 disabled:opacity-50"
                />
                {uploadingFile && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditSubjectModal(false)}
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonBg())}
                >
                  {(submitting || uploadingFile) && <ButtonLoading />}
                  <span>{uploadingFile ? 'Uploading...' : submitting ? 'Updating...' : 'Update Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {showAddModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black">Add New Module</h2>
              <button onClick={() => setShowAddModuleModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddModule} className="p-6 space-y-5">
              {/* Section 1: Title + Info */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Module Title + Info</h3>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Title *</label>
                  <input type="text" required value={newModule.title} onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] focus:border-[#1f7a8c]" placeholder="Enter module title" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Description</label>
                  <textarea rows={3} value={newModule.description} onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none" placeholder="Brief description of this module..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Status *</label>
                    <select required value={newModule.status} onChange={(e) => setNewModule(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]">
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                {/* Cover Image removed */}
              </div>

              {/* Section 2: Main Content */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🎥 Main Content</h3>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Content Type *</label>
                  <select required value={newModule.content_type} onChange={(e) => setNewModule(prev => ({ ...prev, content_type: e.target.value as any }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]">
                    <option value="video">Video</option>
                    <option value="canva_presentation">Canva Presentation</option>
                    <option value="slide_presentation">Slide Presentation</option>
                    <option value="online_document">Online Document</option>
                    <option value="pdf_document">PDF Document</option>
                    <option value="text">Text Only</option>
                  </select>
                </div>
                {newModule.content_type === 'video' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Video URL *</label>
                    <input type="url" required value={newModule.video_url || ''} onChange={(e) => setNewModule(prev => ({ ...prev, video_url: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" placeholder="https://www.youtube.com/watch?v=..." />
                    <p className="text-xs text-gray-400 mt-1">Supports YouTube, Vimeo, and direct video URLs</p>
                  </div>
                )}
                {newModule.content_type === 'canva_presentation' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Canva URL *</label>
                    <input type="url" required value={newModule.canva_url || ''} onChange={(e) => setNewModule(prev => ({ ...prev, canva_url: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" placeholder="https://www.canva.com/design/..." />
                    <p className="text-xs text-gray-400 mt-1">Set sharing to "Anyone with the link can view"</p>
                  </div>
                )}
                {newModule.content_type === 'online_document' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Document URL *</label>
                    <input type="url" required value={newModule.document_url || ''} onChange={(e) => setNewModule(prev => ({ ...prev, document_url: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" placeholder="https://docs.google.com/document/..." />
                  </div>
                )}
                {newModule.content_type === 'pdf_document' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">PDF File * <span className="text-gray-400 font-normal">(max 10MB)</span></label>
                    <input type="file" accept=".pdf,application/pdf" required={!newModule.document_url} disabled={uploadingFile}
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 10*1024*1024) { alert('Max 10MB'); e.target.value=''; return } const url = await uploadPDFFile(f, newModule.document_url); if (url) setNewModule(prev => ({ ...prev, document_url: url })) } }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 disabled:opacity-50" />
                    {uploadingFile && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                    {!uploadingFile && newModule.document_url && <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>}
                  </div>
                )}
                {newModule.content_type === 'slide_presentation' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Slides * <span className="text-gray-400 font-normal">(.ppt, .pptx, .pdf — max 10MB)</span></label>
                    <input type="file" accept=".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
                      required={!newModule.document_url} disabled={uploadingFile}
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 10*1024*1024) { alert('Max 10MB'); e.target.value=''; return } const url = await uploadPresentationFile(f, newModule.document_url); if (url) setNewModule(prev => ({ ...prev, document_url: url })) } }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 disabled:opacity-50" />
                    {uploadingFile && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                    {!uploadingFile && newModule.document_url && <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>}
                  </div>
                )}
                {newModule.content_type === 'text' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Text Content</label>
                    <textarea rows={4} value={newModule.text_content || ''} onChange={(e) => setNewModule(prev => ({ ...prev, text_content: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none" placeholder="Enter the main lesson text..." />
                  </div>
                )}
              </div>

              {/* Section 3: Explanation / Lesson Body */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📝 Explanation / Lesson Body</h3>
                <textarea rows={4} value={newModule.explanation || ''} onChange={(e) => setNewModule(prev => ({ ...prev, explanation: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none" placeholder="Explain the lesson in your own words, add context, background info..." />
              </div>

              {/* Section 6: Quiz / Activity */}

              <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModuleModal(false)} disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonBg())}>
                  {(submitting || uploadingFile) && <ButtonLoading />}
                  <span>{uploadingFile ? 'Uploading...' : submitting ? 'Creating...' : 'Create Module'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Module Modal */}
      {showEditModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black">Edit Module</h2>
              <button onClick={() => setShowEditModuleModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateModule} className="p-6 space-y-5">
              {/* Section 1: Title + Info */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Module Title + Info</h3>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Title *</label>
                  <input type="text" required value={newModule.title} onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] focus:border-[#1f7a8c]" placeholder="Enter module title" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Description</label>
                  <textarea rows={3} value={newModule.description} onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none" placeholder="Brief description of this module..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Status *</label>
                    <select required value={newModule.status} onChange={(e) => setNewModule(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]">
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Main Content */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🎥 Main Content</h3>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Content Type *</label>
                  <select required value={newModule.content_type} onChange={(e) => setNewModule(prev => ({ ...prev, content_type: e.target.value as any }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]">
                    <option value="video">Video</option>
                    <option value="canva_presentation">Canva Presentation</option>
                    <option value="slide_presentation">Slide Presentation</option>
                    <option value="online_document">Online Document</option>
                    <option value="pdf_document">PDF Document</option>
                    <option value="text">Text Only</option>
                  </select>
                </div>
                {newModule.content_type === 'video' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Video URL *</label>
                    <input type="url" required value={newModule.video_url || ''} onChange={(e) => setNewModule(prev => ({ ...prev, video_url: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" placeholder="https://www.youtube.com/watch?v=..." />
                    <p className="text-xs text-gray-400 mt-1">Supports YouTube, Vimeo, and direct video URLs</p>
                  </div>
                )}
                {newModule.content_type === 'canva_presentation' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Canva URL *</label>
                    <input type="url" required value={newModule.canva_url || ''} onChange={(e) => setNewModule(prev => ({ ...prev, canva_url: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" placeholder="https://www.canva.com/design/..." />
                    <p className="text-xs text-gray-400 mt-1">Set sharing to "Anyone with the link can view"</p>
                  </div>
                )}
                {newModule.content_type === 'online_document' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Document URL *</label>
                    <input type="url" required value={newModule.document_url || ''} onChange={(e) => setNewModule(prev => ({ ...prev, document_url: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c]" placeholder="https://docs.google.com/document/..." />
                  </div>
                )}
                {newModule.content_type === 'pdf_document' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">PDF File <span className="text-gray-400 font-normal">(max 10MB)</span></label>
                    <input type="file" accept=".pdf,application/pdf" disabled={uploadingFile}
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 10*1024*1024) { alert('Max 10MB'); e.target.value=''; return } const url = await uploadPDFFile(f, newModule.document_url); if (url) setNewModule(prev => ({ ...prev, document_url: url })) } }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 disabled:opacity-50" />
                    {uploadingFile && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                    {!uploadingFile && newModule.document_url && <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>}
                  </div>
                )}
                {newModule.content_type === 'slide_presentation' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Slides <span className="text-gray-400 font-normal">(.ppt, .pptx, .pdf — max 10MB)</span></label>
                    <input type="file" accept=".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
                      disabled={uploadingFile}
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 10*1024*1024) { alert('Max 10MB'); e.target.value=''; return } const url = await uploadPresentationFile(f, newModule.document_url); if (url) setNewModule(prev => ({ ...prev, document_url: url })) } }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 disabled:opacity-50" />
                    {uploadingFile && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                    {!uploadingFile && newModule.document_url && <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>}
                  </div>
                )}
                {newModule.content_type === 'text' && (
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Text Content</label>
                    <textarea rows={4} value={newModule.text_content || ''} onChange={(e) => setNewModule(prev => ({ ...prev, text_content: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none" placeholder="Enter the main lesson text..." />
                  </div>
                )}
              </div>

              {/* Section 3: Explanation / Lesson Body */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📝 Explanation / Lesson Body</h3>
                <textarea rows={4} value={newModule.explanation || ''} onChange={(e) => setNewModule(prev => ({ ...prev, explanation: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1f7a8c] resize-none" placeholder="Explain the lesson in your own words, add context, background info..." />
              </div>

              {/* Section 6: Quiz / Activity */}

              <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowEditModuleModal(false)} disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonBg())}>
                  {(submitting || uploadingFile) && <ButtonLoading />}
                  <span>{uploadingFile ? 'Uploading...' : submitting ? 'Updating...' : 'Update Module'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Edit Course Modal */}
      {showEditCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Edit Course</h2>
                <button 
                  onClick={() => setShowEditCourseModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateCourse} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-black mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={newCourse.title}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  placeholder="Enter course title"
                />
              </div>


              <div>
                <label className="block text-xs font-medium text-black mb-1">Course Type *</label>
                <select
                  required
                  value={newCourse.course_type}
                  onChange={(e) => {
                    const ct = e.target.value as 'academic' | 'tesda' | 'upskill'
                    setNewCourse(prev => ({
                      ...prev,
                      course_type: ct,
                      enrollment_type: ct === 'tesda' ? 'tesda_scholar' : 'trainee'
                    }))
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]">
                  <option value="academic">Academic Course</option>
                  <option value="tesda">TESDA Course</option>
                  <option value="upskill">UpSkill Course</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Status *</label>
                  <select
                    required
                    value={newCourse.status}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'draft' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[primary-500] focus:border-[primary-500]"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

              </div>

              {/* Thumbnail Image */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">Cover Image</label>
                {newCourse.thumbnail_url && (
                  <div className="mb-2 relative w-full h-28 rounded-lg overflow-hidden border border-gray-200">
                    <img src={newCourse.thumbnail_url} alt="thumbnail" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                    <button type="button" onClick={() => setNewCourse(prev => ({ ...prev, thumbnail_url: '' }))}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-500 hover:text-red-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <input type="file" accept="image/*" disabled={uploadingFile}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = await uploadThumbnail(file, newCourse.thumbnail_url)
                      if (url) setNewCourse(prev => ({ ...prev, thumbnail_url: url }))
                    }
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 disabled:opacity-50"
                />
                {uploadingFile && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditCourseModal(false)}
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && !uploadingFile && (e.currentTarget.style.backgroundColor = getButtonBg())}
                >
                  {(submitting || uploadingFile) && <ButtonLoading />}
                  <span>{uploadingFile ? 'Uploading...' : submitting ? 'Updating...' : 'Update Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-gray-200 rounded-full">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-black mb-2">Delete {deletingItem.type === 'course' ? 'Course' : deletingItem.type === 'subject' ? 'Subject' : 'Module'}</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete "{deletingItem.item.title}"? 
                  {deletingItem.type === 'course' && (
                    <span className="block mt-1 text-sm text-gray-700 font-medium">
                      This will also delete all subjects and modules within this course.
                    </span>
                  )}
                  {deletingItem.type === 'subject' && (
                    <span className="block mt-1 text-sm text-gray-700 font-medium">
                      This will also delete all modules within this subject.
                    </span>
                  )}
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && testModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-black">{testQuizConfig ? 'Edit Test' : 'Create Test'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{testModule.title}</p>
              </div>
              <button onClick={() => { setShowTestModal(false); setTestModule(null); setTestQuizConfig(null) }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <QuizBuilder value={testQuizConfig} onChange={setTestQuizConfig} />
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                {testQuizConfig && (
                  <button type="button"
                    onClick={async () => {
                      if (!testModule) return
                      if (!confirm('This will delete all student scores for this test so it can be retaken. Continue?')) return
                      await supabase.from('quiz_grades').delete().eq('module_id', testModule.id)
                      showSuccess('Scores cleared', 'Students can now retake the test.')
                    }}
                    className="px-4 py-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-sm">
                    Refresh Scores
                  </button>
                )}
                <button type="button" onClick={() => { setShowTestModal(false); setTestModule(null); setTestQuizConfig(null) }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveTest} disabled={savingTest}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !savingTest && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !savingTest && (e.currentTarget.style.backgroundColor = getButtonBg())}>
                  {savingTest && <ButtonLoading />}
                  <span>{savingTest ? 'Saving...' : 'Save Test'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Viewer Modal */}
      <LessonViewer
        module={currentPresentationModule!}
        isOpen={showPresentationModal}
        onClose={() => {
          setShowPresentationModal(false)
          setCurrentPresentationModule(null)
        }}
      />

      {/* Enroll trainees Modal */}
      {showEnrolltraineesModal && selectedCourseForEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">
                  Enroll Students - {selectedCourseForEnrollment.title}
                </h2>
                <button 
                  onClick={() => setShowEnrolltraineesModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available trainees */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-black">Available trainees</h3>
                    <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-medium rounded-full">
                      {availabletrainees.filter(t => traineeRoleFilter === 'all' || t.role === traineeRoleFilter).length} available
                    </span>
                  </div>

                  {/* Role filter */}
                  <select
                    value={traineeRoleFilter}
                    onChange={(e) => setTraineeRoleFilter(e.target.value)}
                    className="w-full mb-3 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Types</option>
                    <option value="jhs_student">JHS Student</option>
                    <option value="shs_student">SHS Student</option>
                    <option value="college_student">College Student</option>
                    <option value="scholar">TESDA Scholar</option>
                  </select>
                  
                  <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                    {availabletrainees.filter(t => traineeRoleFilter === 'all' || t.role === traineeRoleFilter).length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {availabletrainees.filter(t => traineeRoleFilter === 'all' || t.role === traineeRoleFilter).map((trainee) => (
                          <div key={trainee.id} className="p-3 hover:bg-gray-50">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedtrainees.includes(trainee.id)}
                                onChange={() => handletraineeSelection(trainee.id)}
                                className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {trainee.first_name} {trainee.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {trainee.email}
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p>All trainees are already enrolled</p>
                      </div>
                    )}
                  </div>

                  {selectedtrainees.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={handleEnrollSelectedtrainees}
                        disabled={submitting}
                        className="w-full px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                        style={{ backgroundColor: getButtonBg() }}
                        onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                        onMouseLeave={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonBg())}
                      >
                        {submitting && <ButtonLoading />}
                        <span>
                          {submitting ? 'Enrolling...' : `Enroll ${selectedtrainees.length} trainee${selectedtrainees.length !== 1 ? 's' : ''}`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Enrolled trainees */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-black">Enrolled trainees</h3>
                    <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-medium rounded-full">
                      {enrolledtrainees.length} enrolled
                    </span>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                    {enrolledtrainees.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {enrolledtrainees.map((trainee) => (
                          <div key={trainee.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {trainee.first_name} {trainee.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {trainee.email}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Enrolled: {new Date(trainee.enrolled_at).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleUnenrolltrainee(trainee.enrollment_id)}
                                disabled={submitting}
                                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                                title="Unenroll trainee"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <p>No trainees enrolled yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowEnrolltraineesModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


















